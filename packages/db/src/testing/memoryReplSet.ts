import { MongoMemoryReplSet } from 'mongodb-memory-server';

/**
 * An in-memory single-node replica set (ADR 0004): transactions work, no Docker needed.
 * Used by Vitest global setups, `DB_MODE=memory` and `pnpm db:mem`. Dev/test only.
 */
export interface MemoryReplSet {
  /** Base URI, e.g. mongodb://127.0.0.1:61234/?replicaSet=rs0 */
  uri: string;
  stop(): Promise<void>;
}

export async function startMemoryReplSet(
  options: { port?: number; replSetName?: string } = {},
): Promise<MemoryReplSet> {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger', name: options.replSetName ?? 'rs0', ip: '127.0.0.1' },
    instanceOpts: options.port ? [{ port: options.port }] : undefined,
  });
  await replSet.waitUntilRunning();
  return {
    uri: replSet.getUri(),
    stop: async () => {
      await replSet.stop();
    },
  };
}

/** The same server with a different database name (one per test file keeps tests independent). */
export function withDbName(uri: string, dbName: string): string {
  const url = new URL(uri);
  url.pathname = `/${dbName}`;
  return url.toString();
}
