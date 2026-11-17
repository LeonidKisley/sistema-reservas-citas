import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { serviceController } from '../controllers/serviceController.js';

const router = Router();

router.use(verifyToken);

router.post('/', requirePermission('service.create'), serviceController.create);
router.get('/', requirePermission('service.read'), serviceController.list);
router.get('/:id', requirePermission('service.read'), serviceController.getById);
router.patch('/:id', requirePermission('service.update'), serviceController.update);

export default router;
