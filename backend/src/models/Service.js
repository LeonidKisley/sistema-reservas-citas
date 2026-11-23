import { randomUUID } from 'node:crypto';
import mongoose, { Schema, model, Types } from 'mongoose';

const serviceSchema = new Schema(
  {
    publicId: { type: String, default: () => randomUUID() },
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: 'services' }
);

serviceSchema.index({ tenantId: 1, publicId: 1 }, { unique: true, sparse: true });
serviceSchema.index({ tenantId: 1, name: 1 }, { unique: true });
serviceSchema.index({ tenantId: 1, active: 1 });
serviceSchema.index({ tenantId: 1, deletedAt: 1 });

export const Service = mongoose.models.Service || model('Service', serviceSchema);
