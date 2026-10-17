import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export default async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then(async (connection) => {
      const db = connection.connection.db;
      if (db) {
        const [workspaceCollection] = await db
          .listCollections({ name: "workspaces" }, { nameOnly: true })
          .toArray();
        if (workspaceCollection) {
          const indexes = await db.collection("workspaces").listIndexes().toArray();
          for (const index of indexes) {
            if (index.expireAfterSeconds !== undefined && index.key.expiresAt === 1) {
              await db.collection("workspaces").dropIndex(index.name);
            }
          }
        }
      }
      return connection;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
