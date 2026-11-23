import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { assertValid, passwordRules } from '../utils/validate.js';
import { assertPermission } from '../utils/permissions.js';
import { tenantRepository } from '../repositories/tenantRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { clientRepository } from '../repositories/clientRepository.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { tokenBlacklistRepository } from '../repositories/tokenBlacklistRepository.js';
import { hashToken } from '../middlewares/auth.js';
import { publicTenant } from './tenantService.js';
import { clientService } from './clientService.js';

function signToken(user) {
  if (!env.jwtSecret) throw ApiError.internal('JWT_SECRET no configurado');
  return jwt.sign(
    {
      sub: user._id.toString(),
      tenantId: user.tenantId.toString(),
      role: user.role,
      clientId: user.clientId?.toString() || null,
      professionalId: user.professionalId?.toString() || null,
      platformAdmin: Boolean(user.platformAdmin),
      tokenVersion: user.tokenVersion || 0
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function profileNames(user) {
  const tenantId = user.tenantId?.toString?.() || user.tenantId;
  if (user.clientId) {
    const client = await clientRepository.findById(user.clientId, tenantId, { excludeDeleted: true });
    if (client) return { firstName: client.firstName, lastName: client.lastName };
  }
  if (user.professionalId) {
    const professional = await professionalRepository.findById(user.professionalId, tenantId, { excludeDeleted: true });
    if (professional) return { firstName: professional.firstName, lastName: professional.lastName };
  }
  return {};
}

async function resolveTenant(identifier) {
  if (!identifier) return null;
  const cleaned = String(identifier).trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
  const value = cleaned.replace(/\.com$/, '');
  return (await tenantRepository.findByDomain(cleaned))
    || (await tenantRepository.findBySlug(value))
    || (await tenantRepository.findByIdentifier(value))
    || (await tenantRepository.findBySlug(cleaned));
}

export const authService = {
  async login(payload = {}) {
    assertValid(payload, {
      tenant: { required: true, type: 'string', minLength: 2 },
      email: { required: true, email: true },
      password: { required: true, type: 'string' }
    });

    const tenant = await resolveTenant(payload.tenant);
    if (!tenant || !tenant.active) {
      throw ApiError.unauthorized('Organización no válida o inactiva');
    }

    const user = await userRepository.findByTenantAndEmail(tenant._id, payload.email, { withPassword: true });
    if (!user || !user.active) {
      throw ApiError.unauthorized('Credenciales inválidas o cuenta inactiva');
    }

    const matches = await bcrypt.compare(payload.password, user.password);
    if (!matches) throw ApiError.unauthorized('Credenciales inválidas');

    await userRepository.setLastLogin(user._id, tenant._id);
    const token = signToken(user);

    return {
      token,
      expiresIn: env.jwtExpiresIn,
      user: {
        id: user._id.toString(),
        publicId: user.publicId || null,
        email: user.email,
        role: user.role,
        tenantId: tenant._id.toString(),
        clientId: user.clientId?.toString() || null,
        professionalId: user.professionalId?.toString() || null,
        platformAdmin: Boolean(user.platformAdmin),
        ...(await profileNames(user)),
        tenant: publicTenant(tenant)
      }
    };
  },

  async registerClient(payload = {}) {
    assertValid(payload, {
      tenant: { required: true, type: 'string', minLength: 2 },
      password: passwordRules
    });

    const tenant = await resolveTenant(payload.tenant);
    if (!tenant || !tenant.active) {
      throw ApiError.badRequest('Organización no válida o inactiva');
    }

    const client = await clientService.createForTenant(tenant._id, payload, {
      withAccount: true,
      password: payload.password
    });

    return { client, tenant: publicTenant(tenant), message: 'Cliente registrado. Ya puedes iniciar sesión.' };
  },

  async logout(actor, token) {
    assertPermission(actor, 'auth.logout');
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 3600_000);

    await tokenBlacklistRepository.revoke({
      tokenHash: hashToken(token),
      tenantId: actor.tenantId,
      userId: actor.id,
      expiresAt
    }, null);
    await userRepository.incrementTokenVersion(actor.id, actor.tenantId);

    return { loggedOut: true };
  },

  async me(actor) {
    assertPermission(actor, 'auth.me');
    const tenant = await tenantRepository.findById(actor.tenantId);
    if (!tenant) throw ApiError.unauthorized('Tenant no encontrado');
    const account = await userRepository.findByIdAndTenant(actor.id, actor.tenantId);
    return {
      id: actor.id,
      publicId: account?.publicId || null,
      email: actor.email,
      role: actor.role,
      tenantId: actor.tenantId,
      clientId: actor.clientId,
      professionalId: actor.professionalId,
      platformAdmin: Boolean(actor.platformAdmin),
      ...(await profileNames(actor)),
      tenant: publicTenant(tenant)
    };
  },

  async updatePassword(actor, payload = {}) {
    assertPermission(actor, 'password.update');
    assertValid(payload, {
      currentPassword: { required: true, type: 'string' },
      newPassword: passwordRules,
      confirmPassword: { required: true, type: 'string' }
    });

    if (payload.newPassword !== payload.confirmPassword) {
      throw ApiError.badRequest('La confirmación de la nueva contraseña no coincide', {
        confirmPassword: 'Las contraseñas no coinciden'
      });
    }

    const account = await userRepository.findByTenantAndEmail(actor.tenantId, actor.email, { withPassword: true });
    if (!account) throw ApiError.notFound('Usuario no encontrado');

    const currentMatches = await bcrypt.compare(payload.currentPassword, account.password);
    if (!currentMatches) throw ApiError.badRequest('La contrase��a actual es incorrecta');

    const samePassword = await bcrypt.compare(payload.newPassword, account.password);
    if (samePassword) {
      throw ApiError.badRequest('La nueva contrase��a debe ser diferente a la actual');
    }

    await userRepository.changePassword(account._id, actor.tenantId, await bcrypt.hash(payload.newPassword, 10));

    return { passwordUpdated: true };
  }
};
