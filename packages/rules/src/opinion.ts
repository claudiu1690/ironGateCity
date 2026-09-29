import { OPINION_FLOORS } from './constants';
import { FACTION_IDS } from './types';
import type { FactionId, OpinionShares } from './types';

const K = 1_000; // shares are kept in integer thousandths of a point (§14.2)

const toK = (x: number) => Math.round(x * K);
const fromK = (x: number) => x / K;

/**
 * §14.2 persuasion: move `swing` points toward `factionId`, drawn from Neutral first (never below
 * 5 %), then from the rivals in proportion to their shares (a home faction never below 50 % in its
 * home city). If nothing can be drawn the swing shrinks. Integer thousandths, so the shares always
 * sum to exactly 100.000.
 */
export function applyPersuasion(
  shares: OpinionShares,
  i: { factionId: FactionId; swing: number; homeFactionId?: FactionId },
): { shares: OpinionShares; applied: number } {
  const s: Record<FactionId | 'neutral', number> = {
    vanguard: toK(shares.vanguard),
    collective: toK(shares.collective),
    alliance: toK(shares.alliance),
    neutral: toK(shares.neutral),
  };
  const wanted = Math.max(0, toK(i.swing));
  let remaining = wanted;

  // 1. Neutral first, down to its floor.
  const fromNeutral = Math.min(remaining, Math.max(0, s.neutral - OPINION_FLOORS.neutral * K));
  s.neutral -= fromNeutral;
  remaining -= fromNeutral;

  // 2. The rivals, in proportion to their shares, each down to its floor.
  const floorOf = (f: FactionId) => (f === i.homeFactionId ? OPINION_FLOORS.homeFaction * K : 0);
  const rivals = FACTION_IDS.filter((f) => f !== i.factionId);
  while (remaining > 0) {
    const eligible = rivals.filter((f) => s[f] - floorOf(f) > 0);
    const total = eligible.reduce((sum, f) => sum + s[f], 0);
    if (eligible.length === 0 || total <= 0) break;
    // Largest-remainder split of `remaining`, then capped at what each rival can give.
    const exact = eligible.map((f) => (remaining * s[f]) / total);
    const take = exact.map(Math.floor);
    let left = remaining - take.reduce((a, b) => a + b, 0);
    const order = exact
      .map((x, idx) => ({ idx, frac: x - Math.floor(x) }))
      .sort((a, b) => b.frac - a.frac || a.idx - b.idx);
    for (const { idx } of order) {
      if (left <= 0) break;
      take[idx]! += 1;
      left -= 1;
    }
    let drawn = 0;
    eligible.forEach((f, idx) => {
      const amount = Math.min(take[idx]!, s[f] - floorOf(f));
      s[f] -= amount;
      drawn += amount;
    });
    remaining -= drawn;
    if (drawn === 0) break;
  }

  const applied = wanted - remaining;
  s[i.factionId] += applied;
  return {
    shares: {
      vanguard: fromK(s.vanguard),
      collective: fromK(s.collective),
      alliance: fromK(s.alliance),
      neutral: fromK(s.neutral),
    },
    applied: fromK(applied),
  };
}
