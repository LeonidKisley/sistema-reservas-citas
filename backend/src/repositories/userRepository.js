import { User } from '../models/User.js';
import { TenantRepository } from './baseTenantRepository.js';

class UserRepository extends TenantRepository {
  constructor() {
    super(User);
  }

  async findByTenantAndEmail(tenantId, email, options = {}) {
    const select = options.withPassword ? '+password' : undefined;
    return this.findOne({ email: String(email).toLowerCase().trim() }, tenantId, { select });
  }

  async findByIdAndTenant(id, tenantId, options = {}) {
    return this.findById(id, tenantId, options);
  }

  async setLastLogin(userId, tenantId, session) {
    return this.findByIdAndUpdate(userId, { $set: { lastLogin: new Date() } }, tenantId, { session });
  }

  async changePassword(userId, tenantId, passwordHash, session) {
    return this.findByIdAndUpdate(userId, { $set: { password: passwordHash }, $inc: { tokenVersion: 1 } }, tenantId, {
      session,
      select: '+password'
    });
  }

  async incrementTokenVersion(userId, tenantId, session) {
    return this.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } }, tenantId, { session });
  }
}

export const userRepository = new UserRepository();
