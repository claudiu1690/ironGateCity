/**
 * Shared vocabulary and DTOs. The server builds these; the client and `@irongate/ui` render them.
 * Kept in the rules package so every layer imports types from one place.
 */
import type { DayKey } from './day';

export const FACTION_IDS = ['vanguard', 'collective', 'alliance'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export const STAT_KEYS = ['str', 'int', 'agi', 'cha'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
/** Stats as a check sees them; `cha` is already the worn value (§8.2). */
export type Stats = Record<StatKey, number>;
/** A check uses one stat or the average of two (§8.4). */
export type CheckStats = [StatKey] | [StatKey, StatKey];
/** CHA is never trained (§8.5). */
export const TRAINABLE_STATS = ['str', 'int', 'agi'] as const;
export type TrainableStat = (typeof TRAINABLE_STATS)[number];
/** Stat points from levels go to STR or INT (§5.3). */
export const STAT_POINT_TARGETS = ['str', 'int'] as const;
export type StatPointTarget = (typeof STAT_POINT_TARGETS)[number];

export type CityRole = 'home' | 'battleground';
export type Tier = 1 | 2 | 3;
export type Outcome = 'success' | 'partial' | 'failure';
export type OpinionShares = Record<FactionId | 'neutral', number>;

export interface CheckBonus {
  id: string;
  label: string;
  value: number;
}

export interface CheckBreakdown {
  /** The stat(s) checked; two stats are averaged. */
  stats: CheckStats;
  /** One value per stat, in the same order. */
  statValues: number[];
  /** The value the formula uses: the stat, or the average of the two. */
  statValue: number;
  difficulty: number;
  base: number;
  statTerm: number;
  bonuses: CheckBonus[];
  bonusTotal: number;
  /** Before clamping. */
  raw: number;
  /** Clamped to CHECK.min..CHECK.max; a roll at or below it succeeds. */
  chance: number;
}

export interface ActionAttempt {
  /** 1-based. */
  index: number;
  check: CheckBreakdown;
  roll: number;
  outcome: Outcome;
}

export interface RewardLine {
  base: number;
  bonus: number;
  total: number;
}

export interface Rewards {
  xp: RewardLine;
  fxp: RewardLine;
  iron: RewardLine;
  /** Percentage points toward the actor's faction; 0 when the action gives none. Three decimals. */
  opinion: number;
}

export interface EnergyView {
  value: number;
  max: number;
  /** The projection's timestamp: stored `updatedAt` advanced by whole ticks. Re-projecting from it is exact. */
  updatedAt: number;
  nextTickAt: number | null;
  fullAt: number | null;
}

// ---------------------------------------------------------------------------------------------
// Rules-owned DSLs that content is validated against (Party orders, headlines).
// ---------------------------------------------------------------------------------------------

/** What a performed thing was, for order matching (ADR 0009). */
export type ActionKind = 'checked' | 'training' | 'shift' | 'takeJob';
export const ACTION_KINDS = ['checked', 'training', 'shift', 'takeJob'] as const;

export interface ActionDescriptor {
  kind: ActionKind;
  actionId?: string;
  type?: string;
  locationId?: string;
  cityId?: string;
}

/** AND of the fields present. `cityId: 'home'` means the actor's home city. */
export interface OrderMatch {
  actionTypes?: string[];
  actionIds?: string[];
  locationIds?: string[];
  cityId?: string;
  kinds?: ActionKind[];
}

export type OrderSlot = 'A' | 'B' | 'C';

export interface OrderTemplate {
  id: string;
  factionId: FactionId;
  slot: OrderSlot;
  title: string;
  line: string;
  match: OrderMatch;
  target: number;
  counts: 'attempts' | 'successes';
  /** The variant for a player without a job (e.g. "Take a job"). Counts attempts. */
  noJob?: { title: string; line: string; match: OrderMatch; target: number };
}

export interface OrderItem {
  templateId: string;
  variant: 'main' | 'noJob';
  target: number;
  progress: number;
  /** Epoch ms, or null while open. */
  doneAt: number | null;
}

export interface OrdersState {
  day: DayKey;
  items: OrderItem[];
  allDoneAt: number | null;
}

export type HeadlineGroup = 'personal' | 'city' | 'ambient';

export type HeadlineCondition =
  | { kind: 'firstEdition' }
  | { kind: 'rankRose' }
  | { kind: 'levelRose' }
  | { kind: 'standingRose' }
  | { kind: 'ordersAllDoneYesterday' }
  | { kind: 'streakHitYesterday'; values: number[] }
  | { kind: 'daysSinceLastPaper'; min: number }
  | { kind: 'idleYesterday' }
  | { kind: 'noPersonal' }
  | { kind: 'homeShare'; min?: number; max?: number };

export interface HeadlineTemplate {
  id: string;
  cityId: string;
  group: HeadlineGroup;
  /** Lower first. */
  priority: number;
  /** AND; [] = always. */
  when: HeadlineCondition[];
  headline: string;
  deck?: string;
}

/** The only `{…}` placeholders content text may use; resolved on the server. */
export const PLACEHOLDERS = [
  'name',
  'level',
  'rank',
  'energyYesterday',
  'standing',
  'bonus',
  'days',
  'iron',
  'share',
  'streak',
  'ordersTitle',
  'ordersLine',
] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

// ---------------------------------------------------------------------------------------------
// Views (docs/tech/slice-1.md §7.2)
// ---------------------------------------------------------------------------------------------

/** The Today tally (§3.7): the current City Day's running totals. */
export interface DailyTally {
  day: DayKey | null;
  energy: number;
  /** Rows of checked actions. */
  attempts: number;
  successes: number;
  xp: number;
  fxp: number;
  /** Actions and pay. */
  iron: number;
  pc: number;
  /** Swing actually applied to the meter, three decimals. */
  opinion: number;
  ordersDone: number;
  shiftWorked: boolean;
  statTrained: number;
}

export interface StandingView {
  level: 0 | 1 | 2 | 3 | 4;
  successes: number;
  /** Successes at which the current level began. */
  floor: number;
  /** Successes for the next level, or null at One of Us. */
  next: number | null;
  /** % on checks in that city. */
  bonus: number;
}

export interface NamedStandingView extends StandingView {
  cityId: string;
  cityName: string;
  /** "Familiar". */
  name: string;
  /** "Known", or null at the top. */
  nextName: string | null;
}

export interface AssetView {
  id: string;
  /** Intrinsic size of the (cropped) image, for its aspect ratio. */
  width: number;
  height: number;
  /** Generated widths; files are /art/<id>-<width>.avif|webp (ADR 0007). */
  widths: number[];
  alt: string;
}

export interface JobView {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  /** With the faction bonus (Factory worker: 216 for the Collective). */
  dailyPay: number;
  shiftEnergy: number;
  streak: number;
  shiftWorkedToday: boolean;
  /** The next City Day boundary once today's shift is worked, else null. */
  nextShiftAt: number | null;
}

export interface OrderView {
  id: string;
  title: string;
  line: string;
  progress: number;
  target: number;
  done: boolean;
}

export interface OrdersView {
  day: DayKey;
  resetsAt: number;
  issuer: { name: string; title: string; signature: string; portrait: AssetView } | null;
  items: OrderView[];
  allDone: boolean;
  rewards: { matchFxpBonusPct: number; orderDoneFxp: number; allDonePc: number };
}

export interface CharacterView {
  id: string;
  name: string;
  factionId: FactionId;
  /** Display name from content (faction naming is parked, so the client never hard-codes it). */
  factionName: string;
  homeCityId: string;
  cityId: string;
  stats: Stats;
  energy: EnergyView;
  rested: number;
  xp: number;
  level: number;
  fxp: number;
  iron: number;
  version: number;
  /** The server clock when this view was built; the client keeps the skew (§3.1). */
  serverNow: number;
  day: { key: DayKey; endsAt: number };
  rank: { value: number; title: string; fxpFloor: number; fxpNext: number | null };
  pc: number;
  statPointsPending: number;
  job: JobView | null;
  sickDaysLeft: number;
  /** Local Standing in the city the character is in. */
  standing: NamedStandingView;
  today: DailyTally;
  orders: OrdersView;
  paperDue: boolean;
}

export type ActionViewKind = 'checked' | 'training' | 'shift';

export interface ActionView {
  id: string;
  name: string;
  type: string;
  kind: ActionViewKind;
  /** Whether a matching Party order's +25 % FXP means anything here. */
  givesFxp: boolean;
  /** ×1 cost (training: the live 20 + 2 × stat; shift: the job's). */
  energy: number;
  /** ×3 total (training: the rising sum); null for shifts. */
  energy3: number | null;
  /** Checked actions only, Standing bonus included. */
  preview: CheckBreakdown | null;
  trains?: { stat: TrainableStat; from: number; to: number };
  shift?: { jobId: string; held: boolean; workedToday: boolean; nextShiftAt: number | null };
  /** An open Party order this action advances. */
  order: { id: string; title: string; progress: number; target: number } | null;
  locked: { reason: 'LEVEL' | 'STANDING'; need: number } | null;
}

export interface LocationJobView {
  jobId: string;
  name: string;
  blurb: string;
  pay: number;
  shiftEnergy: number;
  held: boolean;
  /** The first unmet requirement, or null when it can be taken. */
  locked: { reason: 'LEVEL' | 'STAT'; stat?: StatKey; need: number } | null;
  /** Every unmet requirement, level first ("Needs Level 3, AGI 10"). */
  unmet: Array<{ reason: 'LEVEL' | 'STAT'; stat?: StatKey; need: number }>;
  /** 0 for a first job, 2 Energy to switch. */
  switchCost: number;
}

export interface LocationView {
  id: string;
  name: string;
  kind: string;
  blurb: string;
  /** Pin number, 1-based. */
  n: number;
  /** Fractions of the map image. */
  map: { x: number; y: number };
  actions: ActionView[];
  jobs: LocationJobView[];
}

export interface CityView {
  id: string;
  name: string;
  role: CityRole;
  homeFactionId?: FactionId;
  opinion: OpinionShares;
  map: { day: AssetView; night: AssetView };
  isNight: boolean;
  standing: NamedStandingView;
  locations: LocationView[];
}

export interface BonusTag {
  id: string;
  label: string;
  note: string;
}

/** `batch` renders "n of N" (GDD §13.1). */
export type ResultStamp = 'success' | 'partial' | 'batch' | 'worked' | 'trained';

export interface ResultAttempt extends ActionAttempt {
  rewards: Rewards;
  restedUsed: number;
  /** The Party order this row advanced. */
  orderId: string | null;
}

export type ResultArt =
  { rung: 'scene'; asset: AssetView } | { rung: 'map-crop'; asset: AssetView; x: number; y: number };

export interface OrderEffect {
  id: string;
  title: string;
  before: number;
  after: number;
  target: number;
  done: boolean;
  /** 20 when completed by this action, else 0. */
  fxp: number;
}

/** The whole result modal (GDD §13.1a), stored verbatim in `actionLogs.result`. */
export interface ActionResult {
  logId: string;
  idempotencyKey: string;
  /** ISO 8601, UTC. */
  performedAt: string;
  seed: string;
  place: { cityId: string; cityName: string; locationId: string; locationName: string; kind: string };
  kind: ActionViewKind;
  action: { id: string; name: string; type: string; tier: 1; times: number };
  stamp: ResultStamp;
  /** Successes among `times` (checked actions). */
  successes: number;
  headline: string;
  body: string;
  art: ResultArt;
  /** Checked actions: one row per attempt. */
  attempts: ResultAttempt[];
  /** Training and shifts: one row per attempt, "no roll". */
  rows: Array<{ index: number; label: string; detail: string }>;
  rewards: Rewards;
  bonusTags: BonusTag[];
  effects: {
    energy: { before: number; after: number; max: number; nextTickAt: number | null };
    rested: { before: number; after: number };
    xp: { before: number; after: number };
    fxp: { before: number; after: number };
    iron: { before: number; after: number };
    level: number;
    opinion: {
      cityId: string;
      factionId: FactionId;
      /** The requested swing. */
      delta: number;
      /** What the floors let through. */
      applied: number;
      shareBefore: number;
      shareAfter: number;
    } | null;
    standing: { before: NamedStandingView; after: NamedStandingView } | null;
    levelUp: { from: number; to: number; statPoints: number } | null;
    rankUp: { from: number; to: number; title: string } | null;
    pc: { before: number; after: number } | null;
    orders: OrderEffect[];
    ordersAllDone: { pc: number } | null;
    stat: { stat: TrainableStat; before: number; after: number } | null;
    shift: {
      half: number;
      streakBonus: number;
      streakPct: number;
      streak: { before: number; after: number };
      sickDaysLeft: number;
      nextShiftAt: number;
    } | null;
  };
  /** The Today tally after this tap. */
  today: DailyTally;
  /** Live costs for the modal's Again buttons (training rises); null for shifts. */
  again: { cost1: number; cost3: number } | null;
  character: CharacterView;
}

export interface DeskView {
  /** Frozen at settlement. */
  salary: { jobName: string; days: number; perDay: number; total: number } | null;
  streak: { before: number; after: number; sickDaysUsed: number; broken: boolean } | null;
  restedBanked: number;
  daysSinceLastPaper: number | null;
  yesterday: DailyTally | null;
  /** Live at read. */
  jobName: string | null;
  energy: { value: number; max: number; fullAt: number | null };
  rested: { value: number; cap: number };
  level: { level: number; xpToNext: number; next: number; statPointsPending: number };
  workStreak: { streak: number; sickDaysLeft: number } | null;
  standing: NamedStandingView;
}

export interface PaperView {
  day: DayKey;
  firstEdition: boolean;
  paper: { name: string; strapline: string; price: string };
  dateline: { weekday: string; date: string; city: string };
  headlines: Array<{ group: HeadlineGroup; headline: string; deck?: string }>;
  orders: OrdersView;
  desk: DeskView;
  readAt: number | null;
  due: boolean;
}

export type GameErrorReason =
  | 'NOT_ENOUGH_ENERGY'
  | 'WRONG_CITY'
  | 'UNKNOWN_CITY'
  | 'UNKNOWN_ACTION'
  | 'UNKNOWN_LOCATION'
  | 'ACTION_CONFLICT'
  | 'ACTION_LOCKED'
  | 'KEY_REUSED'
  | 'NO_STAT_POINTS'
  | 'UNKNOWN_JOB'
  | 'JOB_LOCKED'
  | 'ALREADY_IN_JOB'
  | 'NOT_YOUR_JOB'
  | 'SHIFT_ALREADY_WORKED'
  | 'SHIFT_IS_ONCE';

/** `error.data.game` on a tRPC error: a reason the client can switch on, plus its numbers. */
export interface GameErrorData {
  reason: GameErrorReason;
  [key: string]: unknown;
}
