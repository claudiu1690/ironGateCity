import { describe, expect, it } from 'vitest';
import { buildBattlegroundReport } from '../src/battleground';
import type { BattlegroundInput, BgCharacter, BgJourney } from '../src/battleground';

/** Slice 4 (tech design §15.2): the battleground section of the playtest report, from fixtures. */

const T0 = Date.UTC(2026, 9, 5, 9);
const at = (min: number) => new Date(T0 + min * 60_000);
const DAY = 24 * 60;

const character = (id: string, over: Partial<BgCharacter> = {}): BgCharacter => ({
  id,
  name: id,
  homeCityId: 'coalport',
  createdAt: at(-5 * DAY),
  level10At: at(-DAY),
  rank2At: at(-2 * DAY),
  residence: { cityId: 'coalport', districtId: null },
  boosted: false,
  ...over,
});

const journey = (characterId: string, boardMin: number, over: Partial<BgJourney> = {}): BgJourney => ({
  characterId,
  from: 'coalport',
  to: 'irongate',
  boardedAt: at(boardMin),
  arrivesAt: at(boardMin + 12),
  closedAt: at(boardMin + 13),
  card: true,
  choiceAt: at(boardMin + 4),
  sleptThrough: false,
  ...over,
});

const DISTRICTS = [
  { id: 'irongate.eastside', name: 'Eastside' },
  { id: 'irongate.station-market', name: 'Station & Market' },
];

const input = (over: Partial<BattlegroundInput> = {}): BattlegroundInput => ({
  capitalId: 'irongate',
  districts: DISTRICTS,
  characters: [
    character('a', { residence: { cityId: 'irongate', districtId: 'irongate.eastside' } }),
    character('b'),
    character('boosted', { boosted: true }),
  ],
  journeys: [
    journey('a', 0),
    // Answered on the arrival modal, closed three hours later (closed the game).
    journey('a', 300, { from: 'irongate', to: 'coalport', choiceAt: at(313), closedAt: at(480) }),
    // No card; slept through nothing.
    journey('b', 60, { card: false, choiceAt: null }),
    // A card left unanswered: slept through.
    journey('b', DAY + 60, { choiceAt: null, sleptThrough: true, closedAt: null }),
    journey('boosted', 0),
  ],
  moves: [
    { characterId: 'a', at: at(20), cityId: 'irongate', districtId: 'irongate.eastside' },
    { characterId: 'b', at: at(2 * DAY), cityId: 'irongate', districtId: 'irongate.station-market' },
    { characterId: 'b', at: at(9 * DAY), cityId: 'coalport', districtId: null },
  ],
  rooms: [{ characterId: 'a', at: at(30) }],
  elections: [
    {
      districtId: 'irongate.eastside',
      cycle: 4146,
      ballots: 3,
      w: 15,
      turnout: { voters: 3, eligible: 5 },
      seats: [
        { factionId: 'collective', kind: 'npc' },
        { factionId: 'vanguard', kind: 'player' },
      ],
      tie: null,
    },
    {
      districtId: 'irongate.station-market',
      cycle: 4146,
      ballots: 0,
      w: 0,
      turnout: { voters: 0, eligible: 0 },
      seats: [
        { factionId: 'alliance', kind: 'npc' },
        { factionId: 'collective', kind: 'npc' },
      ],
      tie: 'draw',
    },
  ],
  councils: [
    { councilKey: 'irongate:4147', passed: 'ord.tram-subsidy', coalition: ['collective', 'vanguard', 'collective'] },
    { councilKey: 'irongate:4148', passed: null, coalition: [] },
  ],
  districtLogs: [
    {
      districtId: 'irongate.eastside',
      log: [
        { day: 1, battleground: false, controlledBy: 'collective' },
        { day: 2, battleground: true, controlledBy: null },
        { day: 3, battleground: true, controlledBy: null },
        { day: 4, battleground: false, controlledBy: 'vanguard' },
      ],
    },
  ],
  issues: [
    {
      cityId: 'irongate',
      weekDay: 20731,
      issueId: 'issue.tram-fares',
      status: 'owned',
      momentum: { vanguard: 40, collective: 130, alliance: 0 },
      ownerId: 'collective',
      top: 3,
      effect: true,
    },
    {
      cityId: 'coalport',
      weekDay: 20731,
      issueId: 'issue.mill-hours',
      status: 'lapsed',
      momentum: { vanguard: 0, collective: 0, alliance: 0 },
      ownerId: null,
      top: 0,
      effect: false,
    },
  ],
  ledger: [
    { placeId: 'irongate.eastside', cycleKey: 'irongate.eastside:4146', kind: 'action', swing: 600 },
    { placeId: 'irongate.eastside', cycleKey: 'irongate.eastside:4146', kind: 'journey', swing: 30 },
    { placeId: 'irongate.eastside', cycleKey: 'irongate.eastside:4146', kind: 'issue', swing: 3000 },
    { placeId: 'irongate.eastside', cycleKey: 'irongate.eastside:4146', kind: 'drift', swing: -370 },
    // Home cities are not the capital's opinion.
    { placeId: 'coalport', cycleKey: 'coalport:4146', kind: 'action', swing: 9999 },
  ],
  contributions: [
    { placeId: 'irongate.eastside', ref: 'irongate.eastside:4146', kind: 'influence' },
    { placeId: 'irongate.eastside', ref: 'irongate.eastside:4146', kind: 'influence' },
    { placeId: 'irongate.eastside', ref: 'irongate:20731:issue.tram-fares', kind: 'points' },
  ],
  heroes: [
    { placeId: 'irongate.eastside', ref: 'irongate.eastside:4146', bracket: 1 },
    { placeId: 'irongate.eastside', ref: 'irongate.eastside:4146', bracket: 3 },
  ],
  actions: [
    { cityId: 'irongate', districtId: 'irongate.eastside', txAttempts: 1, createdAt: at(30) },
    { cityId: 'irongate', districtId: 'irongate.eastside', txAttempts: 2, createdAt: at(31) },
    { cityId: 'coalport', districtId: null, txAttempts: 2, createdAt: at(-DAY) },
    { cityId: 'coalport', districtId: null, txAttempts: 1, createdAt: at(40) },
    { cityId: 'coalport', districtId: null, txAttempts: 1, createdAt: at(41) },
  ],
  slice4From: at(0),
  ...over,
});

describe('the battleground report (tech design §15.2)', () => {
  const r = buildBattlegroundReport(input());

  it('travel: journeys, legs, the cards, dwell and the first trip after Level 10 (boosted testers apart)', () => {
    expect(r.travel.journeys).toBe(4);
    expect(r.travel.travellers).toBe(2);
    // a: one day, two journeys; b: two days, one each.
    expect(r.travel.journeysPerTravellerDay).toBe(1.33);
    expect(r.travel.legs).toEqual([
      { leg: 'coalport → irongate', journeys: 3 },
      { leg: 'irongate → coalport', journeys: 1 },
    ]);
    expect(r.travel.cards).toEqual({ drawn: 3, answeredOnTheWay: 1, answeredOnArrival: 1, sleptThrough: 1 });
    expect(r.travel.dwell).toEqual({ waited: 2, later: 1, waitedShare: 0.67 });
    expect(r.travel.answeredBeforeArrival).toBe(0.5);
    expect(r.travel.firstTripDaysAfterLevel10.values).toEqual([1, 1]);
  });

  it('residence: first moves, back home, rooms and residents per district', () => {
    expect(r.residence.movers).toBe(2);
    expect(r.residence.firstMoveDay.median).toBe(6);
    expect(r.residence.firstMoveDay.afterLevel10).toBe(2);
    expect(r.residence.firstMoveDay.afterRank2).toBe(3);
    expect(r.residence.movesBackHome).toBe(1);
    expect(r.residence.rooms).toBe(1);
    expect(r.residence.residents).toEqual([
      { districtId: 'irongate.eastside', name: 'Eastside', residents: 1 },
      { districtId: 'irongate.station-market', name: 'Station & Market', residents: 0 },
    ]);
  });

  it('the counts and the councils: ballots, w, turnout, the seats, ties drawn, a coalition', () => {
    expect(r.counts[0]).toEqual({
      district: 'Eastside',
      cycle: 4146,
      ballots: 3,
      w: 15,
      turnout: '3 of 5',
      seats: 'collective (local), vanguard (player)',
      tie: false,
    });
    expect(r.counts[1]!.tie).toBe(true);
    expect(r.councils).toEqual([
      { councilKey: 'irongate:4147', passed: 'ord.tram-subsidy', coalition: 'collective + vanguard' },
      { councilKey: 'irongate:4148', passed: null, coalition: '—' },
    ]);
  });

  it('states and Issues: close-race days, comebacks, control changes; points, owner or lapse', () => {
    expect(r.states).toEqual([{ district: 'Eastside', closeRaceDays: 2, groundswellStarts: 1, controlChanges: 2 }]);
    expect(r.issues.map((x) => [x.city, x.outcome, x.topFive, x.effect])).toEqual([
      ['coalport', 'lapsed', 0, false],
      ['irongate', 'owned by collective', 3, true],
    ]);
  });

  it('the ledger: contributors, heroes by bracket, the capital moved by source; contention', () => {
    expect(r.ledger.contributors).toEqual([{ district: 'Eastside', cycle: 'irongate.eastside:4146', contributors: 2 }]);
    expect(r.ledger.heroes).toEqual([
      { district: 'Eastside', cycle: 'irongate.eastside:4146', bracket1: 1, bracket2: 0, bracket3: 1 },
    ]);
    expect(r.ledger.movedBy).toEqual({ actions: 0.15, cards: 0.01, issues: 0.75, drift: 0.09 });
    expect(r.contention.capital).toEqual([
      { district: 'Eastside', actions: 2, contended: 0.5 },
      { district: 'Station & Market', actions: 0, contended: 0 },
    ]);
    expect(r.contention.home).toEqual({ before: 1, after: 0 });
  });

  it('an empty database gives an empty report, not an error', () => {
    const e = buildBattlegroundReport({
      ...input(),
      characters: [],
      journeys: [],
      moves: [],
      rooms: [],
      elections: [],
      councils: [],
      districtLogs: [],
      issues: [],
      ledger: [],
      contributions: [],
      heroes: [],
      actions: [],
      slice4From: null,
    });
    expect(e.travel.journeys).toBe(0);
    expect(e.travel.dwell.waitedShare).toBeNull();
    expect(e.residence.firstMoveDay.median).toBeNull();
    expect(e.ledger.movedBy).toEqual({ actions: 0, cards: 0, issues: 0, drift: 0 });
    expect(e.contention.home).toEqual({ before: null, after: null });
  });
});
