import mongoose, { Schema, model, Types } from 'mongoose';

const tokenBlacklistSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true, collection: 'token_blacklist' }
);

tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenBlacklist = mongoose.models.TokenBlacklist || model('TokenBlacklist', tokenBlacklistSchema);
