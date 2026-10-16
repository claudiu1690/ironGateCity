import { isCheckedAction, isTrainingAction, isWelcomeAction } from '@irongate/content';
import type { CheckedAction, GameContent, LocatedAction } from '@irongate/content';
import { residenceCityId, residenceCtx } from './residence';
import { ActionLog, Character, Encounter } from '@irongate/db';
import type { CharacterDoc, EncounterDoc } from '@irongate/db';
import {
  addToTally,
  applyGains,
  barredByRecord,
  createRng,
  dayKey,
  heatState,
  orderRewards,
  pickOpponent,
  projectHeat,
  resolveTier1Action,
  resolveTraining,
  runInChance,
  runInPcts,
  standingView,
} from '@irongate/rules';
import { lawModifiers } from './lawBook';
import type {
  ActionDescriptor,
  ActionResult,
  GainsResult,
  OrderTemplate,
  Progress,
  ResolveResult,
  RunInPending,
  StreetView,
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
import { keySeed } from './keyGuard';
import { placeDescriptor, recordPushInTx } from './chairDeskService';
import { ordersTargetOf } from './pushTarget';
import { branchBackIfStanding } from './councilService';
import { moveOpinion, placeWrites, readPlace } from './place';
import type { OpinionMove, PlaceCtx } from './place';
import { policeIdOf } from './missionService';
import { assertFree, flagsToday, heatRateOn, heatTimerOf, isRivalGround, notFree, recordLevelOf } from './risk';
import { pendingView, startRunInInTx, storedEncounterResult } from './streetService';
import type { HeldAction } from './streetService';
import { nightAt } from './night';
import { streetHooks } from './streetHooks';
import type { StreetForce } from './streetHooks';
import { closeArrivalInTx } from './travelService';
import { DayChanged, VersionConflict } from './txn';
import {
  placeOpenFor,
  energyState,
  firstDayBonuses,
  fromOrdersState,
  preferredStat,
  standingSuccesses,
  toOrdersState,
  welcomeOffered,
  wornStats,
} from './views';

export { leaderOf } from './place';

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
 * Slice 5 (tech design §8.2): an arrived journey in this city is closed by the first act there (its
 * unanswered card's ignore effects apply, ADR 0034), inside the act's transaction.
 */
export const closeArrivalHere = (content: GameContent, session: ClientSession, c: CharacterDoc, now: number) =>
  closeArrivalInTx(content, session, c, now);

/**
 * Perform a tier-1 action ×1 or ×3 (ADR 0002, 0006): one transaction, one unique idempotency key,
 * one version guard, one seed. Checked actions also write the city's opinion (ADR 0010). A retried
 * key returns the stored result byte for byte; a new key is a new action. Slice 5: refused while
 * held or with a run-in waiting, ×1 only on rival ground, and barred to a Notorious record at a court,
 * a university or an Alliance HQ.
 */
export async function performAction(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: PerformInput;
}): Promise<ActionResult | RunInPending> {
  const { user, content, input } = deps;
  const located = locate(content, input);
  const { action } = located;
  // §8.5, §13.1: training has no batch.
  if (isTrainingAction(action) && input.times !== 1) {
    throw gameError('BAD_REQUEST', 'TRAINING_IS_ONCE', { actionId: action.id });
  }
  // Review 4 (ADR 0073): the favour from the platform is once only (its order is checked in the
  // transaction, below).
  if (isWelcomeAction(action) && input.times !== 1) {
    throw gameError('BAD_REQUEST', 'ONCE_ONLY', { actionId: action.id });
  }
  const loaded = await loadCharacter(user, content, deps.now());
  const c0 = loaded.doc;
  // A retry or a double tap with the same key returns the stored result (slice 5: or the run-in it
  // started, pending or resolved).
  const stored = async (): Promise<ActionResult | RunInPending | null> => {
    const log = await storedResult<ActionResult>(
      c0._id,
      input.idempotencyKey,
      (l) => l.actionId === input.actionId && l.times === input.times,
    );
    if (log) return log;
    const enc = await Encounter.findOne({ characterId: c0._id, idempotencyKey: input.idempotencyKey }).lean<EncounterDoc>();
    if (!enc) return null;
    if (enc.refId !== input.actionId) throw gameError('CONFLICT', 'KEY_REUSED', { idempotencyKey: input.idempotencyKey });
    if (enc.state === 'resolved') return storedEncounterResult(enc);
    const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
    return fresh ? pendingView(content, enc, fresh, deps.now(), loaded.city) : null;
  };
  // Slice 5 (tech design §7.2): not in the cells, on the ward or with a run-in waiting; a retry of
  // the tap that led there still gets its stored result.
  if (notFree(c0)) {
    const prior = await stored();
    if (prior) return prior;
    assertFree(c0);
  }
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
  const refusal = slice5Refusal(content, c0, located, input.times, deps.now());
  if (refusal) throw refusal.toTRPC();
  // Slice 5 (tech design §8.5): the test hooks' forced rolls for the next act on rival ground.
  // Review 5 (tech design §4.3): at home a checked tap takes only the rows' rolls.
  const force = !isCheckedAction(action)
    ? null
    : isRivalGround(content, c0, located.city.id)
      ? streetHooks.take(c0._id.toHexString(), input.idempotencyKey)
      : streetHooks.takeRolls(c0._id.toHexString(), input.idempotencyKey);

  return runKeyedAction<ActionResult | RunInPending>({
    key: { characterId: c0._id, idempotencyKey: input.idempotencyKey },
    stored,
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
        force,
      }),
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
      loaded.editionReadAt = null;
    },
  });
}

/**
 * Slice 5 (tech design §7.2): `RECORD_BARRED` and `ONCE_ON_RIVAL_GROUND`, before the key and in the
 * transaction. Review 4 (tech design §3.2, ADR 0076): a place the character cannot open (a locked
 * quarter's, or a later edition's) is refused whatever the client sends: `ACTION_LOCKED` with
 * `lock: 'QUARTER'` and the Level, or `'EDITION'`.
 */
function slice5Refusal(
  content: GameContent,
  c: CharacterDoc,
  located: LocatedAction,
  times: number,
  now: number,
): GameError | null {
  const { location, city } = located;
  const open = placeOpenFor(content, c, location);
  if (!open.open && open.lock) {
    return new GameError(
      'ACTION_LOCKED',
      // `reason` is the error's own key in `error.data.game`, so the lock travels as `lock` (as
      // MISSION_LOCKED's does).
      open.lock.kind === 'level' ? { lock: 'QUARTER', need: open.lock.level } : { lock: 'EDITION', need: 0 },
    );
  }
  // Design §7.3 (T12's ticket rule): every ticket at a barred place, training included.
  if (
    barredByRecord(recordLevelOf(c, dayKey(now)), {
      kind: location.kind,
      ...(location.factionId ? { factionId: location.factionId } : {}),
    })
  ) {
    return new GameError('RECORD_BARRED', { locationId: location.id });
  }
  if (times > 1 && isRivalGround(content, c, city.id)) {
    return new GameError('ONCE_ON_RIVAL_GROUND', { cityId: city.id });
  }
  return null;
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
  force: StreetForce | null;
}): Promise<ActionResult | RunInPending> {
  const { content, located, input, now, session } = i;
  const { city, action } = located;
  let c = await Character.findById(i.characterId).session(session).lean<CharacterDoc>();
  if (!c) throw new Error(`character ${i.characterId.toHexString()} disappeared`);
  const today = dayKey(now);
  if (c.day.settled !== today) throw new DayChanged();
  const blocked = notFree(c);
  if (blocked) throw blocked;
  // Slice 4: a board or an arrival may have committed since the request's checks.
  if (c.journey?.status === 'onTheWay') {
    throw new GameError('IN_TRANSIT', { arrivesAt: new Date(c.journey.arrivesAt).getTime() });
  }
  if (c.cityId !== city.id) {
    throw new GameError('WRONG_CITY', { cityId: c.cityId, actionCityId: city.id }, 'BAD_REQUEST');
  }
  const refusal = slice5Refusal(content, c, located, input.times, now);
  if (refusal) throw refusal;
  // Review 4 (ADR 0073): a welcome ticket only while its welcome order is open today, read on the
  // transaction's character, so two taps under two keys cannot both pay (the loser re-reads a done
  // order). Checked here only, so a retry of the winning key still finds its stored result.
  if (!welcomeOffered(content, c, located.action, today)) {
    throw new GameError('NOT_OFFERED', { actionId: located.action.id });
  }
  // Slice 5 (tech design §8.2): the first act in a city closes its arrived journey.
  c = await closeArrivalHere(content, session, c, now);

  // QA M1: one seed per key, so a re-run of this transaction draws the same rolls.
  const seed = keySeed(c._id, input.idempotencyKey);
  // Slice 3–5: the place's modifiers, read in the action's snapshot (rival ground among them).
  const ctx = await readPlace(content, session, c, located, today);

  if (isCheckedAction(action)) {
    const r = computeTier1({
      content,
      c,
      located,
      action,
      ctx,
      times: input.times,
      now,
      seed,
      ...(i.force?.checkRoll !== undefined ? { forceRoll: i.force.checkRoll } : {}),
      ...(i.force?.rolls ? { forceRolls: i.force.rolls } : {}),
    });
    if (!r.ok) {
      if (r.reason === 'ONCE_ON_RIVAL_GROUND') throw new GameError('ONCE_ON_RIVAL_GROUND', { cityId: city.id });
      throw new GameError('NOT_ENOUGH_ENERGY', {
        energy: r.energy.value,
        cost: r.cost,
        times: input.times,
        nextTickAt: r.energy.nextTickAt,
      });
    }
    // Slice 5 (design §10.5, §23.1 #2, #10, #11): on rival ground every checked tap can bring a run-in
    // (15 flat, the city's pool, the police from Noticed); training never does.
    if (ctx.rival) {
      const pending = await rivalRunIn({ content, session, c, located, action, ctx, now, seed, input, res: r.resolution, force: i.force });
      if (pending) return pending;
    }
    return writeTier1({
      content,
      session,
      located,
      c,
      ctx,
      resolution: r.resolution,
      seed,
      now,
      idempotencyKey: input.idempotencyKey,
      editionReadAt: i.editionReadAt,
      txAttempts: i.txAttempts,
    });
  }
  return writeTraining({ ...i, c, ctx, seed });
}

/**
 * Slice 5 (design §10.5): roll a rival tap's run-in (the `:runIn` stream). When it fires, hold the
 * resolution and its Partial twin (the same rolls) in a pending encounter, write the Energy, and
 * return the modal's state; null when the street stays quiet.
 */
async function rivalRunIn(i: {
  content: GameContent;
  session: ClientSession;
  c: CharacterDoc;
  located: LocatedAction;
  action: CheckedAction;
  ctx: PlaceCtx;
  now: number;
  seed: string;
  input: PerformInput;
  res: Tier1Resolution;
  force: StreetForce | null;
}): Promise<RunInPending | null> {
  const { content, c, ctx, now } = i;
  const today = ctx.today;
  const heat = projectHeat(heatTimerOf(c), now, heatRateOn(content, ctx.residenceCity, c.factionId));
  const state = heatState(heat.value);
  // Review 5 (ADR 0080): the night at the act (the tier-1 base 25, the police half the pool).
  const night = nightAt(now).night;
  const chance = runInChance({
    base: 0,
    tier: 1,
    rivalGround: true,
    heatState: state,
    record: recordLevelOf(c, today),
    flags: flagsToday(c, ctx.city.id, today),
    night,
    // Slice 7 (ADR 0044): the laws' run-in percentages (the Curfew at night).
    pcts: runInPcts(lawModifiers(content, today, c.factionId), night),
  });
  const street = createRng(`${i.seed}:runIn`);
  const roll = street.roll100();
  const fires = i.force?.runIn === 'next' ? true : i.force?.runIn === 'never' ? false : roll <= chance;
  if (!fires) return null;
  const opponentId =
    i.force?.opponentId ??
    pickOpponent({
      pool: content.runInPoolOf(ctx.city.id),
      actor: c.factionId,
      heatState: state,
      sideOf: (id) => content.opponent(id)?.side ?? 'police',
      policeId: policeIdOf(content),
      rng: street,
      night,
      rivalGround: true,
    });
  const twin = computeTier1({
    content,
    c,
    located: i.located,
    action: i.action,
    ctx,
    times: 1,
    now,
    seed: i.seed,
    forceOutcome: 'partial',
    ...(i.force?.checkRoll !== undefined ? { forceRoll: i.force.checkRoll } : {}),
    ...(i.force?.rolls ? { forceRolls: i.force.rolls } : {}),
  });
  if (!twin.ok) throw new Error('the dropped twin cannot fail where the tap did not');
  const held: HeldAction = {
    kind: 'action',
    actionId: i.action.id,
    rolled: i.res,
    dropped: twin.resolution,
    force: i.force?.choiceRoll !== undefined ? { choiceRoll: i.force.choiceRoll } : null,
  };
  return startRunInInTx(content, i.session, {
    c,
    ctx,
    kind: 'action',
    refId: i.action.id,
    refName: i.action.name,
    idempotencyKey: i.input.idempotencyKey,
    seed: i.seed,
    opponentId,
    tier: 1,
    held,
    now,
    set: {
      'energy.value': i.res.energy.after.value,
      'energy.updatedAt': new Date(i.res.energy.after.updatedAt),
      rested: i.res.energy.after.rested,
    },
  });
}

/** The pure half of a tier-1 checked action (T13 split): the resolution against the place. */
export function computeTier1(i: {
  content: GameContent;
  c: CharacterDoc;
  located: LocatedAction;
  action: CheckedAction;
  ctx: PlaceCtx;
  times: 1 | 3;
  now: number;
  seed: string;
  /** Slice 5: the dropped twin of a rival tap (ADR 0032 §1); a test hook's first roll. */
  forceOutcome?: 'partial';
  forceRoll?: number;
  forceRolls?: readonly number[];
}): ResolveResult {
  const { content, c, located, action, ctx } = i;
  const { city, location } = located;
  return resolveTier1Action(
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
      now: i.now,
      times: i.times,
      standing: { successes: standingSuccesses(c, city.id), names: content.standingNames, cityName: city.name },
      orders: toOrdersState(c.orders),
      orderTemplates: content.ordersOf(c.factionId),
      homeCityId: residenceCityId(c),
      residence: residenceCtx(c),
      factionId: c.factionId,
      modifiers: ctx.modifiers,
      restedCap: ctx.restedCap,
      // Review 1 (§8.4): the First day row at home on the welcome day; a best-stat tie-break.
      bonuses: firstDayBonuses(content, c, city.id, ctx.today),
      prefer: preferredStat(content, c.factionId),
      ...(i.forceOutcome ? { forceOutcome: i.forceOutcome } : {}),
      ...(i.forceRoll !== undefined ? { forceRoll: i.forceRoll } : {}),
      ...(i.forceRolls ? { forceRolls: i.forceRolls } : {}),
    },
    createRng(i.seed),
  );
}

/**
 * The writing half of a tier-1 checked action (T13 split), inside the caller's transaction: the
 * character (version guard, `day.settled`), the meter (persuasion, or against the home faction on
 * rival ground under the day's cap), the ledger legs, the Issues, the `actionLogs` row. Slice 5's
 * run-in resolution calls it with the held resolution (rolled or dropped), its street block and the
 * character fields the run-in changed (`extraSet`).
 */
export async function writeTier1(i: {
  content: GameContent;
  session: ClientSession;
  located: LocatedAction;
  c: CharacterDoc;
  ctx: PlaceCtx;
  resolution: Tier1Resolution;
  seed: string;
  now: number;
  idempotencyKey: string;
  editionReadAt: number | null;
  txAttempts: () => number;
  street?: StreetView;
  extraSet?: Record<string, unknown>;
  /** Iron the run-in took (paid off). */
  ironDelta?: number;
  /** Extra XP from the run-in, on top of the resolution's. */
  xpDelta?: number;
  encounterId?: Types.ObjectId;
  /** The log's id when the caller needed it first (a stay written by the run-in's resolution). */
  logId?: Types.ObjectId;
  /** A day already settled past the run-in's: no order progress (tech design §7.1). */
  frozenOrders?: boolean;
}): Promise<ActionResult> {
  const { content, session, located, c, ctx, now } = i;
  const { city, action } = located;
  if (!isCheckedAction(action)) throw new Error(`${action.id} is not a checked action`);
  const today = ctx.today;
  const res: Tier1Resolution = i.frozenOrders
    ? {
        ...i.resolution,
        orders: { before: toOrdersState(c.orders), after: toOrdersState(c.orders), completed: [], allDone: false },
      }
    : i.resolution;
  const templates = content.ordersOf(c.factionId);
  const completedTemplates = (ids: string[]): OrderTemplate[] =>
    ids.flatMap((id) => templates.filter((t) => t.id === id));

  // ADR 0034: on rival ground the swing is taken against the home faction, under the day's cap.
  const move: OpinionMove | null = action.givesOpinion
    ? moveOpinion(ctx, session, {
        actor: c.factionId,
        swing: res.rewards.opinion,
        mode: res.opinion?.mode === 'against' ? 'against' : 'persuade',
        target: res.opinion?.target ?? null,
      })
    : null;
  const opinion = move?.effect ?? null;
  const orderPay = orderRewards(completedTemplates(res.orders.completed), res.orders.allDone);
  const xp = res.rewards.xp.total + (i.xpDelta ?? 0);
  const gains = applyGains(progressOf(c), {
    xp,
    fxp: res.rewards.fxp.total + orderPay.fxp,
    pc: orderPay.pc,
  });
  const others = c.localStanding.filter((x) => x.cityId !== city.id);
  const ironGain = res.rewards.iron.total + (i.ironDelta ?? 0);
  const tally = {
    ...addToTally(c.today, today, {
      energy: res.energy.cost,
      attempts: res.times,
      successes: res.summary.successes,
      xp,
      fxp: res.rewards.fxp.total + orderPay.fxp,
      iron: ironGain,
      pc: orderPay.pc,
      opinion: opinion?.mode === 'against' ? (opinion.toActor ?? 0) : (opinion?.applied ?? 0),
      ordersDone: res.orders.completed.length,
    }),
    // Slice 5 (tech design §11.2): the paper's *rival trip* reads the closed tally.
    ...(ctx.rival ? { rivalCityId: city.id } : {}),
  };
  const result: ResultInput = {
    kind: 'checked',
    resolution: res,
    opinion: opinion ? { ...opinion } : null,
    energy: res.energy,
    gains,
    orders: res.orders,
    tally,
    content,
    logId: '',
    idempotencyKey: i.idempotencyKey,
    seed: i.seed,
    now,
    located,
    before: c,
    after: c,
    editionReadAt: i.editionReadAt,
  };

  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version, 'day.settled': c.day.settled },
    {
      $set: {
        lastActionAt: new Date(now),
        // Slice 6 (ADR 0040): presence follows the act (no extra write).
        'presence.locationId': located.location.id,
        'presence.seenAt': new Date(now),
        localStanding: [...others, { cityId: city.id, successes: res.standing.after }],
        ...progressSet(gains),
        'energy.value': res.energy.after.value,
        'energy.updatedAt': new Date(res.energy.after.updatedAt),
        rested: res.energy.after.rested,
        orders: fromOrdersState(res.orders.after),
        today: tally,
        ...(i.extraSet ?? {}),
      },
      $inc: { iron: ironGain, version: 1 },
    },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  if (move?.write) await move.write();
  const logId = i.logId ?? new Types.ObjectId();
  // Slice 4 (ADR 0028, 0029): the ledger rows, the influence total, the Issues' momentum.
  const placeEffects = await placeWrites(content, session, {
    c: updated,
    cityId: city.id,
    placeId: ctx.placeId,
    placeName: ctx.placeName,
    move,
    givesOpinion: action.givesOpinion,
    issues: res.issues ?? [],
    logId: logId.toHexString(),
    today,
    at: new Date(now),
    lenientIssues: i.frozenOrders === true,
  });
  // Slice 3 (design §6.3): the third order done on a nominations day → the branch endorses.
  const branchBack = res.orders.allDone
    ? await branchBackIfStanding(content, session, updated, today, now)
    : null;
  // Slice 7 T16 (ADR 0046): an attempt at the Chair's pushed place counts toward the party's target
  // (the member's own contribution row, in this transaction; a ×3 counts three).
  if (!i.frozenOrders) await recordPushInTx(content, session, updated, placeDescriptor(content, 'checked', action, located.location, city), res.times, now);

  const built = buildActionResult({
    ...result,
    logId: logId.toHexString(),
    after: updated,
    modifiers: ctx.modifiers,
    city: ctx.residenceCity,
    restedCap: ctx.restedCap,
    place: { placeId: ctx.placeId, placeName: ctx.placeName },
    morale: move?.morale ?? null,
    branch: branchBack,
    issues: placeEffects.issues,
    scoreboard: placeEffects.scoreboard,
    ...(i.street ? { street: i.street } : ctx.rival ? { street: QUIET_STREET } : {}),
  });
  // Slice 7 integration: the party's target bar rides on the act's view (it was gone until the next `me`).
  built.character.orders.target = await ordersTargetOf(content, updated, today, undefined, session);
  await ActionLog.create(
    [
      {
        _id: logId,
        characterId: c._id,
        idempotencyKey: i.idempotencyKey,
        actionId: action.id,
        locationId: located.location.id,
        cityId: city.id,
        kind: built.kind,
        times: res.times,
        txAttempts: i.txAttempts(),
        seed: i.seed,
        outcome: built.stamp,
        result: built,
        ...(i.encounterId ? { encounterId: i.encounterId } : {}),
      },
    ],
    { session },
  );
  return built;
}

/** A rival tap with no run-in: the street block says nothing happened. */
const QUIET_STREET: StreetView = {
  runIn: null,
  heat: null,
  caught: null,
  record: null,
  sentTo: null,
  agility: null,
  remembered: false,
  dropped: null,
};

async function writeTraining(i: {
  content: GameContent;
  located: LocatedAction;
  input: PerformInput;
  c: CharacterDoc;
  ctx: PlaceCtx;
  seed: string;
  now: number;
  session: ClientSession;
  editionReadAt: number | null;
  txAttempts: () => number;
}): Promise<ActionResult> {
  const { content, located, input, c, ctx, now, session } = i;
  const { city, location, action } = located;
  if (!isTrainingAction(action)) throw new Error(`${action.id} is not a training action`);
  const today = ctx.today;
  const templates = content.ordersOf(c.factionId);
  const descriptor: ActionDescriptor = {
    kind: 'training',
    actionId: action.id,
    type: action.type,
    locationId: location.id,
    cityId: city.id,
    ...(location.quarterId ? { districtId: location.quarterId } : {}),
    locationKind: location.kind,
  };
  const r = resolveTraining({
    trains: action.trains,
    base: { str: c.stats.str, int: c.stats.int, agi: c.stats.agi },
    energy: energyState(c),
    now,
    orders: toOrdersState(c.orders),
    orderTemplates: templates,
    homeCityId: residenceCityId(c),
    residence: residenceCtx(c),
    descriptor,
    modifiers: ctx.modifiers,
    restedCap: ctx.restedCap,
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
  const orderPay = orderRewards(
    res.orders.completed.flatMap((id) => templates.filter((t) => t.id === id)),
    res.orders.allDone,
  );
  const gains = applyGains(progressOf(c), { xp: res.xp.total, fxp: orderPay.fxp, pc: orderPay.pc });
  const tally = addToTally(c.today, today, {
    energy: res.energy.cost,
    xp: res.xp.total,
    fxp: orderPay.fxp,
    pc: orderPay.pc,
    ordersDone: res.orders.completed.length,
    statTrained: res.times,
  });
  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version, 'day.settled': today },
    {
      $set: {
        lastActionAt: new Date(now),
        'presence.locationId': location.id,
        'presence.seenAt': new Date(now),
        [`stats.${res.stat.stat}`]: res.stat.after,
        ...progressSet(gains),
        'energy.value': res.energy.after.value,
        'energy.updatedAt': new Date(res.energy.after.updatedAt),
        rested: res.energy.after.rested,
        orders: fromOrdersState(res.orders.after),
        today: tally,
      },
      $inc: { version: 1 },
    },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  const logId = new Types.ObjectId();
  const branchBack = res.orders.allDone
    ? await branchBackIfStanding(content, session, updated, today, now)
    : null;
  const built = buildActionResult({
    kind: 'training',
    resolution: res,
    energy: res.energy,
    gains,
    orders: res.orders,
    tally,
    content,
    logId: logId.toHexString(),
    idempotencyKey: input.idempotencyKey,
    seed: i.seed,
    now,
    located,
    before: c,
    after: updated,
    editionReadAt: i.editionReadAt,
    modifiers: ctx.modifiers,
    city: ctx.residenceCity,
    restedCap: ctx.restedCap,
    place: { placeId: ctx.placeId, placeName: ctx.placeName },
    morale: null,
    branch: branchBack,
    issues: [],
    scoreboard: null,
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
        seed: i.seed,
        outcome: built.stamp,
        result: built,
      },
    ],
    { session },
  );
  return built;
}
