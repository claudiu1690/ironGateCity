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
import { attachChat } from './chatSocket';
import { agendaEventScheduler, setEventScheduler } from './services/eventScheduler';

loadDotEnv();
const env = loadEnv();
await initSentry(env, APP_VERSION);

const content = getContent();
const db = await startDb(env, (message) => console.log(message));
const auth = createAuth(env, nativeDb(), mongoose.connection.getClient());
// ADR 0025 §5: a non-processing Agenda client (no start()) that only schedules the tidy arrivals.
const scheduling = new Agenda({ backend: new MongoBackend({ mongo: nativeDb() }) });
setJourneyScheduler(agendaJourneyScheduler(scheduling));
// Slice 6 (ADR 0037): the same client schedules `campaign-event-resolve` after a call.
setEventScheduler(agendaEventScheduler(scheduling));
const app = await buildApp({ env, auth, content });
// Slice 6 (ADR 0038): the chat socket, push only, on the API's own HTTP server.
const chat = attachChat(app.server, { auth, content, publicOrigin: env.PUBLIC_ORIGIN, log: (m) => app.log.warn(m) });

await app.listen({ port: env.PORT, host: env.HOST });

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info(`${signal} received, shutting down`);
  await chat.close();
  await app.close();
  await db.stop();
  await flushSentry();
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void shutdown(signal));
