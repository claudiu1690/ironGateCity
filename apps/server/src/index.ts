/** The API process: Fastify + tRPC + Better Auth. `src/worker.ts` is the scheduled-jobs process. */
import { getContent } from '@irongate/content';
import { mongoose, nativeDb } from '@irongate/db';
import { APP_VERSION, buildApp } from './app';
import { createAuth } from './auth';
import { startDb } from './db';
import { loadDotEnv, loadEnv } from './env';
import { flushSentry, initSentry } from './sentry';

loadDotEnv();
const env = loadEnv();
await initSentry(env, APP_VERSION);

const content = getContent();
const db = await startDb(env, (message) => console.log(message));
const auth = createAuth(env, nativeDb(), mongoose.connection.getClient());
const app = await buildApp({ env, auth, content });

await app.listen({ port: env.PORT, host: env.HOST });

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await db.stop();
  await flushSentry();
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void shutdown(signal));
