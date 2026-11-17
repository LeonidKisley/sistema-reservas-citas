import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { authController } from '../controllers/authController.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register-client', authController.registerClient);
router.post('/logout', verifyToken, requirePermission('auth.logout'), authController.logout);
router.get('/me', verifyToken, authController.me);
router.patch('/password', verifyToken, requirePermission('password.update'), authController.updatePassword);

export default router;
