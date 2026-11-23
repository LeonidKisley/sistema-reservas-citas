import { describe, expect, it } from 'vitest';
import {
  PERU_PHONE_PREFIX,
  composeEmail,
  composePeruPhone,
  emailLocalPart,
  isValidDni,
  isValidEmailLocal,
  isValidPeruPhoneLocal,
  isValidPersonName,
  phoneLocalPart,
  tenantDomainFrom
} from './validation.js';

describe('validation', () => {
  it('valida nombres con letras acentuadas y espacios simples', () => {
    expect(isValidPersonName('María José')).toBe(true);
    expect(isValidPersonName(' Ana ')).toBe(true);
    expect(isValidPersonName('Ana  María')).toBe(false);
    expect(isValidPersonName('Ana 123')).toBe(false);
  });

  it('valida documentos, correos y teléfonos locales', () => {
    expect(isValidDni('12345678')).toBe(true);
    expect(isValidDni(' 1234567 ')).toBe(false);
    expect(isValidEmailLocal('nombre.apellido+tag')).toBe(true);
    expect(isValidEmailLocal('nombre@correo.com')).toBe(false);
    expect(isValidPeruPhoneLocal('987 654 321')).toBe(true);
    expect(isValidPeruPhoneLocal('+51 987 654 321')).toBe(false);
  });

  it('deriva dominios y compone correos', () => {
    expect(tenantDomainFrom('https://www.Auraria.com/')).toBe('auraria.com');
    expect(tenantDomainFrom('  ')).toBe('');
    expect(emailLocalPart('USER@AURARIA.COM', 'auraria.com')).toBe('USER');
    expect(emailLocalPart('otro@ejemplo.com', 'auraria.com')).toBe('otro@ejemplo.com');
    expect(composeEmail(' María ', 'auraria.com')).toBe('maría@auraria.com');
    expect(composeEmail('', 'auraria.com')).toBe('');
  });

  it('normaliza teléfonos peruanos', () => {
    expect(phoneLocalPart('+51987654321')).toBe('987654321');
    expect(phoneLocalPart('987654321')).toBe('987654321');
    expect(composePeruPhone('987 654 321')).toBe(`${PERU_PHONE_PREFIX}987654321`);
    expect(composePeruPhone('')).toBe('');
  });
});
