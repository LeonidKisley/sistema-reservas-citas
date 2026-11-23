import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { userRepository } from '../repositories/userRepository.js';
import { tokenBlacklistRepository } from '../repositories/tokenBlacklistRepository.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function verifyToken(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Token de acceso requerido');
    }

    if (!env.jwtSecret) throw ApiError.internal('JWT_SECRET no configurado');

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Token expirado, reautentícate');
      }
      throw ApiError.unauthorized('Token inválido');
    }

    if (await tokenBlacklistRepository.isBlacklisted(hashToken(token), payload.tenantId)) {
      throw ApiError.unauthorized('La sesión ya fue cerrada');
    }

    const user = await userRepository.findByIdAndTenant(payload.sub, payload.tenantId);
    if (!user || !user.active) {
      throw ApiError.unauthorized('Usuario inexistente o inactivo');
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      throw ApiError.unauthorized('La sesión fue invalidada');
    }

    req.user = {
      id: user._id.toString(),
      tenantId: user.tenantId.toString(),
      role: user.role,
      email: user.email,
      clientId: user.clientId?.toString() || null,
      professionalId: user.professionalId?.toString() || null,
      platformAdmin: Boolean(user.platformAdmin),
      tokenVersion: user.tokenVersion,
      token
    };
    req.tenantId = req.user.tenantId;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireTenantContext(req, _res, next) {
  if (!req.user?.tenantId) {
    return next(ApiError.unauthorized('Se requiere un tenant activo'));
  }
  req.tenantId = req.user.tenantId;
  return next();
}
