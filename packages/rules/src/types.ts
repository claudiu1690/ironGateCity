/**
 * Shared vocabulary and DTOs. The server builds these; the client and `@irongate/ui` render them.
 * Kept in the rules package so every layer imports types from one place.
 */
import type { CouncilPhase } from './calendar';
import type { CountRow } from './council';
import type { DayKey } from './day';
import type { MoraleState } from './morale';
import type { OrdinanceTagView } from './ordinances';

export const FACTION_IDS = ['vanguard', 'collective', 'alliance'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export const STAT_KEYS = ['str', 'int', 'agi', 'cha'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
/** Stats as a check sees them; `cha` is already the worn value (§8.2). */
export type Stats = Record<StatKey, number>;
/** A check uses one stat or the average of two (§8.4). */
export type CheckStats = [StatKey] | [StatKey, StatKey];
/**
 * What content names for a check: a stat, two stats, or (review 1, §8.4) `['best']`, the highest of
 * STR, INT and AGI, which `computeCheck` resolves to one stat.
 */
export type CheckStatSpec = CheckStats | ['best'];
/** CHA is never trained (§8.5). */
export const TRAINABLE_STATS = ['str', 'int', 'agi'] as const;
export type TrainableStat = (typeof TRAINABLE_STATS)[number];
/** Stat points from levels go to STR, INT or AGI (§5.3, review 1). */
export const STAT_POINT_TARGETS = ['str', 'int', 'agi'] as const;
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
  /** The stat(s) checked; two stats are averaged. A best-stat check names the stat it took. */
  stats: CheckStats;
  /** Review 1: a best-stat check (the committee, *Legwork*); absent on older stored results. */
  best?: boolean;
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

/** A named part of a line's bonus: *Rested +5*, *Party order +2*, *Fired up +1*, *Ward Fund +5*. */
export interface RewardPart {
  id: string;
  label: string;
  /** May be negative (a shift under the Ward Fund: −27). */
  amount: number;
}

export interface RewardLine {
  base: number;
  /** Σ parts when `parts` is present. */
  bonus: number;
  total: number;
  /**
   * Slice 3 (ADR 0021): the bonus's named parts, present when an ordinance or morale contributed.
   * Absent on stored slice 0–2 results; the UI treats absent as none.
   */
  parts?: RewardPart[];
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
export type ActionKind = 'checked' | 'training' | 'takeJob';
export const ACTION_KINDS = ['checked', 'training', 'takeJob'] as const;

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
  /**
   * Slice 3: `crisis` templates (Restore the base) never enter the rotation. Review 1: `welcome`
   * templates (the welcome set's slot A by best stat, *Take a job*) are only ever welcome-day
   * orders. Default `rotation`.
   */
  use?: 'rotation' | 'crisis' | 'welcome';
  /** FXP for completing it; default DIRECTIVES.orderDoneFxp (20). Restore the base pays 40. */
  doneFxp?: number;
}

export interface OrderItem {
  templateId: string;
  /** `noJob` only on items stored before review 1 (the retired *Take a job* variant). */
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
  /** Review 1: seniority first reached or passed one of `values` at the boundaries settled. */
  | { kind: 'seniorityHitYesterday'; values: number[] }
  | { kind: 'daysSinceLastPaper'; min: number }
  | { kind: 'idleYesterday' }
  /** Days of pay credited at the boundaries since the last paper (content §13.1, review 1). */
  | { kind: 'daysPaid'; min?: number; max?: number }
  /** Energy spent on the previous City Day (0 when the player was not seen). */
  | { kind: 'energyYesterday'; min?: number; max?: number }
  | { kind: 'noPersonal' }
  | { kind: 'homeShare'; min?: number; max?: number }
  | PoliticalCondition;

/**
 * Slice 3 (ADR 0023): the political headline conditions. A template uses political kinds only, or
 * none; political templates are selected live at read, never at settlement.
 */
export type PoliticalCondition =
  /** Elected at last night's count; `top` = first of seven. */
  | { kind: 'seatWon'; top?: boolean }
  /** Stood at last night's count and was not elected; `tie` = lost on a tie-break (margin 0). */
  | { kind: 'seatLost'; tie?: boolean }
  /** The candidate the player voted for at last night's count won or lost (`tie` as above). */
  | { kind: 'votedFor'; won: boolean; tie?: boolean }
  /** Declared yesterday, and today is still nominations. */
  | { kind: 'filedYesterday' }
  /** Filed; the nominations closed last night with the name on the ballot or struck. */
  | { kind: 'nominationsClosed'; struck: boolean }
  /** A council term held ended at last night's count. */
  | { kind: 'termEnded' }
  /** A councillor; the council divided last night. */
  | { kind: 'divided'; passed: boolean }
  /** Moved an ordinance yesterday. */
  | { kind: 'movedYesterday' }
  /** The home election was counted last night. */
  | { kind: 'countToday' }
  | { kind: 'phaseToday'; phase: CouncilPhase; cycleDay?: number }
  /** An ordinance took effect this morning. */
  | { kind: 'ordinanceFromToday' }
  /** Morale rose out of Unrest at last night's boundary. */
  | { kind: 'leftUnrest' };

export const POLITICAL_CONDITION_KINDS = [
  'seatWon',
  'seatLost',
  'votedFor',
  'filedYesterday',
  'nominationsClosed',
  'termEnded',
  'divided',
  'movedYesterday',
  'countToday',
  'phaseToday',
  'ordinanceFromToday',
  'leftUnrest',
] as const satisfies ReadonlyArray<PoliticalCondition['kind']>;

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
  'job',
  /** Review 1: the welcome set's slot-A place ("the Customs Market"), for the welcome deck. */
  'place',
  'ordersTitle',
  'ordersLine',
] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/**
 * Slice 3 (tech design §4.3): the placeholders political headlines and the political result texts
 * may use. All are resolved on the server except the time tokens `{until}` and `{at}`, which travel
 * as epoch ms and are rendered in the player's clock.
 */
export const POLITICAL_PLACEHOLDERS = [
  'name',
  'city',
  'paper',
  'ordinal',
  'votes',
  'margin',
  'winner',
  'last',
  'voted',
  'turnout',
  'npcSeats',
  'ordinance',
  'ordinanceLine',
  'endorsements',
  'n',
  'weekday',
  'countDay',
  /** Review 2 (answers §4.4): the *Next* lines' weekdays, voting opens and the council's result. */
  'pollsWeekday',
  'resultWeekday',
] as const;
export type PoliticalPlaceholder = (typeof POLITICAL_PLACEHOLDERS)[number];
export const TIME_TOKENS = ['until', 'at'] as const;

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

/**
 * ADR 0024 (maps v3): a map's Deep Zoom pyramid, without its host. The client puts it under its tile
 * origin: `${origin}/${path}/<format>_files/<level>/<col>_<row>.<format>` (maps v3 §9.2: AVIF).
 */
export interface TileSource {
  /** `<assetId>/<rev>`; a re-exported master gets a new rev, so a new path. */
  path: string;
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  maxLevel: number;
  format: 'avif' | 'webp';
}

/** A rectangle of a picture in fractions of it (maps v3: a quarter's frame). */
export interface Frame {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
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
  /** The WebP fallback's widths when fewer than `widths` (maps v3: 1024 only); absent: `widths`. */
  webpWidths?: number[];
  alt: string;
  /** Where a cropping panel should centre the image (fractions, ADR 0015), or null for the centre. */
  focus: { x: number; y: number } | null;
  /** ADR 0024: the map's tile pyramid; null for every other asset (and a map not tiled). */
  tiles: TileSource | null;
}

export interface JobView {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  /** With the faction bonus (Factory worker: 216 for the Collective). */
  dailyPay: number;
  /** Review 1 (§9.1): days held (boundaries paid) and the seniority share now (0.08 = +8 %). */
  seniority: { days: number; pct: number };
  /** The next boundary, when the wage is paid. */
  paidAt: number;
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
  /**
   * Review 1 (GDD §13.7): the orders-complete note, while today's three are done and it has not
   * been seen (*Carry on*). `fxp` sums today's completions; `pc` is the all-done PC.
   */
  complete: { pc: number; fxp: number } | null;
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
  /**
   * `nextTitle`: the next Rank's title (the HUD's FXP bar), null at the top Rank; `ladder`: the
   * faction's seven titles, Rank 1 first (the notes name the vote at Rank 2, the candidacy at 3).
   */
  rank: {
    value: number;
    title: string;
    fxpFloor: number;
    fxpNext: number | null;
    nextTitle: string | null;
    ladder: string[];
  };
  pc: number;
  statPointsPending: number;
  job: JobView | null;
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
  /**
   * The Paper tab's dot for a Letter: 1 while a chapter is ready, whether or not the Letter was
   * opened; 0 once it is played or midway (onboarding §14.3 n7, which supersedes §13 Q8).
   */
  lettersWaiting: number;
  /** Slice 3: the seat held today ("Councillor, Coalport · term ends Thursday"), or null. */
  office: { cityId: string; cityName: string; seat: number; termEndsAt: number } | null;
  /**
   * Slice 3: the Paper tab's dot for politics: 1 while a ballot can be cast and has not been, or a
   * councillor's ordinance vote is open and not cast; never for nominations.
   */
  politicsWaiting: 0 | 1;
  /** Slice 3: today's Rested cap in the home city (Rest Day Order: 250), for the client projection. */
  restedCap: number;
  /**
   * Review 1 (§8.4, §7.5): today is the welcome day (the creation day, and the next when created
   * after 22:00 UTC): the *First day* bonus and the plate's first-time hint.
   */
  welcomeDay: boolean;
  /**
   * Review 1 (§5.3): what the stat-point choice screen says, from the residence city's checked
   * actions: how many use each stat, the most common, and the player's best.
   */
  statGuide: {
    cityName: string;
    total: number;
    counts: Record<StatPointTarget, number>;
    lead: StatPointTarget;
    best: { stat: TrainableStat; value: number };
  };
}

export type ActionViewKind = 'checked' | 'training';

export interface ActionView {
  id: string;
  name: string;
  type: string;
  kind: ActionViewKind;
  /** Whether a matching Party order's +25 % FXP means anything here. */
  givesFxp: boolean;
  /** ×1 cost (training: the live 20 + 2 × stat). */
  energy: number;
  /** ×3 total; null for training (×1 only, §8.5, §13.1). */
  energy3: number | null;
  /** Checked actions only, Standing bonus included. */
  preview: CheckBreakdown | null;
  trains?: { stat: TrainableStat; from: number; to: number };
  /**
   * Review 3 (GDD §8.5): a training action's button, the title's verb (*Study*, *Lift*, *Run*,
   * *Unload*); content `TrainingAction.verb`. Absent for checked actions.
   */
  verb?: string;
  /** An open Party order this action advances. */
  order: { id: string; title: string; progress: number; target: number } | null;
  locked: { reason: 'LEVEL' | 'STANDING'; need: number } | null;
  /** Slice 3: the ordinance in force's tags ("Rally Permits: 10 Energy", "Open Doors: +4 %"). */
  tags: OrdinanceTagView[];
}

export interface LocationJobView {
  jobId: string;
  name: string;
  blurb: string;
  pay: number;
  held: boolean;
  /** The first unmet requirement, or null when it can be taken. */
  locked: { reason: 'LEVEL' | 'STAT'; stat?: StatKey; need: number } | null;
  /** Every unmet requirement, level first ("Needs Level 3, AGI 10"). */
  unmet: Array<{ reason: 'LEVEL' | 'STAT'; stat?: StatKey; need: number }>;
  /** Review 1: a switch is free and resets seniority; true when another job is held. */
  isSwitch: boolean;
}

export interface LocationView {
  id: string;
  name: string;
  kind: string;
  blurb: string;
  /** The name in running text, "the Union Hall" (review 2: a result's reason line). */
  ref?: string;
  /** Pin number, 1-based. */
  n: number;
  /** Fractions of the map image. */
  map: { x: number; y: number };
  actions: ActionView[];
  jobs: LocationJobView[];
  /** Slice 3: the council card, on the home faction's HQ only. */
  council: PoliticsSummaryView | null;
}

export interface CityView {
  id: string;
  name: string;
  role: CityRole;
  homeFactionId?: FactionId;
  opinion: OpinionShares;
  map: { day: AssetView; night: AssetView };
  /** Maps v3: the city's quarters, frames on its picture; the city view opens on the first. */
  quarters: Array<{ id: string; name: string; frame: Frame }>;
  /** Map atmosphere: clouds by day and fog by night drift over the map (content `City.clouds`). */
  clouds?: boolean;
  isNight: boolean;
  standing: NamedStandingView;
  locations: LocationView[];
  /** Slice 3: the home share as morale, for a home city (the plate's state word). */
  morale: { factionId: FactionId; share: number; state: MoraleState } | null;
  /** Slice 3: the ordinance in force ("Ordinance: Shift Hours Order · 3 days left"). */
  ordinance: { ordinanceId: string; name: string; line: string; effectLine: string; daysLeft: number } | null;
  /** Review 2: the home city's Election card (screens §1a); null elsewhere. */
  election: PoliticsSummaryView | null;
}

export interface BonusTag {
  id: string;
  label: string;
  note: string;
}

/** `batch` renders "n of N" (GDD §13.1); `failure` only for tier-3 checks (Ambition chapters). */
export type ResultStamp = 'success' | 'partial' | 'failure' | 'batch' | 'trained';

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
  /** Training: one row per attempt, "no roll". */
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
    /**
     * Review 1 (§13.4): a Standing level crossed by this action, for the Standing card; the texts
     * are copy. `rank3Title`: the faction's Rank 3 title (the candidacy line).
     */
    standingUp?: { level: 1 | 2 | 3 | 4; cityName: string; rank3Title: string } | null;
    levelUp: { from: number; to: number; statPoints: number } | null;
    rankUp: { from: number; to: number; title: string } | null;
    pc: { before: number; after: number } | null;
    orders: OrderEffect[];
    ordersAllDone: { pc: number } | null;
    stat: { stat: TrainableStat; before: number; after: number } | null;
    /** A chapter's keepsake ("Keepsake: his ward book"). */
    item: { itemId: string; name: string; keepsake: boolean; art: AssetView } | null;
    /** Next-chapter hooks, already worded. */
    hooks: string[];
    /** Slice 3: the action moved the home city across a morale threshold. */
    morale?: { cityId: string; cityName: string; before: MoraleState; after: MoraleState } | null;
    /** Slice 3: completing the third order made the branch endorse the caller's candidacy. */
    branchEndorsement?: { endorsements: number; needed: number; smallBranch: boolean } | null;
  };
  /** The Today tally after this tap. */
  today: DailyTally;
  /**
   * Live costs for the modal's Again buttons (training rises); `cost3` is null for training (×1
   * only, §8.5).
   */
  again: {
    cost1: number;
    cost3: number | null;
    /** Review 3: a *Trained* result's repeat button, "{verb} again · {cost} Energy" (absent before it). */
    verb?: string;
  } | null;
  character: CharacterView;
}

export interface DeskView {
  /**
   * Frozen at settlement (review 1: the wage). `perDay` is the daily pay with the member's fifth;
   * `seniority` the days held after the boundaries and the line's amount; `ordinance` the pay
   * ordinances' adjustment (slice 3).
   */
  salary: {
    jobName: string;
    days: number;
    perDay: number;
    seniority: { days: number; pct: number; amount: number };
    total: number;
    ordinance: { label: string; amount: number } | null;
  } | null;
  /** Slice 3: the councillor's stipend credited at this settlement. */
  stipend: { boundaries: number; pc: number; fxp: number; cityName: string } | null;
  /** Slice 3: deposits returned for struck candidacies. */
  deposits: { count: number; pc: number } | null;
  /** Review 1 (§13.4): the PC One of Us paid at this settlement (0 when none). */
  oneOfUsPc: number;
  restedBanked: number;
  daysSinceLastPaper: number | null;
  yesterday: DailyTally | null;
  /** Live at read. */
  jobName: string | null;
  energy: { value: number; max: number; fullAt: number | null };
  rested: { value: number; cap: number };
  level: { level: number; xpToNext: number; next: number; statPointsPending: number };
  /** Review 1: the job held now, with its seniority, for the desk's job row; null without one. */
  job: { name: string; dailyPay: number; seniority: { days: number; pct: number } } | null;
  /** Without a job (else []): where the home city's jobs are ("the Fortress Gate, the Customs Market or the Goods Yard"). */
  jobPlaces: string[];
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
  /** `until`: the epoch ms a `{until}` token in the text names (rendered in the player's clock). */
  headlines: Array<{ group: HeadlineGroup; headline: string; deck?: string; until?: number }>;
  orders: OrdersView;
  desk: DeskView;
  letters: LetterView[];
  /** Slice 3: the Polling Day row, live (ADR 0023). */
  pollingDay: PoliticsSummaryView | null;
  /** Slice 3: the front page, on the first edition a winner opens during the term. */
  frontPage: FrontPageView | null;
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
  | 'UNKNOWN_APPROACH'
  // Slice-2 QA m3: the name rule (§7.3) at the join; `problem` is blank, short or long.
  | 'BAD_NAME'
  // Slice 3 (tech design §6.8).
  | 'RANK_TOO_LOW'
  | 'NOT_KNOWN'
  | 'SITTING_COUNCILLOR'
  | 'NOT_NOMINATIONS'
  | 'NOT_POLLING'
  | 'ALREADY_FILED'
  | 'NOT_FILED'
  | 'UNKNOWN_PLATFORM'
  | 'NOT_ENOUGH_PC'
  | 'UNKNOWN_CANDIDACY'
  | 'CANDIDACY_CLOSED'
  | 'CANNOT_ENDORSE_SELF'
  | 'ALREADY_ENDORSED'
  | 'UNKNOWN_CANDIDATE'
  | 'ALREADY_VOTED'
  | 'NOT_COUNCILLOR'
  | 'COUNCIL_CLOSED'
  | 'UNKNOWN_ORDINANCE'
  | 'ALREADY_ON_PAPER'
  | 'ALREADY_PROPOSED'
  | 'PAPER_FULL'
  | 'NOT_ON_PAPER'
  | 'ALREADY_COUNCIL_VOTED'
  | 'UNKNOWN_ELECTION'
  | 'ELECTION_NOT_READY';

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
  needs: { rank?: number; level?: number; ballotCast?: boolean } | null;
  /** ready → the choose screen; midway → the check screen. */
  screen: StoryScreenView | null;
  letterFrom: string | null;
  /**
   * With no screen, while the next chapter waits (or is not written yet): the hook, "From Tuesday
   * 6 October, at Rank 2" (onboarding §14.3 n13), or null when no chapter follows.
   */
  waitsUntil: string | null;
}

// ---------------------------------------------------------------------------------------------
// Slice 3 views (docs/tech/slice-3.md §8.3, §10.1): the slate, the ballot, the count, the chamber,
// the Polling Day row and the front page. No view ever carries another voter's choice or a total
// before the count (ADR 0019).
// ---------------------------------------------------------------------------------------------

export type PoliticsState =
  'belowRank' | 'ballot' | 'councilSits' | 'filed' | 'stand' | 'count' | 'voted' | 'nominations';

/** The Polling Day row, the HQ council card and the Paper tab dot (one builder, screens §2.1, §7). */
export interface PoliticsSummaryView {
  cityId: string;
  cityName: string;
  cycleDay: number;
  phase: 'nominations' | 'polling';
  /** The first that applies, in this order (design §17 Q6). */
  state: PoliticsState;
  /** The boundary ending today's window (nominations or polls). */
  closesAt: number;
  pollsOpenAt: number | null;
  /** The next day the polls open, as a weekday ("Coalport votes from Thursday"). */
  pollsFromWeekday: string;
  countAt: number | null;
  divideAt: number | null;
  /** 'filed': counted endorsements so far. */
  endorsements: { n: number; needed: number; branchWillMakeUp: boolean } | null;
  /** Filed, and today's three orders are done: "All orders carried out · the branch endorses you". */
  branchLine: boolean;
  votedFor: string | null;
  /** The morning after a count. */
  count: {
    winner: string;
    npcSeats: number;
    seats: number;
    turnout: { voters: number; eligible: number };
  } | null;
  inForce: { ordinanceId: string; name: string; daysLeft: number } | null;
  rank2Title: string;
  /** Review 2: "Organisers who are Known here can stand" (the Election card's notes). */
  rank3Title: string;
  /** "Result Sunday morning, here and in the Clarion". */
  paperShortName: string;
  fxpToRank2: number | null;
  standCost: number;
  /** The caller is a councillor with the ordinance vote open. */
  councillor: boolean;
  route: '/council/slate' | '/council/ballot' | '/council/count' | '/council' | null;
  /** 'ballot' or 'councilSits'. */
  dot: boolean;
  /** Review 2 (slice-3 screens §1a, §2.1): the Election card's state and what it prints. */
  card: ElectionCardView;
}

/**
 * The Election card's states (slice-3 screens §2.1, review 2), the first that applies: below Rank 2;
 * a councillor's rule vote (open, or cast); voting (a candidate who has not voted, not voted,
 * voted); candidates (standing, backing someone, the last result on days 0–1, else the call).
 */
export type ElectionCardState =
  | 'belowRank'
  | 'councilSits'
  | 'councilVoted'
  | 'candidateVoting'
  | 'voting'
  | 'voted'
  | 'standing'
  | 'backing'
  | 'result'
  | 'candidates';

/** What the player's result line says on the morning of a count (screens §2.1 `{your line}`). */
export type ElectionYourLine =
  | { kind: 'elected'; place: number }
  | { kind: 'missed'; margin: number }
  | { kind: 'voteWon'; name: string }
  | { kind: 'voteLost'; name: string };

export interface ElectionCardView {
  state: ElectionCardState;
  /** The boundary closing the window the card counts down to (names in, voting, the rule vote). */
  closesAt: number;
  /** The boundaries of this cycle: voting opens, the result (the next count). */
  pollsOpenAt: number;
  countAt: number;
  /** Below Rank 2: "400 Party XP makes an Activist · you have 120". */
  fxp: number;
  rank2Fxp: number;
  /** Rank 3 and Known here, not standing and not seated: the Stand button. */
  canStand: boolean;
  /** Standing: backers so far. */
  backers: { n: number; needed: number; branchLine: boolean; branchWillMakeUp: boolean } | null;
  /** The name the player backs this cycle. */
  backing: string | null;
  /** Voting: the name voted for. */
  votedFor: string | null;
  /** Cycle days 0–1: the last count. */
  result: {
    winner: string;
    yourLine: ElectionYourLine | null;
    /** The boundary ending the new council's term. */
    councilUntil: number;
    /** The boundary closing the next election's names. */
    namesUntil: number;
  } | null;
  /** A councillor while the rule vote is open (days 0–1). */
  rule: { votedFor: string | null; divideAt: number } | null;
  /** The morning the player made Rank 2: the one-line note, once. */
  firstTime: boolean;
}

export interface EndorsementsView {
  /** Counted so far: members, plus the branch (twice in a small branch). */
  n: number;
  needed: number;
  branch: boolean;
  branchCounts: 1 | 2;
  /** Up to five names, then `more`. */
  names: string[];
  more: number;
}

export type EndorseRefusal = 'SELF' | 'ALREADY' | 'RANK' | 'PC' | 'CLOSED';

export interface CandidateView {
  /** 'p:<characterId>' | 'n:<npcId>'. */
  key: string;
  candidacyId: string | null;
  kind: 'player' | 'npc';
  name: string;
  /** NPCs: null (the ward mark in the ring). */
  avatar: AssetView | null;
  factionId: FactionId;
  /** null = "ward". */
  rankTitle: string | null;
  standing: { name: string; cityName: string; successes: number };
  wardVote: number;
  platform: string;
  endorsements: EndorsementsView | null;
  you: boolean;
  endorsedByYou: boolean;
  canEndorse: { ok: true } | { ok: false; reason: EndorseRefusal } | null;
}

/**
 * Review 3 (GDD §15.3, answers §6.1): the building the council sits in, a point on the city picture
 * (fractions, like a pin), and the city's map stills, for the election screens' header crop. The
 * client picks day or night by the map's rule (`isNight` on the server's clock).
 */
export interface HallView {
  name: string;
  /** In a sentence: "the Town Hall". */
  ref: string;
  x: number;
  y: number;
  asset: { day: AssetView; night: AssetView };
}

export interface ElectionView {
  electionId: string;
  cityId: string;
  cityName: string;
  phase: 'nominations' | 'polling';
  nominationsCloseAt: number;
  pollsOpenAt: number;
  countAt: number;
  /** Players by filing, then NPCs by profile (in nominations the provisional 9 − p). */
  candidates: CandidateView[];
  /** Nominations, and the caller has no candidacy this cycle. */
  declare: {
    requirements: Array<{
      id: 'rank' | 'known' | 'endorsements';
      met: boolean;
      rankTitle?: string;
      fxpToGo?: number;
      successes?: number;
      need?: number;
    }>;
    platforms: Array<{ id: string; line: string }>;
    cost: number;
    canDeclare: boolean;
    reason: GameErrorReason | null;
  } | null;
  candidacy: {
    candidacyId: string;
    status: 'filed' | 'withdrawn' | 'struck' | 'standing';
    endorsements: EndorsementsView | null;
    branchLine: boolean;
    canWithdraw: boolean;
  } | null;
  /** During the polls: the caller's own ballot, never anyone else's (ADR 0019). */
  ballot: {
    cast: { key: string; name: string } | null;
    canVote: boolean;
    reason: GameErrorReason | null;
  } | null;
  /** The caller's own endorsement this cycle, if any. */
  endorsed: { candidacyId: string; name: string } | null;
  pc: number;
  /** Review 3: the council's hall, for the header crop; null for a city without one. */
  hall: HallView | null;
}

export interface CountRowView extends CountRow {
  avatar: AssetView | null;
  you: boolean;
  yourVote: boolean;
}

export interface CountView {
  electionId: string;
  cityId: string;
  cityName: string;
  countDay: DayKey;
  /** The count's weekday ("Sunday's result"). */
  weekday: string;
  rows: CountRowView[];
  turnout: { voters: number; eligible: number };
  seats: number;
  npcSeats: number;
  /** Review 3: the council's hall, for the header crop. */
  hall: HallView | null;
}

export interface CouncilSeatView {
  seat: number;
  kind: 'player' | 'npc';
  name: string;
  avatar: AssetView | null;
  rankTitle: string | null;
  standingName: string;
  you: boolean;
  /** Players once cast; NPCs after the division. */
  votedFor: string | null;
}

export interface OrderPaperItemView {
  n: number;
  ordinanceId: string;
  name: string;
  line: string;
  effectLine: string;
  movedBy: { kind: 'branch' | 'player'; name: string; you: boolean };
  /** After the division. */
  votes: number | null;
  passed: boolean;
}

export interface OrdinanceMenuItemView {
  ordinanceId: string;
  name: string;
  line: string;
  effectLine: string;
  onPaper: boolean;
}

export interface CouncilView {
  councilKey: string;
  cityId: string;
  cityName: string;
  termEndsAt: number;
  npcSeats: number;
  seats: CouncilSeatView[];
  window: { voting: boolean; divideAt: number; opensAt: number | null };
  paper: {
    status: 'open' | 'divided';
    items: OrderPaperItemView[];
    /** After the division: the Against-all votes. */
    against: number | null;
    /** Divided with no motion passed. */
    rose: boolean;
  };
  you: {
    councillor: boolean;
    voted: string | null;
    proposed: string | null;
    canPropose: boolean;
    proposeReason: GameErrorReason | null;
    pc: number;
  };
  /** Councillors while voting. */
  menu: OrdinanceMenuItemView[] | null;
  inForce: { ordinanceId: string; name: string; line: string; daysLeft: number } | null;
  /** Review 3: the council's hall, for the header crop. */
  hall: HallView | null;
}

/** Screens §2.2: the morning a seat is won, the paper's front page is the winner's. */
export interface FrontPageView {
  avatar: AssetView | null;
  caption: { name: string; rankTitle: string; cityName: string };
  /** The ELECTED stamp animates once (until `paper.markRead`). */
  animate: boolean;
  headline: string;
  deck: string;
  count: CountView;
}

export type PoliticalAct = 'ballot' | 'declare' | 'endorse' | 'withdraw' | 'propose' | 'councilVote';
export const POLITICAL_ACTS = ['ballot', 'declare', 'endorse', 'withdraw', 'propose', 'councilVote'] as const;

/** The political result modal (screens §9, tech design §10.1), stored in requestLogs.result. */
export interface PoliticalResult {
  kind: 'political';
  act: PoliticalAct;
  stamp: { label: string; tone: 'success' | 'partial' };
  /** The masthead strip in place of the art panel. */
  paper: { name: string; shortName: string };
  place: { cityId: string; cityName: string };
  headline: string;
  body: string;
  /** Review 2 (screens §9): "Next: the result, Sunday morning." (absent on results stored before it). */
  next?: string;
  /** Epoch ms for `{until}` / `{at}` in the text. */
  until: number | null;
  at: number | null;
  knockOns: {
    pc: { before: number; after: number } | null;
    morale: {
      cityName: string;
      factionId: FactionId;
      before: number;
      after: number;
      stateBefore: MoraleState;
      stateAfter: MoraleState;
    } | null;
    endorsements: { name: string; n: number; needed: number } | null;
  };
  performedAt: string;
  idempotencyKey: string;
  character: CharacterView;
  view: { kind: 'election'; election: ElectionView } | { kind: 'council'; council: CouncilView };
}
