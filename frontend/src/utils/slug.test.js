import { describe, expect, it } from 'vitest';
import { slugify } from './slug.js';

describe('slugify', () => {
  it('normaliza acentos, eñes y espacios', () => {
    expect(slugify('Corte de cabello')).toBe('corte-de-cabello');
    expect(slugify('Coloración')).toBe('coloracion');
    expect(slugify('Uñas y diseño')).toBe('unas-y-diseno');
    expect(slugify('Mechas y reflejos')).toBe('mechas-y-reflejos');
  });

  it('colapsa caracteres especiales y recorta guiones', () => {
    expect(slugify('  Spa & Bienestar  ')).toBe('spa-bienestar');
    expect(slugify('Microblading')).toBe('microblading');
    expect(slugify(null)).toBe('');
  });
});
