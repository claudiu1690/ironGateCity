import { OPINION_DECIMALS, OPINION_PER_ENERGY, OUTCOME_FACTOR, RESTED, TIER_RATES } from './constants';
import type { Outcome, RewardLine, RewardPart, Rewards } from './types';

/** Nearest whole number, halves up (§5.5). The epsilon absorbs float noise such as 22.499999999. */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

/** Opinion keeps a fixed number of decimals (§14.2). */
export function roundOpinion(x: number): number {
  const f = 10 ** OPINION_DECIMALS;
  return Math.round(x * f + 1e-9) / f;
}

/** A named bonus share of a line (Rested, a Party order, Fired up, an ordinance). */
export interface LineShare {
  id: string;
  label: string;
  share: number;
}

/** Part ids that existed before slice 3; a line with only these carries no `parts` (ADR 0021). */
const CLASSIC_PARTS = new Set(['rested', 'order']);

/**
 * One reward line (§5.5): worked out in full precision, then base and each bonus part rounded
 * separately so the tiles add up (ADR 0021: each part halves up on its own). A line that pays on a
 * Success pays at least 1 on a Partial. `parts` is set only when a slice-3 modifier contributed, so
 * results with only Rested or the Party order keep their slice-1 shape.
 */
function line(successBase: number, shares: readonly LineShare[], outcome: Outcome): RewardLine {
  const full = successBase * OUTCOME_FACTOR[outcome];
  let base = roundHalfUp(full);
  if (outcome === 'partial' && successBase > 0) base = Math.max(1, base);
  const parts = shares
    .filter((s) => s.share > 0)
    .map((s) => ({ id: s.id, label: s.label, amount: roundHalfUp(full * s.share) }));
  const bonus = parts.reduce((sum, p) => sum + p.amount, 0);
  const out: RewardLine = { base, bonus, total: base + bonus };
  if (parts.some((p) => !CLASSIC_PARTS.has(p.id))) out.parts = parts.filter((p) => p.amount !== 0);
  return out;
}

const NOTHING: RewardLine = { base: 0, bonus: 0, total: 0 };

export const RESTED_PART = { id: 'rested', label: 'Rested' } as const;
export const ORDER_PART = { id: 'order', label: 'Party order' } as const;

export function computeRewards(i: {
  tier: 1;
  /** The content Energy: rewards are computed on it, never on a modified cost (ADR 0021 §3). */
  energy: number;
  outcome: Outcome;
  givesFxp: boolean;
  givesOpinion: boolean;
  restedUsed: number;
  /** The Energy actually paid (Rally Permits: 10 for a 12-Energy speech); default `energy`. */
  costPaid?: number;
  /** §13.3: council sessions pay FXP at 1.5× the tier rate. */
  fxpRateMultiplier?: number;
  /** §15.4: +25 % of the base FXP when the attempt advances an open Party order. */
  fxpBonusShare?: number;
  /** Slice 3: Fired up and Public Meetings on FXP, Ward Fund on Iron. */
  fxpShares?: readonly LineShare[];
  ironShares?: readonly LineShare[];
  /** Street Permits: × 1.15 on the opinion swing. */
  swingMultiplier?: number;
}): Rewards {
  const rates = TIER_RATES[i.tier];
  const paid = i.costPaid ?? i.energy;
  // §6.3: Rested is spent per Energy point, so its bonus is proportional to the share of the cost
  // paid it covered (a fully covered 10-Energy speech under Rally Permits gets the full +50 %).
  const restedShare = paid > 0 ? Math.min(1, i.restedUsed / paid) : 0;

  const xp = line(
    rates.xpPerEnergy * i.energy,
    [{ ...RESTED_PART, share: RESTED.xpBonus * restedShare }],
    i.outcome,
  );
  // FXP and influence never get the Rested bonus (§6.3); FXP gets the Party-order bonus instead.
  const fxp = i.givesFxp
    ? line(
        rates.fxpPerEnergy * i.energy * (i.fxpRateMultiplier ?? 1),
        [{ ...ORDER_PART, share: i.fxpBonusShare ?? 0 }, ...(i.fxpShares ?? [])],
        i.outcome,
      )
    : { ...NOTHING };
  const iron = line(
    rates.ironPerEnergy * i.energy,
    [{ ...RESTED_PART, share: RESTED.ironBonus * restedShare }, ...(i.ironShares ?? [])],
    i.outcome,
  );
  const opinion = i.givesOpinion
    ? roundOpinion(
        OPINION_PER_ENERGY[i.tier] * i.energy * OUTCOME_FACTOR[i.outcome] * (i.swingMultiplier ?? 1),
      )
    : 0;

  return { xp, fxp, iron, opinion };
}

/** Line-by-line sum of several attempts' rewards (the modal's tiles; opinion to three decimals). */
export function sumRewards(list: Rewards[]): Rewards {
  const add = (a: RewardLine, b: RewardLine): RewardLine => {
    const out: RewardLine = { base: a.base + b.base, bonus: a.bonus + b.bonus, total: a.total + b.total };
    if (a.parts || b.parts) out.parts = mergeParts(a.parts ?? [], b.parts ?? []);
    return out;
  };
  return list.reduce<Rewards>(
    (acc, r) => ({
      xp: add(acc.xp, r.xp),
      fxp: add(acc.fxp, r.fxp),
      iron: add(acc.iron, r.iron),
      opinion: roundOpinion(acc.opinion + r.opinion),
    }),
    { xp: { ...NOTHING }, fxp: { ...NOTHING }, iron: { ...NOTHING }, opinion: 0 },
  );
}

/** A reward line with no Outcome factor (training XP: 2.25 per Energy plus the Rested bonus). */
export function flatLine(base: number, bonusShare: number): RewardLine {
  const b = roundHalfUp(base);
  const bonus = roundHalfUp(base * bonusShare);
  return { base: b, bonus, total: b + bonus };
}

/** Parts summed by id, in first-seen order. */
export function mergeParts(a: readonly RewardPart[], b: readonly RewardPart[]): RewardPart[] {
  const out: RewardPart[] = a.map((p) => ({ ...p }));
  for (const p of b) {
    const found = out.find((x) => x.id === p.id);
    if (found) found.amount += p.amount;
    else out.push({ ...p });
  }
  return out;
}
