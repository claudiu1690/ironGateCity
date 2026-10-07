import type { GameContent } from '@irongate/content';
import { isCheckedAction } from '@irongate/content';
import { ActionLog, Character, Encounter } from '@irongate/db';
import type { CharacterDoc, CityDoc, EncounterDoc } from '@irongate/db';
import {
  FULL_STRENGTH_PART,
  HEALTH,
  HEAT,
  PAID_OFF_PART,
  RUN_IN,
  RUN_IN_PART,
  addHeat,
  admit,
  arrest,
  arrestOnRecord,
  armourOf,
  bailFor,
  closeOrders,
  createRng,
  dayKey,
  dayStart,
  healthMax,
  healthNow,
  heatEta,
  heatState,
  luckChoice,
  oddsBand,
  policeLossHealth,
  priceLines,
  projectHeat,
  recordLevel,
  resolveRunIn,
  roundHalfUp,
  runInChances,
  scaleOpponent,
  yourPower,
} from '@irongate/rules';
import type {
  ActionResult,
  CharacterView,
  FactionId,
  Landing,
  HealthTimer,
  RewardLine,
  RewardPart,
  Rewards,
  RunInChoice,
  RunInOutcome,
  RunInPending,
  StreetView,
  Tier1Resolution,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { writeTier1 } from './actionService';
import { loadCharacter } from './dayService';
import { createStayInTx, heldPlace } from './heldService';
import type { HeldMission } from './missionService';
import { firstsAfter, writeMissionFinal } from './missionService';
import { readPlace } from './place';
import type { PlaceCtx } from './place';
import { withRequestKey } from './requestKey';
import {
  flagsPruned,
  healthDoc,
  healthTimerOf,
  heatDoc,
  heatRateOn,
  heatTimerOf,
  arrestsOf,
  marksOf,
} from './risk';
import { streetHooks } from './streetHooks';
import type { StreetForce } from './streetHooks';
import { MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import { assetView, landingAt, toCharacterView, toOrdersState, wornStats } from './views';

/**
 * Slice 5 (ADR 0032, tech design §8.2): run-ins. A run-in is an `encounters` document (pending →
 * resolved) and the character's `runIn` pointer. One function, `resolveInTx`, resolves it for every
 * path: the player's choice (`encounter.choose`) and luck on the read path (after the five-minute
 * window, or at the day's turn, as of the decide time).
 */

/** The held start of a tier-1 tap on rival ground: the resolution as rolled and its Partial twin. */
export interface HeldAction {
  kind: 'action';
  actionId: string;
  rolled: Tier1Resolution;
  dropped: Tier1Resolution;
  force: Pick<StreetForce, 'choiceRoll'> | null;
}

type Held = HeldMission | HeldAction;

const clothingTierOf = (content: GameContent, c: CharacterDoc): number | null => {
  const uid = c.equipment?.clothing ?? null;
  const worn = uid ? (c.inventory ?? []).find((e) => e.uid === uid) : undefined;
  return worn ? (content.item(worn.itemId)?.tier ?? null) : null;
};

/**
 * Write a run-in's start inside the act's transaction: the character's start fields (`set`: Energy,
 * Rested, Heat, the way) and the pointer, and the pending encounter with the scaled opponent and the
 * four chances. Returns the modal's state.
 */
export async function startRunInInTx(
  content: GameContent,
  session: ClientSession,
  i: {
    c: CharacterDoc;
    ctx: PlaceCtx;
    kind: 'mission' | 'action';
    refId: string;
    refName: string;
    idempotencyKey: string;
    seed: string;
    opponentId: string;
    tier: 1 | 2;
    held: Held;
    now: number;
    set: Record<string, unknown>;
  },
): Promise<RunInPending> {
  const { c, ctx, now } = i;
  const spec = content.opponent(i.opponentId);
  if (!spec) throw new Error(`unknown opponent ${i.opponentId}`);
  const them = scaleOpponent(spec, { tier: i.tier, rivalGround: ctx.rival !== null });
  const worn = wornStats(c, content);
  const tier = clothingTierOf(content, c);
  const max = healthMax(c.level);
  const you = {
    power: yourPower(worn.str, tier),
    agi: worn.agi,
    cha: worn.cha,
    armour: armourOf(tier),
    health: healthNow(healthTimerOf(c), now, c.level),
    healthMax: max,
  };
  const chances = runInChances(you, them);
  const encounterId = new Types.ObjectId();
  const decideBy = new Date(now + RUN_IN.decideMs);
  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version, 'day.settled': ctx.today, runIn: null },
    {
      $set: {
        ...i.set,
        lastActionAt: new Date(now),
        flags: flagsPruned(c, ctx.today),
        runIn: { encounterId, state: 'pending', day: ctx.today, decideBy, cityId: ctx.city.id },
      },
      $inc: { version: 1 },
    },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  const [enc] = await Encounter.create(
    [
      {
        _id: encounterId,
        characterId: c._id,
        idempotencyKey: i.idempotencyKey,
        kind: i.kind,
        refId: i.refId,
        locationId: ctx.location.id,
        cityId: ctx.city.id,
        day: ctx.today,
        rivalGround: ctx.rival !== null,
        seed: i.seed,
        opponent: them,
        you,
        chances,
        held: i.held,
        state: 'pending',
        decideBy,
      },
    ],
    { session },
  );
  return pendingView(content, enc!.toObject() as EncounterDoc, updated, now, ctx.residenceCity);
}

/** The run-in modal's state (tech design §8.3), rebuilt from the encounter and the character. */
export function pendingView(
  content: GameContent,
  enc: EncounterDoc,
  c: CharacterDoc,
  now: number,
  residenceCity: CityDoc | null = null,
): RunInPending {
  const spec = content.opponent(enc.opponent.id)!;
  const located = content.location(enc.locationId);
  const name =
    enc.kind === 'mission' ? (content.mission(enc.refId)?.mission.name ?? enc.refId) : (content.action(enc.refId)?.action.name ?? enc.refId);
  const heat = projectHeat(heatTimerOf(c), now, heatRateOn(content, residenceCity));
  const pay = enc.opponent.payOff;
  return {
    kind: 'runIn',
    encounterId: enc._id.toHexString(),
    decideBy: new Date(enc.decideBy).getTime(),
    serverNow: now,
    place: { cityId: enc.cityId, locationId: enc.locationId, locationName: located?.location.name ?? enc.locationId },
    what: { kind: enc.kind, id: enc.refId, name },
    opponent: {
      id: spec.id,
      label: spec.label,
      appears: spec.lines.appears,
      portrait: assetView(content, spec.portrait),
      bribable: pay !== null,
      payOff: pay,
    },
    you: {
      health: healthNow(healthTimerOf(c), now, c.level),
      healthMax: healthMax(c.level),
      heat: heat.value,
      heatState: heatState(heat.value),
    },
    rows: {
      fight: { chance: enc.chances.fight },
      run: { chance: enc.chances.run },
      talk: { chance: enc.chances.talk },
      pay:
        pay === null || enc.chances.pay === null
          ? null
          : { chance: enc.chances.pay, price: pay, affordable: c.iron >= pay },
    },
    luck: luckChoice(enc.chances),
    character: toCharacterView(c, now, content, null, { city: residenceCity }),
  };
}

/** A resolved run-in's result (its `actionLogs` row). */
export async function storedEncounterResult(enc: EncounterDoc, session?: ClientSession): Promise<ActionResult> {
  const q = ActionLog.findById(enc.logId, { result: 1 });
  const log = await (session ? q.session(session) : q).lean();
  if (!log) throw new Error(`encounter ${enc._id.toHexString()} has no result`);
  return log.result as ActionResult;
}

const addPart = (line: RewardLine, part: RewardPart): RewardLine => {
  if (part.amount === 0) return line;
  const bonus = line.bonus + part.amount;
  return { ...line, bonus, total: line.base + bonus, parts: [...(line.parts ?? []), part] };
};

/** The run-in's parts on a tier-1 tap's rewards (as `finishMission` adds them to a mission's). */
function withRunInParts(r: Rewards, o: RunInOutcome): Rewards {
  let out: Rewards = { ...r, xp: addPart(r.xp, { ...RUN_IN_PART, amount: o.xp }) };
  if (o.fullStrength) {
    out = {
      ...out,
      xp: addPart(out.xp, { ...FULL_STRENGTH_PART, amount: roundHalfUp(r.xp.base * 0.1) }),
      fxp: addPart(out.fxp, { ...FULL_STRENGTH_PART, amount: roundHalfUp(r.fxp.base * 0.1) }),
    };
  }
  if (o.ironPaid > 0) out = { ...out, iron: addPart(out.iron, { ...PAID_OFF_PART, amount: -o.ironPaid }) };
  return out;
}

/**
 * Resolve a pending run-in inside the caller's transaction (ADR 0032): the choice (`luck` picks the
 * best free row), the rolls from the `:choice` and `:damage` streams, then the mission's finish or the
 * tap's write, the encounter resolved under its `pending` guard and the pointer `resolved`. A run-in
 * already resolved returns its stored result whatever the choice.
 */
export async function resolveInTx(
  content: GameContent,
  session: ClientSession,
  i: {
    characterId: Types.ObjectId;
    encounterId: Types.ObjectId;
    choice: RunInChoice | 'luck';
    by: 'player' | 'luck' | 'auto';
    asOf: number;
    now: number;
    editionReadAt: number | null;
    txAttempts: () => number;
  },
): Promise<ActionResult> {
  const enc = await Encounter.findOne({ _id: i.encounterId, characterId: i.characterId })
    .session(session)
    .lean<EncounterDoc<Held>>();
  if (!enc) throw new GameError('NO_RUN_IN', {}, 'NOT_FOUND');
  if (enc.state === 'resolved') return storedEncounterResult(enc, session);
  const c = await Character.findById(i.characterId).session(session).lean<CharacterDoc>();
  if (!c) throw new Error('character disappeared');
  if (c.runIn?.state !== 'pending' || !c.runIn.encounterId.equals(enc._id)) throw new VersionConflict();

  const choice: RunInChoice = i.choice === 'luck' ? luckChoice(enc.chances) : i.choice;
  if (choice === 'pay') {
    if (enc.opponent.payOff === null || enc.chances.pay === null)
      throw new GameError('CANNOT_PAY', { why: 'NOT_BRIBABLE' });
    if (c.iron < enc.opponent.payOff)
      throw new GameError('CANNOT_PAY', { why: 'NOT_ENOUGH_IRON', iron: c.iron, price: enc.opponent.payOff });
  }
  const max = healthMax(c.level);
  const outcome = resolveRunIn({
    choice,
    chances: enc.chances,
    them: enc.opponent,
    iron: c.iron,
    healthBefore: healthNow(healthTimerOf(c), i.asOf, c.level),
    healthMax: max,
    armour: enc.you.armour,
    rng: createRng(`${enc.seed}:choice`),
    damageRng: createRng(`${enc.seed}:damage`),
    ...(enc.held.force?.choiceRoll !== undefined ? { forceRoll: enc.held.force.choiceRoll } : {}),
  });
  // ADR 0032 §5: the run-in's day takes it, unless that day was already settled (then today, no orders).
  const frozen = c.day.settled !== enc.day;
  const day = frozen ? (c.day.settled ?? enc.day) : enc.day;
  const opponentSide: FactionId | 'police' = content.opponent(enc.opponent.id)?.side ?? 'police';
  const resolvedSet = { 'runIn.state': 'resolved' };
  const showRolls = streetHooks.enabled;

  let result: ActionResult;
  if (enc.held.kind === 'mission') {
    const located = content.mission(enc.refId);
    if (!located) throw new Error(`unknown mission ${enc.refId}`);
    const ctx = await readPlace(content, session, c, located, day);
    result = await writeMissionFinal({
      content,
      session,
      c,
      ctx,
      located,
      held: enc.held,
      runIn: { outcome, opponentId: enc.opponent.id, by: i.by, showRolls, encounterId: enc._id, opponentSide },
      at: i.asOf,
      now: i.now,
      idempotencyKey: enc.idempotencyKey,
      editionReadAt: i.editionReadAt,
      txAttempts: i.txAttempts,
      showRolls,
      frozenOrders: frozen,
      extraSet: resolvedSet,
    });
  } else {
    result = await resolveTier1InTx(content, session, { c, enc: enc as EncounterDoc<HeldAction>, outcome, day, frozen, opponentSide, showRolls, ...i });
  }
  const done = await Encounter.updateOne(
    { _id: enc._id, state: 'pending' },
    {
      $set: {
        state: 'resolved',
        choice,
        by: i.by,
        outcome: outcome.outcome,
        logId: new Types.ObjectId(result.logId),
        resolvedAt: new Date(i.now),
        resolvedAsOf: new Date(i.asOf),
      },
    },
    { session },
  );
  if (done.modifiedCount !== 1) throw new VersionConflict();
  return result;
}

/** A tier-1 tap's run-in resolved (design §10.5): Run or a loss drops it to Partial; a loss sends you on. */
async function resolveTier1InTx(
  content: GameContent,
  session: ClientSession,
  i: {
    c: CharacterDoc;
    enc: EncounterDoc<HeldAction>;
    outcome: RunInOutcome;
    day: number;
    frozen: boolean;
    opponentSide: FactionId | 'police';
    by: 'player' | 'luck' | 'auto';
    showRolls: boolean;
    asOf: number;
    now: number;
    editionReadAt: number | null;
    txAttempts: () => number;
  },
): Promise<ActionResult> {
  const { c, enc, outcome: o } = i;
  const located = content.action(enc.refId);
  if (!located || !isCheckedAction(located.action)) throw new Error(`unknown action ${enc.refId}`);
  const ctx = await readPlace(content, session, c, located, i.day);
  const dropped = o.outcome === 'ran' || o.outcome === 'lost' ? (o.outcome === 'ran' ? 'ran' : 'lost') : null;
  const base = dropped ? enc.held.dropped : enc.held.rolled;
  const resolution: Tier1Resolution = { ...base, rewards: withRunInParts(base.rewards, o) };
  if (dropped) resolution.rewards = { ...resolution.rewards, opinion: resolution.rewards.opinion };

  const rateOn = heatRateOn(content, ctx.residenceCity);
  const max = healthMax(c.level);
  const before = healthNow(healthTimerOf(c), i.asOf, c.level);
  let health: HealthTimer = o.healthAfter >= max ? { damage: 0, at: i.asOf } : { damage: max - o.healthAfter, at: i.asOf };
  const heatBefore = projectHeat(heatTimerOf(c), i.asOf, rateOn);
  const heat = o.heatAdded > 0 ? addHeat(heatTimerOf(c), i.asOf, rateOn, o.heatAdded) : null;

  const logId = new Types.ObjectId();
  const extraSet: Record<string, unknown> = { 'runIn.state': 'resolved', health: healthDoc(health) };
  if (heat) extraSet.heat = heatDoc(heat.timer);
  let sentTo: StreetView['sentTo'] = null;
  let recordBlock: StreetView['record'] = null;
  let resolutionOrders: Tier1Resolution['orders'] | null = null;
  let addedMarks = 0;
  if (o.outcome === 'lost') {
    // Design §23.1 #3, #4: a loss to the police is the cells; else the infirmary. Review 4 #20 (ADR
    // 0078): the arrest marks (one minor mark, or three serious within seven days), counts for the
    // escalation, and takes the day's orders off from it (not on a day already settled past).
    const kind = i.opponentSide === 'police' ? 'cells' : 'infirmary';
    let spec;
    if (kind === 'cells') {
      const rec = arrestOnRecord({ marks: marksOf(c), arrests: arrestsOf(c), today: i.day, logId: logId.toHexString() });
      addedMarks = rec.added.length;
      extraSet.record = { marks: rec.marks, arrests: rec.arrests };
      const firsts = firstsAfter(
        c,
        heatState(heat?.after ?? heatBefore.value),
        heatState(heat?.after ?? heatBefore.value),
        { added: rec.added.length, before: rec.before, after: rec.after },
        new Date(i.asOf),
      );
      Object.assign(extraSet, firsts.set);
      recordBlock = {
        added: rec.added.length,
        escalated: rec.escalated,
        before: rec.before,
        after: rec.after,
        marks: rec.marks.length,
        first: firsts.recordFirst,
        allMinor: rec.marks.every((m) => m.kind === 'minor'),
        takenIn: true,
      };
      if (!i.frozen) {
        const before = toOrdersState(c.orders);
        resolutionOrders = { before, after: closeOrders(before, i.asOf), completed: [], allDone: false };
      }
      const bail = bailFor({
        marks: rec.marks.length,
        notorious: recordLevel(rec.marks.length) === 'notorious',
        rivalGround: ctx.rival !== null,
        alliance: c.factionId === 'alliance',
        sources: priceLines(ctx.modifiers, 'bailPct'),
      });
      spec = arrest({ at: i.asOf, heat: (heat?.after ?? heatBefore.value), rivalGround: ctx.rival !== null, bail });
      health = policeLossHealth(c.level, i.asOf);
    } else {
      const a = admit({ at: i.asOf, level: c.level, rivalGround: ctx.rival !== null });
      spec = a.held;
      health = a.health;
    }
    extraSet.health = healthDoc(health);
    const stay = await createStayInTx(content, session, c, {
      cityId: ctx.city.id,
      held: spec,
      reason: kind === 'cells' ? 'policeLoss' : 'runInLost',
      marks: addedMarks,
      heatAtArrest: kind === 'cells' ? (heat?.after ?? heatBefore.value) : null,
      logId,
      encounterId: enc._id,
    });
    extraSet.held = stay.held;
    const place = heldPlace(content, ctx.city.id, kind);
    sentTo = {
      kind,
      stayId: stay.stayId.toHexString(),
      placeName: stay.placeName,
      until: spec.until,
      bail: spec.bail?.total ?? null,
      landing: landingAt(content, ctx.city.id, place.location.id),
    };
  }
  const spec = content.opponent(enc.opponent.id)!;
  const afterHealth = o.outcome === 'lost' ? HEALTH.admitted : o.healthAfter;
  const street: StreetView = {
    runIn: {
      opponent: { id: spec.id, label: spec.label, portrait: assetView(content, spec.portrait), pronoun: spec.pronoun },
      choice: o.choice,
      by: i.by,
      steps: o.steps.map((x) => ({
        row: x.row,
        ok: x.ok,
        band: oddsBand(x.chance),
        ...(i.showRolls ? { chance: x.chance, roll: x.roll } : {}),
      })),
      outcome: o.outcome,
      line: spec.lines[o.outcome] ?? spec.lines.won,
      cause: o.cause,
      health: { before, after: afterHealth, max, fullAt: afterHealth >= max ? null : i.asOf + Math.ceil((max - afterHealth) / HEALTH.regen) * HEALTH.tickMs },
      ironPaid: o.ironPaid,
      heatAdded: o.heatAdded,
      xp: o.xp,
    },
    heat: heat
      ? {
          before: heat.before,
          gain: heat.after - heat.before,
          after: heat.after,
          state: heat.stateAfter,
          stateBefore: heat.stateBefore,
          // Review 4 #12 (answers §12): the knock-on reads *… · Cool at 20:40*.
          coolsAt: heat.stateAfter === 'cool' ? null : heatEta(heat.timer, i.asOf, rateOn, HEAT.states.noticed),
          first: false,
        }
      : null,
    caught: null,
    record: recordBlock,
    sentTo,
    agility: null,
    remembered: false,
    dropped,
    ...(resolutionOrders ? { ordersOff: true } : {}),
  };
  const result = await writeTier1({
    content,
    session,
    located,
    c,
    ctx,
    resolution: resolutionOrders ? { ...resolution, orders: resolutionOrders } : resolution,
    seed: enc.seed,
    now: i.now,
    idempotencyKey: enc.idempotencyKey,
    editionReadAt: i.editionReadAt,
    txAttempts: i.txAttempts,
    street,
    extraSet,
    encounterId: enc._id,
    logId,
    frozenOrders: i.frozen,
  });
  if (sentTo) {
    result.stamp = sentTo.kind === 'cells' ? 'takenIn' : 'carriedOff';
    result.again = null;
    await ActionLog.updateOne({ _id: logId }, { $set: { outcome: result.stamp, result } }, { session });
  }
  return result;
}

/** When luck resolves a run-in on the read path: its decide time, or its day's last moment (ADR 0032 §5). */
export const luckAsOf = (r: { day: number; decideBy: Date }): number =>
  Math.min(new Date(r.decideBy).getTime(), dayStart(r.day + 1) - 1);

/** Whether the read path resolves the character's run-in now (ADR 0032 §5). */
export function runInDue(c: Pick<CharacterDoc, 'runIn'>, now: number, keep?: Types.ObjectId | null): boolean {
  const r = c.runIn;
  if (!r || r.state !== 'pending') return false;
  if (r.day < dayKey(now)) return true; // the day's turn wins, even over the kept one
  if (keep && r.encounterId.equals(keep)) return false;
  return now >= new Date(r.decideBy).getTime();
}

/** The read path's step 2 (tech design §3.3): luck takes a run-in past its window or its day. */
export async function ensureRunInSettled(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  keep?: Types.ObjectId | null,
): Promise<CharacterDoc> {
  if (!runInDue(c, now, keep) || !c.runIn) return c;
  const encounterId = c.runIn.encounterId;
  const asOf = luckAsOf(c.runIn);
  let attempts = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await inTransaction(
        (session) =>
          resolveInTx(content, session, {
            characterId: c._id,
            encounterId,
            choice: 'luck',
            by: 'auto',
            asOf,
            now,
            editionReadAt: null,
            txAttempts: () => attempts,
          }),
        () => {
          attempts += 1;
        },
      );
      break;
    } catch (err) {
      if (err instanceof VersionConflict) continue;
      throw err;
    }
  }
  return (await Character.findById(c._id).lean<CharacterDoc>()) ?? c;
}

/** `encounter.current`: the pending modal, or the resolved run-in's result until it is closed. */
export async function currentRunIn(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
}): Promise<{ pending: RunInPending } | { result: ActionResult } | null> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  const c = loaded.doc;
  if (!c.runIn) return null;
  const enc = await Encounter.findById(c.runIn.encounterId).lean<EncounterDoc>();
  if (!enc) return null;
  if (enc.state === 'resolved') return { result: await storedEncounterResult(enc) };
  return { pending: pendingView(deps.content, enc, c, now, loaded.city) };
}

/** `encounter.choose` (tech design §8.1): one keyed transaction around `resolveInTx`. */
export async function chooseRunIn(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { encounterId: string; choice: RunInChoice | 'luck'; idempotencyKey: string };
}): Promise<ActionResult> {
  const { content, input } = deps;
  const encounterId = new Types.ObjectId(input.encounterId);
  const loaded = await loadCharacter(deps.user, content, deps.now(), { keepRunIn: encounterId });
  const c0 = loaded.doc;
  const enc = await Encounter.findOne({ _id: encounterId, characterId: c0._id }).lean<EncounterDoc>();
  if (!enc) throw gameError('NOT_FOUND', 'NO_RUN_IN', { encounterId: input.encounterId });
  let attempts = 0;
  return withRequestKey<ActionResult>({
    characterId: c0._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'encounter.choose',
    input: { encounterId: input.encounterId, choice: input.choice },
    resettle: async () => {
      /* the run-in keeps its own day */
    },
    fn: (session) => {
      attempts += 1;
      return resolveInTx(content, session, {
        characterId: c0._id,
        encounterId,
        choice: input.choice,
        by: input.choice === 'luck' ? 'luck' : 'player',
        asOf: deps.now(),
        now: deps.now(),
        editionReadAt: loaded.editionReadAt,
        txAttempts: () => attempts,
      });
    },
  });
}

/** `encounter.close`: the result modal is closed (the pointer goes); the landing when you were sent on. */
export async function closeRunIn(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { encounterId: string };
}): Promise<{ character: CharacterView; landing: Landing | null }> {
  const { content } = deps;
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, content, now);
  const encounterId = new Types.ObjectId(deps.input.encounterId);
  const enc = await Encounter.findOne({ _id: encounterId, characterId: loaded.doc._id }).lean<EncounterDoc>();
  if (!enc) throw gameError('NOT_FOUND', 'NO_RUN_IN', { encounterId: deps.input.encounterId });
  await Character.updateOne(
    { _id: loaded.doc._id, 'runIn.encounterId': encounterId, 'runIn.state': 'resolved' },
    { $set: { runIn: null }, $inc: { version: 1 } },
  );
  const fresh = (await Character.findById(loaded.doc._id).lean<CharacterDoc>()) ?? loaded.doc;
  const result = enc.state === 'resolved' ? await storedEncounterResult(enc) : null;
  return {
    character: toCharacterView(fresh, now, content, loaded.editionReadAt, { city: loaded.city }),
    landing: result?.street?.sentTo?.landing ?? null,
  };
}


