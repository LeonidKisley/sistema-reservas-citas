import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { agendaController } from '../controllers/agendaController.js';

const router = Router();

router.get('/', verifyToken, requirePermission('agenda.read'), agendaController.getAgenda);
router.get('/daily', verifyToken, requirePermission('agenda.read'), agendaController.getDaily);

export default router;
