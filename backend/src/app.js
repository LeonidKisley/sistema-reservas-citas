import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  const storageRoot = resolve(process.cwd(), env.storageDir);
  const uploadsRoot = resolve(storageRoot, 'servicios');
  mkdirSync(uploadsRoot, { recursive: true });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok', service: 'reservas-api' }, message: 'API activa' });
  });

  app.use('/uploads', express.static(uploadsRoot));
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
