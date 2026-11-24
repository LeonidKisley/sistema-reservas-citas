import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { assertValid } from '../utils/validate.js';
import { serviceService } from '../services/serviceService.js';
import { serviceImageService } from '../services/serviceImageService.js';

const idSchema = { id: { mongoId: true } };
const imageNameSchema = { name: { type: 'string', minLength: 1 } };
const imageOrderSchema = { order: { required: true, type: 'array' } };

export const serviceController = {
  create: asyncHandler(async (req, res) => {
    sendCreated(res, await serviceService.create(req.tenantId, req.body, req.user), 'Servicio creado exitosamente');
  }),

  list: asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    sendSuccess(res, await serviceService.list(req.tenantId, req.user, { includeInactive }), 'Servicios listados');
  }),

  getById: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await serviceService.getById(req.params.id, req.tenantId, req.user), 'Servicio encontrado');
  }),

  update: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await serviceService.update(req.params.id, req.tenantId, req.body, req.user), 'Servicio actualizado');
  }),

  remove: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await serviceService.remove(req.params.id, req.tenantId, req.user), 'Servicio desactivado');
  }),

  addImages: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    const images = await serviceImageService.add(req.params.id, req.tenantId, req.files || [], req.user);
    sendCreated(res, { images }, 'Fotos agregadas exitosamente');
  }),

  removeImage: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    assertValid(req.params, imageNameSchema);
    const images = await serviceImageService.remove(req.params.id, req.tenantId, req.params.name, req.user);
    sendSuccess(res, { images }, 'Foto eliminada exitosamente');
  }),

  reorderImages: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    assertValid(req.body, imageOrderSchema);
    const images = await serviceImageService.reorder(req.params.id, req.tenantId, req.body.order, req.user);
    sendSuccess(res, { images }, 'Orden de fotos actualizado');
  })
};
