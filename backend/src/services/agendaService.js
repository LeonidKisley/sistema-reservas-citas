import { ApiError } from '../utils/apiError.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import { buildRange, parseDateKey, toDateKey, isValidRange } from '../utils/dates.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { appointmentService } from './appointmentService.js';

const STATUS_COLORS = {
  programada: '#6D2433',
  confirmada: '#6D2433',
  completada: '#837294',
  cancelada: '#B98A90',
  'no asistió': '#C0A06B'
};

function belongsToActor(appointment, actor) {
  return actor?.role === ROLES.CLIENT && appointment.clientId === actor.clientId;
}

function sanitizeForActor(appointment, actor) {
  const isMine = belongsToActor(appointment, actor);
  if (actor?.role !== ROLES.CLIENT || isMine) return { ...appointment, isMine };
  return { ...appointment, isMine, clientName: null };
}

function rangeForDate(dateKey, view) {
  const date = parseDateKey(dateKey);
  if (!date) throw ApiError.badRequest('La fecha no es válida (YYYY-MM-DD)');

  if (view === 'day') {
    return { from: dateKey, to: dateKey };
  }

  if (view === 'week') {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const start = new Date(date.getTime() - mondayOffset * 86_400_000);
    const end = new Date(start.getTime() + 6 * 86_400_000);
    return { from: toDateKey(start), to: toDateKey(end) };
  }

  if (view === 'month') {
    const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    return { from: toDateKey(first), to: toDateKey(last) };
  }

  throw ApiError.badRequest('La vista debe ser day, week o month');
}

export const agendaService = {
  async getAgenda(tenantId, query = {}, actor) {
    assertPermission(actor, 'agenda.read');

    const view = query.view || 'day';
    let from;
    let to;

    if (query.date) {
      ({ from, to } = rangeForDate(query.date, view));
    } else if (query.from || query.to) {
      const range = buildRange(query.from, query.to);
      if (!range.valid) throw ApiError.badRequest(range.error);
      from = query.from;
      to = query.to;
    } else {
      const today = toDateKey(new Date());
      ({ from, to } = rangeForDate(today, view));
    }

    const range = buildRange(from, to);
    if (!range.valid) throw ApiError.badRequest(range.error);

    const filters = { ...query, from: range.from, to: new Date(range.to.getTime() + 86_400_000) };
    delete filters.view;
    delete filters.date;
    delete filters.page;
    delete filters.limit;

    if (actor.role === ROLES.PROFESSIONAL) filters.professionalId = actor.professionalId;

    const appointments = await appointmentRepository.search(tenantId, filters, { limit: 2000 });

    return {
      view,
      range: { from, to },
      filters: {
        professionalId: filters.professionalId || null,
        serviceId: filters.serviceId || null,
        clientId: filters.clientId || null
      },
      count: appointments.length,
      events: appointments.map((appointment) => appointmentService.sanitize(appointment)).map((appointment) => {
        const visible = sanitizeForActor(appointment, actor);
        const titleName = visible.clientName || (visible.isMine ? 'Cliente' : 'Reservado');
        return {
          id: visible.id,
          title: `${visible.serviceName || 'Cita'}  ·  ${titleName}`,
          start: visible.start,
          end: visible.end,
          backgroundColor: STATUS_COLORS[visible.status] || '#3b82f6',
          borderColor: STATUS_COLORS[visible.status] || '#3b82f6',
          extendedProps: visible
        };
      })
    };
  },

  async getDaily(tenantId, query = {}, actor) {
    const date = query.date || toDateKey(new Date());
    if (!isValidRange(date, date).valid) throw ApiError.badRequest('La fecha no es válida');
    const agenda = await this.getAgenda(tenantId, { ...query, view: 'day', date }, actor);
    return { date, appointments: agenda.events.map((event) => event.extendedProps) };
  }
};
