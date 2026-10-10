import { MORALE, OPINION_FLOORS, UNREST_PRIZE } from './constants';
import type { DayKey } from './day';
import type { FactionId, OpinionShares } from './types';

/**
 * Morale (GDD §14.11, ADR 0022): the home faction's share of its home city, with three states.
 * No second number: the state is derived from the share.
 */
export type MoraleState = 'fired' | 'steady' | 'unrest';

export interface MoraleRecord {
  state: MoraleState;
  since: DayKey;
  previous: MoraleState | null;
}

/** ≥ 80 Fired up · ≥ 60 Steady · below 60 Unrest. */
export function moraleState(share: number): MoraleState {
  if (share >= MORALE.firedFrom) return 'fired';
  if (share >= MORALE.unrestBelow) return 'steady';
  return 'unrest';
}

const K = 1_000;
const toK = (x: number) => Math.round(x * K);
const fromK = (x: number) => x / K;

function move(
  shares: OpinionShares,
  home: FactionId,
  wantedK: number,
): { shares: OpinionShares; appliedK: number } {
  const s = {
    vanguard: toK(shares.vanguard),
    collective: toK(shares.collective),
    alliance: toK(shares.alliance),
    neutral: toK(shares.neutral),
  };
  let applied: number;
  if (wantedK >= 0) {
    // Up: Neutral → home, Neutral never below its floor.
    applied = Math.max(0, Math.min(wantedK, s.neutral - OPINION_FLOORS.neutral * K));
    s.neutral -= applied;
    s[home] += applied;
  } else {
    // Down: home → Neutral, the home faction never below its floor.
    applied = -Math.max(0, Math.min(-wantedK, s[home] - OPINION_FLOORS.homeFaction * K));
    s[home] += applied;
    s.neutral -= applied;
  }
  return {
    shares: {
      vanguard: fromK(s.vanguard),
      collective: fromK(s.collective),
      alliance: fromK(s.alliance),
      neutral: fromK(s.neutral),
    },
    appliedK: applied,
  };
}

/**
 * §14.11 (design §11.2): each boundary the home share drifts 2 % of its distance to 70, to or from
 * Neutral (95 → 94.5; 60 → 60.2). Three decimals, like every share.
 */
export function applyDrift(shares: OpinionShares, home: FactionId): { shares: OpinionShares; delta: number } {
  const delta = Math.round(MORALE.driftShare * (MORALE.driftTarget - shares[home]) * K + 1e-9);
  const r = move(shares, home, delta);
  return { shares: r.shares, delta: fromK(r.appliedK) };
}

/** −3 at a count no player voted in: home → Neutral, the home share never below 50 (§14.2). */
export function applyMoraleLoss(
  shares: OpinionShares,
  home: FactionId,
  amount: number,
): { shares: OpinionShares; applied: number } {
  const r = move(shares, home, -toK(Math.max(0, amount)));
  return { shares: r.shares, applied: fromK(-r.appliedK) };
}

/** A new morale record when the state changes, else null. */
export function moraleTransition(
  prev: MoraleRecord | null | undefined,
  share: number,
  day: DayKey,
): MoraleRecord | null {
  const state = moraleState(share);
  if (prev && prev.state === state) return null;
  return { state, since: day, previous: prev?.state ?? null };
}

/**
 * Review 5 (answers §10.3, ADR 0082): the Unrest prize's step at a home city's boundary `day`, from
 * the morale record after the boundary's own transition and the city's `unrestPrize`. An entry is
 * the record's `since` while in Unrest; each entry is considered once, and it pays when nothing was
 * paid in the `everyDays` before. Pure.
 */
export function unrestEntry(i: {
  morale: MoraleRecord | null | undefined;
  prize: { entry: DayKey | null; paidDay: DayKey | null } | null | undefined;
  day: DayKey;
}): { consider: false } | { consider: true; entry: DayKey; pay: boolean } {
  const m = i.morale;
  if (!m || m.state !== 'unrest') return { consider: false };
  if (i.prize?.entry === m.since) return { consider: false };
  const paid = i.prize?.paidDay ?? null;
  return { consider: true, entry: m.since, pay: paid === null || i.day - paid >= UNREST_PRIZE.everyDays };
}

/**
 * Review 5 (ADR 0082): who is paid. The pushers of other parties with at least `minPushedK`
 * thousandths; `topByFaction` names each party's top three (by push, then name) for the headline.
 */
export function prizeWinners<
  R extends { characterId: string; name: string; factionId: FactionId; pushedK: number },
>(rows: readonly R[], home: FactionId): { winners: R[]; topByFaction: Partial<Record<FactionId, string[]>> } {
  const winners = rows
    .filter((r) => r.factionId !== home && r.pushedK >= UNREST_PRIZE.minPushedK)
    .sort((a, b) => b.pushedK - a.pushedK || a.name.localeCompare(b.name));
  const topByFaction: Partial<Record<FactionId, string[]>> = {};
  for (const w of winners) {
    const list = (topByFaction[w.factionId] ??= []);
    if (list.length < UNREST_PRIZE.top) list.push(w.name);
  }
  return { winners, topByFaction };
}
