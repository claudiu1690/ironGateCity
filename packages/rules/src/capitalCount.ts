import { BATTLEGROUND_COUNCILS, CAPITAL_COUNCIL } from './constants';
import { countSeats } from './council';
import type { CountLine, CountRow } from './council';
import type { Rng } from './rng';
import type { RuleCard, RuleDecision, RuleHow } from './ruleBallot';
import { FACTION_IDS } from './types';
import type { FactionId, OpinionShares } from './types';

/**
 * The capital's three-way count and its council (slice-4 tech design §6.5, design §8, GDD §15.3,
 * ADR 0027; the voting rework, ADR 0085): per district a turnout-weighted score mixing the votes for
 * each party's card and opinion, two seats by D'Hondt, NPCs filling each faction's list to two; the
 * rule of the largest bloc across the ten seats.
 */

const EPS = 1e-9;

/** §15.3: the ballot half is worth its full 50 from ten ballots; five points a ballot below. */
export const turnoutWeight = (ballots: number, fullTurnout: number = CAPITAL_COUNCIL.fullTurnout): number =>
  CAPITAL_COUNCIL.ballotWeightMax * Math.min(1, Math.max(0, ballots) / fullTurnout);

export interface FactionScore {
  factionId: FactionId;
  ballots: number;
  /** 0…1: the faction's ballots of all ballots (0 when none were cast). */
  ballotShare: number;
  /** 0…1: the faction's share of the three faction shares (Neutral excluded). */
  opinionShare: number;
  /** w × ballotShare + (100 − w) × opinionShare, in points. */
  score: number;
}

/** Design §8.2: every faction's score in a district, in faction order. */
export function districtScores(i: {
  ballotsByFaction: Partial<Record<FactionId, number>>;
  opinion: OpinionShares;
  /** Slice 7: the ballots at which the turnout weight is full (default the capital's ten). */
  fullTurnout?: number;
}): FactionScore[] {
  const ballots = FACTION_IDS.reduce((sum, f) => sum + (i.ballotsByFaction[f] ?? 0), 0);
  const w = turnoutWeight(ballots, i.fullTurnout);
  const factionTotal = FACTION_IDS.reduce((sum, f) => sum + i.opinion[f], 0);
  return FACTION_IDS.map((f) => {
    const b = i.ballotsByFaction[f] ?? 0;
    const ballotShare = ballots > 0 ? b / ballots : 0;
    const opinionShare = factionTotal > 0 ? i.opinion[f] / factionTotal : 1 / FACTION_IDS.length;
    return {
      factionId: f,
      ballots: b,
      ballotShare,
      opinionShare,
      score: w * ballotShare + (100 - w) * opinionShare,
    };
  });
}

/**
 * Design §8.2: seats by D'Hondt. Each seat goes to the highest `score ÷ (seats + 1)`; ties: more
 * ballots, then the higher opinion share, then `drawOrder` (the cycle's seeded draw). A faction that
 * is not `eligible` (no candidate left) is skipped and forfeits to the next. `drawn` is true when the
 * draw decided a seat.
 */
export function dhondt(
  rows: readonly FactionScore[],
  seats: number,
  drawOrder: readonly FactionId[],
  eligible: (f: FactionId, seatsWon: number) => boolean = () => true,
): { seats: FactionId[]; drawn: boolean } {
  const won: Record<string, number> = {};
  const out: FactionId[] = [];
  let drawn = false;
  const quotient = (r: FactionScore) => r.score / ((won[r.factionId] ?? 0) + 1);
  for (let n = 0; n < seats; n++) {
    const open = rows.filter((r) => eligible(r.factionId, won[r.factionId] ?? 0));
    if (open.length === 0) break;
    const sorted = [...open].sort(
      (a, b) =>
        (Math.abs(quotient(b) - quotient(a)) > EPS ? quotient(b) - quotient(a) : 0) ||
        b.ballots - a.ballots ||
        (Math.abs(b.opinionShare - a.opinionShare) > EPS ? b.opinionShare - a.opinionShare : 0) ||
        drawOrder.indexOf(a.factionId) - drawOrder.indexOf(b.factionId),
    );
    const [first, second] = sorted;
    if (
      second &&
      Math.abs(quotient(first!) - quotient(second)) <= EPS &&
      first!.ballots === second.ballots &&
      Math.abs(first!.opinionShare - second.opinionShare) <= EPS
    )
      drawn = true;
    out.push(first!.factionId);
    won[first!.factionId] = (won[first!.factionId] ?? 0) + 1;
  }
  return { seats: out, drawn };
}

/** §15.10: NPCs fill a faction's list in a district to two names. */
export const npcFill = (playersStanding: number): number =>
  Math.max(0, CAPITAL_COUNCIL.npcPerFaction - Math.max(0, playersStanding));

/** The returning officer's draw for a cycle: the three factions in a seeded order. */
export function drawOrderOf(rng: Rng): FactionId[] {
  const pool: FactionId[] = [...FACTION_IDS];
  const out: FactionId[] = [];
  while (pool.length > 0) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]!);
  return out;
}

/**
 * Design §8.4 (ADR 0085): the seated blocs in order of seats, the order of the capital's cards; ties
 * by the district count's rule city-wide (ballots, then opinion share, then the draw). Factions with
 * no seat come after (`capitalBallot`).
 */
export function councilOrder(
  seats: Partial<Record<FactionId, number>>,
  ballots: Partial<Record<FactionId, number>>,
  opinion: OpinionShares,
  drawOrder: readonly FactionId[],
): FactionId[] {
  return FACTION_IDS.filter((f) => (seats[f] ?? 0) > 0).sort(
    (a, b) =>
      (seats[b] ?? 0) - (seats[a] ?? 0) ||
      (ballots[b] ?? 0) - (ballots[a] ?? 0) ||
      (Math.abs(opinion[b] - opinion[a]) > EPS ? opinion[b] - opinion[a] : 0) ||
      drawOrder.indexOf(a) - drawOrder.indexOf(b),
  );
}

// ---------------------------------------------------------------------------------------------
// The voting rework (docs/tech/voting-rework.md §4.3, ADR 0085): a party's ballots are the votes for
// its card; the capital's rule is the largest bloc's.
// ---------------------------------------------------------------------------------------------

/** ADR 0085 §3: a district's ballots by party from its card votes; a shared card's votes split equally. */
export function cardBallots(
  cards: readonly RuleCard[],
  votes: Readonly<Record<string, number>>,
): Record<FactionId, number> {
  const out: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
  for (const c of cards) {
    const v = Math.max(0, votes[c.ordinanceId] ?? 0);
    if (v === 0 || c.factionIds.length === 0) continue;
    for (const f of c.factionIds) out[f] += v / c.factionIds.length;
  }
  return out;
}

export type DistrictCountLine = CountLine & { factionId: FactionId };
export type DistrictCountRow = CountRow & { factionId: FactionId };

export interface DistrictCount {
  factions: Array<FactionScore & { seats: number }>;
  w: number;
  ballots: number;
  seatsByFaction: Record<FactionId, number>;
  /** The two elected, in seat order (D'Hondt's). */
  seated: DistrictCountRow[];
  /** Every candidate, grouped by faction in faction order; `place` is the place within the faction. */
  rows: DistrictCountRow[];
  tie: 'draw' | null;
  drawOrder: FactionId[];
}

/**
 * §3.5 + slice 4 §6.5 (ADR 0085): within each party by `countSeats`' total and ties; across parties
 * D'Hondt on the scores from `ballotsByFaction` (`cardBallots`, may be fractional). Lines carry
 * backers, no votes.
 */
export function countDistrict(i: {
  lines: readonly DistrictCountLine[];
  ballotsByFaction: Record<FactionId, number>;
  opinion: OpinionShares;
  rng: Rng;
}): DistrictCount {
  return countBattleground({
    ...i,
    seats: BATTLEGROUND_COUNCILS.capital.perPlace,
    fullTurnout: BATTLEGROUND_COUNCILS.capital.fullTurnout,
  });
}

/**
 * Slice 7 (ADR 0050, 0085; tech design §6.8): the voting rework's district count with parameters:
 * the capital's two seats a district, Clearwater's seven (lists of three). The turnout weight is
 * full from `fullTurnout` ballots (ten in both).
 */
export function countBattleground(i: {
  lines: readonly DistrictCountLine[];
  ballotsByFaction: Record<FactionId, number>;
  opinion: OpinionShares;
  rng: Rng;
  seats: number;
  fullTurnout: number;
}): DistrictCount {
  const drawOrder = drawOrderOf(i.rng);
  const byFaction = new Map<FactionId, DistrictCountRow[]>();
  for (const f of FACTION_IDS) {
    const own = i.lines.filter((l) => l.factionId === f);
    const counted = countSeats(own, own.length).rows.map((r, idx) => ({
      ...r,
      factionId: f,
      place: idx + 1,
      seated: false,
    }));
    byFaction.set(f, counted);
  }
  const scores = districtScores({ ballotsByFaction: i.ballotsByFaction, opinion: i.opinion, fullTurnout: i.fullTurnout });
  const ballots = scores.reduce((sum, s) => sum + s.ballots, 0);
  const { seats, drawn } = dhondt(
    scores,
    i.seats,
    drawOrder,
    (f, won) => (byFaction.get(f)?.length ?? 0) > won,
  );
  const seatsByFaction: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
  const seated: DistrictCountRow[] = [];
  for (const f of seats) {
    const row = byFaction.get(f)![seatsByFaction[f]]!;
    row.seated = true;
    seated.push(row);
    seatsByFaction[f] += 1;
  }
  return {
    factions: scores.map((s) => ({ ...s, seats: seatsByFaction[s.factionId] })),
    w: turnoutWeight(ballots, i.fullTurnout),
    ballots,
    seatsByFaction,
    seated,
    rows: FACTION_IDS.flatMap((f) => byFaction.get(f)!),
    tie: drawn ? 'draw' : null,
    drawOrder,
  };
}

/**
 * ADR 0085 §4: a card's seats = Σ its parties' seats; most seats wins; ties: the card's votes
 * city-wide, then Σ its parties' opinion share (the city's average), then the earliest of its parties
 * in `drawOrder`. `how`: `draw` when seats, votes and opinion were all level, else `seats`.
 */
export function decideCapitalRule(i: {
  cards: readonly RuleCard[];
  seatsByFaction: Partial<Record<FactionId, number>>;
  votes: Readonly<Record<string, number>>;
  opinion: OpinionShares;
  drawOrder: readonly FactionId[];
}): RuleDecision {
  if (i.cards.length === 0) throw new Error('decideCapitalRule: a ballot has at least one card');
  const rows = i.cards.map((c) => ({
    ordinanceId: c.ordinanceId,
    seats: c.factionIds.reduce((sum, f) => sum + (i.seatsByFaction[f] ?? 0), 0),
    votes: Math.max(0, i.votes[c.ordinanceId] ?? 0),
    opinion: c.factionIds.reduce((sum, f) => sum + i.opinion[f], 0),
    draw: Math.min(
      ...c.factionIds.map((f) => {
        const at = i.drawOrder.indexOf(f);
        return at === -1 ? Number.MAX_SAFE_INTEGER : at;
      }),
    ),
  }));
  const level = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    a.seats === b.seats && a.votes === b.votes && Math.abs(a.opinion - b.opinion) <= EPS;
  rows.sort(
    (a, b) =>
      b.seats - a.seats ||
      b.votes - a.votes ||
      (Math.abs(b.opinion - a.opinion) > EPS ? b.opinion - a.opinion : 0) ||
      a.draw - b.draw,
  );
  const [first, second] = rows;
  const how: RuleHow = second && level(first!, second) ? 'draw' : 'seats';
  return {
    winner: first!.ordinanceId,
    how,
    tallies: rows.map((r) => ({ ordinanceId: r.ordinanceId, votes: r.votes, seats: r.seats })),
  };
}

/**
 * Slice 7 (ADR 0050, 0085): the rule of a contested council (the capital's ten seats, Clearwater's
 * seven on one meter): the largest bloc's card; ties: card votes, opinion share, the draw.
 */
export const decideBlocRule = decideCapitalRule;
