import random
import time
from datetime import datetime
from sqlalchemy.exc import OperationalError
from app.models import db, Room, Timetable, EnergyLog, EnergySource, GridStatus
from app.optimization.optimizer import EnergyOptimizer

class IoTSimulator:
    """Simulates IoT sensor data for all rooms every 60 seconds"""
    
    @staticmethod
    def get_grid_status():
        """Get current grid availability status"""
        latest_status = GridStatus.query.order_by(GridStatus.timestamp.desc()).first()
        if latest_status:
            return latest_status.grid_available
        return True  # Default to grid available
    
    @staticmethod
    def select_energy_source(room_type, grid_available):
        """Select appropriate energy source based on grid status and room type
        
        Logic:
        - Grid available -> Use grid for all rooms
        - Grid down:
            - classroom/staff -> Use solar+battery
            - lab/Smart_Class -> Use diesel generator
        """
        sources = {src.name: src for src in EnergySource.query.all()}
        
        # If no energy sources exist yet, return None (will be handled by caller)
        if not sources:
            return None
        
        if grid_available:
            # Grid is primary source when available
            grid_source = sources.get('grid')
            return grid_source.id if grid_source else None
        else:
            # Grid is down - use backup sources
            if room_type in ['classroom', 'staff']:
                # Use solar+battery for classrooms and staff rooms
                solar_source = sources.get('solar')
                return solar_source.id if solar_source else None
            elif room_type in ['lab', 'Smart_Class']:
                # Use diesel generator for labs and Smart_Class
                diesel_source = sources.get('diesel')
                return diesel_source.id if diesel_source else None
        
        # Fallback to grid
        grid_source = sources.get('grid')
        return grid_source.id if grid_source else None
    
    @staticmethod
    def is_room_scheduled(room_id, current_time):
        """Check if room has a scheduled class at current time"""
        day_of_week = current_time.weekday()
        current_time_only = current_time.time()
        
        schedules = Timetable.query.filter_by(
            room_id=room_id,
            day_of_week=day_of_week
        ).all()
        
        for schedule in schedules:
            if schedule.start_time <= current_time_only <= schedule.end_time:
                return True
        return False
    
    @staticmethod
    def calculate_loads(room, is_scheduled, temperature):
        """Calculate all energy loads for a room"""
        
        # Determine occupancy
        if is_scheduled:
            occupancy = True
        else:
            # 10% chance of random occupancy (maintenance, etc.)
            occupancy = random.random() < 0.1
        
        base_load = room.base_load_kw
        
        # Equipment Load
        if room.type == "classroom":
            equipment_load = round(random.uniform(0.2, 0.5), 2) if is_scheduled else 0.1
        elif room.type == "Smart_Class":
            equipment_load = round(random.uniform(3.0, 4.5), 2) if is_scheduled else 0.5
        elif room.type == "lab":
            equipment_load = round(random.uniform(2.5, 4.0), 2) if is_scheduled else 0.3
        else:  # staff room
            equipment_load = round(random.uniform(0.3, 0.7), 2)
        
        # AC Load (temperature-dependent)
        if temperature > 29 and occupancy:
            ac_load = round(random.uniform(1.5, 2.0), 2)
        else:
            ac_load = 0.2
        
        # Light Load
        if occupancy:
            light_load = round(random.uniform(0.3, 0.5), 2)
        else:
            light_load = 0.05
        
        total_load = round(base_load + ac_load + light_load + equipment_load, 2)
        
        return {
            'occupancy': occupancy,
            'temperature': temperature,
            'base_load': base_load,
            'ac_load': ac_load,
            'light_load': light_load,
            'equipment_load': equipment_load,
            'total_load': total_load,
            'optimized': False
        }
    
    @staticmethod
    def simulate_all_rooms():
        """Run simulation for all rooms with optimization and energy source selection"""
        current_time = datetime.now()
        rooms = Room.query.all()
        
        # Get current grid status
        grid_available = IoTSimulator.get_grid_status()
        
        logs_created = 0
        optimizations_applied = 0
        batch_size = 100  # Commit in batches to reduce lock contention
        
        for idx, room in enumerate(rooms):
            # Generate random temperature (24-36°C)
            temperature = round(random.uniform(24, 36), 1)
            
            # Check schedule
            is_scheduled = IoTSimulator.is_room_scheduled(room.id, current_time)
            
            # Calculate loads
            load_data = IoTSimulator.calculate_loads(room, is_scheduled, temperature)
            
            # Select appropriate energy source
            energy_source_id = IoTSimulator.select_energy_source(room.type, grid_available)
            
            # Skip if energy sources not initialized yet
            if energy_source_id is None:
                continue
            
            # Create energy log
            energy_log = EnergyLog(
                room_id=room.id,
                energy_source_id=energy_source_id,
                timestamp=current_time,
                **load_data
            )
            
            # Apply optimization
            EnergyOptimizer.optimize_room_log(energy_log, room, is_scheduled)
            if energy_log.optimized:
                optimizations_applied += 1
            
            db.session.add(energy_log)
            logs_created += 1
            
            # Commit in batches to reduce lock contention
            if (idx + 1) % batch_size == 0:
                IoTSimulator._commit_with_retry()
        
        # Final commit for remaining logs
        IoTSimulator._commit_with_retry()
        
        print(f" Simulated {logs_created} rooms | Optimized {optimizations_applied} rooms at {current_time.strftime('%H:%M:%S')}")
        return logs_created, optimizations_applied
    
    @staticmethod
    def _commit_with_retry(max_retries=3, initial_wait=0.1):
        """Commit database session with retry logic for lock errors"""
        for attempt in range(max_retries):
            try:
                db.session.commit()
                return True
            except OperationalError as e:
                if "database is locked" in str(e) and attempt < max_retries - 1:
                    wait_time = initial_wait * (2 ** attempt)  # Exponential backoff
                    time.sleep(wait_time)
                    db.session.rollback()
                else:
                    db.session.rollback()
                    raise
        return False