import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { assertValid } from '../utils/validate.js';
import { userService } from '../services/userService.js';

const idSchema = { id: { mongoId: true } };

export const userController = {
  createStaff: asyncHandler(async (req, res) => {
    sendCreated(res, await userService.createStaff(req.tenantId, req.body, req.user), 'Usuario creado exitosamente');
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await userService.list(req.tenantId, req.user), 'Usuarios listados');
  }),

  update: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await userService.update(req.params.id, req.tenantId, req.body, req.user), 'Usuario actualizado');
  }),

  remove: asyncHandler(async (req, res) => {
    assertValid(req.params, idSchema);
    sendSuccess(res, await userService.remove(req.params.id, req.tenantId, req.user), 'Usuario desactivado');
  })
};
