// ...existing code...
import { Router } from 'express';
import EmployeeStatisticsController from './employee-statistics.controller';
import { authenticateJWT } from '../../core/middlewares/authJwt';

const router = Router();

// GET /statistics/monthly?year=YYYY&month=MM&employeeId=optional
router.get('/statistics/monthly', authenticateJWT, (req, res) => EmployeeStatisticsController.getMonthly(req, res));

export default router;

