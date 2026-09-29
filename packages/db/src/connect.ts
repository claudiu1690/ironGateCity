import mongoose from 'mongoose';

export { mongoose };

export interface ConnectOptions {
  /** How long to keep retrying until a writable replica-set primary answers. Default 30 s. */
  waitMs?: number;
  log?: (message: string) => void;
}

class NotAReplicaSetError extends Error {
  override name = 'NotAReplicaSetError';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect the process-wide Mongoose connection and wait until the server is a writable
 * replica-set primary (transactions need one, ADR 0002). Retries while the database starts up
 * (Docker healthcheck initiating the set, `pnpm db:mem` still booting).
 */
export async function connectDb(uri: string, options: ConnectOptions = {}): Promise<typeof mongoose> {
  const deadline = Date.now() + (options.waitMs ?? 30_000);
  mongoose.set('strictQuery', true);
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000, autoIndex: false });
      const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
      if (!hello.setName) {
        throw new NotAReplicaSetError(
          'MongoDB is not running as a replica set; game actions need transactions. Use docker-compose.yml or `pnpm db:mem`.',
        );
      }
      if (!hello.isWritablePrimary) throw new Error('replica set has no writable primary yet');
      return mongoose;
    } catch (err) {
      await mongoose.disconnect().catch(() => undefined);
      if (err instanceof NotAReplicaSetError || Date.now() >= deadline) throw err;
      options.log?.(`Waiting for MongoDB (attempt ${attempt}): ${(err as Error).message}`);
      await sleep(1_000);
    }
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

/** The native driver database behind the Mongoose connection (for Better Auth's adapter and Agenda). */
export function nativeDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('connectDb() has not been called');
  return db;
}

export function isDbUp(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

/** E11000: a unique index rejected the write. */
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}
