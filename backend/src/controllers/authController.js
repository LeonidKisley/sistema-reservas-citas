import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { authService } from '../services/authService.js';

export const authController = {
  login: asyncHandler(async (req, res) => {
    sendSuccess(res, await authService.login(req.body), 'Inicio de sesión exitoso');
  }),

  registerClient: asyncHandler(async (req, res) => {
    sendCreated(res, await authService.registerClient(req.body), 'Cliente registrado exitosamente');
  }),

  logout: asyncHandler(async (req, res) => {
    sendSuccess(res, await authService.logout(req.user, req.user.token), 'Sesión cerrada exitosamente');
  }),

  me: asyncHandler(async (req, res) => {
    sendSuccess(res, await authService.me(req.user), 'Perfil obtenido');
  }),

  updatePassword: asyncHandler(async (req, res) => {
    sendSuccess(res, await authService.updatePassword(req.user, req.body), 'Contraseña actualizada exitosamente');
  })
};
