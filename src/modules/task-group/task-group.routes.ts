import { Router, Request, Response } from 'express';
import TaskGroupController from './task-group.controller';
import { authenticateJWT, authorizeRoles } from '../../core/middlewares/authJwt';

const router = Router();

// Public/Authenticated routes
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  await TaskGroupController.getAll(req, res);
});

router.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
  await TaskGroupController.getById(req, res);
});

// Admin-only routes
router.post('/', authenticateJWT, authorizeRoles('admin'), async (req: Request, res: Response) => {
  await TaskGroupController.create(req, res);
});

router.put('/:id', authenticateJWT, authorizeRoles('admin'), async (req: Request, res: Response) => {
  await TaskGroupController.update(req, res);
});

router.delete('/:id', authenticateJWT, authorizeRoles('admin'), async (req: Request, res: Response) => {
  await TaskGroupController.delete(req, res);
});

export default router;
