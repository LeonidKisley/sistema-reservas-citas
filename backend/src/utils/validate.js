import validator from 'validator';
import { Types } from 'mongoose';
import { ApiError } from './apiError.js';

const isEmpty = (value) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

function checkField(field, value, rules, errors) {
  const label = rules.label || field;

  if (isEmpty(value)) {
    if (rules.required) errors[field] = `${label} es obligatorio`;
    return;
  }

  if (rules.type === 'array' && !Array.isArray(value)) {
    errors[field] = `${label} debe ser una lista`;
    return;
  }
  if (rules.type === 'boolean' && typeof value !== 'boolean') {
    errors[field] = `${label} debe ser booleano`;
    return;
  }
  if (rules.type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) {
    errors[field] = `${label} debe ser numérico`;
    return;
  }

  const stringValue = typeof value === 'string' ? value.trim() : value;

  if (rules.type === 'string' && typeof value !== 'string') {
    errors[field] = `${label} debe ser texto`;
    return;
  }
  if (rules.email && !validator.isEmail(String(stringValue))) {
    errors[field] = `${label} debe ser un correo válido`;
    return;
  }
  if (rules.mongoId && !Types.ObjectId.isValid(String(stringValue))) {
    errors[field] = `${label} debe ser un identificador válido`;
    return;
  }
  if (rules.isDate && !validator.isISO8601(String(stringValue), { strict: true })) {
    errors[field] = `${label} debe ser una fecha válida (YYYY-MM-DD)`;
    return;
  }
  if (rules.isTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(stringValue))) {
    errors[field] = `${label} debe tener formato HH:mm`;
    return;
  }
  if (rules.minLength && typeof stringValue === 'string' && stringValue.length < rules.minLength) {
    errors[field] = `${label} debe tener al menos ${rules.minLength} caracteres`;
    return;
  }
  if (rules.maxLength && typeof stringValue === 'string' && stringValue.length > rules.maxLength) {
    errors[field] = `${label} no puede superar ${rules.maxLength} caracteres`;
    return;
  }
  if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
    errors[field] = `${label} debe ser mayor o igual a ${rules.min}`;
    return;
  }
  if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
    errors[field] = `${label} debe ser menor o igual a ${rules.max}`;
    return;
  }
  if (rules.isIn && !rules.isIn.includes(stringValue)) {
    errors[field] = `${label} debe ser uno de: ${rules.isIn.join(', ')}`;
    return;
  }
  if (rules.custom) {
    const customError = rules.custom(value, field);
    if (customError) errors[field] = customError;
  }
}

export function validate(data = {}, schema = {}) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    checkField(field, data?.[field], rules, errors);
  }
  return errors;
}

export function assertValid(data, schema, message = 'Datos inválidos') {
  const errors = validate(data, schema);
  if (Object.keys(errors).length > 0) {
    throw ApiError.badRequest(message, errors);
  }
  return data;
}

const PERSON_NAME_PATTERN = /^[\p{L}]+(?: [\p{L}]+)*$/u;
const DNI_PATTERN = /^\d{8}$/;
const PERU_PHONE_PATTERN = /^\+51\d{9}$/;

export const personNameRules = {
  required: true,
  type: 'string',
  minLength: 2,
  maxLength: 80,
  custom: (value) => (PERSON_NAME_PATTERN.test(String(value).trim())
    ? null
    : 'Solo se permiten letras y espacios')
};

export const dniRules = {
  required: true,
  type: 'string',
  custom: (value) => (DNI_PATTERN.test(String(value).trim())
    ? null
    : 'El DNI debe tener exactamente 8 dígitos')
};

export const optionalDniRules = { ...dniRules, required: false };

export function normalizePeruPhone(value) {
  if (isEmpty(value)) return undefined;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('51')) return `+51${digits.slice(2)}`;
  if (digits.length === 9) return `+51${digits}`;
  return String(value).trim();
}

export const peruPhoneRules = {
  type: 'string',
  custom: (value) => (PERU_PHONE_PATTERN.test(normalizePeruPhone(value))
    ? null
    : 'El teléfono debe tener el prefijo +51 y 9 dígitos')
};

export function tenantEmailRules(domain, { required = false, label = 'Correo electrónico' } = {}) {
  const rules = { required, email: true, label };
  if (!domain) return rules;
  const expected = `@${String(domain).toLowerCase().trim()}`;
  return {
    ...rules,
    custom: (value) => (String(value).trim().toLowerCase().endsWith(expected)
      ? null
      : `El correo debe terminar en ${expected}`)
  };
}

export const passwordRules = {
  required: true,
  type: 'string',
  minLength: 8,
  custom: (value) => {
    const text = String(value);
    if (!/[A-Z]/.test(text)) return 'La contraseña debe incluir al menos una mayúscula';
    if (!/[a-z]/.test(text)) return 'La contraseña debe incluir al menos una minúscula';
    if (!/\d/.test(text)) return 'La contraseña debe incluir al menos un número';
    return null;
  }
};
