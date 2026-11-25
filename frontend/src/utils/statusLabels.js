import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

export const STATUS_LABELS = Object.freeze({
  programada: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Culminada',
  cancelada: 'Cancelada',
  'no asistió': 'No asistió'
});

export const statusLabel = (status) => STATUS_LABELS[String(status || '').toLowerCase()] || status || '—';

export function appointmentStatusLabel(appointment, now = dayjs.utc()) {
  const status = String(appointment?.status || '').toLowerCase();
  if (['cancelada', 'no asistió'].includes(status)) return statusLabel(status);

  const value = appointment?.start || appointment?.startTime;
  const start = value ? dayjs.utc(value) : null;
  if (!start?.isValid()) return statusLabel(status);

  if (start.isBefore(now)) return 'Culminada';
  if (status === 'confirmada') return 'Cita reservada';
  return 'Pendiente';
}
