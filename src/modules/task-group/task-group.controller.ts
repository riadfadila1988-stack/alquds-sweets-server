import BaseController from '../../core/base.controller';
import { TaskGroupService } from './task-group.service';
import { Request, Response } from 'express';

class TaskGroupController extends BaseController {
  private taskGroupService = new TaskGroupService();

  // Controller methods only; route registration is done in task-group.routes.ts
  async getAll(req: Request, res: Response) {
    try {
      const data = await this.taskGroupService.getAll();
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const data = await this.taskGroupService.getById(req.params.id);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = await this.taskGroupService.create(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const data = await this.taskGroupService.update(req.params.id, req.body);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await this.taskGroupService.delete(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new TaskGroupController();
