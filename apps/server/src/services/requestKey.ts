import { createHash } from 'node:crypto';
import { RequestLog, isDuplicateKeyError } from '@irongate/db';
import type { RequestKind } from '@irongate/db';
import type { ClientSession, Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import { DayChanged, MAX_ATTEMPTS, VersionConflict, inTransaction, mayHaveLostToSameKey } from './txn';

const hashInput = (input: unknown) => createHash('sha256').update(JSON.stringify(input)).digest('hex');

/**
 * ADR 0008: one idempotency key per tap for mutations that are not game actions. Fast path →
 * transaction (`fn` writes with the version guard, then the log row is inserted) → on E11000, a
 * version miss or a refusal, the winner's stored result if one exists (QA M1). A key reused with a
 * different kind or input is refused (KEY_REUSED).
 */
export async function withRequestKey<T>(i: {
  characterId: Types.ObjectId;
  idempotencyKey: string;
  kind: RequestKind;
  input: unknown;
  fn: (session: ClientSession) => Promise<T>;
  /** Called when the City Day changed mid-request; settles it before the retry. */
  resettle: () => Promise<void>;
}): Promise<T> {
  const inputHash = hashInput(input(i));
  const stored = async (): Promise<T | null> => {
    const log = await RequestLog.findOne({
      characterId: i.characterId,
      idempotencyKey: i.idempotencyKey,
    }).lean();
    if (!log) return null;
    if (log.kind !== i.kind || log.inputHash !== inputHash) {
      throw gameError('CONFLICT', 'KEY_REUSED', { idempotencyKey: i.idempotencyKey });
    }
    return log.result as T;
  };

  const existing = await stored();
  if (existing !== null) return existing;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await inTransaction(async (session) => {
        const result = await i.fn(session);
        await RequestLog.create(
          [{ characterId: i.characterId, idempotencyKey: i.idempotencyKey, kind: i.kind, inputHash, result }],
          { session },
        );
        return result;
      });
    } catch (err) {
      // A concurrent copy of this tap may have committed while this one was in flight: its stored
      // result is the answer, not a refusal computed against its state (QA M1).
      if (mayHaveLostToSameKey(err)) {
        const winner = await stored();
        if (winner !== null) return winner;
      }
      if (err instanceof VersionConflict) continue;
      // ADR 0018: a concurrent duplicate of a set-once act (a unique index) with no stored result:
      // retry, so the domain pre-check names the refusal instead of a 500.
      if (isDuplicateKeyError(err)) continue;
      if (err instanceof DayChanged) {
        await i.resettle();
        continue;
      }
      if (err instanceof GameError) throw err.toTRPC();
      throw err;
    }
  }
  const winner = await stored();
  if (winner !== null) return winner;
  throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: MAX_ATTEMPTS });
}

function input(i: { kind: RequestKind; input: unknown }) {
  return { kind: i.kind, input: i.input };
}
