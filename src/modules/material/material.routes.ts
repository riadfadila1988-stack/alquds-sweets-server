import { Router } from 'express';
import MaterialController from './material.controller';
import { authenticateJWT, authorizeRoles } from '../../core/middlewares/authJwt';

const router = Router();

router.get('/', authenticateJWT, MaterialController.getAllMaterials);
router.post('/', authenticateJWT, authorizeRoles('admin'), MaterialController.createMaterial);
router.put('/:id', authenticateJWT, authorizeRoles('admin'), MaterialController.updateMaterial);
// Allow employees to update material quantity specifically (used by mobile workers)
// Use an any-cast to avoid compile-time property checks (controller method added dynamically)
router.patch('/:id/quantity', authenticateJWT, authorizeRoles('employee', 'admin'), (MaterialController as any).updateMaterialQuantity);
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), MaterialController.deleteMaterial);

export default router;
