import { Service } from '../models/Service.js';
import { TenantRepository } from './baseTenantRepository.js';

class ServiceRepository extends TenantRepository {
  constructor() {
    super(Service);
  }

  async findAll(tenantId, options = {}) {
    return this.find({}, tenantId, { sort: { name: 1 }, ...options });
  }

  async findByName(tenantId, name, options = {}) {
    return this.findOne({ name: String(name).trim() }, tenantId, options);
  }
}

export const serviceRepository = new ServiceRepository();
