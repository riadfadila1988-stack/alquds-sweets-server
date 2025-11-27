import {Router} from "express";
import attendanceRoutes from "./modules/employee-attendance/employee-attendance.routes";
import usersRoutes from "./modules/user/user.routes";
import materialRoutes from './modules/material/material.routes';
import notificationRoutes from './modules/notification/notification.routes';
import taskGroupRoutes from './modules/task-group/task-group.routes';
import workDayPlanRoutes from './modules/work-day-plan/work-day-plan.routes';
import materialGroupRoutes from './modules/material-group/material-group.routes';
import pushTokenRoutes from './modules/push-token/push-token.routes';
import materialUsageRoutes from './modules/material-usage/material-usage.routes';
import employeeStatisticsRoutes from './modules/employee-statistics/employee-statistics.routes';
import taskStatisticsRoutes from './modules/task-statistics/task-statistics.routes';

const router = Router();

// Public

// Employee Attendance Routes
router.use('/api/v1/attendance', attendanceRoutes);
router.use('/api/v1/users', usersRoutes);
router.use('/api/v1/materials', materialRoutes);
router.use('/api/v1/material-usage', materialUsageRoutes);
router.use('/api/v1/material-groups', materialGroupRoutes);
router.use('/api/v1/notifications', notificationRoutes);
router.use('/api/v1/task-groups', taskGroupRoutes);
router.use('/api/v1/work-day-plans', workDayPlanRoutes);
router.use('/api/v1/employees', employeeStatisticsRoutes);
router.use('/api/v1/task-statistics', taskStatisticsRoutes);
router.use('/api/v1', pushTokenRoutes);

export default router;
