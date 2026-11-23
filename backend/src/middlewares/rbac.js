import { assertPermission, can, PLATFORM_PERMISSION } from '../utils/permissions.js';
import { ApiError } from '../utils/apiError.js';

export const requirePermission = (permission) => (req, _res, next) => {
  try {
    assertPermission(req.user, permission);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRoles = (...roles) => (req, _res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Se requiere uno de estos roles: ${roles.join(', ')}`));
  }
  return next();
};

export const canUser = (user, permission) => can(user?.role, permission);

export const requirePlatformAdmin = (req, _res, next) => {
  if (!req.user?.platformAdmin || !can(req.user.role, PLATFORM_PERMISSION)) {
    return next(ApiError.forbidden('Se requiere privilegio de administración de plataforma'));
  }
  return next();
};
