import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { assertTenantOwnership } from '../utils/assertTenantOwnership.js';
import { serviceRepository } from '../repositories/serviceRepository.js';
import {
  SERVICE_IMAGE_LIMIT,
  SERVICE_IMAGE_MIME_BY_EXTENSION,
  SERVICE_IMAGE_MAX_BYTES
} from '../constants/serviceImages.js';

function extensionOf(originalName) {
  const extension = extname(String(originalName || '')).toLowerCase();
  return SERVICE_IMAGE_MIME_BY_EXTENSION[extension] ? extension : '';
}

function normalizeMime(mime) {
  const normalized = String(mime || '').toLowerCase();
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

const storage = multer.diskStorage({
  async destination(req, _file, done) {
    try {
      const service = await serviceRepository.findById(req.params.id, req.tenantId);
      if (!service || !service.publicId) {
        await assertTenantOwnership(serviceRepository, req.params.id, req.tenantId, 'Servicio');
        throw ApiError.notFound('Servicio no encontrado en la organización activa');
      }
      const directory = resolve(
        process.cwd(),
        env.storageDir,
        'servicios',
        String(req.tenantId),
        service.publicId
      );
      mkdirSync(directory, { recursive: true });
      done(null, directory);
    } catch (error) {
      done(error);
    }
  },

  filename(_req, file, done) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const unique = randomUUID().slice(0, 8);
    const extension = extensionOf(file.originalname) || '.jpg';
    done(null, `${timestamp}-${unique}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: SERVICE_IMAGE_MAX_BYTES, files: SERVICE_IMAGE_LIMIT },
  fileFilter(_req, file, done) {
    const extension = extensionOf(file.originalname);
    const mime = normalizeMime(file.mimetype);
    const expectedMime = SERVICE_IMAGE_MIME_BY_EXTENSION[extension];
    if (!extension || !expectedMime || expectedMime !== mime) {
      return done(ApiError.badRequest('Solo se permiten fotos jpg, jpeg, png, webp o avif'));
    }
    return done(null, true);
  }
});

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Cada foto puede pesar como máximo ${SERVICE_IMAGE_MAX_BYTES / (1024 * 1024)} MB`,
  LIMIT_FILE_COUNT: `Como máximo se pueden subir ${SERVICE_IMAGE_LIMIT} fotos por servicio`,
  LIMIT_UNEXPECTED_FILE: 'El campo de subida debe llamarse images'
};

export function uploadImages(req, res, next) {
  upload.array('images', SERVICE_IMAGE_LIMIT)(req, res, (error) => {
    if (!error) return next();
    if (error instanceof ApiError) return next(error);
    return next(ApiError.badRequest(MULTER_MESSAGES[error.code] || `No se pudo subir la foto: ${error.message}`));
  });
}
