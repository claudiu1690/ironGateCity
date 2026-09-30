import { MORALE, ORDINANCE_BOUNDS, RESTED } from './constants';
import type { DayKey } from './day';
import type { MoraleState } from './morale';
import { roundHalfUp } from './rewards';
import type { CheckBonus } from './types';

/**
 * Ordinance effects (ADR 0021, GDD §15.3, design §10.1): a closed, bounded DSL owned by rules,
 * validated by content, applied as named modifiers that are constant for a City Day. Cost
 * ordinances change the cost only; rewards stay on the content Energy.
 */
export type OrdinanceEffect =
  | { kind: 'jobPayPct'; value: number }
  | { kind: 'seniorityDays'; value: number }
  | { kind: 'swingPct'; actionType: string; value: number }
  | { kind: 'energyDelta'; actionType: string; value: number }
  | { kind: 'trainingEnergyPct'; value: number }
  | { kind: 'restedCapDelta'; value: number }
  | { kind: 'chancePct'; actionType: string; value: number }
  | { kind: 'standingMultiplier'; value: number }
  | { kind: 'ironPct'; scope: 'checked'; value: number }
  | { kind: 'fxpPct'; scope: 'actions'; value: number };

export type OrdinanceEffectKind = OrdinanceEffect['kind'];

/** The bound problem of an effect, or null when it is inside ORDINANCE_BOUNDS. */
export function ordinanceBoundProblem(e: OrdinanceEffect): string | null {
  const [lo, hi] = ORDINANCE_BOUNDS[e.kind];
  return e.value < lo || e.value > hi ? `${e.kind} ${e.value} is outside its bound ${lo}…${hi}` : null;
}

export interface OrdinanceSpec {
  id: string;
  name: string;
  effects: readonly OrdinanceEffect[];
}

/** The modifiers in force for one actor in one city on one City Day. */
export interface CityModifiers {
  ordinance: OrdinanceSpec | null;
  /** The actor's home city, its faction's morale Fired up. */
  firedUp: boolean;
}

export const NO_MODIFIERS: CityModifiers = { ordinance: null, firedUp: false };

export function cityModifiers(i: {
  ordinance: OrdinanceSpec | null;
  moraleState: MoraleState | null;
  actorIsHomeFaction: boolean;
}): CityModifiers {
  return { ordinance: i.ordinance, firedUp: i.actorIsHomeFaction && i.moraleState === 'fired' };
}

/** The ordinance's effect of `kind` (for `actionType` where it has one), or null. */
export function effect<K extends OrdinanceEffectKind>(
  m: CityModifiers | undefined,
  kind: K,
  actionType?: string,
): Extract<OrdinanceEffect, { kind: K }> | null {
  const found = m?.ordinance?.effects.find(
    (e) => e.kind === kind && (!('actionType' in e) || e.actionType === actionType),
  );
  return (found as Extract<OrdinanceEffect, { kind: K }> | undefined) ?? null;
}

/** Rally Permits: speech 12 → 10 (never below 1). */
export function actionEnergy(base: number, type: string, m?: CityModifiers): number {
  const e = effect(m, 'energyDelta', type);
  return e ? Math.max(1, base + e.value) : base;
}

/** Reading Room Grant: training Energy −20 %, halves up (44 → 35). */
export function trainingEnergy(baseCost: number, m?: CityModifiers): number {
  const e = effect(m, 'trainingEnergyPct');
  return e ? Math.max(1, roundHalfUp(baseCost * (1 + e.value / 100))) : baseCost;
}

/** Review 1: the Long Service Order: each boundary adds two days of seniority (the cap unchanged). */
export function seniorityStep(m?: CityModifiers): number {
  return effect(m, 'seniorityDays')?.value ?? 1;
}

/** Public Works +10 % (216 → 238) and Ward Fund −25 % (216 → 162) on the daily pay. */
export function jobPayWith(pay: number, m?: CityModifiers): number {
  const e = effect(m, 'jobPayPct');
  return e ? roundHalfUp(pay * (1 + e.value / 100)) : pay;
}

/** Open Doors: a named bonus line in the check breakdown (the clamp still applies). */
export function ordinanceCheckBonuses(type: string, m?: CityModifiers): CheckBonus[] {
  const e = effect(m, 'chancePct', type);
  return e && m?.ordinance ? [{ id: m.ordinance.id, label: m.ordinance.name, value: e.value }] : [];
}

/** Street Permits: the opinion swing × 1.15 on propaganda. */
export function swingMultiplier(type: string, m?: CityModifiers): number {
  const e = effect(m, 'swingPct', type);
  return e ? 1 + e.value / 100 : 1;
}

/** Ward Register: every Success counts two for Local Standing. */
export function standingPerSuccess(m?: CityModifiers): number {
  return effect(m, 'standingMultiplier')?.value ?? 1;
}

/** Rest Day Order: the Rested cap 200 → 250. */
export function restedCapFor(m?: CityModifiers): number {
  return RESTED.cap + (effect(m, 'restedCapDelta')?.value ?? 0);
}

/** A named share of a reward line's base, rounded half up on its own (ADR 0021). */
export interface BonusShare {
  id: string;
  label: string;
  share: number;
}

export const FIRED_UP = { id: 'morale.fired', label: 'Fired up' } as const;

/**
 * The FXP and Iron bonus shares on a checked action in the city: Fired up +10 % and Public
 * Meetings +25 % of the base FXP, Ward Fund +25 % of the base Iron. The Party-order bonus is added
 * by the caller, since it depends on the row.
 */
export function rewardShares(i: { type: string; givesFxp: boolean; m?: CityModifiers }): {
  fxp: BonusShare[];
  iron: BonusShare[];
} {
  const fxp: BonusShare[] = [];
  const iron: BonusShare[] = [];
  const ord = i.m?.ordinance;
  if (i.givesFxp && i.m?.firedUp) fxp.push({ ...FIRED_UP, share: MORALE.firedFxpShare });
  const f = effect(i.m, 'fxpPct');
  if (i.givesFxp && f && ord) fxp.push({ id: ord.id, label: ord.name, share: f.value / 100 });
  const ir = effect(i.m, 'ironPct');
  if (ir && ord) iron.push({ id: ord.id, label: ord.name, share: ir.value / 100 });
  return { fxp, iron };
}

export type OrdinanceTagKind = 'energy' | 'chance' | 'iron' | 'fxp' | 'swing' | 'standing';

/** A ticket tag (screens §8): "Rally Permits: 10 Energy", "Open Doors: +4 %". */
export interface OrdinanceTagView {
  ordinanceId: string;
  name: string;
  kind: OrdinanceTagKind;
  /** The live cost for `energy`; a percentage for the others; ×n for `standing`. */
  value: number;
}

/** The tags a ticket carries under the ordinance in force (tech design §8.5). */
export function ordinanceTags(i: {
  kind: 'checked' | 'training';
  type: string;
  base: number;
  givesFxp?: boolean;
  m?: CityModifiers;
}): OrdinanceTagView[] {
  const ord = i.m?.ordinance;
  if (!ord) return [];
  const tag = (kind: OrdinanceTagKind, value: number): OrdinanceTagView => ({
    ordinanceId: ord.id,
    name: ord.name,
    kind,
    value,
  });
  const out: OrdinanceTagView[] = [];
  if (i.kind === 'checked') {
    if (effect(i.m, 'energyDelta', i.type)) out.push(tag('energy', actionEnergy(i.base, i.type, i.m)));
    const chance = effect(i.m, 'chancePct', i.type);
    if (chance) out.push(tag('chance', chance.value));
    const swing = effect(i.m, 'swingPct', i.type);
    if (swing) out.push(tag('swing', swing.value));
    const iron = effect(i.m, 'ironPct');
    if (iron) out.push(tag('iron', iron.value));
    const fxp = effect(i.m, 'fxpPct');
    if (fxp && i.givesFxp) out.push(tag('fxp', fxp.value));
    const standing = effect(i.m, 'standingMultiplier');
    if (standing) out.push(tag('standing', standing.value));
  } else if (effect(i.m, 'trainingEnergyPct')) {
    out.push(tag('energy', trainingEnergy(i.base, i.m)));
  }
  return out;
}

/** The ordinance in force on `day` from the city's short history (latest wins), or null. */
export function ordinanceOnDay(
  history: ReadonlyArray<{ id: string; fromDay: DayKey; toDay: DayKey }>,
  day: DayKey,
): string | null {
  let found: string | null = null;
  for (const h of history) if (h.fromDay <= day && day < h.toDay) found = h.id;
  return found;
}
