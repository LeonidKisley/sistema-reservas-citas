import { Service } from '../models/Service.js';
import { TenantRepository } from './baseTenantRepository.js';

class ServiceRepository extends TenantRepository {
  constructor() {
    super(Service);
  }

  async findAll(tenantId, options = {}) {
    return this.find({ active: true, deletedAt: null }, tenantId, { sort: { name: 1 }, ...options });
  }

  async findByName(tenantId, name, options = {}) {
    return this.findOne({ name: String(name).trim() }, tenantId, options);
  }

  async findByIdActive(id, tenantId, options = {}) {
    return this.findById(id, tenantId, { ...options });
  }
}

export const serviceRepository = new ServiceRepository();
