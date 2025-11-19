// filepath: c:\Users\user8\Desktop\alquds\alquds-sweets-server\src\modules\task-statistics\task-statistics.routes.ts
import { Router } from 'express';
import taskStatisticsController from './task-statistics.controller';
import { authenticateJWT } from '../../core/middlewares/authJwt';

const router = Router();

/**
 * @route GET /api/v1/task-statistics/monthly
 * @desc Get monthly task statistics
 * @query year (required) - e.g., 2025
 * @query month (required) - 1-12
 * @access Private
 */
router.get('/monthly', authenticateJWT, (req, res) => taskStatisticsController.getMonthlyStatistics(req, res));

export default router;

