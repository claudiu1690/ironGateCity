import { isDuplicateKeyError, mongoose } from '@irongate/db';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';

/** Our own optimistic-lock miss: someone else moved the character first (ADR 0002). */
export class VersionConflict extends Error {
  override name = 'VersionConflict';
}

/** The City Day changed between settlement and the write (ADR 0005): settle again, then retry. */
export class DayChanged extends Error {
  override name = 'DayChanged';
}

/**
 * Slice 5 fix round (QA M1): the key of this request already has a row in `actionLogs`, `encounters`
 * or `requestLogs`, seen inside the transaction. The driver re-runs a transaction's callback after a
 * write conflict (TransientTransactionError) with a fresh snapshot; the copy that lost must then
 * answer with the winner's stored result instead of writing a second start. Thrown before any write.
 */
export class KeyTaken extends Error {
  override name = 'KeyTaken';
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

/**
 * Failures after which a concurrent request with the same idempotency key may have committed first
 * (QA M1): the key seen taken inside the transaction (slice-5 M1), our own version miss, a day
 * change, the unique-key insert (E11000), or a game-rule refusal computed against the winner's state.
 * Callers look up the stored result before retrying or refusing, so every copy of one tap gets the
 * same answer (ADR 0002 step 3, ADR 0008).
 */
export function mayHaveLostToSameKey(err: unknown): boolean {
  return (
    err instanceof KeyTaken ||
    err instanceof VersionConflict ||
    err instanceof DayChanged ||
    err instanceof GameError ||
    isDuplicateKeyError(err)
  );
}
