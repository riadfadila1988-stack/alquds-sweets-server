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

// Admin-only: stats for debugging
router.get('/stats',
  authenticateJWT,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    await NotificationController.getStats(req, res);
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

// Authenticated user: get their notifications (recipient + role)
router.get('/me',
  authenticateJWT,
  async (req: Request, res: Response) => {
    await NotificationController.getForCurrentUser(req, res);
  }
);

// Authenticated user: mark one of their notifications read
router.put('/me/:id/read',
  authenticateJWT,
  async (req: Request, res: Response) => {
    await NotificationController.markReadForCurrentUser(req, res);
  }
);

// Authenticated user: mark all their notifications (recipient+role) as read
router.put('/me/mark-all-read',
  authenticateJWT,
  async (req: Request, res: Response) => {
    await NotificationController.markAllReadForCurrentUser(req, res);
  }
);

export default router;
