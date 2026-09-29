import { mongoose } from '@irongate/db';
import type { ClientSession } from 'mongoose';

/** Our own optimistic-lock miss: someone else moved the character first (ADR 0002). */
export class VersionConflict extends Error {
  override name = 'VersionConflict';
}

/** The City Day changed between settlement and the write (ADR 0005): settle again, then retry. */
export class DayChanged extends Error {
  override name = 'DayChanged';
}

/** Bounded retries on our own conflicts (the driver retries transient transaction errors itself). */
export const MAX_ATTEMPTS = 3;

/**
 * One MongoDB transaction with the options every game write uses. `onRun` is called each time the
 * driver runs the callback (a TransientTransactionError runs it again), so callers can count it.
 */
export function inTransaction<T>(fn: (session: ClientSession) => Promise<T>, onRun?: () => void): Promise<T> {
  return mongoose.connection.transaction(
    async (session) => {
      onRun?.();
      return fn(session);
    },
    { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
  );
}
