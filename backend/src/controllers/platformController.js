import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { tenantService } from '../services/tenantService.js';

export const platformController = {
  register: asyncHandler(async (req, res) => {
    const result = await tenantService.register(req.body);
    sendCreated(res, result, 'Organización creada por administración de plataforma');
  }),

  list: asyncHandler(async (_req, res) => {
    sendSuccess(res, await tenantService.listAll(), 'Organizaciones de la plataforma listadas');
  })
};
