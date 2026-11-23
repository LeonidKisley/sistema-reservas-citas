import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { tenantService } from '../services/tenantService.js';

export const platformController = {
  register: asyncHandler(async (req, res) => {
    const result = await tenantService.register(req.body, req.user);
    sendCreated(res, result, 'Organizaci��n creada por administraci��n de plataforma');
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await tenantService.listAll(req.user), 'Organizaciones de la plataforma listadas');
  })
};
