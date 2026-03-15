/**
 * BullMQ Job Registry
 *
 * All background processing lives here.
 * - Cron queues are scheduled in scheduleRecurringJobs()
 * - Delayed (per-event) queues are exported for use by services
 * - All connections use plain { url } objects to avoid ioredis version conflicts
 */

import { Queue, Worker } from 'bullmq';

// ─── Connection factory ───────────────────────────────────────────────────────

function conn() {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set');
  return { url: process.env.REDIS_URL } as const;
}

// ─── Queue Definitions ────────────────────────────────────────────────────────
//
// Cron queues (scheduled below)
export const energyTickQueue       = new Queue('energy-tick',        { connection: conn() });
export const healthNeglectQueue    = new Queue('health-neglect',     { connection: conn() });
export const bodyguardUpkeepQueue  = new Queue('bodyguard-upkeep',   { connection: conn() });
export const jobAbsenceQueue       = new Queue('job-absence',        { connection: conn() });
export const influenceDecayQueue   = new Queue('influence-decay',    { connection: conn() });
export const weatherRotateQueue    = new Queue('weather-rotate',     { connection: conn() });
export const dossierStaleQueue     = new Queue('dossier-stale',      { connection: conn() });
export const criminalDecayQueue    = new Queue('criminal-decay',     { connection: conn() });
export const electionCheckQueue    = new Queue('election-check',     { connection: conn() });

// Delayed queues (scheduled per event by services)
export const electionConcludeQueue = new Queue('election-conclude',  { connection: conn() });
export const lawExpireQueue        = new Queue('law-expire',         { connection: conn() });
export const presidentTermQueue    = new Queue('president-term',     { connection: conn() });

// ─── Worker Registry ─────────────────────────────────────────────────────────

export function startWorkers(): void {
  // energy:tick — every 1 minute
  new Worker('energy-tick', async () => {
    const { runEnergyTick } = await import('./workers/energyTick.js');
    await runEnergyTick();
  }, { connection: conn(), concurrency: 1 });

  // health:neglect — every 10 minutes
  new Worker('health-neglect', async () => {
    const { runHealthNeglect } = await import('./workers/healthNeglect.js');
    await runHealthNeglect();
  }, { connection: conn(), concurrency: 1 });

  // bodyguard:upkeep — midnight UTC
  new Worker('bodyguard-upkeep', async () => {
    const { runBodyguardUpkeep } = await import('./workers/bodyguardUpkeep.js');
    await runBodyguardUpkeep();
  }, { connection: conn(), concurrency: 1 });

  // job:absence — midnight UTC
  new Worker('job-absence', async () => {
    const { runJobAbsence } = await import('./workers/jobAbsence.js');
    await runJobAbsence();
  }, { connection: conn(), concurrency: 1 });

  // influence:decay — 1am UTC
  new Worker('influence-decay', async () => {
    const { runInfluenceDecay } = await import('./workers/influenceDecay.js');
    await runInfluenceDecay();
  }, { connection: conn(), concurrency: 1 });

  // weather:rotate — 2am UTC
  new Worker('weather-rotate', async () => {
    const { runWeatherRotate } = await import('./workers/weatherRotate.js');
    await runWeatherRotate();
  }, { connection: conn(), concurrency: 1 });

  // dossier:stale — every hour
  new Worker('dossier-stale', async () => {
    const { runDossierStale } = await import('./workers/dossierStale.js');
    await runDossierStale();
  }, { connection: conn(), concurrency: 1 });

  // criminal:decay — midnight UTC
  new Worker('criminal-decay', async () => {
    const { runCriminalDecay } = await import('./workers/criminalDecay.js');
    await runCriminalDecay();
  }, { connection: conn(), concurrency: 1 });

  // election:check — every 15 minutes
  new Worker('election-check', async () => {
    const { runElectionCheck } = await import('./workers/electionCheck.js');
    await runElectionCheck();
  }, { connection: conn(), concurrency: 1 });

  // election:conclude — delayed per election (scheduled in electionCheck worker)
  new Worker('election-conclude', async (job) => {
    const { electionId } = job.data as { electionId: string };
    const { runElectionConclude } = await import('./workers/electionConclude.js');
    await runElectionConclude(electionId);
  }, { connection: conn(), concurrency: 1 });

  // law:expire — delayed per law (scheduled by politicsService on law activation)
  new Worker('law-expire', async (job) => {
    const { lawId } = job.data as { lawId: string };
    const { runLawExpire } = await import('./workers/lawExpire.js');
    await runLawExpire(lawId);
  }, { connection: conn(), concurrency: 1 });

  // president:term — delayed per president term (scheduled by electionConclude worker)
  new Worker('president-term', async (job) => {
    const { characterId } = job.data as { characterId: string };
    const { runPresidentTerm } = await import('./workers/presidentTerm.js');
    await runPresidentTerm(characterId);
  }, { connection: conn(), concurrency: 1 });

  console.log('[BullMQ] All 12 workers registered');
}

// ─── Cron Schedule Registration ───────────────────────────────────────────────
//
// BullMQ prevents duplicate repeatable jobs via jobId uniqueness.
// The 'upsert' behaviour is automatic — safe to call on every restart.

export async function scheduleRecurringJobs(): Promise<void> {
  // energy:tick — every minute
  await energyTickQueue.add('tick', {}, {
    repeat: { pattern: '* * * * *' },
    jobId: 'energy-tick-cron',
  });

  // health:neglect — every 10 minutes
  await healthNeglectQueue.add('neglect', {}, {
    repeat: { pattern: '*/10 * * * *' },
    jobId: 'health-neglect-cron',
  });

  // bodyguard:upkeep — midnight UTC
  await bodyguardUpkeepQueue.add('upkeep', {}, {
    repeat: { pattern: '0 0 * * *' },
    jobId: 'bodyguard-upkeep-cron',
  });

  // job:absence — midnight UTC
  await jobAbsenceQueue.add('absence', {}, {
    repeat: { pattern: '5 0 * * *' }, // 00:05 UTC to avoid midnight collision
    jobId: 'job-absence-cron',
  });

  // criminal:decay — midnight UTC
  await criminalDecayQueue.add('decay', {}, {
    repeat: { pattern: '10 0 * * *' }, // 00:10 UTC
    jobId: 'criminal-decay-cron',
  });

  // influence:decay — 1am UTC
  await influenceDecayQueue.add('decay', {}, {
    repeat: { pattern: '0 1 * * *' },
    jobId: 'influence-decay-cron',
  });

  // weather:rotate — 2am UTC
  await weatherRotateQueue.add('rotate', {}, {
    repeat: { pattern: '0 2 * * *' },
    jobId: 'weather-rotate-cron',
  });

  // dossier:stale — every hour at :00
  await dossierStaleQueue.add('stale', {}, {
    repeat: { pattern: '0 * * * *' },
    jobId: 'dossier-stale-cron',
  });

  // election:check — every 15 minutes
  await electionCheckQueue.add('check', {}, {
    repeat: { pattern: '*/15 * * * *' },
    jobId: 'election-check-cron',
  });

  console.log('[BullMQ] 9 recurring jobs scheduled');
}

// ─── Helpers for services to schedule per-event delayed jobs ─────────────────

/** Schedule law:expire job when a law is activated. */
export async function scheduleLawExpiry(lawId: string, expiresAt: Date): Promise<void> {
  const delay = Math.max(0, expiresAt.getTime() - Date.now());
  await lawExpireQueue.add('expire', { lawId }, {
    delay,
    jobId: `law-expire-${lawId}`,
  });
}

/** Schedule election:conclude job when an election is created. */
export async function scheduleElectionConclusion(
  electionId: string,
  votingEnds: Date,
): Promise<void> {
  const delay = Math.max(0, votingEnds.getTime() - Date.now());
  await electionConcludeQueue.add('conclude', { electionId }, {
    delay,
    jobId: `conclude-${electionId}`,
  });
}

/** Schedule president:term job when a president is inaugurated. */
export async function schedulePresidentTerm(
  characterId: string,
  termEnds: Date,
): Promise<void> {
  const delay = Math.max(0, termEnds.getTime() - Date.now());
  await presidentTermQueue.add('term-end', { characterId }, {
    delay,
    jobId: `term-${characterId}`,
  });
}
