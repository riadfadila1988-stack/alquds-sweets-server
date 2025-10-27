import { Schema, model } from "mongoose";
import { EmployeeAttendance } from "./employee-attendance.interface";

const EmployeeAttendanceSchema: Schema = new Schema<EmployeeAttendance>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date, default: null },
    clockOut: { type: Date, default: null },
    duration: { type: Number, default: 0 }, // in minutes
    status: {
        type: String, 
        enum: ['clocked-in', 'clocked-out', 'incomplete'], 
        default: 'clocked-in' 
    },
    clockInLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        label: { type: String },
    },
    clockOutLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        label: { type: String },
    }
}, { timestamps: true });

// Index for faster queries
EmployeeAttendanceSchema.index({ employeeId: 1, date: 1 });

export default model<EmployeeAttendance>("EmployeeAttendance", EmployeeAttendanceSchema);
