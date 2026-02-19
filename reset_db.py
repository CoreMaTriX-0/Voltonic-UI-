from app import create_app
from app.models import db, Building, Room, Floor, Faculty, Timetable, EnergySource, GridStatus, EnergyLog
from app.utils.seed_data import seed_campus

app = create_app()

with app.app_context():
    print("WARNING: This will delete all data in the database. Press Ctrl+C to cancel within 3 seconds.")
    import time
    time.sleep(3)
    
    print("Dropping all tables...")
    db.drop_all()
    
    print("Recreating tables...")
    db.create_all()
    
    print("Seeding new data...")
    seed_campus()
    
    print("✅ Database reset complete with new naming scheme.")
