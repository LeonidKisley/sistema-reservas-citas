import { TokenBlacklist } from '../models/TokenBlacklist.js';
import { TenantRepository } from './baseTenantRepository.js';

class TokenBlacklistRepository extends TenantRepository {
  constructor() {
    super(TokenBlacklist);
  }

  async isBlacklisted(tokenHash, tenantId) {
    return this.exists({ tokenHash }, tenantId);
  }

  async revoke({ tokenHash, tenantId, userId, expiresAt }, session) {
    return this.create({ tokenHash, tenantId, userId, expiresAt }, tenantId, session);
  }
}

export const tokenBlacklistRepository = new TokenBlacklistRepository();
