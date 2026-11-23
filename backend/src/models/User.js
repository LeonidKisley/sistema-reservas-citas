import mongoose, { Schema, model, Types } from 'mongoose';
import { ROLES } from '../utils/permissions.js';

const userSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    clientId: { type: Types.ObjectId, ref: 'Client', default: null },
    professionalId: { type: Types.ObjectId, ref: 'Professional', default: null },
    active: { type: Boolean, default: true },
    platformAdmin: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    lastLogin: { type: Date, default: null }
  },
  { timestamps: true, collection: 'users' }
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, role: 1 });

export const User = mongoose.models.User || model('User', userSchema);
