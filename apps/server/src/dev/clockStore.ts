import { isDbUp, nativeDb } from '@irongate/db';

/**
 * Review 6 leftovers: the shared test clock's offset, kept in the database so a restart of the API
 * (`pnpm dev:mem` reloads it on every saved file) never puts the clock back behind a day a character
 * was already settled on. Memory mode only: it is used inside the E2E_TEST_HOOKS guard in app.ts,
 * which env.ts allows only with DB_MODE=memory. Playwright starts a fresh in-memory database on every
 * run, so an offset never carries from one run to the next; `pnpm dev:mem` keeps its database (on
 * 127.0.0.1:27018) while the API restarts, so the offset survives the reload, and goes with it when
 * `pnpm db:mem` itself is stopped.
 *
 * One document in `dev_meta` (`_id: 'clock'`), written with `$max` so it only ever moves forward,
 * like the clock itself (QA n11).
 */
const COLLECTION = 'dev_meta';
const CLOCK_ID = 'clock';

interface ClockDoc {
  _id: string;
  offsetMs: number;
  updatedAt: Date;
}

/** The stored offset, or 0 (no document yet, or no database: the app's Vitest builds). */
export async function loadClockOffset(): Promise<number> {
  if (!isDbUp()) return 0;
  const doc = await nativeDb().collection<ClockDoc>(COLLECTION).findOne({ _id: CLOCK_ID });
  const ms = Number(doc?.offsetMs ?? 0);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

/** Keep `offsetMs` (forward only: a smaller value never replaces a larger one). */
export async function saveClockOffset(offsetMs: number): Promise<void> {
  if (!isDbUp()) return;
  await nativeDb()
    .collection<ClockDoc>(COLLECTION)
    .updateOne(
      { _id: CLOCK_ID },
      { $max: { offsetMs }, $set: { updatedAt: new Date() } },
      { upsert: true },
    );
}
