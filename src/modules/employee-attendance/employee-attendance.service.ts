import EmployeeAttendanceModel from "./employee-attendance.model";
import { EmployeeAttendance, MonthlyHistoryResponse } from "./employee-attendance.interface";
import { Types } from "mongoose";
import UserModel from "../user/user.model";

type LocationPayload = { latitude: number; longitude: number; label?: string } | undefined;

class EmployeeAttendanceService {
    /**
     * Validate if employee exists and is active
     */
    private async validateEmployee(employeeId: string): Promise<void> {
        const employee = await UserModel.findById(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        if (!employee.active) {
            throw new Error('Employee account is inactive');
        }
    }
    /**
     * Clock in - creates a new attendance record
     */
    async clockIn(employeeId: string, location?: LocationPayload): Promise<EmployeeAttendance> {
        try {
            // Validate employee first
            await this.validateEmployee(employeeId);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if already clocked in today
            const existingRecord = await EmployeeAttendanceModel.findOne({
                employeeId: new Types.ObjectId(employeeId),
                date: today
            });

            if (existingRecord && existingRecord.status === 'clocked-in') {
                throw new Error('Already clocked in today');
            }

            if (existingRecord && existingRecord.status === 'clocked-out') {
                throw new Error('Already completed shift for today');
            }

            // Create new attendance record (include location if provided)
            const attendanceData: any = {
                employeeId: new Types.ObjectId(employeeId),
                date: today,
                clockIn: new Date(),
                status: 'clocked-in',
            };

            if (location) {
                attendanceData.clockInLocation = location;
            }

            const attendance = await EmployeeAttendanceModel.create(attendanceData);

            return attendance;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Clock out - updates existing attendance record
     */
    async clockOut(employeeId: string, location?: LocationPayload): Promise<EmployeeAttendance> {
        try {
            // Validate employee first
            await this.validateEmployee(employeeId);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find today's attendance record
            const attendance = await EmployeeAttendanceModel.findOne({
                employeeId: new Types.ObjectId(employeeId),
                date: today,
                status: 'clocked-in'
            });

            if (!attendance) {
                throw new Error('No active clock-in record found for today');
            }

            const clockOutTime = new Date();
            const clockInTime = attendance.clockIn;

            if (!clockInTime) {
                throw new Error('Clock-in time not found');
            }

            // Calculate total hours worked
            const durationInMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);

            // Update the attendance record and include clockOutLocation if provided
            attendance.clockOut = clockOutTime;
            attendance.duration = Math.round(durationInMinutes);
            attendance.status = 'clocked-out';
            if (location) {
                (attendance as any).clockOutLocation = location;
            }

            await attendance.save();

            return attendance;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get attendance history with optional date range
     */
    async getMonthlyHistory(
        employeeId: string, 
        startDate?: Date, 
        endDate?: Date
    ): Promise<MonthlyHistoryResponse> {
        try {
            await this.validateEmployee(employeeId);

            const now = new Date();
            const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
            const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            const records = await EmployeeAttendanceModel.find({
                employeeId: new Types.ObjectId(employeeId),
                date: { $gte: start, $lte: end }
            }).sort({ date: -1 });

            // Calculate totals
            const totalMinutesWorked = records.reduce((sum, record) => sum + (record.duration || 0), 0);
            const totalDaysPresent = records.filter(record => record.status === 'clocked-out').length;

            return {
                month: start.getMonth() + 1,
                year: start.getFullYear(),
                records,
                totalMinutesWorked,
                totalDaysPresent
            };
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get today's attendance status
     */
    async getTodayStatus(employeeId: string): Promise<EmployeeAttendance | null> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const attendance = await EmployeeAttendanceModel.findOne({
                employeeId: new Types.ObjectId(employeeId),
                date: today
            });

            return attendance;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Admin: Get all employees' attendance for a specific date
     */
    async getAllEmployeesAttendance(date?: Date): Promise<EmployeeAttendance[]> {
        try {
            const targetDate = date || new Date();
            targetDate.setHours(0, 0, 0, 0);

            const records = await EmployeeAttendanceModel.find({
                date: targetDate
            })
            .populate('employeeId', 'name idNumber role')
            .sort({ clockIn: -1 });

            return records;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Admin: Get all employees' monthly summary
     */
    async getAllEmployeesMonthlySummary(startDate?: Date, endDate?: Date) {
        try {
            const now = new Date();
            const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
            const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            const records = await EmployeeAttendanceModel.find({
                date: { $gte: start, $lte: end }
            })
            .populate('employeeId', 'name idNumber role')
            .sort({ date: -1 });

            // Group by employee
            const employeeSummary = new Map();

            records.forEach(record => {
                const empId = (record.employeeId as any)?._id?.toString();
                if (!empId) return;

                if (!employeeSummary.has(empId)) {
                    employeeSummary.set(empId, {
                        employee: record.employeeId,
                        totalMinutes: 0,
                        totalDays: 0,
                        records: []
                    });
                }

                const summary = employeeSummary.get(empId);
                summary.records.push(record);
                if (record.status === 'clocked-out') {
                    summary.totalDays += 1;
                }
                summary.totalMinutes += record.duration || 0;
            });

            const employees = Array.from(employeeSummary.values()).map(emp => ({
                employee: emp.employee,
                totalMinutes: emp.totalMinutes,
                totalDays: emp.totalDays,
                totalHours: parseFloat((emp.totalMinutes / 60).toFixed(2)),
                records: emp.records
            }));

            return {
                month: start.getMonth() + 1,
                year: start.getFullYear(),
                employees
            };
        } catch (err) {
            throw err;
        }
    }
}

export default new EmployeeAttendanceService();
