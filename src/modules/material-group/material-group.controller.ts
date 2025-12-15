import { Request, Response } from 'express';
import MaterialGroupService from './material-group.service';

class MaterialGroupController {
  async getAllGroups(req: Request, res: Response) {
    try {
      const groups = await MaterialGroupService.getAllGroups();
      res.status(200).json(groups);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }

  async getGroupById(req: Request, res: Response) {
    try {
      const group = await MaterialGroupService.getGroupById(req.params.id);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      res.status(200).json(group);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }

  async createGroup(req: Request, res: Response) {
    try {
      const group = await MaterialGroupService.createGroup(req.body);
      res.status(201).json(group);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }

  async updateGroup(req: Request, res: Response) {
    try {
      const group = await MaterialGroupService.updateGroup(req.params.id, req.body);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      res.status(200).json(group);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }

  async deleteGroup(req: Request, res: Response) {
    try {
      await MaterialGroupService.deleteGroup(req.params.id);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }
}

export default new MaterialGroupController();
