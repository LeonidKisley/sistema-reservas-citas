import dayjs from 'dayjs';

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAY_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 8).padStart(2, '0'));

export const hourEnd = (time) => {
  const hour = String(time || '').split(':')[0];
  return hour ? `${hour}:59` : '';
};

export const formatSlotLabel = (date, time) => {
  if (!date) return 'Fecha por definir';
  const value = dayjs(date);
  const label = `${WEEKDAYS[value.day()]} ${value.format('DD/MM/YYYY')}`;
  return time ? `${label} · ${time} - ${hourEnd(time)}` : label;
};

export const mondayOf = (value) => {
  const date = dayjs(value);
  return date.subtract((date.day() + 6) % 7, 'day').startOf('day');
};

export const buildWeekDays = (monday) => Array.from({ length: 7 }, (_, index) => monday.add(index, 'day'));

export const hourRange = (hour) => `${hour}:00 - ${hour}:59`;
