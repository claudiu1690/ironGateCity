import { MORALE, OPINION_FLOORS } from './constants';
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
