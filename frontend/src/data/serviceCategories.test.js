import { describe, expect, it } from 'vitest';
import {
  categoryBySlug,
  categoryLabel,
  categoryStyle,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_SLUGS
} from './serviceCategories.js';

describe('Categorías del catálogo', () => {
  it('define los seis slugs fijos con etiqueta y color', () => {
    expect(SERVICE_CATEGORY_SLUGS).toEqual([
      'cabello', 'unas', 'rostro', 'bienestar', 'depilacion', 'otros'
    ]);
    expect(SERVICE_CATEGORIES).toHaveLength(6);
    SERVICE_CATEGORIES.forEach((category) => {
      expect(category.label).toBeTruthy();
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('resuelve etiquetas y colores, con otros como fallback', () => {
    expect(categoryLabel('cabello')).toBe('Cabello');
    expect(categoryLabel('depilacion')).toBe('Depilación');
    expect(categoryLabel('desconocida')).toBe('Otros');
    expect(categoryBySlug('inasistente').slug).toBe('otros');
    expect(categoryStyle('unas')).toEqual({ '--chip-color': SERVICE_CATEGORIES[1].color });
  });
});
