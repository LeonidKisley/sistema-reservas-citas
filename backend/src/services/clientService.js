import bcrypt from 'bcrypt';
import { ApiError } from '../utils/apiError.js';
import {
  assertValid,
  dniRules,
  normalizePeruPhone,
  passwordRules,
  peruPhoneRules,
  personNameRules,
  tenantEmailRules
} from '../utils/validate.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import { assertTenantOwnership } from '../utils/assertTenantOwnership.js';
import { clientRepository, escapeRegex } from '../repositories/clientRepository.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { tenantRepository } from '../repositories/tenantRepository.js';
import { tenantDomain } from './tenantService.js';

const clientSchema = {
  firstName: personNameRules,
  lastName: personNameRules,
  document: dniRules,
  phone: peruPhoneRules,
  address: { type: 'string', maxLength: 200 },
  notes: { type: 'string', maxLength: 500 }
};

const patchSchema = {
  firstName: { ...personNameRules, required: false },
  lastName: { ...personNameRules, required: false },
  document: { ...dniRules, required: false },
  email: { email: true },
  phone: peruPhoneRules,
  address: { type: 'string', maxLength: 200 },
  notes: { type: 'string', maxLength: 500 }
};

async function clientSchemaFor(tenantId, options = {}) {
  const tenant = await tenantRepository.findById(tenantId);
  const domain = tenant?.domain || tenantDomain(tenant?.slug);
  return {
    ...clientSchema,
    email: tenantEmailRules(domain, { required: Boolean(options.withAccount) })
  };
}

function sanitize(client) {
  return {
    id: client._id.toString(),
    publicId: client.publicId || null,
    firstName: client.firstName,
    lastName: client.lastName,
    document: client.document,
    email: client.email || null,
    phone: client.phone || null,
    address: client.address || null,
    notes: client.notes || null,
    active: !client.deletedAt,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt
  };
}

async function findClient(id, tenantId) {
  const client = await clientRepository.findById(id, tenantId, { excludeDeleted: true });
  if (!client) {
    await assertTenantOwnership(clientRepository, id, tenantId, 'Cliente', { excludeDeleted: true, select: '_id' });
  }
  return client;
}

function assertOwner(actor, client) {
  if (actor.role === ROLES.CLIENT && actor.clientId !== client._id.toString()) {
    throw ApiError.forbidden('Solo puedes acceder a tu propio perfil de cliente');
  }
}

async function assertUnique(tenantId, payload, ignoreId, ignoreUserId) {
  const documentOwner = await clientRepository.findByDocument(tenantId, payload.document);
  if (documentOwner && documentOwner._id.toString() !== ignoreId) {
    throw ApiError.conflict('Ya existe un cliente con ese documento en la organización');
  }
  if (payload.email) {
    const emailOwner = await clientRepository.findByEmail(tenantId, payload.email);
    if (emailOwner && emailOwner._id.toString() !== ignoreId) {
      throw ApiError.conflict('Ya existe un cliente con ese correo en la organización');
    }
    const userOwner = await userRepository.findByTenantAndEmail(tenantId, payload.email);
    if (userOwner && userOwner._id.toString() !== ignoreUserId && userOwner.clientId?.toString() !== ignoreId) {
      throw ApiError.conflict('Ese correo ya está asociado a una cuenta de usuario del tenant');
    }
  }
}

async function createInternal(tenantId, payload, options = {}) {
  const schema = await clientSchemaFor(tenantId, options);
  assertValid(payload, options.withAccount ? { ...schema, password: passwordRules } : schema);
  await assertUnique(tenantId, payload);

  const client = await clientRepository.create(
    {
      firstName: String(payload.firstName).trim(),
      lastName: String(payload.lastName).trim(),
      document: String(payload.document).trim(),
      email: payload.email ? String(payload.email).toLowerCase().trim() : undefined,
      phone: normalizePeruPhone(payload.phone),
      address: payload.address,
      notes: payload.notes
    },
    tenantId
  );

  if (options.withAccount) {
    const user = await userRepository.create(
      {
        email: client.email,
        password: await bcrypt.hash(options.password, 10),
        role: ROLES.CLIENT,
        clientId: client._id
      },
      tenantId
    );
    await clientRepository.findByIdAndUpdate(client._id, { $set: { userId: user._id } }, tenantId);
  }

  return sanitize(client);
}

export const clientService = {
  createForTenant: createInternal,

  async create(tenantId, payload, actor) {
    assertPermission(actor, 'client.create');
    return createInternal(tenantId, payload);
  },

  async list(tenantId, query = {}, actor) {
    assertPermission(actor, 'client.read');
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const forcedClientId = actor.role === ROLES.CLIENT ? actor.clientId : null;

    const filter = forcedClientId ? { _id: forcedClientId } : {};
    const clients = await clientRepository.search(tenantId, query.search, {
      filter,
      skip: (page - 1) * limit,
      limit
    });
    const total = forcedClientId
      ? clients.length
      : await clientRepository.countDocuments(
          query.search
            ? {
                $or: [
                  { firstName: { $regex: escapeRegex(query.search), $options: 'i' } },
                  { lastName: { $regex: escapeRegex(query.search), $options: 'i' } },
                  { document: { $regex: escapeRegex(query.search), $options: 'i' } }
                ]
              }
            : {},
          tenantId,
          { excludeDeleted: true }
        );

    return { items: clients.map(sanitize), total, page, limit };
  },

  async getById(id, tenantId, actor) {
    assertPermission(actor, 'client.read');
    const client = await findClient(id, tenantId);
    assertOwner(actor, client);
    return sanitize(client);
  },

  async update(id, tenantId, payload, actor) {
    assertPermission(actor, 'client.update');
    const client = await findClient(id, tenantId);
    assertOwner(actor, client);
    assertValid(payload, await clientSchemaFor(tenantId));
    await assertUnique(tenantId, payload, client._id.toString(), client.userId?.toString());

    const updated = await clientRepository.findByIdAndUpdate(
      id,
      {
        $set: {
          firstName: String(payload.firstName).trim(),
          lastName: String(payload.lastName).trim(),
          document: String(payload.document).trim(),
          email: payload.email ? String(payload.email).toLowerCase().trim() : undefined,
          phone: normalizePeruPhone(payload.phone),
          address: payload.address,
          notes: payload.notes
        }
      },
      tenantId
    );
    return sanitize(updated);
  },

  async remove(id, tenantId, actor) {
    assertPermission(actor, 'client.delete');
    const client = await findClient(id, tenantId);

    const appointmentCount = await appointmentRepository.countDocuments({ clientId: client._id }, tenantId);
    const updated = await clientRepository.softDelete(client._id, tenantId);

    return {
      ...sanitize(updated),
      physicalDeleteBlocked: appointmentCount > 0,
      message: appointmentCount > 0
        ? 'Cliente desactivado. No se realizó borrado físico porque tiene citas asociadas.'
        : 'Cliente eliminado correctamente (borrado lógico).'
    };
  }
};
