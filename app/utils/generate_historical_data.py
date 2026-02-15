import random
from datetime import datetime, timedelta
from app.models import db, Room, Timetable, EnergyLog
from app.simulation.engine import IoTSimulator
from app.optimization.optimizer import EnergyOptimizer

class HistoricalDataGenerator:
    """Generate realistic historical data for testing ML model"""
    
    @staticmethod
    def generate_historical_logs(days_back=7, interval_minutes=60):
        """
        Generate historical energy logs for past N days
        
        Args:
            days_back: Number of days to generate data for
            interval_minutes: Time interval between logs (default 60 min)
        """
        print(f"\n Generating {days_back} days of historical data...\n")
        
        rooms = Room.query.all()
        total_rooms = len(rooms)
        
        # Calculate time range
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days_back)
        
        current_time = start_time
        total_iterations = 0
        total_logs = 0
        
        while current_time <= end_time:
            logs_created = 0
            optimizations = 0
            
            for room in rooms:
                # Generate temperature (realistic daily cycle)
                hour = current_time.hour
                # Cooler at night (24-28°C), warmer during day (28-36°C)
                if 6 <= hour <= 18:
                    base_temp = 30
                    temp_variance = 6
                else:
                    base_temp = 26
                    temp_variance = 2
                
                temperature = round(base_temp + random.uniform(-temp_variance/2, temp_variance/2), 1)
                
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
                EnergyOptimizer.optimize_room_log(energy_log, room, is_scheduled)
                if energy_log.optimized:
                    optimizations += 1
                
                db.session.add(energy_log)
                logs_created += 1
            
            # Commit batch
            db.session.commit()
            total_logs += logs_created
            total_iterations += 1
            
            # Progress update
            if total_iterations % 24 == 0:
                days_completed = total_iterations / 24
                print(f" Generated {days_completed:.1f} days | {total_logs:,} logs | Latest: {current_time.strftime('%Y-%m-%d %H:%M')}")
            
            # Move to next interval
            current_time += timedelta(minutes=interval_minutes)
        
        print(f"\n Historical data generation complete!")
        print(f" Total logs created: {total_logs:,}")
        print(f" Time range: {start_time.strftime('%Y-%m-%d %H:%M')} to {end_time.strftime('%Y-%m-%d %H:%M')}")
        print(f" Total rooms: {total_rooms}")
        
        return total_logs

def generate_historical_data_command(days=7):
    """Standalone command to generate historical data"""
    from app import create_app
    app = create_app()
    
    with app.app_context():
        print("\n" + "="*60)
        print(" VOLTONIC - Historical Data Generator")
        print("="*60)
        
        # Check existing data
        existing_logs = EnergyLog.query.count()
        print(f"\n Existing logs in database: {existing_logs:,}")
        
        if existing_logs > 0:
            response = input("\n  Database contains existing logs. Continue? (yes/no): ")
            if response.lower() != 'yes':
                print(" Operation cancelled.")
                return
        
        # Generate data
        generator = HistoricalDataGenerator()
        total_logs = generator.generate_historical_logs(days_back=days)
        
        print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    import sys
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    generate_historical_data_command(days)