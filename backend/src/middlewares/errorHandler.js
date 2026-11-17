import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { sendError } from '../utils/response.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Ruta ${req.method} ${req.originalUrl} no encontrada`));
}

function normalizeMongooseError(error) {
  if (error.name === 'ValidationError') {
    const errors = Object.fromEntries(
      Object.entries(error.errors).map(([field, detail]) => [field, detail.message])
    );
    return ApiError.badRequest('Error de validación del modelo', errors);
  }

  if (error.name === 'CastError') {
    return ApiError.badRequest(`Valor inválido para el campo ${error.path}`);
  }

  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || {}).join(', ') || 'campo único';
    return ApiError.conflict(`Ya existe un registro con ese valor en: ${fields}`);
  }

  return null;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _req, res, _next) {
  const normalized = error instanceof ApiError ? error : normalizeMongooseError(error);

  if (normalized) {
    const body = { success: false, data: null, message: normalized.message };
    if (normalized.errors !== undefined) body.errors = normalized.errors;
    return res.status(normalized.statusCode).json(body);
  }

  console.error('[ERROR]', error);

  return sendError(res, 500, 'Error interno del servidor');
}
