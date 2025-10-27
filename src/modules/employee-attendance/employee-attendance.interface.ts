import { Document, Types } from "mongoose";

export interface EmployeeAttendance extends Document {
    employeeId: Types.ObjectId;
    date: Date;
    clockIn: Date | null;
    clockOut: Date | null;
    duration: number; // in minutes
    status: 'clocked-in' | 'clocked-out' | 'incomplete';
    clockInLocation?: {
        latitude: number;
        longitude: number;
        label?: string; // optional human readable label
    } | null;
    clockOutLocation?: {
        latitude: number;
        longitude: number;
        label?: string;
    } | null;
}

export interface MonthlyHistoryResponse {
    month: number;
    year: number;
    records: EmployeeAttendance[];
    totalMinutesWorked: number;
    totalDaysPresent: number;
}
