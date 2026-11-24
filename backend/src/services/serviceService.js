import { ApiError } from '../utils/apiError.js';
import { assertValid } from '../utils/validate.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import { assertTenantOwnership } from '../utils/assertTenantOwnership.js';
import { serviceRepository } from '../repositories/serviceRepository.js';
import { DEFAULT_SERVICE_CATEGORY, SERVICE_CATEGORIES } from '../constants/serviceCategories.js';

const categoryRules = { type: 'string', isIn: SERVICE_CATEGORIES, label: 'Categoría' };

const serviceSchema = {
  name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  description: { type: 'string', maxLength: 500 },
  durationMinutes: { required: true, type: 'number', min: 1, max: 1440 },
  price: { required: true, type: 'number', min: 0 },
  category: categoryRules,
  trending: { type: 'boolean' },
  order: { type: 'number', min: 0, max: 9999 },
  active: { type: 'boolean' }
};

const patchSchema = {
  name: { type: 'string', minLength: 2, maxLength: 100 },
  description: { type: 'string', maxLength: 500 },
  durationMinutes: { type: 'number', min: 1, max: 1440 },
  price: { type: 'number', min: 0 },
  category: categoryRules,
  trending: { type: 'boolean' },
  order: { type: 'number', min: 0, max: 9999 },
  active: { type: 'boolean' }
};

function normalizeCategory(value) {
  const candidate = String(value || DEFAULT_SERVICE_CATEGORY).trim().toLowerCase();
  return SERVICE_CATEGORIES.includes(candidate) ? candidate : DEFAULT_SERVICE_CATEGORY;
}

function sanitize(service) {
  return {
    id: service._id.toString(),
    publicId: service.publicId || null,
    name: service.name,
    description: service.description || null,
    durationMinutes: service.durationMinutes,
    price: service.price,
    category: service.category || DEFAULT_SERVICE_CATEGORY,
    trending: Boolean(service.trending),
    images: (service.images || []).map((image) => ({ name: image.name, url: image.url })),
    order: service.order ?? 0,
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
        category: normalizeCategory(payload.category),
        trending: Boolean(payload.trending),
        order: Number(payload.order ?? 0),
        active: payload.active ?? true
      },
      tenantId
    );
    return sanitize(service);
  },

  async list(tenantId, actor, options = {}) {
    assertPermission(actor, 'service.read');
    const includeInactive = Boolean(options.includeInactive);
    if (includeInactive && ![ROLES.ADMIN, ROLES.RECEPTIONIST].includes(actor.role)) {
      throw ApiError.forbidden('Solo el personal puede listar servicios inactivos');
    }
    const services = await serviceRepository.findAll(tenantId, { includeInactive });
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
    assertValid(payload, patchSchema);

    if (payload.name !== undefined) {
      const duplicate = await serviceRepository.findByName(tenantId, payload.name);
      if (duplicate && duplicate._id.toString() !== service._id.toString()) {
        throw ApiError.conflict('Ya existe un servicio con ese nombre en la organización');
      }
    }

    const updates = {};
    if (payload.name !== undefined) updates.name = String(payload.name).trim();
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.durationMinutes !== undefined) updates.durationMinutes = Number(payload.durationMinutes);
    if (payload.price !== undefined) updates.price = Number(payload.price);
    if (payload.category !== undefined) updates.category = normalizeCategory(payload.category);
    if (payload.trending !== undefined) updates.trending = Boolean(payload.trending);
    if (payload.order !== undefined) updates.order = Number(payload.order);
    if (payload.active !== undefined) {
      updates.active = payload.active;
      if (payload.active === true) updates.deletedAt = null;
    }
    if (Object.keys(updates).length === 0) return sanitize(service);

    const updated = await serviceRepository.findByIdAndUpdate(id, { $set: updates }, tenantId);
    return sanitize(updated);
  },

  async remove(id, tenantId, actor) {
    assertPermission(actor, 'service.delete');
    const service = await findService(id, tenantId);
    if (!service.active || service.deletedAt) {
      return sanitize(service);
    }
    const updated = await serviceRepository.findByIdAndUpdate(
      id,
      { $set: { active: false, deletedAt: new Date() } },
      tenantId
    );
    return sanitize(updated);
  }
};
