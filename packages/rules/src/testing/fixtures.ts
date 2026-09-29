import type {
  ActionResult,
  AssetView,
  CharacterView,
  CheckBreakdown,
  CityView,
  DailyTally,
  NamedStandingView,
  OrdersView,
  PaperView,
} from '../types';

/**
 * Test fixtures shared by packages (`@irongate/rules/testing`): the reference recruit and results in
 * the exact shapes the server returns (×1 Success, a ×3 batch, training, a shift), a city and a paper.
 */

const T0 = Date.UTC(2026, 8, 29, 9, 0, 0);
const DAY = Math.floor(T0 / 86_400_000);
const DAY_END = (DAY + 1) * 86_400_000;

export const assetFixture = (id: string, width: number, height: number, widths: number[]): AssetView => ({
  id,
  width,
  height,
  widths,
  alt: `Art ${id}`,
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
  shiftWorked: false,
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
      title: 'Be at the gate',
      line: 'The afternoon shift comes off at four. Be at the gate before it.',
      progress: 1,
      target: 2,
      done: false,
    },
    {
      id: 'dir.say-it',
      title: 'Get up and say it',
      line: "Somebody has to stand on the plinth today. It's you.",
      progress: 0,
      target: 1,
      done: false,
    },
    {
      id: 'dir.work-shift',
      title: 'Take a job',
      line: "The party doesn't pay wages. The mill does.",
      progress: 1,
      target: 1,
      done: true,
    },
  ],
  allDone: false,
  rewards: { matchFxpBonusPct: 25, orderDoneFxp: 20, allDonePc: 5 },
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
  rank: { value: 1, title: 'Recruit', fxpFloor: 0, fxpNext: 400 },
  pc: 0,
  statPointsPending: 0,
  job: null,
  sickDaysLeft: 2,
  standing: standingFixture,
  today: tallyFixture,
  orders: ordersViewFixture,
  paperDue: false,
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

const mapDay = assetFixture('map.coalport.day', 5056, 3392, [1280, 2560]);

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
  art: { rung: 'map-crop', asset: mapDay, x: 0.36, y: 0.44 },
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
    shift: null,
  },
  today: tallyFixture,
  again: { cost1: 10, cost3: 30 },
  character: characterViewFixture,
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
    { id: 'order', label: 'Party order', note: '+25 % FXP' },
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
  rows: [{ index: 1, label: 'INT 12 → 13', detail: '44 Energy · no roll' }],
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
  again: { cost1: 46, cost3: 144 },
};

export const shiftResultFixture: ActionResult = {
  ...actionResultFixture,
  logId: '66f9a0000000000000000005',
  kind: 'shift',
  action: {
    id: 'coalport.mill-gate.shift',
    name: 'Work your shift at the mill',
    type: 'job',
    tier: 1,
    times: 1,
  },
  stamp: 'worked',
  successes: 0,
  headline: 'Eight hours on the rolling floor',
  body: "Clock in, clock out, and the pay clerk's stamp in your book.",
  attempts: [],
  rows: [{ index: 1, label: 'Factory worker', detail: '4 Energy · no roll' }],
  rewards: {
    xp: { base: 0, bonus: 0, total: 0 },
    fxp: { base: 0, bonus: 0, total: 0 },
    iron: { base: 108, bonus: 4, total: 112 },
    opinion: 0,
  },
  effects: {
    ...actionResultFixture.effects,
    energy: { before: 100, after: 96, max: 100, nextTickAt: T0 + 600_000 },
    iron: { before: 0, after: 112 },
    opinion: null,
    standing: null,
    shift: {
      half: 108,
      streakBonus: 4,
      streakPct: 2,
      streak: { before: 0, after: 1 },
      sickDaysLeft: 2,
      nextShiftAt: DAY_END,
    },
  },
  again: null,
};

export const cityViewFixture: CityView = {
  id: 'coalport',
  name: 'Coalport',
  role: 'home',
  homeFactionId: 'collective',
  opinion: { vanguard: 9, collective: 70.05, alliance: 6, neutral: 14.95 },
  map: { day: mapDay, night: assetFixture('map.coalport.night', 5056, 3392, [1280, 2560]) },
  isNight: false,
  standing: standingFixture,
  locations: [
    {
      id: 'coalport.mill-gate',
      name: 'Mill Gate',
      kind: 'factory-gate',
      blurb: 'The gates of the Coalport Steel Mill.',
      n: 1,
      map: { x: 0.36, y: 0.44 },
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
          order: { id: 'dir.shift-change', title: 'Be at the gate', progress: 1, target: 2 },
          locked: null,
        },
        {
          id: 'coalport.mill-gate.shift',
          name: 'Work your shift at the mill',
          type: 'job',
          kind: 'shift',
          givesFxp: false,
          energy: 4,
          energy3: null,
          preview: null,
          shift: { jobId: 'factory-worker', held: false, workedToday: false, nextShiftAt: null },
          order: null,
          locked: null,
        },
      ],
      jobs: [
        {
          jobId: 'factory-worker',
          name: 'Factory worker',
          blurb: 'Rolling floor at the Coalport Steel Mill.',
          pay: 216,
          shiftEnergy: 4,
          held: false,
          locked: null,
          unmet: [],
          switchCost: 0,
        },
      ],
    },
    {
      id: 'coalport.union-hall',
      name: 'Union Hall',
      kind: 'faction-hq',
      blurb: "The Collective's hall.",
      n: 3,
      map: { x: 0.66, y: 0.3 },
      actions: [
        {
          id: 'coalport.union-hall.reading-room',
          name: 'Study in the reading room',
          type: 'training',
          kind: 'training',
          givesFxp: false,
          energy: 44,
          energy3: 138,
          preview: null,
          trains: { stat: 'int', from: 12, to: 13 },
          order: null,
          locked: null,
        },
      ],
      jobs: [],
    },
  ],
};

export const paperViewFixture: PaperView = {
  day: DAY,
  firstEdition: true,
  paper: { name: 'The Coalport Clarion', strapline: 'The voice of the mill and the quays', price: '5 marks' },
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
    streak: null,
    restedBanked: 0,
    daysSinceLastPaper: null,
    yesterday: null,
    jobName: null,
    energy: { value: 100, max: 100, fullAt: null },
    rested: { value: 0, cap: 200 },
    level: { level: 1, xpToNext: 150, next: 2, statPointsPending: 0 },
    workStreak: null,
    standing: standingFixture,
  },
  readAt: null,
  due: true,
};
