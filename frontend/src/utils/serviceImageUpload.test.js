import { describe, expect, it } from 'vitest';
import {
  SERVICE_IMAGE_MAX_BYTES,
  SERVICE_IMAGE_MAX_FILES,
  validateImageFiles
} from './serviceImageUpload.js';

const file = (name, type, size = 128) => ({ name, type, size });

describe('Validación de fotos antes de subir', () => {
  it('acepta jpg, jpeg, png, webp y avif', () => {
    const files = [
      file('uno.jpg', 'image/jpeg'),
      file('dos.jpeg', 'image/jpeg'),
      file('tres.png', 'image/png'),
      file('cuatro.webp', 'image/webp'),
      file('cinco.avif', 'image/avif')
    ];
    const result = validateImageFiles(files);
    expect(result.errors).toEqual([]);
    expect(result.accepted).toEqual(files);
  });

  it('rechaza formatos inválidos y archivos de más de 2 MB', () => {
    const result = validateImageFiles([
      file('no.gif', 'image/gif'),
      file('grande.jpg', 'image/jpeg', SERVICE_IMAGE_MAX_BYTES + 1)
    ]);
    expect(result.accepted).toEqual([]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('formato no permitido');
    expect(result.errors[1]).toContain('2 MB');
  });

  it('respeta el tope de seis fotos contando las ya subidas', () => {
    const files = Array.from({ length: 6 }, (_, index) => file(`f${index}.jpg`, 'image/jpeg'));
    const result = validateImageFiles(files, 2);
    expect(result.accepted).toHaveLength(4);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain(`Máximo ${SERVICE_IMAGE_MAX_FILES} fotos`);
  });
});
