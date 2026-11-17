import { randomUUID } from 'node:crypto';
import { ApiError } from '../utils/apiError.js';
import { ScheduleLock } from '../models/ScheduleLock.js';
import { env } from '../config/env.js';

class ScheduleLockRepository {
  buildKey(tenantId, professionalId, dateKey) {
    return `schedule:${tenantId}:${professionalId}:${dateKey}`;
  }

  async acquire(tenantId, professionalId, dateKey) {
    const key = this.buildKey(tenantId, professionalId, dateKey);
    const owner = randomUUID();
    const expiresAt = new Date(Date.now() + env.lockTimeoutMs);
    const deadline = Date.now() + env.lockTimeoutMs;

    while (Date.now() < deadline) {
      try {
        await ScheduleLock.create({ _id: key, tenantId, owner, expiresAt });
        return { key, tenantId, owner, expiresAt };
      } catch (error) {
        if (error.code !== 11000) throw error;
        await new Promise((resolve) => setTimeout(resolve, env.lockRetryMs));
      }
    }

    throw ApiError.conflict('No se pudo adquirir el bloqueo de agenda; intenta nuevamente');
  }

  async release(lock) {
    if (!lock?.key) return;
    await ScheduleLock.deleteOne({ _id: lock.key, tenantId: lock.tenantId, owner: lock.owner });
  }
}

export const scheduleLockRepository = new ScheduleLockRepository();
