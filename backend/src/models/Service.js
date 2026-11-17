import mongoose, { Schema, model, Types } from 'mongoose';

const serviceSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'services' }
);

serviceSchema.index({ tenantId: 1, name: 1 }, { unique: true });
serviceSchema.index({ tenantId: 1, active: 1 });

export const Service = mongoose.models.Service || model('Service', serviceSchema);
