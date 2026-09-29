import { getContent } from '@irongate/content';
import { connectDb, disconnectDb, ensureIndexes, seed } from '@irongate/db';
import type { Env } from './env';

export interface Database {
  uri: string;
  stop(): Promise<void>;
}

/**
 * Connect Mongoose per DB_MODE: `uri` uses MONGODB_URI (Docker, Atlas, `pnpm db:mem`); `memory`
 * starts an in-memory replica set in this process and seeds it (ADR 0004).
 */
export async function startDb(env: Env, log: (message: string) => void): Promise<Database> {
  let stopMemory: (() => Promise<void>) | undefined;
  let uri = env.MONGODB_URI;

  if (env.DB_MODE === 'memory') {
    // Dev/test only: never imported in `uri` mode, so production needs no mongodb-memory-server.
    const { startMemoryReplSet, withDbName } = await import('@irongate/db/testing');
    log('Starting an in-memory MongoDB replica set (DB_MODE=memory)…');
    const replSet = await startMemoryReplSet();
    stopMemory = replSet.stop;
    uri = withDbName(replSet.uri, 'irongate');
  }
  if (!uri) throw new Error('MONGODB_URI is required when DB_MODE=uri');

  // In development the database may still be booting (Docker healthcheck, `pnpm db:mem`).
  await connectDb(uri, { waitMs: env.NODE_ENV === 'production' ? 30_000 : 300_000, log });
  await ensureIndexes();
  // The seed is idempotent ($setOnInsert). Production runs `pnpm seed` once instead (tech design §12).
  if (env.DB_MODE === 'memory' || env.NODE_ENV !== 'production') await seed(getContent());

  return {
    uri,
    stop: async () => {
      await disconnectDb();
      await stopMemory?.();
    },
  };
}
