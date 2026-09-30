import { describe, expect, it } from 'vitest';
import { buildElectionsReport } from '../src/elections';

const DAY = 86_400_000;
const D = 20_732; // a count day
const at = (day: number, hour: number, min = 0) => new Date(day * DAY + hour * 3_600_000 + min * 60_000);

const rows = [
  { key: 'p:a', kind: 'player' as const, total: 48, seated: true, place: 1 },
  ...[44, 38, 33, 29, 25, 22].map((total, i) => ({
    key: `n:${i}`,
    kind: 'npc' as const,
    total,
    seated: true,
    place: i + 2,
  })),
  { key: 'p:b', kind: 'player' as const, total: 20, seated: false, place: 8 },
  { key: 'n:7', kind: 'npc' as const, total: 17, seated: false, place: 9 },
];

describe('the elections report (tech design §14.1)', () => {
  const report = buildElectionsReport({
    elections: [
      {
        id: 'coalport:4145',
        cityId: 'coalport',
        cycle: 4145,
        nominationsFrom: D - 5,
        pollsFrom: D - 3,
        countDay: D,
        status: 'counted',
        ballot: rows.map((r) => ({ kind: r.kind, key: r.key })),
        result: { rows, turnout: { voters: 3, eligible: 4 }, npcSeats: 6 },
      },
    ],
    candidacies: [
      {
        electionId: 'coalport:4145',
        characterId: 'a',
        status: 'elected',
        filedDay: D - 5,
        members: 1,
        branch: true,
        smallBranch: true,
      },
      {
        electionId: 'coalport:4145',
        characterId: 'b',
        status: 'defeated',
        filedDay: D - 4,
        members: 2,
        branch: false,
        smallBranch: false,
      },
      {
        electionId: 'coalport:4145',
        characterId: 'c',
        status: 'struck',
        filedDay: D - 4,
        members: 0,
        branch: false,
        smallBranch: true,
      },
    ],
    ballots: [
      { electionId: 'coalport:4145', voterId: 'a', day: D - 3, createdAt: at(D - 3, 9, 1) },
      { electionId: 'coalport:4145', voterId: 'b', day: D - 2, createdAt: at(D - 2, 10) },
      { electionId: 'coalport:4145', voterId: 'v', day: D - 3, createdAt: at(D - 3, 12) },
    ],
    npcBallots: [{ electionId: 'coalport:4145', npc: 1, total: 3 }],
    terms: [
      {
        cityId: 'coalport',
        councilKey: 'coalport:4146',
        fromDay: D,
        toDay: D + 5,
        playerId: 'a',
        frontPageSeenAt: at(D, 8),
      },
    ],
    papers: [
      {
        id: 'coalport:4146',
        cityId: 'coalport',
        items: [
          { kind: 'branch', characterId: null, at: at(D, 0) },
          { kind: 'player', characterId: 'a', at: at(D, 8, 10) },
        ],
        votes: [{ characterId: 'a', at: at(D, 8, 12) }],
        status: 'divided',
        passed: 'ord.open-doors',
        inForce: { fromDay: D + 2, toDay: D + 7 },
      },
    ],
    morale: [
      {
        cityId: 'coalport',
        log: [
          { day: D - 1, share: 78, state: 'steady' },
          { day: D, share: 81, state: 'fired' },
          { day: D + 1, share: 80.5, state: 'fired' },
        ],
      },
    ],
    characters: [
      {
        id: 'a',
        name: 'A',
        homeCityId: 'coalport',
        createdAt: at(D - 12, 9),
        boosted: true,
        boostedAt: at(D - 6, 9),
      },
      {
        id: 'b',
        name: 'B',
        homeCityId: 'coalport',
        createdAt: at(D - 12, 9),
        boosted: false,
        boostedAt: null,
      },
      {
        id: 'v',
        name: 'V',
        homeCityId: 'coalport',
        createdAt: at(D - 12, 9),
        boosted: false,
        boostedAt: null,
      },
      {
        id: 'n',
        name: 'N',
        homeCityId: 'coalport',
        createdAt: at(D - 12, 9),
        boosted: false,
        boostedAt: null,
      },
    ],
    actions: [
      {
        characterId: 'b',
        createdAt: at(D - 8, 9),
        cityId: 'coalport',
        kind: 'checked',
        txAttempts: 1,
        rankTo: 2,
      },
      {
        characterId: 'b',
        createdAt: at(D - 5, 9),
        cityId: 'coalport',
        kind: 'checked',
        txAttempts: 1,
        rankTo: 3,
      },
      {
        characterId: 'v',
        createdAt: at(D - 4, 9),
        cityId: 'coalport',
        kind: 'checked',
        txAttempts: 1,
        rankTo: 2,
      },
      {
        characterId: 'n',
        createdAt: at(D - 6, 9),
        cityId: 'coalport',
        kind: 'checked',
        txAttempts: 1,
        rankTo: 2,
      },
      {
        characterId: 'a',
        createdAt: at(D + 1, 9),
        cityId: 'coalport',
        kind: 'checked',
        txAttempts: 1,
        rankTo: null,
      },
      {
        characterId: 'v',
        createdAt: at(D + 3, 0, 5),
        cityId: 'coalport',
        kind: 'checked',
        txAttempts: 2,
        rankTo: null,
      },
      {
        characterId: 'b',
        createdAt: at(D + 3, 9),
        cityId: 'coalport',
        kind: 'shift',
        txAttempts: 1,
        rankTo: null,
      },
    ],
    paperReads: [
      { characterId: 'v', day: D - 3, readAt: at(D - 3, 11, 59) },
      { characterId: 'b', day: D + 1, readAt: at(D + 1, 7) },
    ],
  });

  it('per election: filings, endorsements, turnout, the NPC share, seats, totals, margin, morale', () => {
    expect(report.elections).toEqual([
      {
        election: 'coalport:4145',
        cityId: 'coalport',
        countDay: D,
        filed: 3,
        withdrawn: 0,
        struck: 1,
        standing: 2,
        npcsStanding: 7,
        memberEndorsements: 3,
        branchEndorsements: 1,
        smallBranchDoubles: 1,
        turnout: '3 of 4',
        npcBallotShare: 0.33,
        playerSeats: 1,
        topTotal: 48,
        seventhTotal: 22,
        closestPlayerMargin: 2,
        moraleAtCount: 81,
      },
    ]);
  });

  it('per council: player councillors, proposals, votes, the ordinance, play while in force', () => {
    expect(report.councils).toEqual([
      {
        council: 'coalport:4146',
        cityId: 'coalport',
        playerCouncillors: 1,
        proposals: 1,
        councilVotes: '1 / 1',
        passed: 'ord.open-doors',
        actionsWhileInForce: 1,
        shiftsWhileInForce: 1,
      },
    ]);
  });

  it('the first vote: Rank 2 → the ballot, minutes from the paper, windows voted', () => {
    // a: boosted D−6 → ballot D−3 (3 days); b: Rank 2 D−8 → D−2 (more); v: D−4 → D−3 (1 day).
    expect(report.firstVote.distribution).toEqual({ d0: 0, d1: 1, d2: 0, more: 2 });
    expect(report.firstVote.medianMinutesFromPaper).toBe(1);
    expect(report.firstVote.windowTurnout).toBe(0.75);
  });

  it('the first seat, boosted and natural apart', () => {
    expect(report.firstSeat.boosted).toMatchObject({
      players: 1,
      rank3ToCandidacyDays: 1,
      candidacyToSeatDays: 5,
      seats: 1,
      frontPageSeenHours: 8,
      frontPageSeenOnCountDay: 1,
      actInChamberWithin30Min: 1,
      councilVoteRate: 1,
    });
    expect(report.firstSeat.natural).toMatchObject({ players: 3, seats: 0, rank3ToCandidacyDays: 1 });
  });

  it('next-day return, morale states and contention near midnight', () => {
    expect(report.nextDayReturn).toEqual({ winners: 1, losers: 1, voters: 0.67, nonVoters: 0 });
    expect(report.morale).toEqual([
      { cityId: 'coalport', days: { fired: 2, steady: 1, unrest: 0 }, crossings: 1, firstFiredDay: D },
    ]);
    expect(report.contention).toEqual({ actionsNearMidnight: 1, contendedNearMidnight: 1 });
  });
});
