import dotenv from 'dotenv';

dotenv.config();

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeMongoUri = (value) => {
  const trimmed = (value || '').trim();
  return /^mongodb(\+srv)?:\/\//.test(trimmed) ? trimmed : '';
};

const toDnsServers = (value) => (value || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

export const env = Object.freeze({
  nodeEnv,
  port: toPositiveInt(process.env.PORT, 4000),
  mongoUri: normalizeMongoUri(process.env.MONGODB_URI),
  dnsServers: toDnsServers(process.env.DNS_SERVERS),
  jwtSecret: process.env.JWT_SECRET || (isProduction ? null : 'dev-secret-cambiar-en-produccion'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  slotMinutes: toPositiveInt(process.env.SLOT_MINUTES, 30),
  defaultServiceDuration: toPositiveInt(process.env.DEFAULT_SERVICE_DURATION, 30),
  lockTimeoutMs: toPositiveInt(process.env.LOCK_TIMEOUT_MS, 5000),
  lockRetryMs: toPositiveInt(process.env.LOCK_RETRY_MS, 25),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
});

export { isProduction };
