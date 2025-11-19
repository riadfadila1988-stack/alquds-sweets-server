import { Types } from 'mongoose';
import EmployeeAttendance from '../employee-attendance/employee-attendance.model';
import { WorkDayPlan } from '../work-day-plan/work-day-plan.model';
import User from '../user/user.model';

class EmployeeStatisticsService {
  /**
   * Get monthly statistics for all employees or a specific employee
   * year: full year (e.g. 2025)
   * month: 1-12
   * employeeId: optional ObjectId string
   */
  async getMonthlyStatistics(year: number, month: number, employeeId?: string) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // exclusive

    const matchAttendance: any = {
      date: { $gte: start, $lt: end },
    };
    if (employeeId) matchAttendance.employeeId = new Types.ObjectId(employeeId);

    // Aggregate attendance by employee
    const attendanceAgg = await EmployeeAttendance.aggregate([
      { $match: matchAttendance },
      {
        $group: {
          _id: '$employeeId',
          totalMinutes: { $sum: '$duration' },
          attendanceCount: { $sum: 1 },
        },
      },
    ]);

    // Aggregate tasks completed and minutes from WorkDayPlan
    const matchWorkDay: any = { date: { $gte: start, $lt: end } };
    if (employeeId) matchWorkDay['assignments.user'] = new Types.ObjectId(employeeId);

    const tasksAgg = await WorkDayPlan.aggregate([
      { $match: matchWorkDay },
      { $unwind: '$assignments' },
      { $unwind: '$assignments.tasks' },
      // only consider tasks that have been completed (have endTime)
      { $match: { 'assignments.tasks.endTime': { $exists: true, $ne: null } } },
      // compute actual time and check if late
      {
        $project: {
          user: '$assignments.user',
          actualMinutes: {
            $cond: [
              { $and: [ { $ne: ['$assignments.tasks.startTime', null] }, { $ne: ['$assignments.tasks.endTime', null] } ] },
              { $divide: [ { $subtract: ['$assignments.tasks.endTime', '$assignments.tasks.startTime'] }, 60000 ] },
              0
            ]
          },
          expectedDuration: { $ifNull: ['$assignments.tasks.duration', 0] },
        }
      },
      {
        $project: {
          user: 1,
          actualMinutes: 1,
          expectedDuration: 1,
          isLate: {
            $cond: [
              { $and: [
                { $gt: ['$expectedDuration', 0] },
                { $gt: ['$actualMinutes', '$expectedDuration'] }
              ]},
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: '$user',
          tasksCompleted: { $sum: 1 },
          tasksMinutes: { $sum: '$actualMinutes' },
          lateTasks: { $sum: '$isLate' }
        }
      }
    ]);

    // Map aggregations by id for easy merging
    const attendanceMap = new Map<string, any>();
    attendanceAgg.forEach((a: any) => attendanceMap.set(String(a._id), a));
    const tasksMap = new Map<string, any>();
    tasksAgg.forEach((t: any) => tasksMap.set(String(t._id), t));

    // Build set of employee ids to fetch
    const idsSet = new Set<string>();
    attendanceAgg.forEach((a: any) => idsSet.add(String(a._id)));
    tasksAgg.forEach((t: any) => idsSet.add(String(t._id)));

    // If employeeId specified and not present in sets, ensure it's included
    if (employeeId) idsSet.add(employeeId);

    const ids = Array.from(idsSet).map((s) => new Types.ObjectId(s));

    // Fetch user info
    const users = await User.find({ _id: { $in: ids } }).lean();
    const userMap = new Map<string, any>();
    users.forEach((u: any) => userMap.set(String(u._id), u));

    // Compose final array
    const result: any[] = [];
    for (const idStr of Array.from(idsSet)) {
      const attendance = attendanceMap.get(idStr) || { totalMinutes: 0, attendanceCount: 0 };
      const tasks = tasksMap.get(idStr) || { tasksCompleted: 0, tasksMinutes: 0, lateTasks: 0 };
      const user = userMap.get(idStr) || { name: 'Unknown' };

      const totalMinutes = attendance.totalMinutes || 0;
      const totalHours = Math.round((totalMinutes) / 60 * 10) / 10; // 1 decimal

      const tasksMinutes = tasks.tasksMinutes || 0;
      const tasksHours = Math.round((tasksMinutes) / 60 * 10) / 10; // 1 decimal

      const tasksCompleted = tasks.tasksCompleted || 0;
      const lateTasks = tasks.lateTasks || 0;
      const lateTasksPct = tasksCompleted > 0 ? Math.round((lateTasks / tasksCompleted) * 1000) / 10 : 0; // percentage with 1 decimal
      const activityCount = (attendance.attendanceCount || 0) + tasksCompleted;

      const netPerformance = totalHours > 0 ? Math.round((tasksCompleted / totalHours) * 100) / 100 : 0; // tasks per hour rounded

      // share of task hours in total hours
      const tasksHoursShare = totalHours > 0 ? Math.round((tasksHours / totalHours) * 1000) / 1000 : 0; // ratio rounded to 3 decimals
      const tasksHoursSharePct = Math.round(tasksHoursShare * 100 * 10) / 10; // percentage with 1 decimal

      result.push({
        _id: idStr,
        employeeName: user.name,
        totalHours,
        tasksCompleted,
        lateTasks,
        lateTasksPct,
        activityCount,
        netPerformance,
        // expose raw values for client-side detailed breakdown
        totalMinutes: totalMinutes,
        attendanceCount: attendance.attendanceCount || 0,
        // task time details
        tasksMinutes: Math.round(tasksMinutes * 10) / 10,
        tasksHours,
        tasksHoursShare,
        tasksHoursSharePct,
      });
    }

    // Sort by totalHours desc
    result.sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0));

    return result;
  }
}

export default new EmployeeStatisticsService();
