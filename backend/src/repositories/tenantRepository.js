import { Tenant } from '../models/Tenant.js';

class TenantRepository {
  async create(data) {
    return Tenant.create(data);
  }

  async findAll(filter = {}) {
    return Tenant.find(filter).lean().exec();
  }

  async findById(id) {
    return Tenant.findById(id).exec();
  }

  async findBySlug(slug) {
    return Tenant.findOne({ slug: String(slug).toLowerCase().trim() }).exec();
  }

  async findByIdentifier(identifier) {
    if (!identifier) return null;
    return Tenant.findOne({ identifier: String(identifier).trim() }).exec();
  }

  async findByName(name) {
    return Tenant.findOne({ name: String(name).trim() }).exec();
  }

  async existsBySlugOrName(slug, name, identifier) {
    const conditions = [{ slug }, { name }];
    if (identifier) conditions.push({ identifier });
    return Tenant.exists({ $or: conditions });
  }
}

export const tenantRepository = new TenantRepository();
