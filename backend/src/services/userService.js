import bcrypt from 'bcrypt';
import { ApiError } from '../utils/apiError.js';
import { assertValid, passwordRules } from '../utils/validate.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import { userRepository } from '../repositories/userRepository.js';
import { professionalService } from './professionalService.js';

const STAFF_ROLES = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL];

const staffSchema = {
  email: { required: true, email: true },
  password: passwordRules,
  role: { required: true, isIn: STAFF_ROLES },
  firstName: { required: true, type: 'string', minLength: 2, maxLength: 80 },
  lastName: { required: true, type: 'string', minLength: 2, maxLength: 80 },
  professionalId: { mongoId: true },
  document: { type: 'string', maxLength: 40 },
  specialty: { type: 'string', maxLength: 100 },
  workHours: { type: 'array' }
};

function sanitize(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    active: user.active,
    clientId: user.clientId?.toString() || null,
    professionalId: user.professionalId?.toString() || null,
    createdAt: user.createdAt
  };
}

export const userService = {
  async createStaff(tenantId, payload, actor) {
    assertPermission(actor, 'user.create');
    assertValid(payload, staffSchema);

    const email = String(payload.email).toLowerCase().trim();
    if (await userRepository.findByTenantAndEmail(tenantId, email)) {
      throw ApiError.conflict('Ya existe un usuario con ese correo en la organización');
    }

    let professionalId = payload.professionalId || null;
    if (payload.role === ROLES.PROFESSIONAL && !professionalId) {
      const professional = await professionalService.create(
        tenantId,
        {
          firstName: payload.firstName,
          lastName: payload.lastName,
          document: payload.document,
          specialty: payload.specialty,
          workHours: payload.workHours || [],
          services: payload.services || []
        },
        actor
      );
      professionalId = professional.id;
    }

    const user = await userRepository.create(
      {
        tenantId,
        email,
        password: await bcrypt.hash(payload.password, 10),
        role: payload.role,
        professionalId,
        active: true
      },
      tenantId
    );

    if (professionalId) {
      const { professionalRepository } = await import('../repositories/professionalRepository.js');
      await professionalRepository.findByIdAndUpdate(
        professionalId,
        { $set: { userId: user._id } },
        tenantId
      );
    }

    return sanitize(user);
  },

  async list(tenantId, actor) {
    assertPermission(actor, 'user.read');
    const users = await userRepository.find({}, tenantId, { sort: { createdAt: -1 } });
    return users.map(sanitize);
  }
};
