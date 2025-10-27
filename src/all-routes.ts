import {Router} from "express";
import attendanceRoutes from "./modules/employee-attendance/employee-attendance.routes";
import usersRoutes from "./modules/user/user.routes";
import materialRoutes from './modules/material/material.routes';
import notificationRoutes from './modules/notification/notification.routes';
import taskGroupRoutes from './modules/task-group/task-group.routes';
import workDayPlanRoutes from './modules/work-day-plan/work-day-plan.routes';

const router = Router();

// Public

// Employee Attendance Routes
router.use('/api/v1/attendance', attendanceRoutes);
router.use('/api/v1/users', usersRoutes);
router.use('/api/v1/materials', materialRoutes);
router.use('/api/v1/notifications', notificationRoutes);
router.use('/api/v1/task-groups', taskGroupRoutes);
router.use('/api/v1/work-day-plans', workDayPlanRoutes);

export default router;
