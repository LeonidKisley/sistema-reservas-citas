import { slugify } from '../utils/slug.js';

// Vite descubre las fotos sin imports manuales: basta con crear la carpeta del servicio.
const imageModules = import.meta.glob('../assets/servicios/*/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default'
});

const imagesBySlug = Object.entries(imageModules).reduce((map, [path, url]) => {
  const match = path.match(/\/servicios\/([^/]+)\/([^/]+)$/);
  if (!match) return map;
  const [, folder, fileName] = match;
  const key = slugify(folder);
  if (!map.has(key)) map.set(key, []);
  map.get(key).push({ fileName, url });
  return map;
}, new Map());

imagesBySlug.forEach((items) => {
  items.sort((a, b) => a.fileName.localeCompare(b.fileName, 'es', { numeric: true }));
});

export const serviceImagesFor = (serviceName) => (
  imagesBySlug.get(slugify(serviceName))?.map((item) => item.url) || []
);

export const serviceImageSlugs = () => [...imagesBySlug.keys()].sort((a, b) => a.localeCompare(b, 'es'));
