import { Request, Response } from 'express';
import NotificationService from './notification.service';

class NotificationController {
  async getAllNotifications(req: Request, res: Response) {
    try {
      // Support pagination for admin listing to avoid returning the whole collection
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const onlyUnread = req.query.unread === '1' || req.query.unread === 'true';
      // Allow admin to override exclusions via query params for debugging or special cases
      const includeEmployee = req.query.includeEmployee === '1' || req.query.includeEmployee === 'true';
      const includeRecipient = req.query.includeRecipient === '1' || req.query.includeRecipient === 'true';

      const opts: any = { page, limit, onlyUnread };
      if (!includeEmployee) opts.excludeRoles = ['employee'];
      if (!includeRecipient) opts.excludeRecipient = true; // default: exclude recipient-targeted notifications

      const result = await NotificationService.findPaged(opts);
      console.log('[Notification] getAllNotifications: opts=', opts, 'returned=', Array.isArray(result) ? result.length : 0);
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
      // Determine role: prefer authenticated user.role, fall back to roles array or explicit query param
      const roleFromQuery = req.query.role ? String(req.query.role) : undefined;
      const role = roleFromQuery || user.role || (Array.isArray(user.roles) && user.roles.length > 0 ? String(user.roles[0]) : undefined);

      const notifications = await NotificationService.findForUser(String(user._id || user), role, onlyUnread, { limit: 200 });
      console.log('[Notification] getForCurrentUser: user=', { id: user._id || user, role }, 'returned=', Array.isArray(notifications) ? notifications.length : 0);
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

  async getStats(req: Request, res: Response) {
    try {
      const stats = await NotificationService.getStats();
      res.status(200).json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // Admin debug: get notifications for a specific recipient id
  async getForRecipient(req: Request, res: Response) {
    try {
      const recipientId = String(req.query.recipientId || req.params.recipientId || '');
      if (!recipientId) return res.status(400).json({ message: 'recipientId query param is required' });
      const limit = req.query.limit ? Number(req.query.limit) : 200;
      const includeData = req.query.includeData === '1' || req.query.includeData === 'true';
      const docs = await NotificationService.findByRecipient(recipientId, limit, includeData);
      console.log('[Notification] getForRecipient:', { recipientId, returned: Array.isArray(docs) ? docs.length : 0 });
      res.status(200).json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new NotificationController();
