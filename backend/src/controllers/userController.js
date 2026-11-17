import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { userService } from '../services/userService.js';

export const userController = {
  createStaff: asyncHandler(async (req, res) => {
    sendCreated(res, await userService.createStaff(req.tenantId, req.body, req.user), 'Usuario creado exitosamente');
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await userService.list(req.tenantId, req.user), 'Usuarios listados');
  })
};
