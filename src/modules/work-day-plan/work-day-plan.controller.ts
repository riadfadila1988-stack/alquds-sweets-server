import BaseController from '../../core/base.controller';
import WorkDayPlanService from './work-day-plan.service';
import { Request, Response } from 'express';
import UserModel from '../user/user.model';

class WorkDayPlanController extends BaseController {
  private service = WorkDayPlanService;

  async getByDate(req: Request, res: Response) {
    try {
      const { date } = req.query as any;
      if (!date) return this.handleError(res, 'Missing date query param');
      const data = await this.service.getByDate(date);
      this.handleSuccess(res, data);
    } catch (e: any) {
      this.handleError(res, e.message || 'Failed to get plan by date');
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const data = await this.service.getAll();
      this.handleSuccess(res, data);
    } catch (e: any) {
      this.handleError(res, e.message || 'Failed to get plans');
    }
  }

  async createOrUpdate(req: Request, res: Response) {
    try {
      const { date, assignments } = req.body;
      if (!date) return this.handleError(res, 'Missing date in body');

      // Validate that all assignment users are employees
      const userIds = Array.from(new Set((assignments || []).map((a: any) => a.user)));
      if (userIds.length > 0) {
        const users = await UserModel.find({ _id: { $in: userIds } });
        const invalid = users.filter((u: any) => u.role !== 'employee');
        if (invalid.length > 0 || users.length !== userIds.length) {
          return this.handleError(res, 'All assignments must be for employee users only', 400);
        }
      }

      const data = await this.service.createOrUpdate(date, assignments || []);
      this.handleSuccess(res, data, 201);
    } catch (e: any) {
      this.handleError(res, e.message || 'Failed to create/update plan');
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await this.service.deleteById(req.params.id);
      res.status(204).send();
    } catch (e: any) {
      this.handleError(res, e.message || 'Failed to delete plan');
    }
  }
}

export default new WorkDayPlanController();
