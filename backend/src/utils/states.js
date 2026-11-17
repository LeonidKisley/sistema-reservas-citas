import { ApiError } from './apiError.js';

export const APPOINTMENT_STATUSES = Object.freeze([
  'programada',
  'confirmada',
  'completada',
  'cancelada',
  'no asistió'
]);

export const BLOCKING_STATUSES = Object.freeze(['cancelada', 'no asistió']);

export const ALLOWED_TRANSITIONS = Object.freeze({
  programada: ['confirmada', 'cancelada', 'no asistió'],
  confirmada: ['completada', 'cancelada', 'no asistió'],
  completada: [],
  cancelada: [],
  'no asistió': []
});

export function isBlocking(status) {
  return BLOCKING_STATUSES.includes(status);
}

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

export function assertTransition(from, to) {
  if (!APPOINTMENT_STATUSES.includes(to)) {
    throw ApiError.badRequest(`Estado "${to}" no contemplado en el catálogo oficial`, {
      status: `Estados permitidos: ${APPOINTMENT_STATUSES.join(', ')}`
    });
  }
  if (!canTransition(from, to)) {
    throw ApiError.conflict(`Transición no permitida: ${from} → ${to}`);
  }
  return true;
}
