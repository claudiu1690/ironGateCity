import { createHash, randomBytes } from 'node:crypto';
import { Candidacy, Character, Vote } from '@irongate/db';
import type { BallotLine, ElectionDoc } from '@irongate/db';
import { COUNCIL, backersOf, dayStart, wardVote } from '@irongate/rules';
import type { CountLine, DayKey, FactionId } from '@irongate/rules';
import type { ClientSession } from 'mongoose';

/**
 * What the home city's day (cityDay.ts), the capital's (capitalDay.ts) and the Issues and heroes
 * steps (issuesDay.ts) share: the conflict marker, the test seams, the seeds and the count's reads.
 */

/** Another runner settled (or bootstrapped) this boundary first: re-read and carry on. */
export class AlreadySettled extends Error {
  override name = 'AlreadySettled';
}

export const DAY_MS = 86_400_000;

/** Test seams (server tests only): fixed seeds for replayable runs, and an injected failure. */
export const cityDayHooks: {
  /** An election's seed by place (a city or a capital district) and cycle. */
  seed?: (placeId: string, cycle: number) => string;
  beforeBoundary?: (cityId: string, day: DayKey) => void;
  /** Called after every transaction attempt that lost to another runner (the report counts them). */
  onRetry?: (cityId: string, day: DayKey) => void;
  /**
   * Cities that never put a rule in force (the count writes `ordinance: null`): slice-1/2 tests that
   * pin shift and training numbers across days (the voting rework keeps the hook's meaning).
   */
  noBranchMotion?: Set<string>;
  /**
   * Slice 4: cities that draw no Issues of the Week, so slice-1–3 tests that pin opinion and
   * reward numbers see no Issue tag (+50 %) and no Issue effect.
   */
  noIssues?: Set<string>;
} = {};

export const newSeed = (placeId: string, cycle: number): string =>
  cityDayHooks.seed?.(placeId, cycle) ?? randomBytes(16).toString('hex');

/** ADR 0029: the week's draw seed, `sha256("${cityId}:${weekDay}")`, first 32 hex (replayable). */
export const issueSeed = (cityId: string, weekDay: DayKey): string =>
  createHash('sha256').update(`${cityId}:${weekDay}`).digest('hex').slice(0, 32);

const activeSince = (day: DayKey) => new Date(dayStart(day) - COUNCIL.activeEndorserDays * DAY_MS);

/**
 * Resident Rank 2+ members of the faction active in the seven days before `day` (design §17 Q17).
 * Slice 4 (ADR 0026, tech design §5.7): residents of the city (`residence.cityId`, the eligibility
 * index; migration 006 gives every character a residence).
 */
export function activeMembersFilter(cityId: string, factionId: FactionId, day: DayKey) {
  return {
    'residence.cityId': cityId,
    factionId,
    rank: { $gte: COUNCIL.voteRank },
    lastActionAt: { $gte: activeSince(day) },
  };
}

/** Slice 4 (design §8.6): the eligible of a capital district: Rank 2+ residents, any faction, active. */
export function districtResidentsFilter(cityId: string, districtId: string, day: DayKey) {
  return {
    'residence.cityId': cityId,
    'residence.districtId': districtId,
    rank: { $gte: COUNCIL.voteRank },
    lastActionAt: { $gte: activeSince(day) },
  };
}

/** Slice 7 (ADR 0050): Clearwater's eligible: Rank 2+ residents of the city, any faction, active. */
export function cityResidentsFilter(cityId: string, day: DayKey) {
  return {
    'residence.cityId': cityId,
    rank: { $gte: COUNCIL.voteRank },
    lastActionAt: { $gte: activeSince(day) },
  };
}

/** The voters and the eligible of a count (turnout): the active members plus every voter. */
export async function turnoutOf(
  electionId: string,
  filter: object,
  votes: Record<string, number>,
  session: ClientSession,
): Promise<{ voters: number; eligible: number }> {
  const voters = Object.values(votes).reduce((a, b) => a + b, 0);
  // Design §17 Q17: a member who cast a ballot in this election was active, whatever their last
  // action, so the voters are always part of it.
  const active = await Character.find(filter, { _id: 1 }).session(session).lean();
  const voterIds = await Vote.distinct('voterId', { electionId }).session(session);
  const eligible = new Set([...active.map((x) => x._id.toHexString()), ...voterIds.map((v) => String(v))])
    .size;
  return { voters, eligible };
}

/**
 * The count lines of a frozen list: the player ward vote from Local Standing in `cityId` now
 * (design §17 Q1). Slice 4: each line carries its faction (a capital list names three parties). The
 * voting rework (ADR 0084): a player's backers are read from the candidacy at the count (members plus
 * the branch's, once).
 */
export async function countLines(
  e: Pick<ElectionDoc, '_id' | 'ballot' | 'npcSlate'>,
  cityId: string,
  session: ClientSession,
): Promise<Array<CountLine & { factionId?: FactionId }>> {
  const ballot = e.ballot ?? [];
  const playerIds = ballot.flatMap((b) => (b.characterId ? [b.characterId] : []));
  const chars = await Character.find({ _id: { $in: playerIds } }, { localStanding: 1, name: 1 })
    .session(session)
    .lean();
  const cands = await Candidacy.find(
    { electionId: e._id, characterId: { $in: playerIds } },
    { characterId: 1, endorsements: 1, branch: 1 },
  )
    .session(session)
    .lean();
  return ballot.map((b: BallotLine) => {
    const faction = b.factionId ? { factionId: b.factionId } : {};
    if (b.kind === 'player' && b.characterId) {
      const c = chars.find((x) => x._id.equals(b.characterId!));
      const successes = c?.localStanding.find((s) => s.cityId === cityId)?.successes ?? 0;
      const cand = cands.find((x) => x.characterId.equals(b.characterId!));
      return {
        key: b.key,
        kind: 'player' as const,
        name: c?.name ?? b.name,
        wardVote: wardVote(successes),
        successes,
        backers: cand ? backersOf({ members: cand.endorsements.length, branch: cand.branch !== null }) : 0,
        order: b.order,
        ...faction,
      };
    }
    const npc = e.npcSlate.find((s) => s.npcId === b.npcId);
    return {
      key: b.key,
      kind: 'npc' as const,
      name: b.name,
      wardVote: npc?.wardVote ?? 0,
      // Design §17 Q5: an NPC's Standing Successes for the tie-break are profile × 5, before jitter.
      successes: (npc?.profile ?? 0) * 5,
      backers: 0,
      order: b.order,
      ...faction,
    };
  });
}
