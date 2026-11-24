import { describe, expect, it } from 'vitest';
import { formatPrice } from './format.js';

describe('formatPrice', () => {
  it('muestra dos decimales con el formato del catálogo', () => {
    expect(formatPrice(35)).toBe('$35.00');
    expect(formatPrice(84.5)).toBe('$84.50');
  });

  it('cae a cero para valores no numéricos', () => {
    expect(formatPrice(undefined)).toBe('$0.00');
    expect(formatPrice('abc')).toBe('$0.00');
  });
});
