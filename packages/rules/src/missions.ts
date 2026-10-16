import { computeCheck, outcomeForRoll } from './check';
import {
  DIRECTIVES,
  HEALTH,
  MISSION_LADDER,
  MISSION_TYPES,
  PATRON,
  PATRON_TIERS,
  RIVAL_GROUND,
  SOCIETY,
} from './constants';
import type { MissionType, PatronTier } from './constants';
import type { DayKey } from './day';
import { projectEnergy, spendEnergy } from './energy';
import type { EnergyProjection, EnergyState } from './energy';
import { admit, arrest, bailFor, policeLossHealth } from './held';
import type { HeldSpec } from './held';
import { healthMax, healthNow } from './health';
import type { HealthTimer } from './health';
import { addHeat, heatGainAt, heatState } from './heat';
import type { HeatChange, HeatTimer } from './heat';
import { issueTags, pointsFor } from './issues';
import {
  NO_MODIFIERS,
  missionEnergy,
  ordinanceCheckBonuses,
  placeCheckBonuses,
  placeOf,
  restedCapFor,
  rewardShares,
  rivalGroundIn,
  runInPcts,
  standingPerSuccess,
  swingFactors,
} from './ordinances';
import type { Modifiers, PriceLine, SwingFactor } from './ordinances';
import { advanceOrders, closeOrders } from './orders';
import type { MatchCtx } from './orders';
import { barredByRecord, liveMarks, marksFor, recordArrest, recordLevel } from './record';
import type { Mark, RecordLevel } from './record';
import { ORDER_PART, computeRewards, roundHalfUp } from './rewards';
import type { LineShare } from './rewards';
import { createRng } from './rng';
import type { Rng } from './rng';
import { personalShares } from './personal';
import type { PersonalModifiers } from './personal';
import { pickOpponent, runInChance } from './runIn';
import type { CaughtResult, DayFlags, RunInOutcome } from './runIn';
import { standingBonus, standingView } from './standing';
import { FACTION_IDS } from './types';
import type {
  ActionAttempt,
  ActionDescriptor,
  CheckBonus,
  CheckBreakdown,
  CheckStatSpec,
  CityRole,
  FactionId,
  OpinionShares,
  OrderTemplate,
  OrdersState,
  Outcome,
  RewardLine,
  RewardPart,
  Rewards,
  Stats,
  TrainableStat,
} from './types';

/**
 * Missions (tier 2; GDD §13.1–§13.3, design §4–§5, ADR 0031): the ladder, the target, the gates, the
 * risk line and one pure resolver. `resolveMission` spends the Energy, makes the check, adds the
 * Heat and rolls the run-in; `finishMission` applies the street (the run-in, the caught check, the
 * record, the cells or the infirmary). Both deterministic per seed.
 */

export type MissionLevel = 6 | 8 | 10 | 12;

/** §8.4 (design §4.3, §23.1 #1): 14 / 16 / 18 / 20 by the mission's Level, +2 in the capital. */
export function missionDifficulty(level: MissionLevel, role: CityRole): number {
  return MISSION_LADDER[level] + (role === 'battleground' ? MISSION_LADDER.battlegroundStep : 0);
}

/**
 * Design §4.1: the faction a mission is against. `leader` (the capital) is the district's leader at
 * the boundary, or, when that is the actor's own, the next faction by share (ties in FACTION_IDS
 * order). A named faction is itself; a legal mission has none.
 */
export function missionTarget(
  target: FactionId | 'leader' | undefined,
  actor: FactionId,
  district: { leader: FactionId | null; shares: OpinionShares } | null,
): FactionId | null {
  if (target === undefined) return null;
  if (target !== 'leader') return target;
  if (!district) return null;
  const byShare = [...FACTION_IDS].sort(
    (a, b) => Math.round(district.shares[b] * 1_000) - Math.round(district.shares[a] * 1_000),
  );
  const leader = district.leader ?? byShare[0]!;
  return leader !== actor ? leader : byShare.find((f) => f !== actor)!;
}

/** Design §4.1: a mission against a faction is hidden from that faction's members. */
export const offeredTo = (target: FactionId | null, actor: FactionId): boolean => target !== actor;

export interface MissionGateInput {
  level: number;
  rank: number;
  standingLevel: number;
  record: RecordLevel;
  mission: {
    level: number;
    requires?: { rank?: number; standing?: number; patron?: { id: string; tier: 'associate' } };
    /** Slice 8 (design §3.7): a society call's Charisma figure. */
    society?: { needs: number };
  };
  place: { kind: string; factionId?: FactionId };
  /** Slice 8 (design §3.7, §21.1 Q11): a society call's door, read at the tap. */
  social?: { wornCha: number; calledToday: boolean; wanted: boolean };
  /** Slice 8 (design §5.4): the actor's tier with the introduction's patron (null: none yet). */
  patronTier?: PatronTier | null;
}

/** Slice 5's four, then slice 8's: a patron's introduction and a society call's door. */
export type MissionGateReason =
  | 'LEVEL'
  | 'RANK'
  | 'STANDING'
  | 'RECORD'
  | 'NEEDS_ASSOCIATE'
  | 'WANTED'
  | 'NOT_DRESSED'
  | 'CALLED_TODAY';

/**
 * Design §4.1, §4.7: the first unmet gate (*From Level 8* · *Organisers and above* · *Needs a Known
 * reputation here* · *Not with your record*), or null. Slice 8: a patron's introduction needs
 * Associate (`NEEDS_ASSOCIATE`, `need` the Favour); a society call is barred while Wanted, below its
 * figure minus 10 (`NOT_DRESSED`, `need` the door) and once a day per place (`CALLED_TODAY`).
 */
export function missionGate(i: MissionGateInput): { reason: MissionGateReason; need: number } | null {
  if (i.level < i.mission.level) return { reason: 'LEVEL', need: i.mission.level };
  const rank = i.mission.requires?.rank;
  if (rank !== undefined && i.rank < rank) return { reason: 'RANK', need: rank };
  const standing = i.mission.requires?.standing;
  if (standing !== undefined && i.standingLevel < standing) return { reason: 'STANDING', need: standing };
  if (barredByRecord(i.record, i.place)) return { reason: 'RECORD', need: 0 };
  const patron = i.mission.requires?.patron;
  if (patron && !tierAtLeast(i.patronTier ?? null, patron.tier))
    return { reason: 'NEEDS_ASSOCIATE', need: tierFavour(patron.tier) };
  if (i.mission.society && i.social) {
    if (i.social.wanted) return { reason: 'WANTED', need: 0 };
    const door = societyDoor(i.mission.society.needs);
    if (i.social.wornCha < door) return { reason: 'NOT_DRESSED', need: door };
    if (i.social.calledToday) return { reason: 'CALLED_TODAY', need: 0 };
  }
  return null;
}

/** Design §3.6: a society call's door, ten under its Charisma figure (*needs Charisma 10 at the door*). */
export const societyDoor = (needs: number): number => Math.max(0, needs - SOCIETY.doorBelow);

const tierFavour = (t: PatronTier): number => PATRON.tiers.find(([id]) => id === t)?.[1] ?? 0;
const tierAtLeast = (has: PatronTier | null, need: PatronTier): boolean =>
  has !== null && PATRON_TIERS.indexOf(has) >= PATRON_TIERS.indexOf(need);

/** A way to do a mission (content `Way`): its stat, and a louder way's own Heat or run-in base. */
export interface WaySpec {
  id: string;
  stats: CheckStatSpec;
  heat?: number;
  runIn?: number;
}

/** §8.4 at the mission's difficulty with the place's rows (Standing, close race on speech, rival ground). */
export function wayCheck(i: {
  way: Pick<WaySpec, 'stats'>;
  values: Stats;
  difficulty: number;
  bonuses: CheckBonus[];
  prefer?: TrainableStat;
}): CheckBreakdown {
  return computeCheck({
    stats: i.way.stats,
    values: i.values,
    difficulty: i.difficulty,
    bonuses: i.bonuses,
    ...(i.prefer ? { prefer: i.prefer } : {}),
  });
}

/**
 * The check of a way exactly as `resolveMission` makes it, so the ticket's preview and the start
 * share one computation (tech design §8.3): the caller's rows (the *First day* row), Local Standing
 * (*Known in Coalport*), then the sources' `chancePct` rows and the place's rows (the close race on a
 * speech mission, *Rival ground*), all by the type the mission is seen as (design §23.1 #6, #15).
 */
export function missionCheck(i: {
  type: MissionType;
  difficulty: number;
  way: Pick<WaySpec, 'stats'>;
  values: Stats;
  prefer?: TrainableStat;
  /** Successes so far in this city; label "Known in Coalport". */
  standing: { successes: number; names: readonly string[]; cityName: string };
  bonuses?: readonly CheckBonus[];
  modifiers?: Modifiers;
}): CheckBreakdown {
  const m = i.modifiers ?? NO_MODIFIERS;
  const seenAs = MISSION_TYPES[i.type].seenAs;
  const label = `${i.standing.names[standingView(i.standing.successes).level] ?? 'Known'} in ${i.standing.cityName}`;
  const standing = standingBonus(i.standing.successes, label);
  return wayCheck({
    way: i.way,
    values: i.values,
    difficulty: i.difficulty,
    bonuses: [
      ...(i.bonuses ?? []),
      ...(standing ? [standing] : []),
      ...ordinanceCheckBonuses(seenAs, m),
      ...placeCheckBonuses(seenAs, m),
    ],
    ...(i.prefer ? { prefer: i.prefer } : {}),
  });
}

/** Design §4.7: the way with the best chance for this player; ties go to content order. */
export function suggestedWay(
  ways: ReadonlyArray<{ id: string }>,
  checks: ReadonlyArray<{ chance: number }>,
): string {
  let best = 0;
  checks.forEach((c, i) => {
    if (c.chance > checks[best]!.chance) best = i;
  });
  return ways[best]!.id;
}

/** A way's Agility row: a single-stat AGI check (design §4.1: *Agility +¼* on a Success). */
export const isAgilityWay = (w: Pick<WaySpec, 'stats'>): boolean => w.stats.length === 1 && w.stats[0] === 'agi';

/**
 * Design §4.7: the ticket's risk line for this player, here, today: the Heat the attempt adds (×2 on
 * rival ground), the run-in chance after that gain, and the marks if caught.
 */
export function missionRisk(i: {
  type: MissionType;
  way: Pick<WaySpec, 'heat' | 'runIn'>;
  rivalGround: boolean;
  heat: number;
  record: RecordLevel;
  flags: DayFlags;
  /** Review 5 (ADR 0080): night at the read; on rival ground the run-in gains +10. */
  night?: boolean;
  /** Slice 7 (ADR 0044): the laws' run-in percentages at the read (`runInPcts`). */
  pcts?: readonly number[];
  /** Slice 8 (design §3.6): recognition on rival ground, so the ticket's line is the start's. */
  recognition?: number;
}): { heat: number; runInChance: number; marks: 0 | 1 | 2 | 3 } {
  const spec = MISSION_TYPES[i.type];
  const heat = (i.way.heat ?? spec.heat) * (i.rivalGround ? RIVAL_GROUND.heatFactor : 1);
  const runIn = runInChance({
    base: i.way.runIn ?? spec.runIn,
    tier: 2,
    rivalGround: i.rivalGround,
    heatState: heatState(Math.min(100, i.heat + heat)),
    record: i.record,
    flags: i.flags,
    ...(i.night !== undefined ? { night: i.night } : {}),
    ...(i.pcts ? { pcts: i.pcts } : {}),
    ...(i.recognition !== undefined ? { recognition: i.recognition } : {}),
  });
  return { heat, runInChance: runIn, marks: spec.marks };
}

export type RiskBand = 'safe' | 'littleRisk' | 'risky' | 'dangerous';

/** Design §4.7: *Safe* 0 % · *A little risk* 1–10 · *Risky* 11–24 · *Dangerous* 25 and over. */
export function riskBand(chance: number): RiskBand {
  if (chance <= 0) return 'safe';
  if (chance <= 10) return 'littleRisk';
  if (chance <= 24) return 'risky';
  return 'dangerous';
}

export type OddsBand = 'good' | 'fair' | 'long';

/** Good odds 70 % and above, Fair odds 50–69 %, Long shot under 50 % (answers §2.2). */
export function oddsBand(chance: number): OddsBand {
  return chance >= 70 ? 'good' : chance >= 50 ? 'fair' : 'long';
}

/** Review 5 (answers §12.1, ADR 0080): a mission's or a way's window. */
export type ContentWindow = 'night';

/**
 * Review 5 (tech design §7.2, ADR 0080): a night window closed by day: the mission's own, else the
 * way's. `opensAt` is the next dusk. Null at night, or with no window.
 */
export function windowLock(i: {
  mission: { window?: ContentWindow };
  way?: { window?: ContentWindow };
  night: { night: boolean; nextDusk: number };
}): { lock: 'NIGHT'; opensAt: number } | null {
  if (i.night.night) return null;
  if (i.mission.window === 'night' || i.way?.window === 'night') return { lock: 'NIGHT', opensAt: i.night.nextDusk };
  return null;
}

/** Review 5 (answers §12.1, §18 Q1): a night mission's Iron +25 % of its base, never Party XP. */
export const NIGHT_RATE = { ironPct: 25 } as const;
export const NIGHT_RATE_PART = { id: 'nightRate', label: 'Night rate' } as const;

/** The record's Iron line on a mission (design §7.3): *your record −6*. */
export const RECORD_PART = { id: 'record', label: 'Your record' } as const;

/**
 * Design §4.2 (GDD §5.5 tier 2): 5 XP, 0.8 Party XP and 4 Iron per Energy; Partial half per line;
 * Failure a fifth of the XP only (Rested still on that XP). Theft's Iron ×2 and no opinion; the
 * illegal types' opinion ×2. The record's penalty is a negative Iron share.
 */
export function tier2Rewards(i: {
  type: MissionType;
  energy: number;
  outcome: Outcome;
  restedUsed: number;
  costPaid?: number;
  fxpBonusShare?: number;
  fxpShares?: readonly LineShare[];
  ironShares?: readonly LineShare[];
  /** Slice 7 (ADR 0044): a law's `xpPct` (scope missions). */
  xpShares?: readonly LineShare[];
  opinionFactors?: readonly SwingFactor[];
  /** The record's Iron penalty, −10 / −20 / −30 (0: none). */
  recordIronPct?: number;
  /** Review 5 (ADR 0080): a night mission (its own window): the night rate on the Iron. */
  nightRate?: boolean;
}): Rewards {
  const spec = MISSION_TYPES[i.type];
  const ironShares = [
    ...(i.ironShares ?? []),
    // Before the record's cut (tech design §7.2).
    ...(i.nightRate ? [{ ...NIGHT_RATE_PART, share: NIGHT_RATE.ironPct / 100 }] : []),
    ...(i.recordIronPct ? [{ ...RECORD_PART, share: i.recordIronPct / 100 }] : []),
  ];
  return withAllParts(
    computeRewards({
      tier: 2,
      energy: i.energy,
      outcome: i.outcome,
      givesFxp: spec.givesFxp,
      givesOpinion: spec.opinion !== null,
      restedUsed: i.restedUsed,
      ...(i.costPaid !== undefined ? { costPaid: i.costPaid } : {}),
      fxpBonusShare: i.fxpBonusShare ?? 0,
      fxpShares: i.fxpShares ?? [],
      ironShares,
      ...(i.xpShares && i.xpShares.length > 0 ? { xpShares: i.xpShares } : {}),
      ...(i.opinionFactors && i.opinionFactors.length > 0 ? { opinionFactors: i.opinionFactors } : {}),
      ironMultiplier: spec.ironMult,
      opinionMultiplier: spec.opinionMult || 1,
    }),
  );
}

/**
 * Tier-2 results always name their parts (there is no slice-1 shape to keep): Rested and the Party
 * order are made explicit where computeRewards folded them into `bonus`.
 */
function withAllParts(r: Rewards): Rewards {
  const fill = (line: RewardLine, classic: RewardPart[]): RewardLine => {
    if (line.parts || line.bonus === 0) return { ...line, ...(line.parts ? { parts: [...line.parts] } : {}) };
    const named = classic.filter((p) => p.amount !== 0);
    return { ...line, parts: named.length > 0 ? named : [{ id: 'rested', label: 'Rested', amount: line.bonus }] };
  };
  const one = (id: string, label: string, amount: number): RewardPart[] => [{ id, label, amount }];
  return {
    ...r,
    xp: fill(r.xp, one('rested', 'Rested', r.xp.bonus)),
    fxp: fill(r.fxp, one('order', 'Party order', r.fxp.bonus)),
    iron: fill(r.iron, one('rested', 'Rested', r.iron.bonus)),
  };
}

export interface OrdersAdvance {
  after: OrdersState;
  /** The template this attempt advanced (it got the +25 % FXP), or null. */
  advanced: string | null;
  completed: string[];
  allDone: boolean;
}

/** The mission as the rules need it (content `Mission` at its place). */
export interface MissionSpec {
  id: string;
  type: MissionType;
  /** The content Energy (the type's): rewards are computed on it. */
  energy: number;
  difficulty: number;
  locationId: string;
  cityId: string;
  /** The location's quarter (a capital district) and kind, for Issue feeds and orders. */
  districtId?: string;
  locationKind?: string;
  pool: readonly string[];
}

export interface MissionInput {
  mission: MissionSpec;
  way: WaySpec;
  values: Stats;
  prefer?: TrainableStat;
  energy: EnergyState;
  now: number;
  restedCap?: number;
  /** Successes so far in this city; label "Known in Coalport". */
  standing: { successes: number; names: readonly string[]; cityName: string };
  orders: OrdersState;
  orderTemplates: readonly OrderTemplate[];
  homeCityId: string;
  residence?: MatchCtx;
  factionId: FactionId;
  modifiers?: Modifiers;
  bonuses?: CheckBonus[];
  /** The resolved target (`missionTarget`) of an `against` type; null otherwise. */
  target: FactionId | null;
  heat: HeatTimer;
  /** The residence city's cooling rate of a day (design §23.1 #8). */
  rateOn: (day: DayKey) => number;
  record: RecordLevel;
  flags: DayFlags;
  opponents: { sideOf: (id: string) => FactionId | 'police'; policeId: string };
  /** Test hooks (tech design §8.5): the check's roll, the run-in, the opponent. */
  force?: { checkRoll?: number; runIn?: 'next' | 'never'; opponentId?: string };
  /** Review 5 (ADR 0080): night at the act; on rival ground the run-in +10 and the police half. */
  night?: boolean;
  /** Review 5 (ADR 0080): the mission's own window is the night: the night rate on its Iron. */
  nightRate?: boolean;
  /** Slice 7 (design §8, ADR 0050): the party controlling the place (a district, Clearwater): rivals' Heat +25 %. */
  controlledBy?: FactionId | null;
  /**
   * Slice 8 (ADR 0052, 0088; T9): what is worn, the perks and the bar's buffs: the Party XP parts and
   * the buff shares at the start (the item rows come in through `bonuses`, as the ticket's).
   */
  personal?: PersonalModifiers;
  /** Slice 8 (design §3.6, ADR 0052): `recognition().total` on rival ground, into the run-in's chance. */
  recognition?: number;
}

/** The pure start of a mission, stored in the encounter while a run-in is pending (ADR 0032). */
export interface MissionStart {
  seed: string;
  missionId: string;
  wayId: string;
  tier: 2;
  type: MissionType;
  rivalGround: boolean;
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
  attempt: ActionAttempt;
  /** As rolled, and the dropped twin (Failure's XP only: a Run or a loss). */
  rewards: { rolled: Rewards; dropped: Rewards };
  /** Issue momentum as rolled (0 on a Failure); none for the illegal types. */
  points: number;
  issues: Array<{ docId: string; issueId: string; name: string; points: number }>;
  descriptor: ActionDescriptor;
  orders: { before: OrdersState; rolled: OrdersAdvance; dropped: OrdersAdvance };
  standing: { before: number; rolled: number; dropped: number };
  heat: HeatChange;
  opinion: {
    mode: 'persuade' | 'against' | null;
    target: FactionId | null;
    swing: { rolled: number; dropped: 0 };
    factors: SwingFactor[];
    /** On rival ground against the home faction: the points it can still lose today. */
    cap: number | null;
  };
  runIn: { chance: number; roll: number; fires: boolean; opponentId: string | null };
  /** A single-stat AGI way (*Agility +¼* on a paid Success). */
  agility: boolean;
}

export type MissionStartResult =
  | { ok: true; start: MissionStart }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; cost: number; energy: EnergyProjection };

const advance = (
  orders: OrdersState,
  templates: readonly OrderTemplate[],
  a: ActionDescriptor,
  outcome: Outcome,
  ctx: MatchCtx,
  now: number,
): OrdersAdvance => {
  const r = advanceOrders(orders, templates, a, outcome, ctx, now);
  return {
    after: r.orders,
    advanced: r.advanced?.templateId ?? null,
    completed: r.completed ? [r.completed.templateId] : [],
    allDone: r.allDone,
  };
};

/**
 * Design §4.6 steps 1–2 (ADR 0031 §3): spend the Energy, make the check (one roll), hold the rewards
 * as rolled and their dropped twin, add the Heat (paid whatever happens; ×2 on rival ground), roll
 * the run-in after the gain and pick the opponent. The run-in uses the `:runIn` stream of the seed.
 */
export function resolveMission(i: MissionInput, rng: Rng): MissionStartResult {
  const m = i.modifiers ?? NO_MODIFIERS;
  const spec = MISSION_TYPES[i.mission.type];
  const seenAs = spec.seenAs;
  const rival = rivalGroundIn(m);
  const before = projectEnergy(i.energy, i.now, undefined, i.restedCap ?? restedCapFor(m));
  // Design §23.1 #15: type-keyed rules apply by the type a mission is seen as (Rally Permits 15 → 13).
  // Slice 7 (ADR 0044): the laws' `missionEnergyDelta` (Emergency Permits 15 → 17), never below 1.
  const cost = missionEnergy(i.mission.energy, seenAs, m);
  const spent = spendEnergy(before, cost);
  if (!spent.ok) return { ok: false, reason: 'NOT_ENOUGH_ENERGY', cost, energy: before };

  const home = i.residence ?? i.homeCityId;
  const ctx: MatchCtx = rival
    ? { ...(typeof home === 'string' ? { cityId: home, districtId: null } : home), rivalGround: true }
    : home;
  const place = placeOf(m);
  const untagged: ActionDescriptor = {
    kind: 'mission',
    actionId: i.mission.id,
    type: seenAs,
    locationId: i.mission.locationId,
    cityId: i.mission.cityId,
    ...(i.mission.districtId !== undefined ? { districtId: i.mission.districtId } : {}),
    ...(i.mission.locationKind !== undefined ? { locationKind: i.mission.locationKind } : {}),
  };
  // Design §12.1: a mission is tagged by the same feeds as its type; the illegal types by none.
  const tagged = place && !spec.illegal ? issueTags(place.issues, untagged) : [];
  const descriptor: ActionDescriptor =
    tagged.length > 0 ? { ...untagged, issueIds: tagged.map((t) => t.issueId) } : untagged;

  const check = missionCheck({
    type: i.mission.type,
    difficulty: i.mission.difficulty,
    way: i.way,
    values: i.values,
    standing: i.standing,
    modifiers: m,
    ...(i.bonuses ? { bonuses: i.bonuses } : {}),
    ...(i.prefer ? { prefer: i.prefer } : {}),
  });
  const drawn = rng.roll100();
  const roll = i.force?.checkRoll ?? drawn;
  const outcome = outcomeForRoll(roll, check.chance, 2);

  const rolledOrders = advance(i.orders, i.orderTemplates, descriptor, outcome, ctx, i.now);
  const droppedOrders = advance(i.orders, i.orderTemplates, descriptor, 'failure', ctx, i.now);
  const shares = rewardShares({ type: seenAs, givesFxp: spec.givesFxp, m, tier: 2 });
  // Slice 8 (T9, ADR 0052, 0088): the personal parts after the place's, at the start (§24.10 Q4).
  const own = personalShares(i.personal, 'mission', i.now);
  const factors = place && spec.opinion !== null ? swingFactors(seenAs, i.factionId, m, tagged) : [];
  const recordIronPct = { clean: 0, onFile: -10, repeat: -20, notorious: -30 }[i.record];
  const common = {
    type: i.mission.type,
    energy: i.mission.energy,
    restedUsed: spent.restedUsed,
    costPaid: cost,
    fxpShares: [...shares.fxp, ...own.fxp],
    ironShares: [...shares.iron, ...own.iron],
    // Slice 7 (ADR 0044): a law's `xpPct` (scope missions); slice 8 (T9): the bar's XP shares.
    ...(shares.xp.length + own.xp.length > 0 ? { xpShares: [...shares.xp, ...own.xp] } : {}),
    opinionFactors: factors,
    recordIronPct,
    ...(i.nightRate ? { nightRate: true } : {}),
  };
  const bonusFor = (a: OrdersAdvance) =>
    a.advanced !== null || !DIRECTIVES.bonusOnlyWhileOpen ? DIRECTIVES.matchFxpBonus : 0;
  const rolled = tier2Rewards({ ...common, outcome, fxpBonusShare: bonusFor(rolledOrders) });
  const dropped = tier2Rewards({ ...common, outcome: 'failure', fxpBonusShare: 0 });

  // Heat: the type's (or the way's), ×2 on rival ground, on every outcome (design §4.2).
  const gain = heatGainAt(
    (i.way.heat ?? spec.heat) * (rival ? RIVAL_GROUND.heatFactor : 1),
    i.controlledBy ?? null,
    i.factionId,
  );
  const heat = addHeat(i.heat, i.now, i.rateOn, gain);

  // Opinion (design §4.1, §11.2): persuasion, or against the target; on rival ground a speech too
  // draws from the home faction, under the day's cap.
  let mode = spec.opinion;
  let target: FactionId | null = mode === 'against' ? i.target : null;
  if (rival && mode === 'persuade') {
    mode = 'against';
    target = rival.homeFactionId;
  }
  const cap = rival && target === rival.homeFactionId ? rival.pressureLeft : null;

  // The run-in, after the gain (design §4.6 step 2).
  const street = createRng(`${rng.seed}:runIn`);
  const nightAtAct = i.night === true;
  const chance = runInChance({
    base: i.way.runIn ?? spec.runIn,
    tier: 2,
    rivalGround: rival !== null,
    heatState: heat.stateAfter,
    record: i.record,
    flags: i.flags,
    ...(i.night !== undefined ? { night: i.night } : {}),
    // Slice 7 (ADR 0044): the laws' run-in percentages (the Curfew's at night).
    pcts: runInPcts(m, nightAtAct),
    ...(i.recognition !== undefined ? { recognition: i.recognition } : {}),
  });
  const runRoll = street.roll100();
  const fires = i.force?.runIn === 'next' ? true : i.force?.runIn === 'never' ? false : runRoll <= chance;
  const opponentId = fires
    ? (i.force?.opponentId ??
      pickOpponent({
        pool: i.mission.pool,
        actor: i.factionId,
        heatState: heat.stateAfter,
        sideOf: i.opponents.sideOf,
        policeId: i.opponents.policeId,
        rng: street,
        ...(i.night !== undefined ? { night: i.night, rivalGround: rival !== null } : {}),
      }))
    : null;

  const perSuccess = standingPerSuccess(m);
  const points = tagged.length > 0 ? pointsFor(i.mission.energy, outcome) : 0;
  return {
    ok: true,
    start: {
      seed: rng.seed,
      missionId: i.mission.id,
      wayId: i.way.id,
      tier: 2,
      type: i.mission.type,
      rivalGround: rival !== null,
      energy: { before, after: spent.state, cost, restedUsed: spent.restedUsed },
      attempt: { index: 1, check, roll, outcome },
      rewards: { rolled, dropped },
      points,
      issues: tagged.map((t) => ({ docId: t.docId, issueId: t.issueId, name: t.name, points })),
      descriptor,
      orders: { before: i.orders, rolled: rolledOrders, dropped: droppedOrders },
      standing: {
        before: i.standing.successes,
        rolled: i.standing.successes + (outcome === 'success' ? perSuccess : 0),
        dropped: i.standing.successes,
      },
      heat,
      opinion: { mode, target, swing: { rolled: rolled.opinion, dropped: 0 }, factors, cap },
      runIn: { chance, roll: runRoll, fires, opponentId },
      agility: isAgilityWay(i.way),
    },
  };
}

export type MissionStamp = 'success' | 'partial' | 'failure' | 'takenIn' | 'carriedOff';

/** Why a player was sent to the cells or the infirmary (`stays.reason`). */
export type HeldReason = 'caught' | 'wanted' | 'policeLoss' | 'runInLost';

export interface MissionFinal {
  /** The check's outcome (design §23.1 #19: the stamp is it, after a Run too). */
  outcome: Outcome;
  stamp: MissionStamp;
  /** The held result paid as rolled, or its dropped twin after a Run or a loss. */
  paid: 'rolled' | 'dropped';
  dropped: 'ran' | 'lost' | null;
  /** What is paid, with the run-in's parts (*the run-in +20*, *won at full strength*, *paid off −60*). */
  rewards: Rewards;
  orders: OrdersAdvance;
  /** Standing successes in the city after. */
  standing: number;
  points: number;
  /** The swing to apply (0 when dropped). */
  swing: number;
  heat: HeatChange;
  health: { before: number; after: number; max: number; timer: HealthTimer } | null;
  record: {
    added: Mark[];
    escalated: boolean;
    before: RecordLevel;
    after: RecordLevel;
    /** The stored marks after (faded ones pruned). */
    marks: Mark[];
    arrests: DayKey[];
    /** Caught while *Cool* or *Noticed*: the police took the name. */
    nameTaken: boolean;
  };
  sentTo: { kind: 'cells' | 'infirmary'; reason: HeldReason; held: HeldSpec } | null;
  agility: { quarters: number; gained: boolean; statUp: boolean } | null;
  /**
   * Review 4 #20 (ADR 0078): sent to the cells, so the day's orders are off from the arrest; the
   * arresting act advanced none (`orders.after` is the state before it, closed).
   */
  ordersOff: boolean;
}

export const RUN_IN_PART = { id: 'runIn', label: 'The run-in' } as const;
export const FULL_STRENGTH_PART = { id: 'fullStrength', label: 'Won at full strength' } as const;
export const PAID_OFF_PART = { id: 'paidOff', label: 'Paid off' } as const;

const addPart = (line: RewardLine, part: RewardPart): RewardLine => {
  if (part.amount === 0) return line;
  const parts = [...(line.parts ?? []), part];
  const bonus = line.bonus + part.amount;
  return { ...line, bonus, total: line.base + bonus, parts };
};

/**
 * Design §4.6 steps 2–4 (ADR 0031 §3): apply the street to the held start. Fight won, Talk or Pay
 * pay it as rolled; a Run or a loss pays the dropped twin. The run-in's XP; *won at full strength*
 * +10 % on the mission's XP and Party XP; *paid off*. The record (the caught check's marks, or a
 * police loss's), the cells (caught while Hot or Wanted, Wanted and a Failure, a police loss) or the
 * infirmary (any other loss), and *Agility +¼* on a paid Success of an Agility way.
 */
export function finishMission(i: {
  start: MissionStart;
  runIn: RunInOutcome | null;
  /** The opponent's side (a loss to the police is the cells). */
  opponentSide: FactionId | 'police' | null;
  caught: CaughtResult | null;
  marks: readonly Mark[];
  /** Slice 7 (ADR 0044): the law's fade on the marks before (`liveMarks`' `fadeDaysOn`); absent, 14. */
  fadeDaysOn?: (day: DayKey) => number;
  arrests: readonly DayKey[];
  agiQuarters: number;
  /** The Health timer before the run-in. */
  health: HealthTimer;
  level: number;
  /** The resolution's time (the run-in's decide time when luck took it). */
  at: number;
  today: DayKey;
  rateOn: (day: DayKey) => number;
  logId: string | null;
  bail: { alliance: boolean; sources: readonly PriceLine[] };
}): MissionFinal {
  const s = i.start;
  const r = i.runIn;
  const dropped: MissionFinal['dropped'] = r?.outcome === 'ran' ? 'ran' : r?.outcome === 'lost' ? 'lost' : null;
  const paid = dropped ? 'dropped' : 'rolled';
  let rewards = paid === 'rolled' ? s.rewards.rolled : s.rewards.dropped;
  // Review 4 #20 (ADR 0078, §23.1 Q4): an arrest takes the day's orders off from the arrest, and the
  // arresting act counts for none of them, nor for the order's +25 % Party XP.
  const takenIn =
    (r?.outcome === 'lost' && i.opponentSide === 'police') || (i.caught?.caught === true && i.caught.arrest);
  if (takenIn) rewards = { ...rewards, fxp: withoutOrderPart(rewards.fxp) };
  if (r) {
    rewards = { ...rewards, xp: addPart(rewards.xp, { ...RUN_IN_PART, amount: r.xp }) };
    if (r.fullStrength) {
      rewards = {
        ...rewards,
        xp: addPart(rewards.xp, { ...FULL_STRENGTH_PART, amount: roundHalfUp(rewards.xp.base * 0.1) }),
        fxp: addPart(rewards.fxp, { ...FULL_STRENGTH_PART, amount: roundHalfUp(rewards.fxp.base * 0.1) }),
      };
    }
    if (r.ironPaid > 0) rewards = { ...rewards, iron: addPart(rewards.iron, { ...PAID_OFF_PART, amount: -r.ironPaid }) };
  }
  if (paid === 'dropped') rewards = { ...rewards, opinion: 0 };

  // Heat: the start's, plus a failed Pay's +10 at the resolution.
  const heat: HeatChange = r?.heatAdded
    ? (() => {
        const more = addHeat(s.heat.timer, i.at, i.rateOn, r.heatAdded);
        return { ...more, before: s.heat.before, stateBefore: s.heat.stateBefore };
      })()
    : s.heat;

  // Health.
  const max = healthMax(i.level);
  let health: MissionFinal['health'] = null;
  if (r) {
    const before = healthNow(i.health, i.at, i.level);
    const timer: HealthTimer =
      r.healthAfter >= max ? { damage: 0, at: i.at } : { damage: max - r.healthAfter, at: i.at };
    health = { before, after: r.healthAfter, max, timer };
  }

  // The record and where the player is sent.
  const today = i.today;
  const liveBefore = liveMarks(i.marks, today, i.fadeDaysOn);
  const levelBefore = recordLevel(liveBefore.length);
  const policeLoss = r?.outcome === 'lost' && i.opponentSide === 'police';
  const caught = i.caught?.caught === true;
  const arrested = policeLoss || (caught && i.caught!.arrest);
  const nameTaken = caught && !i.caught!.arrest;
  const marks = policeLoss || caught ? marksFor({ type: s.type, arrested, arrests: i.arrests, today, logId: i.logId }) : { add: [], escalated: false };
  const after = [...liveBefore, ...marks.add];
  // Review 4 #20 (ADR 0078): every arrest is recorded for the seven-day escalation.
  const arrests = arrested ? recordArrest(i.arrests, today) : [...i.arrests];

  let sentTo: MissionFinal['sentTo'] = null;
  if (arrested) {
    const heatAtArrest = heat.after;
    const bail = bailFor({
      marks: after.length,
      notorious: recordLevel(after.length) === 'notorious',
      rivalGround: s.rivalGround,
      alliance: i.bail.alliance,
      sources: i.bail.sources,
    });
    const reason: HeldReason = policeLoss ? 'policeLoss' : i.caught!.withoutRoll ? 'wanted' : 'caught';
    sentTo = { kind: 'cells', reason, held: arrest({ at: i.at, heat: heatAtArrest, rivalGround: s.rivalGround, bail }) };
    if (policeLoss && health) health = { ...health, after: HEALTH.admitted, timer: policeLossHealth(i.level, i.at) };
  } else if (r?.outcome === 'lost') {
    const a = admit({ at: i.at, level: i.level, rivalGround: s.rivalGround });
    sentTo = { kind: 'infirmary', reason: 'runInLost', held: a.held };
    if (health) health = { ...health, after: HEALTH.admitted, timer: a.health };
  }

  // Agility +¼ on a paid Success of an Agility way (design §4.1).
  let agility: MissionFinal['agility'] = null;
  if (s.agility) {
    const gained = paid === 'rolled' && s.attempt.outcome === 'success';
    const q = i.agiQuarters + (gained ? 1 : 0);
    agility = { quarters: q % 4, gained, statUp: gained && q >= 4 };
  }

  const ordersOff = sentTo?.kind === 'cells';
  const orders: OrdersAdvance = ordersOff
    ? { after: closeOrders(s.orders.before, i.at), advanced: null, completed: [], allDone: false }
    : paid === 'rolled'
      ? s.orders.rolled
      : s.orders.dropped;

  const stamp: MissionStamp = sentTo
    ? sentTo.kind === 'cells'
      ? 'takenIn'
      : 'carriedOff'
    : s.attempt.outcome;
  return {
    outcome: s.attempt.outcome,
    stamp,
    paid,
    dropped,
    rewards,
    orders,
    standing: paid === 'rolled' ? s.standing.rolled : s.standing.dropped,
    points: paid === 'rolled' ? s.points : 0,
    swing: paid === 'rolled' ? s.opinion.swing.rolled : 0,
    heat,
    health,
    record: {
      added: marks.add,
      escalated: marks.escalated,
      before: levelBefore,
      after: recordLevel(after.length),
      marks: after,
      arrests,
      nameTaken,
    },
    sentTo,
    agility,
    ordersOff,
  };
}

/** A Party XP line without its *Party order* share (the act an arrest stopped from counting). */
function withoutOrderPart(l: RewardLine): RewardLine {
  const amount = l.parts ? (l.parts.find((p) => p.id === ORDER_PART.id)?.amount ?? 0) : l.bonus;
  if (amount === 0) return l;
  const out: RewardLine = { base: l.base, bonus: l.bonus - amount, total: l.total - amount };
  if (l.parts) out.parts = l.parts.filter((p) => p.id !== ORDER_PART.id);
  return out;
}
