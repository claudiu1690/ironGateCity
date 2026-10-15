import type { GameContent, LocatedMission } from '@irongate/content';
import { ActionLog, Character, Encounter } from '@irongate/db';
import type { CharacterDoc, EncounterDoc } from '@irongate/db';
import {
  addToTally,
  applyGains,
  caughtCheck,
  createRng,
  dayKey,
  finishMission,
  missionGate,
  missionTarget,
  orderRewards,
  priceLines,
  resolveMission,
  standingView,
  windowLock,
} from '@irongate/rules';
import type {
  ActionResult,
  CaughtResult,
  DayKey,
  FactionId,
  HeatState,
  MissionFinal,
  MissionStart,
  OrdersState,
  RecordLevel,
  RunInOutcome,
  RunInPending,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { closeArrivalHere, progressOf, progressSet } from './actionService';
import { branchBackIfStanding } from './councilService';
import { ensureSettled, loadCharacter } from './dayService';
import { createStayInTx, heldPlace } from './heldService';
import { runKeyedAction } from './keyedAction';
import { keySeed } from './keyGuard';
import { missionCtx, missionInput } from './missionCtx';
import { buildMissionResult } from './missionResult';
import { nightAt } from './night';
import type { RunInBlock } from './missionResult';
import { moveOpinion, placeWrites, readPlace } from './place';
import type { PlaceCtx } from './place';
import {
  arrestsOf,
  flagsPruned,
  healthDoc,
  healthTimerOf,
  heatDoc,
  heatRateOn,
  marksOf,
  notFree,
  recordLevelOf,
} from './risk';
import { pendingView, startRunInInTx, storedEncounterResult } from './streetService';
import { streetHooks } from './streetHooks';
import type { StreetForce } from './streetHooks';
import { DayChanged, VersionConflict } from './txn';
import {
  placeOpenFor,
  fromOrdersState,
  standingSuccesses,
  toOrdersState,
  wornStats,
} from './views';

export interface StartInput {
  locationId: string;
  missionId: string;
  wayId: string;
  idempotencyKey: string;
}

/** The held start in an encounter: a mission's, with the test hooks' later rolls. */
export interface HeldMission {
  kind: 'mission';
  wayId: string;
  start: MissionStart;
  force: Pick<StreetForce, 'choiceRoll' | 'caught'> | null;
}

function locateMission(content: GameContent, input: Pick<StartInput, 'locationId' | 'missionId' | 'wayId'>) {
  const located = content.mission(input.missionId);
  if (!located || located.location.id !== input.locationId) {
    throw gameError('NOT_FOUND', 'UNKNOWN_MISSION', { missionId: input.missionId, locationId: input.locationId });
  }
  const way = located.mission.ways.find((w) => w.id === input.wayId);
  if (!way) throw gameError('NOT_FOUND', 'UNKNOWN_WAY', { missionId: input.missionId, wayId: input.wayId });
  return { located, way };
}

export const policeIdOf = (content: GameContent): string => content.opponents.find((o) => o.side === 'police')!.id;

/** The target of a mission for this actor at this place (design §4.1; the capital's `leader`). */
export function targetOf(
  located: LocatedMission,
  actor: FactionId,
  district: PlaceCtx['district'],
): FactionId | null {
  return missionTarget(
    located.mission.target,
    actor,
    district ? { leader: district.state.leader ?? null, shares: district.opinion } : null,
  );
}

/** Tech design §7.2: the mission's refusals that depend on the character (before the key and in the transaction). */
function missionRefusal(
  content: GameContent,
  c: CharacterDoc,
  located: LocatedMission,
  district: PlaceCtx['district'] | undefined,
  now: number,
  way: { id: string; window?: 'night' },
): GameError | null {
  const blocked = notFree(c);
  if (blocked) return blocked;
  if (c.journey?.status === 'onTheWay') {
    return new GameError('IN_TRANSIT', { arrivesAt: new Date(c.journey.arrivesAt).getTime() });
  }
  if (located.city.id !== c.cityId) {
    return new GameError('WRONG_CITY', { cityId: c.cityId, actionCityId: located.city.id }, 'BAD_REQUEST');
  }
  // Review 4 (tech design §3.2, ADR 0076): a place the character cannot open is refused.
  const open = placeOpenFor(content, c, located.location);
  if (!open.open && open.lock) {
    return new GameError(
      'MISSION_LOCKED',
      open.lock.kind === 'level' ? { lock: 'QUARTER', need: open.lock.level } : { lock: 'EDITION', need: 0 },
    );
  }
  if (district !== undefined) {
    const target = targetOf(located, c.factionId, district);
    if (located.mission.target && target === c.factionId) return new GameError('OWN_FACTION_TARGET', { factionId: target });
  } else if (located.mission.target && located.mission.target === c.factionId) {
    return new GameError('OWN_FACTION_TARGET', { factionId: c.factionId });
  }
  const gate = missionGate({
    level: c.level,
    rank: c.rank,
    standingLevel: standingView(standingSuccesses(c, located.city.id)).level,
    record: recordLevelOf(c, dayKey(now)),
    mission: located.mission,
    place: {
      kind: located.location.kind,
      ...(located.location.factionId ? { factionId: located.location.factionId } : {}),
    },
  });
  if (gate?.reason === 'RECORD') return new GameError('RECORD_BARRED', { locationId: located.location.id });
  if (gate) return new GameError('MISSION_LOCKED', { lock: gate.reason, need: gate.need });
  // Review 5 (tech design §7.3, ADR 0080): a night window by day, refused before the key is stored
  // (and again in the transaction, at the act's time), so the same key plays at dusk.
  const night = windowLock({ mission: located.mission, way, night: nightAt(now) });
  if (night) {
    return new GameError('MISSION_LOCKED', {
      lock: 'NIGHT',
      opensAt: night.opensAt,
      ...(located.mission.window ? {} : { wayId: way.id }),
    });
  }
  return null;
}

/**
 * `mission.start` (tech design §3.1, §8.2; ADR 0031, 0032): one keyed transaction. Without a run-in
 * the caught check and the finish are written at once (`ActionResult` of kind `mission`); with one,
 * the start (Energy, Heat, the way) and a pending encounter are written and `RunInPending` returned.
 * A retried key returns the stored result, or the stored pending view.
 */
export async function startMission(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: StartInput;
}): Promise<ActionResult | RunInPending> {
  const { content, input } = deps;
  const { located, way } = locateMission(content, input);
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  const stored = () => storedStart(content, c0._id, input, deps.now());
  const prior = await stored();
  if (prior) return prior;
  const refusal = missionRefusal(content, c0, located, undefined, deps.now(), way);
  if (refusal) throw refusal.toTRPC();
  const force = streetHooks.take(c0._id.toHexString(), input.idempotencyKey);

  return runKeyedAction<ActionResult | RunInPending>({
    key: { characterId: c0._id, idempotencyKey: input.idempotencyKey },
    stored,
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
      loaded.editionReadAt = null;
    },
    write: async (session, txAttempts) => {
      const now = deps.now();
      const today = dayKey(now);
      let c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      // Slice 5 (tech design §8.2): an arrived journey here is closed first (its ignore effects).
      c = await closeArrivalHere(content, session, c, now);
      const ctx = await readPlace(content, session, c, located, today);
      const refused = missionRefusal(content, c, located, ctx.district, now, way);
      if (refused) throw refused;

      // QA M1: one seed per key, so a re-run of this transaction draws the same rolls.
      const seed = keySeed(c._id, input.idempotencyKey);
      // The same inputs the city view's preview reads (T12's `missionCtx`), in this snapshot.
      const docs = { city: ctx.cityState, district: ctx.district, residence: ctx.residenceCity };
      const mctx = missionCtx(content, c, located.mission.id, docs, now, ctx.modifiers);
      if (!mctx) throw new Error(`unknown mission ${located.mission.id}`);
      const forced = force
        ? {
            ...(force.checkRoll !== undefined
              ? { checkRoll: force.checkRoll }
              : force.rolls?.[0] !== undefined
                ? { checkRoll: force.rolls[0] }
                : {}),
            ...(force.runIn ? { runIn: force.runIn } : {}),
            ...(force.opponentId ? { opponentId: force.opponentId } : {}),
          }
        : undefined;
      const r = resolveMission(missionInput(content, mctx, c, way, docs, now, forced), createRng(seed));
      if (!r.ok) {
        throw new GameError('NOT_ENOUGH_ENERGY', {
          energy: r.energy.value,
          cost: r.cost,
          times: 1,
          nextTickAt: r.energy.nextTickAt,
        });
      }
      const start = r.start;
      const held: HeldMission = {
        kind: 'mission',
        wayId: way.id,
        start,
        force: force ? { ...(force.choiceRoll ? { choiceRoll: force.choiceRoll } : {}), ...(force.caught ? { caught: force.caught } : {}) } : null,
      };
      if (start.runIn.fires && start.runIn.opponentId) {
        return startRunInInTx(content, session, {
          c,
          ctx,
          kind: 'mission',
          refId: located.mission.id,
          refName: located.mission.name,
          idempotencyKey: input.idempotencyKey,
          seed,
          opponentId: start.runIn.opponentId,
          tier: 2,
          held,
          now,
          set: {
            'energy.value': start.energy.after.value,
            'energy.updatedAt': new Date(start.energy.after.updatedAt),
            rested: start.energy.after.rested,
            heat: heatDoc(start.heat.timer),
            ways: waysWith(c, located.mission.id, way.id),
          },
        });
      }
      return writeMissionFinal({
        content,
        session,
        c,
        ctx,
        located,
        held,
        runIn: null,
        at: now,
        now,
        idempotencyKey: input.idempotencyKey,
        editionReadAt: loaded.editionReadAt,
        txAttempts,
        showRolls: streetHooks.enabled,
      });
    },
  });
}

/** The way remembered for a mission (ADR 0031): set at the start. */
export function waysWith(c: Pick<CharacterDoc, 'ways'>, missionId: string, wayId: string) {
  return [...(c.ways ?? []).filter((w) => w.missionId !== missionId), { missionId, wayId }];
}

/** A stored start: the `actionLogs` row, else the encounter (pending view or its resolution). */
async function storedStart(
  content: GameContent,
  characterId: Types.ObjectId,
  input: StartInput,
  now: number,
): Promise<ActionResult | RunInPending | null> {
  const log = await ActionLog.findOne(
    { characterId, idempotencyKey: input.idempotencyKey },
    { result: 1, actionId: 1, kind: 1 },
  ).lean();
  if (log) {
    if (log.actionId !== input.missionId) throw gameError('CONFLICT', 'KEY_REUSED', { idempotencyKey: input.idempotencyKey });
    return log.result as ActionResult;
  }
  const enc = await Encounter.findOne({ characterId, idempotencyKey: input.idempotencyKey }).lean<EncounterDoc>();
  if (!enc) return null;
  if (enc.refId !== input.missionId) throw gameError('CONFLICT', 'KEY_REUSED', { idempotencyKey: input.idempotencyKey });
  if (enc.state === 'resolved') return storedEncounterResult(enc);
  const c = await Character.findById(characterId).lean<CharacterDoc>();
  return c ? pendingView(content, enc, c, now) : null;
}

/**
 * The first crossing into a Heat state (its one-line card), and the first crossing into a record
 * level (QA m5: *On file*, *Repeat offender*, *Notorious*, each its card once). A character who had
 * the first-mark card before the fix round (`firsts.mark`) has seen *On file*'s.
 */
export function firstsAfter(
  c: Pick<CharacterDoc, 'firsts'>,
  stateAfter: HeatState,
  stateBefore: HeatState,
  record: { added: number; before: RecordLevel; after: RecordLevel },
  at: Date,
): { set: Record<string, Date>; heatFirst: boolean; recordFirst: boolean } {
  const f = c.firsts ?? {};
  const set: Record<string, Date> = {};
  let heatFirst = false;
  if (stateAfter !== 'cool' && stateAfter !== stateBefore && !f[stateAfter]) {
    set[`firsts.${stateAfter}`] = at;
    heatFirst = true;
  }
  let recordFirst = false;
  if (record.added > 0) {
    if (!f.mark) set['firsts.mark'] = at;
    const level = record.after;
    const seen = level === 'onFile' ? (f.onFile ?? f.mark) : level === 'clean' ? true : f[level];
    if (level !== record.before && !seen) {
      set[`firsts.${level}`] = at;
      recordFirst = true;
    }
  }
  return { set, heatFirst, recordFirst };
}

/**
 * The finish of a mission, inside the caller's transaction (tech design §3.1): the caught check (an
 * illegal type, a Partial or a Failure, no Run or loss), `finishMission`, then every write — the
 * character, the meter, the ledger legs and contribution, the Issues, the stay, the `actionLogs` row
 * (under the start's key). Called by `mission.start` without a run-in and by the run-in's resolution.
 */
export async function writeMissionFinal(i: {
  content: GameContent;
  session: ClientSession;
  c: CharacterDoc;
  ctx: PlaceCtx;
  located: LocatedMission;
  held: HeldMission;
  runIn: (RunInBlock & { encounterId: Types.ObjectId; opponentSide: FactionId | 'police' }) | null;
  /** The resolution's time (a run-in's decide time when luck took it). */
  at: number;
  now: number;
  idempotencyKey: string;
  editionReadAt: number | null;
  txAttempts: () => number;
  showRolls: boolean;
  /** A day already settled past the run-in's: no order progress (tech design §7.1). */
  frozenOrders?: boolean;
  extraSet?: Record<string, unknown>;
}): Promise<ActionResult> {
  const { content, session, c, ctx, located, held } = i;
  const s = held.start;
  const { city, mission } = located;
  const today: DayKey = ctx.today;
  const rateOn = heatRateOn(content, ctx.residenceCity);
  const logId = new Types.ObjectId();
  const r: RunInOutcome | null = i.runIn?.outcome ?? null;

  const caught: CaughtResult = caughtCheck({
    type: s.type,
    outcome: s.attempt.outcome,
    street: r ? r.outcome : 'none',
    heatAfter: s.heat.after + (r?.heatAdded ?? 0),
    record: recordLevelOf(c, today),
    agi: wornStats(c, content).agi,
    rivalGround: s.rivalGround,
    rng: createRng(`${s.seed}:caught`),
    ...(held.force?.caught ? { force: held.force.caught } : {}),
  });
  // The bail: the place where the player would be held (the city's `bailPct` sources).
  const final: MissionFinal = finishMission({
    start: s,
    runIn: r,
    opponentSide: i.runIn?.opponentSide ?? null,
    caught,
    marks: marksOf(c),
    arrests: arrestsOf(c),
    agiQuarters: c.stats.agiQuarters ?? 0,
    health: healthTimerOf(c),
    level: c.level,
    at: i.at,
    today,
    rateOn,
    logId: logId.toHexString(),
    bail: { alliance: c.factionId === 'alliance', sources: priceLines(ctx.modifiers, 'bailPct') },
  });

  const orders = i.frozenOrders
    ? { after: toOrdersState(c.orders), advanced: null, completed: [] as string[], allDone: false }
    : final.orders;
  const templates = content.ordersOf(c.factionId);
  const orderPay = orderRewards(
    orders.completed.flatMap((id) => templates.filter((t) => t.id === id)),
    orders.allDone,
  );
  const gains = applyGains(progressOf(c), {
    xp: final.rewards.xp.total,
    fxp: final.rewards.fxp.total + orderPay.fxp,
    pc: orderPay.pc,
  });
  const move =
    s.opinion.mode !== null && final.swing > 0
      ? moveOpinion(ctx, session, { actor: c.factionId, swing: final.swing, mode: s.opinion.mode, target: s.opinion.target })
      : null;
  const contributed = move?.effect ? (move.effect.mode === 'against' ? (move.effect.toActor ?? 0) : move.effect.applied) : 0;
  const ironGain = final.rewards.iron.total;
  const tally = {
    ...addToTally(c.today, today, {
      energy: s.energy.cost,
      attempts: 1,
      successes: final.outcome === 'success' && !final.dropped ? 1 : 0,
      xp: final.rewards.xp.total,
      fxp: final.rewards.fxp.total + orderPay.fxp,
      iron: ironGain,
      pc: orderPay.pc,
      opinion: contributed,
      ordersDone: orders.completed.length,
    }),
    missions: ((c.today.day === today ? (c.today as { missions?: number }).missions : 0) ?? 0) + 1,
    ...(s.rivalGround ? { rivalCityId: city.id } : {}),
  };

  // The stay (design §7.2, §9.2), in this transaction.
  let sentTo: Parameters<typeof buildMissionResult>[0]['sentTo'] = null;
  let heldSet: Record<string, unknown> = {};
  if (final.sentTo) {
    const stay = await createStayInTx(content, session, c, {
      cityId: city.id,
      held: final.sentTo.held,
      reason: final.sentTo.reason,
      marks: final.record.added.length,
      heatAtArrest: final.sentTo.kind === 'cells' ? final.heat.after : null,
      logId,
      encounterId: i.runIn?.encounterId ?? null,
    });
    const place = heldPlace(content, city.id, final.sentTo.kind);
    sentTo = {
      stayId: stay.stayId.toHexString(),
      placeName: stay.placeName,
      landing: {
        cityId: city.id,
        ...(place.location.quarterId ? { quarterId: place.location.quarterId } : {}),
        locationId: place.location.id,
      },
    };
    heldSet = { held: stay.held };
  }

  const firstMission = !c.firsts?.mission;
  const firsts = firstsAfter(
    c,
    final.heat.stateAfter,
    final.heat.stateBefore,
    { added: final.record.added.length, before: final.record.before, after: final.record.after },
    new Date(i.at),
  );
  const remembered = !(c.ways ?? []).some((w) => w.missionId === mission.id);
  const others = c.localStanding.filter((x) => x.cityId !== city.id);
  const agiSet: Record<string, unknown> = final.agility
    ? {
        'stats.agiQuarters': final.agility.quarters,
        ...(final.agility.statUp ? { 'stats.agi': c.stats.agi + 1 } : {}),
      }
    : {};
  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version, 'day.settled': c.day.settled },
    {
      $set: {
        lastActionAt: new Date(i.now),
        // Slice 6 (ADR 0040): presence follows the act.
        'presence.locationId': ctx.location.id,
        'presence.seenAt': new Date(i.now),
        localStanding: [...others, { cityId: city.id, successes: final.standing }],
        ...progressSet(gains),
        'energy.value': s.energy.after.value,
        'energy.updatedAt': new Date(s.energy.after.updatedAt),
        rested: s.energy.after.rested,
        orders: fromOrdersState(orders.after as OrdersState),
        today: tally,
        heat: heatDoc(final.heat.timer),
        ...(final.health ? { health: healthDoc(final.health.timer) } : {}),
        record: { marks: final.record.marks, arrests: final.record.arrests },
        ways: waysWith(c, mission.id, held.wayId),
        flags: flagsPruned(c, today),
        ...(firstMission ? { 'firsts.mission': new Date(i.at) } : {}),
        ...firsts.set,
        ...agiSet,
        ...heldSet,
        ...(i.extraSet ?? {}),
      },
      $inc: { iron: ironGain, version: 1 },
    },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  if (move?.write) await move.write();
  const placeEffects = await placeWrites(content, session, {
    c: updated,
    cityId: city.id,
    placeId: ctx.placeId,
    placeName: ctx.placeName,
    move,
    givesOpinion: move !== null,
    issues: final.points > 0 ? s.issues.map((t) => ({ ...t, points: final.points })) : [],
    logId: logId.toHexString(),
    today,
    at: new Date(i.at),
    lenientIssues: i.frozenOrders === true,
  });
  const branchBack = orders.allDone ? await branchBackIfStanding(content, session, updated, today, i.now) : null;

  const built = buildMissionResult({
    content,
    located,
    wayId: held.wayId,
    start: s,
    final,
    runIn: i.runIn,
    caught: caught.checked ? caught : null,
    sentTo,
    move,
    logId: logId.toHexString(),
    idempotencyKey: i.idempotencyKey,
    now: i.now,
    before: c,
    after: updated,
    gains,
    orders: { before: s.orders.before, after: orders.after as OrdersState, completed: orders.completed, allDone: orders.allDone },
    tally,
    modifiers: ctx.modifiers,
    residenceCity: ctx.residenceCity,
    restedCap: ctx.restedCap,
    editionReadAt: i.editionReadAt,
    place: { placeId: ctx.placeId, placeName: ctx.placeName },
    issues: placeEffects.issues,
    scoreboard: placeEffects.scoreboard,
    morale: move?.morale ?? null,
    branch: branchBack,
    rateOn,
    firstMission,
    firstHeatState: firsts.heatFirst,
    firstMark: firsts.recordFirst,
    remembered,
    showRolls: i.showRolls,
  });
  await ActionLog.create(
    [
      {
        _id: logId,
        characterId: c._id,
        idempotencyKey: i.idempotencyKey,
        actionId: mission.id,
        locationId: located.location.id,
        cityId: city.id,
        kind: 'mission',
        times: 1,
        txAttempts: i.txAttempts(),
        seed: s.seed,
        outcome: built.stamp,
        result: built,
        ...(i.runIn ? { encounterId: i.runIn.encounterId } : {}),
      },
    ],
    { session },
  );
  return built;
}

