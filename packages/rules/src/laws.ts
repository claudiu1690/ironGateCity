import { LAW_BOUNDS } from './constants';
import type { DayKey } from './day';
import type { ModifierSource, OrdinanceEffect } from './ordinances';
import type { FactionId } from './types';

/**
 * Slice 7 (docs/tech/slice-7.md §6.6, ADR 0044, design §7): laws are a third source of bounded
 * effects beside the council's ordinance and the Issues of the week. The DSL is the ordinance DSL
 * plus seven kinds of its own; every law effect may say whom it applies to. Laws never touch Party
 * XP or the odds of a check (the loader refuses `fxpPct` and `chancePct` on a law).
 */

/** Whom a law effect applies to: everyone (default), the law's party's members, or everyone else. */
export type EffectAppliesTo = 'all' | 'members' | 'others';

/** The seven kinds only a law carries (each touches exactly one function, §6.6). */
export type LawOnlyEffect =
  | { kind: 'xpPct'; scope: 'missions' | 'actions'; value: number }
  | { kind: 'missionEnergyDelta'; value: number }
  | { kind: 'journeyTimePct'; value: number }
  | { kind: 'runInPct'; window?: 'night'; value: number }
  | { kind: 'infirmaryCostPct'; value: number }
  | { kind: 'markFadeDays'; value: number }
  | { kind: 'caughtDelta'; scope: 'againstFaction'; value: number };

export type LawOnlyEffectKind = LawOnlyEffect['kind'];

/** The kinds a law may carry: those in LAW_BOUNDS. */
export type LawEffectKind = keyof typeof LAW_BOUNDS;

/** A law's effect: an ordinance kind in LAW_BOUNDS or a law-only kind, with `appliesTo`. */
export type LawEffect = (
  | Extract<OrdinanceEffect, { kind: LawEffectKind }>
  | LawOnlyEffect
) & { appliesTo?: EffectAppliesTo };

export const LAW_ONLY_KINDS = [
  'xpPct',
  'missionEnergyDelta',
  'journeyTimePct',
  'runInPct',
  'infirmaryCostPct',
  'markFadeDays',
  'caughtDelta',
] as const satisfies readonly LawOnlyEffectKind[];

const LAW_ONLY = new Set<string>(LAW_ONLY_KINDS);

export const isLawOnlyEffect = (e: { kind: string }): e is LawOnlyEffect => LAW_ONLY.has(e.kind);

/** The bound problem of a law effect (LAW_BOUNDS; a kind absent there is refused), or null. */
export function lawBoundProblem(e: { kind: string; value: number }): string | null {
  const bound = (LAW_BOUNDS as Record<string, readonly [number, number]>)[e.kind];
  if (!bound) return `${e.kind} is not a law effect (the catalogue's kinds are LAW_BOUNDS')`;
  const [lo, hi] = bound;
  return e.value < lo || e.value > hi ? `${e.kind} ${e.value} is outside its law bound ${lo}…${hi}` : null;
}

/** Design §5.4: a law is factional (36 of 60) when any effect names members or everyone else. */
export const isFactional = (law: { effects: ReadonlyArray<{ appliesTo?: EffectAppliesTo }> }): boolean =>
  law.effects.some((e) => (e.appliesTo ?? 'all') !== 'all');

/** A law as the rules see it (content's `Law`, narrowed). */
export interface LawSpec {
  id: string;
  name: string;
  factionId: FactionId;
  effects: readonly LawEffect[];
  days: number;
}

/** A law in force: from its first day to its effective end (exclusive). */
export interface LawInForce {
  lawId: string;
  fromDay: DayKey;
  toDay: DayKey;
}

/** The laws in force on `day` (a wage day, a fade or a Heat day in the past takes that day's laws). */
export const lawsOnDay = (projection: readonly LawInForce[], day: DayKey): LawInForce[] =>
  projection.filter((l) => l.fromDay <= day && day < l.toDay);

const appliesFor = (e: { appliesTo?: EffectAppliesTo }, law: LawSpec, actor: FactionId): boolean => {
  const to = e.appliesTo ?? 'all';
  return to === 'all' || (to === 'members' ? actor === law.factionId : actor !== law.factionId);
};

const stripAppliesTo = <T extends { appliesTo?: EffectAppliesTo }>(e: T): Omit<T, 'appliesTo'> => {
  const { appliesTo: _drop, ...rest } = e;
  return rest;
};

/**
 * The law as a modifier source for `actor`: its effects filtered by `appliesTo`; the ordinance kinds
 * in `effects` (so every slice 3–6 function reads them unchanged), the law-only kinds in
 * `lawEffects`. `caughtDelta` is about missions against the law's party, so it is kept for everyone
 * (`appliesTo` absent or `others`) and carries the party in `factionId`. Null when nothing applies.
 */
export function lawSource(law: LawSpec, actor: FactionId): ModifierSource | null {
  const effects: OrdinanceEffect[] = [];
  const lawEffects: LawOnlyEffect[] = [];
  for (const e of law.effects) {
    if (e.kind !== 'caughtDelta' && !appliesFor(e, law, actor)) continue;
    const bare = stripAppliesTo(e);
    if (isLawOnlyEffect(bare)) lawEffects.push(bare);
    else effects.push(bare as OrdinanceEffect);
  }
  if (effects.length === 0 && lawEffects.length === 0) return null;
  return { id: law.id, name: law.name, kind: 'law', effects, lawEffects, factionId: law.factionId };
}

/** ADR 0044: the sources of every law in force on `day` for `actor`, in the projection's order. */
export function lawSourcesOn(
  projection: readonly LawInForce[],
  day: DayKey,
  actor: FactionId,
  catalogue: (id: string) => LawSpec | undefined,
): ModifierSource[] {
  const out: ModifierSource[] = [];
  for (const l of lawsOnDay(projection, day)) {
    const law = catalogue(l.lawId);
    if (!law) continue;
    const s = lawSource(law, actor);
    if (s) out.push(s);
  }
  return out;
}
