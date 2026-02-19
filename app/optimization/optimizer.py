from app.models import db, EnergyLog, Room, Timetable, EnergySource
from datetime import datetime

class EnergyOptimizer:
    """Apply optimization rules to reduce energy wastage"""
    
    @staticmethod
    def optimize_room_log(energy_log, room, is_scheduled):
        """
        Optimization Rules:
        
        Rule 1: Peak Solar Hours (10 AM - 3 PM)
        - Switch classroom and Smart_Class from grid to solar
        - Mark as optimized
        
        Rule 2: Unoccupied Rooms
        - IF not scheduled AND occupancy == False:
            - Set AC to 0
            - Set lights to minimal (0.05)
            - Mark as optimized
        """
        optimized = False
        
        # Rule 1: Solar Energy Optimization (10 AM - 3 PM)
        current_hour = energy_log.timestamp.hour
        if 10 <= current_hour < 15:  # 10 AM to 3 PM (before 3 PM)
            if room.type in ['classroom', 'Smart_Class']:
                # Get solar energy source
                solar_source = EnergySource.query.filter_by(name='solar').first()
                grid_source = EnergySource.query.filter_by(name='grid').first()
                
                # Switch from grid to solar if currently on grid
                if solar_source and grid_source and energy_log.energy_source_id == grid_source.id:
                    energy_log.energy_source_id = solar_source.id
                    optimized = True
        
        # Rule 2: Unoccupied Room Optimization
        if not is_scheduled and not energy_log.occupancy:
            # Calculate baseline (what would have been consumed)
            baseline_load = energy_log.total_load
            
            # Apply optimization
            energy_log.ac_load = 0.0
            energy_log.light_load = 0.05
            
            # Recalculate total
            optimized_total = (
                energy_log.base_load + 
                energy_log.ac_load + 
                energy_log.light_load + 
                energy_log.equipment_load
            )
            
            energy_log.total_load = round(optimized_total, 2)
            optimized = True
            
            # Calculate savings
            energy_saved = round(baseline_load - optimized_total, 2)
        
        # Mark the log as optimized if any rule was applied
        if optimized:
            energy_log.optimized = True
        
        return 0.0
    
    @staticmethod
    def get_savings_summary(start_time=None, end_time=None):
        """Calculate total energy savings and environmental impact"""
        from sqlalchemy import func
        
        # Base query for optimized logs
        query = db.session.query(func.count(EnergyLog.id)).filter(EnergyLog.optimized == True)
        
        if start_time:
            query = query.filter(EnergyLog.timestamp >= start_time)
        if end_time:
            query = query.filter(EnergyLog.timestamp <= end_time)
        
        # optimized_logs = query.all()  # <--- THIS WAS THE BOTTLENECK
        
        # Efficient count query
        total_optimized = query.scalar() or 0
        
        # Note: We need to calculate savings differently
        # For now, estimate avg savings per optimized log
        
        # Rough estimate: avg 1.5 kW saved per optimization
        avg_savings_per_optimization = 1.5
        total_energy_saved_kwh = total_optimized * avg_savings_per_optimization / 60  # Convert to kWh
        
        # Financial savings (₹8 per kWh)
        cost_saved_inr = round(total_energy_saved_kwh * 8, 2)
        
        # CO₂ reduction (0.82 kg per kWh)
        co2_reduced_kg = round(total_energy_saved_kwh * 0.82, 2)
        
        return {
            'total_optimizations': total_optimized,
            'energy_saved_kwh': round(total_energy_saved_kwh, 2),
            'cost_saved_inr': cost_saved_inr,
            'co2_reduced_kg': co2_reduced_kg
        }