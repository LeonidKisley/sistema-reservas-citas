import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { authService } from '../services/authService.js';
import { AUTH_COOKIE_NAME } from '../middlewares/auth.js';
import { isProduction } from '../config/env.js';

const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/'
};

export const authController = {
  login: asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    res.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions);
    sendSuccess(res, data, 'Inicio de sesión exitoso');
  }),

  registerClient: asyncHandler(async (req, res) => {
    sendCreated(res, await authService.registerClient(req.body), 'Cliente registrado exitosamente');
  }),

  logout: asyncHandler(async (req, res) => {
    const data = await authService.logout(req.user, req.user.token);
    res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
    sendSuccess(res, data, 'Sesión cerrada exitosamente');
  }),

  me: asyncHandler(async (req, res) => {
    sendSuccess(res, await authService.me(req.user), 'Perfil obtenido');
  }),

  updatePassword: asyncHandler(async (req, res) => {
    sendSuccess(res, await authService.updatePassword(req.user, req.body), 'Contraseña actualizada exitosamente');
  })
};
