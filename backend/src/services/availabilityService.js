import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { assertValid } from '../utils/validate.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import { combineDateAndMinutes, isPastDate, minutesToTime, parseDateKey, rangesOverlap, timeToMinutes } from '../utils/dates.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { serviceRepository } from '../repositories/serviceRepository.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';

const querySchema = {
  professionalId: { required: true, mongoId: true },
  date: { required: true, isDate: true },
  serviceId: { mongoId: true },
  fromTime: { isTime: true }
};

const recommendedQuerySchema = {
  date: { required: true, isDate: true },
  time: { required: true, isTime: true },
  serviceId: { mongoId: true }
};

const BOOKED_POPULATE = [
  { path: 'clientId', select: 'firstName lastName' },
  { path: 'professionalId', select: 'firstName lastName' },
  { path: 'serviceId', select: 'name durationMinutes' }
];

function idOf(value) {
  if (!value) return null;
  return (value._id || value).toString();
}

function fullName(value) {
  if (!value?.firstName) return null;
  return `${value.firstName} ${value.lastName || ''}`.trim();
}

function timeOf(value) {
  const date = new Date(value);
  return minutesToTime(date.getUTCHours() * 60 + date.getUTCMinutes());
}

function describeBooked(appointment, actor) {
  const isMine = actor?.role === ROLES.CLIENT && idOf(appointment.clientId) === actor.clientId;
  return {
    id: appointment._id.toString(),
    start: appointment.start.toISOString(),
    end: appointment.end.toISOString(),
    startTime: timeOf(appointment.start),
    endTime: timeOf(appointment.end),
    available: false,
    status: appointment.status,
    isMine,
    clientName: isMine ? fullName(appointment.clientId) : null,
    professionalName: fullName(appointment.professionalId),
    serviceName: appointment.serviceId?.name || null
  };
}

export const availabilityService = {
  async resolveContext(tenantId, query, actor) {
    assertPermission(actor, 'availability.read');
    assertValid(query, querySchema);

    const date = parseDateKey(query.date);
    if (!date) throw ApiError.badRequest('La fecha no es válida');

    const pastDate = isPastDate(date);
    const professional = await professionalRepository.findByIdActive(query.professionalId, tenantId);
    if (!professional || !professional.active) {
      throw ApiError.notFound('Profesional no encontrado o inactivo en la organización activa');
    }

    let durationMinutes = env.defaultServiceDuration;
    if (query.serviceId) {
      const service = await serviceRepository.findById(query.serviceId, tenantId);
      if (!service || !service.active) throw ApiError.notFound('Servicio no encontrado o inactivo');
      durationMinutes = service.durationMinutes;
      const assigned = (professional.services || []).some((id) => id.toString() === service._id.toString());
      if (!assigned) {
        throw ApiError.badRequest('El profesional seleccionado no ofrece ese servicio');
      }
    }

    if (pastDate) throw ApiError.badRequest('La fecha solicitada no es válida o ya pasó');

    return { date, dateKey: query.date, professional, durationMinutes, fromTime: query.fromTime || null };
  },

  async getSlots(tenantId, query, actor) {
    const context = await this.resolveContext(tenantId, query, actor);
    if (context.pastDate) return context;
    const { date, dateKey, professional, durationMinutes, fromTime } = context;
    const dayOfWeek = date.getUTCDay();
    const workHour = (professional.workHours || []).find((entry) => entry.dayOfWeek === dayOfWeek);
    const empty = { professionalId: professional._id.toString(), date: dateKey, fromTime, slots: [], bookedSlots: [] };

    if (!workHour) return empty;

    const workStart = timeToMinutes(workHour.start);
    const workEnd = timeToMinutes(workHour.end);
    if (workStart === null || workEnd === null || workEnd <= workStart) return empty;

    const busy = await appointmentRepository.findOverlaps(
      tenantId,
      professional._id,
      combineDateAndMinutes(dateKey, workStart),
      combineDateAndMinutes(dateKey, workEnd),
      { populate: BOOKED_POPULATE }
    );
    const fromMinutes = fromTime ? timeToMinutes(fromTime) : workStart;
    const bookedSlots = busy
      .filter((appointment) => appointment.start >= combineDateAndMinutes(dateKey, fromMinutes))
      .map((appointment) => describeBooked(appointment, actor))
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    // Mantiene la grilla de slotMinutes aunque fromTime no caiga en un múltiplo exacto.
    const alignedFrom = Math.max(
      workStart,
      workStart + Math.ceil((fromMinutes - workStart) / env.slotMinutes) * env.slotMinutes
    );
    const slots = [];
    for (let startMinutes = alignedFrom; startMinutes + durationMinutes <= workEnd; startMinutes += env.slotMinutes) {
      const start = combineDateAndMinutes(dateKey, startMinutes);
      const end = combineDateAndMinutes(dateKey, startMinutes + durationMinutes);
      const overlaps = busy.some((appointment) => rangesOverlap(start, end, appointment.start, appointment.end));
      if (!overlaps) {
        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          startTime: minutesToTime(startMinutes),
          endTime: minutesToTime(startMinutes + durationMinutes),
          available: true
        });
      }
    }

    return {
      professionalId: professional._id.toString(),
      date: dateKey,
      fromTime,
      durationMinutes,
      slots,
      bookedSlots
    };
  },

  async getRecommendedProfessionals(tenantId, query, actor) {
    assertPermission(actor, 'availability.read');
    assertValid(query, recommendedQuerySchema);

    const date = parseDateKey(query.date);
    if (!date) throw ApiError.badRequest('La fecha no es válida');
    if (isPastDate(date)) {
      return { date: query.date, time: query.time, durationMinutes: env.defaultServiceDuration, count: 0, professionals: [], pastDate: true };
    }

    const minutes = timeToMinutes(query.time);
    if (minutes === null) throw ApiError.badRequest('La hora no es válida (HH:mm)');

    let service = null;
    let durationMinutes = env.defaultServiceDuration;
    if (query.serviceId) {
      service = await serviceRepository.findById(query.serviceId, tenantId);
      if (!service || !service.active) throw ApiError.notFound('Servicio no encontrado o inactivo');
      durationMinutes = service.durationMinutes;
    }

    const start = combineDateAndMinutes(query.date, minutes);
    const end = combineDateAndMinutes(query.date, minutes + durationMinutes);
    const professionals = await professionalRepository.findAll(tenantId);
    const candidates = [];

    await Promise.all(professionals.map(async (professional) => {
      if (!professional.active) return;
      if (service && !(professional.services || []).some((id) => id.toString() === service._id.toString())) return;

      const workHour = (professional.workHours || []).find((entry) => entry.dayOfWeek === date.getUTCDay());
      if (!workHour) return;

      const workStart = timeToMinutes(workHour.start);
      const workEnd = timeToMinutes(workHour.end);
      if (workStart === null || workEnd === null || minutes < workStart || minutes + durationMinutes > workEnd) return;

      const dayAppointments = await appointmentRepository.findOverlaps(
        tenantId,
        professional._id,
        combineDateAndMinutes(query.date, workStart),
        combineDateAndMinutes(query.date, workEnd)
      );
      if (dayAppointments.some((appointment) => rangesOverlap(start, end, appointment.start, appointment.end))) return;

      const workload = dayAppointments.length;
      candidates.push({
        id: professional._id.toString(),
        firstName: professional.firstName,
        lastName: professional.lastName,
        name: `${professional.firstName} ${professional.lastName}`.trim(),
        specialty: professional.specialty || 'Profesional del salón',
        phone: professional.phone || null,
        workload,
        score: Math.max(0, 100 - workload * 10),
        reason: workload ? `${workload} cita${workload === 1 ? '' : 's'} ese día · horario libre` : 'Sin citas ese día',
        available: true
      });
    }));

    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));

    return {
      date: query.date,
      time: query.time,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMinutes,
      serviceId: service ? service._id.toString() : null,
      serviceName: service ? service.name : null,
      count: candidates.length,
      professionals: candidates
    };
  },

  async assertSlotFree(tenantId, professionalId, start, end, excludeAppointmentId, options = {}) {
    const overlaps = await appointmentRepository.findOverlaps(tenantId, professionalId, start, end, {
      session: options.session || null
    });
    const conflict = overlaps.find(
      (appointment) => !excludeAppointmentId || appointment._id.toString() !== excludeAppointmentId
    );
    if (conflict) {
      throw ApiError.conflict('El horario seleccionado ya está ocupado para este profesional');
    }
    return true;
  }
};
