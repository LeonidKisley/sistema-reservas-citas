import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { appointmentController } from '../controllers/appointmentController.js';

const router = Router();

router.use(verifyToken);

router.post('/', requirePermission('appointment.create'), appointmentController.create);
router.get('/', requirePermission('appointment.read'), appointmentController.list);
router.get('/:id', requirePermission('appointment.read'), appointmentController.getById);
router.patch('/:id/reschedule', requirePermission('appointment.reschedule'), appointmentController.reschedule);
router.patch('/:id/cancel', requirePermission('appointment.cancel'), appointmentController.cancel);
router.patch('/:id/status', requirePermission('appointment.status'), appointmentController.updateStatus);

export default router;
