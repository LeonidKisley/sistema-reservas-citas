import { randomUUID } from 'node:crypto';
import mongoose, { Schema, model, Types } from 'mongoose';

const workHourSchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    start: { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm'] },
    end: { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm'] }
  },
  { _id: false }
);

const professionalSchema = new Schema(
  {
    publicId: { type: String, default: () => randomUUID() },
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Types.ObjectId, ref: 'User', default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    document: { type: String, trim: true, default: undefined },
    email: { type: String, trim: true, lowercase: true, default: undefined },
    phone: { type: String, trim: true },
    specialty: { type: String, trim: true },
    workHours: { type: [workHourSchema], default: [] },
    services: { type: [{ type: Types.ObjectId, ref: 'Service' }], default: [] },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: 'professionals' }
);

professionalSchema.index({ tenantId: 1, publicId: 1 }, { unique: true, sparse: true });
professionalSchema.index({ tenantId: 1, document: 1 }, { unique: true, sparse: true });
professionalSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });
professionalSchema.index({ tenantId: 1, active: 1 });

export const Professional = mongoose.models.Professional || model('Professional', professionalSchema);
