import { Fragment, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HOURS, MONTHS_SHORT, WEEKDAY_SHORT, buildWeekDays, hourRange } from './agendaUtils.js';

dayjs.extend(utc);

const OPEN_STATUSES = ['programada', 'confirmada'];
const OCCUPYING_STATUSES = [...OPEN_STATUSES, 'completada'];
const STATUS_LABEL = {
  programada: 'Programada',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  'no asistió': 'No asistió'
};

const statusLabel = (status) => STATUS_LABEL[String(status || '').toLowerCase()] || status || 'Cita';
const isReservedStatus = (status) => OPEN_STATUSES.includes(String(status || '').toLowerCase());

export default function AgendaGrid({ weekStart, events, count, loading, onSelectSlot, onSelectAppointment, onPrevious, onNext, onToday }) {
  const [tooltip, setTooltip] = useState(null);
  const days = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const rangeLabel = `${days[0].format('D MMM')} – ${days[6].format('D MMM YYYY')}`;

  const appointmentsByDay = useMemo(() => {
    const map = new Map();
    events.forEach((appointment) => {
      if (!appointment?.start) return;
      const key = dayjs.utc(appointment.start).format('YYYY-MM-DD');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(appointment);
    });
    return map;
  }, [events]);

  const appointmentAt = (dateKey, hour) => {
    const start = dayjs.utc(`${dateKey}T${hour}:00`);
    const end = start.add(1, 'hour');
    return (appointmentsByDay.get(dateKey) || []).find((appointment) => {
      if (!OCCUPYING_STATUSES.includes(String(appointment.status || '').toLowerCase())) return false;
      const appointmentStart = dayjs.utc(appointment.start);
      const appointmentEnd = dayjs.utc(appointment.end || appointment.start);
      return appointmentStart.isBefore(end) && appointmentEnd.isAfter(start);
    });
  };

  const showTooltip = (event, appointment) => {
    const reserved = isReservedStatus(appointment.status);
    const lines = [
      {
        label: 'Estado',
        value: reserved
          ? (appointment.isMine ? 'Reservado por ti' : `Reservado por ${appointment.clientName || 'otro cliente'}`)
          : statusLabel(appointment.status),
        tone: reserved ? 'booked' : 'busy'
      },
      { label: 'Cliente', value: appointment.clientName },
      { label: 'Profesional', value: appointment.professionalName },
      { label: 'Servicio', value: appointment.serviceName },
      {
        label: 'Horario',
        value: `${dayjs.utc(appointment.start).format('HH:mm')} – ${dayjs.utc(appointment.end || appointment.start).format('HH:mm')}`
      }
    ];
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = Number.isFinite(event.clientX) ? event.clientX : rect.right;
    const pointerY = Number.isFinite(event.clientY) ? event.clientY : rect.top;
    setTooltip({
      x: Math.min(pointerX + 14, window.innerWidth - 270),
      y: Math.min(pointerY + 14, window.innerHeight - 210),
      lines
    });
  };

  return (
    <div className="agenda-panel">
      <div className="agenda-panel__bar">
        <div className="agenda-panel__title">
          <span className="eyebrow">Agenda semanal</span>
          <h2>{rangeLabel}</h2>
        </div>
        <div className="agenda-panel__nav">
          <span className="agenda-panel__status">{loading ? 'Actualizando…' : `${count} citas en esta semana`}</span>
          <button type="button" className="agenda-nav-button" onClick={onPrevious} aria-label="Semana anterior"><ChevronLeft size={18} strokeWidth={1.75} /></button>
          <button type="button" className="button button--soft agenda-today-button" onClick={onToday}>Hoy</button>
          <button type="button" className="agenda-nav-button" onClick={onNext} aria-label="Semana siguiente"><ChevronRight size={18} strokeWidth={1.75} /></button>
        </div>
      </div>

      <div className="agenda-scroll">
        <div className={`agenda-grid ${loading ? 'agenda-grid--loading' : ''}`}>
          <div className="agenda-grid__corner">HORA</div>
          {days.map((day) => (
            <div
              key={day.format('YYYY-MM-DD')}
              className={`agenda-day ${day.isSame(dayjs(), 'day') ? 'agenda-day--today' : ''}`}
            >
              <span className="agenda-day__name">{WEEKDAY_SHORT[day.day()]}</span>
              <span className="agenda-day__date">{day.format('D')}</span>
              <span className="agenda-day__month">{MONTHS_SHORT[day.month()]}</span>
            </div>
          ))}

          {HOURS.map((hour) => (
            <Fragment key={hour}>
              <div className="agenda-hour">{hourRange(hour)}</div>
              {days.map((day) => {
                const dateKey = day.format('YYYY-MM-DD');
                const time = `${hour}:00`;
                const appointment = appointmentAt(dateKey, hour);
                const past = dayjs.utc(`${dateKey}T${time}`).isBefore(dayjs.utc());

                if (appointment) {
                  const key = `booked-${dateKey}-${hour}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`agenda-cell agenda-cell--booked ${appointment.isMine ? 'agenda-cell--mine' : 'agenda-cell--other'}`}
                      onClick={() => onSelectAppointment(appointment)}
                      onMouseMove={(event) => showTooltip(event, appointment)}
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={(event) => showTooltip(event, appointment)}
                      onBlur={() => setTooltip(null)}
                      aria-label={`${statusLabel(appointment.status)}: ${appointment.serviceName} con ${appointment.professionalName}. Clic para ver detalles`}
                    >
                      <span className="agenda-event">
                        <strong>{appointment.serviceName}</strong>
                        <span>{appointment.isMine ? 'Reservado por ti' : appointment.professionalName}</span>
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={`free-${dateKey}-${hour}`}
                    type="button"
                    className={`agenda-cell agenda-cell--free ${past ? 'agenda-cell--past' : ''}`}
                    onClick={() => onSelectSlot(dateKey, time)}
                    aria-label={`Agendar cita el ${dateKey} a las ${time}${past ? ' (horario finalizado)' : ''}`}
                  >
                    {!past && <span className="agenda-cell__add">+ Agendar</span>}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {tooltip && (
        <div className="calendar-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.lines.map((line) => (
            <div className="calendar-tooltip__row" key={line.label}>
              <span>{line.label}</span>
              <strong className={line.tone ? `calendar-tooltip__${line.tone}` : ''}>{line.value || '—'}</strong>
            </div>
          ))}
          <div className="calendar-tooltip__hint">Clic para ver detalles</div>
        </div>
      )}
    </div>
  );
}
