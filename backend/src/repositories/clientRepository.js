import { Client } from '../models/Client.js';
import { TenantRepository } from './baseTenantRepository.js';

class ClientRepository extends TenantRepository {
  constructor() {
    super(Client);
  }

  async search(tenantId, term, options = {}) {
    const { filter: extraFilter = {}, ...queryOptions } = options;
    const filter = { ...extraFilter };
    if (term) {
      const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { document: { $regex: escaped, $options: 'i' } }
      ];
    }
    return this.find(filter, tenantId, { excludeDeleted: true, sort: { lastName: 1, firstName: 1 }, ...queryOptions });
  }

  async findByDocument(tenantId, document, options = {}) {
    return this.findOne({ document: String(document).trim() }, tenantId, options);
  }

  async findByEmail(tenantId, email, options = {}) {
    if (!email) return null;
    return this.findOne({ email: String(email).toLowerCase().trim() }, tenantId, options);
  }

  async softDelete(id, tenantId, session) {
    return this.findByIdAndUpdate(id, { $set: { deletedAt: new Date() } }, tenantId, { session });
  }
}

export const clientRepository = new ClientRepository();
