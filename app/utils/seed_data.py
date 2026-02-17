import random
from datetime import time, datetime
from app.models import db, Faculty, Building, Floor, Room, Timetable, EnergySource, GridStatus

def seed_energy_sources():
    """Initialize energy sources with pricing"""
    print(" Seeding energy sources...")
    
    # Grid electricity - primary source
    grid = EnergySource(
        name="grid",
        cost_per_kwh=8.0,  # ₹8/kWh
        is_available=True,
        priority=1
    )
    db.session.add(grid)
    
    # Solar + Battery - backup for classrooms/staff
    solar = EnergySource(
        name="solar",
        cost_per_kwh=4.0,  # ₹4/kWh
        is_available=True,
        priority=2
    )
    db.session.add(solar)
    
    # Diesel Generator - backup for labs/Smart_Class
    diesel = EnergySource(
        name="diesel",
        cost_per_kwh=16.0,  # ₹16/kWh
        is_available=True,
        priority=3
    )
    db.session.add(diesel)
    
    # Initialize grid status as online
    grid_status = GridStatus(
        timestamp=datetime.utcnow(),
        grid_available=True,
        reason=None
    )
    db.session.add(grid_status)
    
    db.session.commit()
    print(f"   Created 3 energy sources: grid (₹8/kWh), solar (₹4/kWh), diesel (₹16/kWh)")

def seed_campus():
    """Generate complete campus structure with rooms and Smart_Classes"""
    
    print(" Seeding campus data...")
    
    # First, seed energy sources
    seed_energy_sources()
    
    # Faculty names
    faculty_names = [
        "Faculty of Engineering",
        "Faculty of Science",
        "Faculty of Arts",
        "Faculty of Commerce"
    ]
    
    for fac_idx, fac_name in enumerate(faculty_names, 1):
        faculty = Faculty(name=fac_name)
        db.session.add(faculty)
        db.session.flush()
        
        print(f"   Created {fac_name}")
        
        # 3 Buildings per faculty
        for bld_idx in range(1, 4):
            building = Building(
                name=f"{fac_name[:3].upper()}-B{bld_idx}",
                faculty_id=faculty.id
            )
            db.session.add(building)
            db.session.flush()
            
            # 3 Floors per building
            for floor_num in range(1, 4):
                floor = Floor(number=floor_num, building_id=building.id)
                db.session.add(floor)
                db.session.flush()
                
                # 30 Classrooms
                for room_num in range(1, 31):
                    room = Room(
                        name=f"{building.name}-F{floor_num}-C{room_num}",
                        type="classroom",
                        capacity=random.randint(40, 60),
                        base_load_kw=round(random.uniform(0.3, 0.6), 2),
                        floor_id=floor.id
                    )
                    db.session.add(room)
                    db.session.flush()
                    create_timetable(room.id, "classroom")
                
                # 3 Labs
                for lab_num in range(1, 4):
                    room = Room(
                        name=f"{building.name}-F{floor_num}-L{lab_num}",
                        type="lab",
                        capacity=random.randint(30, 40),
                        base_load_kw=round(random.uniform(1.0, 2.0), 2),
                        floor_id=floor.id
                    )
                    db.session.add(room)
                    db.session.flush()
                    create_timetable(room.id, "lab")
                
                # 2 Staff Rooms
                for staff_num in range(1, 3):
                    room = Room(
                        name=f"{building.name}-F{floor_num}-S{staff_num}",
                        type="staff",
                        capacity=random.randint(5, 10),
                        base_load_kw=round(random.uniform(0.4, 0.8), 2),
                        floor_id=floor.id
                    )
                    db.session.add(room)
                    db.session.flush()
                    create_timetable(room.id, "staff")
                
                # 1 Smart Class (high-tech classroom)
                room = Room(
                    name=f"{building.name}-F{floor_num}-SC1",
                    type="Smart_Class",
                    capacity=random.randint(50, 80),
                    base_load_kw=round(random.uniform(1.5, 2.5), 2),
                    floor_id=floor.id
                )
                db.session.add(room)
                db.session.flush()
                create_timetable(room.id, "Smart_Class")
    
    db.session.commit()
    
    # Count verification
    total_rooms = Room.query.count()
    print(f"\n Campus seeded successfully!")
    print(f" Total Rooms: {total_rooms}")
    print(f" Faculties: {Faculty.query.count()}")
    print(f" Buildings: {Building.query.count()}")
    print(f" Floors: {Floor.query.count()}")

def create_timetable(room_id, room_type):
    """Create realistic timetables for rooms"""
    
    if room_type == "classroom":
        # Classes: Mon-Fri, 9AM-5PM with breaks
        schedules = [
            (9, 0, 10, 30),   # 9:00 AM - 10:30 AM
            (10, 45, 12, 15), # 10:45 AM - 12:15 PM
            (13, 30, 15, 0),  # 1:30 PM - 3:00 PM
            (15, 15, 16, 45)  # 3:15 PM - 4:45 PM
        ]
        days = [0, 1, 2, 3, 4]  # Monday to Friday
        
    elif room_type == "Smart_Class":
        # Smart Classes: Mon-Fri, premium time slots
        schedules = [
            (9, 0, 11, 0),   # 9:00 AM - 11:00 AM
            (11, 30, 13, 30), # 11:30 AM - 1:30 PM
            (14, 0, 16, 0)   # 2:00 PM - 4:00 PM
        ]
        days = [0, 1, 2, 3, 4]  # Monday to Friday
        
    elif room_type == "lab":
        # Labs: Mon-Fri, 10AM-4PM (longer sessions)
        schedules = [
            (10, 0, 13, 0),   # 10:00 AM - 1:00 PM
            (14, 0, 17, 0)    # 2:00 PM - 5:00 PM
        ]
        days = [0, 1, 2, 3, 4]
        
    else:  # staff room
        # Staff: Mon-Sat, 8AM-6PM
        schedules = [(8, 0, 18, 0)]
        days = [0, 1, 2, 3, 4, 5]
    
    for day in days:
        for start_h, start_m, end_h, end_m in schedules:
            timetable = Timetable(
                room_id=room_id,
                day_of_week=day,
                start_time=time(start_h, start_m),
                end_time=time(end_h, end_m)
            )
            db.session.add(timetable)