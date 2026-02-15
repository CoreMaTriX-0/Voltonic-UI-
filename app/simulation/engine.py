import random
from datetime import datetime
from app.models import db, Room, Timetable, EnergyLog
from app.optimization.optimizer import EnergyOptimizer

class IoTSimulator:
    """Simulates IoT sensor data for all rooms every 60 seconds"""
    
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
        """Run simulation for all 1260 rooms with optimization"""
        current_time = datetime.now()
        rooms = Room.query.all()
        
        logs_created = 0
        optimizations_applied = 0
        
        for room in rooms:
            # Generate random temperature (24-36°C)
            temperature = round(random.uniform(24, 36), 1)
            
            # Check schedule
            is_scheduled = IoTSimulator.is_room_scheduled(room.id, current_time)
            
            # Calculate loads
            load_data = IoTSimulator.calculate_loads(room, is_scheduled, temperature)
            
            # Create energy log
            energy_log = EnergyLog(
                room_id=room.id,
                timestamp=current_time,
                **load_data
            )
            
            # Apply optimization
            savings = EnergyOptimizer.optimize_room_log(energy_log, room, is_scheduled)
            if energy_log.optimized:
                optimizations_applied += 1
            
            db.session.add(energy_log)
            logs_created += 1
        
        db.session.commit()
        
        print(f" Simulated {logs_created} rooms | Optimized {optimizations_applied} rooms at {current_time.strftime('%H:%M:%S')}")
        return logs_created, optimizations_applied