import { COUNCIL } from './constants';
import type { DayKey } from './day';
import type { Rng } from './rng';

/**
 * The race inside the party, the count and the division (slice-3 tech design §6.3, design §4–§5,
 * §10.4, GDD §15.3, §15.10). Councils are counts, not rolls: the only randomness is the NPC jitter,
 * drawn once when nominations open and stored with its seed.
 */

/** §4.2: a player's ward vote is Local Standing Successes in the city ÷ 5, rounded down. */
export const wardVote = (successes: number): number =>
  Math.floor(Math.max(0, successes) / COUNCIL.wardDivisor);

export interface NpcSlateEntry {
  npcId: string;
  profile: number;
  /** −2…+2, drawn at the opening of nominations. */
  jitter: number;
  /** profile + jitter (never below 0). */
  wardVote: number;
}

/** §5.2: the faction's nine NPC candidates with this cycle's jitter, in profile order. */
export function drawNpcSlate(
  slate: ReadonlyArray<{ npcId: string; profile: number }>,
  rng: Rng,
): NpcSlateEntry[] {
  return slate.map((s) => {
    const jitter = rng.int(-COUNCIL.npcJitter, COUNCIL.npcJitter);
    return { npcId: s.npcId, profile: s.profile, jitter, wardVote: Math.max(0, s.profile + jitter) };
  });
}

/** §5.1: NPC candidates fill the slate to nine names. */
export const npcsStanding = (playersStanding: number): number =>
  Math.max(0, COUNCIL.slateSize - Math.max(0, playersStanding));

/** §6.3: fewer than three other eligible endorsers make a small branch. */
export const isSmallBranch = (otherEligibleEndorsers: number): boolean =>
  otherEligibleEndorsers < COUNCIL.smallBranchBelow;

/** §6.3: members' endorsements plus the branch's (two in a small branch). */
export function effectiveEndorsements(i: { members: number; branch: boolean; smallBranch: boolean }): number {
  return i.members + (i.branch ? (i.smallBranch ? 2 : 1) : 0);
}

export interface NominationsClose {
  /** Candidacy ids standing, in filing order. */
  standing: string[];
  /** Struck for want of endorsements (deposit returned). */
  struck: string[];
  /** Counted endorsements per candidacy id (the branch's double included). */
  effective: Record<string, number>;
  smallBranch: Record<string, boolean>;
  /** The NPC ids on the ballot, from the top of the slate. */
  ballotNpcs: string[];
}

/**
 * §6.1–§6.3, §5.1: at the boundary into cycle day 2, each filed candidacy stands with two counted
 * endorsements or is struck; NPCs fill the ballot to nine names from the top of the slate.
 */
export function closeNominations(i: {
  candidacies: ReadonlyArray<{
    id: string;
    filedAt: number;
    members: number;
    branch: boolean;
    otherEndorsers: number;
  }>;
  npcSlate: ReadonlyArray<{ npcId: string }>;
}): NominationsClose {
  const effective: Record<string, number> = {};
  const smallBranch: Record<string, boolean> = {};
  const standing: Array<{ id: string; filedAt: number }> = [];
  const struck: string[] = [];
  for (const c of i.candidacies) {
    const small = isSmallBranch(c.otherEndorsers);
    const n = effectiveEndorsements({ members: c.members, branch: c.branch, smallBranch: small });
    effective[c.id] = n;
    smallBranch[c.id] = small;
    if (n >= COUNCIL.endorsementsNeeded) standing.push({ id: c.id, filedAt: c.filedAt });
    else struck.push(c.id);
  }
  standing.sort((a, b) => a.filedAt - b.filedAt);
  return {
    standing: standing.map((s) => s.id),
    struck,
    effective,
    smallBranch,
    ballotNpcs: i.npcSlate.slice(0, npcsStanding(standing.length)).map((n) => n.npcId),
  };
}

export interface CountLine {
  /** 'p:<characterId>' | 'n:<npcId>'. */
  key: string;
  kind: 'player' | 'npc';
  name: string;
  wardVote: number;
  /** Local Standing Successes; NPC: profile × 5 (design §17 Q5). */
  successes: number;
  /** All counted endorsements (the tie-break uses them all; the total at most five). */
  endorsements: number;
  /** Ballot order: players by filing, then NPCs by profile. */
  order: number;
}

export interface CountRow extends CountLine {
  endorsementsCounted: number;
  votes: number;
  total: number;
  /** 1-based finishing place. */
  place: number;
  seated: boolean;
}

export interface CountResult {
  rows: CountRow[];
  seated: CountRow[];
  npcSeats: number;
  topKey: string;
  lastSeatKey: string;
}

/**
 * §4.2: total = ward vote + 3 × min(endorsements, 5) + members' votes; the seven highest take the
 * seats. Ties: members' votes, endorsements, Standing Successes, then ballot order (earlier filing,
 * NPCs after players).
 */
export function countElection(
  lines: readonly CountLine[],
  votes: Readonly<Record<string, number>>,
): CountResult {
  const scored = lines.map((l) => {
    const endorsementsCounted = Math.min(l.endorsements, COUNCIL.endorsementsCounted);
    const v = votes[l.key] ?? 0;
    return {
      ...l,
      endorsementsCounted,
      votes: v,
      total: l.wardVote + COUNCIL.endorsementWeight * endorsementsCounted + v,
    };
  });
  scored.sort(
    (a, b) =>
      b.total - a.total ||
      b.votes - a.votes ||
      b.endorsements - a.endorsements ||
      b.successes - a.successes ||
      a.order - b.order,
  );
  const rows: CountRow[] = scored.map((s, idx) => ({ ...s, place: idx + 1, seated: idx < COUNCIL.seats }));
  const seated = rows.filter((r) => r.seated);
  return {
    rows,
    seated,
    npcSeats: seated.filter((r) => r.kind === 'npc').length,
    topKey: rows[0]?.key ?? '',
    lastSeatKey: seated.at(-1)?.key ?? '',
  };
}

/** The votes a row was short of the seventh seat (0 when seated or level on a tie-break). */
export function marginToSeat(row: Pick<CountRow, 'total'>, r: { rows: readonly CountRow[] }): number {
  const last = r.rows.filter((x) => x.seated).at(-1);
  return last ? Math.max(0, last.total - row.total) : 0;
}

export interface DivisionItem {
  ordinanceId: string;
  /** The branch's motion (item 1). */
  branch: boolean;
  movedAt: number;
}

export interface Division {
  tallies: Array<{ choice: string; player: number; npc: number }>;
  /** What the NPC councillors voted for, or null when they abstained. */
  npcChoice: string | null;
  npcAbstained: boolean;
  /** The ordinance passed (four or more of seven), or null. */
  passed: string | null;
}

export const AGAINST_ALL = 'against';

/**
 * §10.4: NPC councillors vote for the item with the most player votes (ties: the branch's motion
 * if among them, else the earliest moved); with no player vote for any item, the branch's motion;
 * in Unrest they abstain. They never vote Against all. An item passes with four or more of seven.
 */
export function divide(i: {
  items: readonly DivisionItem[];
  playerVotes: ReadonlyArray<{ choice: string }>;
  npcSeats: number;
  unrest: boolean;
}): Division {
  const player = new Map<string, number>();
  for (const v of i.playerVotes) player.set(v.choice, (player.get(v.choice) ?? 0) + 1);

  let npcChoice: string | null = null;
  if (!i.unrest && i.items.length > 0 && i.npcSeats > 0) {
    const best = Math.max(...i.items.map((it) => player.get(it.ordinanceId) ?? 0));
    const branch = i.items.find((it) => it.branch);
    if (best === 0) {
      npcChoice = (branch ?? earliest(i.items)).ordinanceId;
    } else {
      const leaders = i.items.filter((it) => (player.get(it.ordinanceId) ?? 0) === best);
      npcChoice = (leaders.find((it) => it.branch) ?? earliest(leaders)).ordinanceId;
    }
  }

  const choices = [...i.items.map((it) => it.ordinanceId), AGAINST_ALL];
  const tallies = choices.map((choice) => ({
    choice,
    player: player.get(choice) ?? 0,
    npc: choice === npcChoice ? i.npcSeats : 0,
  }));
  let passed: string | null = null;
  for (const t of tallies) {
    if (t.choice !== AGAINST_ALL && t.player + t.npc >= COUNCIL.passVotes) passed = t.choice;
  }
  return { tallies, npcChoice, npcAbstained: i.unrest && i.npcSeats > 0, passed };
}

function earliest<T extends { movedAt: number }>(items: readonly T[]): T {
  return items.reduce((a, b) => (b.movedAt < a.movedAt ? b : a));
}

/**
 * ADR 0020: the stipend boundaries a councillor has held since `settled`: every boundary b in
 * (settled, today] with fromDay < b ≤ toDay, five for a full term.
 */
export function stipendBoundaries(
  terms: ReadonlyArray<{ fromDay: DayKey; toDay: DayKey }>,
  settled: DayKey | null,
  today: DayKey,
): number {
  if (settled === null) return 0;
  let n = 0;
  for (const t of terms) {
    const lo = Math.max(settled, t.fromDay);
    const hi = Math.min(today, t.toDay);
    if (hi > lo) n += hi - lo;
  }
  return n;
}
