import { MongoClient, Db } from 'mongodb';

let cachedClientPromise: Promise<MongoClient> | null = null;

export async function getDb(): Promise<Db> {
  const mongoUri =
    process.env.mongo_scram ||
    process.env.MONGO_SCRAM ||
    process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'Missing MongoDB connection string. Set mongo_scram in the environment.'
    );
  }

  if (!cachedClientPromise) {
    const client = new MongoClient(mongoUri, {
      maxPoolSize: 5,
      minPoolSize: 0,
    });
    cachedClientPromise = client.connect();
  }

  const client = await cachedClientPromise;
  return client.db();
}
