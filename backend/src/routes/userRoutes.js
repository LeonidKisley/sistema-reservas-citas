import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { userController } from '../controllers/userController.js';

const router = Router();

router.use(verifyToken);
router.post('/', requirePermission('user.create'), userController.createStaff);
router.get('/', requirePermission('user.read'), userController.list);

export default router;
