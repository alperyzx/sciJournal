import { MongoClient, Db } from 'mongodb';

const mongoUri = process.env.mongo_scram || process.env.MONGO_SCRAM || process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('Missing MongoDB connection string. Set mongo_scram in the environment.');
}

let cachedClientPromise: Promise<MongoClient> | null = null;

export async function getDb(): Promise<Db> {
  if (!cachedClientPromise) {
    const connectionString = mongoUri;
    if (!connectionString) {
      throw new Error('Missing MongoDB connection string. Set mongo_scram in the environment.');
    }

    const client = new MongoClient(connectionString, {
      maxPoolSize: 5,
      minPoolSize: 0,
    });
    cachedClientPromise = client.connect();
  }

  const client = await cachedClientPromise;
  return client.db();
}
