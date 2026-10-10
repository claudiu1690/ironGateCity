import { RIVAL_GROUND } from './constants';
import type { DayKey } from './day';
import type { MoraleState } from './morale';
import type { CheckBonus, FactionId } from './types';

/**
 * Rival ground (GDD §14.11–§14.12, design §11, ADR 0034): a home city of another faction. A place
 * state computed from the city document every action reads, not character state. Pure.
 */
export interface RivalGroundState {
  /** The faction whose home this is (the opinion is drawn from it). */
  homeFactionId: FactionId;
  /** Its morale is in Unrest: Party XP +75 % instead of +50 %. */
  unrest: boolean;
  /** Points the home faction can still lose to rivals today (the 2-point cap). */
  pressureLeft: number;
}

/** Thousandths of a point by the party that took them (review 5, ADR 0082). */
export type PushByFaction = Partial<Record<FactionId, number>>;

/** The rival pressure stored on a home city: thousandths of a point lost to rivals on `day`. */
export interface RivalPressure {
  day: DayKey;
  /** Thousandths. */
  lost: number;
  prev: { day: DayKey; lost: number } | null;
  /** Review 5 (ADR 0082): today's thousandths by the party that took them (absent before the round). */
  byFaction?: PushByFaction;
  /** Review 5 (ADR 0082): the six City Days before `day` that had a push, newest first. */
  week?: Array<{ day: DayKey; byFaction: PushByFaction }>;
}

/** +4 difficulty (§8.4: 4 % a point) as a named check row: the *worse odds* tag and the reason line. */
export const RIVAL_ROW: CheckBonus = { id: 'rivalGround', label: 'Rival ground', value: RIVAL_GROUND.checkRow };

/** Thousandths lost today (0 when the stored day is another). */
export const pressureLostToday = (p: RivalPressure | null | undefined, today: DayKey): number =>
  p && p.day === today ? p.lost : 0;

/** Rival ground for this actor, or null at home, in the capital or in a battleground. */
export function rivalGroundOf(i: {
  homeFactionId?: FactionId | null;
  actor: FactionId;
  morale: MoraleState | null;
  pressure: RivalPressure | null | undefined;
  today: DayKey;
}): RivalGroundState | null {
  if (!i.homeFactionId || i.homeFactionId === i.actor) return null;
  const capK = RIVAL_GROUND.pressureCapPerDay * 1_000;
  return {
    homeFactionId: i.homeFactionId,
    unrest: i.morale === 'unrest',
    pressureLeft: Math.max(0, capK - pressureLostToday(i.pressure, i.today)) / 1_000,
  };
}

/** The days the push ring keeps before today (today + six = the prize's seven). */
const WEEK_BEFORE = 6;

const plus = (a: PushByFaction | undefined, f: FactionId, k: number): PushByFaction => ({
  ...(a ?? {}),
  [f]: (a?.[f] ?? 0) + k,
});

/**
 * The pressure after a home faction lost `takenK` thousandths to `actor` today; a new day keeps the
 * day before as `prev` (the paper's *Rival Callers*). Review 5 (ADR 0082): the split by party, and a
 * new day moves the stored day into `week` (the six days before today; older days drop).
 */
export function addPressure(
  p: RivalPressure | null | undefined,
  today: DayKey,
  takenK: number,
  /** Optional only so the slice-5 tests that predate the split still compile; every act passes it. */
  actor?: FactionId,
): RivalPressure {
  if (p && p.day === today) {
    return {
      day: today,
      lost: p.lost + takenK,
      prev: p.prev,
      ...(actor ? { byFaction: plus(p.byFaction, actor, takenK) } : p.byFaction ? { byFaction: p.byFaction } : {}),
      week: (p.week ?? []).filter((w) => w.day >= today - WEEK_BEFORE && w.day < today),
    };
  }
  const prev = p ? { day: p.day, lost: p.lost } : null;
  const moved = p && p.byFaction && p.day < today ? [{ day: p.day, byFaction: p.byFaction }] : [];
  const week = [...moved, ...(p?.week ?? [])]
    .filter((w) => w.day >= today - WEEK_BEFORE && w.day < today)
    .sort((a, b) => b.day - a.day);
  return { day: today, lost: takenK, prev, ...(actor ? { byFaction: plus(undefined, actor, takenK) } : {}), week };
}

/** Today's thousandths by party ({} for another stored day, or a day stored before the split). */
export const pressureByFaction = (p: RivalPressure | null | undefined, today: DayKey): PushByFaction =>
  p && p.day === today ? { ...(p.byFaction ?? {}) } : {};

/** Thousandths `f` took from the home party over today and the six days before. */
export function pushedThisWeek(p: RivalPressure | null | undefined, today: DayKey, f: FactionId): number {
  if (!p) return 0;
  const days: Array<{ day: DayKey; byFaction: PushByFaction }> = [
    ...(p.byFaction ? [{ day: p.day, byFaction: p.byFaction }] : []),
    ...(p.week ?? []),
  ];
  return days
    .filter((d) => d.day <= today && d.day >= today - WEEK_BEFORE)
    .reduce((sum, d) => sum + (d.byFaction[f] ?? 0), 0);
}

/** Yesterday's loss in thousandths (the paper's *Rival Callers*), from `day` or `prev`. */
export function pressureOn(p: RivalPressure | null | undefined, day: DayKey): number {
  if (!p) return 0;
  if (p.day === day) return p.lost;
  return p.prev && p.prev.day === day ? p.prev.lost : 0;
}

/** The Party XP share on rival ground: +50 %, +75 % while the home city is in Unrest. */
export const rivalFxpShare = (r: RivalGroundState): number =>
  r.unrest ? RIVAL_GROUND.fxpShareUnrest : RIVAL_GROUND.fxpShare;
