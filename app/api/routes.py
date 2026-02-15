from flask import jsonify, request
from datetime import datetime, timedelta
from app.api import api_bp
from app.models import db, Room, Building, Floor, Faculty, EnergyLog, Timetable
from app.analytics.analytics import EnergyAnalytics
from app.optimization.optimizer import EnergyOptimizer
from app.prediction.predictor import EnergyPredictor
from app.simulation.engine import IoTSimulator

# Initialize predictor
predictor = EnergyPredictor()

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
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected',
            'rooms': room_count,
            'logs': log_count,
            'simulation': 'running',
            'ml_model': 'loaded' if predictor.is_trained else 'not_trained'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
