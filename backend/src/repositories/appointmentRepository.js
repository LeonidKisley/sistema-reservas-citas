import { Appointment } from '../models/Appointment.js';
import { TenantRepository } from './baseTenantRepository.js';

class AppointmentRepository extends TenantRepository {
  constructor() {
    super(Appointment);
  }

  buildFilter(tenantId, filters = {}) {
    const filter = {};
    if (filters.professionalId) filter.professionalId = this.oid(filters.professionalId);
    if (filters.clientId) filter.clientId = this.oid(filters.clientId);
    if (filters.serviceId) filter.serviceId = this.oid(filters.serviceId);
    if (filters.status) filter.status = filters.status;
    if (filters.from || filters.to) {
      filter.start = {};
      if (filters.from) filter.start.$gte = new Date(filters.from);
      if (filters.to) filter.start.$lt = new Date(filters.to);
    }
    return filter;
  }

  async search(tenantId, filters = {}, options = {}) {
    return this.find(this.buildFilter(tenantId, filters), tenantId, {
      sort: { start: 1 },
      populate: [
        { path: 'clientId', select: 'firstName lastName document' },
        { path: 'professionalId', select: 'firstName lastName specialty' },
        { path: 'serviceId', select: 'name durationMinutes price' }
      ],
      ...options
    });
  }

  async findOverlaps(tenantId, professionalId, start, end, options = {}) {
    return this.find(
      {
        professionalId: this.oid(professionalId),
        status: { $nin: ['cancelada', 'no asistió'] },
        start: { $lt: new Date(end) },
        end: { $gt: new Date(start) }
      },
      tenantId,
      options
    );
  }

  async countInRange(tenantId, from, to, filters = {}, options = {}) {
    return this.countDocuments(this.buildFilter(tenantId, { ...filters, from, to }), tenantId, options);
  }

  async countSearch(tenantId, filters = {}, options = {}) {
    return this.countDocuments(this.buildFilter(tenantId, filters), tenantId, options);
  }
}

export const appointmentRepository = new AppointmentRepository();
