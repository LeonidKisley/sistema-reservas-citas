import mongoose, { Schema, model } from 'mongoose';

const tenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug solo admite letras minúsculas, números y guiones']
    },
    identifier: { type: String, trim: true, default: undefined },
    active: { type: Boolean, default: true },
    plan: { type: String, default: 'basico', trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true }
  },
  { timestamps: true, collection: 'tenants' }
);

tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ identifier: 1 }, { unique: true, sparse: true });

export const Tenant = mongoose.models.Tenant || model('Tenant', tenantSchema);
