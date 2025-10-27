# Employee Attendance API Documentation

## Overview
Complete employee working hours tracking system with clock-in/out functionality, history tracking, and admin management features.

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Employee Endpoints

### 1. Clock In
**POST** `/attendance/in`

Clock in for the current day.

**Request Body:**
```json
{
  "employeeId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "message": "Successfully clocked in",
  "attendance": {
    "_id": "...",
    "employeeId": "507f1f77bcf86cd799439011",
    "date": "2025-10-16T00:00:00.000Z",
    "clockIn": "2025-10-16T03:28:46.000Z",
    "clockOut": null,
    "totalHours": 0,
    "status": "clocked-in"
  }
}
```

**Validations:**
- Cannot clock in twice on the same day
- Employee must exist and be active
- Prevents clock-in if already clocked out for the day

---

### 2. Clock Out
**POST** `/attendance/out`

Clock out and calculate hours worked.

**Request Body:**
```json
{
  "employeeId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "message": "Successfully clocked out",
  "attendance": {
    "_id": "...",
    "employeeId": "507f1f77bcf86cd799439011",
    "date": "2025-10-16T00:00:00.000Z",
    "clockIn": "2025-10-16T03:28:46.000Z",
    "clockOut": "2025-10-16T11:30:15.000Z",
    "totalHours": 8.02,
    "status": "clocked-out"
  },
  "hoursWorked": 8.02
}
```

**Validations:**
- Must have an active clock-in record for today
- Employee must exist and be active
- Automatically calculates total hours worked

---

### 3. Get Attendance History
**GET** `/attendance/history?employeeId={id}&startDate={date}&endDate={date}`

Get attendance history with optional date range. Defaults to current month if no dates provided.

**Query Parameters:**
- `employeeId` (required): Employee ID
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Example:**
```
GET /attendance/history?employeeId=507f1f77bcf86cd799439011&startDate=2025-10-01&endDate=2025-10-31
```

**Response:**
```json
{
  "month": 10,
  "year": 2025,
  "records": [
    {
      "_id": "...",
      "employeeId": "507f1f77bcf86cd799439011",
      "date": "2025-10-16T00:00:00.000Z",
      "clockIn": "2025-10-16T03:28:46.000Z",
      "clockOut": "2025-10-16T11:30:15.000Z",
      "totalHours": 8.02,
      "status": "clocked-out"
    }
  ],
  "totalHoursWorked": 162.5,
  "totalDaysPresent": 22
}
```

---

### 4. Get Today's Status
**GET** `/attendance/status?employeeId={id}`

Check if employee has clocked in/out today.

**Query Parameters:**
- `employeeId` (required): Employee ID

**Example:**
```
GET /attendance/status?employeeId=507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "hasClocked": true,
  "status": "clocked-in",
  "attendance": {
    "_id": "...",
    "employeeId": "507f1f77bcf86cd799439011",
    "date": "2025-10-16T00:00:00.000Z",
    "clockIn": "2025-10-16T03:28:46.000Z",
    "clockOut": null,
    "totalHours": 0,
    "status": "clocked-in"
  }
}
```

---

## Admin Endpoints
*Requires admin role*

### 5. Get All Employees Attendance
**GET** `/attendance/admin/all?date={date}`

Get attendance records for all employees on a specific date. Defaults to today.

**Query Parameters:**
- `date` (optional): Date to query (ISO format)

**Example:**
```
GET /attendance/admin/all?date=2025-10-16
```

**Response:**
```json
{
  "date": "2025-10-16T00:00:00.000Z",
  "totalEmployees": 15,
  "records": [
    {
      "_id": "...",
      "employeeId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "idNumber": "EMP001",
        "role": "employee"
      },
      "date": "2025-10-16T00:00:00.000Z",
      "clockIn": "2025-10-16T03:28:46.000Z",
      "clockOut": "2025-10-16T11:30:15.000Z",
      "totalHours": 8.02,
      "status": "clocked-out"
    }
  ]
}
```

---

### 6. Get All Employees Monthly Summary
**GET** `/attendance/admin/summary?startDate={date}&endDate={date}`

Get aggregated monthly summary for all employees. Defaults to current month.

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Example:**
```
GET /attendance/admin/summary?startDate=2025-10-01&endDate=2025-10-31
```

**Response:**
```json
{
  "month": 10,
  "year": 2025,
  "employees": [
    {
      "employee": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "idNumber": "EMP001",
        "role": "employee"
      },
      "totalHours": 176.5,
      "totalDays": 22,
      "records": [...]
    }
  ]
}
```

---

## Status Codes

- `200` - Success
- `201` - Successfully created (clock-in)
- `400` - Bad request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `500` - Internal server error

---

## Error Response Format
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Notes

- All dates are stored and returned in ISO 8601 format
- Hours are calculated automatically and rounded to 2 decimal places
- Attendance records are indexed by `employeeId` and `date` for optimal query performance
- Employee validation is performed on all operations
- Inactive employees cannot clock in/out
