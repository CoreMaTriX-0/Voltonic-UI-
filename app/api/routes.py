from flask import jsonify, request
from datetime import datetime, timedelta
from app.api import api_bp
from app.models import db, Room, Building, Floor, Faculty, EnergyLog, Timetable, EnergySource, GridStatus
from app.analytics.analytics import EnergyAnalytics
from app.optimization.optimizer import EnergyOptimizer
# from app.prediction.predictor import EnergyPredictor  # Temporarily disabled for fast startup
from app.simulation.engine import IoTSimulator

# Initialize predictor
# predictor = EnergyPredictor()  # Temporarily disabled
predictor = None  # Will add back later

# ============================================================================
# DASHBOARD & LIVE DATA ENDPOINTS
# ============================================================================

@api_bp.route('/dashboard/live', methods=['GET'])
def get_live_dashboard():
    """Get real-time campus dashboard data"""
    try:
        campus_load = EnergyAnalytics.get_live_campus_load()
        
        # Get optimization savings
        savings = EnergyOptimizer.get_savings_summary()
        
        # Get latest timestamp
        latest_time = db.session.query(db.func.max(EnergyLog.timestamp)).scalar()
        
        return jsonify({
            'status': 'success',
            'data': {
                'campus_load': campus_load,
                'optimization_savings': savings,
                'last_updated': latest_time.isoformat() if latest_time else None
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/live/campus', methods=['GET'])
def get_campus_live_load():
    """Get current total campus energy consumption"""
    try:
        data = EnergyAnalytics.get_live_campus_load()
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/live/buildings', methods=['GET'])
def get_all_buildings_live():
    """Get current load for all buildings"""
    try:
        comparison = EnergyAnalytics.get_building_comparison()
        return jsonify({'status': 'success', 'data': comparison}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/live/building/<int:building_id>', methods=['GET'])
def get_building_live_load(building_id):
    """Get current load for a specific building"""
    try:
        data = EnergyAnalytics.get_building_load(building_id)
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@api_bp.route('/analytics/hourly', methods=['GET'])
def get_hourly_analytics():
    """Get hourly consumption data"""
    try:
        hours = request.args.get('hours', default=24, type=int)
        data = EnergyAnalytics.get_hourly_consumption(hours=hours)
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/analytics/daily', methods=['GET'])
def get_daily_analytics():
    """Get daily consumption summary"""
    try:
        days = request.args.get('days', default=7, type=int)
        data = EnergyAnalytics.get_daily_summary(days=days)
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/analytics/building-comparison', methods=['GET'])
def get_building_comparison():
    """Compare energy usage across all buildings"""
    try:
        data = EnergyAnalytics.get_building_comparison()
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# OPTIMIZATION ENDPOINTS
# ============================================================================

@api_bp.route('/optimization/savings', methods=['GET'])
def get_optimization_savings():
    """Get total energy savings from optimization"""
    try:
        start_time_str = request.args.get('start_time')
        end_time_str = request.args.get('end_time')
        
        start_time = datetime.fromisoformat(start_time_str) if start_time_str else None
        end_time = datetime.fromisoformat(end_time_str) if end_time_str else None
        
        savings = EnergyOptimizer.get_savings_summary(start_time, end_time)
        
        return jsonify({'status': 'success', 'data': savings}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/optimization/status', methods=['GET'])
def get_optimization_status():
    """Get current optimization statistics"""
    try:
        latest_time = db.session.query(db.func.max(EnergyLog.timestamp)).scalar()
        
        if not latest_time:
            return jsonify({'status': 'error', 'message': 'No data available'}), 404
        
        total_rooms = Room.query.count()
        
        optimized_count = db.session.query(db.func.count(EnergyLog.id)).filter(
            EnergyLog.timestamp == latest_time,
            EnergyLog.optimized == True
        ).scalar() or 0
        
        total_load = db.session.query(db.func.sum(EnergyLog.total_load)).filter(
            EnergyLog.timestamp == latest_time
        ).scalar() or 0
        
        return jsonify({
            'status': 'success',
            'data': {
                'timestamp': latest_time.isoformat(),
                'total_rooms': total_rooms,
                'optimized_rooms': optimized_count,
                'non_optimized_rooms': total_rooms - optimized_count,
                'optimization_rate': round((optimized_count / total_rooms) * 100, 2) if total_rooms > 0 else 0,
                'current_campus_load_kw': round(total_load, 2)
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# PREDICTION ENDPOINTS
# ============================================================================

@api_bp.route('/prediction/next-hour', methods=['GET'])
def predict_next_hour():
    """Predict energy consumption for next hour"""
    try:
        if predictor is None:
            return jsonify({'status': 'error', 'message': 'ML predictor not initialized'}), 503
        
        # Load model if not already loaded
        if not predictor.is_trained:
            predictor.load_model()
        
        prediction, error = predictor.predict_next_hour()
        
        if error:
            return jsonify({'status': 'error', 'message': error}), 400
        
        return jsonify({'status': 'success', 'data': prediction}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/prediction/train', methods=['POST'])
def train_prediction_model():
    """Manually trigger model training"""
    try:
        if predictor is None:
            return jsonify({'status': 'error', 'message': 'ML predictor not initialized'}), 503
        
        hours_back = request.json.get('hours_back', 168) if request.json else 168
        
        success, result = predictor.train_model(hours_back=hours_back)
        
        if not success:
            return jsonify({'status': 'error', 'message': result}), 400
        
        return jsonify({'status': 'success', 'data': result}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/prediction/model-info', methods=['GET'])
def get_model_info():
    """Get ML model information and feature importance"""
    try:
        if predictor is None:
            return jsonify({'status': 'error', 'message': 'ML predictor not initialized'}), 503
        
        if not predictor.is_trained:
            if not predictor.load_model():
                return jsonify({'status': 'error', 'message': 'Model not trained'}), 404
        
        feature_importance, error = predictor.get_feature_importance()
        
        if error:
            return jsonify({'status': 'error', 'message': error}), 400
        
        return jsonify({
            'status': 'success',
            'data': {
                'is_trained': predictor.is_trained,
                'model_type': 'RandomForestRegressor',
                'feature_importance': feature_importance
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# CAMPUS STRUCTURE ENDPOINTS
# ============================================================================

@api_bp.route('/campus/structure', methods=['GET'])
def get_campus_structure():
    """Get complete campus hierarchy"""
    try:
        faculties = Faculty.query.all()
        
        structure = []
        for faculty in faculties:
            faculty_data = {
                'id': faculty.id,
                'name': faculty.name,
                'buildings': []
            }
            
            for building in faculty.buildings:
                building_data = {
                    'id': building.id,
                    'name': building.name,
                    'floor_count': len(building.floors),
                    'room_count': sum(len(floor.rooms) for floor in building.floors)
                }
                faculty_data['buildings'].append(building_data)
            
            structure.append(faculty_data)
        
        total_stats = {
            'total_faculties': Faculty.query.count(),
            'total_buildings': Building.query.count(),
            'total_floors': Floor.query.count(),
            'total_rooms': Room.query.count()
        }
        
        return jsonify({
            'status': 'success',
            'data': {
                'structure': structure,
                'statistics': total_stats
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/campus/faculties', methods=['GET'])
def get_faculties():
    """Get all faculties"""
    try:
        faculties = Faculty.query.all()
        data = [{'id': f.id, 'name': f.name} for f in faculties]
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/campus/buildings', methods=['GET'])
def get_buildings():
    """Get all buildings"""
    try:
        buildings = Building.query.all()
        data = [
            {
                'id': b.id,
                'name': b.name,
                'faculty_id': b.faculty_id,
                'faculty_name': b.faculty.name
            }
            for b in buildings
        ]
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/campus/rooms', methods=['GET'])
def get_rooms():
    """Get rooms with optional filtering"""
    try:
        room_type = request.args.get('type')
        building_id = request.args.get('building_id', type=int)
        
        query = Room.query
        
        if room_type:
            query = query.filter_by(type=room_type)
        
        if building_id:
            query = query.join(Floor).filter(Floor.building_id == building_id)
        
        rooms = query.limit(100).all()  # Limit to prevent huge responses
        
        data = [
            {
                'id': r.id,
                'name': r.name,
                'type': r.type,
                'capacity': r.capacity,
                'base_load_kw': r.base_load_kw
            }
            for r in rooms
        ]
        
        return jsonify({'status': 'success', 'data': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/campus/room/<int:room_id>', methods=['GET'])
def get_room_details(room_id):
    """Get detailed information for a specific room"""
    try:
        room = Room.query.get(room_id)
        
        if not room:
            return jsonify({'status': 'error', 'message': 'Room not found'}), 404
        
        # Get latest energy log for this room
        latest_log = EnergyLog.query.filter_by(room_id=room_id).order_by(
            EnergyLog.timestamp.desc()
        ).first()
        
        # Get timetable
        timetable = Timetable.query.filter_by(room_id=room_id).all()
        
        data = {
            'id': room.id,
            'name': room.name,
            'type': room.type,
            'capacity': room.capacity,
            'base_load_kw': room.base_load_kw,
            'floor': {
                'id': room.floor.id,
                'number': room.floor.number
            },
            'building': {
                'id': room.floor.building.id,
                'name': room.floor.building.name
            },
            'faculty': {
                'id': room.floor.building.faculty.id,
                'name': room.floor.building.faculty.name
            },
            'latest_reading': {
                'timestamp': latest_log.timestamp.isoformat(),
                'occupancy': latest_log.occupancy,
                'temperature': latest_log.temperature,
                'total_load': latest_log.total_load,
                'optimized': latest_log.optimized
            } if latest_log else None,
            'timetable_entries': len(timetable)
        }
        
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# BUILDING & ROOM MANAGEMENT ENDPOINTS
# ============================================================================

@api_bp.route('/buildings', methods=['GET'])
def get_all_buildings():
    """Get all buildings with their structure and active energy sources"""
    try:
        buildings = Building.query.all()
        
        # Get latest active sources for all rooms to determine building connections
        latest_time = db.session.query(db.func.max(EnergyLog.timestamp)).scalar()
        room_sources = {}
        
        if latest_time:
            # efficient query to get map of room_id -> source_name
            logs = db.session.query(EnergyLog.room_id, EnergySource.name)\
                .join(EnergySource)\
                .filter(EnergyLog.timestamp == latest_time)\
                .all()
            # SQLAlchemy returns tuples for specific column queries
            room_sources = {log[0]: log[1] for log in logs}
            
        buildings_data = []
        
        for building in buildings:
            building_sources = set()
            floors_data = []
            
            for floor in building.floors:
                rooms_by_type = {}
                for room in floor.rooms:
                    if room.type not in rooms_by_type:
                        rooms_by_type[room.type] = 0
                    rooms_by_type[room.type] += 1
                    
                    # Track active source for this room
                    if room.id in room_sources:
                        # Normalize source name to lowercase just in case
                        building_sources.add(room_sources[room.id].lower())
                
                floors_data.append({
                    'id': floor.id,
                    'number': floor.number,
                    'total_rooms': len(floor.rooms),
                    'rooms_by_type': rooms_by_type
                })
            
            # Default fallback if no data found
            if not building_sources:
                building_sources.add('grid')
            
            buildings_data.append({
                'id': building.id,
                'name': building.name,
                'faculty_id': building.faculty_id,
                'faculty_name': building.faculty.name,
                'total_floors': len(building.floors),
                'total_rooms': sum(len(floor.rooms) for floor in building.floors),
                'active_sources': list(building_sources),
                'floors': floors_data
            })
        
        return jsonify({
            'status': 'success',
            'data': buildings_data
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/buildings/<int:building_id>/energy-flow', methods=['GET'])
def get_building_energy_flow(building_id):
    """Get real-time energy flow visualization for a building"""
    try:
        building = Building.query.get_or_404(building_id)
        
        # Get latest energy logs for all rooms in this building
        latest_time = db.session.query(db.func.max(EnergyLog.timestamp)).scalar()
        if not latest_time:
            return jsonify({'status': 'error', 'message': 'No energy data available'}), 404
        
        floors_data = []
        for floor in building.floors:
            rooms_data = []
            for room in floor.rooms:
                # Get latest log for this room
                latest_log = EnergyLog.query.filter_by(
                    room_id=room.id,
                    timestamp=latest_time
                ).first()
                
                if latest_log:
                    rooms_data.append({
                        'room_id': room.id,
                        'room_name': room.name,
                        'room_type': room.type,
                        'capacity': room.capacity,
                        'occupancy': latest_log.occupancy,
                        'total_load': latest_log.total_load,
                        'energy_source': latest_log.energy_source.name,
                        'energy_source_cost': latest_log.energy_source.cost_per_kwh,
                        'optimized': latest_log.optimized
                    })
            
            floors_data.append({
                'floor_id': floor.id,
                'floor_number': floor.number,
                'total_load': sum(r['total_load'] for r in rooms_data),
                'rooms': rooms_data
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'building_id': building.id,
                'building_name': building.name,
                'timestamp': latest_time.isoformat(),
                'total_load': sum(f['total_load'] for f in floors_data),
                'floors': floors_data
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/rooms', methods=['POST'])
def create_room():
    """Create a new room
    
    Request body:
    {
        "name": "ENG-B1-F1-C31",
        "type": "classroom",
        "capacity": 50,
        "base_load_kw": 0.5,
        "floor_id": 1
    }
    """
    try:
        data = request.get_json()
        
        required = ['name', 'type', 'capacity', 'base_load_kw', 'floor_id']
        if not all(field in data for field in required):
            return jsonify({
                'status': 'error',
                'message': f'Missing required fields: {required}'
            }), 400
        
        # Validate room type
        valid_types = ['classroom', 'lab', 'staff', 'Smart_Class']
        if data['type'] not in valid_types:
            return jsonify({
                'status': 'error',
                'message': f'Invalid room type. Must be one of: {valid_types}'
            }), 400
        
        room = Room(
            name=data['name'],
            type=data['type'],
            capacity=data['capacity'],
            base_load_kw=data['base_load_kw'],
            floor_id=data['floor_id']
        )
        
        db.session.add(room)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Room created successfully',
            'data': {
                'id': room.id,
                'name': room.name,
                'type': room.type,
                'capacity': room.capacity,
                'base_load_kw': room.base_load_kw,
                'floor_id': room.floor_id
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/rooms/<int:room_id>', methods=['PUT'])
def update_room(room_id):
    """Update room details"""
    try:
        room = Room.query.get_or_404(room_id)
        data = request.get_json()
        
        if 'name' in data:
            room.name = data['name']
        if 'type' in data:
            valid_types = ['classroom', 'lab', 'staff', 'Smart_Class']
            if data['type'] not in valid_types:
                return jsonify({
                    'status': 'error',
                    'message': f'Invalid room type. Must be one of: {valid_types}'
                }), 400
            room.type = data['type']
        if 'capacity' in data:
            room.capacity = data['capacity']
        if 'base_load_kw' in data:
            room.base_load_kw = data['base_load_kw']
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Room updated successfully',
            'data': {
                'id': room.id,
                'name': room.name,
                'type': room.type,
                'capacity': room.capacity,
                'base_load_kw': room.base_load_kw
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/rooms/<int:room_id>', methods=['DELETE'])
def delete_room(room_id):
    """Delete a room"""
    try:
        room = Room.query.get_or_404(room_id)
        room_name = room.name
        
        db.session.delete(room)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'Room {room_name} deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/floors', methods=['POST'])
def create_floor():
    """Create a new floor
    
    Request body:
    {
        "number": 4,
        "building_id": 1
    }
    """
    try:
        data = request.get_json()
        
        if 'number' not in data or 'building_id' not in data:
            return jsonify({
                'status': 'error',
                'message': 'number and building_id are required'
            }), 400
        
        floor = Floor(
            number=data['number'],
            building_id=data['building_id']
        )
        
        db.session.add(floor)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Floor created successfully',
            'data': {
                'id': floor.id,
                'number': floor.number,
                'building_id': floor.building_id
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/buildings', methods=['POST'])
def create_building():
    """Create a new building
    
    Request body:
    {
        "name": "ENG-B4",
        "faculty_id": 1
    }
    """
    try:
        data = request.get_json()
        
        if 'name' not in data or 'faculty_id' not in data:
            return jsonify({
                'status': 'error',
                'message': 'name and faculty_id are required'
            }), 400
        
        building = Building(
            name=data['name'],
            faculty_id=data['faculty_id']
        )
        
        db.session.add(building)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Building created successfully',
            'data': {
                'id': building.id,
                'name': building.name,
                'faculty_id': building.faculty_id
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/rooms/<int:room_id>/power-control', methods=['POST'])
def control_room_power(room_id):
    """Manual power control for a specific room
    
    Request body:
    {
        "action": "increase" | "decrease" | "set",
        "value": 1.5  (for 'set' action, kW value)
    }
    """
    try:
        room = Room.query.get_or_404(room_id)
        data = request.get_json()
        
        if 'action' not in data:
            return jsonify({
                'status': 'error',
                'message': 'action is required'
            }), 400
        
        action = data['action']
        current_load = room.base_load_kw
        
        if action == 'increase':
            new_load = round(current_load + 0.5, 2)
        elif action == 'decrease':
            new_load = max(0.1, round(current_load - 0.5, 2))
        elif action == 'set':
            if 'value' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'value is required for set action'
                }), 400
            new_load = round(data['value'], 2)
        else:
            return jsonify({
                'status': 'error',
                'message': 'action must be: increase, decrease, or set'
            }), 400
        
        room.base_load_kw = new_load
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'Power adjusted for {room.name}',
            'data': {
                'room_id': room.id,
                'room_name': room.name,
                'previous_load_kw': current_load,
                'new_load_kw': new_load
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/faculties', methods=['GET'])
def get_all_faculties():
    """Get all faculties"""
    try:
        faculties = Faculty.query.all()
        faculties_data = [{
            'id': f.id,
            'name': f.name,
            'total_buildings': len(f.buildings)
        } for f in faculties]
        
        return jsonify({
            'status': 'success',
            'data': faculties_data
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# HISTORICAL DATA ENDPOINTS
# ============================================================================

@api_bp.route('/history/room/<int:room_id>', methods=['GET'])
def get_room_history(room_id):
    """Get historical energy logs for a specific room"""
    try:
        hours = request.args.get('hours', default=24, type=int)
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        logs = EnergyLog.query.filter(
            EnergyLog.room_id == room_id,
            EnergyLog.timestamp >= cutoff_time
        ).order_by(EnergyLog.timestamp.desc()).limit(1000).all()
        
        data = [
            {
                'timestamp': log.timestamp.isoformat(),
                'occupancy': log.occupancy,
                'temperature': log.temperature,
                'total_load': log.total_load,
                'ac_load': log.ac_load,
                'light_load': log.light_load,
                'equipment_load': log.equipment_load,
                'optimized': log.optimized
            }
            for log in logs
        ]
        
        return jsonify({'status': 'success', 'data': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/history/campus', methods=['GET'])
def get_campus_history():
    """Get aggregated campus-wide historical data"""
    try:
        hours = request.args.get('hours', default=24, type=int)
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Aggregate by timestamp
        aggregated = db.session.query(
            EnergyLog.timestamp,
            db.func.sum(EnergyLog.total_load).label('total_load'),
            db.func.avg(EnergyLog.temperature).label('avg_temperature'),
            db.func.count(db.case((EnergyLog.occupancy == True, 1))).label('occupied_rooms'),
            db.func.count(db.case((EnergyLog.optimized == True, 1))).label('optimized_rooms')
        ).filter(
            EnergyLog.timestamp >= cutoff_time
        ).group_by(EnergyLog.timestamp).order_by(EnergyLog.timestamp.desc()).all()
        
        data = [
            {
                'timestamp': row.timestamp.isoformat(),
                'total_load_kw': round(row.total_load, 2),
                'avg_temperature': round(row.avg_temperature, 2),
                'occupied_rooms': row.occupied_rooms,
                'optimized_rooms': row.optimized_rooms
            }
            for row in aggregated
        ]
        
        return jsonify({'status': 'success', 'data': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# STATISTICS ENDPOINTS
# ============================================================================

@api_bp.route('/stats/summary', methods=['GET'])
def get_statistics_summary():
    """Get overall system statistics"""
    try:
        total_logs = EnergyLog.query.count()
        total_rooms = Room.query.count()
        
        # Get time range
        earliest = db.session.query(db.func.min(EnergyLog.timestamp)).scalar()
        latest = db.session.query(db.func.max(EnergyLog.timestamp)).scalar()
        
        # Get optimization stats
        optimized_count = EnergyLog.query.filter_by(optimized=True).count()
        
        # Current load
        current_load = db.session.query(db.func.sum(EnergyLog.total_load)).filter(
            EnergyLog.timestamp == latest
        ).scalar() if latest else 0
        
        data = {
            'total_rooms': total_rooms,
            'total_logs': total_logs,
            'data_time_range': {
                'earliest': earliest.isoformat() if earliest else None,
                'latest': latest.isoformat() if latest else None,
                'hours_covered': round((latest - earliest).total_seconds() / 3600, 2) if earliest and latest else 0
            },
            'optimization': {
                'total_optimizations': optimized_count,
                'optimization_rate': round((optimized_count / total_logs) * 100, 2) if total_logs > 0 else 0
            },
            'current_campus_load_kw': round(current_load, 2) if current_load else 0
        }
        
        return jsonify({'status': 'success', 'data': data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# ENERGY SOURCES & GRID MANAGEMENT
# ============================================================================

@api_bp.route('/energy-sources', methods=['GET'])
def get_energy_sources():
    """Get all energy sources with their costs and availability"""
    try:
        sources = EnergySource.query.order_by(EnergySource.priority).all()
        
        sources_data = [{
            'id': src.id,
            'name': src.name,
            'cost_per_kwh': src.cost_per_kwh,
            'is_available': src.is_available,
            'priority': src.priority
        } for src in sources]
        
        return jsonify({
            'status': 'success',
            'data': sources_data
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/grid-status', methods=['GET'])
def get_grid_status():
    """Get current grid status"""
    try:
        latest_status = GridStatus.query.order_by(GridStatus.timestamp.desc()).first()
        
        if not latest_status:
            return jsonify({
                'status': 'success',
                'data': {
                    'grid_available': True,
                    'timestamp': datetime.now().isoformat(),
                    'reason': None
                }
            }), 200
        
        return jsonify({
            'status': 'success',
            'data': {
                'grid_available': latest_status.grid_available,
                'timestamp': latest_status.timestamp.isoformat(),
                'reason': latest_status.reason
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/grid-status', methods=['POST'])
def update_grid_status():
    """Update grid status (simulate power outage or restoration)
    
    Request body:
    {
        "grid_available": true/false,
        "reason": "Power outage in sector 5" (optional)
    }
    """
    try:
        data = request.get_json()
        
        if 'grid_available' not in data:
            return jsonify({
                'status': 'error',
                'message': 'grid_available is required'
            }), 400
        
        grid_status = GridStatus(
            timestamp=datetime.now(),
            grid_available=data['grid_available'],
            reason=data.get('reason')
        )
        
        db.session.add(grid_status)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f"Grid status updated to {'online' if data['grid_available'] else 'offline'}",
            'data': {
                'grid_available': grid_status.grid_available,
                'timestamp': grid_status.timestamp.isoformat(),
                'reason': grid_status.reason
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@api_bp.route('/energy-cost-breakdown', methods=['GET'])
def get_energy_cost_breakdown():
    """Get energy consumption and cost breakdown by source
    
    Query params:
    - hours: Number of hours to look back (default: 24)
    """
    try:
        hours = request.args.get('hours', 24, type=int)
        since = datetime.now() - timedelta(hours=hours)
        
        # Get all logs with energy source info
        logs = db.session.query(
            EnergySource.name,
            EnergySource.cost_per_kwh,
            db.func.sum(EnergyLog.total_load).label('total_kwh'),
            db.func.count(EnergyLog.id).label('log_count')
        ).join(
            EnergyLog, EnergyLog.energy_source_id == EnergySource.id
        ).filter(
            EnergyLog.timestamp >= since
        ).group_by(
            EnergySource.id, EnergySource.name, EnergySource.cost_per_kwh
        ).all()
        
        breakdown = []
        total_cost = 0
        total_kwh = 0
        
        for log in logs:
            cost = log.total_kwh * log.cost_per_kwh
            total_cost += cost
            total_kwh += log.total_kwh
            
            breakdown.append({
                'source': log.name,
                'cost_per_kwh': log.cost_per_kwh,
                'total_kwh': round(log.total_kwh, 2),
                'total_cost': round(cost, 2),
                'log_count': log.log_count
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'period_hours': hours,
                'total_cost': round(total_cost, 2),
                'total_kwh': round(total_kwh, 2),
                'breakdown': breakdown
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# HEALTH CHECK
# ============================================================================

@api_bp.route('/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    try:
        # Check database connection
        db.session.execute(db.text('SELECT 1'))
        
        # Check if data exists
        room_count = Room.query.count()
        log_count = EnergyLog.query.count()
        
        ml_status = 'not_initialized' if predictor is None else ('loaded' if predictor.is_trained else 'not_trained')
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected',
            'rooms': room_count,
            'logs': log_count,
            'simulation': 'running',
            'ml_model': ml_status
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
