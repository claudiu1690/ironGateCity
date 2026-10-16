import { DEPUTY, PARLIAMENT, TERM_DAYS } from './constants';
import type { DayKey } from './day';
import { lawsOnDay } from './laws';
import type { LawInForce } from './laws';
import { canTableOn, removalOpen, termOf } from './term';
import { FACTION_IDS } from './types';
import type { FactionId } from './types';

/**
 * Slice 7 (docs/tech/slice-7.md §3.2, §6.5; ADR 0045; design §5, §7; GDD §15.6): Parliament. Sixty
 * seats; player deputies vote as they choose, each bloc's local deputies by a computed chain (the
 * players' majority, the Chair's line, the secretary's line; abstain in Unrest). Bills divide at the
 * boundary into tabling day + 4; a passed law waits a signature day for the veto.
 */

export type BillKind = 'law' | 'strike' | 'removal' | 'override';
export type LineVote = 'for' | 'against' | 'free';
export type TableAs = 'deputy' | 'chair' | 'president';

/** Design §5.2: a law 31 (36 when factional), a strike 31, a removal or an override 40. */
export function billNeeded(kind: BillKind, factional: boolean): 31 | 36 | 40 {
  if (kind === 'removal' || kind === 'override') return PARLIAMENT.twoThirds;
  if (kind === 'law' && factional) return PARLIAMENT.factional;
  return PARLIAMENT.pass;
}

/** §3.2 (§22.1 Q14): the division and the signature day at t + 4, in force (or struck out) from t + 5. */
export function billDays(tabledDay: DayKey): {
  divideDay: DayKey;
  signatureDay: DayKey;
  inForceFrom: DayKey;
  strikeEndsDay: DayKey;
} {
  const divideDay = tabledDay + PARLIAMENT.voteDays + 1;
  return { divideDay, signatureDay: divideDay, inForceFrom: divideDay + 1, strikeEndsDay: divideDay + 1 };
}

export type TableRefusal = {
  reason:
    | 'PARLIAMENT_RISEN'
    | 'ALREADY_TABLED'
    | 'LAW_IN_FORCE'
    | 'LAW_ON_PAPER'
    | 'LAW_FAILED_RECENTLY'
    | 'PAPER_FULL'
    | 'NAME_REPLACEMENT'
    | 'NOT_IN_FORCE'
    | 'REMOVAL_CLOSED'
    | 'REMOVAL_TOO_SOON'
    | 'NOT_ENOUGH_PC';
  need?: number;
};

/** The days a law in force may be tabled again (a renewal, design §7.1). */
export const RENEWAL_DAYS = 7;

/**
 * Design §5.2, §7.1, §10.2 (ADR 0045): may this bill be tabled? `usedPower` is the tabler's once a
 * term (a deputy, a Chair, a removal; §22.1 Q16) or the President's once a week. `regularOpen` is
 * the regular slots free (the President has a slot of their own). A law in force may be tabled in its
 * last seven days (a renewal); at the cap a new law names the one it replaces.
 */
export function tableGate(i: {
  as: TableAs;
  kind: BillKind;
  day: DayKey;
  pc: number;
  usedPower: boolean;
  lawId: string | null;
  replaces: string | null;
  inForce: readonly LawInForce[];
  onPaper: readonly string[];
  failedWithinWeek: readonly string[];
  regularOpen: number;
  lastRemovalDay: DayKey | null;
}): TableRefusal | null {
  if (!canTableOn(i.day)) return { reason: 'PARLIAMENT_RISEN' };
  if (i.usedPower) return { reason: 'ALREADY_TABLED' };
  const live = lawsOnDay(i.inForce, i.day);
  const liveIds = new Set(live.map((l) => l.lawId));
  const needsRegular = i.as !== 'president';
  if (i.kind === 'law') {
    const current = live.find((l) => l.lawId === i.lawId);
    const renewal = current !== undefined && current.toDay - i.day <= RENEWAL_DAYS;
    if (current && !renewal) return { reason: 'LAW_IN_FORCE' };
    if (i.lawId !== null && i.onPaper.includes(i.lawId)) return { reason: 'LAW_ON_PAPER' };
    if (i.lawId !== null && i.failedWithinWeek.includes(i.lawId)) return { reason: 'LAW_FAILED_RECENTLY' };
    if (needsRegular && i.regularOpen <= 0) return { reason: 'PAPER_FULL' };
    if (!renewal && live.length >= PARLIAMENT.maxInForce) {
      if (i.replaces === null) return { reason: 'NAME_REPLACEMENT' };
      if (!liveIds.has(i.replaces)) return { reason: 'NOT_IN_FORCE' };
    }
  } else if (i.kind === 'strike') {
    if (i.lawId === null || !liveIds.has(i.lawId)) return { reason: 'NOT_IN_FORCE' };
    if (i.onPaper.includes(i.lawId)) return { reason: 'LAW_ON_PAPER' };
    if (needsRegular && i.regularOpen <= 0) return { reason: 'PAPER_FULL' };
  } else if (i.kind === 'removal') {
    if (!removalOpen(i.day)) return { reason: 'REMOVAL_CLOSED' };
    if (i.lastRemovalDay !== null && i.day - i.lastRemovalDay < PARLIAMENT.removal.gapDays)
      return { reason: 'REMOVAL_TOO_SOON' };
    if (needsRegular && i.regularOpen <= 0) return { reason: 'PAPER_FULL' };
  }
  const cost = i.as === 'president' ? 0 : i.kind === 'removal' ? PARLIAMENT.removal.cost : DEPUTY.billCost;
  if (i.pc < cost) return { reason: 'NOT_ENOUGH_PC', need: cost };
  return null;
}

export type LocalWhy = 'players' | 'chair' | 'secretary' | 'unrest';

/**
 * Design §4.3 (§22.1 Q9, Q10; settled 16 Oct 2026, phase C): a bloc's local deputies. Unrest at
 * home → the secretary's line (*free* abstains), ahead of the players and the Chair; else the majority
 * of its player deputies who voted (a tie, or none, falls through); else the Chair's line when set
 * (an explicit *free* abstains); else the secretary's line (*free* abstains).
 */
export function localVote(i: {
  players: { for: number; against: number };
  chairLine: LineVote | null;
  secretaryLine: LineVote;
  unrest: boolean;
}): { vote: 'for' | 'against' | 'abstain'; why: LocalWhy } {
  const asVote = (l: LineVote) => (l === 'free' ? 'abstain' : l);
  if (i.unrest) return { vote: asVote(i.secretaryLine), why: 'unrest' };
  if (i.players.for !== i.players.against)
    return { vote: i.players.for > i.players.against ? 'for' : 'against', why: 'players' };
  if (i.chairLine !== null) return { vote: asVote(i.chairLine), why: 'chair' };
  return { vote: asVote(i.secretaryLine), why: 'secretary' };
}

export interface BillDivision {
  byFaction: Record<
    FactionId,
    {
      seats: number;
      players: { for: number; against: number; abstain: number };
      locals: { n: number; vote: 'for' | 'against' | 'abstain'; why: LocalWhy };
    }
  >;
  for: number;
  against: number;
  abstain: number;
  needed: number;
  passed: boolean;
}

/** §3.2: the division. Each bloc's players as voted (not voting: abstain), its locals by the chain. */
export function divideBill(i: {
  needed: number;
  seats: Record<FactionId, { players: number; locals: number }>;
  votes: ReadonlyArray<{ factionId: FactionId; vote: 'for' | 'against' }>;
  chairLines: Partial<Record<FactionId, LineVote>>;
  secretaryLines: Record<FactionId, LineVote>;
  unrest: Partial<Record<FactionId, boolean>>;
}): BillDivision {
  const byFaction = {} as BillDivision['byFaction'];
  let yes = 0;
  let no = 0;
  let abstain = 0;
  for (const f of FACTION_IDS) {
    const s = i.seats[f];
    const pf = i.votes.filter((v) => v.factionId === f && v.vote === 'for').length;
    const pa = i.votes.filter((v) => v.factionId === f && v.vote === 'against').length;
    const players = { for: pf, against: pa, abstain: Math.max(0, s.players - pf - pa) };
    const local = localVote({
      players,
      chairLine: i.chairLines[f] ?? null,
      secretaryLine: i.secretaryLines[f],
      unrest: i.unrest[f] ?? false,
    });
    byFaction[f] = { seats: s.players + s.locals, players, locals: { n: s.locals, ...local } };
    yes += pf + (local.vote === 'for' ? s.locals : 0);
    no += pa + (local.vote === 'against' ? s.locals : 0);
    abstain += players.abstain + (local.vote === 'abstain' ? s.locals : 0);
  }
  return { byFaction, for: yes, against: no, abstain, needed: i.needed, passed: yes >= i.needed };
}

/** Design §10.2: a removal: the President's party's secretary Against, the others free. */
export const removalSecretaryLines = (presidentFaction: FactionId): Record<FactionId, LineVote> =>
  Object.fromEntries(FACTION_IDS.map((f) => [f, f === presidentFaction ? 'against' : 'free'])) as Record<
    FactionId,
    LineVote
  >;

export type LawEnds = Array<{ lawId: string; why: 'renewed' | 'replaced' | 'cap' }>;

/**
 * §3.2 (§22.1 Q15): a law comes into force on `day`. The same law renews (its old row ends today); a
 * named law that is still live ends; at the cap with no live named law, the one ending soonest (ties:
 * the oldest) ends.
 */
export function enact(i: {
  inForce: readonly LawInForce[];
  lawId: string;
  days: number;
  replaces: string | null;
  day: DayKey;
}): { start: LawInForce; ends: LawEnds } {
  const start = { lawId: i.lawId, fromDay: i.day, toDay: i.day + i.days };
  const live = lawsOnDay(i.inForce, i.day);
  const ends: LawEnds = [];
  if (live.some((l) => l.lawId === i.lawId)) return { start, ends: [{ lawId: i.lawId, why: 'renewed' }] };
  if (i.replaces !== null && live.some((l) => l.lawId === i.replaces)) {
    ends.push({ lawId: i.replaces, why: 'replaced' });
    return { start, ends };
  }
  if (live.length >= PARLIAMENT.maxInForce) {
    const soonest = [...live].sort((a, b) => a.toDay - b.toDay || a.fromDay - b.fromDay)[0]!;
    ends.push({ lawId: soonest.lawId, why: 'cap' });
  }
  return { start, ends };
}

/** Walk a preferred list from `pointer`, wrapping once; the first law not skipped. */
function nextPreferred(
  preferred: readonly string[],
  pointer: number,
  skip: (lawId: string) => boolean,
): { lawId: string; pointer: number } | null {
  const n = preferred.length;
  for (let k = 0; k < n; k++) {
    const idx = (((pointer + k) % n) + n) % n;
    const lawId = preferred[idx]!;
    if (!skip(lawId)) return { lawId, pointer: (idx + 1) % n };
  }
  return null;
}

/**
 * Design §5.2, §7.3 (§21 #4): the secretaries' bill, at most one a week, when fewer than two regular
 * bills are on the paper: for a party with no player Chair and no player deputy, the largest bloc
 * first (ties: the draw), its preferred list from its pointer, skipping laws in force, on the paper
 * or failed within the week; back to the top when spent.
 */
export function secretaryBill(i: {
  blocs: ReadonlyArray<{
    factionId: FactionId;
    seats: number;
    playerChair: boolean;
    playerDeputies: number;
    preferred: readonly string[];
    pointer: number;
  }>;
  regularOnPaper: number;
  inForce: readonly LawInForce[];
  onPaper: readonly string[];
  failedWithinWeek: readonly string[];
  day: DayKey;
  tabledThisWeek: boolean;
  drawOrder: readonly FactionId[];
}): { factionId: FactionId; lawId: string; pointer: number } | null {
  if (i.tabledThisWeek || i.regularOnPaper >= 2 || !canTableOn(i.day)) return null;
  const live = new Set(lawsOnDay(i.inForce, i.day).map((l) => l.lawId));
  const skip = (id: string) => live.has(id) || i.onPaper.includes(id) || i.failedWithinWeek.includes(id);
  const eligible = i.blocs
    .filter((b) => !b.playerChair && b.playerDeputies === 0 && b.preferred.length > 0)
    .sort((a, b) => b.seats - a.seats || i.drawOrder.indexOf(a.factionId) - i.drawOrder.indexOf(b.factionId));
  for (const b of eligible) {
    const next = nextPreferred(b.preferred, b.pointer, skip);
    if (next) return { factionId: b.factionId, ...next };
  }
  return null;
}

/** Design §6.5: a party's figure as President tables its preferred laws on Mondays, by the secretary's rule. */
export function figureBill(i: {
  preferred: readonly string[];
  pointer: number;
  inForce: readonly LawInForce[];
  onPaper: readonly string[];
  failedWithinWeek: readonly string[];
  day: DayKey;
}): { lawId: string; pointer: number } | null {
  if (!canTableOn(i.day) || i.preferred.length === 0) return null;
  const live = new Set(lawsOnDay(i.inForce, i.day).map((l) => l.lawId));
  return nextPreferred(
    i.preferred,
    i.pointer,
    (id) => live.has(id) || i.onPaper.includes(id) || i.failedWithinWeek.includes(id),
  );
}

/** Design §5.5: the veto on the signature day, once a term, on a vetoable bill awaiting signature. */
export const vetoOpen = (
  b: { status: string; vetoable: boolean; signatureDay: DayKey | null },
  today: DayKey,
  vetoUsed: boolean,
): boolean => !vetoUsed && b.status === 'awaitingSignature' && b.vetoable && b.signatureDay === today;

/** §22.1 Q14: an override is tabled only when it can divide by the boundary into term day 27. */
export const overrideFits = (vetoDay: DayKey): boolean => termOf(vetoDay).termDay <= TERM_DAYS.tableUntil;
