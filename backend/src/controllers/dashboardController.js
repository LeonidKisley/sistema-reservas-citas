import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { dashboardService } from '../services/dashboardService.js';

export const dashboardController = {
  total: asyncHandler(async (req, res) => {
    sendSuccess(res, await dashboardService.getTotalAppointments(req.tenantId, req.query, req.user), 'Total de citas obtenido');
  }),

  topServices: asyncHandler(async (req, res) => {
    sendSuccess(res, await dashboardService.getTopServices(req.tenantId, req.query, req.user), 'Servicios más solicitados obtenidos');
  }),

  topClients: asyncHandler(async (req, res) => {
    sendSuccess(res, await dashboardService.getTopClients(req.tenantId, req.query, req.user), 'Clientes frecuentes obtenidos');
  }),

  consolidated: asyncHandler(async (req, res) => {
    sendSuccess(res, await dashboardService.getConsolidated(req.tenantId, req.query, req.user), 'Dashboard consolidado obtenido');
  })
};
