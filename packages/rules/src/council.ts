import { COUNCIL } from './constants';
import type { DayKey } from './day';
import type { Rng } from './rng';

/**
 * The race inside the party and the count of seats (slice-3 tech design §6.3, GDD §15.3, §15.10; the
 * voting rework, ADR 0084). Councils are counts, not rolls: the only randomness is the NPC jitter,
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

/** The votes a row was short of the seventh seat (0 when seated or level on a tie-break). */
export function marginToSeat(
  row: Pick<CountRow, 'total'>,
  r: { rows: ReadonlyArray<Pick<CountRow, 'total' | 'seated'>> },
): number {
  const last = r.rows.filter((x) => x.seated).at(-1);
  return last ? Math.max(0, last.total - row.total) : 0;
}

// ---------------------------------------------------------------------------------------------
// The voting rework (docs/tech/voting-rework.md §4.1, ADR 0084): seats by reputation and backers.
// ---------------------------------------------------------------------------------------------

/** ADR 0084: members' backings plus the branch's, uncapped (the tie-break uses them all). */
export const backersOf = (c: { members: number; branch: boolean }): number =>
  Math.max(0, c.members) + (c.branch ? 1 : 0);

export interface CountLine {
  /** 'p:<characterId>' | 'n:<npcId>'. */
  key: string;
  kind: 'player' | 'npc';
  name: string;
  wardVote: number;
  /** Local Standing Successes; NPC: profile × 5. */
  successes: number;
  /** All backers, the branch's included (`backersOf`); at most five count. */
  backers: number;
  /** List order: players by filing, then NPCs by profile. */
  order: number;
}

export interface CountRow extends CountLine {
  backersCounted: number;
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
 * Design §3.5, ADR 0084: total = ward vote + 3 × min(backers, 5); the `seats` highest are seated
 * (seven at home). Ties: more backers, then Standing Successes, then list order (earlier filing,
 * locals after every player). Members' votes are not part of the seat count.
 */
export function countSeats(lines: readonly CountLine[], seats: number = COUNCIL.seats): CountResult {
  const scored = lines.map((l) => {
    const backersCounted = Math.min(Math.max(0, l.backers), COUNCIL.endorsementsCounted);
    return { ...l, backersCounted, total: l.wardVote + COUNCIL.endorsementWeight * backersCounted };
  });
  scored.sort(
    (a, b) => b.total - a.total || b.backers - a.backers || b.successes - a.successes || a.order - b.order,
  );
  const rows: CountRow[] = scored.map((s, idx) => ({ ...s, place: idx + 1, seated: idx < seats }));
  const seated = rows.filter((r) => r.seated);
  return {
    rows,
    seated,
    npcSeats: seated.filter((r) => r.kind === 'npc').length,
    topKey: rows[0]?.key ?? '',
    lastSeatKey: seated.at(-1)?.key ?? '',
  };
}

/**
 * ADR 0084 §2: the set (the boundary into cycle day 2) freezes the list: every standing player by
 * filing, then the slate's top `9 − p` locals. No strike, no doubling.
 */
export function freezeList(i: {
  standing: ReadonlyArray<{ id: string; filedAt: number }>;
  npcSlate: ReadonlyArray<{ npcId: string }>;
}): { standing: string[]; ballotNpcs: string[] } {
  const standing = [...i.standing].sort((a, b) => a.filedAt - b.filedAt).map((s) => s.id);
  return { standing, ballotNpcs: i.npcSlate.slice(0, npcsStanding(standing.length)).map((n) => n.npcId) };
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
