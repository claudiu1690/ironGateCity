import { CAPITAL_COUNCIL } from './constants';
import { AGAINST_ALL, countElection } from './council';
import type { CountLine, CountRow } from './council';
import type { Rng } from './rng';
import { FACTION_IDS } from './types';
import type { FactionId, OpinionShares } from './types';

/**
 * The capital's three-way count and its council (slice-4 tech design §6.5, design §8, GDD §15.3,
 * ADR 0027): per district a turnout-weighted score mixing the ballots and opinion, two seats by
 * D'Hondt, NPCs filling each faction's list to two; one council of ten where six votes pass.
 */

const EPS = 1e-9;

/** §15.3: the ballot half is worth its full 50 from ten ballots; five points a ballot below. */
export const turnoutWeight = (ballots: number): number =>
  CAPITAL_COUNCIL.ballotWeightMax * Math.min(1, Math.max(0, ballots) / CAPITAL_COUNCIL.fullTurnout);

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
}): FactionScore[] {
  const ballots = FACTION_IDS.reduce((sum, f) => sum + (i.ballotsByFaction[f] ?? 0), 0);
  const w = turnoutWeight(ballots);
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
  /** 'draw' when the returning officer's draw decided a seat. */
  tie: 'draw' | null;
  drawOrder: FactionId[];
}

/**
 * Design §8.2: count one district. Ballots are votes for names; a faction's ballots are its
 * candidates' votes. Within a faction its seats go in the slice-3 order (total = ward vote + 3 ×
 * endorsements + votes; ties by votes, endorsements, Standing, ballot order), NPCs after players.
 */
export function countDistrict(i: {
  lines: readonly DistrictCountLine[];
  votes: Readonly<Record<string, number>>;
  opinion: OpinionShares;
  rng: Rng;
}): DistrictCount {
  const drawOrder = drawOrderOf(i.rng);
  const byFaction = new Map<FactionId, DistrictCountRow[]>();
  for (const f of FACTION_IDS) {
    const own = i.lines.filter((l) => l.factionId === f);
    const counted = countElection(own, i.votes).rows.map((r, idx) => ({
      ...r,
      factionId: f,
      place: idx + 1,
      seated: false,
    }));
    byFaction.set(f, counted);
  }
  const ballotsByFaction = Object.fromEntries(
    FACTION_IDS.map((f) => [f, byFaction.get(f)!.reduce((sum, r) => sum + r.votes, 0)]),
  ) as Record<FactionId, number>;
  const scores = districtScores({ ballotsByFaction, opinion: i.opinion });
  const ballots = scores.reduce((sum, s) => sum + s.ballots, 0);
  const { seats, drawn } = dhondt(
    scores,
    CAPITAL_COUNCIL.perDistrict,
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
    w: turnoutWeight(ballots),
    ballots,
    seatsByFaction,
    seated,
    rows: FACTION_IDS.flatMap((f) => byFaction.get(f)!),
    tie: drawn ? 'draw' : null,
    drawOrder,
  };
}

export interface CapitalDivisionItem {
  ordinanceId: string;
  /** The faction whose branch motion it is, or null for a proposal. */
  branchOf: FactionId | null;
  movedAt: number;
}

export interface CapitalDivision {
  tallies: Array<{ choice: string; player: number; npc: number }>;
  /** What each faction's NPC councillors voted for (factions with NPC seats). */
  npcChoices: Partial<Record<FactionId, string>>;
  /** The ordinance passed (six or more of ten), or null. */
  passed: string | null;
}

/**
 * Design §8.4: each faction's NPC councillors vote for the item with the most votes from their own
 * faction's player councillors (ties: their branch's motion if among them, then the earliest moved);
 * with none of their players for an item, their branch's motion. Never Against all. An item passes
 * with six or more of ten.
 */
export function divideCapital(i: {
  items: readonly CapitalDivisionItem[];
  playerVotes: ReadonlyArray<{ choice: string; factionId: FactionId }>;
  npcSeats: Partial<Record<FactionId, number>>;
}): CapitalDivision {
  const npcChoices: Partial<Record<FactionId, string>> = {};
  const npc = new Map<string, number>();
  const earliest = <T extends { movedAt: number }>(xs: readonly T[]): T =>
    xs.reduce((a, b) => (b.movedAt < a.movedAt ? b : a));
  for (const f of FACTION_IDS) {
    const seats = i.npcSeats[f] ?? 0;
    if (seats <= 0 || i.items.length === 0) continue;
    const own = new Map<string, number>();
    for (const v of i.playerVotes) if (v.factionId === f) own.set(v.choice, (own.get(v.choice) ?? 0) + 1);
    const best = Math.max(...i.items.map((it) => own.get(it.ordinanceId) ?? 0));
    const branch = i.items.find((it) => it.branchOf === f);
    let choice: CapitalDivisionItem;
    if (best === 0) choice = branch ?? earliest(i.items);
    else {
      const leaders = i.items.filter((it) => (own.get(it.ordinanceId) ?? 0) === best);
      choice = leaders.find((it) => it.branchOf === f) ?? earliest(leaders);
    }
    npcChoices[f] = choice.ordinanceId;
    npc.set(choice.ordinanceId, (npc.get(choice.ordinanceId) ?? 0) + seats);
  }
  const player = new Map<string, number>();
  for (const v of i.playerVotes) player.set(v.choice, (player.get(v.choice) ?? 0) + 1);
  const tallies = [...i.items.map((it) => it.ordinanceId), AGAINST_ALL].map((choice) => ({
    choice,
    player: player.get(choice) ?? 0,
    npc: npc.get(choice) ?? 0,
  }));
  let passed: string | null = null;
  for (const t of tallies) {
    if (t.choice !== AGAINST_ALL && t.player + t.npc >= CAPITAL_COUNCIL.passVotes) passed = t.choice;
  }
  return { tallies, npcChoices, passed };
}

/**
 * Design §8.4: the seated blocs' branch motions, items 1–3, in order of seats; ties by the
 * district count's rule city-wide (ballots, then opinion share, then the draw). Factions with no
 * seat move nothing.
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
