import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { assertValid } from '../utils/validate.js';
import { assertPermission } from '../utils/permissions.js';
import { combineDateAndMinutes, isPastDate, minutesToTime, parseDateKey, rangesOverlap, timeToMinutes } from '../utils/dates.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { serviceRepository } from '../repositories/serviceRepository.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';

const querySchema = {
  professionalId: { required: true, mongoId: true },
  date: { required: true, isDate: true },
  serviceId: { mongoId: true }
};

export const availabilityService = {
  async resolveContext(tenantId, query, actor) {
    assertPermission(actor, 'availability.read');
    assertValid(query, querySchema);

    const date = parseDateKey(query.date);
    if (!date) throw ApiError.badRequest('La fecha no es válida');
    if (isPastDate(date)) throw ApiError.badRequest('No se puede consultar disponibilidad de una fecha pasada');

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

    return { date, dateKey: query.date, professional, durationMinutes };
  },

  async getSlots(tenantId, query, actor) {
    const { date, dateKey, professional, durationMinutes } = await this.resolveContext(tenantId, query, actor);
    const dayOfWeek = date.getUTCDay();
    const workHour = (professional.workHours || []).find((entry) => entry.dayOfWeek === dayOfWeek);

    if (!workHour) return { professionalId: professional._id.toString(), date: dateKey, slots: [] };

    const workStart = timeToMinutes(workHour.start);
    const workEnd = timeToMinutes(workHour.end);
    if (workStart === null || workEnd === null || workEnd <= workStart) {
      return { professionalId: professional._id.toString(), date: dateKey, slots: [] };
    }

    const busy = await appointmentRepository.findOverlaps(
      tenantId,
      professional._id,
      combineDateAndMinutes(dateKey, workStart),
      combineDateAndMinutes(dateKey, workEnd)
    );

    const slots = [];
    for (let startMinutes = workStart; startMinutes + durationMinutes <= workEnd; startMinutes += env.slotMinutes) {
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
      durationMinutes,
      slots
    };
  },

  async assertSlotFree(tenantId, professionalId, start, end, excludeAppointmentId) {
    const overlaps = await appointmentRepository.findOverlaps(tenantId, professionalId, start, end);
    const conflict = overlaps.find(
      (appointment) => !excludeAppointmentId || appointment._id.toString() !== excludeAppointmentId
    );
    if (conflict) {
      throw ApiError.conflict('El horario seleccionado ya está ocupado para este profesional');
    }
    return true;
  }
};
