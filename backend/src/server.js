import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

async function bootstrap() {
  await connectDatabase();
  console.log(`[DB] Conectado a MongoDB Atlas`);

  const server = app.listen(env.port, () => {
    console.log(`[API] http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`[${signal}] Cerrando servidor...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('[FATAL] No se pudo iniciar la API:', error.message);
  process.exit(1);
});
