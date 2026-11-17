import { env } from '../config/env.js';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function parseDateKey(value) {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== value) return null;
  return date;
}

export function timeToMinutes(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function combineDateAndMinutes(dateKey, minutes) {
  return new Date(Date.parse(`${dateKey}T00:00:00.000Z`) + minutes * 60_000);
}

export function startOfUtcDay(date) {
  const value = new Date(date);
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function isPastDate(value) {
  return startOfUtcDay(value).getTime() < startOfUtcDay(new Date()).getTime();
}

export function rangesOverlap(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

export function isValidRange(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return { valid: false, error: 'El rango de fechas no es válido (YYYY-MM-DD)' };
  if (from > to) return { valid: false, error: 'La fecha inicial no puede ser posterior a la final' };
  return { valid: true, from, to };
}

export function buildRange(fromKey, toKey) {
  const { valid, from, to, error } = isValidRange(fromKey, toKey);
  if (!valid) return { valid, error };
  const endExclusive = new Date(to.getTime() + 24 * 60 * 60_000);
  return { valid: true, from, to: endExclusive };
}

export const slotMinutes = env.slotMinutes;
