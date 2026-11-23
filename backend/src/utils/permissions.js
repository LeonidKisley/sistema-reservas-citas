import { ApiError } from './apiError.js';

export const ROLES = Object.freeze({
  ADMIN: 'Administrador',
  RECEPTIONIST: 'Recepcionista',
  PROFESSIONAL: 'Profesional',
  CLIENT: 'Cliente'
});

export const PLATFORM_PERMISSION = 'platform.tenant.manage';

const RECEPTIONIST_PERMISSIONS = [
  'client.create', 'client.read', 'client.update', 'client.delete',
  'professional.read', 'service.read',
  'availability.read',
  'appointment.create', 'appointment.read', 'appointment.update',
  'appointment.reschedule', 'appointment.cancel', 'appointment.status',
  'agenda.read', 'password.update', 'auth.logout'
];

const PROFESSIONAL_PERMISSIONS = [
  'client.read', 'professional.read', 'service.read',
  'availability.read', 'appointment.read', 'appointment.status',
  'agenda.read', 'password.update', 'auth.logout'
];

const CLIENT_PERMISSIONS = [
  'professional.read', 'service.read', 'client.read', 'client.update',
  'availability.read', 'agenda.read', 'appointment.create', 'appointment.read',
  'appointment.cancel', 'password.update', 'auth.logout'
];

const PERMISSIONS = {
  [ROLES.ADMIN]: ['*'],
  [ROLES.RECEPTIONIST]: RECEPTIONIST_PERMISSIONS,
  [ROLES.PROFESSIONAL]: PROFESSIONAL_PERMISSIONS,
  [ROLES.CLIENT]: CLIENT_PERMISSIONS
};

export function can(role, permission) {
  const granted = PERMISSIONS[role] || [];
  return granted.includes('*') || granted.includes(permission);
}

export function assertPermission(user, permission) {
  if (!user?.role) throw ApiError.unauthorized();
  if (!can(user.role, permission)) {
    throw ApiError.forbidden(`El rol ${user.role} no puede ejecutar ${permission}`);
  }
  return true;
}

export function rolesWithPermission(permission) {
  return Object.keys(PERMISSIONS).filter((role) => can(role, permission));
}
