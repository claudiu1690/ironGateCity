import { ActionLog } from '@irongate/db';
import type { ActionLogDoc } from '@irongate/db';
import type { ClientSession, Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import { DayChanged, MAX_ATTEMPTS, VersionConflict, inTransaction, mayHaveLostToSameKey } from './txn';

/**
 * The stored result for a key (ADR 0002), or null. `sameInput` decides whether a stored row is this
 * request; a key reused for a different input is refused (KEY_REUSED).
 */
export async function storedResult<R>(
  characterId: Types.ObjectId,
  idempotencyKey: string,
  sameInput: (log: Pick<ActionLogDoc, 'actionId' | 'times' | 'result'>) => boolean,
): Promise<R | null> {
  const log = await ActionLog.findOne(
    { characterId, idempotencyKey },
    { result: 1, actionId: 1, times: 1 },
  ).lean();
  if (!log) return null;
  if (!sameInput(log)) throw gameError('CONFLICT', 'KEY_REUSED', { idempotencyKey });
  return log.result as R;
}

/**
 * A game action with an idempotency key (ADR 0002; ADR 0013 for chapters): the fast path for a
 * retry, then one transaction per try; after a version miss, a day change, E11000 or a refusal,
 * the winner's stored result for the same key if there is one (QA M1); bounded retries; one last
 * lookup before ACTION_CONFLICT. `write` resolves and writes inside the session.
 */
export async function runKeyedAction<R>(i: {
  stored: () => Promise<R | null>;
  write: (session: ClientSession, txAttempts: () => number) => Promise<R>;
  /** Called when the City Day changed mid-request; settles it before the retry. */
  resettle: () => Promise<void>;
}): Promise<R> {
  const existing = await i.stored();
  if (existing) return existing;

  let txAttempts = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await inTransaction(
        (session) => i.write(session, () => txAttempts),
        () => {
          txAttempts += 1;
        },
      );
    } catch (err) {
      // A concurrent request with the same key may have committed while this one was in flight:
      // then its stored result is the answer, not a refusal computed against its state (a retry
      // at the Energy limit) and not another attempt (ADR 0002 step 3).
      if (mayHaveLostToSameKey(err)) {
        const winner = await i.stored();
        if (winner) return winner;
      }
      if (err instanceof VersionConflict) continue;
      if (err instanceof DayChanged) {
        await i.resettle();
        continue;
      }
      if (err instanceof GameError) throw err.toTRPC();
      throw err;
    }
  }
  const winner = await i.stored();
  if (winner) return winner;
  throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: MAX_ATTEMPTS });
}
