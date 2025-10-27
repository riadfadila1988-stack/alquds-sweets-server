import { Router, Request, Response } from 'express';
import NotificationController from './notification.controller';
import { authenticateJWT, authorizeRoles } from '../../core/middlewares/authJwt';

const router = Router();

// Admin-only: list notifications
router.get('/',
  authenticateJWT,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    await NotificationController.getAllNotifications(req, res);
  }
);

// Admin-only: mark single notification read
router.put('/:id/read',
  authenticateJWT,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    await NotificationController.markRead(req, res);
  }
);

// Admin-only: mark all read
router.put('/mark-all-read',
  authenticateJWT,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    await NotificationController.markAllRead(req, res);
  }
);

// Allow authenticated users to create notifications (e.g., task overrun reasons)
router.post('/',
  authenticateJWT,
  async (req: Request, res: Response) => {
    await NotificationController.create(req, res);
  }
);

export default router;
