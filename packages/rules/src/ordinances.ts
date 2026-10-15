import { BATTLEGROUND, MORALE, ORDINANCE_BOUNDS, RESTED, ROOM } from './constants';
import type { DayKey } from './day';
import type { MoraleState } from './morale';
import { roundHalfUp } from './rewards';
import { RIVAL_ROW, rivalFxpShare } from './rivalGround';
import type { RivalGroundState } from './rivalGround';
import type { LawOnlyEffect } from './laws';
import type { CheckBonus, FactionId, IssueMatch } from './types';

/**
 * Ordinance effects (ADR 0021, GDD §15.3, design §10.1): a closed, bounded DSL owned by rules,
 * validated by content, applied as named modifiers that are constant for a City Day. Cost
 * ordinances change the cost only; rewards stay on the content Energy. Slice 4 (ADR 0030): the same
 * DSL carries the Issue effects of the week, with two new kinds for tickets and rooms.
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
  | { kind: 'fxpPct'; scope: 'actions'; value: number }
  | { kind: 'ticketPct'; value: number }
  | { kind: 'roomPct'; value: number }
  /** Slice 5 (design §12.1): Heat cools faster in the residence city (sources multiply). */
  | { kind: 'heatCoolPct'; value: number }
  /** Slice 5 (design §12.1): bail in the city, a priced line like a ticket's. */
  | { kind: 'bailPct'; value: number };

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

/**
 * ADR 0030: one named source of effects in force in a city on a day: the council's ordinance, or an
 * Issue effect of the week. Each source is its own line or tag.
 */
export interface ModifierSource {
  id: string;
  name: string;
  /** Slice 7 (ADR 0044): `law`, the third source, after the ordinance and the Issues. */
  kind: 'ordinance' | 'issue' | 'law';
  effects: readonly OrdinanceEffect[];
  /** Slice 7: a law's own kinds (`laws.ts`), already filtered for the actor by `appliesTo`. */
  lawEffects?: readonly LawOnlyEffect[];
  /** Slice 7: the law's party (`caughtDelta` is about missions against it). */
  factionId?: FactionId;
}

/** A live Issue of the place, with the feeds that tag an action (ADR 0029). */
export interface LiveIssue {
  /** The `issues` document id ("irongate:20731:issue.tram-fares"). */
  docId: string;
  issueId: string;
  name: string;
  feeds: readonly IssueMatch[];
}

/**
 * ADR 0030: what the place adds for this actor on this day: the district's close race, the actor
 * faction's comeback (Groundswell) and the live Issues whose feeds tag actions.
 */
export interface PlaceState {
  battleground: boolean;
  groundswell: { factionId: FactionId; pct: number } | null;
  issues: readonly LiveIssue[];
  /**
   * Slice 5 (ADR 0034 §3): another faction's home city. The +4 difficulty row, the Party XP share,
   * opinion against the home faction under the day's cap; absent or null elsewhere.
   */
  rivalGround?: RivalGroundState | null;
}

/** The modifiers in force for one actor at one place on one City Day (ADR 0030). */
export interface PlaceModifiers {
  /** The ordinance first, then the Issue effects by order. */
  sources: readonly ModifierSource[];
  /** The actor's home city, its faction's morale Fired up. */
  firedUp: boolean;
  place?: PlaceState;
}

/**
 * Slice 3's shape (ADR 0021): one ordinance and Fired up. Still accepted everywhere: it is one
 * ordinance source and no place, so every slice-3 caller behaves exactly as before.
 */
export interface CityModifiers {
  ordinance: OrdinanceSpec | null;
  /** The actor's home city, its faction's morale Fired up. */
  firedUp: boolean;
}

export type Modifiers = PlaceModifiers | CityModifiers;

export const NO_MODIFIERS: CityModifiers = { ordinance: null, firedUp: false };

export function cityModifiers(i: {
  ordinance: OrdinanceSpec | null;
  moraleState: MoraleState | null;
  actorIsHomeFaction: boolean;
}): CityModifiers {
  return { ordinance: i.ordinance, firedUp: i.actorIsHomeFaction && i.moraleState === 'fired' };
}

/** ADR 0030: the modifiers of a place, from its sources of the day, morale and the place's state. */
export function placeModifiers(i: {
  sources: readonly ModifierSource[];
  moraleState: MoraleState | null;
  actorIsHomeFaction: boolean;
  place?: PlaceState;
}): PlaceModifiers {
  return {
    sources: i.sources,
    firedUp: i.actorIsHomeFaction && i.moraleState === 'fired',
    ...(i.place ? { place: i.place } : {}),
  };
}

/** An ordinance as a modifier source. */
export const ordinanceSource = (o: OrdinanceSpec): ModifierSource => ({
  id: o.id,
  name: o.name,
  kind: 'ordinance',
  effects: o.effects,
});

/** The sources of either shape, in order (the ordinance first). */
export function sourcesOf(m: Modifiers | undefined): readonly ModifierSource[] {
  if (!m) return [];
  if ('sources' in m) return m.sources;
  return m.ordinance ? [ordinanceSource(m.ordinance)] : [];
}

/** The place's state (close race, comeback, live Issues), or null outside a place (slice 3). */
export const placeOf = (m: Modifiers | undefined): PlaceState | null =>
  m && 'sources' in m ? (m.place ?? null) : null;

/** Slice 5: the rival ground of the place, or null (home, the capital, a battleground, slice 3). */
export const rivalGroundIn = (m: Modifiers | undefined): RivalGroundState | null =>
  placeOf(m)?.rivalGround ?? null;

const matchesKind = (e: OrdinanceEffect, kind: OrdinanceEffectKind, actionType?: string) =>
  e.kind === kind && (!('actionType' in e) || e.actionType === actionType);

/** Every source's effect of `kind` (for `actionType` where it has one), with its source. */
export function effects<K extends OrdinanceEffectKind>(
  m: Modifiers | undefined,
  kind: K,
  actionType?: string,
): Array<{ source: ModifierSource; effect: Extract<OrdinanceEffect, { kind: K }> }> {
  const out: Array<{ source: ModifierSource; effect: Extract<OrdinanceEffect, { kind: K }> }> = [];
  for (const source of sourcesOf(m)) {
    for (const e of source.effects) {
      if (matchesKind(e, kind, actionType)) {
        out.push({ source, effect: e as Extract<OrdinanceEffect, { kind: K }> });
      }
    }
  }
  return out;
}

/**
 * The first source's effect of `kind` (for `actionType` where it has one), or null. Slice 3's
 * helper: with one source it is that source's effect.
 */
export function effect<K extends OrdinanceEffectKind>(
  m: Modifiers | undefined,
  kind: K,
  actionType?: string,
): Extract<OrdinanceEffect, { kind: K }> | null {
  return effects(m, kind, actionType)[0]?.effect ?? null;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** Rally Permits: speech 12 → 10 (never below 1). Energy deltas of several sources add. */
export function actionEnergy(base: number, type: string, m?: Modifiers): number {
  const deltas = effects(m, 'energyDelta', type).map((x) => x.effect.value);
  return deltas.length > 0 ? Math.max(1, base + sum(deltas)) : base;
}

/** Percentages that multiply, rounded half up once (training Energy, tickets, rooms). */
function multiplied(base: number, pcts: readonly number[]): number {
  return roundHalfUp(pcts.reduce((x, p) => x * (1 + p / 100), base));
}

/** Slice 5 (design §12.1): the `heatCoolPct` values in force (the Customs Strike's +50). */
export const heatCoolPcts = (m?: Modifiers): number[] => effects(m, 'heatCoolPct').map((x) => x.effect.value);

/** Reading Room Grant: training Energy −20 %, halves up (44 → 35). Several sources multiply. */
export function trainingEnergy(baseCost: number, m?: Modifiers): number {
  const pcts = effects(m, 'trainingEnergyPct').map((x) => x.effect.value);
  return pcts.length > 0 ? Math.max(1, multiplied(baseCost, pcts)) : baseCost;
}

/** Review 1: the Long Service Order: each boundary adds two days of seniority. The larger wins. */
export function seniorityStep(m?: Modifiers): number {
  return Math.max(1, ...effects(m, 'seniorityDays').map((x) => x.effect.value));
}

/** A named adjustment of the daily pay (ADR 0030: each source its own line on the base). */
export interface PayLine {
  id: string;
  label: string;
  amount: number;
}

/** Each source's pay line: Public Works +22, Street Fund −54 on 216. */
export function jobPayLines(pay: number, m?: Modifiers): PayLine[] {
  return effects(m, 'jobPayPct').map((x) => ({
    id: x.source.id,
    label: x.source.name,
    amount: roundHalfUp((pay * x.effect.value) / 100),
  }));
}

/** Public Works +10 % (216 → 238) and Street Fund −25 % (216 → 162) on the daily pay. */
export function jobPayWith(pay: number, m?: Modifiers): number {
  return pay + sum(jobPayLines(pay, m).map((l) => l.amount));
}

/** Open Doors: a named bonus line in the check breakdown per source (the clamp still applies). */
export function ordinanceCheckBonuses(type: string, m?: Modifiers): CheckBonus[] {
  return effects(m, 'chancePct', type).map((x) => ({
    id: x.source.id,
    label: x.source.name,
    value: x.effect.value,
  }));
}

/** Street Permits: the opinion swing × 1.15 on propaganda (the product of every source). */
export function swingMultiplier(type: string, m?: Modifiers): number {
  return effects(m, 'swingPct', type).reduce((x, s) => x * (1 + s.effect.value / 100), 1);
}

/** Street Register: every Success counts two for Local Standing. The larger wins, never ×4. */
export function standingPerSuccess(m?: Modifiers): number {
  return Math.max(1, ...effects(m, 'standingMultiplier').map((x) => x.effect.value));
}

/**
 * Rest Day Order: the Rested cap 200 → 250. Deltas of several sources add; a room in Irongate adds
 * +50 while it runs (ADR 0030 §5).
 */
export function restedCapFor(m?: Modifiers, room = false): number {
  return (
    RESTED.cap + sum(effects(m, 'restedCapDelta').map((x) => x.effect.value)) + (room ? ROOM.restedBonus : 0)
  );
}

/** A named bonus share of a reward line's base, rounded half up on its own (ADR 0021). */
export interface BonusShare {
  id: string;
  label: string;
  share: number;
}

export const FIRED_UP = { id: 'morale.fired', label: 'Fired up' } as const;
/** Slice 5 (design §11.2): the Party XP line's part on rival ground, *Rival ground +6*. */
export const RIVAL_GROUND_PART = { id: 'rivalGround', label: 'Rival ground' } as const;
/** Slice 4 (GDD §14.4): the close race's names in the breakdown. */
export const CLOSE_RACE = { id: 'battleground', label: 'Close race' } as const;
export const COMEBACK = { id: 'groundswell', label: 'Comeback' } as const;

/** §14.4: canvass, speech, propaganda and council get the close race and the comeback. */
export const isPoliticalType = (type: string): boolean =>
  (BATTLEGROUND.types as readonly string[]).includes(type);

/**
 * The FXP and Iron bonus shares on a checked action in the city: Fired up +10 %, the close race
 * +25 % (political types) and Public Meetings +25 % of the base FXP, Street Fund +25 % of the base
 * Iron, each source its own share. The Party-order bonus is added by the caller, since it depends
 * on the row.
 */
export function rewardShares(i: {
  type: string;
  givesFxp: boolean;
  m?: Modifiers;
  /** Slice 7 (ADR 0044): which tier's XP a law's `xpPct` reaches (missions 2, actions 1); default 1. */
  tier?: 1 | 2;
}): {
  fxp: BonusShare[];
  iron: BonusShare[];
  /** Slice 7: a law's `xpPct` as a part on the XP base (never on Party XP). */
  xp: BonusShare[];
} {
  const fxp: BonusShare[] = [];
  const iron: BonusShare[] = [];
  const xp: BonusShare[] = [];
  const scope = (i.tier ?? 1) === 2 ? 'missions' : 'actions';
  for (const x of lawEffectsOf(i.m, 'xpPct'))
    if (x.effect.scope === scope) xp.push({ id: x.source.id, label: x.source.name, share: x.effect.value / 100 });
  const place = placeOf(i.m);
  if (i.givesFxp && place?.battleground && isPoliticalType(i.type))
    fxp.push({ ...CLOSE_RACE, share: BATTLEGROUND.fxpShare });
  if (i.givesFxp && i.m?.firedUp) fxp.push({ ...FIRED_UP, share: MORALE.firedFxpShare });
  const rival = place?.rivalGround;
  if (i.givesFxp && rival) fxp.push({ ...RIVAL_GROUND_PART, share: rivalFxpShare(rival) });
  if (i.givesFxp) {
    for (const x of effects(i.m, 'fxpPct'))
      fxp.push({ id: x.source.id, label: x.source.name, share: x.effect.value / 100 });
  }
  for (const x of effects(i.m, 'ironPct'))
    iron.push({ id: x.source.id, label: x.source.name, share: x.effect.value / 100 });
  return { fxp, iron, xp };
}

/** A named factor of the opinion swing (ADR 0030 §4): *Close race +25 %*. */
export interface SwingFactor {
  id: string;
  label: string;
  pct: number;
}

/**
 * ADR 0030 §4: the opinion swing's named factors, in the breakdown's order: *Close race* (political
 * types in a close race), *Issue: {name}* (each Issue tagging the action), *Comeback* (the actor's
 * own Groundswell, political types) and each `swingPct` source. The swing is the product.
 */
export function swingFactors(
  type: string,
  actorFaction: FactionId | null,
  m?: Modifiers,
  tagged: ReadonlyArray<{ issueId: string; name: string }> = [],
): SwingFactor[] {
  const out: SwingFactor[] = [];
  const place = placeOf(m);
  const political = isPoliticalType(type);
  if (place?.battleground && political) out.push({ ...CLOSE_RACE, pct: BATTLEGROUND.swingPct });
  for (const t of tagged) out.push({ id: `issue:${t.issueId}`, label: `Issue: ${t.name}`, pct: 50 });
  const g = place?.groundswell;
  if (g && political && actorFaction !== null && g.factionId === actorFaction && g.pct > 0)
    out.push({ ...COMEBACK, pct: g.pct });
  for (const x of effects(m, 'swingPct', type))
    out.push({ id: x.source.id, label: x.source.name, pct: x.effect.value });
  return out;
}

/** The product of the factors, Π(1 + pct / 100). */
export const factorProduct = (f: readonly SwingFactor[]): number =>
  f.reduce((x, s) => x * (1 + s.pct / 100), 1);

/**
 * §14.4: the close race's +5 on political checks, a named bonus row. Slice 5 (ADR 0034 §3): on rival
 * ground every check carries the *Rival ground* row (−16, i.e. +4 difficulty). A mission passes the
 * type it is seen as, so a speech mission gets the close race and the illegal types do not.
 */
export function placeCheckBonuses(type: string, m?: Modifiers): CheckBonus[] {
  const place = placeOf(m);
  const out: CheckBonus[] = [];
  if (place?.battleground && isPoliticalType(type)) out.push({ ...CLOSE_RACE, value: BATTLEGROUND.chancePct });
  if (place?.rivalGround) out.push({ ...RIVAL_ROW });
  return out;
}

/** A priced line: a ticket or a room, with each source's percentage (ADR 0030). */
export interface PriceLine {
  id: string;
  label: string;
  pct: number;
}

/** Each source's line of `kind` (tickets, rooms; slice 5: bail). */
export function priceLines(m: Modifiers | undefined, kind: 'ticketPct' | 'roomPct' | 'bailPct'): PriceLine[] {
  return effects(m, kind).map((x) => ({ id: x.source.id, label: x.source.name, pct: x.effect.value }));
}

/** A price after its multiplying percentages, rounded half up once, never below `floor`. */
export function priceWith(base: number, lines: readonly PriceLine[], floor = 0): number {
  if (lines.length === 0) return base;
  return Math.max(
    floor,
    multiplied(
      base,
      lines.map((l) => l.pct),
    ),
  );
}

export type OrdinanceTagKind = 'energy' | 'chance' | 'iron' | 'fxp' | 'swing' | 'standing';

/** A ticket tag (screens §8): "Rally Permits: 10 Energy", "Open Doors: +4 %". */
export interface OrdinanceTagView {
  ordinanceId: string;
  name: string;
  kind: OrdinanceTagKind;
  /** The live cost for `energy`; a percentage for the others; ×n for `standing`. */
  value: number;
  /** Slice 4 (ADR 0030): which kind of source made it; absent = an ordinance. Slice 7: a law. */
  source?: 'ordinance' | 'issue' | 'law';
}

/** The tags a ticket carries under the sources in force (tech design §8.5), one per source. */
export function ordinanceTags(i: {
  kind: 'checked' | 'training';
  type: string;
  base: number;
  givesFxp?: boolean;
  m?: Modifiers;
}): OrdinanceTagView[] {
  const out: OrdinanceTagView[] = [];
  const tag = (s: ModifierSource, kind: OrdinanceTagKind, value: number): OrdinanceTagView => ({
    ordinanceId: s.id,
    name: s.name,
    kind,
    value,
    ...(s.kind === 'issue' ? { source: 'issue' as const } : s.kind === 'law' ? { source: 'law' as const } : {}),
  });
  for (const s of sourcesOf(i.m)) {
    const own = (kind: OrdinanceEffectKind, actionType?: string) =>
      s.effects.find((e) => matchesKind(e, kind, actionType));
    if (i.kind === 'checked') {
      if (own('energyDelta', i.type)) out.push(tag(s, 'energy', actionEnergy(i.base, i.type, i.m)));
      const chance = own('chancePct', i.type);
      if (chance) out.push(tag(s, 'chance', chance.value));
      const swing = own('swingPct', i.type);
      if (swing) out.push(tag(s, 'swing', swing.value));
      const iron = own('ironPct');
      if (iron) out.push(tag(s, 'iron', iron.value));
      const fxp = own('fxpPct');
      if (fxp && i.givesFxp) out.push(tag(s, 'fxp', fxp.value));
      const standing = own('standingMultiplier');
      if (standing) out.push(tag(s, 'standing', standing.value));
    } else if (own('trainingEnergyPct')) {
      out.push(tag(s, 'energy', trainingEnergy(i.base, i.m)));
    }
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

/**
 * ADR 0029/0030: the Issue effects in force on `day` (`[fromDay, toDay)`), in order, from the
 * city's list of effects.
 */
export function issueEffectsOnDay<T extends { fromDay: DayKey; toDay: DayKey }>(
  effectsList: readonly T[],
  day: DayKey,
): T[] {
  return effectsList.filter((e) => e.fromDay <= day && day < e.toDay);
}

// ---------------------------------------------------------------------------------------------
// Slice 7 (docs/tech/slice-7.md §6.6, ADR 0044): the law-only kinds, each read by one function.
// ---------------------------------------------------------------------------------------------

/** Every law source's law-only effect of `kind`, with its source (already filtered by `appliesTo`). */
export function lawEffectsOf<K extends LawOnlyEffect['kind']>(
  m: Modifiers | undefined,
  kind: K,
): Array<{ source: ModifierSource; effect: Extract<LawOnlyEffect, { kind: K }> }> {
  const out: Array<{ source: ModifierSource; effect: Extract<LawOnlyEffect, { kind: K }> }> = [];
  for (const source of sourcesOf(m))
    for (const e of source.lawEffects ?? [])
      if (e.kind === kind) out.push({ source, effect: e as Extract<LawOnlyEffect, { kind: K }> });
  return out;
}

/**
 * ADR 0044 (§6.6): a mission's cost: the content Energy + the `energyDelta`s of the type it is seen
 * as + the `missionEnergyDelta`s, never below 1 (Emergency Permits 15 -> 17). Rewards stay on the
 * content Energy (ADR 0021 §3).
 */
export function missionEnergy(base: number, seenAs: string, m?: Modifiers): number {
  const deltas = lawEffectsOf(m, 'missionEnergyDelta').map((x) => x.effect.value);
  const cost = actionEnergy(base, seenAs, m);
  return deltas.length > 0 ? Math.max(1, cost + sum(deltas)) : cost;
}

/** ADR 0044: a journey's minutes at boarding, multiplied and halved up, at least 1 (Open Borders 12 -> 9, 25 -> 19). */
export function journeyMinutes(minutes: number, m?: Modifiers): number {
  const pcts = lawEffectsOf(m, 'journeyTimePct').map((x) => x.effect.value);
  return pcts.length > 0 && minutes > 0 ? Math.max(1, multiplied(minutes, pcts)) : minutes;
}

/** ADR 0044: the run-in percentages in force; a `window: 'night'` one only while it is night at the act. */
export const runInPcts = (m: Modifiers | undefined, night: boolean): number[] =>
  lawEffectsOf(m, 'runInPct')
    .filter((x) => x.effect.window !== 'night' || night)
    .map((x) => x.effect.value);

/** ADR 0044, review 5 (ADR 0081): the Curfew doubles the patrol chance while it is night. */
export const curfewInForce = (m: Modifiers | undefined, night: boolean): boolean =>
  night && lawEffectsOf(m, 'runInPct').some((x) => x.effect.window === 'night' && x.effect.value > 0);

/** ADR 0044: the infirmary's *Walk out well* price under the laws, halves up (Universal Care 100 -> 50). */
export const infirmaryPrice = (base: number, m?: Modifiers): number =>
  priceWith(
    base,
    lawEffectsOf(m, 'infirmaryCostPct').map((x) => ({ id: x.source.id, label: x.source.name, pct: x.effect.value })),
  );

/** ADR 0044: the caught check's deltas for a mission against `targetFaction` (Special Powers +10). */
export const caughtDeltas = (m: Modifiers | undefined, targetFaction: FactionId | null): number[] =>
  targetFaction === null
    ? []
    : lawEffectsOf(m, 'caughtDelta')
        .filter((x) => x.source.factionId === targetFaction)
        .map((x) => x.effect.value);

/** ADR 0044: the smallest `markFadeDays` in force (the Rehabilitation Act's 7), or null. */
export function markFadeDaysOf(m: Modifiers | undefined): number | null {
  const v = lawEffectsOf(m, 'markFadeDays').map((x) => x.effect.value);
  return v.length > 0 ? Math.min(...v) : null;
}
