import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { assertValid } from '../utils/validate.js';
import { serviceService } from '../services/serviceService.js';

const idSchema = { id: { mongoId: true } };

export const serviceController = {
  create: asyncHandler(async (req, res) => {
    sendCreated(res, await serviceService.create(req.tenantId, req.body, req.user), 'Servicio creado exitosamente');
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await serviceService.list(req.tenantId, req.user), 'Servicios listados');
  }),

  getById: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await serviceService.getById(req.params.id, req.tenantId, req.user), 'Servicio encontrado');
  }),

  update: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await serviceService.update(req.params.id, req.tenantId, req.body, req.user), 'Servicio actualizado');
  })
};
