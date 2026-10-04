import { CELLS, HEALTH, HEAT, RIVAL_GROUND } from './constants';
import { spendEnergy } from './energy';
import type { EnergyState } from './energy';
import { healthAt, healthMax, healthNow } from './health';
import type { HealthTimer } from './health';
import { setHeat } from './heat';
import type { HeatTimer } from './heat';
import type { PriceLine } from './ordinances';

/**
 * The cells and the infirmary (GDD §19.1–§19.2, design §8–§9, ADR 0033): timers that end on their
 * own, released on read as of `until`. Pure.
 */

export type HeldKind = 'cells' | 'infirmary';

export interface Bail {
  /** 100 + 50 a mark. */
  base: number;
  /** Notorious +100 %, rival ground +100 %, Legal Aid −50 %, and the city's `bailPct` sources. */
  lines: PriceLine[];
  /** Rounded to the nearest 10. */
  total: number;
}

export interface HeldSpec {
  kind: HeldKind;
  since: number;
  until: number;
  minutes: number;
  bail: Bail | null;
  rivalGround: boolean;
}

/** Design §8.2: 10 + Heat ÷ 2 minutes (Heat at the arrest), ×1.5 on rival ground, at most 60. */
export function sentenceMinutes(heat: number, rivalGround: boolean): number {
  const raw = (CELLS.baseMinutes + Math.floor(heat / CELLS.heatDivisor)) * (rivalGround ? CELLS.rivalFactor : 1);
  return Math.min(CELLS.maxMinutes, Math.floor(raw));
}

export const BAIL_LINES = {
  notorious: { id: 'notorious', label: 'Notorious' },
  rivalGround: { id: 'rivalGround', label: 'Rival ground' },
  legalAid: { id: 'legalAid', label: 'Legal Aid' },
} as const;

/**
 * Design §8.2: (100 + 50 × marks after the arrest) × Π(1 + pct / 100) over Notorious +100, rival
 * ground +100, Legal Aid −50 (Alliance members anywhere) and the city's `bailPct` sources (*The
 * Cells Are Full* −50), rounded to the nearest 10.
 */
export function bailFor(i: {
  marks: number;
  notorious: boolean;
  rivalGround: boolean;
  alliance: boolean;
  sources?: readonly PriceLine[];
}): Bail {
  const b = CELLS.bail;
  const base = b.base + b.perMark * i.marks;
  const lines: PriceLine[] = [
    ...(i.notorious ? [{ ...BAIL_LINES.notorious, pct: b.notoriousPct }] : []),
    ...(i.rivalGround ? [{ ...BAIL_LINES.rivalGround, pct: b.rivalPct }] : []),
    ...(i.alliance ? [{ ...BAIL_LINES.legalAid, pct: b.legalAidPct }] : []),
    ...(i.sources ?? []).map((l) => ({ ...l })),
  ];
  const raw = lines.reduce((x, l) => x * (1 + l.pct / 100), base);
  return { base, lines, total: Math.floor(raw / b.roundTo + 0.5 + 1e-9) * b.roundTo };
}

/** Taken in at `at` with Heat `heat` (the sentence) and the bail already worked out. */
export function arrest(i: { at: number; heat: number; rivalGround: boolean; bail: Bail }): HeldSpec {
  const minutes = sentenceMinutes(i.heat, i.rivalGround);
  return { kind: 'cells', since: i.at, until: i.at + minutes * 60_000, minutes, bail: i.bail, rivalGround: i.rivalGround };
}

/** Admitted at `at`: Health to 30 at once, twenty minutes on the ward (design §9.2). */
export function admit(i: { at: number; level: number; rivalGround?: boolean }): { held: HeldSpec; health: HealthTimer } {
  const minutes = HEALTH.stayMinutes;
  return {
    held: {
      kind: 'infirmary',
      since: i.at,
      until: i.at + minutes * 60_000,
      minutes,
      bail: null,
      rivalGround: i.rivalGround ?? false,
    },
    health: healthAt(HEALTH.admitted, i.level, i.at),
  };
}

/** A police loss: the cells, with Health set to 30 as at an admission (design §23.1 #4). */
export const policeLossHealth = (level: number, at: number): HealthTimer => healthAt(HEALTH.admitted, level, at);

/** In while `now < until` and not yet released. */
export const heldNow = (h: { until: number; state: 'in' | 'out' }, now: number): 'in' | 'out' =>
  h.state === 'in' && now < h.until ? 'in' : 'out';

/**
 * Released or discharged at `at` (the `until` read lazily, or now for a paid way out): from the cells
 * Heat is 25 at `at`, and on rival ground the player is put on the train home; from the infirmary at
 * whatever Health the regen has reached.
 */
export function release(i: { held: Pick<HeldSpec, 'kind' | 'rivalGround'>; at: number; health: HealthTimer }): {
  heat: HeatTimer | null;
  health: HealthTimer;
  deport: boolean;
} {
  const cells = i.held.kind === 'cells';
  return {
    heat: cells ? setHeat(HEAT.afterRelease, i.at) : null,
    health: { ...i.health },
    deport: cells && i.held.rivalGround,
  };
}

/** *Walk out well* (design §9.2): 5 Energy (Rested untouched), 100 Iron, Health to full, now. */
export function walkOut(i: { energy: EnergyState; level: number; iron: number; now: number }):
  | { ok: true; energy: EnergyState; health: HealthTimer; iron: number }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY' | 'NOT_ENOUGH_IRON' } {
  const spent = spendEnergy(i.energy, HEALTH.walkOut.energy, { useRested: false });
  if (!spent.ok) return { ok: false, reason: 'NOT_ENOUGH_ENERGY' };
  if (i.iron < HEALTH.walkOut.iron) return { ok: false, reason: 'NOT_ENOUGH_IRON' };
  return { ok: true, energy: spent.state, health: { damage: 0, at: i.now }, iron: HEALTH.walkOut.iron };
}

/** *Discharge yourself* (design §9.2): 5 Energy, out now at half of max Health or the current if higher. */
export function dischargeSelf(i: { energy: EnergyState; level: number; health: HealthTimer; now: number }):
  | { ok: true; energy: EnergyState; health: HealthTimer }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY' } {
  const spent = spendEnergy(i.energy, HEALTH.discharge.energy, { useRested: false });
  if (!spent.ok) return { ok: false, reason: 'NOT_ENOUGH_ENERGY' };
  const max = healthMax(i.level);
  const value = Math.max(Math.floor(max * HEALTH.discharge.share), healthNow(i.health, i.now, i.level));
  return { ok: true, energy: spent.state, health: healthAt(value, i.level, i.now) };
}

/** Design §11.5: put on the train home at `at` (the usual time); the city barred for 24 hours. */
export function deportation(i: { at: number; minutes: number }): {
  boardedAt: number;
  arrivesAt: number;
  barredUntil: number;
} {
  return { boardedAt: i.at, arrivesAt: i.at + i.minutes * 60_000, barredUntil: i.at + RIVAL_GROUND.barredMs };
}
