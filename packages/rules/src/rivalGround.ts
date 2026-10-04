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

/** The rival pressure stored on a home city: thousandths of a point lost to rivals on `day`. */
export interface RivalPressure {
  day: DayKey;
  /** Thousandths. */
  lost: number;
  prev: { day: DayKey; lost: number } | null;
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

/**
 * The pressure after a home faction lost `takenK` thousandths to a rival today; a new day keeps the
 * day before as `prev` (the paper's *Rival Callers*).
 */
export function addPressure(p: RivalPressure | null | undefined, today: DayKey, takenK: number): RivalPressure {
  if (p && p.day === today) return { day: today, lost: p.lost + takenK, prev: p.prev };
  const prev = p ? { day: p.day, lost: p.lost } : null;
  return { day: today, lost: takenK, prev };
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
