import { randomBytes } from 'node:crypto';
import { isCheckedAction, isTrainingAction } from '@irongate/content';
import type { GameContent, LocatedAction } from '@irongate/content';
import { residenceCityId, residenceCtx } from './residence';
import { ActionLog, Character, City, Contribution, District, IssueModel, contributionId } from '@irongate/db';
import type { CharacterDoc, CityDoc, DistrictDoc, IssueDoc } from '@irongate/db';
import {
  addToTally,
  applyGains,
  applyPersuasion,
  createRng,
  dayKey,
  moraleState,
  orderRewards,
  resolveTier1Action,
  resolveTraining,
  standingView,
} from '@irongate/rules';
import { FACTION_IDS } from '@irongate/rules';
import type {
  ActionDescriptor,
  ActionResult,
  FactionId,
  GainsResult,
  OrderTemplate,
  Progress,
  Tier1Resolution,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { buildActionResult } from './actionResult';
import type { ResultInput } from './actionResult';
import { ensureSettled, loadCharacter } from './dayService';
import { runKeyedAction, storedResult } from './keyedAction';
import { addInfluence, addPoints, cycleKeyOf, writeLedger } from './ledger';
import { modifiersFor, restedCapToday } from './modifiers';
import { branchEndorseIfFiled } from './councilService';
import { DayChanged, VersionConflict } from './txn';
import {
  energyState,
  firstDayBonuses,
  fromOrdersState,
  preferredStat,
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
  // §8.5, §13.1: training has no batch.
  if (isTrainingAction(action) && input.times !== 1) {
    throw gameError('BAD_REQUEST', 'TRAINING_IS_ONCE', { actionId: action.id });
  }
  const loaded = await loadCharacter(user, content, deps.now());
  const c0 = loaded.doc;
  // Slice 4 (ADR 0025): on a train you act nowhere.
  if (c0.journey?.status === 'onTheWay') {
    throw gameError('PRECONDITION_FAILED', 'IN_TRANSIT', { arrivesAt: c0.journey.arrivesAt.getTime() });
  }
  if (located.city.id !== c0.cityId) {
    throw gameError('BAD_REQUEST', 'WRONG_CITY', { cityId: c0.cityId, actionCityId: located.city.id });
  }
  // Slice 4 (tech design §8.2): a faction's capital HQ is for its members.
  if (located.location.factionId && located.location.factionId !== c0.factionId) {
    throw gameError('PRECONDITION_FAILED', 'MEMBERS_ONLY', { factionId: located.location.factionId });
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
  // Slice 4: a board or an arrival may have committed since the request's checks.
  if (c.journey?.status === 'onTheWay') {
    throw new GameError('IN_TRANSIT', { arrivesAt: new Date(c.journey.arrivesAt).getTime() });
  }
  if (c.cityId !== city.id) {
    throw new GameError('WRONG_CITY', { cityId: c.cityId, actionCityId: city.id }, 'BAD_REQUEST');
  }

  const seed = randomBytes(16).toString('hex');
  const templates = content.ordersOf(c.factionId);
  const orders = toOrdersState(c.orders);
  const descriptor: ActionDescriptor = {
    kind: isCheckedAction(action) ? 'checked' : 'training',
    actionId: action.id,
    type: action.type,
    locationId: location.id,
    cityId: city.id,
    ...(location.quarterId ? { districtId: location.quarterId } : {}),
    locationKind: location.kind,
  };

  const set: Record<string, unknown> = { lastActionAt: new Date(now) };
  let ironGain = 0;
  let result: DistributiveOmit<ResultInput, keyof CommonTail>;
  let cityWrite: (() => Promise<unknown>) | null = null;
  let morale: ActionResult['effects']['morale'] = null;
  // Slice 3 (ADR 0021, 0022): the city's day-constant modifiers, read in the action's snapshot.
  // Slice 4 (ADR 0027, 0030): in the capital the district's meter, close race and comeback too.
  const cityState = await City.findById(city.id).session(session).lean<CityDoc>();
  const districtId = content.isDistricted(city.id) ? (location.quarterId ?? null) : null;
  const district = districtId
    ? await District.findById(districtId).session(session).lean<DistrictDoc>()
    : null;
  const modifiers = modifiersFor(content, cityState, c.factionId, today, { cityId: city.id, district });
  // ADR 0030 §5: the Rested cap is the residence city's (and the room's), wherever the action is.
  const residenceId = residenceCityId(c);
  const residenceCity =
    residenceId === city.id ? cityState : await City.findById(residenceId).session(session).lean<CityDoc>();
  const restedCap = restedCapToday(content, residenceCity, today, c.room);
  const placeId = districtId ?? city.id;
  const placeName = districtId ? (content.district(districtId)?.quarter.name ?? districtId) : city.name;
  const completedTemplates = (ids: string[]): OrderTemplate[] =>
    ids.flatMap((id) => templates.filter((t) => t.id === id));

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
          ...(location.quarterId ? { districtId: location.quarterId } : {}),
          locationKind: location.kind,
        },
        cityRole: city.role,
        values: wornStats(c, content),
        energy: energyState(c),
        now,
        times: input.times,
        standing: { successes, names: content.standingNames, cityName: city.name },
        orders,
        orderTemplates: templates,
        homeCityId: residenceCityId(c),
        residence: residenceCtx(c),
        factionId: c.factionId,
        modifiers,
        restedCap,
        // Review 1 (§8.4): the First day row at home on the welcome day; a best-stat tie-break.
        bonuses: firstDayBonuses(content, c, city.id, today),
        prefer: preferredStat(content, c.factionId),
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
    if (action.givesOpinion && district) {
      // ADR 0027: the district's meter (no home floor in a battleground; no morale).
      const shares = district.opinion;
      const op = applyPersuasion(shares, { factionId: c.factionId, swing: res.rewards.opinion });
      opinion = { applied: op.applied, shareBefore: shares[c.factionId], shareAfter: op.shares[c.factionId] };
      cityWrite = () =>
        District.updateOne({ _id: district._id }, { $set: { opinion: op.shares } }, { session });
    } else if (action.givesOpinion) {
      const shares = cityState?.opinion ?? city.baselineOpinion;
      const op = applyPersuasion(shares, {
        factionId: c.factionId,
        swing: res.rewards.opinion,
        homeFactionId: city.homeFactionId,
      });
      opinion = { applied: op.applied, shareBefore: shares[c.factionId], shareAfter: op.shares[c.factionId] };
      // ADR 0022: a threshold crossed by this action writes the morale record and a knock-on line.
      const home = city.homeFactionId;
      const before = home ? moraleState(shares[home]) : null;
      const after = home ? moraleState(op.shares[home]) : null;
      const record =
        home && before !== after
          ? { state: after, since: today, previous: cityState?.morale?.state ?? before }
          : null;
      if (record && before && after) morale = { cityId: city.id, cityName: city.name, before, after };
      cityWrite = () =>
        City.updateOne(
          { _id: city.id },
          { $set: { opinion: op.shares, ...(record ? { morale: record } : {}) } },
          { session, upsert: true },
        );
    }
    const orderPay = orderRewards(completedTemplates(res.orders.completed), res.orders.allDone);
    const gains = applyGains(progressOf(c), {
      xp: res.rewards.xp.total,
      fxp: res.rewards.fxp.total + orderPay.fxp,
      pc: orderPay.pc,
    });
    const others = c.localStanding.filter((x) => x.cityId !== city.id);
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
  } else {
    const r = resolveTraining({
      trains: action.trains,
      base: { str: c.stats.str, int: c.stats.int, agi: c.stats.agi },
      energy: energyState(c),
      now,
      orders,
      orderTemplates: templates,
      homeCityId: residenceCityId(c),
      residence: residenceCtx(c),
      descriptor,
      modifiers,
      restedCap,
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
    const orderPay = orderRewards(completedTemplates(res.orders.completed), res.orders.allDone);
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
  // Slice 4 (ADR 0028, 0029): the ledger row, the influence total, the Issues' momentum.
  const placeEffects =
    result.kind === 'checked'
      ? await placeWrites(content, session, {
          c: updated,
          cityId: city.id,
          placeId,
          placeName,
          opinion: result.opinion,
          givesOpinion: isCheckedAction(action) && action.givesOpinion,
          resolution: result.resolution,
          logId: logId.toHexString(),
          today,
          at: new Date(now),
        })
      : null;
  // Slice 3 (design §6.3): the third order done on a nominations day → the branch endorses.
  const branchEndorsement = result.orders.allDone
    ? await branchEndorseIfFiled(content, session, updated, today, now)
    : null;

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
    modifiers,
    city: residenceCity,
    restedCap,
    place: { placeId, placeName },
    morale,
    branchEndorsement,
    issues: placeEffects?.issues ?? [],
    scoreboard: placeEffects?.scoreboard ?? null,
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

/** The faction with the most momentum (null on a tie at the top or with none), for the knock-on line. */
export function leaderOf(m: Record<FactionId, number>): FactionId | null {
  const best = Math.max(...FACTION_IDS.map((f) => m[f] ?? 0));
  if (best <= 0) return null;
  const top = FACTION_IDS.filter((f) => (m[f] ?? 0) === best);
  return top.length === 1 ? top[0]! : null;
}

/**
 * Slice 4: what an opinion-moving or Issue-tagged action writes besides the character and the
 * meter, in the same transaction: the ledger row and the influence total (ADR 0028), and each tagged
 * Issue's momentum with the points total (ADR 0029). The momentum `$inc` is guarded by
 * `status: 'live'`: a miss means the week resolved under the action, which retries on the new day.
 */
async function placeWrites(
  content: GameContent,
  session: ClientSession,
  i: {
    c: CharacterDoc;
    cityId: string;
    placeId: string;
    placeName: string;
    opinion: { applied: number } | null;
    givesOpinion: boolean;
    resolution: Tier1Resolution;
    logId: string;
    today: number;
    at: Date;
  },
): Promise<{
  issues: NonNullable<ActionResult['effects']['issues']>;
  scoreboard: ActionResult['effects']['scoreboard'];
}> {
  const who = { _id: i.c._id, name: i.c.name, factionId: i.c.factionId, level: i.c.level };
  if (i.opinion && i.opinion.applied > 0) {
    await writeLedger(
      content,
      [
        {
          cityId: i.cityId,
          placeId: i.placeId,
          factionId: i.c.factionId,
          swing: i.opinion.applied,
          kind: 'action',
          characterId: i.c._id,
          ref: i.logId,
          day: i.today,
          at: i.at,
        },
      ],
      session,
    );
    await addInfluence(content, session, {
      c: who,
      cityId: i.cityId,
      placeId: i.placeId,
      points: i.opinion.applied,
      day: i.today,
      at: i.at,
    });
  }
  const issues: NonNullable<ActionResult['effects']['issues']> = [];
  const f = i.c.factionId;
  for (const t of i.resolution.issues ?? []) {
    const doc =
      t.points > 0
        ? await IssueModel.findOneAndUpdate(
            { _id: t.docId, status: 'live' },
            { $inc: { [`momentum.${f}`]: t.points } },
            { session, returnDocument: 'after', lean: true },
          )
        : await IssueModel.findOne({ _id: t.docId, status: 'live' }).session(session).lean<IssueDoc>();
    if (!doc) throw new DayChanged();
    await addPoints(session, {
      c: who,
      cityId: i.cityId,
      placeId: doc.districtId ?? i.cityId,
      docId: t.docId,
      points: t.points,
      at: i.at,
    });
    issues.push({
      issueId: t.issueId,
      name: t.name,
      factionId: f,
      added: t.points,
      totals: { ...doc.momentum },
      leader: leaderOf(doc.momentum),
    });
  }
  let scoreboard: ActionResult['effects']['scoreboard'] = null;
  if (i.givesOpinion) {
    const scope = `influence|${cycleKeyOf(content, i.cityId, i.placeId, i.today)}`;
    const mine = await Contribution.findById(contributionId(scope, i.c._id)).session(session).lean();
    if (mine && mine.amount > 0) {
      const higher = await Contribution.countDocuments({
        scope,
        $or: [{ amount: { $gt: mine.amount } }, { amount: mine.amount, lastAt: { $lt: mine.lastAt } }],
      }).session(session);
      const of = await Contribution.countDocuments({ scope }).session(session);
      scoreboard = { placeName: i.placeName, swing: mine.amount / 1_000, rank: higher + 1, of };
    }
  }
  return { issues, scoreboard };
}
