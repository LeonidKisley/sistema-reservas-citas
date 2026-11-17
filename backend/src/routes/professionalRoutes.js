import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { professionalController } from '../controllers/professionalController.js';

const router = Router();

router.use(verifyToken);

router.post('/', requirePermission('professional.create'), professionalController.create);
router.get('/', requirePermission('professional.read'), professionalController.list);
router.get('/:id', requirePermission('professional.read'), professionalController.getById);
router.patch('/:id', requirePermission('professional.update'), professionalController.update);
router.post('/:id/services/:serviceId', requirePermission('service.assign'), professionalController.assignService);
router.delete('/:id/services/:serviceId', requirePermission('service.assign'), professionalController.unassignService);

export default router;
