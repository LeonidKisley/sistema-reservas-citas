import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { agendaService } from '../services/agendaService.js';

export const agendaController = {
  getAgenda: asyncHandler(async (req, res) => {
    sendSuccess(res, await agendaService.getAgenda(req.tenantId, req.query, req.user), 'Agenda obtenida');
  }),

  getDaily: asyncHandler(async (req, res) => {
    sendSuccess(res, await agendaService.getDaily(req.tenantId, req.query, req.user), 'Agenda diaria obtenida');
  })
};
