import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError.js';
import { assertValid } from '../utils/validate.js';
import { assertPermission, ROLES } from '../utils/permissions.js';
import {
  combineDateAndMinutes,
  buildRange,
  isPastDate,
  parseDateKey,
  timeToMinutes
} from '../utils/dates.js';
import { assertTransition, isBlocking } from '../utils/states.js';
import { assertTenantOwnership } from '../utils/assertTenantOwnership.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { clientRepository } from '../repositories/clientRepository.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { serviceRepository } from '../repositories/serviceRepository.js';
import { scheduleLockRepository } from '../repositories/scheduleLockRepository.js';
import { availabilityService } from './availabilityService.js';

const POPULATE = [
  { path: 'clientId', select: 'firstName lastName document' },
  { path: 'professionalId', select: 'firstName lastName specialty' },
  { path: 'serviceId', select: 'name durationMinutes price' }
];

const writeSchema = {
  clientId: { required: true, mongoId: true },
  professionalId: { required: true, mongoId: true },
  serviceId: { required: true, mongoId: true },
  date: { required: true, isDate: true },
  time: { required: true, isTime: true },
  notes: { type: 'string', maxLength: 500 }
};

const rescheduleSchema = {
  date: { required: true, isDate: true },
  time: { required: true, isTime: true }
};

function idOf(value) {
  if (!value) return null;
  return (value._id || value).toString();
}

function sanitize(appointment) {
  return {
    id: appointment._id.toString(),
    clientId: idOf(appointment.clientId),
    clientName: appointment.clientId?.firstName
      ? `${appointment.clientId.firstName} ${appointment.clientId.lastName}`
      : null,
    professionalId: idOf(appointment.professionalId),
    professionalName: appointment.professionalId?.firstName
      ? `${appointment.professionalId.firstName} ${appointment.professionalId.lastName}`
      : null,
    serviceId: idOf(appointment.serviceId),
    serviceName: appointment.serviceId?.name || null,
    start: appointment.start,
    end: appointment.end,
    status: appointment.status,
    notes: appointment.notes || null,
    cancellationReason: appointment.cancellationReason || null,
    canceledAt: appointment.canceledAt || null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt
  };
}

function assertOwnership(actor, appointment) {
  const clientId = idOf(appointment.clientId);
  const professionalId = idOf(appointment.professionalId);
  if (actor.role === ROLES.CLIENT && actor.clientId !== clientId) {
    throw ApiError.forbidden('Solo puedes gestionar tus propias citas');
  }
  if (actor.role === ROLES.PROFESSIONAL && actor.professionalId !== professionalId) {
    throw ApiError.forbidden('Solo puedes gestionar las citas asignadas a ti');
  }
}

function transactionUnsupported(error) {
  return error?.code === 20 || /Transaction numbers are only allowed/i.test(error?.message || '');
}

async function runInTransaction(callback) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } catch (error) {
    if (transactionUnsupported(error)) {
      throw ApiError.internal('La reserva requiere MongoDB con soporte de transacciones');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function withScheduleLock(tenantId, professionalId, dateKey, callback) {
  const lock = await scheduleLockRepository.acquire(tenantId, professionalId, dateKey);
  try {
    return await callback();
  } finally {
    await scheduleLockRepository.release(lock);
  }
}

async function computeSchedule(tenantId, input) {
  const date = parseDateKey(input.date);
  if (!date) throw ApiError.badRequest('La fecha no es válida (YYYY-MM-DD)');
  if (isPastDate(date)) throw ApiError.badRequest('No se puede agendar en una fecha pasada');

  const minutes = timeToMinutes(input.time);
  if (minutes === null) throw ApiError.badRequest('La hora no es válida (HH:mm)');

  const service = await serviceRepository.findById(input.serviceId, tenantId);
  if (!service || !service.active) throw ApiError.notFound('Servicio no encontrado o inactivo');

  const professional = await professionalRepository.findByIdActive(input.professionalId, tenantId);
  if (!professional || !professional.active) throw ApiError.notFound('Profesional no encontrado o inactivo');

  const assigned = (professional.services || []).some((id) => id.toString() === service._id.toString());
  if (!assigned) {
    throw ApiError.badRequest('El profesional seleccionado no ofrece el servicio solicitado');
  }

  const start = combineDateAndMinutes(input.date, minutes);
  const end = combineDateAndMinutes(input.date, minutes + service.durationMinutes);
  const workHour = (professional.workHours || []).find((entry) => entry.dayOfWeek === date.getUTCDay());

  if (!workHour) {
    throw ApiError.badRequest('El profesional no atiende el día seleccionado');
  }

  const workStart = timeToMinutes(workHour.start);
  const workEnd = timeToMinutes(workHour.end);
  if (minutes < workStart || minutes + service.durationMinutes > workEnd) {
    throw ApiError.badRequest('La duración de la cita excede el horario laboral del profesional');
  }

  return { start, end, dateKey: input.date, professional, service };
}

async function findAppointment(id, tenantId) {
  const appointment = await appointmentRepository.findById(id, tenantId, { populate: POPULATE });
  if (!appointment) await assertTenantOwnership(appointmentRepository, id, tenantId, 'Cita');
  return appointment;
}

export const appointmentService = {
  async create(tenantId, payload, actor) {
    assertPermission(actor, 'appointment.create');
    assertValid(payload, writeSchema);

    const client = await clientRepository.findById(payload.clientId, tenantId, { excludeDeleted: true });
    if (!client) throw ApiError.notFound('Cliente no encontrado en la organización activa');
    assertOwnership(actor, { clientId: client._id });

    const schedule = await computeSchedule(tenantId, payload);

    const created = await withScheduleLock(
      tenantId,
      schedule.professional._id,
      schedule.dateKey,
      () => runInTransaction(async (session) => {
        await availabilityService.assertSlotFree(tenantId, schedule.professional._id, schedule.start, schedule.end, null, { session });
        return appointmentRepository.create(
          {
            clientId: client._id,
            professionalId: schedule.professional._id,
            serviceId: schedule.service._id,
            start: schedule.start,
            end: schedule.end,
            status: 'programada',
            notes: payload.notes,
            createdBy: mongoose.Types.ObjectId.isValid(actor.id) ? actor.id : null,
            updatedBy: mongoose.Types.ObjectId.isValid(actor.id) ? actor.id : null
          },
          tenantId,
          session
        );
      })
    );

    return sanitize(await findAppointment(created._id, tenantId));
  },

  async reschedule(id, tenantId, payload, actor) {
    assertPermission(actor, 'appointment.reschedule');
    assertValid(payload, rescheduleSchema);

    const appointment = await findAppointment(id, tenantId);
    assertOwnership(actor, appointment);
    if (appointment.status === 'cancelada' || isBlocking(appointment.status)) {
      throw ApiError.conflict('No se puede reprogramar una cita cancelada o que no asistió');
    }

    const schedule = await computeSchedule(tenantId, {
      professionalId: idOf(appointment.professionalId),
      serviceId: idOf(appointment.serviceId),
      date: payload.date,
      time: payload.time
    });

    const updated = await withScheduleLock(
      tenantId,
      schedule.professional._id,
      schedule.dateKey,
      () => runInTransaction(async (session) => {
        await availabilityService.assertSlotFree(
          tenantId,
          schedule.professional._id,
          schedule.start,
          schedule.end,
          appointment._id,
          { session }
        );
        return appointmentRepository.findOneAndUpdate(
          { _id: appointment._id },
          { $set: { start: schedule.start, end: schedule.end, updatedBy: actor.id } },
          tenantId,
          { session }
        );
      })
    );

    return sanitize(await findAppointment(updated._id, tenantId));
  },

  async cancel(id, tenantId, payload, actor) {
    assertPermission(actor, 'appointment.cancel');
    const appointment = await findAppointment(id, tenantId);
    assertOwnership(actor, appointment);

    if (appointment.status === 'cancelada') {
      return { appointment: sanitize(appointment), idempotent: true, message: 'La cita ya estaba cancelada' };
    }
    if (['completada', 'no asistió'].includes(appointment.status)) {
      throw ApiError.conflict(`No se puede cancelar una cita en estado ${appointment.status}`);
    }
    if (actor.role === ROLES.CLIENT && new Date(appointment.start) <= new Date()) {
      throw ApiError.conflict('Ya no puedes cancelar una cita que ya comenzó');
    }

    const updated = await appointmentRepository.findOneAndUpdate(
      { _id: appointment._id },
      {
        $set: {
          status: 'cancelada',
          canceledAt: new Date(),
          cancellationReason: payload?.reason || null,
          updatedBy: actor.id
        }
      },
      tenantId
    );

    return { appointment: sanitize(updated), idempotent: false, message: 'Cita cancelada; el bloque horario fue liberado' };
  },

  async updateStatus(id, tenantId, payload, actor) {
    assertPermission(actor, 'appointment.status');
    assertValid(payload, { status: { required: true, type: 'string' } });

    const appointment = await findAppointment(id, tenantId);
    assertOwnership(actor, appointment);
    assertTransition(appointment.status, payload.status);

    const updates = { status: payload.status, updatedBy: actor.id };
    if (payload.status === 'cancelada') {
      updates.canceledAt = new Date();
      updates.cancellationReason = payload.reason || null;
    }

    const updated = await appointmentRepository.findOneAndUpdate({ _id: appointment._id }, { $set: updates }, tenantId);
    return sanitize(updated);
  },

  async list(tenantId, query = {}, actor) {
    assertPermission(actor, 'appointment.read');

    const filters = { ...query };
    if (query.from || query.to) {
      const range = buildRange(query.from, query.to);
      if (!range.valid) throw ApiError.badRequest(range.error);
      filters.from = range.from.toISOString();
      filters.to = range.to.toISOString();
    }
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
    const page = Math.max(Number(query.page) || 1, 1);
    delete filters.page;
    delete filters.limit;
    if (actor.role === ROLES.CLIENT) filters.clientId = actor.clientId;
    if (actor.role === ROLES.PROFESSIONAL) filters.professionalId = actor.professionalId;

    const appointments = await appointmentRepository.search(tenantId, filters, {
      skip: (page - 1) * limit,
      limit
    });

    return { items: appointments.map(sanitize), total: appointments.length, page, limit };
  },

  async getById(id, tenantId, actor) {
    assertPermission(actor, 'appointment.read');
    const appointment = await findAppointment(id, tenantId);
    assertOwnership(actor, appointment);
    return sanitize(appointment);
  },

  sanitize
};
