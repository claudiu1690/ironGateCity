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

/** Counts in `min` / `max` conditions are inclusive, except `homeShare`'s max (see paper.ts). */
export type HeadlineCondition =
  | { kind: 'firstEdition' }
  /** The rank rose since the last paper; optionally only to one of `values`, or to `min` or higher. */
  | { kind: 'rankRose'; values?: number[]; min?: number }
  | { kind: 'levelRose' }
  | { kind: 'standingRose' }
  | { kind: 'ordersAllDoneYesterday' }
  | { kind: 'streakHitYesterday'; values: number[] }
  | { kind: 'daysSinceLastPaper'; min: number }
  | { kind: 'idleYesterday' }
  /** Half-pays credited at the boundaries since the last paper (content §13.1). */
  | { kind: 'halfPaysCredited'; min?: number; max?: number }
  /** Energy spent on the previous City Day (0 when the player was not seen). */
  | { kind: 'energyYesterday'; min?: number; max?: number }
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

/**
 * The placeholders story texts (origin steps, the street, Ambition chapters) may use (slice-2 tech
 * design §4.4): the character's name, the faction secretary's form of address, the HQ's short
 * reference and the home city's name. Resolved on the server before any text leaves it.
 */
export const STORY_PLACEHOLDERS = ['name', 'secretary', 'hq', 'city'] as const;
export type StoryPlaceholder = (typeof STORY_PLACEHOLDERS)[number];

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
  /** `svg`: one file at /art/<id>.svg (the faction crests, ADR 0015); `raster`: AVIF/WebP widths. */
  format: 'raster' | 'svg';
  /** Intrinsic size of the (cropped) image, for its aspect ratio. */
  width: number;
  height: number;
  /** Generated widths; files are /art/<id>-<width>.avif|webp (ADR 0007). Empty for `svg`. */
  widths: number[];
  alt: string;
  /** Where a cropping panel should centre the image (fractions, ADR 0015), or null for the centre. */
  focus: { x: number; y: number } | null;
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
  /** The home-city pin where a tap would advance this order (slice-2 tech design §7.3), or null. */
  pin: { locationId: string; n: number } | null;
}

export interface OrdersView {
  day: DayKey;
  resetsAt: number;
  issuer: { name: string; title: string; signature: string; portrait: AssetView };
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
  /** The chosen face, or null (migrated characters, ADR 0016: the HUD shows the crest). */
  avatar: AssetView | null;
  /** The origin's CHA base (0–4); `stats.cha` is the worn total (§8.2). */
  chaBase: number;
  /** The clothing worn (§8.2), for the Me tab and the paper's desk. */
  wearing: { itemId: string; name: string; cha: number } | null;
  /** The party card, as a line on the Me tab (onboarding §4.2). */
  partyCard: { factionName: string; rankTitle: string; memberSince: number } | null;
  keepsakes: Array<{ itemId: string; name: string; art: AssetView }>;
  ambition: {
    id: string;
    title: string;
    chapter: number;
    status: ChapterStatusKind;
    readyFrom: number | null;
  };
  /** The Paper tab's dot for a Letter (§20 Q8): 1 while a chapter is ready, else 0. */
  lettersWaiting: number;
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
  /** ×3 total; null for training and shifts (×1 only, §8.5, §13.1). */
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

/** `batch` renders "n of N" (GDD §13.1); `failure` only for tier-3 checks (Ambition chapters). */
export type ResultStamp = 'success' | 'partial' | 'failure' | 'batch' | 'worked' | 'trained';

/** What a result is: a tier-1 action kind, or an Ambition chapter (slice-2 tech design §9). */
export type ActionResultKind = ActionViewKind | 'chapter';

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
  kind: ActionResultKind;
  action: { id: string; name: string; type: string; tier: 1 | 3; times: number };
  stamp: ResultStamp;
  /** Ambition chapters only: what the modal's kicker needs. */
  story: {
    ambitionId: string;
    ambitionTitle: string;
    chapter: number;
    of: number;
    approachId: string;
    choiceText: string;
  } | null;
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
    /** A chapter's keepsake ("Keepsake: his ward book"). */
    item: { itemId: string; name: string; keepsake: boolean; art: AssetView } | null;
    /** Next-chapter hooks, already worded. */
    hooks: string[];
  };
  /** The Today tally after this tap. */
  today: DailyTally;
  /**
   * Live costs for the modal's Again buttons (training rises); `cost3` is null for training (×1
   * only, §8.5); the whole field is null for shifts.
   */
  again: { cost1: number; cost3: number | null } | null;
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
  /** "Wearing: Your father's coat · CHA 5" (slice-2 tech design §10). */
  wearing: { name: string; cha: number } | null;
}

/** A Letters row (§3.3 v2): an Ambition chapter that is ready or waiting mid-way. */
export interface LetterView {
  kind: 'chapter';
  /** "From your father's things". */
  from: string;
  /** "His ward book". */
  title: string;
  /** The chapter number ("Chapter 1 is ready"). */
  chapter: number;
  status: 'ready' | 'midway';
  energy: number;
}

export interface PaperView {
  day: DayKey;
  firstEdition: boolean;
  paper: { name: string; shortName: string; strapline: string; price: string };
  dateline: { weekday: string; date: string; city: string };
  headlines: Array<{ group: HeadlineGroup; headline: string; deck?: string }>;
  orders: OrdersView;
  desk: DeskView;
  letters: LetterView[];
  /** The first edition's "To the city": the first pin's sheet (slice-2 tech design §10). */
  landing: { cityId: string; locationId: string } | null;
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
  | 'SHIFT_IS_ONCE'
  | 'TRAINING_IS_ONCE'
  // Slice 2 (tech design §7.1).
  | 'ARRIVAL_PENDING'
  | 'ALREADY_ARRIVED'
  | 'NO_FACE'
  | 'ORIGIN_INCOMPLETE'
  | 'OUT_OF_ORDER'
  | 'UNKNOWN_ANSWER'
  | 'UNKNOWN_AVATAR'
  | 'CHAPTER_NOT_READY'
  | 'CHOOSE_FIRST'
  | 'UNKNOWN_CHOICE'
  | 'UNKNOWN_APPROACH';

/** `error.data.game` on a tRPC error: a reason the client can switch on, plus its numbers. */
export interface GameErrorData {
  reason: GameErrorReason;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------------------------
// Slice 2 views (docs/tech/slice-2.md §7.3): tier-3 stories share one screen (ADR 0013).
// ---------------------------------------------------------------------------------------------

export type ChapterStatusKind = 'none' | 'waiting' | 'ready' | 'midway';

/** One tier-3 story screen, every text resolved on the server (ADR 0013). */
export interface StoryScreenView {
  kicker: string;
  title: string;
  narrative: string;
  art:
    | { kind: 'scene'; asset: AssetView; focus: { x: number; y: number } | null }
    | { kind: 'map-crop'; asset: AssetView; x: number; y: number };
  /** The speaker beside the question (the father), or null. */
  portrait: AssetView | null;
  /** The answer just given, as one line in Courier ("You went fishing with him."), or null. */
  echo: string | null;
  /** The question, or null. */
  prompt: string | null;
  /** One tap commits. */
  choices: Array<{ id: string; text: string; hint: string | null }>;
  /** Chapter step 2: pick one, then the CTA. */
  approaches: Array<{ id: string; text: string; check: CheckBreakdown }>;
  /** `readyAt` null = affordable now. */
  cta: { label: string; energy: number; readyAt: number | null } | null;
  progress: { step: number; of: number };
}

/** A faction card on the street (§7.3). */
export interface FactionCardView {
  factionId: FactionId;
  name: string;
  crest: AssetView;
  blurb: string;
  /** "+3 Strength" · "Starts in Duskwall" · "Their event: the Grand Rally". */
  facts: [string, string, string];
  /** The father's wish matches this faction. */
  wish: boolean;
  /** "His wish · +50 Faction XP" on the matching card, else null. */
  wishLabel: string | null;
  /** "Join the Iron Vanguard · take the train to Duskwall". */
  confirm: string;
}

export interface ArrivalView {
  phase: 'face' | 'story' | 'street' | 'arrived';
  name: string;
  avatar: AssetView | null;
  /** Phase 'face' only. */
  faces: AssetView[] | null;
  /** Phase 'story': the next unanswered question, and its id for `arrival.answer`. */
  screen: StoryScreenView | null;
  questionId: string | null;
  street: { screen: StoryScreenView; note: string; cards: FactionCardView[] } | null;
  /** Phase 'arrived'. */
  landing: { cityId: string; locationId: string } | null;
}

export interface AmbitionView {
  id: string;
  title: string;
  chapter: number;
  of: number;
  chapterTitle: string;
  status: ChapterStatusKind;
  /** Epoch ms of the start of the day the next chapter opens, while waiting. */
  readyFrom: number | null;
  needs: { rank?: number; level?: number } | null;
  /** ready → the choose screen; midway → the check screen. */
  screen: StoryScreenView | null;
  letterFrom: string | null;
}
