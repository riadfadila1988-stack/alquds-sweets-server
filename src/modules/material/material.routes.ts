import { Router } from 'express';
import MaterialController from './material.controller';
import { authenticateJWT, authorizeRoles } from '../../core/middlewares/authJwt';

const router = Router();

router.get('/', authenticateJWT, MaterialController.getAllMaterials);
router.post('/', authenticateJWT, authorizeRoles('admin'), MaterialController.createMaterial);
router.put('/:id', authenticateJWT, authorizeRoles('admin'), MaterialController.updateMaterial);
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), MaterialController.deleteMaterial);

export default router;

