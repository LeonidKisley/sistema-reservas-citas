import { Fragment, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { CalendarClock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import LotusFlower from '../ui/LotusFlower.jsx';
import { useNow } from '../../hooks/useClock.js';
import { dateKeyOf, expiredLabel, expiredReason, isExpired } from '../../utils/time.js';
import {
  HOURS,
  MONTHS_SHORT,
  WEEKDAY_SHORT,
  buildViewDays,
  canDragAppointment,
  hourRange
} from './agendaUtils.js';

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
const VIEW_LABEL = { day: 'día', week: 'semana', month: 'mes' };

const statusLabel = (status) => STATUS_LABEL[String(status || '').toLowerCase()] || status || 'Cita';
const isReservedStatus = (status) => OPEN_STATUSES.includes(String(status || '').toLowerCase());

export default function AgendaGrid({
  view = 'week',
  anchor,
  events,
  count,
  loading,
  canDrag = false,
  user,
  onSelectSlot,
  onSelectAppointment,
  onRescheduleRequest,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  slotIssue
}) {
  const current = useNow();
  const [tooltip, setTooltip] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const days = useMemo(() => buildViewDays(view, anchor), [view, anchor]);
  const monthAnchor = dayjs.utc(anchor).startOf('month');
  const rangeLabel = view === 'month'
    ? monthAnchor.format('MMMM YYYY')
    : view === 'day'
      ? dayjs.utc(anchor).format('dddd, D [de] MMMM YYYY')
      : `${days[0].format('D MMM')} – ${days[6].format('D MMM YYYY')}`;

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

  const dayAppointments = (dateKey) => appointmentsByDay.get(dateKey) || [];

  const appointmentAt = (dateKey, hour) => {
    const start = dayjs.utc(`${dateKey}T${hour}:00`);
    const end = start.add(1, 'hour');
    return dayAppointments(dateKey).find((appointment) => {
      if (!OCCUPYING_STATUSES.includes(String(appointment.status || '').toLowerCase())) return false;
      const appointmentStart = dayjs.utc(appointment.start);
      const appointmentEnd = dayjs.utc(appointment.end || appointment.start);
      return appointmentStart.isBefore(end) && appointmentEnd.isAfter(start);
    });
  };

  // El vencimiento usa la hora local; las etiquetas y los eventos siguen en UTC wall-clock.
  const cellIssue = (dateKey, time) => {
    if (!time) return { kind: 'expired', title: 'La fecha ya pasó o no hay horarios válidos' };
    const reason = expiredReason(dateKey, time, current);
    if (reason) return { kind: 'expired', title: expiredLabel(dateKey, time, current, reason) };
    const issue = slotIssue?.(dateKey, time);
    if (!issue) return null;
    const suggestedTime = issue.suggestedTime || null;
    if (suggestedTime && isExpired(dateKey, suggestedTime, current)) {
      return {
        ...issue,
        kind: 'issue',
        suggestedTime: null,
        title: `${issue.title} · las ${suggestedTime} ya pasaron, elige otra fecha`
      };
    }
    return { ...issue, kind: 'issue', suggestedTime };
  };

  const firstFreeHour = (dateKey) => {
    const hour = HOURS.find((candidate) => (
      !appointmentAt(dateKey, candidate) && !cellIssue(dateKey, `${candidate}:00`)
    ));
    return hour ? `${hour}:00` : null;
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

  const draggable = (appointment) => canDrag && canDragAppointment(appointment, user);

  const startDrag = (event, appointment) => {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(appointment.id));
    setDraggingId(appointment.id);
    setTooltip(null);
  };

  const endDrag = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const dragOverCell = (event, dateKey, time) => {
    if (!draggingId || isExpired(dateKey, time, current)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setDropTarget(`${dateKey}T${time}`);
  };

  const dropOnCell = (event, dateKey, time) => {
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain') || draggingId;
    const appointment = events.find((item) => String(item.id) === String(id));
    if (appointment && draggable(appointment) && onRescheduleRequest) {
      onRescheduleRequest({ appointment, date: dateKey, time });
    }
    endDrag();
  };

  const dropProps = (dateKey, time) => ({
    onDragOver: (event) => dragOverCell(event, dateKey, time),
    onDragLeave: () => setDropTarget((current) => (current === `${dateKey}T${time}` ? null : current)),
    onDrop: (event) => dropOnCell(event, dateKey, time)
  });

  const viewButtons = [
    { key: 'day', label: 'Vista día', icon: CalendarDays },
    { key: 'week', label: 'Vista semana', icon: CalendarClock },
    { key: 'month', label: 'Vista mes', icon: CalendarRange }
  ];
  const viewLabel = VIEW_LABEL[view] || 'semana';

  return (
    <div className="agenda-panel">
      <div className="agenda-panel__bar">
        <div className="agenda-panel__title">
          <span className="eyebrow">Agenda {viewLabel}</span>
          <h2>{rangeLabel}</h2>
        </div>
        <div className="agenda-panel__nav">
          <span className="agenda-panel__status">{loading ? 'Actualizando…' : `${count} citas en ${viewLabel}`}</span>
          <div className="view-toggle" role="group" aria-label="Vista de agenda">
            {viewButtons.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={`view-toggle__button ${view === key ? 'view-toggle__button--active' : ''}`}
                onClick={() => onViewChange(key)}
                aria-label={label}
                aria-pressed={view === key}
              >
                <Icon size={14} strokeWidth={1.75} />
              </button>
            ))}
          </div>
          <button type="button" className="agenda-nav-button" onClick={onPrevious} aria-label={`${viewLabel} anterior`}><ChevronLeft size={18} strokeWidth={1.75} /></button>
          <button type="button" className="button button--soft agenda-today-button" onClick={onToday}>Hoy</button>
          <button type="button" className="agenda-nav-button" onClick={onNext} aria-label={`${viewLabel} siguiente`}><ChevronRight size={18} strokeWidth={1.75} /></button>
        </div>
      </div>

      <div className="agenda-scroll">
        <div className={`agenda-grid agenda-grid--${view} ${loading ? 'agenda-grid--loading' : ''}`}>
          {view === 'month' ? (
            <>
              {days.map((day) => (
                <div
                  key={day.format('YYYY-MM-DD')}
                  className={`agenda-day ${day.format('YYYY-MM-DD') === dateKeyOf(current) ? 'agenda-day--today' : ''}`}
                >
                  <span className="agenda-day__name">{WEEKDAY_SHORT[day.day()]}</span>
                  <span className="agenda-day__date">{day.format('D')}</span>
                  <span className="agenda-day__month">{MONTHS_SHORT[day.month()]}</span>
                </div>
              ))}
              {days.map((day) => {
                const dateKey = day.format('YYYY-MM-DD');
                const list = dayAppointments(dateKey);
                const time = firstFreeHour(dateKey);
                const past = dateKey < dateKeyOf(current);
                const issue = time
                  ? cellIssue(dateKey, time)
                  : { kind: 'expired', title: past ? 'La fecha ya pasó' : 'No hay horarios válidos este día' };
                const outside = day.month() !== monthAnchor.month();
                const isTarget = dropTarget === `${dateKey}T${time}`;
                const clickable = Boolean(time) && (!issue || Boolean(issue.suggestedTime));
                return (
                  <div
                    key={dateKey}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    className={`agenda-cell agenda-cell--month ${list.length ? 'agenda-cell--booked' : 'agenda-cell--free'} ${past || issue?.kind === 'expired' ? 'agenda-cell--expired' : ''} ${issue?.kind === 'issue' ? 'agenda-cell--issue' : ''} ${issue?.kind === 'expired' ? 'agenda-cell--past' : ''} ${outside ? 'agenda-cell--outside' : ''} ${isTarget ? 'agenda-cell--drop-target' : ''}`}
                    title={issue?.title || undefined}
                    aria-disabled={clickable ? undefined : 'true'}
                    onClick={clickable ? () => onSelectSlot(dateKey, issue?.suggestedTime || time) : undefined}
                    onKeyDown={clickable ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') onSelectSlot(dateKey, issue?.suggestedTime || time);
                    } : undefined}
                    {...(clickable ? dropProps(dateKey, time) : {})}
                  >
                    <span className="agenda-day__date">{day.format('D')}</span>
                    {list.slice(0, 3).map((appointment) => (
                      <button
                        key={appointment.id || `${dateKey}-${appointment.start}`}
                        type="button"
                        className="agenda-event agenda-event--month"
                        draggable={draggable(appointment)}
                        onDragStart={(event) => startDrag(event, appointment)}
                        onDragEnd={endDrag}
                        onClick={(event) => { event.stopPropagation(); onSelectAppointment(appointment); }}
                        onMouseMove={(event) => showTooltip(event, appointment)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <strong>{appointment.serviceName}</strong>
                        <span>{dayjs.utc(appointment.start).format('HH:mm')} · {appointment.professionalName}</span>
                      </button>
                    ))}
                    {list.length > 3 && <span className="agenda-event__more">+{list.length - 3} más</span>}
                    {!list.length && clickable && (
                      <span className="agenda-cell__add">{issue?.suggestedTime ? `Ver ${issue.suggestedTime}` : '+ Agendar'}</span>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div className="agenda-grid__corner">HORA</div>
              {days.map((day) => (
                <div
                  key={day.format('YYYY-MM-DD')}
                  className={`agenda-day ${day.format('YYYY-MM-DD') === dateKeyOf(current) ? 'agenda-day--today' : ''}`}
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

                    if (appointment) {
                      return (
                        <button
                          key={`booked-${dateKey}-${hour}`}
                          type="button"
                          className={`agenda-cell agenda-cell--booked ${appointment.isMine ? 'agenda-cell--mine' : 'agenda-cell--other'} ${String(draggingId) === String(appointment.id) ? 'agenda-cell--dragging' : ''}`}
                          draggable={draggable(appointment)}
                          onDragStart={(event) => startDrag(event, appointment)}
                          onDragEnd={endDrag}
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
                          <span
                            className={`agenda-cell__lotus ${appointment.isMine ? 'agenda-cell__lotus--mine' : 'agenda-cell__lotus--other'}`}
                            aria-hidden="true"
                          >
                            <LotusFlower />
                          </span>
                        </button>
                      );
                    }

                    const isTarget = dropTarget === `${dateKey}T${time}`;
                    const issue = cellIssue(dateKey, time);
                    const clickable = !issue || Boolean(issue.suggestedTime);
                    return (
                      <button
                        key={`free-${dateKey}-${hour}`}
                        type="button"
                        className={`agenda-cell agenda-cell--free ${issue?.kind === 'expired' ? 'agenda-cell--expired agenda-cell--past' : ''} ${issue?.kind === 'issue' ? 'agenda-cell--issue' : ''} ${isTarget ? 'agenda-cell--drop-target' : ''}`}
                        onClick={clickable ? () => onSelectSlot(dateKey, issue?.suggestedTime || time) : undefined}
                        aria-disabled={clickable ? undefined : 'true'}
                        title={issue?.title || undefined}
                        aria-label={`Agendar cita el ${dateKey} a las ${time}${issue?.title ? ` · ${issue.title}` : ''}`}
                        {...(clickable ? dropProps(dateKey, time) : {})}
                      >
                        {clickable && (
                          <span className="agenda-cell__add">
                            {isTarget ? 'Mover aquí' : (issue?.suggestedTime ? `Ver ${issue.suggestedTime}` : '+ Agendar')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </>
          )}
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
