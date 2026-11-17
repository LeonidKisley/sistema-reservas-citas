import { ApiError } from '../utils/apiError.js';
import { assertValid } from '../utils/validate.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { serviceRepository } from '../repositories/serviceRepository.js';

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
  firstName: { required: true, type: 'string', minLength: 2, maxLength: 80 },
  lastName: { required: true, type: 'string', minLength: 2, maxLength: 80 },
  document: { type: 'string', maxLength: 40 },
  email: { email: true },
  phone: { type: 'string', maxLength: 40 },
  specialty: { type: 'string', maxLength: 100 },
  workHours: workHoursSchema,
  services: { type: 'array' },
  active: { type: 'boolean' }
};

function sanitize(professional) {
  return {
    id: professional._id.toString(),
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

function assertNotOtherTenant(professional, tenantId) {
  if (professional && professional.tenantId.toString() !== tenantId.toString()) {
    throw ApiError.forbidden('No puedes modificar profesionales de otra organización');
  }
}

export const professionalService = {
  async create(tenantId, payload, actor) {
    assertPermission(actor, 'professional.create');
    assertValid(payload, professionalSchema);
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
        phone: payload.phone,
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
    const professional = await professionalRepository.findByIdActive(id, tenantId);
    if (!professional) throw ApiError.notFound('Profesional no encontrado en la organización activa');
    assertNotOtherTenant(professional, tenantId);
    return sanitize(professional);
  },

  async update(id, tenantId, payload, actor) {
    assertPermission(actor, 'professional.update');
    const professional = await professionalRepository.findByIdActive(id, tenantId);
    if (!professional) throw ApiError.notFound('Profesional no encontrado en la organización activa');
    assertNotOtherTenant(professional, tenantId);
    assertValid(payload, professionalSchema);

    const updated = await professionalRepository.findByIdAndUpdate(
      id,
      {
        $set: {
          firstName: String(payload.firstName).trim(),
          lastName: String(payload.lastName).trim(),
          document: payload.document,
          email: payload.email ? String(payload.email).toLowerCase().trim() : undefined,
          phone: payload.phone,
          specialty: payload.specialty,
          workHours: payload.workHours || [],
          services: payload.services || [],
          active: payload.active ?? professional.active
        }
      },
      tenantId
    );
    return sanitize(updated);
  },

  async assignService(professionalId, serviceId, tenantId, actor) {
    assertPermission(actor, 'service.assign');
    const professional = await professionalRepository.findByIdActive(professionalId, tenantId);
    if (!professional) throw ApiError.notFound('Profesional no encontrado en la organización activa');
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
    const professional = await professionalRepository.findByIdActive(professionalId, tenantId);
    if (!professional) throw ApiError.notFound('Profesional no encontrado en la organización activa');
    await professionalRepository.removeService(professionalId, serviceId, tenantId);
    return this.getById(professionalId, tenantId, actor);
  },

  sanitize,
  PROFESSIONAL_ROLE: ROLES.PROFESSIONAL
};
