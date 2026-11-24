import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAY_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 8).padStart(2, '0'));
export const OPEN_STATUSES = ['programada', 'confirmada'];
export const VIEWS = ['day', 'week', 'month'];

export const hourEnd = (time) => {
  const hour = String(time || '').split(':')[0];
  return hour ? `${hour}:59` : '';
};

export const formatSlotLabel = (date, time) => {
  if (!date) return 'Fecha por definir';
  const value = dayjs.utc(date);
  const label = `${WEEKDAYS[value.day()]} ${value.format('DD/MM/YYYY')}`;
  return time ? `${label} · ${time} - ${hourEnd(time)}` : label;
};

export const mondayOf = (value) => {
  const date = dayjs.utc(value);
  return date.subtract((date.day() + 6) % 7, 'day').startOf('day');
};

export const buildWeekDays = (monday) => Array.from({ length: 7 }, (_, index) => dayjs.utc(monday).add(index, 'day'));

export const hourRange = (hour) => `${hour}:00 - ${hour}:59`;

export const startOfView = (view, value) => {
  const date = dayjs.utc(value);
  if (view === 'day') return date.startOf('day');
  if (view === 'week') return mondayOf(date);
  if (view === 'month') return date.startOf('month');
  return date;
};

export const shiftView = (view, value, delta) => {
  const date = dayjs.utc(value);
  if (view === 'day') return startOfView(view, date.add(delta, 'day'));
  if (view === 'week') return startOfView(view, date.add(delta, 'week'));
  if (view === 'month') return startOfView(view, date.add(delta, 'month'));
  return date;
};

export const buildViewDays = (view, value) => {
  const anchor = startOfView(view, value);
  if (view === 'day') return [anchor];
  if (view === 'week') return buildWeekDays(anchor);

  const first = anchor.startOf('month');
  const offset = (first.day() + 6) % 7;
  const cells = Math.ceil((offset + first.daysInMonth()) / 7) * 7;
  const gridStart = mondayOf(first);
  return Array.from({ length: cells }, (_, index) => gridStart.add(index, 'day'));
};

export const agendaRange = (view, value) => {
  const anchor = startOfView(view, value);
  const days = buildViewDays(view, anchor);
  return {
    view,
    date: anchor.format('YYYY-MM-DD'),
    from: days[0].format('YYYY-MM-DD'),
    to: days[days.length - 1].format('YYYY-MM-DD')
  };
};

export const defaultAgendaAnchor = (view = 'week', now = dayjs.utc()) => {
  const today = dayjs.utc(now);
  if (view === 'day') {
    const lastSlot = dayjs.utc(`${today.format('YYYY-MM-DD')}T19:00`);
    return lastSlot.isBefore(today) ? today.add(1, 'day').startOf('day') : today.startOf('day');
  }
  if (view === 'week') {
    const monday = mondayOf(today);
    const lastSlot = dayjs.utc(`${monday.add(6, 'day').format('YYYY-MM-DD')}T19:00`);
    return lastSlot.isBefore(today) ? monday.add(1, 'week') : monday;
  }
  return today.startOf('month');
};

export const buildReschedulePreview = (appointment, date, time) => {
  if (!appointment?.id || !appointment.start || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;

  const currentStart = dayjs.utc(appointment.start);
  const currentEnd = dayjs.utc(appointment.end || appointment.start);
  const nextStart = dayjs.utc(`${date}T${time}`);
  if (!currentStart.isValid() || !currentEnd.isValid() || !nextStart.isValid()) return null;

  const diff = currentEnd.diff(currentStart, 'minute');
  const duration = Number.isFinite(diff) && diff > 0 ? diff : 60;
  return {
    appointment,
    date,
    time,
    start: nextStart.toISOString(),
    end: nextStart.add(duration, 'minute').toISOString(),
    currentStart: currentStart.toISOString(),
    currentEnd: currentEnd.toISOString()
  };
};

export const isOpenAppointment = (appointment) => OPEN_STATUSES.includes(String(appointment?.status || '').toLowerCase());

export const canDragAppointment = (appointment, user) => {
  if (!['Administrador', 'Recepcionista'].includes(user?.role)) return false;
  if (!appointment?.id || !appointment?.start || !isOpenAppointment(appointment)) return false;
  if (dayjs.utc(appointment.start).isBefore(dayjs.utc())) return false;
  if (appointment.tenantId && user?.tenantId && String(appointment.tenantId) !== String(user.tenantId)) return false;
  return true;
};
