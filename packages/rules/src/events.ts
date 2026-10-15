/**
 * Slice 6: Campaign Events (docs/tech/slice-6.md §6.2; design §2–§4; GDD §16.3; economy §20).
 * Pure: the server gathers the inputs in one transaction and stores what comes out (ADR 0036, 0037).
 */
import { computeCheck, outcomeForRoll } from './check';
import { EVENTS, RESTED } from './constants';
import { dayStart, mod } from './day';
import type { DayKey } from './day';
import type { EnergyProjection, EnergyState } from './energy';
import { addHeat, heatState, projectHeat } from './heat';
import type { HeatChange, HeatTimer } from './heat';
import { factorProduct, ordinanceCheckBonuses, placeCheckBonuses, rewardShares, swingFactors } from './ordinances';
import type { Modifiers, SwingFactor } from './ordinances';
import { applyAgainst, applyPersuasion } from './opinion';
import { applyGains } from './progress';
import type { GainsResult, Progress } from './progress';
import { ORDER_PART, RESTED_PART, partsLine, roundHalfUp, roundOpinion } from './rewards';
import type { LineShare } from './rewards';
import type { Rng } from './rng';
import { standingBonus, standingView } from './standing';
import { FACTION_IDS } from './types';
import type {
  CheckBreakdown,
  CheckStatSpec,
  CityRole,
  FactionId,
  OpinionShares,
  Outcome,
  RewardLine,
  Rewards,
  Stats,
  TrainableStat,
} from './types';

export type EventBand = 'triumph' | 'success' | 'mixed' | 'fiasco';
export const EVENT_BANDS = ['triumph', 'success', 'mixed', 'fiasco'] as const;
export type EventSpecial = 'heatInRivalHeld' | 'doubleMomentum' | 'againstLeader';
export const EVENT_SPECIALS = ['heatInRivalHeld', 'doubleMomentum', 'againstLeader'] as const;
export type EventHours = 1 | 3 | 6 | 12;

/** What the rules need of a content event type (content's `CampaignEventType` satisfies it). */
export interface EventRoleSpec {
  id: string;
  name: string;
  stats: CheckStatSpec;
  energy: number;
}
export interface CampaignEventTypeSpec {
  id: string;
  factionId?: FactionId;
  roles: readonly EventRoleSpec[];
  baseSwing: number;
  difficulty: { home: number; capital: number };
  actionType: string;
  special?: EventSpecial;
}

/** Design §2.6: the type's difficulty, +2 in the capital (pinned in content as `capital`). */
export const eventDifficulty = (t: { difficulty: { home: number; capital: number } }, role: CityRole): number =>
  role === 'home' ? t.difficulty.home : t.difficulty.capital;

/** Design §2.6: ≥ 0.875 Triumph · ≥ 0.625 Success · ≥ 0.375 Mixed · else Fiasco. */
export function bandFor(score: number): { band: EventBand; m: number } {
  for (const b of EVENTS.bands) if (score + 1e-9 >= b.min) return { band: b.band, m: b.m };
  return { band: 'fiasco', m: 0 };
}

/** Design §2.3: the branch's volunteers score a half, three quarters at home while *Fired up*. */
export const volunteerScore = (firedUpAtHome: boolean): number =>
  firedUpAtHome ? EVENTS.volunteer.firedUp : EVENTS.volunteer.score;

/** Design §2.6: min(1.25, (members' named Energy + hands' Energy) ÷ all named Energy). */
export function fillOf(i: { roleEnergy: readonly number[]; memberRoleEnergy: number; handsEnergy: number }): number {
  const all = i.roleEnergy.reduce((a, b) => a + b, 0);
  if (all <= 0) return 0;
  return Math.min(EVENTS.fillCap, (i.memberRoleEnergy + i.handsEnergy) / all);
}

/**
 * Design §2.6 (§14.4): base × m × fill × Π(1 + pct / 100), full precision, rounded once to three
 * decimals. `requested` is in integer thousandths; 0 on a Fiasco.
 */
export function eventSwing(i: {
  base: number;
  m: number;
  fill: number;
  factors: readonly SwingFactor[];
}): { requested: number; product: number } {
  const product = factorProduct(i.factors);
  const points = roundOpinion(i.base * i.m * i.fill * product);
  return { requested: Math.round(points * 1_000), product };
}

/** Integer thousandths split equally; the remainder one each to the first in roster order. Σ = total. */
export function splitEqually(total: number, n: number): number[] {
  if (n <= 0) return [];
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(Math.trunc(total));
  const each = Math.floor(abs / n);
  let left = abs - each * n;
  return Array.from({ length: n }, () => {
    const extra = left > 0 ? 1 : 0;
    left -= extra;
    return sign * (each + extra) || 0;
  });
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** Design §2.2: now + h, up to the next whole minute. */
export const startsAtFor = (now: number, hours: EventHours): number =>
  Math.ceil((now + hours * HOUR_MS) / MINUTE_MS) * MINUTE_MS;

export const withdrawUntil = (startsAt: number): number => startsAt - EVENTS.withdrawBeforeMs;
/** Design §2.4: withdrawal until an hour before the start (exactly an hour before is refused). */
export const canWithdraw = (startsAt: number, now: number): boolean => now < withdrawUntil(startsAt);

/**
 * Design §4: the secretary's fixture. The type is `(day + factionIndex) mod 3` over the rotation; in
 * the capital the district is `day mod 5` over the districts by `n` (the three factions share it).
 */
export function fixtureFor(i: {
  day: DayKey;
  factionId: FactionId;
  rotation: readonly [string, string, string];
  districts: readonly string[] | null;
}): { typeId: string; districtId: string | null } {
  const typeId = i.rotation[mod(i.day + FACTION_IDS.indexOf(i.factionId), 3)]!;
  const districtId = i.districts && i.districts.length > 0 ? i.districts[mod(i.day, i.districts.length)]! : null;
  return { typeId, districtId };
}

/** Design §4: posted at the boundary into `day`, it starts (and resolves) at the next one. */
export const fixtureStartsAt = (day: DayKey): number => dayStart(day + 1);

/** The event page's *opinion up to about +x here*: base × 1.5 (a Triumph) × Π, one decimal. */
export const opinionUpTo = (base: number, factors: readonly SwingFactor[]): number =>
  Math.round(base * 1.5 * factorProduct(factors) * 10 + 1e-9) / 10;

/** Design §2.7: the Grand Rally's Heat where a rival holds the place above 50. */
export const heatInRivalHeld = (shares: OpinionShares, factionId: FactionId): boolean =>
  FACTION_IDS.some((f) => f !== factionId && shares[f] > EVENTS.rivalHeldAbove);

/**
 * Design §2.4 (tech §22.1 Q4): a withdrawal's refund under the regen's overflow rule. Energy back up
 * to the bar, the excess banks as Rested; Rested gets its own refund too, capped (never shrinking a
 * pool already above the cap).
 */
export function refundEnergy(p: EnergyProjection, energy: number, rested: number, restedCap: number = RESTED.cap): EnergyState {
  let value: number;
  let overflow: number;
  if (p.value >= p.max) {
    value = p.value;
    overflow = energy;
  } else {
    value = Math.min(p.max, p.value + energy);
    overflow = p.value + energy - value;
  }
  const restedAfter = Math.max(p.rested, Math.min(restedCap, p.rested + rested + overflow));
  return { value, rested: restedAfter, updatedAt: p.updatedAt };
}

// ---------------------------------------------------------------------------------------------
// Gates (tech §7.2): the first refusal in the order the player would fix them.
// ---------------------------------------------------------------------------------------------

export type CallGateReason =
  | 'RANK'
  | 'WHERE'
  | 'HELD'
  | 'IN_TRANSIT'
  | 'RUN_IN_PENDING'
  | 'RIVAL_GROUND'
  | 'NOT_YOUR_EVENT'
  | 'WRONG_DISTRICT'
  | 'TOO_MANY_SIGNUPS';

export function callGate(i: {
  rank: number;
  inOpenCity: boolean;
  held: boolean;
  inTransit: boolean;
  runInPending: boolean;
  rivalGround: boolean;
  typeFactionId?: FactionId;
  factionId: FactionId;
  districtOk: boolean;
  openSignups: number;
}): null | { reason: CallGateReason; need?: number } {
  if (i.rank < EVENTS.callRank) return { reason: 'RANK', need: EVENTS.callRank };
  if (i.held) return { reason: 'HELD' };
  if (i.inTransit) return { reason: 'IN_TRANSIT' };
  if (i.runInPending) return { reason: 'RUN_IN_PENDING' };
  if (i.rivalGround) return { reason: 'RIVAL_GROUND' };
  if (!i.inOpenCity) return { reason: 'WHERE' };
  if (i.typeFactionId !== undefined && i.typeFactionId !== i.factionId) return { reason: 'NOT_YOUR_EVENT' };
  if (!i.districtOk) return { reason: 'WRONG_DISTRICT' };
  if (i.openSignups >= EVENTS.maxOpenSignups) return { reason: 'TOO_MANY_SIGNUPS', need: EVENTS.maxOpenSignups };
  return null;
}

export type SignUpGateReason =
  | 'RANK'
  | 'NOT_ENOUGH_ENERGY'
  | 'WRONG_CITY'
  | 'HELD'
  | 'IN_TRANSIT'
  | 'RUN_IN_PENDING'
  | 'ALREADY_ON_EVENT'
  | 'TOO_MANY_SIGNUPS'
  | 'ROLE_TAKEN'
  | 'HANDS_FULL'
  | 'EVENT_STARTED';

export function signUpGate(i: {
  slot: string;
  rank: number;
  energy: number;
  cost: number;
  sameCity: boolean;
  held: boolean;
  inTransit: boolean;
  runInPending: boolean;
  onEvent: boolean;
  openSignups: number;
  slotFree: boolean;
  started: boolean;
}): null | { reason: SignUpGateReason; need?: number } {
  const hand = i.slot === 'hand';
  if (i.started) return { reason: 'EVENT_STARTED' };
  if (i.onEvent) return { reason: 'ALREADY_ON_EVENT' };
  if (!i.slotFree) return { reason: hand ? 'HANDS_FULL' : 'ROLE_TAKEN' };
  if (!hand && i.rank < EVENTS.namedRoleRank) return { reason: 'RANK', need: EVENTS.namedRoleRank };
  if (i.held) return { reason: 'HELD' };
  if (i.inTransit) return { reason: 'IN_TRANSIT' };
  if (i.runInPending) return { reason: 'RUN_IN_PENDING' };
  if (!i.sameCity) return { reason: 'WRONG_CITY' };
  if (i.openSignups >= EVENTS.maxOpenSignups) return { reason: 'TOO_MANY_SIGNUPS', need: EVENTS.maxOpenSignups };
  if (i.energy < i.cost) return { reason: 'NOT_ENOUGH_ENERGY', need: i.cost };
  return null;
}

// ---------------------------------------------------------------------------------------------
// The check and the resolution.
// ---------------------------------------------------------------------------------------------

/**
 * Design §2.6 (tech §22.1 Q8): a role's §8.4 check with the bonuses a tier-1 action of the event's
 * `actionType` at the venue gets: Local Standing (+3 a level), the close race (+5, political types)
 * and the `chancePct` sources.
 */
export function roleCheck(i: {
  role: { stats: CheckStatSpec };
  values: Stats;
  difficulty: number;
  standingSuccesses: number;
  standingLabel?: string;
  actionType: string;
  m: Modifiers;
  prefer?: TrainableStat;
}): CheckBreakdown {
  const standing = standingBonus(i.standingSuccesses, i.standingLabel ?? 'Reputation');
  return computeCheck({
    stats: i.role.stats,
    values: i.values,
    difficulty: i.difficulty,
    bonuses: [
      ...(standing ? [standing] : []),
      ...ordinanceCheckBonuses(i.actionType, i.m),
      ...placeCheckBonuses(i.actionType, i.m),
    ],
    ...(i.prefer ? { prefer: i.prefer } : {}),
  });
}

export interface EventParticipantInput {
  characterId: string;
  signupId: string;
  /** A role id, or 'hand'. */
  slot: string;
  energy: number;
  restedCovered: number;
  orderBonus: boolean;
  /** Computed by the server from the member's sign-ups of the event's day (§8.2). */
  firstToday: boolean;
  /** Worn CHA. */
  values: Stats;
  /** Local Standing Successes in the event's city. */
  standingSuccesses: number;
  standingLabel?: string;
  /** The faction's bonus stat (best-stat ties). */
  prefer?: TrainableStat;
}

export interface ResolveEventInput {
  type: CampaignEventTypeSpec;
  cityRole: CityRole;
  factionId: FactionId;
  /** The city's home faction (floors; morale), null in the capital. */
  homeFactionId: FactionId | null;
  /** Roles (any order: sorted to content order here), then hands in sign-up order. */
  participants: readonly EventParticipantInput[];
  /** ADR 0030's place modifiers of the venue for the event's faction on the event's day. */
  modifiers: Modifiers;
  tagged: ReadonlyArray<{ docId: string; issueId: string; name: string }>;
  /** The place's meter now. */
  shares: OpinionShares;
  /** The Headline Story's target, frozen at the call. */
  targetFactionId: FactionId | null;
  /** Test hooks only (§8.6): a forced roll per role id. */
  forcedRolls?: Readonly<Record<string, number>>;
}

export interface EventRoleResult {
  roleId: string;
  holder: { characterId: string; signupId: string } | null;
  check: CheckBreakdown | null;
  roll: number | null;
  outcome: Outcome | 'volunteer';
  score: number;
}

export interface EventParticipantResult {
  characterId: string;
  signupId: string;
  slot: string;
  /** The holder's roll; null for a hand. */
  outcome: Outcome | null;
  /** xp (with the Rested part), fxp (band, order, close race, Fired up, sources), iron 0, opinion = the share. */
  rewards: Rewards;
  pc: { amount: number; rate: 'full' | 'half' };
  /** A named role's Success: one Reputation win in the event's city. */
  win: boolean;
  /** The Grand Rally's 5, else 0. */
  heat: number;
  /** Thousandths: the actor faction's share of the gain, the target's (≤ 0, against only). */
  share: { actor: number; target: number };
  /** Momentum per tagged Issue. */
  points: Array<{ docId: string; points: number }>;
  firstToday: boolean;
}

export interface EventResolution {
  calledOff: boolean;
  roles: EventRoleResult[];
  score: number;
  band: EventBand;
  m: number;
  fill: number;
  swing: { base: number; factors: SwingFactor[]; requested: number };
  opinion: {
    mode: 'persuade' | 'against';
    /** Points (three decimals) the actor's side gained (persuasion), or that were taken (against). */
    applied: number;
    shares: OpinionShares;
    toActor?: number;
    toNeutral?: number;
    taken?: number;
    targetFactionId?: FactionId;
  };
  participants: EventParticipantResult[];
  /** The volunteers' score used for empty roles (0.5, or 0.75 at home while Fired up). */
  volunteerScore: number;
}

/** The per-participant record stored on the sign-up at resolution (`eventSignups.result`). */
export interface SignupResultDoc extends EventParticipantResult {
  band: EventBand;
  eventId?: string;
}

const NOTHING: RewardLine = { base: 0, bonus: 0, total: 0 };

/**
 * Design §2.7 (economy §20.1): one participant's rewards. XP 5 × E × (the holder's roll: 1, ½, ⅕;
 * a hand by the band: 1, 1, ½, ⅕) with the Rested part (½ × the share of E covered); Party XP
 * 0.8 × E × the band's factor with the order's 25 % and `rewardShares` lines on the base; Political
 * Capital by band, halved (halves up) after the member's first event of the day. No Iron.
 */
export function eventRewards(i: {
  slot: 'role' | 'hand';
  energy: number;
  outcome: Outcome | null;
  band: EventBand;
  restedCovered: number;
  orderBonus: boolean;
  fxpShares: readonly LineShare[];
  firstToday: boolean;
}): { rewards: Rewards; pc: { amount: number; rate: 'full' | 'half' } } {
  const xpFactor =
    i.slot === 'role' && i.outcome !== null ? EVENTS.xp.byRoll[i.outcome] : EVENTS.xp.handByBand[i.band];
  const restedShare = i.energy > 0 ? Math.min(1, i.restedCovered / i.energy) : 0;
  const xp = partsLine(EVENTS.xp.perEnergy * i.energy * xpFactor, [
    { ...RESTED_PART, share: RESTED.xpBonus * restedShare },
  ]);
  const fxp = partsLine(EVENTS.fxp.perEnergy * i.energy * EVENTS.fxp.byBand[i.band], [
    { ...ORDER_PART, share: i.orderBonus ? 0.25 : 0 },
    ...i.fxpShares,
  ]);
  const full = EVENTS.pc[i.band];
  const pc = i.firstToday
    ? { amount: full, rate: 'full' as const }
    : { amount: roundHalfUp(full * EVENTS.pc.laterShare), rate: 'half' as const };
  return { rewards: { xp, fxp, iron: { ...NOTHING }, opinion: 0 }, pc };
}

const toK = (x: number): number => Math.round(x * 1_000);

/**
 * Design §2.6 (ADR 0037): the event at its start. No member on it → called off. One roll per held
 * role from its own named stream (`stream('role:' + roleId)`), so filling another role or adding a
 * hand never moves yours; empty roles score the volunteers; the mean is the band; the swing is
 * drawn Neutral-first (persuasion) or from the target (the Headline Story), split equally among the
 * member participants in roster order.
 */
export function resolveCampaignEvent(i: ResolveEventInput, stream: (name: string) => Rng): EventResolution {
  const roleIds = i.type.roles.map((r) => r.id);
  const byRole = new Map(i.participants.filter((p) => p.slot !== 'hand').map((p) => [p.slot, p]));
  const hands = i.participants.filter((p) => p.slot === 'hand');
  const ordered = [...roleIds.flatMap((id) => (byRole.has(id) ? [byRole.get(id)!] : [])), ...hands];
  const vScore = volunteerScore(i.cityRole === 'home' && i.modifiers.firedUp);
  const factors = swingFactors(i.type.actionType, i.factionId, i.modifiers, i.tagged);
  const swingBase = { base: i.type.baseSwing, factors };

  if (ordered.length === 0) {
    return {
      calledOff: true,
      roles: i.type.roles.map((r) => ({ roleId: r.id, holder: null, check: null, roll: null, outcome: 'volunteer', score: 0 })),
      score: 0,
      band: 'fiasco',
      m: 0,
      fill: 0,
      swing: { ...swingBase, requested: 0 },
      opinion: { mode: i.type.special === 'againstLeader' ? 'against' : 'persuade', applied: 0, shares: { ...i.shares } },
      participants: [],
      volunteerScore: vScore,
    };
  }

  const difficulty = eventDifficulty(i.type, i.cityRole);
  const roles: EventRoleResult[] = i.type.roles.map((role) => {
    const p = byRole.get(role.id);
    if (!p) return { roleId: role.id, holder: null, check: null, roll: null, outcome: 'volunteer', score: vScore };
    const check = roleCheck({
      role,
      values: p.values,
      difficulty,
      standingSuccesses: p.standingSuccesses,
      ...(p.standingLabel !== undefined ? { standingLabel: p.standingLabel } : {}),
      actionType: i.type.actionType,
      m: i.modifiers,
      ...(p.prefer ? { prefer: p.prefer } : {}),
    });
    const drawn = stream(`role:${role.id}`).roll100();
    const roll = i.forcedRolls?.[role.id] ?? drawn;
    const outcome = outcomeForRoll(roll, check.chance, 2);
    return {
      roleId: role.id,
      holder: { characterId: p.characterId, signupId: p.signupId },
      check,
      roll,
      outcome,
      score: EVENTS.roleScore[outcome],
    };
  });
  const score = roles.reduce((s, r) => s + r.score, 0) / roles.length;
  const { band, m } = bandFor(score);
  const fill = fillOf({
    roleEnergy: i.type.roles.map((r) => r.energy),
    memberRoleEnergy: i.type.roles.filter((r) => byRole.has(r.id)).reduce((s, r) => s + r.energy, 0),
    handsEnergy: hands.reduce((s, h) => s + h.energy, 0),
  });
  const { requested } = eventSwing({ base: i.type.baseSwing, m, fill, factors });

  const n = ordered.length;
  let opinion: EventResolution['opinion'];
  let actorShares: number[];
  let targetShares: number[] = ordered.map(() => 0);
  const against = i.type.special === 'againstLeader' && i.targetFactionId !== null && i.targetFactionId !== i.factionId;
  const homeFaction = i.homeFactionId ?? undefined;
  if (against) {
    const r = applyAgainst(i.shares, {
      actor: i.factionId,
      target: i.targetFactionId!,
      swing: requested / 1_000,
      ...(homeFaction ? { homeFactionId: homeFaction } : {}),
    });
    opinion = {
      mode: 'against',
      applied: r.taken,
      shares: r.shares,
      toActor: r.toActor,
      toNeutral: r.toNeutral,
      taken: r.taken,
      targetFactionId: i.targetFactionId!,
    };
    actorShares = splitEqually(toK(r.toActor), n);
    targetShares = splitEqually(-toK(r.taken), n);
  } else {
    const r = applyPersuasion(i.shares, {
      factionId: i.factionId,
      swing: requested / 1_000,
      ...(homeFaction ? { homeFactionId: homeFaction } : {}),
    });
    opinion = { mode: 'persuade', applied: r.applied, shares: r.shares };
    actorShares = splitEqually(toK(r.applied), n);
  }

  const fxpShares = rewardShares({ type: i.type.actionType, givesFxp: true, m: i.modifiers }).fxp;
  const momentum = EVENTS.momentumByBand[band] * (i.type.special === 'doubleMomentum' ? EVENTS.doubleMomentum : 1);
  const heat =
    i.type.special === 'heatInRivalHeld' && heatInRivalHeld(i.shares, i.factionId) ? EVENTS.grandRallyHeat : 0;

  const participants: EventParticipantResult[] = ordered.map((p, idx) => {
    const isRole = p.slot !== 'hand';
    const roleOutcome = isRole ? (roles.find((r) => r.roleId === p.slot)!.outcome as Outcome) : null;
    const { rewards, pc } = eventRewards({
      slot: isRole ? 'role' : 'hand',
      energy: p.energy,
      outcome: roleOutcome,
      band,
      restedCovered: p.restedCovered,
      orderBonus: p.orderBonus,
      fxpShares,
      firstToday: p.firstToday,
    });
    const points = roundHalfUp(p.energy * momentum);
    return {
      characterId: p.characterId,
      signupId: p.signupId,
      slot: p.slot,
      outcome: roleOutcome,
      rewards: { ...rewards, opinion: actorShares[idx]! / 1_000 },
      pc,
      win: isRole && roleOutcome === 'success',
      heat,
      share: { actor: actorShares[idx]!, target: targetShares[idx]! },
      points: i.tagged.map((t) => ({ docId: t.docId, points })),
      firstToday: p.firstToday,
    };
  });

  return {
    calledOff: false,
    roles,
    score,
    band,
    m,
    fill,
    swing: { ...swingBase, requested },
    opinion,
    participants,
    volunteerScore: vScore,
  };
}

export interface EventCredit {
  gains: GainsResult;
  standing: { before: number; after: number } | null;
  standingUp: boolean;
  heat: HeatChange | null;
}

/**
 * ADR 0037: the participant's own read credits the stored result: XP, Party XP and Political
 * Capital through `applyGains`, a Reputation win, and the Grand Rally's Heat as of the start.
 */
export function eventCredit(i: {
  result: Pick<SignupResultDoc, 'rewards' | 'pc' | 'win' | 'heat'>;
  character: Progress & { standingSuccesses: number; heat: HeatTimer };
  startsAt: number;
  now: number;
  rateOn: (d: DayKey) => number;
  /** Street Register counts a Success twice (ADR 0021 §6); default 1. */
  standingPerWin?: number;
}): EventCredit {
  const { standingSuccesses, heat: heatTimer, ...progress } = i.character;
  const gains = applyGains(progress, {
    xp: i.result.rewards.xp.total,
    fxp: i.result.rewards.fxp.total,
    pc: i.result.pc.amount,
  });
  const standing = i.result.win
    ? { before: standingSuccesses, after: standingSuccesses + (i.standingPerWin ?? 1) }
    : null;
  const standingUp = standing ? standingView(standing.after).level > standingView(standing.before).level : false;
  const heat = i.result.heat > 0 ? addHeatAt(heatTimer, i.result.heat, i.startsAt, i.now, i.rateOn) : null;
  return { gains, standing, standingUp, heat };
}

/**
 * Tech §6.5: Heat gained as if added at `at` (an event's start). Exact when the timer's `at` is not
 * after `at`; otherwise the gain less what would have cooled between `at` and the timer's `at`.
 */
export function addHeatAt(t: HeatTimer, gain: number, at: number, now: number, rateOn: (d: DayKey) => number): HeatChange {
  const before = projectHeat(t, now, rateOn).value;
  let mid: HeatTimer;
  if (t.at <= at) {
    mid = addHeat(t, Math.min(at, now), rateOn, gain).timer;
  } else {
    const left = projectHeat({ value: gain, at }, t.at, rateOn).value;
    mid = addHeat(t, t.at, rateOn, left).timer;
  }
  const timer = projectHeat(mid, Math.max(now, mid.at), rateOn);
  return { before, after: timer.value, stateBefore: heatState(before), stateAfter: heatState(timer.value), timer };
}
