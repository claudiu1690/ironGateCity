import { randomBytes } from 'node:crypto';
import { isCheckedAction, isShiftAction, isTrainingAction } from '@irongate/content';
import type { GameContent, LocatedAction } from '@irongate/content';
import { ActionLog, Character, City } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import {
  addToTally,
  applyGains,
  applyPersuasion,
  createRng,
  dayKey,
  dayStart,
  jobPay,
  orderRewards,
  resolveShift,
  resolveTier1Action,
  resolveTraining,
  standingView,
} from '@irongate/rules';
import type { ActionDescriptor, ActionResult, GainsResult, Progress } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { buildActionResult } from './actionResult';
import type { ResultInput } from './actionResult';
import { ensureSettled, loadCharacter } from './dayService';
import { runKeyedAction, storedResult } from './keyedAction';
import { DayChanged, VersionConflict } from './txn';
import {
  energyState,
  fromOrdersState,
  sickDaysLeft,
  standingSuccesses,
  toOrdersState,
  wornStats,
} from './views';

export interface PerformInput {
  actionId: string;
  locationId: string;
  idempotencyKey: string;
  times: 1 | 3;
}

function locate(content: GameContent, input: PerformInput): LocatedAction {
  const found = content.action(input.actionId);
  if (!found || found.location.id !== input.locationId) {
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

export const progressOf = (c: CharacterDoc): Progress => ({
  xp: c.xp,
  level: c.level,
  fxp: c.fxp,
  rank: c.rank,
  pc: c.pc,
  statPointsPending: c.statPointsPending,
});

export const progressSet = (g: GainsResult) => ({
  xp: g.next.xp,
  level: g.next.level,
  fxp: g.next.fxp,
  rank: g.next.rank,
  pc: g.next.pc,
  statPointsPending: g.next.statPointsPending,
});

/**
 * Perform a tier-1 action ×1 or ×3 (ADR 0002, 0006): one transaction, one unique idempotency key,
 * one version guard, one seed. Checked actions also write the city's opinion (ADR 0010). A retried
 * key returns the stored result byte for byte; a new key is a new action.
 */
export async function performAction(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: PerformInput;
}): Promise<ActionResult> {
  const { user, content, input } = deps;
  const located = locate(content, input);
  const { action } = located;
  // §8.5, §13.1: training and job shifts have no batch.
  if (isShiftAction(action) && input.times !== 1) {
    throw gameError('BAD_REQUEST', 'SHIFT_IS_ONCE', { actionId: action.id });
  }
  if (isTrainingAction(action) && input.times !== 1) {
    throw gameError('BAD_REQUEST', 'TRAINING_IS_ONCE', { actionId: action.id });
  }
  const loaded = await loadCharacter(user, content, deps.now());
  const c0 = loaded.doc;
  if (located.city.id !== c0.cityId) {
    throw gameError('BAD_REQUEST', 'WRONG_CITY', { cityId: c0.cityId, actionCityId: located.city.id });
  }
  if (isCheckedAction(action) && action.requires) {
    const { level, standing } = action.requires;
    if (level !== undefined && c0.level < level) {
      throw gameError('PRECONDITION_FAILED', 'ACTION_LOCKED', { reason: 'LEVEL', need: level });
    }
    if (standing !== undefined && standingView(standingSuccesses(c0, located.city.id)).level < standing) {
      throw gameError('PRECONDITION_FAILED', 'ACTION_LOCKED', { reason: 'STANDING', need: standing });
    }
  }

  return runKeyedAction<ActionResult>({
    // A retry or a double tap with the same key returns the stored result.
    stored: () =>
      storedResult(
        c0._id,
        input.idempotencyKey,
        (log) => log.actionId === input.actionId && log.times === input.times,
      ),
    write: (session, txAttempts) =>
      resolveAndWrite({
        content,
        located,
        input,
        characterId: c0._id,
        now: deps.now(),
        session,
        editionReadAt: loaded.editionReadAt,
        txAttempts,
      }),
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
      loaded.editionReadAt = null;
    },
  });
}

async function resolveAndWrite(i: {
  content: GameContent;
  located: LocatedAction;
  input: PerformInput;
  characterId: Types.ObjectId;
  now: number;
  session: ClientSession;
  editionReadAt: number | null;
  txAttempts: () => number;
}): Promise<ActionResult> {
  const { content, located, input, now, session } = i;
  const { city, location, action } = located;
  const c = await Character.findById(i.characterId).session(session).lean<CharacterDoc>();
  if (!c) throw new Error(`character ${i.characterId.toHexString()} disappeared`);
  const today = dayKey(now);
  if (c.day.settled !== today) throw new DayChanged();

  const seed = randomBytes(16).toString('hex');
  const templates = content.ordersOf(c.factionId);
  const orders = toOrdersState(c.orders);
  const descriptor: ActionDescriptor = {
    kind: isCheckedAction(action) ? 'checked' : isTrainingAction(action) ? 'training' : 'shift',
    actionId: action.id,
    type: action.type,
    locationId: location.id,
    cityId: city.id,
  };

  const set: Record<string, unknown> = { lastActionAt: new Date(now) };
  let ironGain = 0;
  let result: DistributiveOmit<ResultInput, keyof CommonTail>;
  let cityWrite: (() => Promise<unknown>) | null = null;

  if (isCheckedAction(action)) {
    const successes = standingSuccesses(c, city.id);
    const r = resolveTier1Action(
      {
        action: {
          id: action.id,
          type: action.type,
          locationId: location.id,
          cityId: city.id,
          energy: action.energy,
          stats: action.stats,
          givesFxp: action.givesFxp,
          givesOpinion: action.givesOpinion,
        },
        cityRole: city.role,
        values: wornStats(c, content),
        energy: energyState(c),
        now,
        times: input.times,
        standing: { successes, names: content.standingNames, cityName: city.name },
        orders,
        orderTemplates: templates,
        homeCityId: c.homeCityId,
      },
      createRng(seed),
    );
    if (!r.ok) {
      throw new GameError('NOT_ENOUGH_ENERGY', {
        energy: r.energy.value,
        cost: r.cost,
        times: input.times,
        nextTickAt: r.energy.nextTickAt,
      });
    }
    const res = r.resolution;
    let opinion: { applied: number; shareBefore: number; shareAfter: number } | null = null;
    if (action.givesOpinion) {
      const state = await City.findById(city.id).session(session).lean();
      const shares = state?.opinion ?? city.baselineOpinion;
      const op = applyPersuasion(shares, {
        factionId: c.factionId,
        swing: res.rewards.opinion,
        homeFactionId: city.homeFactionId,
      });
      opinion = { applied: op.applied, shareBefore: shares[c.factionId], shareAfter: op.shares[c.factionId] };
      cityWrite = () =>
        City.updateOne({ _id: city.id }, { $set: { opinion: op.shares } }, { session, upsert: true });
    }
    const orderPay = orderRewards(res.orders.completed.length, res.orders.allDone);
    const gains = applyGains(progressOf(c), {
      xp: res.rewards.xp.total,
      fxp: res.rewards.fxp.total + orderPay.fxp,
      pc: orderPay.pc,
    });
    const others = c.localStanding.filter((s) => s.cityId !== city.id);
    set.localStanding = [...others, { cityId: city.id, successes: res.standing.after }];
    ironGain = res.rewards.iron.total;
    const tally = addToTally(c.today, today, {
      energy: res.energy.cost,
      attempts: res.times,
      successes: res.summary.successes,
      xp: res.rewards.xp.total,
      fxp: res.rewards.fxp.total + orderPay.fxp,
      iron: ironGain,
      pc: orderPay.pc,
      opinion: opinion?.applied ?? 0,
      ordersDone: res.orders.completed.length,
    });
    result = {
      kind: 'checked',
      resolution: res,
      opinion,
      energy: res.energy,
      gains,
      orders: res.orders,
      tally,
    };
  } else if (isTrainingAction(action)) {
    const r = resolveTraining({
      trains: action.trains,
      base: { str: c.stats.str, int: c.stats.int, agi: c.stats.agi },
      energy: energyState(c),
      now,
      orders,
      orderTemplates: templates,
      homeCityId: c.homeCityId,
      descriptor,
    });
    if (!r.ok) {
      throw new GameError('NOT_ENOUGH_ENERGY', {
        energy: r.energy.value,
        cost: r.cost,
        times: 1,
        nextTickAt: r.energy.nextTickAt,
      });
    }
    const res = r.resolution;
    const orderPay = orderRewards(res.orders.completed.length, res.orders.allDone);
    const gains = applyGains(progressOf(c), { xp: res.xp.total, fxp: orderPay.fxp, pc: orderPay.pc });
    set[`stats.${res.stat.stat}`] = res.stat.after;
    const tally = addToTally(c.today, today, {
      energy: res.energy.cost,
      xp: res.xp.total,
      fxp: orderPay.fxp,
      pc: orderPay.pc,
      ordersDone: res.orders.completed.length,
      statTrained: res.times,
    });
    result = { kind: 'training', resolution: res, energy: res.energy, gains, orders: res.orders, tally };
  } else {
    const job = c.job;
    if (!job || job.id !== action.jobId) {
      throw new GameError('NOT_YOUR_JOB', { jobId: job?.id ?? null, actionJobId: action.jobId });
    }
    const contentJob = content.job(job.id);
    if (!contentJob) throw new Error(`unknown job ${job.id}`);
    const r = resolveShift({
      job,
      today,
      pay: jobPay(contentJob, c.factionId),
      shiftEnergy: contentJob.shiftEnergy,
      energy: energyState(c),
      now,
      orders,
      orderTemplates: templates,
      homeCityId: c.homeCityId,
      descriptor,
    });
    if (!r.ok) {
      if (r.reason === 'SHIFT_ALREADY_WORKED') {
        throw new GameError('SHIFT_ALREADY_WORKED', { nextAt: dayStart(today + 1) });
      }
      throw new GameError('NOT_ENOUGH_ENERGY', {
        energy: r.energy.value,
        cost: r.cost,
        times: 1,
        nextTickAt: r.energy.nextTickAt,
      });
    }
    const res = r.resolution;
    const orderPay = orderRewards(res.orders.completed.length, res.orders.allDone);
    const gains = applyGains(progressOf(c), { xp: 0, fxp: orderPay.fxp, pc: orderPay.pc });
    set.job = res.job;
    ironGain = res.pay.total;
    const tally = addToTally(c.today, today, {
      energy: res.energy.cost,
      fxp: orderPay.fxp,
      iron: ironGain,
      pc: orderPay.pc,
      ordersDone: res.orders.completed.length,
      shiftWorked: true,
    });
    result = {
      kind: 'shift',
      resolution: res,
      sickDaysLeft: sickDaysLeft(c, today),
      nextShiftAt: dayStart(today + 1),
      energy: { ...res.energy, restedUsed: 0 },
      gains,
      orders: res.orders,
      tally,
    };
  }

  const { energy, gains, orders: ordersOut, tally } = result;
  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version, 'day.settled': today },
    {
      $set: {
        ...set,
        ...progressSet(gains),
        'energy.value': energy.after.value,
        'energy.updatedAt': new Date(energy.after.updatedAt),
        rested: energy.after.rested,
        orders: fromOrdersState(ordersOut.after),
        today: tally,
      },
      $inc: { iron: ironGain, version: 1 },
    },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  if (cityWrite) await cityWrite();

  const logId = new Types.ObjectId();
  const built = buildActionResult({
    ...result,
    content,
    logId: logId.toHexString(),
    idempotencyKey: input.idempotencyKey,
    seed,
    now,
    located,
    before: c,
    after: updated,
    editionReadAt: i.editionReadAt,
  });
  await ActionLog.create(
    [
      {
        _id: logId,
        characterId: c._id,
        idempotencyKey: input.idempotencyKey,
        actionId: action.id,
        locationId: location.id,
        cityId: city.id,
        kind: built.kind,
        times: input.times,
        txAttempts: i.txAttempts(),
        seed,
        outcome: built.stamp,
        result: built,
      },
    ],
    { session },
  );
  return built;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type CommonTail = Pick<
  ResultInput,
  'content' | 'logId' | 'idempotencyKey' | 'seed' | 'now' | 'located' | 'before' | 'after' | 'editionReadAt'
>;
