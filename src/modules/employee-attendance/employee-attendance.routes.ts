import { Router, Request, Response } from "express";
import EmployeeAttendanceController from "./employee-attendance.controller";
import { authenticateJWT, authorizeRoles } from "../../core/middlewares/authJwt";

const router = Router();

// Employee routes - require authentication
// POST /attendance/in - Clock in
router.post('/in', 
    authenticateJWT,
    async (req: Request, res: Response) => {
        await EmployeeAttendanceController.clockIn(req, res);
    }
);

// POST /attendance/out - Clock out
router.post('/out', 
    authenticateJWT,
    async (req: Request, res: Response) => {
        await EmployeeAttendanceController.clockOut(req, res);
    }
);

// GET /attendance/history?employeeId=xxx&startDate=xxx&endDate=xxx - Get history with optional date range
router.get('/history', 
    authenticateJWT,
    async (req: Request, res: Response) => {
        await EmployeeAttendanceController.getHistory(req, res);
    }
);

// GET /attendance/status?employeeId=xxx - Get today's status
router.get('/status', 
    authenticateJWT,
    async (req: Request, res: Response) => {
        await EmployeeAttendanceController.getTodayStatus(req, res);
    }
);

// Admin routes - require admin role
// GET /attendance/admin/all?date=xxx - Get all employees attendance for a specific date
router.get('/admin/all', 
    authenticateJWT,
    authorizeRoles('admin'),
    async (req: Request, res: Response) => {
        await EmployeeAttendanceController.getAllEmployeesAttendance(req, res);
    }
);

// GET /attendance/admin/summary?startDate=xxx&endDate=xxx - Get all employees monthly summary
router.get('/admin/summary', 
    authenticateJWT,
    authorizeRoles('admin'),
    async (req: Request, res: Response) => {
        await EmployeeAttendanceController.getAllEmployeesMonthlySummary(req, res);
    }
);

export default router;
