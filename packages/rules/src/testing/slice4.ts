import type {
  ActionResult,
  ActionView,
  CapitalCountView,
  CharacterView,
  CityView,
  CouncilRowView,
  DistrictView,
  IssueRowView,
  JourneyCardResult,
  JourneyView,
  LocationView,
  NationView,
  PaperView,
  PoliticalResult,
  PoliticsSummaryView,
  LodgingsView,
  ResidenceCardView,
} from '../types';
import {
  actionResultFixture,
  assetFixture,
  characterViewFixture,
  checkFixture,
  mapFixture,
  nightFixture,
  paperViewFixture,
  politicalResultFixture,
  politicsSummaryFixture,
} from './fixtures';

/**
 * Slice 4 fixtures (docs/tech/slice-4.md §15 UI): the nation map, a journey (on the way with its
 * card, chosen, arrived), the capital's city view with its five districts, a capital action's result,
 * the Issues, the capital count and council, and the residence card in every state. The shapes are the
 * server's; the numbers are the design's worked examples where it has them.
 */

const T0 = Date.UTC(2026, 9, 6, 14, 10, 0); // Tue 6 Oct 2026 14:10 UTC
const MS = 86_400_000;
const DAY = Math.floor(T0 / MS); // 20732
const MONDAY = DAY + 6; // Mon 12 Oct

const nationMap = (id: string) => ({ ...mapFixture(id), width: 9216, height: 9216 });

/** A Level 10 Collective recruit standing in Coalport, home there. */
export const travellerFixture: CharacterView = {
  ...characterViewFixture,
  level: 10,
  xp: 4_600,
  iron: 420,
  fxp: 520,
  rank: { ...characterViewFixture.rank, value: 2, title: 'Activist', fxpFloor: 400, fxpNext: 1200, nextTitle: 'Organiser' },
  welcomeDay: false,
  journey: null,
  residence: {
    cityId: 'coalport',
    cityName: 'Coalport',
    districtId: null,
    districtName: null,
    sinceDay: 0,
    votesFromDay: 0,
    standsFromDay: 0,
    canMoveFromDay: 0,
  },
  trainOpen: true,
  hero: null,
  heroes: [],
  scoreboard: [],
};

const fare = { base: 20, lines: [], total: 20 };

export const nationViewFixture: NationView = {
  map: { day: nationMap('map.nation.day'), night: nationMap('map.nation.night') },
  tiles: true,
  frame: { x0: 0.06, y0: 0.11, x1: 0.94, y1: 0.91 },
  clouds: true,
  isNight: false,
  night: nightFixture,
  here: { cityId: 'coalport' },
  trainOpen: true,
  cities: [
    {
      cityId: 'irongate',
      name: 'Irongate',
      x: 0.52,
      y: 0.53,
      n: 1,
      line: 'Capital · 5 districts · two close races today',
      state: 'open',
      lockWord: null,
      minutes: 12,
      fare,
      whoHolds: { vanguard: 21, collective: 21.2, alliance: 21, neutral: 36.8 },
      issues: [
        { issueId: 'issue.tram-fares', name: 'Tram Fare Hike' },
        { issueId: 'issue.evictions', name: 'Eviction Notices' },
      ],
      election: { line: 'votesIn', days: 3 },
      canBoard: { ok: true },
      seeDistricts: false,
    },
    {
      cityId: 'coalport',
      name: 'Coalport',
      x: 0.18,
      y: 0.8,
      n: 2,
      line: 'Home city of the Collective',
      state: 'here',
      lockWord: null,
      minutes: null,
      fare: null,
      whoHolds: { vanguard: 9, collective: 70.05, alliance: 6, neutral: 14.95 },
      issues: [{ issueId: 'issue.mill-hours', name: 'Mill Hours' }],
      election: { line: 'votingOpen', until: (DAY + 2) * MS },
      canBoard: { ok: false, reason: 'ALREADY_THERE' },
      seeDistricts: false,
    },
    {
      cityId: 'ashford',
      name: 'Ashford',
      x: 0.12,
      y: 0.17,
      n: 3,
      line: 'Home city of the Alliance',
      state: 'rival',
      lockWord: 'rival ground',
      minutes: 24,
      fare: null,
      whoHolds: { vanguard: 8, collective: 7, alliance: 68, neutral: 17 },
      issues: [],
      election: { line: 'votesIn', days: 2 },
      canBoard: { ok: false, reason: 'DESTINATION_LOCKED' },
      seeDistricts: false,
    },
    {
      cityId: 'duskwall',
      name: 'Duskwall',
      x: 0.88,
      y: 0.25,
      n: 4,
      line: 'Home city of the Vanguard',
      state: 'rival',
      lockWord: 'rival ground',
      minutes: 27,
      fare: null,
      whoHolds: { vanguard: 66, collective: 8, alliance: 9, neutral: 17 },
      issues: [],
      election: null,
      canBoard: { ok: false, reason: 'DESTINATION_LOCKED' },
      seeDistricts: false,
    },
    {
      cityId: 'clearwater',
      name: 'Clearwater',
      x: 0.88,
      y: 0.85,
      n: 5,
      line: 'Contested · no service yet',
      state: 'later',
      lockWord: 'no service yet',
      minutes: null,
      fare: null,
      whoHolds: { vanguard: 20, collective: 24, alliance: 24, neutral: 32 },
      issues: [],
      election: null,
      canBoard: { ok: false, reason: 'DESTINATION_LOCKED' },
      seeDistricts: false,
    },
  ],
};

const irongateDay = mapFixture('map.irongate.day');
const irongateNight = mapFixture('map.irongate.night', '9c8d7e6f');

export const journeyViewFixture: JourneyView = {
  id: '66f9a00000000000000000a1',
  from: { cityId: 'coalport', name: 'Coalport' },
  to: { cityId: 'irongate', name: 'Irongate' },
  boardedAt: T0,
  arrivesAt: T0 + 12 * 60_000,
  serverNow: T0 + 4 * 60_000,
  status: 'onTheWay',
  firstJourney: true,
  others: 2,
  night: nightFixture,
  // Review 4 (tech design §6.4): Coalport's leg into the capital, the nation's pins, the card's moment.
  route: {
    legs: [
      {
        points: [
          [0.18, 0.8],
          [0.228, 0.738],
          [0.272, 0.692],
          [0.241, 0.659],
          [0.236, 0.606],
          [0.268, 0.564],
          [0.336, 0.535],
          [0.355, 0.565],
          [0.44, 0.6],
          [0.52, 0.53],
        ],
        fromT: 0,
        toT: 1,
      },
    ],
    cities: [
      { cityId: 'irongate', name: 'Irongate', x: 0.52, y: 0.53 },
      { cityId: 'ashford', name: 'Ashford', x: 0.12, y: 0.17 },
      { cityId: 'duskwall', name: 'Duskwall', x: 0.88, y: 0.25 },
      { cityId: 'coalport', name: 'Coalport', x: 0.18, y: 0.8 },
      { cityId: 'clearwater', name: 'Clearwater', x: 0.88, y: 0.85 },
    ],
  },
  map: { day: nationMap('map.nation.day'), night: nationMap('map.nation.night') },
  cardAt: T0 + 3 * 60_000,
  card: {
    eventId: 'jev.passenger',
    title: 'A talkative passenger',
    setup:
      'A man in a good coat leans across the aisle and wants to know what you think of the capital. One choice.',
    ignore: 'You look out of the window until he gives up.',
    choices: [
      {
        id: 'talk',
        title: 'Talk politics with him',
        detail: 'opinion +0.03 in Station & Market · +6 Party XP',
        stat: { stats: ['cha'] },
        chance: 72,
        cost: null,
        affordable: true,
      },
      {
        id: 'listen',
        title: 'Let him talk, and listen',
        detail: '+14 XP',
        stat: null,
        chance: null,
        cost: null,
        affordable: true,
      },
      // Review 5 #7: the put-aside row, the server's last choice.
      {
        id: 'set-aside',
        title: 'Sleep through it',
        detail: 'Nothing happens.',
        stat: null,
        chance: null,
        cost: null,
        affordable: true,
        setAside: true,
      },
    ],
    chosen: null,
  },
  arrival: null,
  whileYouRide: { paperUnread: 1, election: politicsSummaryFixture },
};

export const journeyCardResultFixture: JourneyCardResult = {
  kind: 'journeyCard',
  journeyId: journeyViewFixture.id,
  eventId: 'jev.passenger',
  choiceId: 'talk',
  stamp: 'partial',
  headline: 'He hears you out, mostly',
  body: 'He nods at the right places and gets off at the junction. Some of it will have stuck.',
  reason: 'Your Charisma is low for this. Raise it at Central Station.',
  rewards: [
    { id: 'fxp', amount: 3 },
    { id: 'opinion', amount: 0.015, note: 'Station & Market' },
  ],
  opinion: { placeName: 'Station & Market', factionId: 'collective', before: 20, after: 20.015 },
  points: null,
  quoted: false,
  performedAt: new Date(T0 + 5 * 60_000).toISOString(),
  idempotencyKey: '3b241101-e2bb-4255-8caf-4136c566a9a1',
  character: travellerFixture,
  journey: journeyViewFixture,
};

/** The same journey, the card answered on the way. */
export const journeyChosenFixture: JourneyView = {
  ...journeyViewFixture,
  card: { ...journeyViewFixture.card!, chosen: journeyCardResultFixture },
};

/** The same journey, arrived (the card left unanswered: it shows inside the arrival modal). */
export const journeyArrivedFixture: JourneyView = {
  ...journeyViewFixture,
  status: 'arrived',
  serverNow: T0 + 13 * 60_000,
  arrival: {
    stamp: 'Arrived',
    place: 'Irongate · Station & Market',
    headline: "You're in the capital",
    body: 'The train was on time. Nothing happened, which is rare.',
    cardLine: null,
    knockOns: { ticket: 20 },
    art: { rung: 'map-crop', asset: irongateDay, x: 0.35, y: 0.555 },
    landing: { cityId: 'irongate', quarterId: 'irongate.station-market', locationId: 'irongate.central-station' },
  },
};

/** Review 4 #9 (answers §9.3): the Lodgings card at Tram Junction, by what a tap buys. */
export const lodgingsFixtures: Record<'take' | 'renew' | 'notYet' | 'evictions', LodgingsView> = {
  take: {
    line: 'A bed on the tram line · 7 nights · 100 Iron',
    price: { base: 100, lines: [], total: 100 },
    running: null,
    tap: 'take',
    renewFromDay: null,
    cap: { now: 200, with: 250 },
  },
  renew: {
    line: 'A bed on the tram line · 7 nights · 100 Iron',
    price: { base: 100, lines: [], total: 100 },
    running: { untilDay: DAY + 5 },
    tap: 'renew',
    renewFromDay: null,
    cap: { now: 250, with: 250 },
  },
  notYet: {
    line: 'A bed on the tram line · 7 nights · 100 Iron',
    price: { base: 100, lines: [], total: 100 },
    running: { untilDay: DAY + 12 },
    tap: 'notYet',
    renewFromDay: DAY + 5,
    cap: { now: 250, with: 250 },
  },
  evictions: {
    line: 'A bed on the tram line · 7 nights · 100 Iron',
    price: { base: 100, lines: [{ id: 'issue.evictions', label: 'Eviction Notices', pct: -50 }], total: 50 },
    running: null,
    tap: 'take',
    renewFromDay: null,
    cap: { now: 200, with: 250 },
  },
};

export const residenceCardFixtures: Record<ResidenceCardView['state'], ResidenceCardView> = {
  visitingMay: {
    state: 'visitingMay',
    livesIn: 'Coalport',
    cost: 500,
    button: { enabled: true },
    sheet: {
      lines: [
        { text: 'You vote and stand in Eastside from the next election that opens (Thursday).', warn: false },
        { text: 'You stop being a Coalport candidate; your Coalport seat, if any, passes to the branch.', warn: true },
        { text: 'Party orders come from the capital from tomorrow. The Herald is your paper.', warn: false },
        { text: 'Your job, reputation, Iron and rank are untouched.', warn: false },
        { text: 'Moving again: from Tuesday.', warn: false },
      ],
    },
  },
  belowRank: { state: 'belowRank', livesIn: 'Coalport', cost: 500, button: null, sheet: null },
  cooldown: {
    state: 'cooldown',
    livesIn: 'Eastside',
    canMoveFromDay: DAY + 2,
    cost: 500,
    button: null,
    sheet: null,
  },
  noIron: { state: 'noIron', livesIn: 'Coalport', cost: 500, button: { enabled: false }, sheet: null },
  resident: {
    state: 'resident',
    livesIn: 'Eastside',
    registeredDay: DAY - 1,
    votesFromDay: DAY + 2,
    canMoveFromDay: DAY + 6,
    cost: 500,
    button: null,
    sheet: null,
  },
  homeElsewhere: {
    state: 'homeElsewhere',
    livesIn: 'Eastside',
    cost: 500,
    button: { enabled: true },
    sheet: {
      lines: [
        { text: 'You vote and stand in Coalport from the next election that opens (Friday).', warn: false },
        { text: 'Party orders come from home from tomorrow. The home paper is yours again.', warn: false },
        { text: 'Your job, reputation, Iron and rank are untouched.', warn: false },
        { text: 'Moving again: from Tuesday.', warn: false },
      ],
    },
  },
  atHome: { state: 'atHome', livesIn: 'Coalport', cost: 500, button: null, sheet: null },
  // Slice-4 fixes §1 (QA M2): a candidate on the Coalport ballot; the count day is the move day.
  onBallot: {
    state: 'onBallot',
    livesIn: 'Coalport',
    canMoveFromDay: DAY + 3,
    cost: 500,
    button: null,
    sheet: null,
  },
  // Slice 5 (screens §8.3): a visitor on rival ground can neither live nor stand there.
  rivalGround: { state: 'rivalGround', livesIn: 'Coalport', cost: 500, button: null, sheet: null },
};

const district = (
  id: string,
  n: number,
  name: string,
  opinion: DistrictView['opinion'],
  state: Partial<DistrictView['state']>,
  extra: Partial<DistrictView> = {},
): DistrictView => ({
  id,
  n,
  name,
  blurb: `The ${name} of the fixture capital.`,
  frame: { x0: 0.29, y0: 0.49, x1: 0.62, y1: 0.74 },
  anchor: { x: 0.4, y: 0.6 },
  outline: [
    [0.29, 0.5],
    [0.6, 0.53],
    [0.6, 0.74],
    [0.29, 0.74],
    [0.28, 0.6],
    [0.285, 0.55],
  ],
  opinion,
  state: { battleground: false, controlledBy: null, groundswell: null, word: 'leans', leans: null, ...state },
  issues: [],
  seats: [],
  scoreboard: { mine: null, table: [] },
  residence: residenceCardFixtures.visitingMay,
  you: { resident: false },
  ...extra,
});

export const stationMarketFixture: DistrictView = district(
  'irongate.station-market',
  3,
  'Station & Market',
  { vanguard: 20, collective: 20, alliance: 20, neutral: 40 },
  { battleground: true, word: 'closeRace', leans: null },
  {
    anchor: { x: 0.4, y: 0.6 },
    issues: [
      {
        issueId: 'issue.tram-fares',
        name: 'Tram Fare Hike',
        leader: 'collective',
        momentum: { vanguard: 85, collective: 120, alliance: 40 },
      },
    ],
    seats: [
      { name: 'J. Varga', factionId: 'collective', local: true },
      { name: 'K. Steinhauser', factionId: 'vanguard', local: true },
    ],
    scoreboard: {
      mine: { swing: 0.3, rank: 1, of: 3 },
      table: [
        {
          bracket: 1,
          rows: [
            {
              characterId: characterViewFixture.id,
              name: 'Mara Lenk',
              factionId: 'collective',
              level: 10,
              swing: 0.3,
              you: true,
              hero: false,
            },
            {
              characterId: '66f9a00000000000000000b2',
              name: 'Otto Brand',
              factionId: 'vanguard',
              level: 12,
              swing: 0.12,
              you: false,
              hero: false,
            },
          ],
        },
      ],
    },
  },
);

export const districtFixtures: DistrictView[] = [
  district(
    'irongate.government-quarter',
    1,
    'Government Quarter',
    { vanguard: 20, collective: 20, alliance: 20, neutral: 40 },
    { battleground: true, word: 'closeRace' },
    { frame: { x0: 0.4, y0: 0.18, x1: 0.72, y1: 0.43 }, anchor: { x: 0.53, y: 0.3 } },
  ),
  district(
    'irongate.old-town',
    2,
    'Old Town',
    { vanguard: 15, collective: 15, alliance: 35, neutral: 35 },
    { word: 'leans', leans: 'alliance' },
    { frame: { x0: 0.06, y0: 0.07, x1: 0.43, y1: 0.38 }, anchor: { x: 0.24, y: 0.25 } },
  ),
  stationMarketFixture,
  district(
    'irongate.eastside',
    4,
    'Eastside',
    { vanguard: 15, collective: 52, alliance: 15, neutral: 18 },
    { word: 'held', controlledBy: 'collective', leans: 'collective' },
    {
      frame: { x0: 0.5, y0: 0.44, x1: 0.98, y1: 0.78 },
      anchor: { x: 0.76, y: 0.62 },
      residence: residenceCardFixtures.resident,
      you: { resident: true },
    },
  ),
  district(
    'irongate.garrison-hill',
    5,
    'Garrison Hill',
    { vanguard: 35, collective: 15, alliance: 15, neutral: 35 },
    { word: 'leans', leans: 'vanguard', groundswell: { factionId: 'vanguard', pct: 15 } },
    { frame: { x0: 0.72, y0: 0.01, x1: 0.97, y1: 0.33 }, anchor: { x: 0.85, y: 0.16 } },
  ),
];

const capitalAction = (over: Partial<ActionView>): ActionView => ({
  id: 'irongate.central-station.talk',
  name: 'Talk to people in the arrivals hall',
  type: 'canvass',
  kind: 'checked',
  givesFxp: true,
  energy: 10,
  energy3: 30,
  preview: {
    ...checkFixture,
    difficulty: 10,
    bonuses: [{ id: 'battleground', label: 'Close race', value: 5 }],
    bonusTotal: 5,
    raw: 67,
    chance: 67,
  },
  order: null,
  locked: null,
  tags: [],
  placeTags: [
    { kind: 'issue', issueId: 'issue.tram-fares', name: 'Tram Fare Hike', pct: 50 },
    { kind: 'closeRace', fxpPct: 25 },
  ],
  ...over,
});

const capitalLocation = (over: Partial<LocationView>): LocationView => ({
  id: 'irongate.central-station',
  name: 'Central Station',
  kind: 'station',
  blurb: 'The glass roof, the arrivals hall and the departures board.',
  n: 15,
  map: { x: 0.35, y: 0.555 },
  actions: [capitalAction({})],
  jobs: [],
  council: null,
  art: { rung: 'map-crop', asset: irongateDay, x: 0.35, y: 0.555 },
  quarterId: 'irongate.station-market',
  issueIds: ['issue.tram-fares'],
  trains: {
    destinations: [{ cityId: 'coalport', name: 'Coalport', minutes: 12, fare, canBoard: true }],
  },
  ...over,
});

export const capitalCityViewFixture: CityView = {
  id: 'irongate',
  name: 'Irongate',
  role: 'battleground',
  opinion: { vanguard: 21, collective: 24.4, alliance: 21, neutral: 33.6 },
  cityOpinion: { vanguard: 21, collective: 24.4, alliance: 21, neutral: 33.6 },
  map: { day: irongateDay, night: irongateNight },
  quarters: districtFixtures.map((d) => ({ id: d.id, name: d.name, frame: d.frame })),
  clouds: true,
  isNight: false,
  night: nightFixture,
  standing: { ...characterViewFixture.standing, cityId: 'irongate', cityName: 'Irongate' },
  locations: [
    capitalLocation({}),
    capitalLocation({
      id: 'irongate.market-square',
      name: 'Market Square',
      kind: 'market',
      blurb: 'Stalls under the column, the tram queue at the corner.',
      n: 13,
      map: { x: 0.42, y: 0.62 },
      art: { rung: 'scene', asset: assetFixture('scene.market', 2688, 1520, [640, 1280]) },
      trains: null,
      issueIds: [],
      actions: [capitalAction({ id: 'irongate.market-square.talk', name: 'Talk to people in the tram queue', placeTags: [{ kind: 'closeRace', fxpPct: 25 }] })],
    }),
    capitalLocation({
      id: 'irongate.concord-house',
      name: 'Concord House',
      kind: 'faction-hq',
      blurb: "The Alliance's capital office.",
      n: 7,
      map: { x: 0.2, y: 0.3 },
      quarterId: 'irongate.old-town',
      factionId: 'alliance',
      trains: null,
      issueIds: [],
      actions: [
        capitalAction({
          id: 'irongate.concord-house.meeting',
          name: 'Go to the capital meeting',
          type: 'meeting',
          locked: { reason: 'MEMBERS_ONLY', need: 0, factionId: 'alliance' },
          placeTags: [{ kind: 'membersOnly', factionId: 'alliance' }],
        }),
      ],
    }),
  ],
  morale: null,
  ordinance: null,
  election: null,
  districts: districtFixtures,
  scoreboard: null,
  issues: [],
  effects: [],
  residence: null,
};

export const issueRowFixtures: IssueRowView[] = [
  {
    issueId: 'issue.mill-hours',
    name: 'Mill Hours',
    cityId: 'coalport',
    districtId: null,
    placeName: 'Coalport',
    leader: null,
    momentum: { vanguard: 0, collective: 0, alliance: 0 },
    effectLine: 'Shifts at the mill end an hour early',
  },
  {
    issueId: 'issue.tram-fares',
    name: 'Tram Fare Hike',
    cityId: 'irongate',
    districtId: 'irongate.station-market',
    placeName: 'Station & Market',
    leader: 'collective',
    momentum: { vanguard: 85, collective: 120, alliance: 40 },
    effectLine: 'Tickets from Irongate: half price',
  },
  {
    issueId: 'issue.evictions',
    name: 'Eviction Notices',
    cityId: 'irongate',
    districtId: 'irongate.eastside',
    placeName: 'Eastside',
    leader: 'vanguard',
    momentum: { vanguard: 30, collective: 10, alliance: 0 },
    effectLine: 'Rooms in Irongate: half price',
  },
];

export const capitalPaperFixture: PaperView = {
  ...paperViewFixture,
  headlines: [
    ...paperViewFixture.headlines,
    { group: 'personal', headline: 'Mara Lenk Is District Hero in Eastside', inPrint: true, medal: true },
  ],
  issues: {
    newThisWeek: true,
    settlesAt: MONDAY * MS,
    rows: issueRowFixtures.slice(0, 3),
    more: [
      {
        issueId: 'issue.ashford-library',
        name: 'Library Hours',
        cityId: 'ashford',
        districtId: null,
        placeName: 'Ashford',
        leader: 'alliance',
        momentum: { vanguard: 0, collective: 0, alliance: 12 },
        effectLine: 'The reading rooms stay open late',
      },
    ],
  },
};

/** A canvass in the arrivals hall: Station & Market a close race, *Tram Fare Hike* live (tech §10.1). */
export const capitalActionResultFixture: ActionResult = {
  ...actionResultFixture,
  logId: '66f9a00000000000000000c1',
  place: {
    cityId: 'irongate',
    cityName: 'Irongate',
    locationId: 'irongate.central-station',
    locationName: 'Central Station',
    kind: 'station',
  },
  action: { id: 'irongate.central-station.talk', name: 'Talk to people in the arrivals hall', type: 'canvass', tier: 1, times: 1 },
  art: { rung: 'map-crop', asset: irongateDay, x: 0.35, y: 0.555 },
  rewards: {
    xp: { base: 45, bonus: 0, total: 45 },
    fxp: { base: 6, bonus: 2, total: 8, parts: [{ id: 'battleground', label: 'Close race', amount: 2 }] },
    iron: { base: 20, bonus: 0, total: 20 },
    opinion: 0.094,
    opinionFactors: [
      { id: 'battleground', label: 'Close race', pct: 25 },
      { id: 'issue.tram-fares', label: 'Issue: Tram Fare Hike', pct: 50 },
    ],
  },
  bonusTags: [
    { id: 'battleground', label: 'Close race', note: '+25 % Party XP · better odds' },
    { id: 'issue.tram-fares', label: 'Issue: Tram Fare Hike', note: 'opinion +50 %' },
  ],
  effects: {
    ...actionResultFixture.effects,
    opinion: {
      cityId: 'irongate',
      placeId: 'irongate.station-market',
      placeName: 'Station & Market',
      factionId: 'collective',
      delta: 0.094,
      applied: 0.094,
      shareBefore: 20,
      shareAfter: 20.094,
    },
    standing: null,
    issues: [
      {
        issueId: 'issue.tram-fares',
        name: 'Tram Fare Hike',
        factionId: 'collective',
        added: 10,
        totals: { vanguard: 85, collective: 130, alliance: 40 },
        leader: 'collective',
      },
    ],
    scoreboard: { placeName: 'Station & Market', swing: 0.394, rank: 1, of: 3 },
  },
  character: travellerFixture,
};

/** The Election card in the capital (screens §7.2): voting open in Eastside. */
export const capitalSummaryFixture: PoliticsSummaryView = {
  ...politicsSummaryFixture,
  cityId: 'irongate',
  cityName: 'Irongate',
  paperShortName: 'Herald',
  inForce: null,
  placeId: 'irongate.eastside',
  placeName: 'Eastside',
  seats: 2,
};

/** The morning after the capital's count: Rally Permits won, the Vanguard's, 4 seats of 10. */
export const capitalResultSummaryFixture: PoliticsSummaryView = {
  ...capitalSummaryFixture,
  cycleDay: 0,
  phase: 'nominations',
  state: 'result',
  route: '/council/count',
  ballot: null,
  card: {
    ...capitalSummaryFixture.card,
    state: 'result',
    result: {
      winner: 'Rally Permits',
      votes: 2,
      voters: 3,
      how: 'seats',
      runsUntil: (DAY + 5) * MS,
      nextVoteAt: (DAY + 2) * MS,
      by: 'Viktor Hahn',
      whose: 'party',
      capital: { factionIds: ['vanguard'], seats: 4, districtSeats: ['collective', 'vanguard'] },
    },
  },
};

const capitalRow = (
  place: number,
  name: string,
  factionId: 'vanguard' | 'collective' | 'alliance',
  wardVote: number,
  seated: boolean,
  extra: Partial<CouncilRowView> = {},
): CouncilRowView => ({
  key: extra.kind === 'player' ? 'p:66f9a0000000000000000001' : `n:npc.${name.toLowerCase().replace(/\W+/g, '-')}`,
  kind: 'npc',
  name,
  avatar: null,
  rankTitle: null,
  standingName: 'Trusted',
  factionId,
  place,
  seated,
  wardVote,
  backers: 0,
  total: wardVote,
  short: null,
  you: false,
  rule: null,
  ...extra,
});

const districtCount = (
  districtId: string,
  name: string,
  council: CouncilRowView[],
  votes: Record<'vanguard' | 'collective' | 'alliance', number>,
): CapitalCountView['districts'][number] => ({
  districtId,
  name,
  parties: (['vanguard', 'collective', 'alliance'] as const).map((f) => ({
    factionId: f,
    votes: votes[f],
    shared: false,
    seats: council.filter((r) => r.seated && r.factionId === f).length,
  })),
  council,
  seats: council.filter((r) => r.seated).map((r) => ({ factionId: r.factionId!, name: r.name })),
  turnout: { voters: votes.vanguard + votes.collective + votes.alliance, eligible: 5 },
  scoreboard: stationMarketFixture.scoreboard.table,
});

export const capitalCountFixture: CapitalCountView = {
  kind: 'capital',
  councilKey: 'irongate:4147',
  cycle: 4146,
  countDay: DAY + 3,
  weekday: 'Sunday',
  rule: {
    key: 'irongate:4146',
    countDay: DAY + 3,
    weekday: 'Sunday',
    cards: [
      {
        ordinanceId: 'ord.rally-permits',
        name: 'Rally Permits',
        plainLine: 'Rallies pay more.',
        effectLine: 'Rally +15 %',
        whose: { kind: 'party', factionIds: ['vanguard'], by: 'Viktor Hahn' },
        yourVote: false,
        votes: 2,
        seats: 4,
        share: 0.5,
        won: true,
      },
      {
        ordinanceId: 'ord.long-service',
        name: 'Long Service Order',
        plainLine: 'Seniority builds two days a day.',
        effectLine: 'Seniority ×2',
        whose: { kind: 'party', factionIds: ['collective'], by: 'Petra Holm' },
        yourVote: true,
        votes: 1,
        seats: 3,
        share: 0.25,
        won: false,
      },
      {
        ordinanceId: 'ord.reading-room',
        name: 'Reading Room Grant',
        plainLine: 'Studying costs a fifth less.',
        effectLine: 'Training −20 % Energy',
        whose: { kind: 'party', factionIds: ['alliance'], by: 'Clara Weber' },
        yourVote: false,
        votes: 1,
        seats: 3,
        share: 0.25,
        won: false,
      },
    ],
    how: 'seats',
    turnout: { voters: 4, eligible: 10 },
    runsUntil: (DAY + 8) * MS,
  },
  seatsByFaction: { vanguard: 4, collective: 3, alliance: 3 },
  npcSeats: 9,
  districts: [
    districtCount(
      'irongate.eastside',
      'Eastside',
      [
        capitalRow(1, 'Jana Varga', 'collective', 28, true),
        capitalRow(1, 'Karl Steinhauser', 'vanguard', 28, true),
        capitalRow(2, 'Pavel Hruby', 'collective', 20, false, { short: 8 }),
        capitalRow(3, 'Mara Lenk', 'collective', 12, false, {
          you: true,
          kind: 'player',
          short: 16,
          rule: { ordinanceId: 'ord.street-fund', name: 'Street Fund' },
        }),
        capitalRow(2, 'Otto Brand', 'vanguard', 20, false, { short: 8 }),
        capitalRow(1, 'Ilse Marek', 'alliance', 28, false, { short: 0 }),
        capitalRow(2, 'Anton Fiala', 'alliance', 20, false, { short: 8 }),
      ],
      { vanguard: 2, collective: 1, alliance: 0 },
    ),
    districtCount(
      'irongate.government-quarter',
      'Government Quarter',
      [
        capitalRow(1, 'Hedda Lorenz', 'alliance', 28, true),
        capitalRow(1, 'Felix Brenner', 'vanguard', 28, true),
        capitalRow(1, 'Rosa Kral', 'collective', 28, false, { short: 0 }),
      ],
      { vanguard: 0, collective: 0, alliance: 1 },
    ),
  ],
};

/** Registered in Eastside (screens §6.3). */
export const registerResultFixture: PoliticalResult = {
  ...politicalResultFixture,
  act: 'register',
  stamp: { label: 'Registered', tone: 'success' },
  paper: { name: 'The Irongate Herald', shortName: 'Herald' },
  place: { cityId: 'irongate', cityName: 'Irongate' },
  headline: 'Eastside has a new voter',
  body: 'The Herald is your paper from tomorrow. Eastside votes from Thursday. Union House expects you at six.',
  next: 'Next: vote in Eastside from Thursday.',
  knockOns: {
    pc: null,
    morale: null,
    backers: null,
    iron: { before: 4410, after: 3910 },
    seatGivenUp: { cityName: 'Coalport' },
  },
  view: {
    kind: 'residence',
    residence: residenceCardFixtures.resident,
    election: { ...capitalSummaryFixture, card: { ...capitalSummaryFixture.card, state: 'registered' } },
  },
};
