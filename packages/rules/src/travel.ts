import { computeCheck, outcomeForRoll } from './check';
import { HEAT, RIVAL_GROUND, TIER1_DIFFICULTY, TRAVEL } from './constants';
import { priceLines, priceWith } from './ordinances';
import type { Modifiers, PriceLine } from './ordinances';
import type { Rng } from './rng';
import type { CheckBonus, CheckBreakdown, CheckStatSpec, FactionId, Stats } from './types';

/**
 * Travel (slice-4 tech design §6.3, design §2–§3, GDD §14.10): legs, who can go where, the ticket,
 * the journey card's draw and its one choice. Pure: the server stores the seed and the result.
 */

/**
 * Why a destination's card has a Board button or not (design §2.3). Slice 5 (design §11.1): `rival`
 * is boardable from Level 10; `barred` for 24 hours after a deportation from it.
 */
export type DestinationState = 'here' | 'open' | 'rival' | 'barred' | 'later' | 'level';

/**
 * §14.10: every route runs through the capital. The capital ↔ X is `minutes[X]`; an outer city to
 * another is the two legs added (24–27 minutes).
 */
export function legMinutes(
  fromId: string,
  toId: string,
  minutes: Readonly<Record<string, number>>,
  capitalId: string,
): number {
  if (fromId === toId) return 0;
  const leg = (id: string) => {
    const m = minutes[id];
    if (m === undefined) throw new RangeError(`no journey time for "${id}"`);
    return m;
  };
  if (fromId === capitalId) return leg(toId);
  if (toId === capitalId) return leg(fromId);
  return leg(fromId) + leg(toId);
}

/**
 * Design §2.3: below Level 10 every card reads *From Level 10*; the city you are in has no ticket;
 * Clearwater has no service yet; a rival faction's home is rival ground (slice 5); the capital and
 * your own home are open.
 */
export function destinationState(i: {
  to: string;
  here: string;
  level: number;
  service: 'open' | 'later';
  factionHomeOf: (cityId: string) => FactionId | null;
  playerFaction: FactionId;
  capitalId: string;
  /** Slice 5 (design §11.5): the bar on `to` after a deportation, until then (null: none). */
  barredUntil?: number | null;
  now?: number;
}): DestinationState {
  if (i.level < TRAVEL.level) return 'level';
  if (i.to === i.here) return 'here';
  if (i.service === 'later') return 'later';
  const home = i.factionHomeOf(i.to);
  if (home !== null && home !== i.playerFaction) {
    const barred = i.barredUntil !== undefined && i.barredUntil !== null && (i.now ?? 0) < i.barredUntil;
    return barred ? 'barred' : 'rival';
  }
  return 'open';
}

/**
 * Design §11.4 (§23.1 #12): the hostile deck, drawn at boarding for a rival home city, always one
 * card. The first trip to rival ground draws the checkpoint (added to `seen`); later, Heat 50 or more
 * draws *Your name is on a list* (outside the rotation, `seen` unchanged); otherwise one of the
 * rotation's three, without replacement until all three were seen. Deterministic per seed.
 */
export function drawHostileCard(i: {
  firstRival: boolean;
  heat: number;
  seen: readonly string[];
  rotation: readonly string[];
  firstId: string;
  listed: { id: string; heatAtLeast: number };
  rng: Rng;
}): { eventId: string; seen: string[] } {
  if (i.firstRival) return { eventId: i.firstId, seen: [...new Set([...i.seen, i.firstId])] };
  if (i.heat >= i.listed.heatAtLeast) return { eventId: i.listed.id, seen: [...i.seen] };
  let seen = i.seen.filter((id) => i.rotation.includes(id));
  let left = i.rotation.filter((id) => !seen.includes(id));
  if (left.length === 0) {
    seen = [];
    left = [...i.rotation];
  }
  const eventId = left[i.rng.int(0, left.length - 1)]!;
  return { eventId, seen: [...seen, eventId] };
}

/** The checkpoint's gate (design §23.2): *Cool and Clean* is Heat 0–24 and no live mark. */
export const coolAndClean = (heat: number, liveMarks: number): boolean =>
  heat < HEAT.states.noticed && liveMarks === 0;

/** A card's check difficulty: 10 (slice 4's deck), 14 on the hostile deck (the rival city's +4). */
export const cardDifficulty = (deck: 'ordinary' | 'hostile'): 10 | 14 =>
  deck === 'hostile' ? RIVAL_GROUND.cardDifficulty : TIER1_DIFFICULTY.battleground;

export interface Fare {
  base: number;
  lines: PriceLine[];
  total: number;
}

/**
 * ADR 0030: the ticket from a city: 20 Iron, each `ticketPct` source of the origin city a line
 * (Tram Subsidy, the Tram Fare Hike), multiplied and rounded half up once, never below 5 (20 → 10 → 5).
 */
export function fare(m?: Modifiers): Fare {
  const lines = priceLines(m, 'ticketPct');
  return { base: TRAVEL.fare, lines, total: priceWith(TRAVEL.fare, lines, TRAVEL.fareFloor) };
}

/**
 * Design §2.4, §3: the first journey a character ever makes always draws `firstId` (the
 * passenger); afterwards one journey in three draws a card, uniformly from the cards not yet seen
 * this round; when all have been seen the round starts again. Deterministic per seed.
 */
export function drawJourneyCard(i: {
  first: boolean;
  seen: readonly string[];
  deck: readonly string[];
  firstId: string;
  rng: Rng;
}): { eventId: string | null; seen: string[] } {
  if (i.first) return { eventId: i.firstId, seen: [i.firstId] };
  if (i.rng.int(1, TRAVEL.cardOneIn) !== 1) return { eventId: null, seen: [...i.seen] };
  let seen = i.seen.filter((id) => i.deck.includes(id));
  let left = i.deck.filter((id) => !seen.includes(id));
  if (left.length === 0) {
    seen = [];
    left = [...i.deck];
  }
  const eventId = left[i.rng.int(0, left.length - 1)]!;
  return { eventId, seen: [...seen, eventId] };
}

/** How far along the line, 0…1 (the journey screen's progress line). */
export function journeyProgress(boardedAt: number, arrivesAt: number, now: number): number {
  if (arrivesAt <= boardedAt) return 1;
  return Math.min(1, Math.max(0, (now - boardedAt) / (arrivesAt - boardedAt)));
}

/** What an outcome of a card pays (content `JourneyRewards`); absent = 0. */
export interface JourneyRewardsSpec {
  xp?: number;
  fxp?: number;
  iron?: number;
  /** Points toward the actor's faction at the destination (Station & Market for the capital). */
  opinion?: number;
  /** Points on the destination's first Issue. */
  momentum?: number;
  rested?: number;
  /** The reporter: the name in the Herald (`hl.*.quoted`). */
  quoted?: true;
  /** Slice 5 (design §11.4): Heat ±n, added through `addHeat`. */
  heat?: number;
  /** Slice 5: a day flag in the destination until the boundary. */
  flag?: 'watched' | 'warned';
}

/** A card's choice as the rules need it (content `JourneyChoice`). */
export interface JourneyChoiceSpec {
  id: string;
  /** Absent: an unchecked choice (no odds word, no roll). */
  stats?: CheckStatSpec;
  /** The stake (*Sit in* 20) or the price (*Pay his fare* 10). */
  cost?: { iron: number };
  success: { rewards: JourneyRewardsSpec };
  partial?: { rewards: JourneyRewardsSpec };
  /** Slice 5 (design §23.2): an unchecked choice that pays `success` when the gate holds, else `partial`. */
  gate?: 'coolAndClean';
}

export interface JourneyChoiceResolution {
  outcome: 'success' | 'partial' | 'chosen';
  check: CheckBreakdown | null;
  roll: number | null;
  rewards: JourneyRewardsSpec;
  /** The Iron the choice takes before it pays (the stake). */
  cost: number;
  /** Slice 5: a gated choice's branch (the checkpoint's *Waved on* or *They write your name down*). */
  branch?: 'pass' | 'stopped';
}

/** The chance a checked choice shows as an odds word (difficulty 10, the Standing bonus there). */
export function journeyChoiceCheck(i: {
  stats: CheckStatSpec;
  values: Stats;
  standingBonus: CheckBonus | null;
  /** Slice 5: 14 on the hostile deck; default 10. */
  difficulty?: 10 | 14;
}): CheckBreakdown {
  return computeCheck({
    stats: i.stats,
    values: i.values,
    difficulty: i.difficulty ?? TIER1_DIFFICULTY.battleground,
    bonuses: i.standingBonus ? [i.standingBonus] : [],
  });
}

/**
 * Design §3: a checked choice is §8.4 at difficulty 10 with the Standing bonus of the destination,
 * on the tier-1 bands, so it never fails (Success or Partial); an unchecked one is simply chosen
 * and pays its success rewards. One roll from the journey's own seed.
 */
export function resolveJourneyChoice(i: {
  choice: JourneyChoiceSpec;
  values: Stats;
  standingBonus: CheckBonus | null;
  rng: Rng;
  /** Slice 5: 14 on the hostile deck. */
  difficulty?: 10 | 14;
  /** Slice 5: whether a gated choice's gate holds (the checkpoint: Cool and Clean). */
  gateHolds?: boolean;
}): JourneyChoiceResolution {
  const cost = i.choice.cost?.iron ?? 0;
  if (!i.choice.stats) {
    if (i.choice.gate) {
      const pass = i.gateHolds === true;
      const rewards = pass ? i.choice.success.rewards : (i.choice.partial?.rewards ?? {});
      return { outcome: 'chosen', check: null, roll: null, rewards: { ...rewards }, cost, branch: pass ? 'pass' : 'stopped' };
    }
    return { outcome: 'chosen', check: null, roll: null, rewards: { ...i.choice.success.rewards }, cost };
  }
  const check = journeyChoiceCheck({
    stats: i.choice.stats,
    values: i.values,
    standingBonus: i.standingBonus,
    ...(i.difficulty ? { difficulty: i.difficulty } : {}),
  });
  const roll = i.rng.roll100();
  const outcome = outcomeForRoll(roll, check.chance, 1) === 'success' ? 'success' : 'partial';
  const rewards = outcome === 'success' ? i.choice.success.rewards : (i.choice.partial?.rewards ?? {});
  return { outcome, check, roll, rewards: { ...rewards }, cost };
}

// ---------------------------------------------------------------------------------------------
// Review 4 (docs/tech/review-4.md §6.2, ADR 0075): the journey on the nation map. The route's legs,
// where the traveller's pin is at a moment, and the card's moment.
// ---------------------------------------------------------------------------------------------

/** A point on a picture, in fractions of its width and height. */
export type Pt = readonly [number, number];

/** One leg of a journey on the nation picture: its points in travel order and its minutes. */
export interface RouteLeg {
  points: Pt[];
  minutes: number;
}

/**
 * The legs from `from` to `to` (ADR 0075 §2). Routes are stored from the capital out: a journey out
 * of the capital takes the leg as stored, one into it the leg reversed, and an outer city to another
 * the first city's leg reversed, then the second's (through the capital, as the times are added).
 */
export function journeyLegs(
  routes: ReadonlyArray<{ to: string; points: readonly Pt[] }>,
  from: string,
  to: string,
  capitalId: string,
  minutesOf: (cityId: string) => number,
): RouteLeg[] {
  if (from === to) return [];
  const leg = (cityId: string): Pt[] => {
    const r = routes.find((x) => x.to === cityId);
    if (!r) throw new RangeError(`no route to "${cityId}"`);
    return r.points.map((p) => [p[0], p[1]] as const);
  };
  if (from === capitalId) return [{ points: leg(to), minutes: minutesOf(to) }];
  if (to === capitalId) return [{ points: leg(from).reverse(), minutes: minutesOf(from) }];
  return [
    { points: leg(from).reverse(), minutes: minutesOf(from) },
    { points: leg(to), minutes: minutesOf(to) },
  ];
}

/**
 * Each leg's share of the journey's time, as fractions 0…1 (§23.1 Q8: by its minutes, not by its
 * drawn length). Legs of 0 minutes share the time equally.
 */
export function legSpans(legs: ReadonlyArray<Pick<RouteLeg, 'minutes'>>): Array<{ fromT: number; toT: number }> {
  const total = legs.reduce((s, l) => s + Math.max(0, l.minutes), 0);
  let acc = 0;
  return legs.map((l, i) => {
    const share = total > 0 ? Math.max(0, l.minutes) / total : 1 / legs.length;
    const fromT = acc;
    acc = i === legs.length - 1 ? 1 : acc + share;
    return { fromT, toT: acc };
  });
}

/** Where `f` (0…1 of its length) falls on a polyline, and the heading there in degrees. */
function along(points: readonly Pt[], f: number, aspect: number): { x: number; y: number; angle: number } {
  const first = points[0];
  if (!first) return { x: 0, y: 0, angle: 0 };
  if (points.length === 1) return { x: first[0], y: first[1], angle: 0 };
  const seg = (i: number) => {
    const a = points[i]!;
    const b = points[i + 1]!;
    return Math.hypot((b[0] - a[0]) * aspect, b[1] - a[1]);
  };
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) total += seg(i);
  let left = Math.min(1, Math.max(0, f)) * total;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const len = seg(i);
    if (left <= len || i === points.length - 2) {
      const t = len > 0 ? Math.min(1, left / len) : 1;
      const angle = (Math.atan2(b[1] - a[1], (b[0] - a[0]) * aspect) * 180) / Math.PI;
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, angle };
    }
    left -= len;
  }
  const last = points[points.length - 1]!;
  return { x: last[0], y: last[1], angle: 0 };
}

/**
 * The traveller at `progress` (0–1 of the journey's time; ADR 0075 §2): each leg takes its minutes'
 * share of the time, and within a leg the pin moves by length. `aspect` is the picture's width over
 * its height (the nation picture is square: 1), so length is measured on the picture.
 */
export function trainAt(
  legs: readonly RouteLeg[],
  progress: number,
  aspect = 1,
): { x: number; y: number; angle: number; leg: number } {
  if (legs.length === 0) return { x: 0, y: 0, angle: 0, leg: 0 };
  const p = Math.min(1, Math.max(0, progress));
  const spans = legSpans(legs);
  for (let i = 0; i < legs.length; i++) {
    const s = spans[i]!;
    if (p <= s.toT || i === legs.length - 1) {
      const f = s.toT > s.fromT ? (p - s.fromT) / (s.toT - s.fromT) : 1;
      return { ...along(legs[i]!.points, f, aspect), leg: i };
    }
  }
  return { ...along(legs[legs.length - 1]!.points, 1, aspect), leg: legs.length - 1 };
}

/**
 * Review 5 #7 (answers §7, GDD §14.10): the journey card's explicit put-aside row (*Sleep through it*,
 * or *Let it pass* on the hostile deck), sent as the card's last choice and chosen like any other.
 * Its outcome is the card's `ignore` text and `ignoreEffects`, at once. No content choice uses this id.
 */
export const JOURNEY_SET_ASIDE = 'set-aside';

/** ADR 0075 §3 (answers §7.2): the card fires between a fifth and four fifths of the way. */
export const CARD_AT = { from: 0.2, to: 0.8 } as const;

/**
 * The card's moment, epoch ms in whole seconds, uniform in CARD_AT of [boardedAt, arrivesAt]
 * (ADR 0075 §3). The server draws it from `seed + ':cardAt'`, so a re-run under the same request key
 * draws the same moment.
 */
export function drawCardAt(rng: Rng, boardedAt: number, arrivesAt: number): number {
  const span = Math.max(0, arrivesAt - boardedAt);
  const lo = Math.ceil((boardedAt + CARD_AT.from * span) / 1_000) * 1_000;
  const hi = Math.floor((boardedAt + CARD_AT.to * span) / 1_000) * 1_000;
  const f = rng.next();
  if (hi < lo) return boardedAt + Math.round(((CARD_AT.from + CARD_AT.to) / 2) * span);
  return lo + Math.round((f * (hi - lo)) / 1_000) * 1_000;
}
