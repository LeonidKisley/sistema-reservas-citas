import bcrypt from 'bcrypt';
import { ApiError } from '../utils/apiError.js';
import {
  assertValid,
  normalizePeruPhone,
  optionalDniRules,
  passwordRules,
  peruPhoneRules,
  personNameRules,
  tenantEmailRules
} from '../utils/validate.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import { assertTenantOwnership } from '../utils/assertTenantOwnership.js';
import { userRepository } from '../repositories/userRepository.js';
import { tenantRepository } from '../repositories/tenantRepository.js';
import { professionalService } from './professionalService.js';
import { tenantDomain } from './tenantService.js';

const STAFF_ROLES = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL];

const staffSchema = {
  password: passwordRules,
  role: { required: true, isIn: STAFF_ROLES },
  firstName: personNameRules,
  lastName: personNameRules,
  professionalId: { mongoId: true },
  document: optionalDniRules,
  phone: peruPhoneRules,
  specialty: { type: 'string', maxLength: 100 },
  workHours: { type: 'array' }
};

function sanitize(user) {
  return {
    id: user._id.toString(),
    publicId: user.publicId || null,
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
    const tenant = await tenantRepository.findById(tenantId);
    const domain = tenant?.domain || tenantDomain(tenant?.slug);
    assertValid(payload, {
      ...staffSchema,
      email: tenantEmailRules(domain, { required: true, label: 'Correo electrónico' })
    });

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
          email,
          phone: normalizePeruPhone(payload.phone),
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
  },

  async update(id, tenantId, payload, actor) {
    assertPermission(actor, 'user.update');
    const user = await findUser(id, tenantId);
    assertValid(payload, {
      email: { email: true },
      role: { isIn: STAFF_ROLES },
      active: { type: 'boolean' }
    });

    const updates = {};
    if (payload.email !== undefined) {
      const email = String(payload.email).toLowerCase().trim();
      const existing = await userRepository.findByTenantAndEmail(tenantId, email);
      if (existing && existing._id.toString() !== user._id.toString()) {
        throw ApiError.conflict('Ya existe un usuario con ese correo en la organizaci��n');
      }
      updates.email = email;
    }
    if (payload.role !== undefined) updates.role = payload.role;
    if (payload.active !== undefined) updates.active = payload.active;
    if (Object.keys(updates).length === 0) return sanitize(user);

    const updated = await userRepository.findByIdAndUpdate(id, { $set: updates }, tenantId);
    return sanitize(updated);
  },

  async remove(id, tenantId, actor) {
    assertPermission(actor, 'user.delete');
    const user = await findUser(id, tenantId);
    if (!user.active) return sanitize(user);
    const updated = await userRepository.findByIdAndUpdate(
      id,
      { $set: { active: false }, $inc: { tokenVersion: 1 } },
      tenantId
    );
    return sanitize(updated);
  }
};
