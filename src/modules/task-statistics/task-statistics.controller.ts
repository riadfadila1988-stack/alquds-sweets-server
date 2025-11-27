// filepath: c:\Users\user8\Desktop\alquds\alquds-sweets-server\src\modules\task-statistics\task-statistics.controller.ts
import { Request, Response } from 'express';
import taskStatisticsService from './task-statistics.service';

class TaskStatisticsController {
  /**
   * GET /api/v1/task-statistics/monthly?year=2025&month=11
   * Returns monthly task statistics
   */
  async getMonthlyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const year = parseInt(req.query.year as string);
      const month = parseInt(req.query.month as string);

      if (!year || !month || month < 1 || month > 12) {
        res.status(400).json({
          message: 'Invalid year or month. Please provide year (e.g., 2025) and month (1-12).',
        });
        return;
      }

      const statistics = await taskStatisticsService.getMonthlyStatistics(year, month);

      res.json(statistics);
    } catch (error: any) {
      console.error('[TaskStatistics] Error fetching monthly statistics:', error);
      res.status(500).json({
        message: 'Failed to fetch task statistics',
        error: error.message,
      });
    }
  }
}

export default new TaskStatisticsController();

