// ...existing code...
import BaseController from '../../core/base.controller';
import EmployeeStatisticsService from './employee-statistics.service';
import { Request, Response } from 'express';

class EmployeeStatisticsController extends BaseController {
  async getMonthly(req: Request, res: Response) {
    try {
      const { year, month, employeeId } = req.query as any;
      if (!year || !month) {
        this.handleError(res, 'year and month are required', 400);
        return;
      }

      const y = parseInt(year as string, 10);
      const m = parseInt(month as string, 10);
      if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        this.handleError(res, 'Invalid year or month', 400);
        return;
      }

      const authUser = (req as any).user;
      let targetEmployeeId: string | undefined = undefined;
      if (employeeId && typeof employeeId === 'string') {
        // only admin can query other employees
        if (!authUser || authUser.role !== 'admin') {
          this.handleError(res, 'Not authorized to query other employee data', 403);
          return;
        }
        targetEmployeeId = employeeId;
      } else if (authUser && authUser.role === 'employee') {
        targetEmployeeId = authUser.id as string;
      }

      const data = await EmployeeStatisticsService.getMonthlyStatistics(y, m, targetEmployeeId);
      this.handleSuccess(res, data);
    } catch (error: any) {
      this.handleError(res, error.message || 'Failed to fetch employee statistics', 400);
    }
  }
}

export default new EmployeeStatisticsController();

