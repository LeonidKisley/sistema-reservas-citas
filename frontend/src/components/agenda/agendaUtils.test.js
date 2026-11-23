import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { describe, expect, it } from 'vitest';
import {
  agendaRange,
  buildViewDays,
  canDragAppointment,
  formatSlotLabel,
  hourEnd,
  hourRange,
  mondayOf,
  shiftView,
  startOfView
} from './agendaUtils.js';

dayjs.extend(utc);

const future = () => dayjs.utc().add(1, 'day').toISOString();
const past = () => dayjs.utc().subtract(1, 'day').toISOString();

describe('agendaUtils', () => {
  it('calcula el lunes en UTC', () => {
    expect(mondayOf('2026-11-22T23:30:00Z').format('YYYY-MM-DD')).toBe('2026-11-16');
    expect(mondayOf('2026-11-23T00:00:00Z').format('YYYY-MM-DD')).toBe('2026-11-23');
  });

  it('construye días por vista', () => {
    expect(buildViewDays('day', '2026-11-25').map((day) => day.format('YYYY-MM-DD'))).toEqual(['2026-11-25']);
    expect(buildViewDays('week', '2026-11-25').map((day) => day.format('YYYY-MM-DD'))).toEqual([
      '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'
    ]);
    const month = buildViewDays('month', '2026-11-25');
    expect(month[0].format('YYYY-MM-DD')).toBe('2026-10-26');
    expect(month[month.length - 1].format('YYYY-MM-DD')).toBe('2026-12-06');
  });

  it('navega y empieza cada vista en UTC', () => {
    expect(startOfView('week', '2026-11-25').format('YYYY-MM-DD')).toBe('2026-11-23');
    expect(startOfView('month', '2026-11-25').format('YYYY-MM-DD')).toBe('2026-11-01');
    expect(shiftView('day', '2026-11-23', 1).format('YYYY-MM-DD')).toBe('2026-11-24');
    expect(shiftView('week', '2026-11-23', -1).format('YYYY-MM-DD')).toBe('2026-11-16');
    expect(shiftView('month', '2026-11-23', 1).format('YYYY-MM-DD')).toBe('2026-12-01');
  });

  it('expone el rango que consume el backend', () => {
    expect(agendaRange('week', '2026-11-25')).toEqual({
      view: 'week',
      date: '2026-11-23',
      from: '2026-11-23',
      to: '2026-11-29'
    });
  });

  it('formatea horarios sin depender de la zona local', () => {
    expect(hourEnd('09:00')).toBe('09:59');
    expect(hourRange('08')).toBe('08:00 - 08:59');
    expect(formatSlotLabel('2026-11-23', '09:00')).toBe('Lunes 23/11/2026 · 09:00 - 09:59');
  });

  it('solo permite arrastrar citas abiertas, futuras y del tenant', () => {
    const admin = { role: 'Administrador', tenantId: 't1' };
    expect(canDragAppointment({ id: 'a1', start: future(), status: 'confirmada', tenantId: 't1' }, admin)).toBe(true);
    expect(canDragAppointment({ id: 'a1', start: future(), status: 'programada', tenantId: 't1' }, { role: 'Recepcionista', tenantId: 't1' })).toBe(true);
    expect(canDragAppointment({ id: 'a1', start: future(), status: 'cancelada', tenantId: 't1' }, admin)).toBe(false);
    expect(canDragAppointment({ id: 'a1', start: past(), status: 'confirmada', tenantId: 't1' }, admin)).toBe(false);
    expect(canDragAppointment({ id: 'a1', start: future(), status: 'confirmada', tenantId: 't2' }, admin)).toBe(false);
    expect(canDragAppointment({ id: 'a1', start: future(), status: 'confirmada', tenantId: 't1' }, { role: 'Cliente', tenantId: 't1' })).toBe(false);
  });
});
