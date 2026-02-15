# ⚡ VOLTONIC

## Smart Campus Energy Intelligence Platform

### Backend Master Architecture & Execution Plan (3-Day Sprint)

------------------------------------------------------------------------

# 1️⃣ PROJECT OBJECTIVE

Build a scalable backend simulation + analytics engine for a smart
campus energy optimization system that:

-   Simulates IoT energy data
-   Applies rule-based optimization
-   Predicts peak usage
-   Provides analytics APIs
-   Calculates energy savings
-   Supports a React dashboard via REST APIs

This is a software-only digital twin simulation using SQLite and
SQLAlchemy.

------------------------------------------------------------------------

# 2️⃣ SYSTEM ARCHITECTURE

IoT Simulation Engine\
↓\
Flask Backend API\
↓\
SQLite Database\
↓\
Analytics + Optimization Engine\
↓\
Prediction Module\
↓\
React Dashboard

Backend Responsibilities: - Data modeling - Simulation - Optimization
logic - Aggregations - Prediction - API endpoints

------------------------------------------------------------------------

# 3️⃣ CAMPUS SCALE MODEL

Simulated campus structure:

-   4 Faculties
-   Each faculty → 3 Buildings → 12 total
-   Each building → 3 Floors
-   Each floor → 30 classrooms + 3 labs + 2 staff rooms

Per floor: 35 rooms\
Per building: 105 rooms\
Total campus: 1260 rooms

Enterprise-level realism.

------------------------------------------------------------------------

# 4️⃣ DATABASE DESIGN

SQLite + SQLAlchemy

## Faculty

-   id
-   name

## Building

-   id
-   name
-   faculty_id (FK)

## Floor

-   id
-   number
-   building_id (FK)

## Room

-   id
-   name
-   type (classroom/lab/staff)
-   capacity
-   base_load_kw
-   floor_id (FK)

## Timetable

-   id
-   room_id (FK)
-   day_of_week (0--6)
-   start_time
-   end_time

## EnergyLog

-   id
-   room_id (FK)
-   timestamp
-   occupancy (bool)
-   temperature
-   base_load
-   ac_load
-   light_load
-   equipment_load
-   total_load
-   optimized (bool)

Indexes: - timestamp - room_id

------------------------------------------------------------------------

# 5️⃣ FOLDER STRUCTURE

voltonic-backend/ │ ├── app/ │ ├── models/ │ ├── simulation/ │ ├──
optimization/ │ ├── analytics/ │ ├── prediction/ │ ├── api/ │ └── utils/
│ ├── run.py ├── requirements.txt └── README.md

Keep modules separated.

------------------------------------------------------------------------

# 6️⃣ SEED SCRIPT STRATEGY

Auto-generate: - 4 faculties - 3 buildings each - 3 floors each - 30
classrooms + 3 labs + 2 staff rooms per floor

Base loads: - Classroom: 0.3--0.6 kW - Lab: 1.0--2.0 kW - Staff:
0.4--0.8 kW

------------------------------------------------------------------------

# 7️⃣ IOT SIMULATION ENGINE

Runs every 60 seconds.

For each room: 1. Check schedule. 2. Determine occupancy. 3. Generate
temperature (24--36°C). 4. Calculate loads. 5. Apply optimization rules.
6. Store log.

------------------------------------------------------------------------

# 8️⃣ LOAD MODELING LOGIC

Classroom: - Scheduled → equipment 0.2--0.5 - Not scheduled → 0.1

Lab: - Scheduled → 2.5--4.0 - Not scheduled → 0.3

Staff: - Moderate constant load

AC Logic: - temp \> 29 and occupied → 1.5--2.0 - else → 0.2

Light Logic: - occupied → 0.3--0.5 - else → 0.05

Total: total = base + ac + light + equipment

------------------------------------------------------------------------

# 9️⃣ OPTIMIZATION ENGINE

Rule:

IF not scheduled AND occupancy == 0: ac = 0 light = 0.05 optimized =
True

Track energy_saved = baseline - optimized

------------------------------------------------------------------------

# 🔟 ANALYTICS ENGINE

Provide: - Campus live load - Building-wise load - Hourly averages -
Daily totals - Energy saved - Cost saved (₹8 per kWh) - CO₂ reduced
(0.82 kg per kWh)

------------------------------------------------------------------------

# 1️⃣1️⃣ PEAK PREDICTION

Use RandomForestRegressor.

Features: - hour - day_of_week - avg_temperature - occupancy_rate -
last_hour_load

Predict next hour campus load.

------------------------------------------------------------------------

# 1️⃣2️⃣ API ENDPOINTS

Live: - GET /api/live/campus - GET /api/live/building/`<id>`{=html} -
GET /api/live/room/`<id>`{=html}

Analytics: - GET /api/analytics/hourly - GET /api/analytics/daily - GET
/api/analytics/building-comparison

Prediction: - GET /api/prediction/next-hour

Reports: - GET /api/report/monthly

------------------------------------------------------------------------

# 1️⃣3️⃣ 3-DAY EXECUTION PLAN

DAY 1: - Models - Seed script - Simulation running

DAY 2: - Optimization - Analytics - APIs

DAY 3: - Prediction - Savings metrics - Stress test - Frontend
integration

------------------------------------------------------------------------

# 1️⃣4️⃣ SUCCESS METRICS

Display: - Total campus load - % energy saved - ₹ saved - CO₂ reduced -
Efficiency score

------------------------------------------------------------------------

Voltonic = Digital Twin + Optimization + Predictive Intelligence.
