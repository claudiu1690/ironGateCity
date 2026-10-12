import type {
  ActionResult,
  AssetView,
  HallView,
  CandidateView,
  CharacterView,
  CouncilRowView,
  CountView,
  ElectionView,
  FrontPageView,
  PoliticalResult,
  PoliticsSummaryView,
  RuleBallotView,
  RuleCardView,
  CheckBreakdown,
  CityView,
  DailyTally,
  StoryScreenView,
  NamedStandingView,
  OrdersView,
  NightView,
  PaperView,
} from '../types';
import { rankLadder } from '../rank';

/**
 * Test fixtures shared by packages (`@irongate/rules/testing`): the reference recruit and results in
 * the exact shapes the server returns (×1 Success, a ×3 batch, training, a shift), a city and a paper.
 */

const T0 = Date.UTC(2026, 8, 29, 9, 0, 0);
const DAY = Math.floor(T0 / 86_400_000);
const DAY_END = (DAY + 1) * 86_400_000;

/** Review 5 (ADR 0079): 09:00 UTC is day; dusk at 10:00, the dawn after it at 12:00. */
export const nightFixture: NightView = {
  night: false,
  nextDusk: T0 + 3_600_000,
  nextDawn: T0 + 3 * 3_600_000,
  changesAt: T0 + 3_600_000,
};

export const assetFixture = (id: string, width: number, height: number, widths: number[]): AssetView => ({
  id,
  format: 'raster',
  width,
  height,
  widths,
  alt: `Art ${id}`,
  focus: null,
  tiles: null,
});

/**
 * Maps v3: a city's painted 8,640 px picture, as the server sends it: stills at 1024 and 2048 (the
 * WebP fallback at 1024 only) and its tile pyramid.
 */
export const mapFixture = (id: string, rev = '1a2b3c4d'): AssetView => ({
  ...assetFixture(id, 8640, 8640, [1024, 2048]),
  webpWidths: [1024],
  tiles: {
    path: `${id}/${rev}`,
    width: 8640,
    height: 8640,
    tileSize: 512,
    overlap: 1,
    maxLevel: 14,
    format: 'avif',
  },
});

/** A vector asset (the faction crests, ADR 0015). */
export const svgFixture = (id: string): AssetView => ({
  id,
  format: 'svg',
  width: 512,
  height: 512,
  widths: [],
  alt: `Art ${id}`,
  focus: null,
  tiles: null,
});

const holmPortrait = assetFixture('portrait.holm', 880, 1100, [256, 512]);

export const standingFixture: NamedStandingView = {
  level: 0,
  successes: 1,
  floor: 0,
  next: 10,
  bonus: 0,
  cityId: 'coalport',
  cityName: 'Coalport',
  name: 'Stranger',
  nextName: 'Familiar',
};

export const tallyFixture: DailyTally = {
  day: DAY,
  energy: 10,
  attempts: 1,
  successes: 1,
  xp: 45,
  fxp: 6,
  iron: 20,
  pc: 0,
  opinion: 0.05,
  ordersDone: 0,
  statTrained: 0,
};

export const ordersViewFixture: OrdersView = {
  day: DAY,
  resetsAt: DAY_END,
  issuer: {
    name: 'Petra Holm',
    title: 'Branch secretary, Coalport',
    signature: '— P.H.',
    portrait: holmPortrait,
  },
  items: [
    {
      id: 'dir.shift-change',
      title: 'Canvass the shift change at the Mill Gate',
      line: 'The afternoon shift comes off at four. Be at the Mill Gate before it.',
      progress: 1,
      target: 2,
      done: false,
      pin: { locationId: 'coalport.mill-gate', n: 1 },
    },
    {
      id: 'dir.say-it',
      title: 'Make a speech anywhere in Coalport',
      line: "The market cross or the gate steps. Somebody has to stand up today. It's you.",
      progress: 0,
      target: 1,
      done: false,
      pin: { locationId: 'coalport.mill-gate', n: 1 },
    },
    {
      id: 'dir.take-a-job',
      title: 'Take a job at the Mill Gate',
      line: "The party doesn't pay wages. The mill does, every day, and a fifth more to members. The first wage lands {at}.",
      progress: 1,
      target: 1,
      done: true,
      pin: { locationId: 'coalport.mill-gate', n: 1 },
    },
  ],
  allDone: false,
  rewards: { matchFxpBonusPct: 25, orderDoneFxp: 20, allDonePc: 5 },
  complete: null,
  away: null,
};

export const characterViewFixture: CharacterView = {
  id: '66f9a0000000000000000001',
  name: 'Mara Lenk',
  factionId: 'collective',
  factionName: 'Collective',
  homeCityId: 'coalport',
  cityId: 'coalport',
  stats: { str: 10, int: 12, agi: 5, cha: 2 },
  energy: { value: 90, max: 100, updatedAt: T0, nextTickAt: T0 + 600_000, fullAt: T0 + 2 * 600_000 },
  rested: 0,
  xp: 45,
  level: 1,
  fxp: 6,
  iron: 20,
  version: 1,
  serverNow: T0,
  day: { key: DAY, endsAt: DAY_END },
  rank: {
    value: 1,
    title: 'Recruit',
    fxpFloor: 0,
    fxpNext: 400,
    nextTitle: 'Activist',
    ladder: ['Recruit', 'Activist', 'Organiser', 'Convenor', 'Delegate', 'Tribune', 'Chairman'],
  },
  ranks: rankLadder(['Recruit', 'Activist', 'Organiser', 'Convenor', 'Delegate', 'Tribune', 'Chairman']),
  pc: 0,
  statPointsPending: 0,
  job: null,
  standing: standingFixture,
  today: tallyFixture,
  orders: ordersViewFixture,
  paperDue: false,
  avatar: assetFixture('avatar.woman-30s', 760, 950, [128, 256]),
  chaBase: 0,
  wearing: { itemId: 'outfit.mill-coat', name: 'Mill work coat', cha: 2 },
  partyCard: { factionName: 'Red Collective', rankTitle: 'Recruit', memberSince: T0 },
  keepsakes: [],
  ambition: { id: 'finish-his-work', title: 'The Names on the Stone', chapter: 1, status: 'ready', readyFrom: null },
  lettersWaiting: 1,
  office: null,
  politicsWaiting: 0,
  restedCap: 200,
  welcomeDay: true,
  statGuide: {
    cityName: 'Coalport',
    total: 15,
    counts: { str: 3, int: 9, agi: 2 },
    lead: 'int',
    best: { stat: 'int', value: 12 },
  },
};

export const checkFixture: CheckBreakdown = {
  stats: ['int'],
  statValues: [12],
  statValue: 12,
  difficulty: 8,
  base: 50,
  statTerm: 16,
  bonuses: [],
  bonusTotal: 0,
  raw: 66,
  chance: 66,
};

const mapDay = mapFixture('map.coalport.day');

export const actionResultFixture: ActionResult = {
  logId: '66f9a0000000000000000002',
  idempotencyKey: '3b241101-e2bb-4255-8caf-4136c566a962',
  performedAt: new Date(T0).toISOString(),
  seed: '0123456789abcdef0123456789abcdef',
  place: {
    cityId: 'coalport',
    cityName: 'Coalport',
    locationId: 'coalport.mill-gate',
    locationName: 'Mill Gate',
    kind: 'factory-gate',
  },
  kind: 'checked',
  action: {
    id: 'coalport.mill-gate.canvass',
    name: 'Canvass the shift change',
    type: 'canvass',
    tier: 1,
    times: 1,
  },
  stamp: 'success',
  successes: 1,
  headline: 'The whistle goes, and they stop',
  body: "You're at the gate before the shift comes off. Coal dust, tired faces, no time for speeches.",
  art: { rung: 'map-crop', asset: mapDay, x: 0.75, y: 0.2 },
  attempts: [
    {
      index: 1,
      roll: 41,
      outcome: 'success',
      check: checkFixture,
      rewards: {
        xp: { base: 45, bonus: 0, total: 45 },
        fxp: { base: 6, bonus: 0, total: 6 },
        iron: { base: 20, bonus: 0, total: 20 },
        opinion: 0.05,
      },
      restedUsed: 0,
      orderId: null,
    },
  ],
  rows: [],
  rewards: {
    xp: { base: 45, bonus: 0, total: 45 },
    fxp: { base: 6, bonus: 0, total: 6 },
    iron: { base: 20, bonus: 0, total: 20 },
    opinion: 0.05,
  },
  bonusTags: [],
  effects: {
    energy: { before: 100, after: 90, max: 100, nextTickAt: T0 + 600_000 },
    rested: { before: 0, after: 0 },
    xp: { before: 0, after: 45 },
    fxp: { before: 0, after: 6 },
    iron: { before: 0, after: 20 },
    level: 1,
    opinion: {
      cityId: 'coalport',
      factionId: 'collective',
      delta: 0.05,
      applied: 0.05,
      shareBefore: 70,
      shareAfter: 70.05,
    },
    standing: {
      before: { ...standingFixture, successes: 0 },
      after: standingFixture,
    },
    levelUp: null,
    rankUp: null,
    pc: null,
    orders: [],
    ordersAllDone: null,
    stat: null,
    item: null,
    hooks: [],
  },
  today: tallyFixture,
  again: { cost1: 10, cost3: 30 },
  character: characterViewFixture,
  story: null,
};

const row = (
  index: number,
  roll: number,
  outcome: 'success' | 'partial',
  xp: [number, number],
  fxp: [number, number],
  iron: [number, number],
  restedUsed: number,
  orderId: string | null,
) => ({
  index,
  roll,
  outcome,
  check: checkFixture,
  rewards: {
    xp: { base: xp[0], bonus: xp[1], total: xp[0] + xp[1] },
    fxp: { base: fxp[0], bonus: fxp[1], total: fxp[0] + fxp[1] },
    iron: { base: iron[0], bonus: iron[1], total: iron[0] + iron[1] },
    opinion: outcome === 'success' ? 0.05 : 0.025,
  },
  restedUsed,
  orderId,
});

/** ×3 canvass, 2 of 3, with Rested, a Party order completed and a level-up. */
export const batchResultFixture: ActionResult = {
  ...actionResultFixture,
  logId: '66f9a0000000000000000003',
  action: { ...actionResultFixture.action, times: 3 },
  stamp: 'batch',
  successes: 2,
  attempts: [
    row(1, 12, 'success', [45, 23], [6, 2], [20, 10], 10, 'dir.shift-change'),
    row(2, 80, 'partial', [23, 11], [3, 1], [10, 5], 10, 'dir.shift-change'),
    row(3, 30, 'success', [45, 5], [6, 0], [20, 2], 2, null),
  ],
  rewards: {
    xp: { base: 113, bonus: 39, total: 152 },
    fxp: { base: 15, bonus: 3, total: 18 },
    iron: { base: 50, bonus: 17, total: 67 },
    opinion: 0.125,
  },
  bonusTags: [
    { id: 'rested', label: 'Rested', note: '22 of 30 Energy, +37 % XP and Iron' },
    { id: 'order', label: 'Party order', note: '+25 % Party XP' },
  ],
  effects: {
    ...actionResultFixture.effects,
    energy: { before: 100, after: 70, max: 100, nextTickAt: T0 + 600_000 },
    rested: { before: 22, after: 0 },
    xp: { before: 60, after: 212 },
    fxp: { before: 6, after: 44 },
    iron: { before: 20, after: 87 },
    level: 2,
    opinion: {
      cityId: 'coalport',
      factionId: 'collective',
      delta: 0.125,
      applied: 0.125,
      shareBefore: 70.05,
      shareAfter: 70.175,
    },
    levelUp: { from: 1, to: 2, statPoints: 1 },
    orders: [
      {
        id: 'dir.shift-change',
        title: 'Be at the gate',
        before: 0,
        after: 2,
        target: 2,
        done: true,
        fxp: 20,
      },
    ],
  },
  again: { cost1: 10, cost3: 30 },
  character: { ...characterViewFixture, statPointsPending: 1, level: 2, xp: 212 },
};

export const trainingResultFixture: ActionResult = {
  ...actionResultFixture,
  logId: '66f9a0000000000000000004',
  place: {
    ...actionResultFixture.place,
    locationId: 'coalport.union-hall',
    locationName: 'Union Hall',
    kind: 'faction-hq',
  },
  kind: 'training',
  action: {
    id: 'coalport.union-hall.reading-room',
    name: 'Study in the reading room',
    type: 'training',
    tier: 1,
    times: 1,
  },
  stamp: 'trained',
  successes: 0,
  headline: 'An evening with the pamphlets',
  body: 'The reading room is cold and the light is bad.',
  art: { rung: 'scene', asset: assetFixture('scene.union-hq', 2688, 1520, [640, 1280]) },
  attempts: [],
  rows: [{ index: 1, label: 'Intelligence 12 → 13', detail: '44 Energy · always works' }],
  rewards: {
    xp: { base: 99, bonus: 0, total: 99 },
    fxp: { base: 0, bonus: 0, total: 0 },
    iron: { base: 0, bonus: 0, total: 0 },
    opinion: 0,
  },
  effects: {
    ...actionResultFixture.effects,
    energy: { before: 100, after: 56, max: 100, nextTickAt: T0 + 600_000 },
    opinion: null,
    standing: null,
    stat: { stat: 'int', before: 12, after: 13 },
  },
  again: { cost1: 46, cost3: null, verb: 'Study' },
};

export const cityViewFixture: CityView = {
  id: 'coalport',
  name: 'Coalport',
  role: 'home',
  homeFactionId: 'collective',
  opinion: { vanguard: 9, collective: 70.05, alliance: 6, neutral: 14.95 },
  map: { day: mapDay, night: mapFixture('map.coalport.night', '5e6f7a8b') },
  quarters: [{ id: 'coalport.mill', name: 'The Mill', frame: { x0: 0.34, y0: 0.02, x1: 0.81, y1: 0.62 } }],
  isNight: false,
  night: nightFixture,
  standing: standingFixture,
  locations: [
    {
      id: 'coalport.mill-gate',
      name: 'Mill Gate',
      kind: 'factory-gate',
      blurb: 'The gates of the Coalport Steel Mill.',
      n: 1,
      map: { x: 0.75, y: 0.2 },
      actions: [
        {
          id: 'coalport.mill-gate.canvass',
          name: 'Canvass the shift change',
          type: 'canvass',
          kind: 'checked',
          givesFxp: true,
          energy: 10,
          energy3: 30,
          preview: checkFixture,
          order: {
            id: 'dir.shift-change',
            title: 'Canvass the shift change at the Mill Gate',
            progress: 1,
            target: 2,
          },
          locked: null,
          tags: [],
        },
      ],
      jobs: [
        {
          jobId: 'coalport-factory-worker',
          name: 'Factory worker',
          blurb: 'Rolling floor at the Coalport Steel Mill.',
          pay: 216,
          held: false,
          locked: null,
          unmet: [],
          isSwitch: false,
        },
      ],
      council: null,
    },
    {
      id: 'coalport.union-hall',
      name: 'Union Hall',
      kind: 'faction-hq',
      blurb: "The Collective's hall.",
      n: 3,
      map: { x: 0.42, y: 0.35 },
      actions: [
        {
          id: 'coalport.union-hall.reading-room',
          name: 'Study in the reading room',
          type: 'training',
          kind: 'training',
          givesFxp: false,
          energy: 44,
          energy3: null,
          preview: null,
          trains: { stat: 'int', from: 12, to: 13 },
          verb: 'Study',
          order: null,
          locked: null,
          tags: [],
        },
      ],
      jobs: [],
      council: null,
    },
  ],
  morale: { factionId: 'collective', share: 70.05, state: 'steady' },
  ordinance: null,
  election: null,
};

export const paperViewFixture: PaperView = {
  day: DAY,
  firstEdition: true,
  paper: {
    name: 'The Coalport Clarion',
    shortName: 'Clarion',
    strapline: 'The voice of the mill and the quays',
    price: '5 marks',
  },
  edition: null,
  localElection: null,
  dateline: { weekday: 'Tuesday', date: '29 September', city: 'Coalport' },
  headlines: [
    {
      group: 'personal',
      headline: 'Welcome to Coalport',
      deck: 'Your branch secretary has three orders for you below.',
    },
    { group: 'city', headline: 'Collective Holds Coalport at 70.0 %', deck: '"Steady," says the branch.' },
    { group: 'ambient', headline: 'Bread Up Two Marks a Loaf' },
  ],
  orders: ordersViewFixture,
  desk: {
    salary: null,
    stipend: null,
    oneOfUsPc: 0,
    restedBanked: 0,
    daysSinceLastPaper: null,
    yesterday: null,
    jobName: null,
    energy: { value: 100, max: 100, fullAt: null },
    rested: { value: 0, cap: 200 },
    level: { level: 1, xpToNext: 150, next: 2, statPointsPending: 0 },
    job: null,
    jobPlaces: ['the Mill Gate', 'Market Row', 'Harbour Quays'],
    standing: standingFixture,
    wearing: { name: 'Mill work coat', cha: 2 },
  },
  letters: [
    {
      kind: 'chapter',
      from: "From the office's post",
      title: "The unit's list",
      chapter: 1,
      status: 'ready',
      energy: 10,
    },
  ],
  landing: { cityId: 'coalport', locationId: 'coalport.mill-gate' },
  readAt: null,
  due: true,
  pollingDay: null,
  frontPage: null,
};

// ---------------------------------------------------------------------------------------------
// Slice 2: tier-3 story screens, the street and a chapter result (tech design §14 UI fixtures).
// ---------------------------------------------------------------------------------------------

const compartment = {
  ...assetFixture('scene.train-compartment', 2688, 1520, [640, 1280]),
  focus: null,
};
const demobOffice = { ...assetFixture('scene.demob-office', 2688, 1520, [640, 1280]), focus: null };

/** Review 5, beat 2 (the kitbag): the helper's portrait, the echo of beat 1, one tap commits. */
export const originScreenFixture: StoryScreenView = {
  kicker: "The six o'clock to Coalport · the compartment",
  title: 'The kitbag',
  narrative:
    "The six o'clock, the kitbag on the rack. Everything you own is in it, and it still isn't heavy. Holm asks what a person brings home from four years.",
  art: { kind: 'scene', asset: compartment, focus: { x: 0.5, y: 0.5 } },
  portrait: assetFixture('portrait.holm', 760, 950, [256, 512]),
  echo: 'You went for the work.',
  prompt: null,
  choices: [
    { id: 'tools', text: "Tools. I kept the workshop's kit when the workshop went.", hint: null },
    { id: 'books', text: 'Books, from the camp library. They let us keep those.', hint: null },
    { id: 'light', text: 'The boots I walked out in. Two hundred miles, and they still fit.', hint: null },
  ],
  approaches: [],
  cta: null,
  progress: { step: 2, of: 3 },
};

/** Review 5, beat 1 (the counter): three rows with a portrait and two lines; a row selects. */
export const platformScreenFixture: StoryScreenView = {
  kicker: 'Irongate · the demobilisation office · the second morning home',
  title: 'The counter',
  narrative:
    'The demobilisation office, the second morning home. You reach the counter at eleven with a kitbag and your papers, and the clerk gives you three pieces of news without looking up. The mill is sold. The stamp is missing. The flat is gone.',
  art: { kind: 'scene', asset: demobOffice, focus: { x: 0.42, y: 0.45 } },
  portrait: null,
  echo: null,
  prompt: null,
  choices: [
    {
      id: 'holm',
      text: "\"Your mill's sold, but Coalport's rehires on Monday, union men first. Put your name on my sheet now and you've a place at the gate and a bed at the union hostel tonight. The six o'clock to Coalport.\"",
      hint: null,
      portrait: assetFixture('portrait.holm', 760, 950, [256, 512]),
      lines: [
        'Petra Holm · union organiser · at the bench by the door, signing up men off the trains',
        'Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence',
      ],
      confirm: "Go for the work · the six o'clock to Coalport",
    },
    {
      id: 'stahl',
      text: "\"No stamp, no pay, and this office takes six weeks. The League in Duskwall sees to its men: the stamp by Thursday, the pension after, and a bed at the League's hostel till then. The six o'clock; I'll put you on the list.\"",
      hint: null,
      portrait: assetFixture('portrait.stahl', 760, 950, [256, 512]),
      lines: [
        "Viktor Stahl · the Duskwall League's welfare desk · stamps, pensions and a bed for men coming home",
        'Iron Vanguard · order, discipline and a strong hand · +3 Strength',
      ],
      confirm: "Go for the stamp · the six o'clock to Duskwall",
    },
  ],
  note: "One of these today. The other two will keep, or they won't. Whoever you go with, you go with: a Faction Reset token is the only way back.",
  approaches: [],
  cta: null,
  progress: { step: 1, of: 3 },
};

/** Chapter 1, step 2: two approaches with odds, the CTA short of Energy. */
export const chapterCheckScreenFixture: StoryScreenView = {
  kicker: 'Ambition · The Names on the Stone · Chapter 1 of 12',
  title: 'Three families',
  narrative:
    "Three of the forty had people in Coalport: the list gives a street for each. Twenty minutes' walk.",
  art: { kind: 'map-crop', asset: mapDay, x: 0.42, y: 0.35 },
  portrait: null,
  echo: null,
  prompt: null,
  choices: [],
  approaches: [
    {
      id: 'knock',
      text: 'Knock the three doors and say you were in the same unit',
      check: {
        ...checkFixture,
        stats: ['cha', 'int'],
        statValues: [2, 12],
        statValue: 7,
        statTerm: -4,
        raw: 46,
        chance: 46,
      },
    },
    { id: 'sort', text: 'Sort the list by street first, then knock', check: checkFixture },
  ],
  cta: { label: 'Knock the three doors', energy: 10, readyAt: T0 + 600_000 },
  progress: { step: 2, of: 3 },
};

/** Chapter 1 ended in a Failure: 25 XP, the keepsake, the hook. */
export const chapterResultFixture: ActionResult = {
  ...actionResultFixture,
  logId: '66f9a0000000000000000006',
  place: {
    ...actionResultFixture.place,
    locationId: 'coalport.union-hall',
    locationName: 'Union Hall',
    kind: 'faction-hq',
  },
  kind: 'chapter',
  action: { id: 'finish-his-work.1', name: "The unit's list", type: 'chapter', tier: 3, times: 1 },
  stamp: 'failure',
  successes: 0,
  headline: 'Nobody home',
  body: 'No one answers at any of the three.',
  art: { rung: 'map-crop', asset: mapDay, x: 0.42, y: 0.35 },
  attempts: [
    {
      index: 1,
      roll: 90,
      outcome: 'failure',
      check: checkFixture,
      rewards: {
        xp: { base: 25, bonus: 0, total: 25 },
        fxp: { base: 0, bonus: 0, total: 0 },
        iron: { base: 0, bonus: 0, total: 0 },
        opinion: 0,
      },
      restedUsed: 0,
      orderId: null,
    },
  ],
  rewards: {
    xp: { base: 25, bonus: 0, total: 25 },
    fxp: { base: 0, bonus: 0, total: 0 },
    iron: { base: 0, bonus: 0, total: 0 },
    opinion: 0,
  },
  effects: {
    ...actionResultFixture.effects,
    xp: { before: 0, after: 25 },
    fxp: { before: 0, after: 0 },
    iron: { before: 0, after: 0 },
    opinion: null,
    standing: null,
    item: {
      itemId: 'keep.ward-book',
      name: "The unit's list",
      keepsake: true,
      art: assetFixture('item.document-folder', 512, 512, [128, 256]),
    },
    hooks: ['Chapter 2, "Stand for the stone": from Tuesday 6 October, at Rank 2'],
  },
  again: null,
  story: {
    ambitionId: 'finish-his-work',
    ambitionTitle: 'The Names on the Stone',
    chapter: 1,
    of: 12,
    approachId: 'sort',
    choiceText: 'Keep it to yourself for now',
  },
};

// ---------------------------------------------------------------------------------------------
// Slice 3: the political views (tech design §14 UI fixtures); the voting rework (tech design §4.4).
// ---------------------------------------------------------------------------------------------

const COUNT_DAY = DAY + 5;
const MS = 86_400_000;

const ruleCard = (
  ordinanceId: string,
  name: string,
  plainLine: string,
  effectLine: string,
  whose: RuleCardView['whose'],
): RuleCardView => ({ ordinanceId, name, plainLine, effectLine, whose, yourVote: false });

/** Coalport's three cards (design App. A, with a player councillor's rule as card 2). */
export const ruleCardsFixture: RuleCardView[] = [
  ruleCard(
    'ord.long-service',
    'Long Service Order',
    'Seniority builds two days a day.',
    'Seniority ×2',
    { kind: 'party', factionIds: ['collective'], by: 'Secretary Holm', via: 'secretary' },
  ),
  ruleCard('ord.street-fund', 'Street Fund', 'Iron from shifts rises by a quarter.', 'Iron +25 %', {
    kind: 'councillor',
    name: 'Mara Lenk',
    local: false,
    you: true,
  }),
  ruleCard('ord.public-works', 'Public Works Order', 'Job pay up a tenth.', 'Job pay +10 %', {
    kind: 'councillor',
    name: 'Anna Weiss',
    local: true,
    you: false,
  }),
];

export const ruleBallotFixture: RuleBallotView = {
  key: 'coalport:4146',
  cityId: 'coalport',
  cityName: 'Coalport',
  placeName: 'Coalport',
  capital: false,
  status: 'set',
  cards: ruleCardsFixture,
  setAt: (DAY - 1) * MS,
  pollsOpenAt: (DAY - 1) * MS,
  countAt: (DAY + 2) * MS,
  runsUntil: (DAY + 7) * MS,
  myVote: null,
  canVote: true,
  reason: null,
  myRule: null,
  standing: { players: 1, locals: 8, seats: 7 },
};

export const politicsSummaryFixture: PoliticsSummaryView = {
  cityId: 'coalport',
  cityName: 'Coalport',
  cycleDay: 3,
  phase: 'polling',
  state: 'vote',
  closesAt: (DAY + 2) * MS,
  pollsOpenAt: DAY * MS,
  pollsFromWeekday: 'Thursday',
  countAt: (DAY + 2) * MS,
  votedFor: null,
  inForce: {
    ordinanceId: 'ord.long-service',
    name: 'Long Service Order',
    daysLeft: 3,
    plainLine: 'Seniority builds two days a day.',
    how: 'fallback',
    votes: 0,
    voters: 0,
  },
  rank2Title: 'Activist',
  rank3Title: 'Organiser',
  paperShortName: 'Clarion',
  fxpToRank2: null,
  standCost: 10,
  route: '/council/ballot',
  dot: true,
  card: {
    state: 'vote',
    closesAt: (DAY + 2) * MS,
    pollsOpenAt: DAY * MS,
    countAt: (DAY + 2) * MS,
    runsFrom: (DAY + 2) * MS,
    fxp: 450,
    rank2Fxp: 400,
    canStand: false,
    votedFor: null,
    result: null,
    standing: null,
    councillor: null,
    firstTime: false,
  },
  ballot: ruleBallotFixture,
};

const npcCandidate = (npcId: string, name: string, profile: number, rule: string | null): CandidateView => ({
  key: `n:${npcId}`,
  candidacyId: null,
  kind: 'npc',
  name,
  avatar: null,
  factionId: 'collective',
  rankTitle: null,
  standing: {
    name: profile * 5 >= 150 ? 'One of Us' : 'Trusted',
    cityName: 'Coalport',
    successes: profile * 5,
  },
  wardVote: profile,
  rule: rule ? { ordinanceId: rule, name: rule } : null,
  backers: null,
  you: false,
  backedByYou: false,
  canBack: null,
});

const playerCandidate: CandidateView = {
  key: 'p:66f9a0000000000000000001',
  candidacyId: '66f9a0000000000000000009',
  kind: 'player',
  name: 'Mara Lenk',
  avatar: assetFixture('avatar.woman-30s', 760, 950, [128, 256]),
  factionId: 'collective',
  rankTitle: 'Organiser',
  standing: { name: 'One of Us', cityName: 'Coalport', successes: 200 },
  wardVote: 40,
  rule: { ordinanceId: 'ord.street-fund', name: 'Street Fund' },
  backers: { n: 1, branch: false, names: ['Anton Weiss'], more: 0 },
  you: false,
  backedByYou: false,
  canBack: { ok: true },
};

/** Review 3: Coalport's council hall on its picture, with the map's two stills. */
export const hallFixture: HallView = {
  name: 'Town Hall',
  ref: 'the Town Hall',
  x: 0.525,
  y: 0.19,
  asset: {
    day: mapFixture('map.coalport.day'),
    night: mapFixture('map.coalport.night', '5e6f7a8b'),
  },
  night: nightFixture,
};

export const electionViewFixture: ElectionView = {
  electionId: 'coalport:4145',
  cityId: 'coalport',
  cityName: 'Coalport',
  phase: 'nominations',
  nominationsCloseAt: (DAY + 2) * MS,
  pollsOpenAt: (DAY + 2) * MS,
  countAt: COUNT_DAY * MS,
  candidates: [
    playerCandidate,
    npcCandidate('npc.c.weiss', 'Anna Weiss', 44, 'ord.public-works'),
    npcCandidate('npc.c.baum', 'Josef Baum', 38, 'ord.rally-permits'),
  ],
  stand: {
    requirements: [
      { id: 'rank', met: true, rankTitle: 'Organiser', fxpToGo: 0 },
      { id: 'known', met: true, successes: 74, need: 30 },
    ],
    defaultRule: 'ord.long-service',
    menu: [
      {
        ordinanceId: 'ord.long-service',
        name: 'Long Service Order',
        line: 'Long service counts double.',
        plainLine: 'Seniority builds two days a day.',
        effectLine: 'Seniority ×2',
        onBallot: true,
      },
      {
        ordinanceId: 'ord.street-fund',
        name: 'Street Fund',
        line: 'The council funds the streets.',
        plainLine: 'Iron from shifts rises by a quarter.',
        effectLine: 'Iron +25 %',
        onBallot: false,
      },
    ],
    cost: 10,
    canStand: true,
    reason: null,
  },
  candidacy: null,
  backed: null,
  pc: 45,
  seats: 7,
  hall: hallFixture,
};

const councilRow = (
  place: number,
  name: string,
  kind: 'player' | 'npc',
  wardVote: number,
  backers: number,
  extra: Partial<CouncilRowView> = {},
): CouncilRowView => ({
  key: kind === 'player' ? 'p:66f9a0000000000000000001' : `n:npc.${place}`,
  kind,
  name,
  avatar: null,
  rankTitle: kind === 'player' ? 'Organiser' : null,
  standingName: 'Trusted',
  place,
  seated: place <= 7,
  wardVote,
  backers,
  total: wardVote + 3 * Math.min(5, backers),
  short: place <= 7 ? null : Math.max(0, 21 - wardVote),
  you: false,
  rule: null,
  ...extra,
});

export const countViewFixture: CountView = {
  electionId: 'coalport:4145',
  cityId: 'coalport',
  cityName: 'Coalport',
  countDay: COUNT_DAY,
  weekday: 'Sunday',
  rule: {
    key: 'coalport:4145',
    countDay: COUNT_DAY,
    weekday: 'Sunday',
    cards: [
      { ...ruleCardsFixture[1]!, votes: 4, seats: null, share: 4 / 6, won: true, yourVote: true },
      { ...ruleCardsFixture[0]!, votes: 1, seats: null, share: 1 / 6, won: false },
      { ...ruleCardsFixture[2]!, votes: 1, seats: null, share: 1 / 6, won: false },
    ],
    how: 'votes',
    turnout: { voters: 6, eligible: 9 },
    runsUntil: (COUNT_DAY + 5) * MS,
  },
  council: [
    councilRow(1, 'Mara Lenk', 'player', 40, 2, {
      you: true,
      rule: { ordinanceId: 'ord.street-fund', name: 'Street Fund' },
    }),
    councilRow(2, 'Anna Weiss', 'npc', 45, 0),
    councilRow(3, 'Josef Baum', 'npc', 37, 0),
    councilRow(4, 'Marta Kolar', 'npc', 33, 0),
    councilRow(5, 'Emil Hauser', 'npc', 29, 0),
    councilRow(6, 'Lena Novak', 'npc', 26, 0),
    councilRow(7, 'Karl Dressler', 'npc', 21, 0),
    councilRow(8, 'Ida Pohl', 'npc', 19, 0),
    councilRow(9, 'Tomas Ruzicka', 'npc', 17, 0),
  ],
  turnout: { voters: 6, eligible: 9 },
  seats: 7,
  npcSeats: 6,
  hall: hallFixture,
};

export const frontPageFixture: FrontPageView = {
  avatar: assetFixture('avatar.woman-30s', 760, 950, [128, 256]),
  caption: { name: 'Mara Lenk', rankTitle: 'Organiser', cityName: 'Coalport' },
  animate: true,
  headline: 'Mara Lenk Tops the Poll in Coalport',
  deck: 'First of seven with 46. The Union Hall has a new name on the door.',
  count: countViewFixture,
};

export const politicalResultFixture: PoliticalResult = {
  kind: 'political',
  act: 'ballot',
  stamp: { label: 'Vote cast', tone: 'success' },
  paper: { name: 'The Coalport Clarion', shortName: 'Clarion' },
  place: { cityId: 'coalport', cityName: 'Coalport' },
  headline: 'Your vote is in',
  body: 'Street Fund. Nobody can see who you chose. The result is in the Clarion on Sunday morning; if it wins, it runs from Sunday for five days.',
  until: null,
  at: COUNT_DAY * MS,
  knockOns: {
    pc: null,
    morale: {
      cityName: 'Coalport',
      factionId: 'collective',
      before: 84,
      after: 84.5,
      stateBefore: 'fired',
      stateAfter: 'fired',
    },
    backers: null,
  },
  performedAt: new Date(T0).toISOString(),
  idempotencyKey: '3b241101-e2bb-4255-8caf-4136c566a963',
  character: characterViewFixture,
  view: {
    kind: 'ballot',
    ballot: { ...ruleBallotFixture, myVote: { ordinanceId: 'ord.street-fund', name: 'Street Fund' }, canVote: false, reason: 'ALREADY_VOTED' },
  },
};
