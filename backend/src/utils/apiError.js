export class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.success = false;
    if (errors !== undefined) this.errors = errors;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Solicitud inválida', errors) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'No autenticado') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'No tienes permisos para esta acción') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflicto con el estado actual del recurso', errors) {
    return new ApiError(409, message, errors);
  }

  static internal(message = 'Error interno del servidor') {
    return new ApiError(500, message);
  }
}
