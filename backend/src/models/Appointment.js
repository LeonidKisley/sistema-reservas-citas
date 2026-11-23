import { randomUUID } from 'node:crypto';
import mongoose, { Schema, model, Types } from 'mongoose';
import { APPOINTMENT_STATUSES } from '../utils/states.js';

const appointmentSchema = new Schema(
  {
    publicId: { type: String, default: () => randomUUID() },
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: Types.ObjectId, ref: 'Client', required: true },
    professionalId: { type: Types.ObjectId, ref: 'Professional', required: true },
    serviceId: { type: Types.ObjectId, ref: 'Service', required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'programada', required: true },
    notes: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },
    canceledAt: { type: Date, default: null },
    createdBy: { type: Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, collection: 'appointments' }
);

appointmentSchema.index({ tenantId: 1, publicId: 1 }, { unique: true, sparse: true });
appointmentSchema.index({ tenantId: 1, start: 1 });
appointmentSchema.index({ tenantId: 1, professionalId: 1, start: 1, end: 1 });
appointmentSchema.index({ tenantId: 1, clientId: 1, start: -1 });
appointmentSchema.index({ tenantId: 1, serviceId: 1 });
appointmentSchema.index({ tenantId: 1, status: 1 });

appointmentSchema.pre('validate', function ensureChronology(next) {
  if (this.start && this.end && this.end <= this.start) {
    next(new Error('La hora fin debe ser posterior a la hora de inicio'));
    return;
  }
  next();
});

export const Appointment = mongoose.models.Appointment || model('Appointment', appointmentSchema);
