import bcrypt from 'bcrypt';
import { ApiError } from '../utils/apiError.js';
import { assertValid, passwordRules } from '../utils/validate.js';
import { ROLES } from '../utils/permissions.js';
import { tenantRepository } from '../repositories/tenantRepository.js';
import { userRepository } from '../repositories/userRepository.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function publicTenant(tenant) {
  return {
    id: tenant._id.toString(),
    name: tenant.name,
    slug: tenant.slug,
    identifier: tenant.identifier || null,
    active: tenant.active,
    plan: tenant.plan,
    contactEmail: tenant.contactEmail || null,
    phone: tenant.phone || null,
    address: tenant.address || null,
    createdAt: tenant.createdAt
  };
}

export const tenantService = {
  async register(payload = {}) {
    assertValid(payload, {
      name: { required: true, type: 'string', minLength: 2, maxLength: 120 },
      slug: {
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 60,
        custom: (value) => (SLUG_PATTERN.test(String(value)) ? null : 'El slug solo admite minúsculas, números y guiones')
      },
      identifier: { type: 'string', maxLength: 60 },
      contactEmail: { email: true },
      phone: { type: 'string', maxLength: 40 },
      address: { type: 'string', maxLength: 200 },
      adminFirstName: { required: true, type: 'string', minLength: 2, maxLength: 80 },
      adminLastName: { required: true, type: 'string', minLength: 2, maxLength: 80 },
      adminEmail: { required: true, email: true },
      adminPassword: passwordRules
    });

    const slug = String(payload.slug).toLowerCase().trim();
    const name = String(payload.name).trim();
    const identifier = payload.identifier ? String(payload.identifier).trim() : undefined;

    if (await tenantRepository.existsBySlugOrName(slug, name, identifier)) {
      throw ApiError.conflict('Ya existe una organización con ese nombre, slug o identificador');
    }

    const tenant = await tenantRepository.create({
      name,
      slug,
      identifier,
      active: payload.active ?? true,
      plan: payload.plan || 'basico',
      contactEmail: payload.contactEmail,
      phone: payload.phone,
      address: payload.address
    });

    const admin = await userRepository.create(
      {
        email: String(payload.adminEmail).toLowerCase().trim(),
        password: await bcrypt.hash(payload.adminPassword, 10),
        role: ROLES.ADMIN
      },
      tenant._id
    );

    return {
      tenant: publicTenant(tenant),
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        tenantId: tenant._id.toString()
      }
    };
  },

  async list() {
    const tenants = await tenantRepository.findAll();
    return tenants.map(publicTenant);
  },

  async getById(id) {
    const tenant = await tenantRepository.findById(id);
    if (!tenant) throw ApiError.notFound('Organización no encontrada');
    return publicTenant(tenant);
  },

  publicTenant
};
