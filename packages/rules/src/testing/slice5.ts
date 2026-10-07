import type {
  ActionResult,
  ActionView,
  CharacterView,
  HeldView,
  MissionView,
  PoliticalResult,
  LockedPinView,
  QuarterView,
  RunInPending,
} from '../types';
import { actionResultFixture, assetFixture, characterViewFixture, checkFixture } from './fixtures';

/**
 * Slice 5 fixtures (docs/tech/slice-5.md §15 UI): a mission (first time, remembered, locked by each
 * reason, a loud way), a run-in (with and without Pay, short of Iron), a mission result with its
 * run-in, the cells and the infirmary (home and rival, *again*), the release modals and the home
 * quarters with a locked teaser. The shapes are the server's (read from a dev run); the numbers are
 * the design's worked examples where it has them.
 */

const T0 = Date.UTC(2026, 9, 6, 14, 10, 0); // Tue 6 Oct 2026 14:10 UTC
const MIN = 60_000;

const scene = (id: string) => assetFixture(id, 2688, 1520, [640, 1280]);
const portrait = (id: string) => assetFixture(id, 760, 950, [256, 512]);

/** A Level 6 Collective organiser with a little Heat and one mark. */
export const riskCharacterFixture: CharacterView = {
  ...characterViewFixture,
  level: 6,
  pc: 40,
  heat: {
    value: 32,
    state: 'noticed',
    at: T0,
    stepMs: 720_000,
    coolsAt: T0 + 96 * MIN,
    zeroAt: T0 + 384 * MIN,
  },
  health: { value: 96, max: 125, full: false, at: T0, fullAt: T0 + 30 * MIN },
  record: {
    level: 'onFile',
    marks: 2,
    fadesOn: Math.floor(T0 / 86_400_000) + 14,
    fading: 2,
    bailDoubled: false,
    ironPct: -10,
    strike: { cost: 30, affordable: true },
  },
  held: null,
  runIn: null,
  agiQuarters: 1,
  here: { rivalGround: false, flags: [] },
  barred: [],
};

const way = (
  id: string,
  title: string,
  hint: string,
  chance: number,
  stats: ['int'] | ['str'] | ['agi'],
) => ({
  id,
  title,
  hint,
  preview: { ...checkFixture, stats, statValues: [12], chance, raw: chance },
  agility: stats[0] === 'agi',
  risk: null,
});

/** *Speak at the launch* at the Shipyard, the first time (three ways, no record). */
export const missionFixture: MissionView = {
  id: 'coalport.shipyard.launch',
  name: 'Speak at the launch',
  type: 'speech',
  label: 'speech',
  targetFactionId: null,
  energy: 15,
  briefing:
    'The yard launches a collier at noon and two thousand people will stand on the slipway bank to watch it go.',
  ways: [
    way(
      'str',
      'From the gantry, among the riveters',
      'Climb it, hold the rail, and shout over the band.',
      44,
      ['str'],
    ),
    way('agi', 'Along the staging', 'Quick feet, and a word to each gang as you pass.', 62, ['agi']),
    way(
      'int',
      'The drawing office first, then the bank',
      'Find out what the yard wants before you tell it what you want.',
      72,
      ['int'],
    ),
  ],
  remembered: null,
  suggested: 'int',
  risk: { heat: 0, runInChance: 5, marks: 0 },
  tags: [],
  placeTags: [],
  order: null,
  locked: null,
  art: { rung: 'scene', asset: scene('scene.mission-speech') },
};

/** *Tear down the Vanguard's posters on the fish quay*, remembered, with a loud way and the record's tag. */
export const illegalMissionFixture: MissionView = {
  ...missionFixture,
  id: 'coalport.far-bank.posters',
  name: "Tear down the Vanguard's posters on the fish quay",
  type: 'vandalism',
  label: 'against',
  targetFactionId: 'vanguard',
  energy: 10,
  ways: [
    way('agi', 'Before the market, from the ferry', 'Two pillars at a time.', 55, ['agi']),
    {
      ...way('str', 'In daylight, with the quay watching', 'Rip them down and let them say so.', 48, ['str']),
      risk: { heat: 6, runInChance: 30 },
    },
  ],
  remembered: 'agi',
  suggested: 'agi',
  risk: { heat: 6, runInChance: 12, marks: 1 },
  placeTags: [{ kind: 'record', ironPct: -10, level: 'onFile' }],
  art: { rung: 'scene', asset: scene('scene.mission-posters') },
};

/** The run-in on the Far Bank: the enforcer, Pay at 60 Iron. */
export const runInFixture: RunInPending = {
  kind: 'runIn',
  encounterId: '6ac2a5643d2b4ff7628ee83c',
  decideBy: T0 + 5 * MIN,
  serverNow: T0,
  place: { cityId: 'coalport', locationId: 'coalport.far-bank', locationName: 'The Far Bank' },
  what: {
    kind: 'mission',
    id: 'coalport.far-bank.posters',
    name: "Tear down the Vanguard's posters on the fish quay",
  },
  opponent: {
    id: 'street-enforcer',
    label: 'A Vanguard street enforcer',
    appears: "A man in a good coat steps off the kerb and asks what party you're with. He knows.",
    portrait: portrait('portrait.street-enforcer'),
    bribable: true,
    payOff: 60,
  },
  you: { health: 125, healthMax: 125, heat: 14, heatState: 'cool' },
  rows: {
    fight: { chance: 55 },
    run: { chance: 30 },
    talk: { chance: 30 },
    pay: { chance: 90, price: 60, affordable: true },
  },
  luck: 'fight',
  character: riskCharacterFixture,
};

/** The mission's result after *Pay them off* (screens §4.3's example). */
export const missionResultFixture: ActionResult = {
  ...actionResultFixture,
  kind: 'mission',
  place: {
    cityId: 'coalport',
    cityName: 'Coalport',
    locationId: 'coalport.far-bank',
    locationName: 'The Far Bank',
    kind: 'market',
  },
  action: {
    id: 'coalport.far-bank.posters',
    name: "Tear down the Vanguard's posters on the fish quay",
    type: 'vandalism',
    tier: 2,
    times: 1,
  },
  stamp: 'success',
  headline: 'Bare pillars by eight',
  body: 'Every pillar under the roof is bare by the time the beadle makes his round.',
  art: { rung: 'scene', asset: scene('scene.mission-posters') },
  rewards: {
    xp: { base: 50, bonus: 0, total: 50 },
    fxp: { base: 8, bonus: 0, total: 8 },
    iron: { base: 40, bonus: -60, total: -20, parts: [{ id: 'paidOff', label: 'paid off', amount: -60 }] },
    opinion: 0.2,
  },
  bonusTags: [],
  effects: {
    ...actionResultFixture.effects,
    opinion: {
      cityId: 'coalport',
      placeName: 'Coalport',
      factionId: 'collective',
      delta: 0.2,
      applied: 0.2,
      shareBefore: 9,
      shareAfter: 8.8,
      mode: 'against',
      targetFactionId: 'vanguard',
      toActor: 0.1,
    },
  },
  again: { cost1: 10, cost3: null, way: { id: 'agi', title: 'Before the market, from the ferry' } },
  mission: {
    id: 'coalport.far-bank.posters',
    type: 'vandalism',
    label: 'against',
    targetFactionId: 'vanguard',
    way: { id: 'agi', title: 'Before the market, from the ferry', stats: ['agi'], agility: true },
    firstTime: true,
  },
  street: {
    runIn: {
      opponent: {
        id: 'street-enforcer',
        label: 'A Vanguard street enforcer',
        portrait: portrait('portrait.street-enforcer'),
        pronoun: 'he',
      },
      choice: 'pay',
      by: 'player',
      steps: [{ row: 'pay', ok: true }],
      outcome: 'paid',
      line: 'He takes the notes without counting and steps back onto the kerb. "Didn\'t see you."',
      cause: null,
      health: { before: 125, after: 125, max: 125, fullAt: null },
      ironPaid: 60,
      heatAdded: 0,
      xp: 0,
    },
    heat: { before: 0, gain: 6, after: 6, state: 'cool', stateBefore: 'cool', coolsAt: null, first: true },
    caught: { caught: false, withoutRoll: false },
    record: null,
    sentTo: null,
    agility: { quarters: 1, gained: false },
    remembered: true,
    dropped: null,
  },
  character: riskCharacterFixture,
};

/** A fight lost to the police: taken in, with the record's first mark. */
export const takenInResultFixture: ActionResult = {
  ...missionResultFixture,
  stamp: 'takenIn',
  again: null,
  street: {
    ...missionResultFixture.street!,
    runIn: {
      ...missionResultFixture.street!.runIn!,
      opponent: {
        id: 'constable',
        label: 'A constable of the city police',
        portrait: portrait('portrait.kessler'),
        pronoun: 'he',
      },
      choice: 'run',
      steps: [
        { row: 'run', ok: false },
        { row: 'fight', ok: false },
      ],
      outcome: 'lost',
      cause: 'power',
      health: { before: 125, after: 30, max: 125, fullAt: T0 + 100 * MIN },
      ironPaid: 0,
    },
    heat: {
      before: 52,
      gain: 6,
      after: 58,
      state: 'hot',
      stateBefore: 'hot',
      coolsAt: T0 + 400 * MIN,
      first: false,
    },
    record: { added: 1, escalated: false, before: 'clean', after: 'onFile', marks: 1, first: true, allMinor: true },
    sentTo: {
      kind: 'cells',
      stayId: '6ac2a5643d2b4ff7628ee841',
      placeName: 'Harbour Police',
      until: T0 + 39 * MIN,
      bail: 150,
      landing: { cityId: 'coalport', quarterId: 'coalport.harbour', locationId: 'coalport.harbour-police' },
    },
    dropped: 'lost',
  },
};

const tap: ActionView = {
  id: 'held.cells',
  name: 'Listen to the cells',
  type: 'intelligence',
  kind: 'checked',
  givesFxp: false,
  energy: 3,
  energy3: null,
  preview: checkFixture,
  order: null,
  locked: null,
  tags: [],
  placeTags: [],
};

/** The cells at Harbour Police, 39 minutes, bail 150 Iron. */
export const cellsFixture: HeldView = {
  stayId: '6ac2a5643d2b4ff7628ee841',
  kind: 'cells',
  state: 'in',
  cityId: 'coalport',
  cityName: 'Coalport',
  locationId: 'coalport.harbour-police',
  placeName: 'Harbour Police',
  since: T0,
  until: T0 + 39 * MIN,
  serverNow: T0,
  rivalGround: false,
  again: false,
  bail: { total: 150, lines: [], affordable: true, legalAid: false },
  walkOut: null,
  discharge: null,
  health: { value: 125, max: 125, fullAt: null },
  tap,
  release: null,
  election: null,
  paperUnread: 1,
  art: { rung: 'scene', asset: scene('scene.jail-cell') },
  voice: portrait('portrait.duty-officer'),
};

/** The infirmary at Coalport, 20 minutes, Health 30 / 125. */
export const infirmaryFixture: HeldView = {
  ...cellsFixture,
  kind: 'infirmary',
  locationId: 'coalport.infirmary',
  placeName: 'The Infirmary',
  until: T0 + 20 * MIN,
  bail: null,
  walkOut: { energy: 5, iron: 100, affordable: true },
  discharge: { energy: 5, healthTo: 62, affordable: true },
  health: { value: 30, max: 125, fullAt: T0 + 100 * MIN },
  tap: { ...tap, id: 'held.ward', name: 'Talk to the ward' },
  art: { rung: 'scene', asset: scene('scene.hospital') },
  voice: portrait('portrait.matron'),
};

/** Released on bail (tech design §10.3). */
export const releasedResultFixture: PoliticalResult = {
  kind: 'political',
  act: 'bail',
  stamp: { label: 'Released', tone: 'success' },
  paper: { name: 'The Coalport Clarion', shortName: 'Clarion' },
  place: { cityId: 'coalport', cityName: 'Coalport' },
  headline: "Out, with the duty officer's regards",
  body: 'Heat is down to 25 and the duty officer has your page. He says mind how you go.',
  until: null,
  at: null,
  knockOns: {
    pc: null,
    morale: null,
    endorsements: null,
    iron: { before: 900, after: 750 },
    heat: { before: 58, after: 25 },
  },
  performedAt: new Date(T0).toISOString(),
  idempotencyKey: '3b241101-e2bb-4255-8caf-4136c566a970',
  character: riskCharacterFixture,
  view: {
    kind: 'held',
    landing: { cityId: 'coalport', quarterId: 'coalport.harbour', locationId: 'coalport.harbour-police' },
  },
};

/** Deported from Duskwall: the train home and the bar. */
export const deportedResultFixture: PoliticalResult = {
  ...releasedResultFixture,
  act: 'deported',
  stamp: { label: 'Put on the train', tone: 'success' },
  place: { cityId: 'duskwall', cityName: 'Duskwall' },
  headline: 'Escorted to the station',
  body: "Two constables, one platform, and a ticket you didn't buy.",
  knockOns: {
    pc: null,
    morale: null,
    endorsements: null,
    heat: { before: 84, after: 25 },
    barred: { cityId: 'duskwall', cityName: 'Duskwall', until: T0 + 24 * 60 * MIN },
  },
  view: { kind: 'held', landing: { journey: true } },
};

/**
 * Coalport's three quarters at Level 5 (review 4, ADR 0076: a home quarter is a group of places with a
 * Level gate, no shape): the Mill open, the Harbour at Level 6, the Sidings later.
 */
export const quarterFixtures: QuarterView[] = [
  {
    id: 'coalport.mill',
    name: 'The Mill',
    open: true,
    lock: null,
    blurb: 'The mill and the men who work it.',
    places: 7,
  },
  {
    id: 'coalport.harbour',
    name: 'The Harbour',
    open: false,
    lock: { kind: 'level', level: 6 },
    blurb: 'Where the basin opens to the sea: the slipway, the customs house, the infirmary, the police.',
    places: 5,
  },
  {
    id: 'coalport.sidings',
    name: 'The Sidings',
    open: false,
    lock: { kind: 'edition' },
    blurb: 'The way in and out of town.',
    places: 0,
  },
];

/** Review 4 (ADR 0076): Coalport's greyed pins at Level 5: the Harbour's five, then the Sidings' four. */
export const lockedPinFixtures: LockedPinView[] = [
  { id: 'coalport.shipyard', name: 'The Shipyard', quarterId: 'coalport.harbour', map: { x: 0.86, y: 0.46 }, lock: { kind: 'level', level: 6 } },
  { id: 'coalport.customs-house', name: 'Customs House', quarterId: 'coalport.harbour', map: { x: 0.66, y: 0.66 }, lock: { kind: 'level', level: 6 } },
  { id: 'coalport.infirmary', name: 'The Infirmary', quarterId: 'coalport.harbour', map: { x: 0.17, y: 0.5 }, lock: { kind: 'level', level: 6 } },
  { id: 'coalport.harbour-police', name: 'Harbour Police', quarterId: 'coalport.harbour', map: { x: 0.56, y: 0.83 }, lock: { kind: 'level', level: 6 } },
  { id: 'coalport.far-bank', name: 'The Far Bank', quarterId: 'coalport.harbour', map: { x: 0.93, y: 0.62 }, lock: { kind: 'level', level: 6 } },
  { id: 'coalport.station', name: 'Coalport Station', quarterId: 'coalport.sidings', map: { x: 0.46, y: 0.62 }, lock: { kind: 'edition' } },
  { id: 'coalport.coal-yards', name: 'Coal Yards', quarterId: 'coalport.sidings', map: { x: 0.44, y: 0.84 }, lock: { kind: 'edition' } },
  { id: 'coalport.tram-depot', name: 'Tram Depot', quarterId: 'coalport.sidings', map: { x: 0.29, y: 0.59 }, lock: { kind: 'edition' } },
  { id: 'coalport.st-barbaras', name: "St Barbara's", quarterId: 'coalport.sidings', map: { x: 0.24, y: 0.27 }, lock: { kind: 'edition' } },
];
