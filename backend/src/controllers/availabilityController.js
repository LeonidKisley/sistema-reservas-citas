import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { availabilityService } from '../services/availabilityService.js';

export const availabilityController = {
  getSlots: asyncHandler(async (req, res) => {
    const result = await availabilityService.getSlots(req.tenantId, req.query, req.user);
    sendSuccess(res, result, result.slots.length ? 'Bloques disponibles obtenidos' : 'No hay bloques libres para la fecha');
  })
};
