import mongoose, { Schema, model, Types } from 'mongoose';

const scheduleLockSchema = new Schema(
  {
    _id: { type: String, required: true },
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true, collection: 'schedule_locks', versionKey: false }
);

scheduleLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ScheduleLock = mongoose.models.ScheduleLock || model('ScheduleLock', scheduleLockSchema);
