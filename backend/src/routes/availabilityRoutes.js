import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { availabilityController } from '../controllers/availabilityController.js';

const router = Router();

router.get('/', verifyToken, requirePermission('availability.read'), availabilityController.getSlots);

export default router;
