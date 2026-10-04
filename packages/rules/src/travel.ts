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
