export function sendSuccess(res, data, message = 'Operación exitosa', statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message });
}

export function sendCreated(res, data, message = 'Recurso creado exitosamente') {
  return sendSuccess(res, data, message, 201);
}

export function sendError(res, statusCode, message, errors) {
  const body = { success: false, data: null, message };
  if (errors !== undefined) body.errors = errors;
  return res.status(statusCode).json(body);
}
