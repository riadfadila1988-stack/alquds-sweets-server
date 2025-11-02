import { Request, Response } from 'express';
import NotificationService from './notification.service';

class NotificationController {
  async getAllNotifications(req: Request, res: Response) {
    try {
      // Support pagination for admin listing to avoid returning the whole collection
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const onlyUnread = req.query.unread === '1' || req.query.unread === 'true';
      // Exclude notifications that are targeted to individual recipients or to the 'employee' role
      // so admin listing only shows admin/global notifications.
      const result = await NotificationService.findPaged({ page, limit, onlyUnread, excludeRoles: ['employee'], excludeRecipient: true });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getForCurrentUser(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      const onlyUnread = req.query.unread === '1' || req.query.unread === 'true';
      const notifications = await NotificationService.findForUser(String(user._id || user), user.role, onlyUnread);
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

  // mark a notification as read if it belongs to the current user or their role
  async markReadForCurrentUser(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      const id = req.params.id;
      // efficient direct DB lookup
      const found = await NotificationService.findById(id);
      if (!found) return res.status(404).json({ message: 'Notification not found' });
      const isRecipient = found.recipient && String(found.recipient) === String(user._id);
      const isRole = found.role && found.role === user.role;
      if (!isRecipient && !isRole) return res.status(403).json({ message: 'Forbidden' });
      await NotificationService.markRead(id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // mark all notifications for current user (recipient or role) as read
  async markAllReadForCurrentUser(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      // Perform direct update queries to avoid loading many documents into memory (prevents OOM)
      await NotificationService.markAllReadForUser(String(user._id));
      await NotificationService.markAllReadForRole(user.role);
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
      const { message, materialId, recipient, role, data } = req.body;
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

      let n;
      if (recipient) {
        n = await NotificationService.createForUser(message, recipient, data);
      } else if (role) {
        n = await NotificationService.createForRole(message, role, data);
      } else {
        n = await NotificationService.createNotification(message, materialId);
      }

      console.log('[Notification] created:', n?._id);
      res.status(201).json(n);
    } catch (error: any) {
      console.error('[Notification] create error:', error?.message || error);
      res.status(500).json({ message: error.message });
    }
  }
}

export default new NotificationController();
