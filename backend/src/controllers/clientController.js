import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { assertValid } from '../utils/validate.js';
import { clientService } from '../services/clientService.js';

const idSchema = { id: { mongoId: true } };

export const clientController = {
  create: asyncHandler(async (req, res) => {
    sendCreated(res, await clientService.create(req.tenantId, req.body, req.user), 'Cliente creado exitosamente');
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await clientService.list(req.tenantId, req.query, req.user), 'Clientes listados');
  }),

  getById: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await clientService.getById(req.params.id, req.tenantId, req.user), 'Cliente encontrado');
  }),

  update: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await clientService.update(req.params.id, req.tenantId, req.body, req.user), 'Cliente actualizado');
  }),

  remove: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    const result = await clientService.remove(req.params.id, req.tenantId, req.user);
    sendSuccess(res, result, result.message);
  })
};
