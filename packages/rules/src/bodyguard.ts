import { BODYGUARD } from './constants';
import type { DayKey } from './day';
import type { Rng } from './rng';

/**
 * Bodyguards (tech design §24, ADR 0088; design §24.2): one prepaid contract at a time, its rent a
 * day key as the flat's (ADR 0056). A lapse writes nothing; the record stays, so the same tier
 * brings back the same man (§24.10 Q5).
 */

export type BodyguardTier = 1 | 2 | 3;

export interface Contract {
  tier: BodyguardTier;
  name: string;
  /** Inclusive. */
  paidThroughDay: DayKey;
}

export const contractCounts = (c: Contract | null, day: DayKey): boolean => !!c && day <= c.paidThroughDay;
/** His last day (the headline `bodyguard-last`). */
export const lastDay = (c: Contract | null, today: DayKey): boolean =>
  contractCounts(c, today) && c!.paidThroughDay === today;
/** Gone this morning (the headline `bodyguard-gone`). */
export const goneToday = (c: Contract | null, today: DayKey): boolean =>
  !!c && c.paidThroughDay === today - 1;

export const minderPower = (tier: BodyguardTier): number => BODYGUARD.tiers[tier].power;

export type HireRefusal = 'MEMBERS_ONLY' | 'LEVEL' | 'RANK' | 'WITH_YOU' | 'NOT_ENOUGH_IRON';

/** Tech design §24.1: your own party's store, the tier's gate, no contract counting today, the week's Iron. */
export function hireGate(i: {
  tier: BodyguardTier;
  level: number;
  rank: number;
  member: boolean;
  contract: Contract | null;
  today: DayKey;
  iron: number;
}): null | { reason: HireRefusal; need?: number; name?: string; until?: DayKey } {
  const spec = BODYGUARD.tiers[i.tier];
  if (!i.member) return { reason: 'MEMBERS_ONLY' };
  if (spec.level !== null && i.level < spec.level) return { reason: 'LEVEL', need: spec.level };
  if (spec.rank !== null && i.rank < spec.rank) return { reason: 'RANK', need: spec.rank };
  if (i.contract && contractCounts(i.contract, i.today))
    return { reason: 'WITH_YOU', name: i.contract.name, until: i.contract.paidThroughDay };
  if (i.iron < spec.week) return { reason: 'NOT_ENOUGH_IRON', need: spec.week };
  return null;
}

/** §24.10 Q5: the same tier as the stored contract brings back his name; else one of the tier's three. */
export function hire(i: {
  tier: BodyguardTier;
  contract: Contract | null;
  names: readonly string[];
  today: DayKey;
  rng: Rng;
}): Contract {
  const name =
    i.contract && i.contract.tier === i.tier
      ? i.contract.name
      : (i.names[i.rng.int(0, i.names.length - 1)] ?? '');
  return { tier: i.tier, name, paidThroughDay: i.today + BODYGUARD.weekDays - 1 };
}

export const renewed = (c: Contract, weeks: 1 | 4, today: DayKey): Contract => ({
  ...c,
  paidThroughDay: Math.max(c.paidThroughDay, today - 1) + BODYGUARD.weekDays * weeks,
});

/** §24.10 Q1: four renewal weeks beyond the running one (`paidThroughDay` at most today + 34). */
export const aheadLimit = (today: DayKey): DayKey =>
  today + BODYGUARD.weekDays - 1 + BODYGUARD.weekDays * BODYGUARD.aheadWeeks;
export const canRenew = (c: Contract, weeks: 1 | 4, today: DayKey): boolean =>
  renewed(c, weeks, today).paidThroughDay <= aheadLimit(today);

export type RenewRefusal = 'NO_CONTRACT' | 'PAID_AHEAD' | 'NOT_ENOUGH_IRON';

/** Tech design §24.1: a contract counting today, within the limit, the weeks' Iron. */
export function renewGate(i: {
  contract: Contract | null;
  weeks: 1 | 4;
  today: DayKey;
  iron: number;
}): null | { reason: RenewRefusal; until?: DayKey; need?: number } {
  if (!i.contract || !contractCounts(i.contract, i.today)) return { reason: 'NO_CONTRACT' };
  if (!canRenew(i.contract, i.weeks, i.today))
    return { reason: 'PAID_AHEAD', until: i.contract.paidThroughDay };
  const need = BODYGUARD.tiers[i.contract.tier].week * i.weeks;
  if (i.iron < need) return { reason: 'NOT_ENOUGH_IRON', need };
  return null;
}
