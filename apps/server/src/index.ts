/** The API process: Fastify + tRPC + Better Auth. `src/worker.ts` is the scheduled-jobs process. */
import { MongoBackend } from '@agendajs/mongo-backend';
import { getContent } from '@irongate/content';
import { mongoose, nativeDb } from '@irongate/db';
import { APP_VERSION, buildApp } from './app';
import { createAuth } from './auth';
import { startDb } from './db';
import { loadDotEnv, loadEnv } from './env';
import { Agenda } from 'agenda';
import { agendaJourneyScheduler, setJourneyScheduler } from './jobs/scheduler';
import { flushSentry, initSentry } from './sentry';

loadDotEnv();
const env = loadEnv();
await initSentry(env, APP_VERSION);

const content = getContent();
const db = await startDb(env, (message) => console.log(message));
const auth = createAuth(env, nativeDb(), mongoose.connection.getClient());
// ADR 0025 §5: a non-processing Agenda client (no start()) that only schedules the tidy arrivals.
setJourneyScheduler(agendaJourneyScheduler(new Agenda({ backend: new MongoBackend({ mongo: nativeDb() }) })));
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
