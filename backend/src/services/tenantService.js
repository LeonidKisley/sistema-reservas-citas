import bcrypt from 'bcrypt';
import { ApiError } from '../utils/apiError.js';
import {
  assertValid,
  normalizePeruPhone,
  passwordRules,
  peruPhoneRules,
  personNameRules,
  tenantEmailRules
} from '../utils/validate.js';
import { assertPermission, PLATFORM_PERMISSION, ROLES } from '../utils/permissions.js';
import { tenantRepository } from '../repositories/tenantRepository.js';
import { userRepository } from '../repositories/userRepository.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const tenantDomain = (slug) => (slug ? `${String(slug).toLowerCase().trim()}.com` : null);

export function publicTenant(tenant) {
  return {
    id: tenant._id.toString(),
    publicId: tenant.publicId || null,
    name: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain || tenantDomain(tenant.slug),
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
  async register(payload = {}, actor = null) {
    if (actor) assertPermission(actor, PLATFORM_PERMISSION);
    const domain = tenantDomain(payload.slug);
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
      contactEmail: tenantEmailRules(domain),
      phone: peruPhoneRules,
      address: { type: 'string', maxLength: 200 },
      adminFirstName: personNameRules,
      adminLastName: personNameRules,
      adminEmail: tenantEmailRules(domain, { required: true, label: 'Correo de acceso' }),
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
      domain,
      identifier,
      active: payload.active ?? true,
      plan: payload.plan || 'basico',
      contactEmail: payload.contactEmail ? String(payload.contactEmail).toLowerCase().trim() : undefined,
      phone: normalizePeruPhone(payload.phone),
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
        publicId: admin.publicId || null,
        email: admin.email,
        role: admin.role,
        tenantId: tenant._id.toString()
      }
    };
  },

  async list(tenantId, actor = null) {
    assertPermission(actor, 'tenant.read');
    const tenants = tenantId
      ? await tenantRepository.findAll({ _id: tenantId })
      : await tenantRepository.findAll();
    return tenants.map(publicTenant);
  },

  async listAll(actor = null) {
    if (actor) assertPermission(actor, PLATFORM_PERMISSION);
    return this.list(null, actor);
  },

  async getById(id, tenantId, actor = null) {
    assertPermission(actor, 'tenant.read');
    const tenant = await tenantRepository.findById(id);
    if (!tenant) throw ApiError.notFound('Organización no encontrada');
    if (tenantId && tenant._id.toString() !== String(tenantId)) {
      throw ApiError.forbidden('No puedes consultar organizaciones distintas a la tuya');
    }
    return publicTenant(tenant);
  },

  publicTenant
};
