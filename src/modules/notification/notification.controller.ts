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
      // ensure the notification is either addressed to this user or to their role
      const found = await NotificationService.findAll().then((all: any[]) => all.find(n => String(n._id) === String(id)));
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
      // mark recipient-targeted notifications
      await NotificationService.findUnreadForUser(String(user._id)).then((arr: any[]) => {
        const ids = arr.map(a => a._id);
        return Promise.all(ids.map((id: any) => NotificationService.markRead(String(id))));
      });
      // mark role-targeted notifications
      await NotificationService.findUnreadForRole(user.role).then((arr: any[]) => {
        const ids = arr.map(a => a._id);
        return Promise.all(ids.map((id: any) => NotificationService.markRead(String(id))));
      });
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
