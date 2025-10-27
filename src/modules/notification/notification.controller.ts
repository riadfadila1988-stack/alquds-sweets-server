import { Request, Response } from 'express';
import NotificationService from './notification.service';

class NotificationController {
  async getAllNotifications(req: Request, res: Response) {
    try {
      const notifications = await NotificationService.findAll?.() || [];
      res.status(200).json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async markRead(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await NotificationService.markRead?.(id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async markAllRead(req: Request, res: Response) {
    try {
      await NotificationService.markAllRead();
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { message, materialId } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required' });
      }

      // Debug logging to verify incoming create requests; includes authenticated user info if present
      try {
        const user = (req as any).user;
        console.log('[Notification] create request from user:', user ? { id: user._id || user.id, name: user.name, role: user.role } : 'unauthenticated', 'message:', message);
      } catch (logErr) {
        console.log('[Notification] create request (failed to read user):', logErr);
      }

      const n = await NotificationService.createNotification(message, materialId);
      console.log('[Notification] created:', n?._id);
      res.status(201).json(n);
    } catch (error: any) {
      console.error('[Notification] create error:', error?.message || error);
      res.status(500).json({ message: error.message });
    }
  }
}

export default new NotificationController();
