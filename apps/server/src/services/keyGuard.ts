import { createHmac, randomBytes } from 'node:crypto';
import { ActionLog, Encounter, EventSignup, RequestLog } from '@irongate/db';
import type { ClientSession, Types } from 'mongoose';
import { KeyTaken } from './txn';

/**
 * Slice 5 fix round (QA M1): every collection a keyed act can write its key to. A game action
 * lands in `actionLogs` (a final result) or `encounters` (a pending run-in); a request-keyed
 * mutation in `requestLogs`. Each is unique on `{ characterId, idempotencyKey }`, but no index sees
 * across them, so a keyed transaction looks in all three, in its own snapshot, before any write.
 * Slice 6 fix round (QA m1): and `eventSignups` (a call or a sign-up of a Campaign Event).
 */
export async function assertKeyFree(
  session: ClientSession,
  characterId: Types.ObjectId,
  idempotencyKey: string,
): Promise<void> {
  const q = { characterId, idempotencyKey };
  // One at a time: operations on one transaction's session must not run in parallel.
  if (await ActionLog.exists(q).session(session)) throw new KeyTaken();
  if (await Encounter.exists(q).session(session)) throw new KeyTaken();
  if (await RequestLog.exists(q).session(session)) throw new KeyTaken();
  if (await EventSignup.exists(q).session(session)) throw new KeyTaken();
}

/** Drawn once per process: a key's seed cannot be predicted from outside the server. */
const SEED_SALT = randomBytes(32);

/**
 * Slice 5 fix round (QA M1): the roll seed of a keyed act, derived from the character and the key
 * (HMAC with a per-process secret), so a re-run of the same request's transaction draws the same
 * rolls. The in-transaction key check is what makes a duplicate impossible; this only keeps a
 * re-run from changing branch on its own.
 */
export function keySeed(characterId: Types.ObjectId, idempotencyKey: string, salt = ''): string {
  return createHmac('sha256', SEED_SALT)
    .update(`${characterId.toHexString()}:${idempotencyKey}:${salt}`)
    .digest('hex')
    .slice(0, 32);
}
