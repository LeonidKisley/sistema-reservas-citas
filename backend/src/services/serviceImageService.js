import { promises as fs } from 'node:fs';
import { basename, resolve } from 'node:path';
import { ApiError } from '../utils/apiError.js';
import { assertPermission } from '../utils/permissions.js';
import { assertTenantOwnership } from '../utils/assertTenantOwnership.js';
import { serviceRepository } from '../repositories/serviceRepository.js';
import { env } from '../config/env.js';
import { SERVICE_IMAGE_LIMIT } from '../constants/serviceImages.js';

function imagesOf(service) {
  return (service.images || []).map((image) => ({ name: image.name, url: image.url }));
}

async function findService(id, tenantId) {
  const service = await serviceRepository.findById(id, tenantId);
  if (!service) await assertTenantOwnership(serviceRepository, id, tenantId, 'Servicio');
  return service;
}

function filePath(service, name) {
  return resolve(
    process.cwd(),
    env.storageDir,
    'servicios',
    String(service.tenantId),
    service.publicId,
    basename(name)
  );
}

async function discardFiles(files) {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => null)));
}

export const serviceImageService = {
  async add(id, tenantId, files, actor) {
    assertPermission(actor, 'service.update');
    const service = await findService(id, tenantId);
    if (!files?.length) {
      throw ApiError.badRequest('Selecciona al menos una foto');
    }
    if (imagesOf(service).length + files.length > SERVICE_IMAGE_LIMIT) {
      await discardFiles(files);
      throw ApiError.badRequest(`Un servicio puede tener como máximo ${SERVICE_IMAGE_LIMIT} fotos`);
    }

    const additions = files.map((file) => {
      const name = basename(file.filename);
      return { name, url: `/uploads/${tenantId}/${service.publicId}/${name}` };
    });

    try {
      const updated = await serviceRepository.findByIdAndUpdate(
        id,
        { $push: { images: { $each: additions } } },
        tenantId
      );
      return imagesOf(updated);
    } catch (error) {
      await discardFiles(files);
      throw error;
    }
  },

  async remove(id, tenantId, name, actor) {
    assertPermission(actor, 'service.update');
    const service = await findService(id, tenantId);
    const current = imagesOf(service);
    if (!current.some((image) => image.name === name)) {
      throw ApiError.notFound('Foto no encontrada en este servicio');
    }

    const updated = await serviceRepository.findByIdAndUpdate(
      id,
      { $pull: { images: { name } } },
      tenantId
    );

    try {
      await fs.unlink(filePath(service, name));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return imagesOf(updated);
  },

  async reorder(id, tenantId, names, actor) {
    assertPermission(actor, 'service.update');
    const service = await findService(id, tenantId);
    const current = imagesOf(service);

    if (!Array.isArray(names) || names.length !== current.length) {
      throw ApiError.badRequest('El orden debe incluir todas las fotos del servicio');
    }
    const currentNames = current.map((image) => image.name);
    if (new Set(names).size !== names.length || !names.every((name) => currentNames.includes(name))) {
      throw ApiError.badRequest('El orden contiene fotos que no pertenecen a este servicio');
    }

    const byName = new Map(current.map((image) => [image.name, image]));
    const reordered = names.map((name) => ({ ...byName.get(name) }));

    const updated = await serviceRepository.findByIdAndUpdate(
      id,
      { $set: { images: reordered } },
      tenantId
    );
    return imagesOf(updated);
  }
};
