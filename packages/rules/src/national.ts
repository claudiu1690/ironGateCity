import { CHAIR, CONFIDENCE, NATIONAL, OPINION_DECIMALS, PARLIAMENT, PETITION } from './constants';
import { dhondt } from './capitalCount';
import type { FactionScore } from './capitalCount';
import type { DayKey } from './day';
import { removalOpen } from './term';
import { FACTION_IDS } from './types';
import type { FactionId, OpinionShares } from './types';

/**
 * Slice 7 (docs/tech/slice-7.md §6.4; design §6, §8, §10; GDD §14.8, §15.4, §15.5, §15.9): who holds
 * the republic, the national score and count, the lists, the party's pick, the Chair's count, the
 * vote on the Chair and the petitions' bar. Pure: every count is a count, the draw is the caller's.
 */

const EPS = 1e-9;
const round = (x: number, d = OPINION_DECIMALS) => Math.round(x * 10 ** d) / 10 ** d;

export interface ControlCity {
  cityId: string;
  /** Design §8: 0.40 · 0.30 · 0.10. */
  weight: number;
  shares: OpinionShares;
  /** A home city in Unrest counts half for every party and Neutral (§22.1 Q12). */
  unrest: boolean;
}

export interface NationalControl {
  /** Σ weight × share per party and Neutral (in points, three decimals); sums to 100, or less with Unrest. */
  shares: OpinionShares;
  /** Each party's National Control ÷ the three parties', in percent (Neutral excluded). */
  controlShare: Record<FactionId, number>;
  /** The highest National Control; ties in FACTION_IDS order. */
  leader: FactionId;
  cities: Array<{ cityId: string; weight: number; unrest: boolean; shares: OpinionShares }>;
}

/** Design §8 (GDD §14.8): who holds the republic, from the five cities as settled for the day. */
export function nationalControl(i: { cities: readonly ControlCity[] }): NationalControl {
  const sum = { vanguard: 0, collective: 0, alliance: 0, neutral: 0 };
  const cities = i.cities.map((c) => {
    const weight = c.unrest ? c.weight * NATIONAL.unrestFactor : c.weight;
    for (const k of [...FACTION_IDS, 'neutral'] as const) sum[k] += weight * c.shares[k];
    return { cityId: c.cityId, weight, unrest: c.unrest, shares: { ...c.shares } };
  });
  const shares: OpinionShares = {
    vanguard: round(sum.vanguard),
    collective: round(sum.collective),
    alliance: round(sum.alliance),
    neutral: round(sum.neutral),
  };
  const parties = FACTION_IDS.reduce((s, f) => s + sum[f], 0);
  const controlShare = Object.fromEntries(
    FACTION_IDS.map((f) => [f, parties > 0 ? (100 * sum[f]) / parties : 100 / FACTION_IDS.length]),
  ) as Record<FactionId, number>;
  let leader: FactionId = FACTION_IDS[0];
  for (const f of FACTION_IDS) if (sum[f] > sum[leader] + EPS) leader = f;
  return { shares, controlShare, leader, cities };
}

/** Design §6.3: the ballot half is worth its full 50 from thirty ballots across the republic. */
export const nationalTurnoutWeight = (ballots: number): number =>
  NATIONAL.ballotWeightMax * Math.min(1, Math.max(0, ballots) / NATIONAL.fullTurnout);

export interface NationalScore {
  factionId: FactionId;
  ballots: number;
  /** 0…1. */
  ballotShare: number;
  /** Percent (0…100), from National Control. */
  controlShare: number;
  backers: number;
  /** w × ballotShare + (100 − w) × controlShare ÷ 100 + min(5, backers); full precision. */
  score: number;
  seats: number;
}

/** Design §6.3: the three parties' scores (seats filled by `countNation`). */
export function nationalScores(i: {
  ballotsByFaction: Partial<Record<FactionId, number>>;
  controlShare: Record<FactionId, number>;
  backers: Partial<Record<FactionId, number>>;
}): NationalScore[] {
  const total = FACTION_IDS.reduce((s, f) => s + Math.max(0, i.ballotsByFaction[f] ?? 0), 0);
  const w = nationalTurnoutWeight(total);
  return FACTION_IDS.map((f) => {
    const ballots = Math.max(0, i.ballotsByFaction[f] ?? 0);
    const ballotShare = total > 0 ? ballots / total : 0;
    const backers = Math.max(0, i.backers[f] ?? 0);
    const controlShare = i.controlShare[f];
    return {
      factionId: f,
      ballots,
      ballotShare,
      controlShare,
      backers,
      score: w * ballotShare + ((100 - w) * controlShare) / 100 + Math.min(NATIONAL.backersMax, backers),
      seats: 0,
    };
  });
}

/**
 * Design §6.3: the President is the highest score (ties: ballots, then the control share, then the
 * term's draw); the runner-up the next; sixty seats by D'Hondt on the scores (slice 4's `dhondt`, with
 * ballots and the control share as its ties). `drawn` when the draw decided the President or a seat.
 */
export function countNation(i: { scores: readonly NationalScore[]; drawOrder: readonly FactionId[] }): {
  president: FactionId;
  runnerUp: FactionId;
  seats: Record<FactionId, number>;
  drawn: boolean;
  /** The scores with their seats. */
  scores: NationalScore[];
} {
  const cmp = (a: NationalScore, b: NationalScore) =>
    (Math.abs(b.score - a.score) > EPS ? b.score - a.score : 0) ||
    b.ballots - a.ballots ||
    (Math.abs(b.controlShare - a.controlShare) > EPS ? b.controlShare - a.controlShare : 0) ||
    i.drawOrder.indexOf(a.factionId) - i.drawOrder.indexOf(b.factionId);
  const order = [...i.scores].sort(cmp);
  const [first, second] = order;
  const presidentDrawn =
    !!second &&
    Math.abs(first!.score - second.score) <= EPS &&
    first!.ballots === second.ballots &&
    Math.abs(first!.controlShare - second.controlShare) <= EPS;
  const rows: FactionScore[] = i.scores.map((s) => ({
    factionId: s.factionId,
    ballots: s.ballots,
    ballotShare: s.ballotShare,
    opinionShare: s.controlShare / 100,
    score: s.score,
  }));
  const { seats: won, drawn } = dhondt(rows, PARLIAMENT.seats, i.drawOrder);
  const seats: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
  for (const f of won) seats[f] += 1;
  return {
    president: first!.factionId,
    runnerUp: second!.factionId,
    seats,
    drawn: presidentDrawn || drawn,
    scores: i.scores.map((s) => ({ ...s, seats: seats[s.factionId] })),
  };
}

export interface ListEntry {
  key: string;
  backers: number;
  termsWeight: number;
  /** Total Reputation wins across the five cities. */
  reputationWins: number;
  filedAt: number;
}

/**
 * Design §6.4: a party's list: (1) its candidate for President when a player who was not elected;
 * (2) its list candidates by backers, then completed terms (`termsWeight`), then Reputation wins, then
 * filing. Local deputies fill the rest (`seatList`). A figure that loses takes no seat (§22.1 Q28).
 */
export function partyList(i: {
  candidate: { key: string; kind: 'player' | 'npc' } | null;
  elected: boolean;
  list: readonly ListEntry[];
}): string[] {
  const head = i.candidate && i.candidate.kind === 'player' && !i.elected ? [i.candidate.key] : [];
  const rest = [...i.list]
    .filter((l) => !head.includes(l.key))
    .sort(
      (a, b) =>
        b.backers - a.backers || b.termsWeight - a.termsWeight || b.reputationWins - a.reputationWins || a.filedAt - b.filedAt,
    )
    .map((l) => l.key);
  return [...head, ...rest];
}

/** Design §6.4: the party's seats go down its list; local deputies fill what is left. Places are 1-based. */
export function seatList(
  order: readonly string[],
  seats: number,
): { seated: string[]; locals: number; places: Record<string, number> } {
  const seated = order.slice(0, Math.max(0, seats));
  return {
    seated,
    locals: Math.max(0, seats - seated.length),
    places: Object.fromEntries(order.map((k, idx) => [k, idx + 1])),
  };
}

export interface PickLine {
  key: string;
  backers: number;
  termsWeight: number;
  /** Ballot order: players by filing, the figure last. */
  order: number;
}
export interface PickRow extends PickLine {
  votes: number;
  place: number;
}

/**
 * Design §6.2 (§23.1 Q23): the party's pick. Most votes; ties: the party's figure (design §21 #2, the
 * designer's ruling of 15 Oct 2026, phase B), then backers (none before the pick opens), completed
 * terms, then ballot order (the figure last).
 */
export function countPick(i: { ballot: readonly PickLine[]; votes: Readonly<Record<string, number>> }): {
  winnerKey: string;
  rows: PickRow[];
} {
  const rows = i.ballot
    .map((l) => ({ ...l, votes: Math.max(0, i.votes[l.key] ?? 0), place: 0 }))
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        // The designer's ruling (15 Oct 2026, phase B): on an exact tie of votes the party's figure wins.
        (isFigure(a) ? -1 : isFigure(b) ? 1 : 0) ||
        b.backers - a.backers ||
        b.termsWeight - a.termsWeight ||
        a.order - b.order,
    )
    .map((r, idx) => ({ ...r, place: idx + 1 }));
  if (rows.length === 0) throw new Error('countPick: a ballot has at least the figure');
  return { winnerKey: rows[0]!.key, rows };
}

/** A pick's figure: an npc key (`n:{npcId}`); a player's is `p:{characterId}`. */
const isFigure = (l: Pick<PickLine, 'key'>): boolean => l.key.startsWith('n:');

export interface ChairLine {
  key: string;
  kind: 'player' | 'secretary';
  backers: number;
  termsWeight: number;
  /** Players by filing, the secretary last. */
  order: number;
}
export interface ChairRow extends ChairLine {
  votes: number;
  /** min(5, backers) for a player; 0 for the secretary. */
  backersCounted: number;
  /** votes + 3 × backersCounted (the secretary: votes). */
  total: number;
  place: number;
}

/**
 * Design §4.1 (ADR 0084): the Chair's count. Support = votes + 3 × min(5, backers); the secretary has
 * votes only. Ties: votes, then the secretary, then backers, then completed terms, then filing (the
 * designer's ruling of 15 Oct 2026, phase B; GDD §15.4).
 */
export function countChair(i: { lines: readonly ChairLine[]; votes: Readonly<Record<string, number>> }): {
  rows: ChairRow[];
  winnerKey: string;
  secretaryKept: boolean;
  margin: number;
} {
  const rows = i.lines
    .map((l) => {
      const votes = Math.max(0, i.votes[l.key] ?? 0);
      const backersCounted = l.kind === 'player' ? Math.min(CHAIR.backersCounted, Math.max(0, l.backers)) : 0;
      return { ...l, votes, backersCounted, total: votes + CHAIR.backerWeight * backersCounted, place: 0 };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.votes - a.votes ||
        (a.kind === 'secretary' ? -1 : b.kind === 'secretary' ? 1 : 0) ||
        b.backers - a.backers ||
        b.termsWeight - a.termsWeight ||
        a.order - b.order,
    )
    .map((r, idx) => ({ ...r, place: idx + 1 }));
  if (rows.length === 0) throw new Error('countChair: a ballot has at least the secretary');
  const [first, second] = rows;
  return {
    rows,
    winnerKey: first!.key,
    secretaryKept: first!.kind === 'secretary',
    margin: first!.total - (second?.total ?? 0),
  };
}

/**
 * ADR 0084 (the voting rework's freeze, for the Chair): every standing player by filing (no strike,
 * no small rule), then the secretary, `n:secretary`.
 */
export function freezeChairList(standing: ReadonlyArray<{ id: string; filedAt: number }>): string[] {
  return [...[...standing].sort((a, b) => a.filedAt - b.filedAt).map((s) => s.id), 'n:secretary'];
}

/** Design §4.5 (§22.1 Q29): removed at two thirds of the votes cast No, and at least three No. */
export function confidenceResult(c: { confidence: number; noConfidence: number }): { removed: boolean } {
  const no = Math.max(0, c.noConfidence);
  const cast = Math.max(0, c.confidence) + no;
  return { removed: no >= CONFIDENCE.minNoVotes && cast > 0 && no * 3 >= cast * 2 };
}

/** Design §10.1 (§22.1 Q30): a quarter of the eligible, rounded up, at least three. */
export const signaturesNeeded = (eligible: number, min: number = PETITION.min): number =>
  Math.max(min, Math.ceil(Math.max(0, eligible) * PETITION.share));

/**
 * Design §10.2 (§22.1 Q11, GDD §15.9): the clerk's motion to remove the President when the
 * President's party's control share is under 25 %, removals are open that day, it was not used this
 * term, and seven days have passed since the last removal motion.
 */
export function autoRemovalDue(i: {
  controlShare: number;
  day: DayKey;
  lastRemovalDay: DayKey | null;
  usedThisTerm: boolean;
}): boolean {
  if (i.usedThisTerm || !removalOpen(i.day)) return false;
  if (i.lastRemovalDay !== null && i.day - i.lastRemovalDay < PARLIAMENT.removal.gapDays) return false;
  return i.controlShare < PARLIAMENT.removal.autoBelowShare;
}
