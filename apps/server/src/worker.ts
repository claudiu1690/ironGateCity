/**
 * The scheduled-jobs process (a second Railway/Fly service from the same image).
 *
 * Slice 0 has no real events to schedule; this exists so the deploy shape is right from day 1.
 * Lazy timers (Energy, Rested, Heat, Health) never need a job.
 *
 * Conventions for future jobs (tech design §7), so slice 3 follows them:
 *  - one job per real event (a vote closing, a journey arriving, the day rolling over);
 *  - keyed by a natural id, with a unique index on { name, 'data.key' };
 *  - every handler is a no-op if the event's state document is already resolved (idempotent).
 */
import { MongoBackend } from '@agendajs/mongo-backend';
import { nativeDb } from '@irongate/db';
import { Agenda } from 'agenda';
import { APP_VERSION } from './app';
import { startDb } from './db';
import { loadDotEnv, loadEnv } from './env';
import { flushSentry, initSentry } from './sentry';

loadDotEnv();
const env = loadEnv();
await initSentry(env, APP_VERSION);

const log = (message: string) => console.log(`[worker] ${message}`);
const db = await startDb(env, log);

const agenda = new Agenda({
  backend: new MongoBackend({ mongo: nativeDb() }),
  processEvery: '30 seconds',
});
// No job definitions yet.
await agenda.start();
log(`started (version ${APP_VERSION}), polling every 30 seconds`);

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  log(`${signal} received, stopping`);
  await agenda.stop();
  await db.stop();
  await flushSentry();
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void shutdown(signal));
