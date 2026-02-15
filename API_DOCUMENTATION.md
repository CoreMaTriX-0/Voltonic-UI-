# VOLTONIC REST API Documentation

Base URL: `http://127.0.0.1:5000/api`

## 📊 Dashboard & Live Data

### GET `/dashboard/live`
Get complete real-time dashboard data including campus load and optimization savings.

**Response:**
```json
{
  "status": "success",
  "data": {
    "campus_load": { ... },
    "optimization_savings": { ... },
    "last_updated": "2026-02-16T14:30:00"
  }
}
```

### GET `/live/campus`
Get current total campus energy consumption.

### GET `/live/buildings`
Get current load for all buildings (sorted by consumption).

### GET `/live/building/<building_id>`
Get current load for a specific building.

---

## 📈 Analytics

### GET `/analytics/hourly?hours=24`
Get hourly consumption data.

**Query Parameters:**
- `hours` (optional, default: 24) - Number of hours to retrieve

### GET `/analytics/daily?days=7`
Get daily consumption summary.

**Query Parameters:**
- `days` (optional, default: 7) - Number of days to retrieve

### GET `/analytics/building-comparison`
Compare energy usage across all buildings.

---

## ⚡ Optimization

### GET `/optimization/savings?start_time=<iso>&end_time=<iso>`
Get total energy savings from optimization.

**Query Parameters:**
- `start_time` (optional) - ISO format datetime
- `end_time` (optional) - ISO format datetime

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_optimizations": 15420,
    "energy_saved_kwh": 2345.67,
    "cost_saved_inr": 18765.36,
    "co2_reduced_kg": 1923.45
  }
}
```

### GET `/optimization/status`
Get current optimization statistics.

---

## 🔮 Predictions

### GET `/prediction/next-hour`
Predict energy consumption for the next hour using ML model.

**Response:**
```json
{
  "status": "success",
  "data": {
    "predicted_load_kw": 1187.23,
    "prediction_for": "2026-02-16T15:30:00",
    "current_load_kw": 1234.56,
    "confidence_interval": {
      "lower": 1142.11,
      "upper": 1232.35
    },
    "features_used": { ... }
  }
}
```

### POST `/prediction/train`
Manually trigger ML model training.

**Request Body (optional):**
```json
{
  "hours_back": 168
}
```

### GET `/prediction/model-info`
Get ML model information and feature importance.

---

## 🏫 Campus Structure

### GET `/campus/structure`
Get complete campus hierarchy (faculties → buildings → floors → rooms).

### GET `/campus/faculties`
Get all faculties.

### GET `/campus/buildings`
Get all buildings.

### GET `/campus/rooms?type=<type>&building_id=<id>`
Get rooms with optional filtering.

**Query Parameters:**
- `type` (optional) - Filter by room type: classroom, lab, staff
- `building_id` (optional) - Filter by building ID

### GET `/campus/room/<room_id>`
Get detailed information for a specific room including latest readings and timetable.

---

## 📜 Historical Data

### GET `/history/room/<room_id>?hours=24`
Get historical energy logs for a specific room.

**Query Parameters:**
- `hours` (optional, default: 24) - Number of hours to retrieve

### GET `/history/campus?hours=24`
Get aggregated campus-wide historical data.

**Query Parameters:**
- `hours` (optional, default: 24) - Number of hours to retrieve

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "timestamp": "2026-02-16T14:30:00",
      "total_load_kw": 1234.56,
      "avg_temperature": 28.3,
      "occupied_rooms": 450,
      "optimized_rooms": 810
    }
  ]
}
```

---

## 📊 Statistics

### GET `/stats/summary`
Get overall system statistics including total logs, time ranges, and optimization metrics.

---

## 🏥 Health Check

### GET `/health`
API health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-16T14:30:00",
  "database": "connected",
  "rooms": 1260,
  "logs": 211680,
  "simulation": "running",
  "ml_model": "loaded"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "status": "error",
  "message": "Error description here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## CORS

CORS is enabled for all origins, allowing frontend applications to access the API from any domain.

---

## Testing

Run the test suite:
```bash
python test_api_endpoints.py
```

This will test all endpoints and provide a detailed report.

---

## Examples

### Get current campus load
```bash
curl http://127.0.0.1:5000/api/live/campus
```

### Get next hour prediction
```bash
curl http://127.0.0.1:5000/api/prediction/next-hour
```

### Get optimization savings
```bash
curl http://127.0.0.1:5000/api/optimization/savings
```

### Train ML model
```bash
curl -X POST http://127.0.0.1:5000/api/prediction/train \
  -H "Content-Type: application/json" \
  -d '{"hours_back": 168}'
```
