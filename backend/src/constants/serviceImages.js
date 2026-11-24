export const SERVICE_IMAGE_LIMIT = 6;
export const SERVICE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const SERVICE_IMAGE_MIME_BY_EXTENSION = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif'
});

export const SERVICE_IMAGE_EXTENSIONS = Object.keys(SERVICE_IMAGE_MIME_BY_EXTENSION);
