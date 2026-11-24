import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { requirePermission, requireRoles } from '../middlewares/rbac.js';
import { ROLES } from '../utils/permissions.js';
import { uploadImages } from '../middlewares/upload.js';
import { serviceController } from '../controllers/serviceController.js';

const router = Router();

router.use(verifyToken);

router.post('/', requirePermission('service.create'), serviceController.create);
router.get('/', requirePermission('service.read'), serviceController.list);

router.post('/:id/images', requirePermission('service.update'), requireRoles(ROLES.ADMIN), uploadImages, serviceController.addImages);
router.delete('/:id/images/:name', requirePermission('service.update'), requireRoles(ROLES.ADMIN), serviceController.removeImage);
router.patch('/:id/images/order', requirePermission('service.update'), requireRoles(ROLES.ADMIN), serviceController.reorderImages);

router.get('/:id', requirePermission('service.read'), serviceController.getById);
router.patch('/:id', requirePermission('service.update'), serviceController.update);
router.delete('/:id', requirePermission('service.delete'), serviceController.remove);

export default router;
