import { randomUUID } from 'node:crypto';
import mongoose, { Schema, model, Types } from 'mongoose';

const clientSchema = new Schema(
  {
    publicId: { type: String, default: () => randomUUID() },
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Types.ObjectId, ref: 'User', default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    document: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: undefined },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: 'clients' }
);

clientSchema.index({ tenantId: 1, publicId: 1 }, { unique: true, sparse: true });
clientSchema.index({ tenantId: 1, document: 1 }, { unique: true });
clientSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });
clientSchema.index({ tenantId: 1, firstName: 1, lastName: 1 });
clientSchema.index({ tenantId: 1, deletedAt: 1 });

export const Client = mongoose.models.Client || model('Client', clientSchema);
