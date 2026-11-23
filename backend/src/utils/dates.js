import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { env } from '../config/env.js';

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(date) {
  return dayjs.utc(date).format('YYYY-MM-DD');
}

export function parseDateKey(value) {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return null;
  const parsed = dayjs.utc(value, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) return null;
  return parsed.toDate();
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
  return dayjs.utc(dateKey, 'YYYY-MM-DD', true).startOf('day').add(minutes, 'minute').toDate();
}

export function startOfUtcDay(date) {
  return dayjs.utc(date).startOf('day').toDate();
}

export function isPastDate(value) {
  return dayjs.utc(value).startOf('day').isBefore(dayjs.utc().startOf('day'));
}

export function rangesOverlap(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

export function isValidRange(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return { valid: false, error: 'El rango de fechas no es vǭlido (YYYY-MM-DD)' };
  if (from > to) return { valid: false, error: 'La fecha inicial no puede ser posterior a la final' };
  return { valid: true, from, to };
}

export function buildRange(fromKey, toKey) {
  const { valid, from, to, error } = isValidRange(fromKey, toKey);
  if (!valid) return { valid, error };
  const endExclusive = dayjs.utc(to).add(1, 'day').toDate();
  return { valid: true, from, to: endExclusive };
}

export const slotMinutes = env.slotMinutes;
