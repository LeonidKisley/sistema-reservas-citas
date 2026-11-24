import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
  currentTimeOf,
  dateKeyOf,
  expiredLabel,
  expiredReason,
  isExpired,
  maxTime,
  minutesToTime,
  timeToMinutes
} from './time.js';

const at = (value) => dayjs(value);

describe('time (reloj local)', () => {
  it('decide el vencimiento con la hora local del día actual', () => {
    const reference = at('2026-11-24T14:57:00');
    expect(isExpired('2026-11-24', '14:00', reference)).toBe(true);
    expect(isExpired('2026-11-24', '15:00', reference)).toBe(false);
    expect(isExpired('2026-11-24', '19:00', reference)).toBe(false);
    expect(currentTimeOf(reference)).toBe('14:57');
    expect(dateKeyOf(reference)).toBe('2026-11-24');
  });

  it('distingue el motivo por fecha y por hora', () => {
    expect(expiredReason('2026-11-23', '19:00', at('2026-11-24T08:00:00'))).toBe('date');
    expect(expiredReason('2026-11-24', '08:00', at('2026-11-24T14:57:00'))).toBe('time');
    expect(expiredReason('2026-11-24', '15:00', at('2026-11-24T14:57:00'))).toBeNull();
    expect(expiredReason('2026-11-25', '08:00', at('2026-11-24T23:59:00'))).toBeNull();
  });

  it('describe el vencimiento para el tooltip', () => {
    expect(expiredLabel('2026-11-24', '14:00', at('2026-11-24T14:57:00'))).toBe('Tiempo vencido · las 14:00 ya pasaron');
    expect(expiredLabel('2026-11-23', '10:00', at('2026-11-24T08:00:00'))).toBe('La fecha ya pasó');
    expect(expiredLabel('2026-11-24', '15:00', at('2026-11-24T14:57:00'))).toBe('');
  });

  it('calcula la mayor de dos horas HH:mm', () => {
    expect(maxTime('09:00', '16:00')).toBe('16:00');
    expect(maxTime('16:30', '16:00')).toBe('16:30');
    expect(maxTime('', '16:00')).toBe('16:00');
    expect(maxTime('16:00', '')).toBe('16:00');
    expect(maxTime('', '')).toBe('');
  });

  it('convierte horas y minutos en ambos sentidos', () => {
    expect(timeToMinutes('16:30')).toBe(990);
    expect(timeToMinutes('25:00')).toBeNull();
    expect(minutesToTime(990)).toBe('16:30');
    expect(minutesToTime(1080 - 120)).toBe('16:00');
  });
});
