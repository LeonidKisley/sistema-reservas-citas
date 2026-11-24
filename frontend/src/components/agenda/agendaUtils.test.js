import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { describe, expect, it } from 'vitest';
import {
  agendaRange,
  buildReschedulePreview,
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

  it('prepara la reprogramación conservando la duración de la cita', () => {
    const appointment = {
      id: 'a1',
      start: '2026-11-25T09:00:00.000Z',
      end: '2026-11-25T09:30:00.000Z',
      status: 'programada'
    };
    const preview = buildReschedulePreview(appointment, '2026-11-26', '10:00');
    expect(preview).toEqual({
      appointment,
      date: '2026-11-26',
      time: '10:00',
      start: '2026-11-26T10:00:00.000Z',
      end: '2026-11-26T10:30:00.000Z',
      currentStart: '2026-11-25T09:00:00.000Z',
      currentEnd: '2026-11-25T09:30:00.000Z'
    });
    expect(appointment.start).toBe('2026-11-25T09:00:00.000Z');
  });

  it('rechaza peticiones de reprogramación incompletas o inválidas', () => {
    const appointment = { id: 'a1', start: '2026-11-25T09:00:00.000Z' };
    expect(buildReschedulePreview(null, '2026-11-26', '10:00')).toBeNull();
    expect(buildReschedulePreview(appointment, '', '10:00')).toBeNull();
    expect(buildReschedulePreview(appointment, '2026-11-26', '25:00')).toBeNull();
    expect(buildReschedulePreview({ ...appointment, start: 'fecha-invalida' }, '2026-11-26', '10:00')).toBeNull();
    expect(buildReschedulePreview(appointment, '2026-11-26', '10:00').end).toBe('2026-11-26T11:00:00.000Z');
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
