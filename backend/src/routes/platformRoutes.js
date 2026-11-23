import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePlatformAdmin } from '../middlewares/rbac.js';
import { platformController } from '../controllers/platformController.js';

const router = Router();

router.use(verifyToken, requirePlatformAdmin);

router.post('/tenants', platformController.register);
router.get('/tenants', platformController.list);

export default router;
