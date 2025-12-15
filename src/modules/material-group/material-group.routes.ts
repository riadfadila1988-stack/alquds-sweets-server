import { Router, Request, Response } from 'express';
import MaterialGroupController from './material-group.controller';
import { authenticateJWT, authorizeRoles } from '../../core/middlewares/authJwt';

const router = Router();

router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  await MaterialGroupController.getAllGroups(req as any, res as any);
});

// Fetch a single group by id
router.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
  await MaterialGroupController.getGroupById(req as any, res as any);
});

router.post('/', authenticateJWT, authorizeRoles('admin'), async (req: Request, res: Response) => {
  await MaterialGroupController.createGroup(req as any, res as any);
});

router.put('/:id', authenticateJWT, authorizeRoles('admin'), async (req: Request, res: Response) => {
  await MaterialGroupController.updateGroup(req as any, res as any);
});

router.delete('/:id', authenticateJWT, authorizeRoles('admin'), async (req: Request, res: Response) => {
  await MaterialGroupController.deleteGroup(req as any, res as any);
});

export default router;
