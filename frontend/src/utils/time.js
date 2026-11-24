import dayjs from 'dayjs';

// Reloj local del usuario. Las etiquetas de la agenda siguen siendo "wall-clock" UTC
// (las guardadas en BD), pero la regla de "horario vencido" se decide con la hora local.
export const now = () => dayjs();

export const dateKeyOf = (value = now()) => value.format('YYYY-MM-DD');

export const currentTimeOf = (value = now()) => value.format('HH:mm');

export const isExpired = (dateKey, time, reference = now()) => {
  if (!dateKey || !time) return false;
  const slot = dayjs(`${dateKey}T${time}:00`);
  return slot.isValid() && slot.isBefore(reference);
};

export const expiredReason = (dateKey, time, reference = now()) => {
  if (!dateKey || !time) return null;
  if (dateKey < dateKeyOf(reference)) return 'date';
  return isExpired(dateKey, time, reference) ? 'time' : null;
};

const EXPIRED_LABEL = {
  time: 'Tiempo vencido',
  date: 'La fecha ya pasó'
};

export const expiredLabel = (dateKey, time, reference = now(), reason) => {
  const key = reason || expiredReason(dateKey, time, reference);
  if (!key) return '';
  if (key === 'time') return `${EXPIRED_LABEL.time} · las ${time} ya pasaron`;
  return EXPIRED_LABEL.date;
};

// Comparación lexicográfica válida porque ambas cadenas tienen formato HH:mm.
export const maxTime = (a, b) => {
  if (!a) return b || '';
  if (!b) return a;
  return a >= b ? a : b;
};

export const timeToMinutes = (value) => {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes) => {
  if (!Number.isFinite(minutes)) return '';
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};
