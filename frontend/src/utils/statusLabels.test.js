import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { describe, expect, it } from 'vitest';
import { appointmentStatusLabel, statusLabel } from './statusLabels.js';

dayjs.extend(utc);

const now = dayjs.utc('2026-11-24T12:00:00Z');

describe('statusLabels', () => {
  it('mantiene las etiquetas base del tablero', () => {
    expect(statusLabel('programada')).toBe('Pendiente');
    expect(statusLabel('completada')).toBe('Culminada');
  });

  it('muestra culminada cuando la cita ya pasó', () => {
    expect(appointmentStatusLabel({ status: 'completada', start: '2026-10-01T09:00:00Z' }, now)).toBe('Culminada');
    expect(appointmentStatusLabel({ status: 'programada', start: '2026-11-23T09:00:00Z' }, now)).toBe('Culminada');
  });

  it('muestra pendiente o reservada cuando la cita es futura', () => {
    expect(appointmentStatusLabel({ status: 'programada', start: '2026-11-28T09:00:00Z' }, now)).toBe('Pendiente');
    expect(appointmentStatusLabel({ status: 'completada', start: '2026-11-28T09:00:00Z' }, now)).toBe('Pendiente');
    expect(appointmentStatusLabel({ status: 'confirmada', start: '2026-11-28T09:00:00Z' }, now)).toBe('Cita reservada');
  });

  it('conserva cancelada y no asistió aunque la cita haya pasado', () => {
    expect(appointmentStatusLabel({ status: 'cancelada', start: '2026-10-01T09:00:00Z' }, now)).toBe('Cancelada');
    expect(appointmentStatusLabel({ status: 'no asistió', start: '2026-10-01T09:00:00Z' }, now)).toBe('No asistió');
  });
});
