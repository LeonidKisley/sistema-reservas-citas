import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import {
  DAILY_RANGE,
  buildDailyPlan,
  dailyCountFor,
  dailyNotes,
  dailyPublicId,
  dailyStatus
} from '../src/seedDemoAppointments.js';

dayjs.extend(utc);

describe('seed diario de citas demo', () => {
  it('cubre todo el rango con un mínimo de dos citas por día', () => {
    const plan = buildDailyPlan();
    const byDate = new Map();

    plan.forEach((item) => {
      byDate.set(item.dateKey, (byDate.get(item.dateKey) || 0) + 1);
    });

    expect(DAILY_RANGE).toEqual({ from: '2026-08-01', to: '2027-01-31' });
    expect(byDate.size).toBe(184);
    expect([...byDate.values()].every((count) => count >= 2 && count <= 6)).toBe(true);
    expect(byDate.get('2026-08-02')).toBeGreaterThanOrEqual(3);
    expect(byDate.get('2026-12-15')).toBeGreaterThanOrEqual(4);
    expect(plan).toHaveLength(555);
  });

  it('genera identificadores y notas deterministas con la promoción del mes', () => {
    expect(dailyPublicId('2026-08-01', 0)).toBe('demo-daily-2026-08-01-01');
    expect(dailyCountFor('2026-08-02')).toBeGreaterThanOrEqual(3);
    expect(dailyNotes('2026-08-01', 'demo-daily-2026-08-01-01', 'Corte de cabello'))
      .toContain('[DEMO 2026-08-01]');
    expect(dailyNotes('2026-12-24', 'demo-daily-2026-12-24-01', 'Manicura'))
      .toContain('Promo Navidad');
    expect(dailyNotes('2027-01-02', 'demo-daily-2027-01-02-01', 'Manicura'))
      .toContain('Promo Año Nuevo/Rebajas');
  });

  it('solo marca como completadas las citas pasadas', () => {
    const now = dayjs.utc('2026-11-24T12:00:00Z');

    expect(dailyStatus('2026-10-01T09:00:00Z', 0, now)).toBe('completada');
    expect(dailyStatus('2026-12-01T09:00:00Z', 0, now)).toBe('programada');
    expect(dailyStatus('2026-12-01T09:00:00Z', 1, now)).toBe('programada');
    expect(dailyStatus('2026-12-01T09:00:00Z', 2, now)).toBe('confirmada');
  });
});
