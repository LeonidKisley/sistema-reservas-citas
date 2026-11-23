import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { userController } from '../controllers/userController.js';

const router = Router();

router.use(verifyToken);
router.post('/', requirePermission('user.create'), userController.createStaff);
router.get('/', requirePermission('user.read'), userController.list);
router.patch('/:id', requirePermission('user.update'), userController.update);
router.delete('/:id', requirePermission('user.delete'), userController.remove);

export default router;
