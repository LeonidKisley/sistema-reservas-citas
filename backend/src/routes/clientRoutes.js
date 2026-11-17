import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { clientController } from '../controllers/clientController.js';

const router = Router();

router.use(verifyToken);

router.post('/', requirePermission('client.create'), clientController.create);
router.get('/', requirePermission('client.read'), clientController.list);
router.get('/:id', requirePermission('client.read'), clientController.getById);
router.patch('/:id', requirePermission('client.update'), clientController.update);
router.delete('/:id', requirePermission('client.delete'), clientController.remove);

export default router;
