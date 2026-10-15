import { CHAIR, COUNCIL, DEPUTY, GOVERNOR, PRESIDENT } from './constants';
import type { DayKey } from './day';
import type { FactionId } from './types';

/**
 * Slice 7 (docs/tech/slice-7.md §6.3; ADR 0048; design §3, GDD §15.1): the office ladder. The ladder
 * is a count of completed terms by office; stipends are paid per office per boundary held; several
 * offices at once are allowed (design §21 #7) and each pays.
 */

export type Office = 'council' | 'governor' | 'chair' | 'deputy' | 'president';
export const OFFICES = ['council', 'governor', 'chair', 'deputy', 'president'] as const satisfies readonly Office[];

export interface ServiceRecord {
  /** Completed terms by office (officeTerms, ADR 0048). */
  completed: Record<Office, number>;
  /** Consecutive terms ending with the current one (0 when not holding it). */
  consecutive: { chair: number; president: number };
  /** Days in the faction (since joining: switching is not built). */
  tenureDays: number;
  rank: number;
}

export type StandOffice = 'chair' | 'list' | 'president';

export type StandRefusal = {
  reason: 'RANK' | 'LADDER' | 'TENURE' | 'TERM_LIMIT' | 'NOT_ENOUGH_PC';
  need: number;
  rung?: Office;
};

/**
 * Design §3, §4.1, §6.1. The first refusal in this order: Rank, the ladder's rung, tenure, the term
 * limit, the Political Capital.
 * - chair: Rank 4 · a completed council term · 14 days · not in a second consecutive term · 25 PC;
 * - list: Rank 5 · a completed Governor's term or three council terms · 14 days · 25 PC;
 * - president: Rank 6 · a completed deputy's term · 14 days · not in a second consecutive term · 100 PC.
 */
export function standGate(office: StandOffice, r: ServiceRecord, pc: number): StandRefusal | null {
  const spec =
    office === 'chair'
      ? { rank: CHAIR.rank, tenure: CHAIR.tenureDays, cost: CHAIR.deposit, max: CHAIR.maxConsecutive, held: r.consecutive.chair }
      : office === 'list'
        ? { rank: DEPUTY.rank, tenure: DEPUTY.tenureDays, cost: DEPUTY.deposit, max: null, held: 0 }
        : {
            rank: PRESIDENT.rank,
            tenure: PRESIDENT.tenureDays,
            cost: PRESIDENT.deposit,
            max: PRESIDENT.maxConsecutive,
            held: r.consecutive.president,
          };
  if (r.rank < spec.rank) return { reason: 'RANK', need: spec.rank };
  if (office === 'chair' && r.completed.council < 1) return { reason: 'LADDER', need: 1, rung: 'council' };
  if (office === 'list' && r.completed.governor < 1 && r.completed.council < DEPUTY.councilTerms)
    return { reason: 'LADDER', need: DEPUTY.councilTerms, rung: 'council' };
  if (office === 'president' && r.completed.deputy < 1) return { reason: 'LADDER', need: 1, rung: 'deputy' };
  if (r.tenureDays < spec.tenure) return { reason: 'TENURE', need: spec.tenure };
  if (spec.max !== null && spec.held >= spec.max) return { reason: 'TERM_LIMIT', need: spec.max };
  if (pc < spec.cost) return { reason: 'NOT_ENOUGH_PC', need: spec.cost };
  return null;
}

/** Screens §3: one row of the Me tab's ladder. */
export interface LadderRow {
  office: Office;
  /** At least one completed term. */
  done: boolean;
  count: number;
  /** What the next rung asks for, when it is not open yet (the gate's reason). */
  need: StandRefusal | null;
  /** The next window to stand in, where the rung has one. */
  opensOn: DayKey | null;
}

/**
 * Screens §3: the five rows, council to President. The council and the Governor have no stand gate
 * here (the council's is slice 3's; the Governor is chosen at the count); the others read
 * `standGate` with `pc = Infinity` (the money is not a rung).
 */
export function ladderRows(
  r: ServiceRecord,
  nextDates: Partial<Record<Office, DayKey>> = {},
): LadderRow[] {
  const gate = (o: StandOffice) => standGate(o, r, Number.POSITIVE_INFINITY);
  return OFFICES.map((office) => ({
    office,
    done: r.completed[office] > 0,
    count: r.completed[office],
    need: office === 'chair' ? gate('chair') : office === 'deputy' ? gate('list') : office === 'president' ? gate('president') : null,
    opensOn: nextDates[office] ?? null,
  }));
}

/** Design §4.1, §6.4: the ties' completed terms, a Governor's term counting two. */
export const termsWeight = (c: Pick<Record<Office, number>, 'governor' | 'council'>): number =>
  2 * c.governor + c.council;

/** Design §3: each office's stipend per boundary held: 10/20 · 20/30 · 20/40 · 5/30 · 50/60. */
export function stipendOf(office: Office): { pc: number; fxp: number } {
  switch (office) {
    case 'council':
      return { ...COUNCIL.stipend };
    case 'governor':
      return { ...GOVERNOR.stipend };
    case 'chair':
      return { ...CHAIR.stipend };
    case 'deputy':
      return { ...DEPUTY.stipend };
    case 'president':
      return { ...PRESIDENT.stipend };
  }
}

export interface OfficeTermSpan {
  termId: string;
  office: Office;
  fromDay: DayKey;
  toDay: DayKey;
  /** The term ended early (a dissolution, a removal, a move): no stipend after it. */
  vacatedDay: DayKey | null;
  /** A local's term (a Governor's chair held by the game) pays nothing. */
  local?: boolean;
}

/**
 * ADR 0020, 0048: the stipends of every term held since `settled`: the boundaries b in
 * (settled, today] with fromDay < b ≤ end, end = min(toDay, vacatedDay). Offices add (design §21 #7).
 * Terms with no boundary are left out.
 */
export function officeStipends(
  terms: readonly OfficeTermSpan[],
  settled: DayKey | null,
  today: DayKey,
): Array<{ office: Office; termId: string; boundaries: number; pc: number; fxp: number }> {
  if (settled === null) return [];
  const out: Array<{ office: Office; termId: string; boundaries: number; pc: number; fxp: number }> = [];
  for (const t of terms) {
    if (t.local) continue;
    const end = t.vacatedDay === null ? t.toDay : Math.min(t.toDay, t.vacatedDay);
    const lo = Math.max(settled, t.fromDay);
    const hi = Math.min(today, end);
    const boundaries = Math.max(0, hi - lo);
    if (boundaries === 0) continue;
    const s = stipendOf(t.office);
    out.push({ office: t.office, termId: t.termId, boundaries, pc: s.pc * boundaries, fxp: s.fxp * boundaries });
  }
  return out;
}

export interface SeatedForGovernor {
  key: string;
  kind: 'player' | 'npc';
  factionId: FactionId;
  /** The count's total (ward vote + backers). */
  total: number;
  /** The count's finishing order (its ties already applied): lower first. */
  order: number;
  /** A completed council term before this one. */
  completedCouncil: boolean;
}

/**
 * Design §3.1 (ADR 0048): the Governor (home) or the Mayor (the capital, Clearwater), chosen at the
 * count. Among the bloc's seated (at home, the whole council's; `bloc` the largest bloc elsewhere),
 * the players with a completed council term by total, then the count's order; none → the bloc's top
 * local (`local: true`). A bloc with no local either falls back to its top seated (a first-term
 * player is passed over only for someone who qualifies).
 */
export function governorOf(i: {
  seated: readonly SeatedForGovernor[];
  bloc: FactionId | null;
}): { key: string; local: boolean } | null {
  const pool = i.seated.filter((s) => i.bloc === null || s.factionId === i.bloc);
  const byCount = (a: SeatedForGovernor, b: SeatedForGovernor) => b.total - a.total || a.order - b.order;
  const qualified = pool.filter((s) => s.kind === 'player' && s.completedCouncil).sort(byCount)[0];
  if (qualified) return { key: qualified.key, local: false };
  const local = pool.filter((s) => s.kind === 'npc').sort(byCount)[0];
  if (local) return { key: local.key, local: true };
  const top = [...pool].sort(byCount)[0];
  return top ? { key: top.key, local: top.kind === 'npc' } : null;
}
