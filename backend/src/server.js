import { app } from './app.js';
import { env, isProduction } from './config/env.js';
import { connectDatabase, disconnectDatabase, isUsingMemoryDatabase } from './config/database.js';
import { seedDatabase } from './seed.js';

async function bootstrap() {
  await connectDatabase();
  console.log(`[DB] Conectado a ${isUsingMemoryDatabase() ? 'MongoDB en memoria (development)' : 'MongoDB Atlas'}`);

  if (!isProduction && env.autoSeed) {
    console.log(`[SEED] Sincronizando datos demo en ${isUsingMemoryDatabase() ? 'MongoDB en memoria' : 'MongoDB configurado'}...`);
    await seedDatabase({ logCredentials: false });
    console.log('[SEED] Datos demo listos');
  }

  const server = app.listen(env.port, () => {
    console.log(`[API] http://localhost:${env.port} (${env.nodeEnv})`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[FATAL] El puerto ${env.port} ya está en uso. Detén el backend anterior o cambia PORT en backend/.env.`);
    } else {
      console.error('[FATAL] Error del servidor HTTP:', error.message);
    }
    process.exit(1);
  });

  const shutdown = async (signal) => {
    console.log(`[${signal}] Cerrando servidor...`);
    server.closeAllConnections?.();
    server.closeIdleConnections?.();
    server.close(async () => {
      try {
        await disconnectDatabase();
      } finally {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('[FATAL] No se pudo iniciar la API:', error.message);
  process.exit(1);
});
