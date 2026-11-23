import { ApiError } from '../utils/apiError.js';
import { assertValid } from '../utils/validate.js';
import { assertPermission } from '../utils/permissions.js';
import { assertTenantOwnership } from '../utils/assertTenantOwnership.js';
import { serviceRepository } from '../repositories/serviceRepository.js';

const serviceSchema = {
  name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  description: { type: 'string', maxLength: 500 },
  durationMinutes: { required: true, type: 'number', min: 1, max: 1440 },
  price: { required: true, type: 'number', min: 0 },
  active: { type: 'boolean' }
};

function sanitize(service) {
  return {
    id: service._id.toString(),
    name: service.name,
    description: service.description || null,
    durationMinutes: service.durationMinutes,
    price: service.price,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt
  };
}

async function findService(id, tenantId) {
  const service = await serviceRepository.findById(id, tenantId);
  if (!service) await assertTenantOwnership(serviceRepository, id, tenantId, 'Servicio');
  return service;
}

export const serviceService = {
  async create(tenantId, payload, actor) {
    assertPermission(actor, 'service.create');
    assertValid(payload, serviceSchema);
    if (await serviceRepository.findByName(tenantId, payload.name)) {
      throw ApiError.conflict('Ya existe un servicio con ese nombre en la organización');
    }
    const service = await serviceRepository.create(
      {
        name: String(payload.name).trim(),
        description: payload.description,
        durationMinutes: Number(payload.durationMinutes),
        price: Number(payload.price),
        active: payload.active ?? true
      },
      tenantId
    );
    return sanitize(service);
  },

  async list(tenantId, actor) {
    assertPermission(actor, 'service.read');
    const services = await serviceRepository.findAll(tenantId);
    return services.map(sanitize);
  },

  async getById(id, tenantId, actor) {
    assertPermission(actor, 'service.read');
    const service = await findService(id, tenantId);
    return sanitize(service);
  },

  async update(id, tenantId, payload, actor) {
    assertPermission(actor, 'service.update');
    const service = await findService(id, tenantId);
    assertValid(payload, serviceSchema);

    const duplicate = await serviceRepository.findByName(tenantId, payload.name);
    if (duplicate && duplicate._id.toString() !== service._id.toString()) {
      throw ApiError.conflict('Ya existe un servicio con ese nombre en la organización');
    }

    const updated = await serviceRepository.findByIdAndUpdate(
      id,
      {
        $set: {
          name: String(payload.name).trim(),
          description: payload.description,
          durationMinutes: Number(payload.durationMinutes),
          price: Number(payload.price),
          active: payload.active ?? service.active
        }
      },
      tenantId
    );
    return sanitize(updated);
  }
};
