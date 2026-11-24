export const SERVICE_IMAGE_MAX_FILES = 6;
export const SERVICE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

const MIME_EXTENSIONS = Object.freeze({
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif']
});

function extensionOf(name) {
  const value = String(name || '');
  const dot = value.lastIndexOf('.');
  return dot >= 0 ? value.slice(dot).toLowerCase() : '';
}

export function validateImageFiles(files, existingCount = 0) {
  const accepted = [];
  const errors = [];
  const available = Math.max(0, SERVICE_IMAGE_MAX_FILES - Math.max(0, existingCount));

  for (const file of Array.from(files || [])) {
    const extension = extensionOf(file?.name);
    const mime = String(file?.type || '').toLowerCase() === 'image/jpg'
      ? 'image/jpeg'
      : String(file?.type || '').toLowerCase();
    if (!MIME_EXTENSIONS[mime]?.includes(extension)) {
      errors.push(`${file?.name || 'Archivo'}: formato no permitido`);
      continue;
    }
    if (Number(file?.size || 0) > SERVICE_IMAGE_MAX_BYTES) {
      errors.push(`${file.name}: supera los 2 MB`);
      continue;
    }
    if (accepted.length >= available) {
      errors.push(`Máximo ${SERVICE_IMAGE_MAX_FILES} fotos por servicio`);
      continue;
    }
    accepted.push(file);
  }

  return { accepted, errors };
}
