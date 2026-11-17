import { Professional } from '../models/Professional.js';
import { TenantRepository } from './baseTenantRepository.js';

class ProfessionalRepository extends TenantRepository {
  constructor() {
    super(Professional);
  }

  async findAll(tenantId, options = {}) {
    return this.find({}, tenantId, { excludeDeleted: true, sort: { lastName: 1, firstName: 1 }, ...options });
  }

  async findByIdActive(id, tenantId, options = {}) {
    return this.findById(id, tenantId, { excludeDeleted: true, ...options });
  }

  async addService(professionalId, serviceId, tenantId, session) {
    return this.findByIdAndUpdate(
      professionalId,
      { $addToSet: { services: this.oid(serviceId) } },
      tenantId,
      { session, excludeDeleted: true }
    );
  }

  async removeService(professionalId, serviceId, tenantId, session) {
    return this.findByIdAndUpdate(
      professionalId,
      { $pull: { services: this.oid(serviceId) } },
      tenantId,
      { session, excludeDeleted: true }
    );
  }
}

export const professionalRepository = new ProfessionalRepository();
