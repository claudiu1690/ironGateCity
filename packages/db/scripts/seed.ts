/**
 * `pnpm seed`: create collections and indexes and upsert the city state documents against
 * MONGODB_URI. Idempotent. Reads apps/server/.env when MONGODB_URI is not already set.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getContent } from '@irongate/content';
import { connectDb, disconnectDb, ensureIndexes, seed } from '../src';

const serverEnv = fileURLToPath(new URL('../../../apps/server/.env', import.meta.url));
if (!process.env.MONGODB_URI && existsSync(serverEnv)) process.loadEnvFile(serverEnv);

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set (set it, or create apps/server/.env from .env.example).');
  process.exit(1);
}

await connectDb(uri, { log: console.log });
await ensureIndexes();
const { inserted } = await seed(getContent());
console.log(`Seed done: ${inserted} city document(s) inserted, the rest already existed.`);
await disconnectDb();
