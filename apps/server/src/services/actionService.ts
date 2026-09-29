import { randomBytes } from 'node:crypto';
import type { GameContent, LocatedAction } from '@irongate/content';
import { ActionLog, Character, isDuplicateKeyError, mongoose } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { createRng, resolveTier1Action } from '@irongate/rules';
import type { ActionResult } from '@irongate/rules';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { buildActionResult } from './actionResult';
import { getOrCreateCharacter, wornStats } from './characterService';

export interface PerformInput {
  actionId: string;
  locationId: string;
  idempotencyKey: string;
  times: 1;
}

/** Our own optimistic-lock miss: someone else moved the character first. */
class VersionConflict extends Error {
  override name = 'VersionConflict';
}

const MAX_ATTEMPTS = 3;

function locate(content: GameContent, input: PerformInput): LocatedAction {
  const found = content.action(input.actionId);
  if (!found) {
    if (!content.location(input.locationId)) {
      throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId: input.locationId });
    }
    throw gameError('NOT_FOUND', 'UNKNOWN_ACTION', { actionId: input.actionId });
  }
  if (found.location.id !== input.locationId) {
    if (!content.location(input.locationId)) {
      throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId: input.locationId });
    }
    throw gameError('NOT_FOUND', 'UNKNOWN_ACTION', {
      actionId: input.actionId,
      locationId: input.locationId,
    });
  }
  return found;
}

async function storedResult(
  characterId: Types.ObjectId,
  idempotencyKey: string,
): Promise<ActionResult | null> {
  const log = await ActionLog.findOne({ characterId, idempotencyKey }, { result: 1 }).lean();
  return log?.result ?? null;
}

/**
 * Perform a tier-1 action (ADR 0002): one transaction, one unique idempotency key, one version
 * guard. A retried key returns the stored result byte for byte; a new key is a new action.
 */
export async function performAction(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: PerformInput;
}): Promise<ActionResult> {
  const { user, content, input } = deps;
  const located = locate(content, input);
  const character = await getOrCreateCharacter(user, content, deps.now());
  if (located.city.id !== character.cityId) {
    throw gameError('BAD_REQUEST', 'WRONG_CITY', { cityId: character.cityId, actionCityId: located.city.id });
  }

  // Fast path: a retry or a double tap with the same key.
  const existing = await storedResult(character._id, input.idempotencyKey);
  if (existing) return existing;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await mongoose.connection.transaction(
        async (session) => {
          const c = await Character.findById(character._id).session(session).lean<CharacterDoc>();
          if (!c) throw new Error(`character ${character._id.toHexString()} disappeared`);

          const seed = randomBytes(16).toString('hex');
          const now = deps.now();
          const r = resolveTier1Action(
            {
              action: located.action,
              cityRole: located.city.role,
              stats: wornStats(c),
              energy: { value: c.energy.value, rested: c.rested, updatedAt: c.energy.updatedAt.getTime() },
              now,
              times: input.times,
            },
            createRng(seed),
          );
          if (!r.ok) {
            throw new GameError('NOT_ENOUGH_ENERGY', {
              energy: r.energy.value,
              cost: located.action.energy,
              nextTickAt: r.energy.nextTickAt,
            });
          }

          const { after } = r.resolution.energy;
          const { rewards } = r.resolution;
          const updated = await Character.findOneAndUpdate(
            { _id: c._id, version: c.version },
            {
              $set: {
                'energy.value': after.value,
                'energy.updatedAt': new Date(after.updatedAt),
                rested: after.rested,
              },
              $inc: { xp: rewards.xp.total, fxp: rewards.fxp.total, iron: rewards.iron.total, version: 1 },
            },
            { session, returnDocument: 'after', lean: true },
          );
          if (!updated) throw new VersionConflict();

          const logId = new Types.ObjectId();
          const result = buildActionResult({
            content,
            logId: logId.toHexString(),
            idempotencyKey: input.idempotencyKey,
            now,
            located,
            resolution: r.resolution,
            before: c,
            after: updated,
          });
          await ActionLog.create(
            [
              {
                _id: logId,
                characterId: c._id,
                idempotencyKey: input.idempotencyKey,
                actionId: located.action.id,
                locationId: located.location.id,
                cityId: located.city.id,
                seed,
                outcome: r.resolution.outcome,
                result,
              },
            ],
            { session },
          );
          return result;
        },
        { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
      );
    } catch (err) {
      if (err instanceof VersionConflict) continue;
      if (isDuplicateKeyError(err)) {
        // A concurrent request with the same key won: show its result.
        const winner = await storedResult(character._id, input.idempotencyKey);
        if (winner) return winner;
      }
      if (err instanceof GameError) throw gameError('PRECONDITION_FAILED', err.reason, err.data);
      throw err;
    }
  }
  throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: MAX_ATTEMPTS });
}
