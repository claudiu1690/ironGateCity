import { CONFIDENCE, PETITION, TOWN_HALL } from './constants';
import type { DayKey } from './day';
import type { EventBand } from './events';
import type { FactionId } from './types';

/**
 * Slice 7 (docs/tech/slice-7.md §6.9; design §4.4, §4.5, §10, §11.1; ADR 0049): the Town Hall's
 * signatures, the Chair's call, the petitions' gates and the national lines' selection. Pure.
 */

/** Design §10.4: the townspeople's signatures a Town Hall adds to the city's open petition. */
export const townHallSignatures = (band: EventBand): number => TOWN_HALL.signatures[band];

/**
 * Design §4.4: the Chair calls an event in any open city, from anywhere, with no role and no Energy:
 * not on a rival's home ground, and in the capital in a district.
 */
export function chairCallGate(i: {
  chair: boolean;
  cityOpen: boolean;
  rivalHome: boolean;
  districtOk: boolean;
}): null | { reason: 'NOT_CHAIR' | 'WRONG_CITY' | 'WRONG_DISTRICT' } {
  if (!i.chair) return { reason: 'NOT_CHAIR' };
  if (!i.cityOpen || i.rivalHome) return { reason: 'WRONG_CITY' };
  if (!i.districtOk) return { reason: 'WRONG_DISTRICT' };
  return null;
}

export type PetitionRefusal = {
  reason:
    | 'RANK'
    | 'NOT_RESIDENT'
    | 'TOO_SOON'
    | 'PETITION_CLOSED'
    | 'ALREADY_OPEN'
    | 'ALREADY_SIGNED'
    | 'COUNCILLOR'
    | 'NOT_ENOUGH_PC';
  need?: number;
};

/**
 * Design §10.1 (ADR 0049, §22.1 Q25): opening (Rank 3, cycle days 0–2, seven days since the city's
 * last petition closed, none open) or signing (Rank 2, one open, not signed yet) a petition to
 * dissolve the council of the residence city. A voter of the city only (`votesFromOk`); the council's
 * own members cannot sign; 10 PC each.
 */
export function petitionGate(i: {
  rank: number;
  resident: boolean;
  votesFromOk: boolean;
  cycleDay: number;
  lastClosedDay: DayKey | null;
  today: DayKey;
  open: boolean;
  pc: number;
  councillor: boolean;
  signed: boolean;
  /** Opening (true) or signing (false). */
  opening: boolean;
}): PetitionRefusal | null {
  const rank = i.opening ? PETITION.openRank : PETITION.signRank;
  if (i.rank < rank) return { reason: 'RANK', need: rank };
  if (!i.resident || !i.votesFromOk) return { reason: 'NOT_RESIDENT' };
  if (i.councillor) return { reason: 'COUNCILLOR' };
  if (i.opening) {
    if (i.open) return { reason: 'ALREADY_OPEN' };
    if (!(PETITION.openCycleDays as readonly number[]).includes(i.cycleDay)) return { reason: 'PETITION_CLOSED' };
    if (i.lastClosedDay !== null && i.today - i.lastClosedDay < PETITION.gapDays) return { reason: 'TOO_SOON' };
  } else {
    if (!i.open) return { reason: 'PETITION_CLOSED' };
    if (i.signed) return { reason: 'ALREADY_SIGNED' };
  }
  if (i.pc < PETITION.cost) return { reason: 'NOT_ENOUGH_PC', need: PETITION.cost };
  return null;
}

/**
 * Design §4.5: a petition on the Chair: Rank 3, not in the Chair's first five days or last three
 * (of the Chair's 28), one per Chair per term, only against a player Chair; 10 PC.
 */
export function chairPetitionGate(i: {
  rank: number;
  /** 0–27: days since the Chair's term began. */
  chairDay: number;
  usedThisTerm: boolean;
  playerChair: boolean;
  pc: number;
  signed: boolean;
  opening: boolean;
}): null | { reason: 'NO_CHAIR' | 'RANK' | 'TOO_SOON' | 'PETITION_CLOSED' | 'ALREADY_OPEN' | 'ALREADY_SIGNED' | 'NOT_ENOUGH_PC'; need?: number } {
  if (!i.playerChair) return { reason: 'NO_CHAIR' };
  if (i.rank < CONFIDENCE.petitionRank) return { reason: 'RANK', need: CONFIDENCE.petitionRank };
  if (i.opening) {
    if (i.usedThisTerm) return { reason: 'ALREADY_OPEN' };
    if (i.chairDay < CONFIDENCE.notFirstDays || i.chairDay > 27 - CONFIDENCE.notLastDays)
      return { reason: 'TOO_SOON' };
  } else if (i.signed) return { reason: 'ALREADY_SIGNED' };
  if (i.pc < CONFIDENCE.cost) return { reason: 'NOT_ENOUGH_PC', need: CONFIDENCE.cost };
  return null;
}

/** One national line written by the nation's day (`nation.news`, tech design §5.1). */
export interface NewsItem {
  day: DayKey;
  /** The content line's id (`nl.*`). */
  id: string;
  priority: number;
  factionId: FactionId | null;
  /** `nl.target-met` only: who contributed to the met push. */
  contributors?: readonly string[];
  facts: Record<string, unknown>;
}

/** The national line printed only when nothing else is (design §11.1). */
export const LEADER_LINE_ID = 'nl.leader-line';

/**
 * Design §11.1: today's national lines for a reader: lines for everyone, the reader's faction's, and
 * (`nl.target-met`) only for its contributors; the two of highest priority (0 first, then the order
 * written); the leader's line only when nothing else is.
 */
export function selectNationalLines(
  news: readonly NewsItem[],
  i: { day: DayKey; factionId: FactionId; characterId: string },
): NewsItem[] {
  const today = news
    .map((n, idx) => ({ n, idx }))
    .filter(({ n }) => n.day === i.day)
    .filter(({ n }) => n.factionId === null || n.factionId === i.factionId)
    .filter(({ n }) => n.contributors === undefined || n.contributors.includes(i.characterId));
  const others = today.filter(({ n }) => n.id !== LEADER_LINE_ID);
  const pool = others.length > 0 ? others : today;
  return pool
    .sort((a, b) => a.n.priority - b.n.priority || a.idx - b.idx)
    .slice(0, 2)
    .map(({ n }) => n);
}
