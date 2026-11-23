import { ApiError } from '../utils/apiError.js';
import {
  assertValid,
  normalizePeruPhone,
  optionalDniRules,
  peruPhoneRules,
  personNameRules,
  tenantEmailRules
} from '../utils/validate.js';
import { assertTenantOwnership } from '../utils/assertTenantOwnership.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { serviceRepository } from '../repositories/serviceRepository.js';
import { tenantRepository } from '../repositories/tenantRepository.js';
import { tenantDomain } from './tenantService.js';

const workHoursSchema = {
  type: 'array',
  custom: (value) => {
    if (!Array.isArray(value)) return 'workHours debe ser una lista';
    const seen = new Set();
    for (const entry of value) {
      if (!entry || !Number.isInteger(entry.dayOfWeek) || entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
        return 'dayOfWeek debe ser un entero entre 0 (domingo) y 6 (sábado)';
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.start || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.end || '')) {
        return 'Los horarios deben tener formato HH:mm';
      }
      if (entry.start >= entry.end) return 'La hora de inicio debe ser menor a la hora de fin';
      if (seen.has(entry.dayOfWeek)) return 'No se permiten dos jornadas para el mismo día';
      seen.add(entry.dayOfWeek);
    }
    return null;
  }
};

const professionalSchema = {
  firstName: personNameRules,
  lastName: personNameRules,
  document: optionalDniRules,
  phone: peruPhoneRules,
  specialty: { type: 'string', maxLength: 100 },
  workHours: workHoursSchema,
  services: { type: 'array' },
  active: { type: 'boolean' }
};

const patchSchema = {
  firstName: { ...personNameRules, required: false },
  lastName: { ...personNameRules, required: false },
  document: optionalDniRules,
  email: { email: true },
  phone: peruPhoneRules,
  specialty: { type: 'string', maxLength: 100 },
  workHours: workHoursSchema,
  services: { type: 'array' },
  active: { type: 'boolean' }
};

async function professionalSchemaFor(tenantId) {
  const tenant = await tenantRepository.findById(tenantId);
  const domain = tenant?.domain || tenantDomain(tenant?.slug);
  return { ...professionalSchema, email: tenantEmailRules(domain) };
}

function sanitize(professional) {
  return {
    id: professional._id.toString(),
    publicId: professional.publicId || null,
    firstName: professional.firstName,
    lastName: professional.lastName,
    document: professional.document || null,
    email: professional.email || null,
    phone: professional.phone || null,
    specialty: professional.specialty || null,
    workHours: professional.workHours || [],
    services: (professional.services || []).map((item) => item.toString()),
    active: professional.active,
    createdAt: professional.createdAt,
    updatedAt: professional.updatedAt
  };
}

async function findProfessional(id, tenantId) {
  const professional = await professionalRepository.findByIdActive(id, tenantId);
  if (!professional) await assertTenantOwnership(professionalRepository, id, tenantId, 'Profesional');
  return professional;
}

export const professionalService = {
  async create(tenantId, payload, actor) {
    assertPermission(actor, 'professional.create');
    assertValid(payload, await professionalSchemaFor(tenantId));
    if (payload.document && await professionalRepository.findOne({ document: String(payload.document).trim() }, tenantId)) {
      throw ApiError.conflict('Ya existe un profesional con ese documento en la organización');
    }
    if (payload.email && await professionalRepository.findOne({ email: String(payload.email).toLowerCase().trim() }, tenantId)) {
      throw ApiError.conflict('Ya existe un profesional con ese correo en la organización');
    }
    if (payload.services?.length) {
      for (const serviceId of payload.services) {
        const service = await serviceRepository.findById(serviceId, tenantId);
        if (!service) throw ApiError.badRequest('Uno de los servicios no existe en la organización');
      }
    }

    const professional = await professionalRepository.create(
      {
        firstName: String(payload.firstName).trim(),
        lastName: String(payload.lastName).trim(),
        document: payload.document,
        email: payload.email ? String(payload.email).toLowerCase().trim() : undefined,
        phone: normalizePeruPhone(payload.phone),
        specialty: payload.specialty,
        workHours: payload.workHours || [],
        services: payload.services || [],
        active: payload.active ?? true
      },
      tenantId
    );
    return sanitize(professional);
  },

  async list(tenantId, actor) {
    assertPermission(actor, 'professional.read');
    const professionals = await professionalRepository.findAll(tenantId);
    return professionals.map(sanitize);
  },

  async getById(id, tenantId, actor) {
    assertPermission(actor, 'professional.read');
    const professional = await findProfessional(id, tenantId);
    return sanitize(professional);
  },

  async update(id, tenantId, payload, actor) {
    assertPermission(actor, 'professional.update');
    const professional = await findProfessional(id, tenantId);
    const tenant = await tenantRepository.findById(tenantId);
    const domain = tenant?.domain || tenantDomain(tenant?.slug);
    assertValid(payload, { ...patchSchema, email: tenantEmailRules(domain, { required: false }) });

    if (payload.document && payload.document !== professional.document) {
      const duplicate = await professionalRepository.findOne({ document: String(payload.document).trim() }, tenantId);
      if (duplicate && duplicate._id.toString() !== professional._id.toString()) {
        throw ApiError.conflict('Ya existe un profesional con ese documento en la organizaci��n');
      }
    }
    if (payload.email && payload.email !== professional.email) {
      const duplicate = await professionalRepository.findOne({ email: String(payload.email).toLowerCase().trim() }, tenantId);
      if (duplicate && duplicate._id.toString() !== professional._id.toString()) {
        throw ApiError.conflict('Ya existe un profesional con ese correo en la organizaci��n');
      }
    }
    if (payload.services?.length) {
      for (const serviceId of payload.services) {
        const service = await serviceRepository.findById(serviceId, tenantId);
        if (!service) throw ApiError.badRequest('Uno de los servicios no existe en la organizaci��n');
      }
    }

    const updates = {};
    if (payload.firstName !== undefined) updates.firstName = String(payload.firstName).trim();
    if (payload.lastName !== undefined) updates.lastName = String(payload.lastName).trim();
    if (payload.document !== undefined) updates.document = payload.document;
    if (payload.email !== undefined) updates.email = payload.email ? String(payload.email).toLowerCase().trim() : undefined;
    if (payload.phone !== undefined) updates.phone = normalizePeruPhone(payload.phone);
    if (payload.specialty !== undefined) updates.specialty = payload.specialty;
    if (payload.workHours !== undefined) updates.workHours = payload.workHours;
    if (payload.services !== undefined) updates.services = payload.services;
    if (payload.active !== undefined) updates.active = payload.active;
    if (Object.keys(updates).length === 0) return sanitize(professional);

    const updated = await professionalRepository.findByIdAndUpdate(id, { $set: updates }, tenantId);
    return sanitize(updated);
  },

  async remove(id, tenantId, actor) {
    assertPermission(actor, 'professional.delete');
    const professional = await findProfessional(id, tenantId);
    if (!professional.active || professional.deletedAt) return sanitize(professional);
    const updated = await professionalRepository.findByIdAndUpdate(
      id,
      { $set: { active: false, deletedAt: new Date() } },
      tenantId
    );
    if (professional.userId) {
      const { userRepository } = await import('../repositories/userRepository.js');
      await userRepository.findByIdAndUpdate(
        professional.userId,
        { $set: { active: false }, $inc: { tokenVersion: 1 } },
        tenantId
      );
    }
    return sanitize(updated);
  },

  async assignService(professionalId, serviceId, tenantId, actor) {
    assertPermission(actor, 'service.assign');
    const professional = await findProfessional(professionalId, tenantId);
    const service = await serviceRepository.findById(serviceId, tenantId);
    if (!service) throw ApiError.notFound('Servicio no encontrado en la organización activa');

    const alreadyAssigned = (professional.services || []).some((id) => id.toString() === service._id.toString());
    if (!alreadyAssigned) {
      await professionalRepository.addService(professionalId, serviceId, tenantId);
    }
    return this.getById(professionalId, tenantId, actor);
  },

  async unassignService(professionalId, serviceId, tenantId, actor) {
    assertPermission(actor, 'service.assign');
    await findProfessional(professionalId, tenantId);
    await professionalRepository.removeService(professionalId, serviceId, tenantId);
    return this.getById(professionalId, tenantId, actor);
  },

  sanitize,
  PROFESSIONAL_ROLE: ROLES.PROFESSIONAL
};
