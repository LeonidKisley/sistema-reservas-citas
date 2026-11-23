import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { assertValid } from '../utils/validate.js';
import { professionalService } from '../services/professionalService.js';

const idSchema = { id: { mongoId: true } };
const pairSchema = { id: { mongoId: true }, serviceId: { mongoId: true } };

export const professionalController = {
  create: asyncHandler(async (req, res) => {
    sendCreated(res, await professionalService.create(req.tenantId, req.body, req.user), 'Profesional creado exitosamente');
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await professionalService.list(req.tenantId, req.user), 'Profesionales listados');
  }),

  getById: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await professionalService.getById(req.params.id, req.tenantId, req.user), 'Profesional encontrado');
  }),

  update: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await professionalService.update(req.params.id, req.tenantId, req.body, req.user), 'Profesional actualizado');
  }),

  remove: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await professionalService.remove(req.params.id, req.tenantId, req.user), 'Profesional desactivado');
  }),

  assignService: asyncHandler(async (req, res) => {
    assertValid(req.params, pairSchema);
    sendSuccess(
      res,
      await professionalService.assignService(req.params.id, req.params.serviceId, req.tenantId, req.user),
      'Servicio asociado al profesional'
    );
  }),

  unassignService: asyncHandler(async (req, res) => {
    assertValid(req.params, pairSchema);
    sendSuccess(
      res,
      await professionalService.unassignService(req.params.id, req.params.serviceId, req.tenantId, req.user),
      'Servicio desasociado del profesional'
    );
  })
};
