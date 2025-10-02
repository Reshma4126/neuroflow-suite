# NeuroFlow Suite API Documentation

## Base URL
- Development: `http://localhost:5000`
- Production: `https://neuroflow-backend.onrender.com`

## Authentication
All endpoints require authentication (except health check). Include JWT token in header:
Authorization: Bearer <your_jwt_token>
---

## Health Check

### GET /health
Check server and database status

**Response:**
{
"status": "OK",
"message": "NeuroFlow Suite Backend - Team Member 4 (DevOps)",
"timestamp": "2025-10-02T07:41:32.116Z",
"database": "Connected"
}

---

## Routines API

### GET /api/routines
Get all user's routines

**Response:**
[
{
"_id": "66f1234567890abcdef12345",
"userId": "user123",
"name": "Morning Routine",
"description": "Start the day right",
"frequency": "daily",
"timeOfDay": "morning",
"tasks": [],
"successRate": 85,
"isActive": true,
"createdAt": "2025-10-01T06:00:00.000Z",
"updatedAt": "2025-10-02T06:00:00.000Z"
}
]

### POST /api/routines
Create a new routine

**Request Body:**
{
"name": "Evening Routine",
"description": "Wind down routine",
"frequency": "daily",
"timeOfDay": "evening",
"tasks": []
}


**Response:** 201 Created with routine object

### PUT /api/routines/:id
Update a routine

**Request Body:** Same as POST (partial updates allowed)

**Response:** Updated routine object

### POST /api/routines/:id/complete
Mark routine as completed

**Response:** Updated routine with new completion data

---

## Habits API

### GET /api/habits
Get all user's habits

**Response:**
[
{
"_id": "66f1234567890abcdef12346",
"userId": "user123",
"name": "Drink Water",
"description": "Stay hydrated",
"trigger": "After waking up",
"stackedTo": null,
"streakCount": 15,
"completionHistory": [
{
"date": "2025-10-02T00:00:00.000Z",
"completed": true
}
],
"reminderEnabled": true,
"isActive": true,
"createdAt": "2025-09-15T06:00:00.000Z",
"updatedAt": "2025-10-02T06:00:00.000Z"
}
]

### POST /api/habits
Create a new habit

**Request Body:**
{
"name": "Read Books",
"description": "Read for 30 minutes",
"trigger": "After dinner",
"stackedTo": null,
"reminderEnabled": true
}

**Response:** 201 Created with habit object

### POST /api/habits/:id/complete
Mark habit completed for today

**Response:** Updated habit with new streak count

### GET /api/habits/streaks
Get current streaks for all habits

**Response:**
[
{
"id": "66f1234567890abcdef12346",
"name": "Drink Water",
"streak": 15
},
{
"id": "66f1234567890abcdef12347",
"name": "Read Books",
"streak": 8
}
]

---

## Error Responses

All endpoints return consistent error format:

{
"error": "Error message description"
}

**Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error

---

## Team Member 4 - DevOps Notes
- MongoDB connection required
- Health checks configured for all services
- Docker support available
- CI/CD pipeline via GitHub Actions
