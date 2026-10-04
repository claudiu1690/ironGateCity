import { DISTRICT, OPINION_FLOORS } from './constants';
import type { DayKey } from './day';
import { FACTION_IDS } from './types';
import type { FactionId, OpinionShares } from './types';

/**
 * A capital district's meter at the boundary (slice-4 tech design §6.4, design §6, GDD §14.2,
 * §14.4, ADR 0027): the drift to its baseline, the close race (Battleground), control and the
 * comeback (Groundswell). Shares are integer thousandths of a point, so they always sum to 100.000.
 */

const K = 1_000;
const toK = (x: number) => Math.round(x * K);
const fromK = (x: number) => x / K;

type KShares = Record<FactionId | 'neutral', number>;
const kShares = (s: OpinionShares): KShares => ({
  vanguard: toK(s.vanguard),
  collective: toK(s.collective),
  alliance: toK(s.alliance),
  neutral: toK(s.neutral),
});
const fromKShares = (s: KShares): OpinionShares => ({
  vanguard: fromK(s.vanguard),
  collective: fromK(s.collective),
  alliance: fromK(s.alliance),
  neutral: fromK(s.neutral),
});

/**
 * Design §6.2: each faction moves 1 % of its distance to the district's baseline (rounded to the
 * thousandth), the balance to or from Neutral. Neutral's floor (5) applies: what Neutral cannot
 * give to the factions rising is left (shared among them in proportion, largest remainder).
 * `moves` are the applied changes in points, per faction that moved.
 */
export function applyBaselineDrift(
  shares: OpinionShares,
  baseline: OpinionShares,
): { shares: OpinionShares; moves: Partial<Record<FactionId, number>> } {
  const s = kShares(shares);
  const b = kShares(baseline);
  const wanted = Object.fromEntries(
    FACTION_IDS.map((f) => [
      f,
      Math.round(DISTRICT.driftShare * (b[f] - s[f]) + 1e-9 * Math.sign(b[f] - s[f])),
    ]),
  ) as Record<FactionId, number>;

  // Falling factions give to Neutral first; then Neutral pays the rising ones down to its floor.
  let neutral = s.neutral;
  for (const f of FACTION_IDS) if (wanted[f] < 0) neutral -= wanted[f];
  const rising = FACTION_IDS.filter((f) => wanted[f] > 0);
  const asked = rising.reduce((sum, f) => sum + wanted[f], 0);
  const available = Math.max(0, neutral - OPINION_FLOORS.neutral * K);
  const granted: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
  if (asked <= available) {
    for (const f of rising) granted[f] = wanted[f];
  } else if (asked > 0) {
    const exact = rising.map((f) => (available * wanted[f]) / asked);
    const take = exact.map(Math.floor);
    let left = available - take.reduce((a, c) => a + c, 0);
    const order = exact
      .map((x, idx) => ({ idx, frac: x - Math.floor(x) }))
      .sort((a, c) => c.frac - a.frac || a.idx - c.idx);
    for (const { idx } of order) {
      if (left <= 0) break;
      take[idx]! += 1;
      left -= 1;
    }
    rising.forEach((f, idx) => (granted[f] = take[idx]!));
  }

  const moves: Partial<Record<FactionId, number>> = {};
  for (const f of FACTION_IDS) {
    const applied = wanted[f] < 0 ? wanted[f] : granted[f];
    if (applied !== 0) {
      s[f] += applied;
      s.neutral -= applied;
      moves[f] = fromK(applied);
    }
  }
  return { shares: fromKShares(s), moves };
}

/** The faction shares, largest first (ties in faction order). */
function ranked(s: OpinionShares): Array<{ f: FactionId; k: number }> {
  return FACTION_IDS.map((f) => ({ f, k: toK(s[f]) })).sort((a, b) => b.k - a.k);
}

/**
 * Slice 5 (ADR 0034 §5): the faction leading a district, the top faction share; a tie goes to the
 * first in FACTION_IDS order. A mission against `leader` aims here (or at the runner-up).
 */
export function districtLeader(s: OpinionShares): FactionId {
  return ranked(s)[0]!.f;
}

/** Slice 5: the runner-up (second faction share; ties in FACTION_IDS order). */
export function districtRunnerUp(s: OpinionShares): FactionId {
  return ranked(s)[1]!.f;
}

/** §14.4: a close race when the top two faction shares are within 10 points (inclusive). */
export function isBattleground(s: OpinionShares): boolean {
  const [a, b] = ranked(s);
  return a!.k - b!.k <= DISTRICT.battlegroundWithin * K;
}

/** §14.3: the faction above 50 (50.000 is not control), or null. */
export function controller(s: OpinionShares): FactionId | null {
  const top = ranked(s)[0]!;
  return top.k > DISTRICT.controlAbove * K ? top.f : null;
}

/** §14.4: a comeback in a district, from the boundary control was lost for 14 boundaries. */
export interface Groundswell {
  factionId: FactionId;
  fromDay: DayKey;
  /** Exclusive: the boundary into this day ends it. */
  untilDay: DayKey;
}

/**
 * Design §6.3–§6.4: the district's state after the boundary into `day`. A faction that held the
 * district (above 50) at the last boundary and does not now gains a Groundswell from `day` for 14
 * boundaries; it ends when that faction retakes control or at `untilDay`.
 */
export function districtState(
  prev: { controlledBy: FactionId | null; groundswell: Groundswell | null },
  shares: OpinionShares,
  day: DayKey,
): {
  battleground: boolean;
  controlledBy: FactionId | null;
  groundswell: Groundswell | null;
  started: FactionId | null;
  ended: boolean;
} {
  const controlledBy = controller(shares);
  let groundswell = prev.groundswell;
  let ended = false;
  if (groundswell && (controlledBy === groundswell.factionId || day >= groundswell.untilDay)) {
    groundswell = null;
    ended = true;
  }
  let started: FactionId | null = null;
  if (prev.controlledBy !== null && controlledBy !== prev.controlledBy) {
    started = prev.controlledBy;
    groundswell = { factionId: started, fromDay: day, untilDay: day + DISTRICT.groundswellDays };
    ended = false;
  }
  return { battleground: isBattleground(shares), controlledBy, groundswell, started, ended };
}

/** §14.4: +5 % a day from the first, to +30 % from the sixth. */
export const groundswellPct = (g: Pick<Groundswell, 'fromDay'>, day: DayKey): number =>
  DISTRICT.groundswellPerDay *
  Math.min(DISTRICT.groundswellMax / DISTRICT.groundswellPerDay, Math.max(0, day - g.fromDay + 1));

/**
 * Design §6.6: the city's share is the equal average of its districts, computed on read; to the
 * thousandth, Neutral taking the rounding so the sum stays 100.000.
 */
export function averageShares(list: readonly OpinionShares[]): OpinionShares {
  if (list.length === 0) throw new RangeError('averageShares needs at least one district');
  const out: KShares = { vanguard: 0, collective: 0, alliance: 0, neutral: 0 };
  for (const f of FACTION_IDS) {
    out[f] = Math.round(list.reduce((sum, s) => sum + toK(s[f]), 0) / list.length);
  }
  out.neutral = 100 * K - out.vanguard - out.collective - out.alliance;
  return fromKShares(out);
}
