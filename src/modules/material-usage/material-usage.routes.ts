import express, { Request, Response } from 'express';
import MaterialUsageController from './material-usage.controller';
import { authenticateJWT, authorizeRoles } from '../../core/middlewares/authJwt';

const router = express.Router();

// Get monthly statistics (admin only)
router.get('/statistics/monthly',
  authenticateJWT,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    await MaterialUsageController.getMonthlyStatistics(req, res);
  }
);

// Get material history by id (authenticated users)
router.get('/material/:materialId/history',
  authenticateJWT,
  async (req: Request, res: Response) => {
    await MaterialUsageController.getMaterialHistory(req, res);
  }
);

// Get all usage logs (admin only)
router.get('/all',
  authenticateJWT,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    await MaterialUsageController.getAllUsage(req, res);
  }
);

export default router;
