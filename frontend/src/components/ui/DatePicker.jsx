import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import usePopover from './usePopover.js';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Selecciona una fecha',
  disabled = false,
  clearable = false,
  icon: Icon = CalendarDays,
  className = ''
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => dayjs(value || min || undefined).startOf('month'));
  const triggerRef = useRef(null);
  const { menuRef, style } = usePopover(triggerRef, open, () => setOpen(false), 290);

  const selected = value ? dayjs(value) : null;
  const baseMonth = dayjs(value || min || undefined).startOf('month');
  const month = visibleMonth.isValid() ? visibleMonth : baseMonth;
  const monthStart = month.startOf('month');
  const leading = (monthStart.day() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => monthStart.subtract(leading, 'day').add(index, 'day'));

  const openPicker = () => {
    if (disabled) return;
    setVisibleMonth(dayjs(value || min || undefined).startOf('month'));
    setOpen(true);
  };

  const isDisabled = (date) => {
    const key = date.format('YYYY-MM-DD');
    return Boolean((min && key < min) || (max && key > max));
  };

  const choose = (date) => {
    if (isDisabled(date)) return;
    onChange(date.format('YYYY-MM-DD'));
    setOpen(false);
  };

  const label = selected?.isValid()
    ? `${selected.date()} de ${MONTHS[selected.month()]} de ${selected.year()}`
    : placeholder;

  return (
    <div className={`date-picker ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`date-trigger ${open ? 'date-trigger--open' : ''} ${!selected ? 'date-trigger--placeholder' : ''}`}
        onClick={() => (open ? setOpen(false) : openPicker())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            openPicker();
          }
        }}
        disabled={disabled}
        aria-label={placeholder}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon size={17} strokeWidth={1.75} className="date-trigger__icon" aria-hidden="true" />
        <span className="date-trigger__value">{label}</span>
        <ChevronRight size={16} strokeWidth={1.75} className="date-trigger__chevron" aria-hidden="true" />
      </button>

      {open && createPortal(
        <div ref={menuRef} className="date-menu" style={style} role="dialog" aria-label="Seleccionar fecha">
          <div className="date-menu__header">
            <button
              type="button"
              className="date-nav"
              onClick={() => setVisibleMonth(month.subtract(1, 'month'))}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={17} strokeWidth={1.75} />
            </button>
            <strong>{MONTHS[month.month()]} {month.year()}</strong>
            <button
              type="button"
              className="date-nav"
              onClick={() => setVisibleMonth(month.add(1, 'month'))}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={17} strokeWidth={1.75} />
            </button>
          </div>
          <div className="date-menu__weekdays">
            {WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="date-menu__grid">
            {days.map((date) => {
              const key = date.format('YYYY-MM-DD');
              const daySelected = key === value;
              const outside = date.month() !== month.month();
              const isToday = key === dayjs().format('YYYY-MM-DD');
              return (
                <button
                  key={key}
                  type="button"
                  className={`date-day ${outside ? 'date-day--outside' : ''} ${daySelected ? 'date-day--selected' : ''} ${isToday ? 'date-day--today' : ''}`}
                  onClick={() => choose(date)}
                  disabled={isDisabled(date)}
                  aria-label={`${date.date()} de ${MONTHS[date.month()]} de ${date.year()}`}
                  aria-pressed={daySelected}
                >
                  {date.date()}
                </button>
              );
            })}
          </div>
          <div className="date-menu__footer">
            <button type="button" className="date-link" onClick={() => choose(dayjs())} disabled={isDisabled(dayjs())}>Hoy</button>
            {clearable && (
              <button
                type="button"
                className="date-link date-link--muted"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
