import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { assertValid } from '../utils/validate.js';
import { appointmentService } from '../services/appointmentService.js';

const idSchema = { id: { mongoId: true } };

export const appointmentController = {
  create: asyncHandler(async (req, res) => {
    sendCreated(res, await appointmentService.create(req.tenantId, req.body, req.user), 'Cita registrada exitosamente');
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await appointmentService.list(req.tenantId, req.query, req.user), 'Citas listadas');
  }),

  getById: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await appointmentService.getById(req.params.id, req.tenantId, req.user), 'Cita encontrada');
  }),

  reschedule: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await appointmentService.reschedule(req.params.id, req.tenantId, req.body, req.user), 'Cita reprogramada');
  }),

  cancel: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    const result = await appointmentService.cancel(req.params.id, req.tenantId, req.body, req.user);
    sendSuccess(res, result, result.message);
  }),

  updateStatus: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await appointmentService.updateStatus(req.params.id, req.tenantId, req.body, req.user), 'Estado de la cita actualizado');
  })
};
