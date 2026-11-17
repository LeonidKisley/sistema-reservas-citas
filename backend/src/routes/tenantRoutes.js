import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { tenantController } from '../controllers/tenantController.js';

const router = Router();

router.post('/', tenantController.register);
router.get('/', verifyToken, requirePermission('tenant.read'), tenantController.list);
router.get('/:id', verifyToken, requirePermission('tenant.read'), tenantController.getById);

export default router;
