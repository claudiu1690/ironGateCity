import { randomBytes } from 'node:crypto';
import { copy } from '@irongate/content/copy';
import type { CheckedAction, GameContent, LocatedAction } from '@irongate/content';
import { Character, City, Journey, Stay } from '@irongate/db';
import type { CharacterDoc, CityDoc, StayDoc, StayReason, StoredHeld } from '@irongate/db';
import {
  admit,
  arrest,
  arrestOnRecord,
  bailFor,
  closeOrders,
  computeCheck,
  dayKey,
  dayStart,
  deportation,
  dischargeSelf,
  HEALTH,
  healthFullAt,
  healthMax,
  healthNow,
  infirmaryPrice,
  priceLines,
  projectEnergy,
  projectHeat,
  RECORD,
  recordLevel,
  recordView,
  release,
  standingBonus,
  standingView,
  strikeOldest,
  tier1Difficulty,
  walkOut,
} from '@irongate/rules';
import { fadeDaysFor, lawModifiers } from './lawBook';
import type {
  ActionResult,
  ActionView,
  CellsNowView,
  DayKey,
  HeldSpec,
  HeldView,
  Landing,
  PoliticalResult,
  RiskAct,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import { journeyScheduler } from '../jobs/scheduler';
import { captureException } from '../sentry';
import type { SessionUser } from '../trpc/context';
import { computeTier1, writeTier1 } from './actionService';
import { ensureSettled, loadCharacter } from './dayService';
import { runKeyedAction, storedResult } from './keyedAction';
import { keySeed } from './keyGuard';
import { readPlace } from './place';
import { residenceCityId } from './residence';
import { withRequestKey } from './requestKey';
import { arrestsOf, barsLive, healthDoc, healthTimerOf, heatDoc, heatRateOn, heatTimerOf, marksOf } from './risk';
import { legMinutesBetween } from './travelService';
import { DayChanged, MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import { pickArt } from './art';
import { branchChannel, systemLine } from './chatOutbox';
import { t6 } from './togetherCopy';
import { signupLines } from './eventViews';
import { assetView, energyState, landingAt, fromOrdersState, toCharacterView, toOrdersState, wornStats } from './views';

/**
 * Slice 5 (ADR 0033, tech design §8.2): the cells and the infirmary. A stay is written inside the
 * transaction of the act that caused it (a mission, a run-in's resolution, a test hook); the read
 * path's step 3 (§3.3) releases or discharges it as of `until`; bail, *Walk out well* and *Discharge
 * yourself* release it now, with a request key. Release from the cells on rival ground is the train
 * home and a day's bar (design §11.5).
 */

/** The cells' or the infirmary's place in a city (`content.servicesOf`). */
export function heldPlace(content: GameContent, cityId: string, kind: 'cells' | 'infirmary') {
  const s = content.servicesOf(cityId);
  if (!s) throw new Error(`${cityId} has no ${kind}`);
  return kind === 'cells' ? s.cells : s.infirmary;
}

/**
 * Write the stay for a `HeldSpec` (from rules' `arrest` / `admit`) and return the character's `held`
 * pointer. `again`: a second arrest within seven City Days, or any earlier stay in the infirmary.
 */
export async function createStayInTx(
  content: GameContent,
  session: ClientSession,
  c: Pick<CharacterDoc, '_id'>,
  i: {
    cityId: string;
    held: HeldSpec;
    reason: StayReason;
    marks: number;
    heatAtArrest: number | null;
    logId: Types.ObjectId | null;
    encounterId: Types.ObjectId | null;
  },
): Promise<{ held: StoredHeld; stayId: Types.ObjectId; placeName: string; again: boolean }> {
  const place = heldPlace(content, i.cityId, i.held.kind);
  const today = dayKey(i.held.since);
  const earlier = await Stay.countDocuments({
    characterId: c._id,
    kind: i.held.kind,
    ...(i.held.kind === 'cells' ? { since: { $gte: new Date(dayStart(today - 6)) } } : {}),
  }).session(session);
  const stayId = new Types.ObjectId();
  const bail = i.held.bail ? { total: i.held.bail.total, lines: i.held.bail.lines.map((l) => ({ ...l })) } : null;
  await Stay.create(
    [
      {
        _id: stayId,
        characterId: c._id,
        kind: i.held.kind,
        cityId: i.cityId,
        locationId: place.location.id,
        rivalGround: i.held.rivalGround,
        reason: i.reason,
        logId: i.logId,
        encounterId: i.encounterId,
        since: new Date(i.held.since),
        until: new Date(i.held.until),
        minutes: i.held.minutes,
        heatAtArrest: i.heatAtArrest,
        marks: i.marks,
        again: earlier > 0,
        bail,
      },
    ],
    { session },
  );
  // Slice 6 (ADR 0039): the *taken in* / *admitted* line in the branch's chat, in this transaction.
  const who = c as Partial<CharacterDoc>;
  if (who.name && who.factionId) {
    const ch = branchChannel(content, who as CharacterDoc, i.cityId);
    await systemLine(session, {
      channel: ch.channel,
      factionId: who.factionId,
      cityId: ch.cityId,
      kind: i.held.kind === 'cells' ? 'takenIn' : 'admitted',
      payload: {
        name: who.name,
        characterId: c._id.toHexString(),
        place: place.location.name,
        iron: bail?.total ?? 0,
        until: i.held.until,
        n: i.held.minutes,
      },
      ref: stayId.toHexString(),
      dedupeKey: `held:${stayId.toHexString()}`,
      at: new Date(i.held.since),
    });
  }
  return {
    stayId,
    placeName: place.location.name,
    again: earlier > 0,
    held: {
      stayId,
      kind: i.held.kind,
      cityId: i.cityId,
      locationId: place.location.id,
      since: new Date(i.held.since),
      until: new Date(i.held.until),
      bail,
      rivalGround: i.held.rivalGround,
      state: 'in',
    },
  };
}

/** Whether the read path releases the character now. */
export const releaseDue = (c: Pick<CharacterDoc, 'held'>, now: number): boolean =>
  !!c.held && c.held.state === 'in' && new Date(c.held.until).getTime() <= now;

type ReleaseHow = 'served' | 'bail' | 'walkOut' | 'discharge';

/** The release modal (tech design §10.3), stored once on the stay. */
function releaseResult(
  content: GameContent,
  c: CharacterDoc,
  i: {
    act: RiskAct;
    stamp: string;
    headline: string;
    body: string;
    at: number;
    idempotencyKey: string;
    knockOns: Partial<PoliticalResult['knockOns']>;
    landing: Landing | { journey: true } | null;
    residenceCity: CityDoc | null;
  },
): PoliticalResult {
  const home = content.city(residenceCityId(c));
  const paper = home?.paper ?? { name: 'The paper', shortName: 'paper' };
  const place = content.city(c.held?.cityId ?? c.cityId);
  return {
    kind: 'political',
    act: i.act,
    stamp: { label: i.stamp, tone: 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: place?.id ?? c.cityId, cityName: place?.name ?? c.cityId },
    headline: i.headline,
    body: i.body,
    until: null,
    at: i.at,
    knockOns: { pc: null, morale: null, backers: null, ...i.knockOns },
    performedAt: new Date(i.at).toISOString(),
    idempotencyKey: i.idempotencyKey,
    character: toCharacterView(c, i.at, content, null, { city: i.residenceCity }),
    view: { kind: 'held', landing: i.landing },
  };
}

/**
 * Release or discharge inside the caller's transaction (ADR 0033 §3): the stay (`releasedAt: null`
 * guard) with its stored modal, the character (`held.state: 'in'` and the version), and on rival
 * ground the deportation journey and the bar. Returns the modal and the deportation's arrival time.
 */
export async function releaseInTx(
  content: GameContent,
  session: ClientSession,
  c: CharacterDoc,
  i: { how: ReleaseHow; at: number; idempotencyKey: string },
): Promise<{ result: PoliticalResult; deport: { journeyId: string; arrivesAt: number } | null }> {
  const h = c.held;
  if (!h || h.state !== 'in') throw new GameError('NOT_HELD');
  const stay = await Stay.findById(h.stayId).session(session).lean<StayDoc>();
  if (!stay || stay.releasedAt) throw new VersionConflict();
  // Slice 6 (ADR 0041): a mate posted the bail; the stay ends as of then, on the branch's Iron.
  const postedBy = i.how === 'served' && h.kind === 'cells' ? (stay.bailPostedBy ?? null) : null;
  const residenceCity = await City.findById(residenceCityId(c)).session(session).lean<CityDoc>();
  const rateOn = heatRateOn(content, residenceCity, c.factionId);
  const at = i.at;
  const max = healthMax(c.level);
  const set: Record<string, unknown> = { 'held.state': 'out' };
  const inc: Record<string, number> = { version: 1 };
  const knockOns: Partial<PoliticalResult['knockOns']> = {};
  const healthBefore = healthNow(healthTimerOf(c), at, c.level);
  const heatBefore = projectHeat(heatTimerOf(c), at, rateOn).value;
  let ironPaid = 0;
  let healthAfter = healthBefore;
  // Slice 7 (ADR 0044): *Walk out well* under the laws (Universal Care 100 → 50).
  const walkOutPrice = infirmaryPrice(HEALTH.walkOut.iron, lawModifiers(content, dayKey(at), c.factionId));
  let heatAfter: number | null = null;

  if (i.how === 'walkOut' || i.how === 'discharge') {
    const energy = energyState(c);
    const r =
      i.how === 'walkOut'
        ? walkOut({ energy, level: c.level, iron: c.iron, now: at, price: walkOutPrice })
        : dischargeSelf({ energy, level: c.level, health: healthTimerOf(c), now: at });
    if (!r.ok) {
      const p = projectEnergy(energy, at);
      throw new GameError(r.reason, { energy: p.value, cost: HEALTH.walkOut.energy, iron: c.iron, price: walkOutPrice });
    }
    set['energy.value'] = r.energy.value;
    set['energy.updatedAt'] = new Date(r.energy.updatedAt);
    set.rested = r.energy.rested;
    set.health = healthDoc(r.health);
    healthAfter = healthNow(r.health, at, c.level);
    knockOns.energy = { before: projectEnergy(energy, at).value, after: r.energy.value };
    if (i.how === 'walkOut') ironPaid = walkOutPrice;
  } else {
    const rel = release({ held: { kind: h.kind, rivalGround: h.rivalGround }, at, health: healthTimerOf(c) });
    if (rel.heat) {
      set.heat = heatDoc(rel.heat);
      heatAfter = rel.heat.value;
      knockOns.heat = { before: heatBefore, after: rel.heat.value };
    }
    if (i.how === 'bail') {
      ironPaid = h.bail?.total ?? 0;
      if (c.iron < ironPaid) throw new GameError('NOT_ENOUGH_IRON', { iron: c.iron, cost: ironPaid });
    }
  }
  if (ironPaid > 0) {
    inc.iron = -ironPaid;
    knockOns.iron = { before: c.iron, after: c.iron - ironPaid };
  }
  if (h.kind === 'infirmary') knockOns.health = { before: healthBefore, after: healthAfter, max };
  if (postedBy) knockOns.postedBy = { name: postedBy.name, iron: postedBy.iron };
  if (h.kind === 'cells') {
    // Review 4 #20 (answers §20.3, ADR 0078): *Your record: taken in · 1 mark · On file* (the marks
    // this arrest added, the live record after it) and *Orders off until the day turns*.
    if ((stay.marks ?? 0) > 0) {
      const rec = recordView(marksOf(c), dayKey(at), fadeDaysFor(c.factionId));
      knockOns.takenIn = { added: stay.marks, marks: rec.marks, level: rec.level };
    }
    if (ordersOffToday(c, dayKey(at))) knockOns.ordersOff = true;
  }

  // Design §11.5: from the cells on rival ground, the train home and a day's bar.
  let deport: { journeyId: string; arrivesAt: number } | null = null;
  let landing: Landing | { journey: true } | null = landingAt(content, h.cityId, h.locationId);
  let barredUntil: number | null = null;
  if (h.kind === 'cells' && h.rivalGround) {
    const home = residenceCityId(c);
    const minutes = legMinutesBetween(content, h.cityId, home);
    const d = deportation({ at, minutes });
    const id = new Types.ObjectId();
    const n = (c.journeysMade ?? 0) + 1;
    await Journey.create(
      [
        {
          _id: id,
          characterId: c._id,
          n,
          from: h.cityId,
          to: home,
          boardedAt: new Date(d.boardedAt),
          arrivesAt: new Date(d.arrivesAt),
          minutes,
          fare: { base: 0, lines: [], total: 0 },
          seed: randomBytes(16).toString('hex'),
          card: null,
          kind: 'deported',
          rivalGround: false,
          stayId: stay._id,
          choice: null,
          status: 'onTheWay',
          arrivedAt: null,
          closedAt: null,
          sleptThrough: false,
          firstToCapital: false,
        },
      ],
      { session },
    );
    set.journey = {
      id,
      from: h.cityId,
      to: home,
      boardedAt: new Date(d.boardedAt),
      arrivesAt: new Date(d.arrivesAt),
      status: 'onTheWay',
    };
    inc.journeysMade = 1;
    barredUntil = d.barredUntil;
    set.barred = [...barsLive(c, at).filter((b) => b.cityId !== h.cityId), { cityId: h.cityId, until: new Date(d.barredUntil) }];
    deport = { journeyId: id.toHexString(), arrivesAt: d.arrivesAt };
    landing = { journey: true };
    knockOns.barred = { cityId: h.cityId, cityName: content.city(h.cityId)?.name ?? h.cityId, until: d.barredUntil };
  }

  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version, 'held.stayId': h.stayId, 'held.state': 'in', ...(ironPaid > 0 ? { iron: { $gte: ironPaid } } : {}) },
    { $set: set, $inc: inc },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();

  const r = copy.risk;
  const cityName = content.city(h.cityId)?.name ?? h.cityId;
  const text =
    h.kind === 'cells'
      ? deport
        ? { act: 'deported' as const, stamp: r.deported.stamp, headline: r.deported.headline, body: r.deported.body(cityName) }
        : postedBy
          ? {
              act: 'released' as const,
              stamp: r.released.stamp,
              headline: t6('modal.releasedBail.headline', { name: postedBy.name }),
              body: t6('modal.releasedBail.body', { name: postedBy.name }),
            }
          : {
              act: i.how === 'bail' ? ('bail' as const) : ('released' as const),
              stamp: r.released.stamp,
              headline: r.released.headline,
              body: r.released.body,
            }
      : {
          act: i.how === 'walkOut' ? ('walkOut' as const) : ('discharged' as const),
          stamp: r.discharged.stamp,
          headline: i.how === 'walkOut' ? r.discharged.headlineWell : r.discharged.headline,
          body: r.discharged.body(healthAfter, max),
        };
  const result = releaseResult(content, updated, {
    ...text,
    at,
    idempotencyKey: i.idempotencyKey,
    knockOns,
    landing,
    residenceCity,
  });
  const done = await Stay.updateOne(
    { _id: stay._id, releasedAt: null },
    {
      $set: {
        releasedAt: new Date(at),
        how: postedBy ? 'bailPosted' : i.how,
        ironPaid,
        heatAfter,
        healthAfter,
        deportJourneyId: deport ? new Types.ObjectId(deport.journeyId) : null,
        barredUntil: barredUntil === null ? null : new Date(barredUntil),
        result,
      },
    },
    { session },
  );
  if (done.modifiedCount !== 1) throw new VersionConflict();
  return { result, deport };
}

/** Review 4 #20 (ADR 0078): today's orders are off since an arrest. */
const ordersOffToday = (c: Pick<CharacterDoc, 'orders'>, today: DayKey): boolean =>
  c.orders?.day === today && !!c.orders.off;

/** ADR 0025 §5: a deportation's train is scheduled after the commit, best effort. */
function scheduleDeport(deport: { journeyId: string; arrivesAt: number } | null, now: number): void {
  if (!deport || deport.arrivesAt <= now) return;
  void Promise.resolve()
    .then(() => journeyScheduler().arriveAt(deport.journeyId, new Date(deport.arrivesAt)))
    .catch((err: unknown) => captureException(err, { where: 'journey-arrive schedule', journeyId: deport.journeyId }));
}

/** The read path's step 3 (tech design §3.3): a stay that is over is released as of `until`. */
export async function ensureReleased(content: GameContent, c: CharacterDoc, now: number): Promise<CharacterDoc> {
  if (!releaseDue(c, now) || !c.held) return c;
  const at = new Date(c.held.until).getTime();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const r = await inTransaction(async (session) => {
        const fresh = await Character.findById(c._id).session(session).lean<CharacterDoc>();
        if (!fresh || !releaseDue(fresh, now)) return null;
        return releaseInTx(content, session, fresh, { how: 'served', at, idempotencyKey: '' });
      });
      if (r) scheduleDeport(r.deport, now);
      break;
    } catch (err) {
      if (err instanceof VersionConflict) continue;
      throw err;
    }
  }
  return (await Character.findById(c._id).lean<CharacterDoc>()) ?? c;
}

/** `held.bail` / `held.walkOut` / `held.discharge`: a paid way out now, with a request key. */
export async function payOut(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  how: 'bail' | 'walkOut' | 'discharge';
  input: { idempotencyKey: string };
}): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  let deport: { journeyId: string; arrivesAt: number } | null = null;
  const result = await withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: deps.input.idempotencyKey,
    kind: deps.how === 'bail' ? 'held.bail' : deps.how === 'walkOut' ? 'held.walkOut' : 'held.discharge',
    input: {},
    resettle: async () => {
      const fresh = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (!c.held || c.held.state !== 'in') throw new GameError('NOT_HELD');
      if (deps.how === 'bail' && c.held.kind !== 'cells') throw new GameError('NOT_IN_CELLS');
      if (deps.how !== 'bail' && c.held.kind !== 'infirmary') throw new GameError('NOT_IN_INFIRMARY');
      if (c.runIn?.state === 'pending') throw new GameError('RUN_IN_PENDING');
      const r = await releaseInTx(content, session, c, { how: deps.how, at: now, idempotencyKey: deps.input.idempotencyKey });
      deport = r.deport;
      return r.result;
    },
  });
  scheduleDeport(deport, deps.now());
  return result;
}

/** The held tap as a located checked action (`content.heldAction`), at the held place. */
function heldLocated(content: GameContent, c: Pick<CharacterDoc, 'held'>): LocatedAction {
  const h = c.held!;
  const at = heldPlace(content, h.cityId, h.kind);
  const spec = content.heldAction(h.kind);
  const action = {
    id: spec.id,
    name: spec.name,
    tier: 1,
    type: spec.type,
    energy: spec.energy,
    stats: spec.stats,
    givesFxp: false,
    givesOpinion: false,
    text: spec.text,
  } as unknown as CheckedAction;
  return { city: at.city, location: at.location, action } as LocatedAction;
}

/** The held tap's ticket (*Listen to the cells* / *Talk to the ward*). */
function heldTapView(content: GameContent, c: CharacterDoc): ActionView {
  const located = heldLocated(content, c);
  const a = located.action as CheckedAction;
  const successes = c.localStanding.find((x) => x.cityId === located.city.id)?.successes ?? 0;
  const label = `${content.standingNames[standingView(successes).level] ?? 'Known'} in ${located.city.name}`;
  const standing = standingBonus(successes, label);
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    kind: 'checked',
    givesFxp: false,
    energy: a.energy,
    energy3: null,
    preview: computeCheck({
      stats: a.stats,
      values: wornStats(c, content),
      difficulty: tier1Difficulty(located.city.role),
      bonuses: standing ? [standing] : [],
    }),
    order: null,
    locked: null,
    tags: [],
    placeTags: [],
  };
}

/** `held.act`: the cell's or the ward's one tap (no run-in), through the tier-1 write. */
export async function heldAct(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { idempotencyKey: string };
}): Promise<ActionResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  const stored = () => storedResult<ActionResult>(c0._id, input.idempotencyKey, (log) => log.actionId.startsWith('held.'));
  return runKeyedAction<ActionResult>({
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
      const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      if (!c.held || c.held.state !== 'in') throw new GameError('NOT_HELD');
      if (c.runIn?.state === 'pending') throw new GameError('RUN_IN_PENDING');
      const located = heldLocated(content, c);
      const ctx = await readPlace(content, session, c, located, today);
      const seed = keySeed(c._id, input.idempotencyKey);
      const r = computeTier1({ content, c, located, action: located.action as CheckedAction, ctx, times: 1, now, seed });
      if (!r.ok) {
        throw new GameError('NOT_ENOUGH_ENERGY', { energy: r.energy.value, cost: r.cost, times: 1, nextTickAt: r.energy.nextTickAt });
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
        editionReadAt: loaded.editionReadAt,
        txAttempts,
      });
    },
  });
}

/** `held.get`: the cells or the infirmary (tech design §8.3), or null when not held. */
export async function getHeld(deps: { user: SessionUser; content: GameContent; now: () => number }): Promise<HeldView | null> {
  const { content } = deps;
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, content, now);
  const c = loaded.doc;
  const h = c.held;
  if (!h) return null;
  const stay = await Stay.findById(h.stayId).lean<StayDoc>();
  const place = content.location(h.locationId);
  const city = content.city(h.cityId);
  const max = healthMax(c.level);
  const hp = healthNow(healthTimerOf(c), now, c.level);
  const energy = projectEnergy(energyState(c), now);
  const cells = h.kind === 'cells';
  const walkOutPriceToday = infirmaryPrice(HEALTH.walkOut.iron, lawModifiers(content, dayKey(now), c.factionId));
  return {
    stayId: h.stayId.toHexString(),
    kind: h.kind,
    state: h.state,
    cityId: h.cityId,
    cityName: city?.name ?? h.cityId,
    locationId: h.locationId,
    placeName: place?.location.name ?? h.locationId,
    since: new Date(h.since).getTime(),
    until: new Date(h.until).getTime(),
    serverNow: now,
    rivalGround: h.rivalGround,
    again: stay?.again ?? false,
    bail:
      cells && h.bail
        ? {
            total: h.bail.total,
            lines: h.bail.lines.map((l) => ({ id: l.id, label: l.label, pct: l.pct })),
            affordable: c.iron >= h.bail.total,
            legalAid: h.bail.lines.some((l) => l.id === 'legalAid'),
          }
        : null,
    walkOut: cells
      ? null
      : {
          energy: HEALTH.walkOut.energy,
          iron: walkOutPriceToday,
          affordable: energy.value >= HEALTH.walkOut.energy && c.iron >= walkOutPriceToday,
        },
    discharge: cells
      ? null
      : {
          energy: HEALTH.discharge.energy,
          healthTo: Math.max(Math.floor(max * HEALTH.discharge.share), hp),
          affordable: energy.value >= HEALTH.discharge.energy,
        },
    health: { value: hp, max, fullAt: hp >= max ? null : healthFullAt(healthTimerOf(c), now) },
    tap: heldTapView(content, c),
    // Phase C: the screen's picture and the voice beside its one line (screens §6, §7).
    ...(place && city ? { art: pickArt(content, city, place.location, now) } : {}),
    voice: assetView(content, cells ? 'portrait.duty-officer' : 'portrait.matron'),
    release: h.state === 'out' ? ((stay?.result as PoliticalResult | null) ?? null) : null,
    election: null,
    paperUnread: loaded.editionReadAt === null ? 1 : 0,
    ...(cells ? { ordersOff: ordersOffToday(c, dayKey(now)) } : {}),
    // Slice 6 (tech design §8.3): the ward's visitors, the mate who posted bail, the sign-ups held over.
    visits: (stay?.visits ?? []).map((v) => ({ name: v.name, at: new Date(v.at).getTime() })),
    postedBy: stay?.bailPostedBy ? { name: stay.bailPostedBy.name } : null,
    signups: (await signupLines(content, c)).map((x) => ({ roleName: x.roleName, eventName: x.eventName, event: x.event, startsAt: x.startsAt })),
  };
}

/**
 * `held.inCells` (review 4 #19, ADR 0078): *In the cells now* on a police station's sheet, any
 * party, read through the `held_cells_now` partial index. A stay past its `until` but not yet
 * released (release is lazy) is not shown. Public fields only; the viewer's own row is *you*.
 */
export async function cellsNow(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { locationId: string };
}): Promise<CellsNowView> {
  const { content } = deps;
  const located = content.location(deps.input.locationId);
  const station = located ? content.servicesOf(located.city.id)?.cells.location.id : undefined;
  if (!located || station !== deps.input.locationId) {
    throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId: deps.input.locationId });
  }
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, content, now);
  const rows = await Character.find(
    {
      'held.state': 'in',
      'held.kind': 'cells',
      'held.locationId': deps.input.locationId,
      'held.until': { $gt: new Date(now) },
    },
    { name: 1, avatarId: 1, factionId: 1, 'held.until': 1, 'held.bail': 1 },
  )
    .sort({ 'held.until': 1 })
    .limit(50)
    .hint('held_cells_now')
    .lean<Array<Pick<CharacterDoc, '_id' | 'name' | 'avatarId' | 'factionId' | 'held'>>>();
  return {
    rows: rows.map((r) => ({
      name: r.name,
      avatar: r.avatarId ? assetView(content, r.avatarId) : null,
      factionId: r.factionId,
      until: new Date(r.held!.until).getTime(),
      you: r._id.equals(loaded.doc._id),
      // Slice 6 (ADR 0041): *Post bail* on a faction mate's row; a posted bail moved `until` to then.
      mate:
        r.factionId === loaded.doc.factionId && !r._id.equals(loaded.doc._id) && r.held?.bail
          ? { characterId: r._id.toHexString(), iron: r.held.bail.total }
          : null,
    })),
    serverNow: now,
  };
}

/** `held.close`: the release modal closed; the pointer goes; where Continue lands. */
export async function closeHeld(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { stayId: string };
}): Promise<{ landing: Landing | { journey: true }; character: ReturnType<typeof toCharacterView> }> {
  const { content } = deps;
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, content, now);
  const stayId = new Types.ObjectId(deps.input.stayId);
  const stay = await Stay.findOne({ _id: stayId, characterId: loaded.doc._id }).lean<StayDoc>();
  if (!stay) throw gameError('NOT_FOUND', 'NOT_HELD', { stayId: deps.input.stayId });
  if (!stay.releasedAt) throw gameError('PRECONDITION_FAILED', 'HELD', { until: stay.until.getTime() });
  await inTransaction(async (session) => {
    await Stay.updateOne({ _id: stayId, closedAt: null }, { $set: { closedAt: new Date(now) } }, { session });
    await Character.updateOne(
      { _id: loaded.doc._id, 'held.stayId': stayId, 'held.state': 'out' },
      { $set: { held: null }, $inc: { version: 1 } },
      { session },
    );
  });
  const fresh = (await Character.findById(loaded.doc._id).lean<CharacterDoc>()) ?? loaded.doc;
  const landing: Landing | { journey: true } = stay.deportJourneyId
    ? { journey: true }
    : landingAt(content, stay.cityId, stay.locationId);
  return { landing, character: toCharacterView(fresh, now, content, loaded.editionReadAt, { city: loaded.city }) };
}

/** `record.strike` (design §7.3): the oldest live mark struck off for 30 Political Capital. */
export async function strikeMark(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { idempotencyKey: string };
}): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: deps.input.idempotencyKey,
    kind: 'record.strike',
    input: {},
    resettle: async () => {
      const fresh = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      const struck = strikeOldest(marksOf(c), today, fadeDaysFor(c.factionId));
      if (!struck) throw new GameError('NO_MARKS');
      if (c.pc < RECORD.strikePc) throw new GameError('NOT_ENOUGH_PC', { pc: c.pc, cost: RECORD.strikePc });
      const before = recordView(marksOf(c), today, fadeDaysFor(c.factionId));
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, pc: { $gte: RECORD.strikePc } },
        { $set: { 'record.marks': struck.marks }, $inc: { pc: -RECORD.strikePc, version: 1 } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const after = recordView(struck.marks, today, fadeDaysFor(c.factionId));
      const residenceCity = await City.findById(residenceCityId(c)).session(session).lean<CityDoc>();
      const home = content.city(residenceCityId(c));
      const paper = home?.paper ?? { name: 'The paper', shortName: 'paper' };
      const view = toCharacterView(updated, now, content, null, { city: residenceCity });
      return {
        kind: 'political',
        act: 'strike',
        stamp: { label: copy.risk.struck.stamp, tone: 'success' },
        paper: { name: paper.name, shortName: paper.shortName },
        place: { cityId: home?.id ?? c.cityId, cityName: home?.name ?? c.cityId },
        headline: copy.risk.struck.headline,
        body: copy.risk.struck.body(after.marks),
        until: null,
        at: now,
        knockOns: {
          pc: { before: c.pc, after: updated.pc },
          morale: null,
          backers: null,
          record: { before: { level: before.level, marks: before.marks }, after: { level: after.level, marks: after.marks } },
        },
        performedAt: new Date(now).toISOString(),
        idempotencyKey: deps.input.idempotencyKey,
        character: view,
        view: { kind: 'record', record: view.record! },
      };
    },
  });
}


/**
 * Tech design §8.5 (`POST /api/test/held`): send the character to the cells or the infirmary of the
 * city they are in now, with the rules' sentence and bail (reason `dev`). Test hooks and server tests.
 */
export async function sendToHeld(
  content: GameContent,
  characterId: Types.ObjectId,
  kind: 'cells' | 'infirmary',
  now: number,
): Promise<void> {
  await inTransaction(async (session) => {
    const c = await Character.findById(characterId).session(session).lean<CharacterDoc>();
    if (!c) throw new Error('character disappeared');
    if (c.held?.state === 'in') return;
    const today = dayKey(now);
    const located = heldLocated(content, { ...c, held: { kind, cityId: c.cityId } as StoredHeld });
    const ctx = await readPlace(content, session, c, located, today);
    const rival = ctx.rival !== null;
    const set: Record<string, unknown> = {};
    let spec: HeldSpec;
    let heatAt: number | null = null;
    let added = 0;
    if (kind === 'cells') {
      heatAt = projectHeat(heatTimerOf(c), now, heatRateOn(content, ctx.residenceCity, c.factionId)).value;
      // Review 4 #20 (ADR 0078): the hook writes what an arrest writes: the mark (one minor, or three
      // serious within seven days of an earlier arrest), the arrest's day, and the day's orders off.
      const rec = arrestOnRecord({ marks: marksOf(c), arrests: arrestsOf(c), today, logId: null, fadeDaysOn: fadeDaysFor(c.factionId) });
      added = rec.added.length;
      set.record = { marks: rec.marks, arrests: rec.arrests };
      const orders = toOrdersState(c.orders);
      if (orders.day === today) set.orders = fromOrdersState(closeOrders(orders, now));
      const marks = rec.marks.length;
      const bail = bailFor({
        marks,
        notorious: recordLevel(marks) === 'notorious',
        rivalGround: rival,
        alliance: c.factionId === 'alliance',
        sources: priceLines(ctx.modifiers, 'bailPct'),
      });
      spec = arrest({ at: now, heat: heatAt, rivalGround: rival, bail });
    } else {
      const a = admit({ at: now, level: c.level, rivalGround: rival });
      spec = a.held;
      set.health = healthDoc(a.health);
    }
    const stay = await createStayInTx(content, session, c, {
      cityId: c.cityId,
      held: spec,
      reason: 'dev',
      marks: added,
      heatAtArrest: heatAt,
      logId: null,
      encounterId: null,
    });
    const done = await Character.updateOne(
      { _id: c._id, version: c.version },
      { $set: { ...set, held: stay.held }, $inc: { version: 1 } },
      { session },
    );
    if (done.modifiedCount !== 1) throw new VersionConflict();
  });
}

/** Tech design §8.5 (`{ releaseNow: true }`): the stay ends now (the next read releases it). */
export async function releaseHeldNow(characterId: Types.ObjectId, now: number): Promise<void> {
  const c = await Character.findById(characterId).lean<CharacterDoc>();
  if (!c?.held || c.held.state !== 'in') return;
  await Character.updateOne({ _id: characterId, 'held.state': 'in' }, { $set: { 'held.until': new Date(now) } });
  await Stay.updateOne({ _id: c.held.stayId, releasedAt: null }, { $set: { until: new Date(now) } });
}
