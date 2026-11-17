import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { dashboardController } from '../controllers/dashboardController.js';

const router = Router();

router.use(verifyToken, requirePermission('dashboard.read'));

router.get('/total', dashboardController.total);
router.get('/top-services', dashboardController.topServices);
router.get('/top-clients', dashboardController.topClients);
router.get('/consolidated', dashboardController.consolidated);

export default router;
