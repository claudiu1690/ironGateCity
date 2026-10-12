import { getContent } from '@irongate/content';
import { connectDb, disconnectDb, ensureIndexes, seed } from '@irongate/db';
import { isLoopbackUri } from './env';
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

  if (env.DB_MODE === 'memory' && env.MONGODB_URI && isLoopbackUri(env.MONGODB_URI)) {
    // Slice 3: an in-memory replica set already running on this machine (`pnpm db:mem`), shared by
    // `pnpm dev:mem`'s API, worker and the operator scripts. Loopback only: any other URI is
    // ignored in memory mode, so a server with the test hooks can never reach a real database.
    log(`Using the in-memory MongoDB replica set at ${env.MONGODB_URI} (DB_MODE=memory)`);
  } else if (env.DB_MODE === 'memory') {
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
  const migrated = await ensureIndexes();
  // Review 4 (tech design §14): migration 008's counts, step by step (all 0 once it has run).
  log(
    `Migration 008: ${Object.entries(migrated.review4)
      .map(([step, c]) => `${step} ${c.matched} matched / ${c.modified} modified`)
      .join(' · ')}`,
  );
  // The voting rework (tech design §6.2): migration 009's refunds (0 once it has run).
  const r = migrated.votingRework.refunds;
  log(`Migration 009: refunds ${r.matched} matched / ${r.modified} modified`);
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
