import BaseController from "../../core/base.controller";
import EmployeeAttendanceService from "./employee-attendance.service";
import { Request, Response } from "express";

class EmployeeAttendanceController extends BaseController {
    /**
     * POST /in - Clock in
     */
    async clockIn(req: Request, res: Response) {
        try {
            const { id: employeeId } = (req as any).user;

            if (!employeeId) {
                this.handleError(res, 'Employee ID is required', 400);
                return;
            }

            const location = req.body?.location;
            const attendance = await EmployeeAttendanceService.clockIn(employeeId, location);
            this.handleSuccess(res, {
                message: 'Successfully clocked in',
                attendance
            }, 201);
        } catch (error: any) {
            this.handleError(res, error.message || 'Failed to clock in', 400);
        }
    }

    /**
     * POST /out - Clock out
     */
    async clockOut(req: Request, res: Response) {
        try {
            const { id: employeeId } = (req as any).user;

            if (!employeeId) {
                this.handleError(res, 'Employee ID is required', 400);
                return;
            }

            const location = req.body?.location;
            const attendance = await EmployeeAttendanceService.clockOut(employeeId, location);
            this.handleSuccess(res, {
                message: 'Successfully clocked out',
                attendance,
                hoursWorked: attendance.duration / 60
            });
        } catch (error: any) {
            this.handleError(res, error.message || 'Failed to clock out', 400);
        }
    }

    /**
     * GET /history?startDate=xxx&endDate=xxx - Get history with optional date range
     */
    async getHistory(req: Request, res: Response) {
        try {
            // Prefer employeeId provided in query (used by admins), otherwise use authenticated user's id
            const { startDate, endDate, employeeId: queryEmployeeId } = req.query;
            const authUser = (req as any).user;

            // If a query employeeId is provided, only allow it for admins
            let employeeId: string | undefined = undefined;
            if (queryEmployeeId && typeof queryEmployeeId === 'string') {
                // If the requester is not admin, forbid accessing another employee's data
                if (!authUser || authUser.role !== 'admin') {
                    this.handleError(res, 'Not authorized to query other employee data', 403);
                    return;
                }
                employeeId = queryEmployeeId as string;
            } else {
                employeeId = authUser?.id as string | undefined;
            }

            if (!employeeId) {
                this.handleError(res, 'Employee ID is required', 400);
                return;
            }

            const start = startDate ? new Date(startDate as string) : undefined;
            const end = endDate ? new Date(endDate as string) : undefined;

            const history = await EmployeeAttendanceService.getMonthlyHistory(employeeId, start, end);
            this.handleSuccess(res, history);
        } catch (error: any) {
            this.handleError(res, error.message || 'Failed to fetch attendance history', 400);
        }
    }

    /**
     * GET /status?employeeId=xxx - Get today's status
     */
    async getTodayStatus(req: Request, res: Response) {
        try {
            const { id: employeeId } = (req as any).user;

            if (!employeeId) {
                this.handleError(res, 'Employee ID is required', 400);
                return;
            }

            const status = await EmployeeAttendanceService.getTodayStatus(employeeId);
            this.handleSuccess(res, {
                hasClocked: !!status,
                status: status?.status || 'not-clocked',
                attendance: status
            });
        } catch (error: any) {
            this.handleError(res, error.message || 'Failed to fetch status', 400);
        }
    }

    /**
     * ADMIN: GET /admin/all?date=xxx - Get all employees attendance for a specific date
     */
    async getAllEmployeesAttendance(req: Request, res: Response) {
        try {
            const { date } = req.query;
            const targetDate = date ? new Date(date as string) : undefined;

            const records = await EmployeeAttendanceService.getAllEmployeesAttendance(targetDate);
            this.handleSuccess(res, {
                date: targetDate || new Date(),
                totalEmployees: records.length,
                records
            });
        } catch (error: any) {
            this.handleError(res, error.message || 'Failed to fetch attendance records', 400);
        }
    }

    /**
     * ADMIN: GET /admin/summary?startDate=xxx&endDate=xxx - Get all employees monthly summary
     */
    async getAllEmployeesMonthlySummary(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate as string) : undefined;
            const end = endDate ? new Date(endDate as string) : undefined;

            const summary = await EmployeeAttendanceService.getAllEmployeesMonthlySummary(start, end);
            this.handleSuccess(res, summary);
        } catch (error: any) {
            this.handleError(res, error.message || 'Failed to fetch summary', 400);
        }
    }
}

export default new EmployeeAttendanceController();
