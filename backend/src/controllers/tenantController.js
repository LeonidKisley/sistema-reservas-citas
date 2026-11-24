import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { assertValid } from '../utils/validate.js';
import { tenantService } from '../services/tenantService.js';

const idSchema = { id: { mongoId: true } };

export const tenantController = {
  register: asyncHandler(async (req, res) => {
    const result = await tenantService.register(req.body);
    sendCreated(res, result, 'Organización y administrador creados exitosamente');
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await tenantService.list(req.tenantId, req.user), 'Organizaciones listadas');
  }),

  getById: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await tenantService.getById(req.params.id, req.tenantId, req.user), 'Organización encontrada');
  })
};
