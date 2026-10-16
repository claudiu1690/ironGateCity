import { DOSSIER, DOSSIER_CATEGORIES, EXPOSE, PATRON_TIERS, RESTED } from './constants';
import type { DossierCategory, PatronTier } from './constants';
import type { DayKey } from './day';
import { RESTED_PART, partsLine } from './rewards';
import type { Rng } from './rng';
import type { CityRole, FactionId, Outcome, Rewards } from './types';

/**
 * The Dossier and the exposé (design docs/design/slice-8-life.md §4; GDD §10; ADR 0053, 0054). Pure:
 * the server rolls an entry in the act's own transaction from a named stream of the act's seed
 * (`seed:dossier:{row}`), after the check, so it never disturbs the check's or the run-in's rolls.
 */

export type { DossierCategory };

/** A name the Dossier can hold (content's `names()`). */
export interface DossierNameRef {
  id: string;
  cityId: string;
  districtId?: string;
  factionId: FactionId | null;
  /** False for dossier-only names (Brandauer): never drawn at random. */
  drawn: boolean;
}

/** GDD §10.1: 10 / 15 / 25 / 40 / 60 slots by Intelligence, + one a level of *A bigger Dossier*. */
export function dossierCapacity(int: number, perkSlots: number): number {
  const band = DOSSIER.capacity.find(([at]) => int >= at);
  return (band?.[1] ?? DOSSIER.capacity[DOSSIER.capacity.length - 1]![1]) + Math.max(0, perkSlots);
}

/** Design §4.1: fresh for seven City Days from its day. */
export const isFresh = (day: DayKey, today: DayKey): boolean => today - day < DOSSIER.freshDays;
/** *Goes stale on Thursday*: the first stale day. */
export const staleOn = (day: DayKey): DayKey => day + DOSSIER.freshDays;
/** Design §4.3: a fresh entry weighs 1, a stale one ½. */
export const entryWeight = (day: DayKey, today: DayKey): number =>
  isFresh(day, today) ? 1 : DOSSIER.staleWeight;
export const nameWeight = (entries: ReadonlyArray<{ day: DayKey }>, today: DayKey): number =>
  entries.reduce((sum, e) => sum + entryWeight(e.day, today), 0);

/** Design §4.2: a tier-1 intelligence entry's category by the place's kind. */
export const categoryOfKind = (locationKind: string): DossierCategory =>
  DOSSIER.categoryByKind[locationKind] ?? 'neutral';

/** Design §4.2: a mission's entry category when content names none (surveillance pattern, theft political). */
export const missionCategory = (type: string, named?: DossierCategory): DossierCategory =>
  named ?? (type === 'theft' ? 'political' : 'pattern');

/**
 * Design §4.2: the chance (percent, 100 certain) a mission lands an entry: surveillance one on a
 * Success and one time in two on a Partial; theft one on a Success; none otherwise.
 */
export function missionEntryChance(type: string, outcome: Outcome): number {
  if (type === 'surveillance') return outcome === 'success' ? 100 : outcome === 'partial' ? 50 : 0;
  if (type === 'theft') return outcome === 'success' ? 100 : 0;
  return 0;
}

/**
 * Design §4.2 (§21.1 Q16): the name an entry lands on. With `party`, a name of that party in the city;
 * else a rival's two times in three and the actor's own party's otherwise (falling back to the other
 * group when one is empty). Only drawn names; none in the city → null (nothing lands).
 */
export function pickName<T extends DossierNameRef>(i: {
  names: readonly T[];
  cityId: string;
  actor: FactionId;
  party?: FactionId;
  /** A capital district (the morgue file's capital, a Request's district): narrows the town. */
  districtId?: string;
  rng: Rng;
}): T | null {
  const pool = i.names.filter(
    (n) =>
      n.drawn &&
      n.factionId !== null &&
      n.cityId === i.cityId &&
      (!i.districtId || n.districtId === i.districtId),
  );
  const draw = (xs: readonly T[]): T | null => (xs.length === 0 ? null : xs[i.rng.int(0, xs.length - 1)]!);
  if (i.party) return draw(pool.filter((n) => n.factionId === i.party));
  const rivals = pool.filter((n) => n.factionId !== i.actor);
  const own = pool.filter((n) => n.factionId === i.actor);
  const rival = i.rng.next() < DOSSIER.rivalShare;
  const first = rival ? rivals : own;
  return draw(first.length > 0 ? first : rival ? own : rivals);
}

export interface RolledEntry {
  subjectId: string;
  category: DossierCategory;
  lineIndex: 0 | 1 | 2 | 3;
  params: { placeId: string | null; weekday: number };
}

/**
 * Tech design §3.4, §4.3: one roll (1–100 against `chance`), then the line (one of four), a place of
 * the subject's town for `{place}` and a weekday for `{weekday}`, all from the entry's own stream and
 * stored in `params`, so a line always reads the same. No subject: nothing lands.
 */
export function rollEntry(i: {
  chance: number;
  category: DossierCategory;
  subject: DossierNameRef | null;
  cityPlaces: readonly string[];
  rng: Rng;
}): { lands: boolean; roll: number; chance: number; entry?: RolledEntry } {
  const chance = Math.max(0, Math.min(100, i.chance));
  const roll = i.rng.roll100();
  if (!i.subject || roll > chance) return { lands: false, roll, chance };
  const lineIndex = i.rng.int(0, 3) as 0 | 1 | 2 | 3;
  const placeId = i.cityPlaces.length > 0 ? i.cityPlaces[i.rng.int(0, i.cityPlaces.length - 1)]! : null;
  const weekday = i.rng.int(0, 6);
  return {
    lands: true,
    roll,
    chance,
    entry: { subjectId: i.subject.id, category: i.category, lineIndex, params: { placeId, weekday } },
  };
}

/** The stored id of an entry's line (`political.2`). */
export const lineIdOf = (category: DossierCategory, index: number): string => `${category}.${index}`;

export type BindRefusal = 'CASE_FILES_LEVEL' | 'NOT_ENOUGH_ENTRIES' | 'FILE_HELD';

/** Design §4.3: Level 16, no file held on the name, three entries' worth (fresh 1, stale ½). */
export function bindGate(i: {
  level: number;
  entries: ReadonlyArray<{ day: DayKey }>;
  fileHeld: boolean;
  today: DayKey;
}): null | { reason: BindRefusal; weight?: number } {
  if (i.level < DOSSIER.caseFileLevel) return { reason: 'CASE_FILES_LEVEL' };
  if (i.fileHeld) return { reason: 'FILE_HELD' };
  const weight = nameWeight(i.entries, i.today);
  if (weight < DOSSIER.fileWeight) return { reason: 'NOT_ENOUGH_ENTRIES', weight };
  return null;
}

export interface DossierLineRef {
  category: DossierCategory;
  lineId: string;
  params: Record<string, unknown>;
  day: DayKey;
  source: string;
}

/**
 * Design §4.3 (§21.1 Q22): binding takes every held entry on the name, fresh and stale; the file keeps
 * their lines (oldest first), the kinds present (in category order) and its weight at binding.
 */
export function bindFile<T extends DossierLineRef>(
  entries: readonly T[],
  today: DayKey,
): { lines: T[]; kinds: DossierCategory[]; weight: number } {
  const lines = [...entries].sort((a, b) => a.day - b.day);
  const present = new Set(lines.map((l) => l.category));
  return {
    lines,
    kinds: DOSSIER_CATEGORIES.filter((c) => present.has(c)),
    weight: nameWeight(lines, today),
  };
}

/** Design §4.3: a file 200 Iron; a fresh entry 50, a stale one 25. */
export const sellValue = (row: { kind: 'entry' | 'file'; day: DayKey }, today: DayKey): number =>
  row.kind === 'file' ? DOSSIER.sell.file : isFresh(row.day, today) ? DOSSIER.sell.fresh : DOSSIER.sell.stale;

export type TurnRefusal = 'NEEDS_PATTERN' | 'NO_PATRON_HERE' | 'NEEDS_ASSOCIATE' | 'INFORMANTS_FULL';

/**
 * Design §4.4: a file with a pattern line, in a town whose patron the player is Associate or better
 * with, while fewer than two informants report.
 */
export function turnGate(i: {
  kinds: readonly DossierCategory[];
  /** The patron of the name's town, or null (no patron there). */
  patronId: string | null;
  patronTier: PatronTier | null;
  informants: number;
}): null | { reason: TurnRefusal; patronId?: string } {
  if (!i.kinds.includes('pattern')) return { reason: 'NEEDS_PATTERN' };
  if (i.patronId === null) return { reason: 'NO_PATRON_HERE' };
  if (i.patronTier === null || PATRON_TIERS.indexOf(i.patronTier) < PATRON_TIERS.indexOf('associate'))
    return { reason: 'NEEDS_ASSOCIATE', patronId: i.patronId };
  if (i.informants >= DOSSIER.maxInformants) return { reason: 'INFORMANTS_FULL' };
  return null;
}

/** Design §4.4: an informant's span from the day it is turned. */
export const informantSpan = (today: DayKey): { fromDay: DayKey; untilDay: DayKey } => ({
  fromDay: today,
  untilDay: today + DOSSIER.informant.days,
});

/**
 * Design §4.4 (§21.1 Q20–Q21): the reports at the boundaries `fromDay + 2k` (k = 1 … 7, never past
 * `untilDay`) in the window `(settled, today]`, once each (k above `reported`), pattern and political
 * alternating (the first a pattern). A reader away for a week gets each report once.
 */
export function informantReports(
  i: { fromDay: DayKey; untilDay: DayKey; reported: number },
  settled: DayKey,
  today: DayKey,
): Array<{ day: DayKey; n: number; category: 'pattern' | 'political' }> {
  const out: Array<{ day: DayKey; n: number; category: 'pattern' | 'political' }> = [];
  const max = Math.floor(DOSSIER.informant.days / DOSSIER.informant.every);
  for (let k = i.reported + 1; k <= max; k++) {
    const day = i.fromDay + DOSSIER.informant.every * k;
    if (day > i.untilDay || day > today) break;
    if (day <= settled) continue;
    out.push({ day, n: k, category: k % 2 === 1 ? 'pattern' : 'political' });
  }
  return out;
}

/** Design §4.6: the burn, per player, 14 days (§21.1 Q18). */
export const burnUntil = (today: DayKey): DayKey => today + DOSSIER.burnDays;
export const isBurned = (
  burns: ReadonlyArray<{ subjectId: string; until: DayKey }>,
  subjectId: string,
  today: DayKey,
) => burns.some((b) => b.subjectId === subjectId && b.until > today);
/** Pruned at every write. */
export const liveBurns = <T extends { until: DayKey }>(burns: readonly T[], today: DayKey): T[] =>
  burns.filter((b) => b.until > today);

// ---------------------------------------------------------------------------------------------
// The exposé (design §4.5, ADR 0054).
// ---------------------------------------------------------------------------------------------

export type ExposeAngle = 'plain' | 'headline';

/** Design §4.5: a file with a political or criminal line can be printed. */
export const printable = (file: { kinds: readonly DossierCategory[] }): boolean =>
  file.kinds.includes('political') || file.kinds.includes('criminal');

export type ExposeRefusal =
  | 'NOT_A_PRESS'
  | 'NO_PRINTABLE_FILE'
  | 'NO_PARTY'
  | 'OWN_PARTY'
  | 'BURNED'
  | 'PRINTED_TODAY'
  | 'NOT_ENOUGH_ENERGY';

/** Design §4.5 (§21.1 Q17–Q19): the first refusal of an exposé, or null. */
export function exposeGate(i: {
  atPress: boolean;
  file: { status: string; kinds: readonly DossierCategory[]; subjectFactionId: FactionId | null } | null;
  actor: FactionId;
  burned: boolean;
  printedToday: boolean;
  /** Energy with Rested counted as the act spends it; omit to skip (step 1 costs none). */
  energy?: number;
}): null | { reason: ExposeRefusal } {
  if (!i.atPress) return { reason: 'NOT_A_PRESS' };
  if (!i.file || i.file.status !== 'held' || !printable(i.file)) return { reason: 'NO_PRINTABLE_FILE' };
  if (i.file.subjectFactionId === null) return { reason: 'NO_PARTY' };
  if (i.file.subjectFactionId === i.actor) return { reason: 'OWN_PARTY' };
  if (i.burned) return { reason: 'BURNED' };
  if (i.printedToday) return { reason: 'PRINTED_TODAY' };
  if (i.energy !== undefined && i.energy < EXPOSE.energy) return { reason: 'NOT_ENOUGH_ENERGY' };
  return null;
}

/** Design §4.5: 18 with three lines' worth, 16 with four, 14 with five or more; +1 headline; +2 in a battleground's paper. */
export function exposeDifficulty(weight: number, angle: ExposeAngle, role: CityRole): number {
  const band = EXPOSE.difficulty.find(([at]) => weight >= at);
  const base = band?.[1] ?? EXPOSE.difficulty[EXPOSE.difficulty.length - 1]![1];
  return (
    base + (angle === 'headline' ? EXPOSE.headline : 0) + (role === 'battleground' ? EXPOSE.battleground : 0)
  );
}

/**
 * Design §4.5: the swing against the name's party in the name's town: −1.0 on a Success, −0.5 on a
 * Partial, nothing on a Failure, × Π(1 + pct / 100) of its factors (an Issue's tag). *The facts,
 * plainly* sends it all to Neutral (`applyToNeutral`); *the headline* splits it (`applyAgainst`).
 */
export function exposeSwing(i: {
  outcome: Outcome;
  angle: ExposeAngle;
  factors: ReadonlyArray<{ pct: number }>;
}): { amount: number; mode: 'toNeutral' | 'against' } {
  const mode = i.angle === 'plain' ? 'toNeutral' : 'against';
  if (i.outcome === 'failure') return { amount: 0, mode };
  const base: number = EXPOSE.swing[i.outcome];
  const amount = i.factors.reduce((x: number, f) => x * (1 + f.pct / 100), base);
  return { amount: Math.round(amount * 1_000) / 1_000, mode };
}

/** Design §4.5: the paper's fixed pay, Rested on XP and Iron (no personal parts, §21.1 Q50). */
export function exposeRewards(o: Outcome, restedUsed: number): Rewards {
  const r = EXPOSE.rewards[o];
  const share = Math.min(1, Math.max(0, restedUsed) / EXPOSE.energy);
  return {
    xp: partsLine(r.xp, [{ ...RESTED_PART, share: RESTED.xpBonus * share }]),
    fxp: partsLine(r.fxp, []),
    iron: partsLine(r.iron, r.iron > 0 ? [{ ...RESTED_PART, share: RESTED.ironBonus * share }] : []),
    opinion: 0,
  };
}
