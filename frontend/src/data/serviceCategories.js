// Categorías fijas del catálogo: el slug es lo que se guarda en la BD.
export const SERVICE_CATEGORIES = Object.freeze([
  { slug: 'cabello', label: 'Cabello', color: '#C26476' },
  { slug: 'unas', label: 'Uñas', color: '#C98A2B' },
  { slug: 'rostro', label: 'Rostro', color: '#8E6BB8' },
  { slug: 'bienestar', label: 'Bienestar', color: '#5C9A78' },
  { slug: 'depilacion', label: 'Depilación', color: '#B96A4E' },
  { slug: 'otros', label: 'Otros', color: '#8A8286' }
]);

export const SERVICE_CATEGORY_SLUGS = SERVICE_CATEGORIES.map((category) => category.slug);

const FALLBACK_CATEGORY = SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1];

export function categoryBySlug(slug) {
  return SERVICE_CATEGORIES.find((category) => category.slug === slug) || FALLBACK_CATEGORY;
}

export const categoryLabel = (slug) => categoryBySlug(slug).label;

export const categoryStyle = (slug) => ({ '--chip-color': categoryBySlug(slug).color });
