import mongoose from 'mongoose';
import { env, isProduction } from './env.js';

mongoose.set('strictQuery', true);

let memoryReplSet = null;

const createMemoryDatabase = async () => {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  memoryReplSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });
  return memoryReplSet.getUri('reservas_dev');
};

export const isUsingMemoryDatabase = () => Boolean(memoryReplSet);

export async function connectDatabase(uri = env.mongoUri) {
  let connectionUri = uri;

  if (!connectionUri) {
    if (isProduction) {
      throw new Error('MONGODB_URI no está definida o no es válida. Configura tu cadena de Atlas.');
    }
    connectionUri = await createMemoryDatabase();
  }

  await mongoose.connect(connectionUri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
    retryWrites: true
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryReplSet) {
    await memoryReplSet.stop();
    memoryReplSet = null;
  }
}
