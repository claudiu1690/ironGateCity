import { LEGACY } from './constants';
import type { DayKey } from './day';
import type { Office } from './ladder';
import type { LegacyPerks } from './personal';

/**
 * Legacy (design docs/design/slice-8-life.md §7; GDD §17.3; ADR 0057): a public, permanent record
 * (`legacyEntries`, one row per natural `ref`, unique per character) and a balance spent on eight
 * lasting perks. The season's kinds (`champion`, `seasonAward`) are deferred with the season
 * (16 Oct 2026); their refs `champion:{s}` and `award:{s}:{kind}:{bracket}` are reserved.
 */

export type LegacyKind = keyof typeof LEGACY.points;
export type PerkId = keyof typeof LEGACY.perks;
export const PERK_IDS = Object.keys(LEGACY.perks) as PerkId[];

export interface LegacyState {
  total: number;
  spent: number;
  perks: LegacyPerks;
}

export const toSpend = (l: Pick<LegacyState, 'total' | 'spent'>): number => Math.max(0, l.total - l.spent);

/** Design §7.2: a perk bought one level at a time, up to its max, from the balance. */
export function perkGate(
  l: LegacyState,
  id: PerkId,
): null | { reason: 'PERK_MAX' | 'NOT_ENOUGH_LEGACY'; need?: number } {
  const spec = LEGACY.perks[id];
  if (l.perks[id] >= spec.max) return { reason: 'PERK_MAX' };
  if (toSpend(l) < spec.cost) return { reason: 'NOT_ENOUGH_LEGACY', need: spec.cost };
  return null;
}

export interface LegacyRow {
  ref: string;
  kind: LegacyKind;
  points: number;
  day: DayKey;
  params: { cityId?: string; office?: Office; lawId?: string; award?: string };
}

const TERM_KIND: Record<Office, LegacyKind> = {
  council: 'councilTerm',
  governor: 'governorTerm',
  chair: 'chairTerm',
  deputy: 'deputyTerm',
  president: 'presidentTerm',
};

/**
 * Tech design §6.9: the Legacy rows a settlement window `(settled, today]` earns: each completed term
 * whose `toDay` is a boundary in the window (by office), each pledge kept in the window, each award
 * this settlement credits (a Hero 2, an Issue's top five 2, review 5's Unrest prize 2 under its own
 * ref `unrest|{cityId}|{entry}`), each survival. Natural refs make a replay a no-op.
 */
export function legacyFromWindow(i: {
  settled: DayKey;
  today: DayKey;
  terms: ReadonlyArray<{
    id: string;
    office: Office;
    toDay: DayKey;
    completed: boolean;
    cityId: string | null;
    pledges?: ReadonlyArray<{ lawId: string; keptDay: DayKey | null }>;
  }>;
  awards: ReadonlyArray<{ id: string; kind: 'hero' | 'issue' | 'unrest'; ref?: string; day: DayKey }>;
  survived: ReadonlyArray<{ ref: string; day: DayKey }>;
}): LegacyRow[] {
  const inWindow = (d: DayKey) => d > i.settled && d <= i.today;
  const out: LegacyRow[] = [];
  for (const t of i.terms) {
    if (t.completed && inWindow(t.toDay)) {
      const kind = TERM_KIND[t.office];
      out.push({
        ref: `term:${t.id}`,
        kind,
        points: LEGACY.points[kind],
        day: t.toDay,
        params: { office: t.office, ...(t.cityId ? { cityId: t.cityId } : {}) },
      });
    }
    for (const p of t.pledges ?? [])
      if (p.keptDay !== null && inWindow(p.keptDay))
        out.push({
          ref: `pledge:${t.id}:${p.lawId}`,
          kind: 'pledge',
          points: LEGACY.points.pledge,
          day: p.keptDay,
          params: { lawId: p.lawId },
        });
  }
  for (const a of i.awards) {
    const kind: LegacyKind = a.kind === 'hero' ? 'hero' : a.kind === 'issue' ? 'issueTopFive' : 'unrest';
    const ref = a.kind === 'unrest' && a.ref ? a.ref : `award:${a.id}`;
    out.push({ ref, kind, points: LEGACY.points[kind], day: a.day, params: { award: a.kind } });
  }
  for (const s of i.survived)
    if (inWindow(s.day))
      out.push({
        ref: `survived:${s.ref}`,
        kind: 'survived',
        points: LEGACY.points.survived,
        day: s.day,
        params: {},
      });
  return out;
}

/** Design §7.1: the acts' own rows (an exposé printed, Protégé of a patron, an Ambition completed). */
export const exposeLegacy = (logId: string, day: DayKey): LegacyRow => ({
  ref: `expose:${logId}`,
  kind: 'expose',
  points: LEGACY.points.expose,
  day,
  params: {},
});
export const protegeLegacy = (patronId: string, day: DayKey): LegacyRow => ({
  ref: `protege:${patronId}`,
  kind: 'protege',
  points: LEGACY.points.protege,
  day,
  params: {},
});
export const ambitionLegacy = (ambitionId: string, day: DayKey): LegacyRow => ({
  ref: `ambition:${ambitionId}`,
  kind: 'ambition',
  points: LEGACY.points.ambition,
  day,
  params: {},
});

/** Tech design §5.6: what the chapters' requirements read, kept by the acts and the settlement. */
export interface Milestones {
  caseFileAt: number | null;
  chairVoteAt: number | null;
  nationalVoteAt: number | null;
  listAt: number | null;
  deputyFromDay: DayKey | null;
  completed: { council: number; governor: number; chair: number; deputy: number; president: number };
}

export const NO_MILESTONES: Milestones = {
  caseFileAt: null,
  chairVoteAt: null,
  nationalVoteAt: null,
  listAt: null,
  deputyFromDay: null,
  completed: { council: 0, governor: 0, chair: 0, deputy: 0, president: 0 },
};

/** Tech design §6.9: the settlement adds the window's completed terms and the first deputy term's day. */
export function milestonesAfter(
  m: Milestones,
  window: { completedTerms: ReadonlyArray<{ office: Office }>; deputyFromDay: DayKey | null },
): Milestones {
  const completed = { ...m.completed };
  for (const t of window.completedTerms) completed[t.office] += 1;
  return { ...m, completed, deputyFromDay: m.deputyFromDay ?? window.deputyFromDay };
}

/** The chapters' view of the milestones (`chapterStatus`'s input). */
export const chapterMilestones = (m: Milestones) => ({
  caseFile: m.caseFileAt !== null,
  chairVote: m.chairVoteAt !== null,
  nationalVote: m.nationalVoteAt !== null,
  onList: m.listAt !== null,
  deputyTerm: m.deputyFromDay !== null,
  completed: { council: m.completed.council, governor: m.completed.governor },
});
