// Categorías fijas del catálogo. Se guardan como slug para poder crear un
// modelo Category en el futuro sin migrar los servicios existentes.
export const SERVICE_CATEGORIES = Object.freeze([
  'cabello',
  'unas',
  'rostro',
  'bienestar',
  'depilacion',
  'otros'
]);

export const DEFAULT_SERVICE_CATEGORY = 'otros';

export function isServiceCategory(value) {
  return SERVICE_CATEGORIES.includes(String(value || '').trim().toLowerCase());
}
