import { Types } from 'mongoose';
import { ApiError } from './apiError.js';

export async function assertTenantOwnership(repository, id, tenantId, resourceName = 'Recurso', findOptions = { select: '_id' }) {
  if (!Types.ObjectId.isValid(id)) {
    throw ApiError.notFound(`${resourceName} no encontrado en la organización activa`);
  }
  if (await repository.findById(id, tenantId, findOptions)) return;
  if (await repository.existsInTenantForOwnershipCheck(id, tenantId)) {
    throw ApiError.notFound(`${resourceName} no encontrado en la organización activa`);
  }
  if (await repository.existsAnywhereForOwnershipCheck(id)) {
    throw ApiError.forbidden(`No puedes acceder a ${resourceName.toLowerCase()} de otra organización`);
  }
  throw ApiError.notFound(`${resourceName} no encontrado en la organización activa`);
}
