/**
 * The scheduled-jobs process (a second Railway/Fly service from the same image).
 *
 * Slice 3: the `city-day` job (ADR 0017) counts elections, closes nominations, divides councils and
 * applies the morale drift at 00:01 UTC, and once at start. The game stays correct without this
 * process: every request settles its home city's day first (the lazy path); the job spares the
 * first player of the day the wait and counts quiet cities. Lazy timers never need a job.
 *
 * Conventions for jobs: one job per real event, keyed by a natural id; every handler is a no-op if
 * the event's state document is already resolved (idempotent).
 */
import { MongoBackend } from '@agendajs/mongo-backend';
import { nativeDb } from '@irongate/db';
import { getContent } from '@irongate/content';
import { Agenda } from 'agenda';
import { APP_VERSION } from './app';
import { startDb } from './db';
import { loadDotEnv, loadEnv } from './env';
import { scheduleCityDay } from './jobs/cityDay';
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
await agenda.start();
await scheduleCityDay(agenda, getContent(), log);
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
