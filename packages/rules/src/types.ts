/**
 * Shared vocabulary and DTOs. The server builds these; the client and `@irongate/ui` render them.
 * Kept in the rules package so every layer imports types from one place.
 */
import type { CouncilPhase } from './calendar';
import type { CountRow, DeskNext } from './council';
import type { DayKey } from './day';
import type { MoraleState } from './morale';
import type { OrdinanceTagView } from './ordinances';
import type { HeatState } from './heat';
import type { MissionType } from './constants';
import type { RecordLevel } from './record';
import type { QuarterLock } from './quarters';

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
  /**
   * Slice 4 (ADR 0030 §4): the swing's named factors (*Close race +25 %*, *Issue: Tram Fare Hike
   * +50 %*, *Comeback +15 %*, an ordinance's *+15 %*), present when any applied.
   */
  opinionFactors?: Array<{ id: string; label: string; pct: number }>;
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

/** What a performed thing was, for order matching (ADR 0009). Slice 5 (ADR 0031 §4): `mission`. */
export type ActionKind = 'checked' | 'training' | 'takeJob' | 'mission';
export const ACTION_KINDS = ['checked', 'training', 'takeJob', 'mission'] as const;

export interface ActionDescriptor {
  kind: ActionKind;
  actionId?: string;
  type?: string;
  locationId?: string;
  cityId?: string;
  /** Slice 4: the location's quarter (a capital district), its kind, and the live Issues tagging it. */
  districtId?: string;
  locationKind?: string;
  issueIds?: string[];
}

/**
 * AND of the fields present. `cityId: 'home'` means the actor's residence city (slice 4, ADR 0026;
 * the home city for everyone who never moved); `districtId: 'home'` the residence district.
 */
export interface OrderMatch {
  actionTypes?: string[];
  actionIds?: string[];
  locationIds?: string[];
  cityId?: string;
  kinds?: ActionKind[];
  /** Slice 4: a district id, or 'home' for the residence district. */
  districtId?: string;
  /** Slice 4: any action tagged with a live Issue. */
  issueTagged?: boolean;
  /** Slice 4: location kinds (`street`, `market`). */
  locationKinds?: string[];
}

/**
 * Slice 4 (ADR 0029): what tags an action with an Issue: the order-match fields that describe a
 * place and a type (AND of those present). The city is the Issue's own (`where[].cityId`).
 */
export interface IssueMatch {
  actionTypes?: string[];
  locationIds?: string[];
  locationKinds?: string[];
  districtId?: string;
}

/** Where a character lives (ADR 0026): the order matches' `'home'`. */
export interface ResidenceCtx {
  cityId: string;
  districtId: string | null;
  /** Slice 5 (ADR 0034 §3): the act is on rival ground, where no order matches. */
  rivalGround?: boolean;
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
  /**
   * Slice 4 (design §10): which residents' rotation it belongs to. `home` (default): the home
   * set; `capital`: an Irongate resident's slots A and B; `any`: both (slot C).
   */
  residence?: 'home' | 'capital' | 'any';
  /**
   * Slice 5 (design §12.2): enters a member's rotation from this Level (the slot-B mission order:
   * 6). Absent: every Level.
   */
  minLevel?: number;
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
  /**
   * Review 4 #20 (ADR 0078): the day's orders taken off the board by an arrest. Nothing advances
   * while it is set; it ends with the settlement's new orders (absent = null).
   */
  off?: { at: number; reason: 'cells' } | null;
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
  /** Slice 4 (stored): the level reached `level` (or passed it) since the last paper (`train-open`). */
  | { kind: 'levelCrossed'; level: number }
  | RiskCondition
  | PoliticalCondition;

/**
 * Slice 5 (tech design §11.2, design §14): the risk headlines' stored conditions, from the
 * settlement's facts (`PaperFacts.risk`).
 */
export type RiskCondition =
  /** The first mission ever, yesterday (`mission-first`, `{missionTitle}`). */
  | { kind: 'missionFirstYesterday' }
  /** Heat at the edition is Hot or more (`min: 'hot'`), or Wanted (`seen`, In Print). */
  | { kind: 'heatState'; min: 'hot' | 'wanted' }
  /** A mark yesterday (`name-taken`). */
  | { kind: 'markYesterday' }
  /** Taken in yesterday (`cells`, `{minutes}`, `{how}`, In Print). */
  | { kind: 'arrestedYesterday' }
  /** Admitted to the infirmary yesterday (`infirmary`, `{opponent}`, In Print). */
  | { kind: 'admittedYesterday' }
  /** The record's level rose yesterday (`record-up`, `{recordLevel}`, `{marks}`, `{pct}`). */
  | { kind: 'recordRose' }
  /** On rival ground yesterday (`rival-trip`, `{rivalCity}`). */
  | { kind: 'rivalGroundYesterday' }
  /** Put on the train home yesterday (`deported`, `{rivalCity}`, In Print). */
  | { kind: 'deportedYesterday' };

export const RISK_CONDITION_KINDS = [
  'missionFirstYesterday',
  'heatState',
  'markYesterday',
  'arrestedYesterday',
  'admittedYesterday',
  'recordRose',
  'rivalGroundYesterday',
  'deportedYesterday',
] as const satisfies ReadonlyArray<RiskCondition['kind']>;

/**
 * Slice 3 (ADR 0023): the political headline conditions. A template uses political kinds only, or
 * none; political templates are selected live at read, never at settlement.
 */
export type PoliticalCondition =
  /** Elected at last night's count; `top` = first of seven. */
  | { kind: 'seatWon'; top?: boolean }
  /**
   * Stood at last night's count and was not elected; `tie` = lost on a tie-break (margin 0). Slice 4:
   * `bloc` = in a capital district, the caller's party won no seat there.
   */
  | { kind: 'seatLost'; tie?: boolean; bloc?: boolean }
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
  | { kind: 'leftUnrest' }
  | CapitalCondition;

/**
 * Slice 4 (tech design §11.3): live conditions of the capital, the Issues and travel. Like the
 * political ones they are selected at read, never at settlement, and a template uses live kinds
 * only.
 */
export type CapitalCondition =
  /** Registered a residence yesterday (`welcome-resident`, the home papers' `moved-away`). */
  | { kind: 'registeredYesterday' }
  /** Arrived in the capital for the first time yesterday. */
  | { kind: 'firstCapitalArrivalYesterday' }
  /** Named District Hero (`district`) or City Hero (`city`) at last night's count. */
  | { kind: 'heroYesterday'; place: 'district' | 'city' }
  /** Among the top five of an Issue resolved last night. */
  | { kind: 'issuePcYesterday' }
  /** Quoted by the reporter yesterday (the journey card). */
  | { kind: 'quotedYesterday' }
  /** Monday: this week's Issues were drawn last night. */
  | { kind: 'issuesDrawnToday' }
  /** Not Monday: a faction leads the paper city's first Issue. */
  | { kind: 'issueLeading' }
  /** Not Monday: nobody has points on the paper city's first Issue. */
  | { kind: 'issueOpen' }
  /** Monday: an Issue resolved last night, owned or lapsed. */
  | { kind: 'issueResolvedToday'; owned: boolean }
  /** The residence district is a close race today. */
  | { kind: 'districtBattleground' }
  /** The residence district became a close race at the boundary. */
  | { kind: 'districtBecameBattleground' }
  /** The residence district stopped being one. */
  | { kind: 'districtLeftBattleground' }
  /** A comeback began in the residence district last night. */
  | { kind: 'groundswellStarted' }
  /** The residence district's line (the fallback city line). */
  | { kind: 'districtLine' }
  /**
   * Slice 5 (tech design §11.2, live): the home city lost at least `min` points of opinion to
   * rivals yesterday (`rival-pressure`, `{lost}`).
   */
  | { kind: 'moraleLostToRivals'; min: number };

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
  // Slice 4: live, like the political ones.
  'registeredYesterday',
  'firstCapitalArrivalYesterday',
  'heroYesterday',
  'issuePcYesterday',
  'quotedYesterday',
  'issuesDrawnToday',
  'issueLeading',
  'issueOpen',
  'issueResolvedToday',
  'districtBattleground',
  'districtBecameBattleground',
  'districtLeftBattleground',
  'groundswellStarted',
  'districtLine',
  // Slice 5: live.
  'moraleLostToRivals',
] as const satisfies ReadonlyArray<PoliticalCondition['kind']>;

/** Slice 4: the live conditions of the capital, the Issues and travel (a subset of the above). */
export const CAPITAL_CONDITION_KINDS = [
  'registeredYesterday',
  'firstCapitalArrivalYesterday',
  'heroYesterday',
  'issuePcYesterday',
  'quotedYesterday',
  'issuesDrawnToday',
  'issueLeading',
  'issueOpen',
  'issueResolvedToday',
  'districtBattleground',
  'districtBecameBattleground',
  'districtLeftBattleground',
  'groundswellStarted',
  'districtLine',
  'moraleLostToRivals',
] as const satisfies ReadonlyArray<CapitalCondition['kind']>;

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
  /** Slice 4: the residence district, the faction's name (the Herald's stored lines), the Issue. */
  'district',
  'faction',
  'issue',
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

/**
 * Slice 4 (tech design §4.3): the placeholders the capital and Issue headlines may use besides the
 * political ones, all resolved on the server.
 */
export const CAPITAL_PLACEHOLDERS = [
  'district',
  'districtShort',
  'winners',
  'seatsV',
  'seatsC',
  'seatsA',
  'seatsFaction',
  'leader',
  'second',
  'third',
  'leaderShare',
  'secondShare',
  'thirdShare',
  'state',
  'yourSwing',
  'yourRank',
  'contributors',
  'issue1',
  'issue2',
  'issue1Short',
  'issueShort',
  'issue1Blurb',
  'issue2Blurb',
  'district2',
  'faction',
  'm1',
  'm2',
  'm3',
  'stance',
  'effectLine',
  'swing',
  'bracket',
  'origin',
  /** Slice-4 fixes §5 (QA m4): the first-arrival deck's live count of close races. */
  'closeRaces',
  'rank3',
  'weekday',
  /** The register and room results: the faction's capital HQ, the Rested cap with the room. */
  'hq',
  'cap',
] as const;
export type CapitalPlaceholder = (typeof CAPITAL_PLACEHOLDERS)[number];

/**
 * Slice 5 (tech design §4.3): the risk headlines' placeholders (stored, and `{lost}` on the live
 * *Rival Callers*), resolved on the server from the settlement's facts.
 */
export const RISK_PLACEHOLDERS = [
  'missionTitle',
  'minutes',
  'how',
  'opponent',
  'recordLevel',
  'marks',
  /** *One mark* / *{n} marks* (design §14, 4 Oct 2026). */
  'marksLine',
  'pct',
  'rivalCity',
  'lost',
] as const;
export type RiskPlaceholder = (typeof RISK_PLACEHOLDERS)[number];

/** Slice 4 (tech design §4.3): what a journey card's detail and texts may name. */
export const JOURNEY_PLACEHOLDERS = ['destination', 'issue'] as const;
export const TIME_TOKENS = ['until', 'at'] as const;

/**
 * The placeholders story texts (origin steps, the street, Ambition chapters) may use (slice-2 tech
 * design §4.4): the character's name, the faction secretary's form of address, the HQ's short
 * reference and the home city's name. Resolved on the server before any text leaves it.
 */
/**
 * Review 4 (ADR 0073): `{helper}` is the surname of the person helped on the platform (*Holm*) and
 * `{helperPronoun}` their pronoun, capitalised (*She*); `{city}` is that party's home city.
 */
export const STORY_PLACEHOLDERS = ['name', 'secretary', 'hq', 'city', 'helper', 'helperPronoun'] as const;
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
  /**
   * Review 4 #13 (answers §13, tech design §12.3): in any city but the residence, and on a train, the
   * panel is one quiet line, *Your orders are in Coalport · 1 of 3 done*, not tappable. It replaces
   * slice 5's rival-ground `elsewhere`. Null at home. The paper keeps the full list.
   */
  away: { cityName: string; done: number; of: number } | null;
  /**
   * Review 4 #20 (GDD §13.7, ADR 0078): an arrest took today's orders off the board: the panel and the
   * paper read *Orders off today · the branch heard about the cells*; no pins, no ticket tags. Ends at
   * the day's turn. Absent on views built before it.
   */
  off?: { reason: 'cells' } | null;
}

/** Review 4 #25: what a Rank opens, a key of `copy.ranks.opens` (`RANK_OPENS`). */
export type RankOpensKey = 'hall' | 'vote' | 'stand' | 'chair' | 'list' | 'president' | 'life';

/** Review 4 #25: one row of the rank ladder. */
export interface RankRowView {
  rank: number;
  title: string;
  /** The Party XP the rank begins at. */
  fxp: number;
  opens: RankOpensKey;
}

export interface CharacterView {
  id: string;
  name: string;
  factionId: FactionId;
  /** Display name from content (faction naming is parked, so the client never hard-codes it). */
  factionName: string;
  /** Slice 4: every party's short name, from content (the capital's three-way tables, the sash). */
  factionNames?: Record<FactionId, string>;
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
  /** Review 4 #25 (answers §25): the rank ladder's seven rows, Rank 1 first (`rankLadder`). */
  ranks: RankRowView[];
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
  /** Slice 4 (tech design §8.3): the journey, residence, room, train, heroes and scoreboard. */
  journey?: CharacterViewV5['journey'];
  residence?: CharacterViewV5['residence'];
  room?: CharacterViewV5['room'];
  trainOpen?: boolean;
  hero?: CharacterViewV5['hero'];
  heroes?: CharacterViewV5['heroes'];
  scoreboard?: CharacterViewV5['scoreboard'];
  /** Slice 5 (tech design §8.3): Heat, Health, the record, held, the run-in, where you stand. */
  heat?: CharacterViewV6['heat'];
  health?: CharacterViewV6['health'];
  record?: CharacterViewV6['record'];
  held?: CharacterViewV6['held'];
  runIn?: CharacterViewV6['runIn'];
  agiQuarters?: number;
  here?: CharacterViewV6['here'];
  barred?: CharacterViewV6['barred'];
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
  /**
   * Slice 4 (tech design §8.3): `MEMBERS_ONLY` at another faction's capital HQ, with its
   * `factionId` (`need` is 0 then): the ticket is dimmed and has no buttons.
   */
  locked: {
    /** Slice 5 (design §7.3): `RECORD`, *Not with your record* (Notorious at a court, a university, an Alliance HQ). */
    reason: 'LEVEL' | 'STANDING' | 'MEMBERS_ONLY' | 'RECORD';
    need: number;
    factionId?: FactionId;
  } | null;
  /** Slice 3: the ordinance in force's tags ("Rally Permits: 10 Energy", "Open Doors: +4 %"). */
  tags: OrdinanceTagView[];
  /** Slice 4: the place's tags (an Issue, the close race, a comeback, members only). */
  placeTags?: PlaceTagView[];
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
  /**
   * Slice 4 (the ground sash, slice-4 screens): the place's picture for the sheet's header, the same
   * ladder as a result's (a scene for its kind, else the map crop at its pin).
   */
  art?: ResultArt;
  /** Slice 5 (tech design §8.3): the place's missions, after the tickets (absent before phase B). */
  missions?: MissionView[];
  /** Slice 4: the quarter (a capital district), members only, the live Issues tagging it, trains. */
  quarterId?: string;
  factionId?: FactionId;
  issueIds?: string[];
  trains?: {
    destinations: Array<{
      cityId: string;
      name: string;
      minutes: number;
      fare: PriceView;
      canBoard: boolean;
    }>;
  } | null;
  /** Review 4 #19 (ADR 0078): the city's police station: its sheet carries *In the cells now*. */
  cellsHere?: boolean;
  /** Review 4 #9 (answers §9.3): the Lodgings card (Tram Junction); absent or null elsewhere. */
  lodgings?: LodgingsView | null;
  /** Review 4 (ADR 0077): the city's council hall: its sheet carries the council's blocks (`council.hall`). */
  hall?: boolean;
  /**
   * Review 5 (answers §8, tech design §6.2): an infirmary's Treatment card, said by its carer; null
   * while held (the ward's own ways out stand); absent at other places. The price is the client's
   * (from the Health timer), the charge the server's.
   */
  treatment?: { carer: 'matron' | 'sister' | 'nurse' } | null;
}

/**
 * Review 4 (ADR 0076): a home city's place the character cannot open yet, a greyed pin with a lock: a
 * place of a locked quarter (`lock.kind: 'level'`), or a survey pin a later edition builds
 * (`'edition'`). No tickets, missions or jobs.
 */
export interface LockedPinView {
  id: string;
  name: string;
  quarterId: string;
  map: { x: number; y: number };
  lock: QuarterLock;
}

/**
 * Review 5 (ADR 0079): the town's night at the read, from the server's one seam (`nightAt`). The
 * client never computes night itself: it refetches the view at `changesAt` (null while a test pins it).
 */
export interface NightView {
  night: boolean;
  /** The first dusk strictly after the read, epoch ms. */
  nextDusk: number;
  /** The first dawn strictly after the read, epoch ms. */
  nextDawn: number;
  /** `nextDawn` at night, `nextDusk` by day; null while the night is pinned (tests only). */
  changesAt: number | null;
}

export interface CityView {
  id: string;
  name: string;
  role: CityRole;
  homeFactionId?: FactionId;
  opinion: OpinionShares;
  map: { day: AssetView; night: AssetView };
  /**
   * Maps v3, slice 5 (ADR 0035), review 4 (ADR 0076): every quarter of the city. The capital's
   * districts with their frames, outlines and labels; a home city's as the Places list's groups
   * (name, blurb, lock), with no shape on the picture.
   */
  quarters: QuarterView[];
  /**
   * Review 4 (ADR 0076): a home city's places the character cannot open yet (a locked quarter's), then
   * the survey's later places, in pin order; [] in the capital.
   */
  lockedPins?: LockedPinView[];
  /** Map atmosphere: clouds by day and fog by night drift over the map (content `City.clouds`). */
  clouds?: boolean;
  /** First paint; `night` is the block the client reads (review 5, ADR 0079). */
  isNight: boolean;
  night: NightView;
  standing: NamedStandingView;
  locations: LocationView[];
  /** Slice 3: the home share as morale, for a home city (the plate's state word). */
  morale: { factionId: FactionId; share: number; state: MoraleState } | null;
  /** Slice 3: the ordinance in force ("Ordinance: Shift Hours Order · 3 days left"). */
  ordinance: {
    ordinanceId: string;
    name: string;
    line: string;
    effectLine: string;
    /** Review 4 (answers §11.3): the plate's plain words ("studying costs a fifth less"). */
    plainLine?: string;
    daysLeft: number;
  } | null;
  /** Review 2: the home city's Election card (screens §1a); null elsewhere. */
  election: PoliticsSummaryView | null;
  /** Slice 4: the capital's districts; the city share (the capital: the average); the Issues. */
  districts?: DistrictView[] | null;
  cityOpinion?: OpinionShares;
  scoreboard?: { mine: ScoreboardLineView | null } | null;
  issues?: IssueRowView[];
  effects?: ModifierSourceView[];
  /** Slice 4 (screens §6.1): a home city's residence card (the way back, or *you live here*). */
  residence?: ResidenceCardView | null;
  /**
   * Slice 5 (tech design §8.3): on rival ground, the home faction, Unrest and the day's pressure
   * (*1.3 of 2.0 points left today*); null elsewhere.
   */
  rivalGround?: {
    homeFactionId: FactionId;
    unrest: boolean;
    pressure: { lost: number; cap: 2; left: number };
  } | null;
}

export interface BonusTag {
  id: string;
  label: string;
  note: string;
}

/** `batch` renders "n of N" (GDD §13.1); `failure` only for tier-3 checks (Ambition chapters). */
export type ResultStamp =
  | 'success'
  | 'partial'
  | 'failure'
  | 'batch'
  | 'trained'
  // Slice 5 (design §7.2, §9.2): sent to the cells or the infirmary by a mission or a run-in.
  | 'takenIn'
  | 'carriedOff';

/** What a result is: a tier-1 action kind, or an Ambition chapter (slice-2 tech design §9). */
export type ActionResultKind = ActionViewKind | 'chapter' | 'mission';

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
  action: { id: string; name: string; type: string; tier: 1 | 2 | 3; times: number };
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
      /** Slice 4: the district (or the city) whose meter moved. */
      placeId?: string;
      placeName?: string;
      factionId: FactionId;
      /** The requested swing. */
      delta: number;
      /** What the floors let through. */
      applied: number;
      shareBefore: number;
      shareAfter: number;
      /**
       * Slice 5 (ADR 0034, tech design §10.1): `against` a faction — `shareBefore` / `shareAfter` are
       * the target's and `applied` is its loss; absent: persuasion.
       */
      mode?: 'persuade' | 'against';
      targetFactionId?: FactionId;
      /** The actor's half of an `against` swing (what counts as the contribution). */
      toActor?: number;
      /** Rival ground: the home faction's day cap cut the swing. */
      capped?: boolean;
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
    /** A chapter's keepsake ("Keepsake: The unit's list"). */
    item: { itemId: string; name: string; keepsake: boolean; art: AssetView } | null;
    /** Next-chapter hooks, already worded. */
    hooks: string[];
    /** Slice 3: the action moved the home city across a morale threshold. */
    morale?: { cityId: string; cityName: string; before: MoraleState; after: MoraleState } | null;
    /** Slice 3: completing the third order made the branch endorse the caller's candidacy. */
    branchEndorsement?: { endorsements: number; needed: number; smallBranch: boolean } | null;
    /** Slice 4: the points this action added to each tagged Issue. */
    issues?: Array<{
      issueId: string;
      name: string;
      factionId: FactionId;
      added: number;
      totals: Record<FactionId, number>;
      leader: FactionId | null;
    }>;
    /** Slice 4: the scoreboard line after this action. */
    scoreboard?: { placeName: string; swing: number; rank: number; of: number } | null;
    /**
     * Slice 5 (tech design §8.2): a chapter approach's Heat (*The riverside house*'s quiet way),
     * `first` when it is the character's first Heat ever.
     */
    heat?: StreetView['heat'];
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
    /** Slice 5: a mission's *Again* repeats the remembered way. */
    way?: { id: string; title: string };
  } | null;
  /** Slice 5 (tech design §10.1): a mission's kicker and way. */
  mission?: MissionResultView;
  /** Slice 5 (tech design §10.1–§10.2): the street's block (a run-in, Heat, the record, where you went). */
  street?: StreetView;
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
  /** Slice 4 (ADR 0028): the hero and Issue Political Capital credited at this settlement. */
  awards?: Array<{ kind: 'hero' | 'issue'; label: string; pc: number }> | null;
  /** Slice 4: the room in Irongate while it runs (live at read). */
  room?: { untilDay: DayKey; cap: number } | null;
  /** Slice 5 (tech design §11.3): the held line, *Where you are*, Heat and the record. */
  held?: DeskViewV5['held'];
  heat?: DeskViewV5['heat'];
  record?: DeskViewV5['record'];
  where?: DeskViewV5['where'];
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
  /** "Wearing: The demob suit · CHA 5" (slice-2 tech design §10). */
  wearing: { name: string; cha: number } | null;
}

/** A Letters row (§3.3 v2): an Ambition chapter that is ready or waiting mid-way. */
export interface LetterView {
  kind: 'chapter';
  /** "From the office's post". */
  from: string;
  /** "The unit's list". */
  title: string;
  /** The chapter number ("Chapter 1 is ready"). */
  chapter: number;
  status: 'ready' | 'midway';
  energy: number;
}

export interface PaperView {
  day: DayKey;
  firstEdition: boolean;
  /** The paper's masthead: always the stored edition's (the residence's; ADR 0074). */
  paper: { name: string; shortName: string; strapline: string; price: string };
  /**
   * Review 4 (ADR 0074, answers §23.1): away from the edition's city, the city the reader is in (on a
   * train, the destination): *The Coalport Clarion · Duskwall edition*. Null at home.
   */
  edition: { cityId: string; cityName: string } | null;
  /** The dateline's city is the city the reader is in (review 4). */
  dateline: { weekday: string; date: string; city: string };
  /** `until`: the epoch ms a `{until}` token in the text names (rendered in the player's clock). */
  /** Slice 4 (screens §7.3): `inPrint` for the hero and the reporter's quote (the In Print kicker). */
  headlines: Array<{
    group: HeadlineGroup;
    headline: string;
    deck?: string;
    until?: number;
    inPrint?: boolean;
    /** The hero's In Print headline: the small rosette before the name. */
    medal?: boolean;
  }>;
  /**
   * Slice 4 (screens §7.1): the Issues section, live: the residence city's two, then the capital's
   * (when the residence is elsewhere); `more` the other cities' (folded). `settlesAt` the next Monday.
   */
  issues?: { newThisWeek: boolean; settlesAt: number; rows: IssueRowView[]; more: IssueRowView[] };
  orders: OrdersView;
  desk: DeskView;
  letters: LetterView[];
  /** Slice 3: the Polling Day row, live (ADR 0023). */
  pollingDay: PoliticsSummaryView | null;
  /**
   * Review 4 (answers §23.2): in a local edition, the local city's election as a Courier line under
   * the reader's own Election row (not actionable); null at home or without a council.
   */
  localElection: { cityName: string; phase: 'nominations' | 'polling'; until: number } | null;
  /** Slice 3: the front page, on the first edition a winner opens during the term. */
  frontPage: FrontPageView | null;
  /**
   * The first edition's "To the city": the first pin's sheet (slice-2 tech design §10); review 4: the
   * HQ's, with the favour's ticket (`actionId`) highlighted.
   */
  landing: { cityId: string; locationId: string; actionId?: string } | null;
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
  | 'ELECTION_NOT_READY'
  // Slice 4 (tech design §6.9).
  | 'LEVEL_TOO_LOW'
  | 'IN_TRANSIT'
  | 'ALREADY_THERE'
  | 'DESTINATION_LOCKED'
  | 'UNKNOWN_DESTINATION'
  | 'NOT_ENOUGH_IRON'
  | 'NO_JOURNEY'
  | 'NO_CARD'
  | 'CARD_CLOSED'
  | 'ALREADY_CHOSEN'
  | 'NOT_IN_CITY'
  | 'MOVE_COOLDOWN'
  | 'ALREADY_RESIDENT'
  | 'UNKNOWN_DISTRICT'
  | 'MEMBERS_ONLY'
  | 'NOT_RESIDENT'
  | 'NOT_YET_VOTER'
  | 'NOT_YET_CANDIDATE'
  | 'WRONG_FACTION'
  // Slice-4 fixes (docs/design/slice-4-fixes.md §1, §6).
  | 'ON_BALLOT'
  | 'ROOM_PAID_AHEAD'
  // Slice 5 (tech design §6.12).
  | 'HELD'
  | 'RUN_IN_PENDING'
  | 'NO_RUN_IN'
  | 'UNKNOWN_MISSION'
  | 'UNKNOWN_WAY'
  | 'MISSION_LOCKED'
  | 'OWN_FACTION_TARGET'
  | 'RECORD_BARRED'
  | 'ONCE_ON_RIVAL_GROUND'
  | 'BARRED'
  | 'NOT_HELD'
  | 'NOT_IN_CELLS'
  | 'NOT_IN_INFIRMARY'
  | 'NO_MARKS'
  | 'CANNOT_PAY'
  // Review 4 (tech design §3.3).
  /** A welcome ticket (the first day's favour) outside its open order. */
  | 'NOT_OFFERED'
  /** ×3 on a one-off ticket. */
  | 'ONCE_ONLY'
  /** A journey card answered before its moment; `at` is the moment (epoch ms). */
  | 'CARD_NOT_YET'
  /** A bed asked for at a place without lodgings. */
  | 'NO_LODGINGS'
  /** Lodgings in another city than the one the character stands in. */
  | 'NOT_HERE'
  /** A Town Hall asked for in a city without a council. */
  | 'NO_COUNCIL'
  // Review 5 (tech design §3.5).
  /** A patrol card waits to be answered in `cityId` (phase 6): Energy acts and boarding wait. */
  | 'PATROL_PENDING'
  /** `patrol.answer` with no card pending (answered by another key, or none). */
  | 'NO_PATROL'
  /** Treatment asked for at full Health. */
  | 'FULL_HEALTH';

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
  /** The speaker beside the question (the person you went with), or null. */
  portrait: AssetView | null;
  /** The answer just given, as one line in Courier ("You went fishing with him."), or null. */
  echo: string | null;
  /** The question, or null. */
  prompt: string | null;
  /**
   * One tap commits. Review 4 (the platform, answers §2.3): a choice may be a row with the person's
   * 40 px `portrait` and two Courier `lines`; when it carries `confirm`, a tap selects and the
   * confirm button commits (the briefing's pattern, so a brush is not a party).
   */
  choices: Array<{
    id: string;
    text: string;
    hint: string | null;
    portrait?: AssetView | null;
    lines?: [string, string] | null;
    confirm?: string | null;
  }>;
  /** Review 4: a Courier line under the choices (*Whoever you help, you go with…*), or absent. */
  note?: string | null;
  /** Chapter step 2: pick one, then the CTA. */
  approaches: Array<{ id: string; text: string; check: CheckBreakdown }>;
  /** `readyAt` null = affordable now. */
  cta: { label: string; energy: number; readyAt: number | null } | null;
  progress: { step: number; of: number };
}

/**
 * The arrival (ADR 0011, review 4 ADR 0073): `face → story → ready → arrived`. `ready`: the three
 * answers are in and no character exists yet; the client calls `arrival.join` at once.
 */
export interface ArrivalView {
  phase: 'face' | 'story' | 'ready' | 'arrived';
  name: string;
  avatar: AssetView | null;
  /** Phase 'face' only. */
  faces: AssetView[] | null;
  /** Phase 'story': the next unanswered question, and its id for `arrival.answer`. */
  screen: StoryScreenView | null;
  questionId: string | null;
  /** Phase 'arrived': the first landing (review 4: the HQ, with the favour's `actionId`). */
  landing: { cityId: string; locationId: string; actionId?: string } | null;
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
  /** QA review 4: `plainLine`, the rule's effect in plain words (answers §11.3), after its name. */
  inForce: { ordinanceId: string; name: string; daysLeft: number; plainLine?: string } | null;
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
  /** Slice 4: the place voted in (a district or the home city) and its seats (2 or 7). */
  placeId?: string;
  placeName?: string;
  seats?: 7 | 2;
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
  | 'candidates'
  /** Slice 4 (screens §7.2): registered in a district, the first vote not yet open. */
  | 'registered';

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
    /**
     * Slice 4 (screens §7.2): a district's result line, *Eastside went Collective, Vanguard* and
     * *Irongate: 4 Vanguard · 3 Collective · 3 Alliance · turnout 3 of 5 in Eastside*.
     */
    district?: {
      seats: FactionId[];
      capital: Record<FactionId, number>;
      turnout: { voters: number; eligible: number };
    } | null;
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

/** Slice 4: `FACTION`, a capital candidate of another party (members back their own faction's). */
export type EndorseRefusal = 'SELF' | 'ALREADY' | 'RANK' | 'PC' | 'CLOSED' | 'FACTION';

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
 * (fractions, like a pin), and the city's map stills, for the election screens' header crop. Review
 * 5: the client picks day or night by `night` (the server's seam, ADR 0079).
 */
export interface HallView {
  name: string;
  /** In a sentence: "the Town Hall". */
  ref: string;
  x: number;
  y: number;
  asset: { day: AssetView; night: AssetView };
  /** Review 5 (ADR 0079): the header's art follows the server's night, not the browser's clock. */
  night: NightView;
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
  /** Slice 4 (the capital): the seat's party and district. */
  factionId?: FactionId;
  districtId?: string | null;
  /** The district's name, for the seat grid's captions. */
  districtName?: string | null;
}

export interface OrderPaperItemView {
  n: number;
  ordinanceId: string;
  name: string;
  line: string;
  effectLine: string;
  movedBy: { kind: 'branch' | 'player'; name: string; you: boolean };
  /** Slice 4 (the capital): the party whose branch motion it is (null for a proposal). */
  branchOf?: FactionId | null;
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
  /** Slice 4: the votes that pass a rule (4 of 7 at home, 6 of 10 in the capital) and the seat count. */
  passVotes?: number;
  seatCount?: number;
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
  /** Review 4 (answers §10.1): the *What now* card under the headline, the morning of the win. */
  whatNow?: WhatNowView | null;
}

/**
 * Review 4 (answers §10.1, ADR 0077): the *What now* card, once per term (`officeTerms.whatNowSeenAt`):
 * put a rule forward, vote before the council votes at `divideAt`, draw the pay.
 */
export interface WhatNowView {
  termId: string;
  cityId: string;
  /** The hall's place (`?loc=` for *To your desk at the Town Hall*) and its name. */
  hall: { locationId: string; name: string };
  seatCount: 7 | 10;
  passVotes: 4 | 6;
  divideAt: number;
}

/**
 * Review 4 (answers §11.2, ADR 0077): the Town Hall's sheet, the council's public face for any city
 * with a council: the rule in force, the seats as rows, the order paper read-only, the week's Issues,
 * the Election card; `desk` only for a councillor of this council.
 */
export interface TownHallView {
  cityId: string;
  cityName: string;
  hall: HallView;
  /** Review 5 (ADR 0079): the same block as `hall.night`. */
  night: NightView;
  seatCount: 7 | 10;
  passVotes: 4 | 6;
  termEndsAt: number;
  inForce: { ordinanceId: string; name: string; plainLine: string; daysLeft: number } | null;
  /** No rule in force: the council couldn't agree, or it votes at `at`. */
  noRule: { why: 'divided' | 'beforeVote'; at: number | null } | null;
  seats: Array<{
    seat: number;
    kind: 'player' | 'npc';
    name: string;
    avatar: AssetView | null;
    rankTitle: string | null;
    you: boolean;
    votedFor: string | null;
    factionId?: FactionId;
    districtName?: string | null;
  }>;
  paper: {
    status: 'open' | 'divided';
    items: Array<{
      n: number;
      ordinanceId: string;
      name: string;
      plainLine: string;
      effectLine: string;
      movedBy: { kind: 'branch' | 'player'; name: string; you: boolean };
      votes: number | null;
      passed: boolean;
    }>;
    against: number | null;
    rose: boolean;
  };
  /** The council's division (its vote), this term. */
  divideAt: number;
  /** The council's vote while the paper is open (null after it). */
  nextVoteAt: number | null;
  issues: IssueRowView[];
  /** When this week's Issues settle (the next Monday's turn), for the rows' line. */
  issuesSettleAt: number;
  election: PoliticsSummaryView | null;
  desk: (CouncilView & { next: DeskNext }) | null;
  whatNow: WhatNowView | null;
  serverNow: number;
}

export type PoliticalAct =
  | 'ballot'
  | 'declare'
  | 'endorse'
  | 'withdraw'
  | 'propose'
  | 'councilVote'
  // Slice 4 (tech design §10.4).
  | 'register'
  | 'room'
  // Slice-4 fixes §6: seven more nights on a room running.
  | 'renew'
  // Slice 5 (tech design §10.3): the cells, the infirmary and the record.
  | 'bail'
  | 'released'
  | 'deported'
  | 'walkOut'
  | 'discharged'
  | 'strike'
  // Review 5 (answers §8, tech design §6.2): *Get patched up* at an infirmary.
  | 'treated';
export const POLITICAL_ACTS = [
  'ballot',
  'declare',
  'endorse',
  'withdraw',
  'propose',
  'councilVote',
  'register',
  'room',
  'renew',
  'bail',
  'released',
  'deported',
  'walkOut',
  'discharged',
  'strike',
  'treated',
] as const;

/** Slice 5: the cells', the infirmary's and the record's acts (their texts are copy, not `politics`). */
export type RiskAct = 'bail' | 'released' | 'deported' | 'walkOut' | 'discharged' | 'strike';
/** The acts whose texts live in content's `politics.results` (slices 3–4). */
export type CouncilAct = Exclude<PoliticalAct, RiskAct | 'treated'>;

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
    /** Slice 4: a move or a room. */
    iron?: { before: number; after: number } | null;
    seatGivenUp?: { cityName: string } | null;
    candidacyWithdrawn?: boolean;
    /** Slice 5 (tech design §10.3): the cells, the infirmary and the record. */
    heat?: { before: number; after: number } | null;
    /**
     * Review 4 #20 (answers §20.3, ADR 0078): out of the cells, *Your record: taken in · 1 mark · On
     * file* (`added`: the marks this arrest added; `marks`, `level`: the live record after it) and
     * *Orders off until the day turns* (while today's orders are still off).
     */
    takenIn?: { added: number; marks: number; level: RecordLevel } | null;
    ordersOff?: boolean;
    health?: { before: number; after: number; max: number } | null;
    energy?: { before: number; after: number } | null;
    barred?: { cityId: string; cityName: string; until: number } | null;
    record?: { before: { level: RecordLevel; marks: number }; after: { level: RecordLevel; marks: number } } | null;
  };
  performedAt: string;
  idempotencyKey: string;
  character: CharacterView;
  view:
    | { kind: 'election'; election: ElectionView }
    | { kind: 'council'; council: CouncilView }
    | { kind: 'residence'; residence: ResidenceCardView; election: PoliticsSummaryView | null }
    // Slice 5 (tech design §10.3): out of the cells or the infirmary (where Continue lands), the record.
    | { kind: 'held'; landing: Landing | { journey: true } | null }
    | { kind: 'record'; record: CharacterViewV6['record'] }
    // Review 5 (tech design §6.2): *Get patched up*; Continue returns to the place's sheet.
    | { kind: 'place'; locationId: string };
}

// ---------------------------------------------------------------------------------------------
// Slice 4 views and results (docs/tech/slice-4.md §8.3, §10). Built by the server; no view carries a
// ballot or a total before the count (ADR 0019). Fields added to the slice 1–3 views are optional
// until the slice-4 server fills them.
// ---------------------------------------------------------------------------------------------

/** Where Continue on the arrival modal lands (the capital: Station & Market, Central Station). */
export interface Landing {
  cityId: string;
  quarterId?: string;
  locationId?: string;
}

/** A priced line: a ticket's or a room's source and its percentage (ADR 0030). */
export interface PriceLineView {
  id: string;
  label: string;
  pct: number;
}

export interface PriceView {
  base: number;
  lines: PriceLineView[];
  total: number;
}

/** Design §2.3: why a city card has a Board button or not. */
export type DestinationStateView = 'here' | 'open' | 'rival' | 'barred' | 'later' | 'level';

export interface NationCityView {
  cityId: string;
  name: string;
  x: number;
  y: number;
  /** Fixed list order: the capital, your home, the other three. */
  n: number;
  /** "Capital · 5 districts · two close races today" (live) / "Home city of the Alliance". */
  line: string;
  state: DestinationStateView;
  lockWord: 'rival ground' | 'no service yet' | 'barred' | null;
  /** Slice 5 (design §11.5): barred after a deportation, until then. */
  barredUntil?: number;
  /** Slice 5 (screens §8.1): *Rival ground · Home city of the {faction}*. */
  rival?: { homeFactionId: FactionId };
  minutes: number | null;
  fare: PriceView | null;
  /** The capital: the average of its districts; Clearwater: its baseline. */
  whoHolds: OpinionShares;
  /** This week's two (none for Clearwater). */
  issues: Array<{ issueId: string; name: string }>;
  election: { line: 'votesIn' | 'votingOpen' | null; days?: number; until?: number } | null;
  canBoard: { ok: true } | { ok: false; reason: GameErrorReason };
  /** In the capital: the card's *See the districts*. */
  seeDistricts: boolean;
}

export interface NationView {
  map: { day: AssetView; night: AssetView };
  tiles: true;
  frame: Frame;
  clouds: boolean;
  isNight: boolean;
  /** Review 5 (ADR 0079). */
  night: NightView;
  here: { cityId: string } | { journey: { from: string; to: string } };
  /** Level 10 or more. */
  trainOpen: boolean;
  cities: NationCityView[];
}

/** One choice row of a journey card; the client prints the odds word, never the number. */
export interface JourneyChoiceView {
  id: string;
  title: string;
  detail: string;
  stat: { stats: CheckStats } | null;
  chance: number | null;
  cost: number | null;
  affordable: boolean;
  /** Slice 5 (design §23.2): an unchecked row that depends on Heat and the record (no odds word). */
  gated?: boolean;
  /** Review 5 #7: the put-aside row (`JOURNEY_SET_ASIDE`), last; its detail says what it costs. */
  setAside?: boolean;
}

export interface JourneyCardView {
  eventId: string;
  title: string;
  setup: string;
  ignore: string;
  choices: JourneyChoiceView[];
  chosen: JourneyCardResult | null;
  /** Slice 5: the hostile deck's card (no opinion or points on it). */
  deck?: 'ordinary' | 'hostile';
}

export interface JourneyView {
  id: string;
  from: { cityId: string; name: string };
  to: { cityId: string; name: string };
  boardedAt: number;
  arrivesAt: number;
  serverNow: number;
  status: 'onTheWay' | 'arrived';
  firstJourney: boolean;
  /** Other journeys on this leg boarded within ten minutes. */
  others: number;
  /**
   * Review 4 (tech design §6.4, ADR 0075): the route on the nation picture. Each leg's points in
   * travel order (fractions of the picture) and its share of the journey's time; `cities` are the
   * nation's pins (the two ends drawn, the others muted). The client places the pin with `trainAt`.
   */
  route: {
    legs: Array<{ points: Array<[number, number]>; fromT: number; toT: number }>;
    cities: Array<{ cityId: string; name: string; x: number; y: number }>;
  };
  /** Review 4: the nation pictures (tiles), day and night. */
  map: { day: AssetView; night: AssetView };
  /** Review 5 (ADR 0079): the night at the read; the map's art follows it. */
  night: NightView;
  /**
   * Review 4 (ADR 0075 §4): the card's moment, epoch ms, whenever the journey drew a card (null: no
   * card). `card` itself is sent only from this moment (or once the journey has arrived).
   */
  cardAt: number | null;
  card: JourneyCardView | null;
  arrival: {
    stamp: 'Arrived';
    place: string;
    headline: string;
    body: string;
    cardLine: string | null;
    knockOns: {
      ticket: number;
      /** Slice 5 (screens §8.2): on rival ground (the warning once), the day flags, an unanswered card's Heat. */
      rivalGround?: boolean;
      flags?: Array<'watched' | 'warned'>;
      heat?: { before: number; after: number };
    };
    art: ResultArt;
    landing: Landing;
  } | null;
  whileYouRide: { paperUnread: number; election: PoliticsSummaryView | null };
}

/** Tech design §10.3: a journey card's outcome, stored on the journey and in requestLogs. */
export interface JourneyCardResult {
  kind: 'journeyCard';
  journeyId: string;
  eventId: string;
  choiceId: string;
  /** null for an unchecked choice. */
  stamp: 'success' | 'partial' | null;
  headline: string;
  body: string;
  /** A Partial's one-line reason (review 2 §2.4). */
  reason: string | null;
  /** Receipt rows, zeros omitted. */
  rewards: Array<{
    id: 'xp' | 'fxp' | 'iron' | 'opinion' | 'points' | 'rested' | 'heat';
    amount: number;
    note?: string;
  }>;
  opinion: { placeName: string; factionId: FactionId; before: number; after: number } | null;
  points: {
    issueName: string;
    added: number;
    totals: Record<FactionId, number>;
    leader: FactionId | null;
  } | null;
  quoted: boolean;
  /**
   * Slice 5 (tech design §10.4): a hostile card's day flag in the destination, worded (*Watched
   * today: run-ins likelier in Duskwall until {until}*; review 4: the client renders `{until}`, the
   * day's turn, in the player's clock). Absent when the card set none.
   */
  flag?: { flag: 'watched' | 'warned'; line: string; until: number };
  performedAt: string;
  idempotencyKey: string;
  character: CharacterView;
  journey: JourneyView;
}

export interface BoardResult {
  journey: JourneyView;
  character: CharacterView;
}

/** The scoreboard line (screens §9.1): "This election you've moved Eastside +1.3 … (2nd of 7)". */
export interface ScoreboardLineView {
  placeId: string;
  placeName: string;
  /** Points, three decimals. */
  swing: number;
  factionId: FactionId;
  rank: number;
  of: number;
}

/** The scoreboard table (screens §9.2): the top three per level bracket. */
export interface ScoreboardTableView {
  bracket: 1 | 2 | 3;
  rows: Array<{
    characterId: string;
    name: string;
    factionId: FactionId;
    level: number;
    swing: number;
    you: boolean;
    hero: boolean;
  }>;
}

/** A ticket's place tags, in the screens' order (cost change · Issue · Close race · Comeback). */
export type PlaceTagView =
  | { kind: 'issue'; issueId: string; name: string; pct: 50 }
  | { kind: 'closeRace'; fxpPct: 25 }
  | { kind: 'comeback'; factionId: FactionId; pct: number }
  | { kind: 'membersOnly'; factionId: FactionId }
  // Slice 5 (tech design §8.3).
  | { kind: 'rivalGround'; fxpPct: 50 | 75 }
  | { kind: 'record'; ironPct: number; level: RecordLevel }
  | { kind: 'pressureCapped' }
  // Review 4 #18 (answers §18): Familiar or better here, *Known here · better odds*.
  | { kind: 'known' }
  // Review 5 (ADR 0080): on rival ground at night, *Night · patrols out*.
  | { kind: 'night' };

/** Screens §6.1: the residence card's state, chosen on the server per district. */
export interface ResidenceCardView {
  state:
    | 'visitingMay'
    | 'belowRank'
    | 'cooldown'
    | 'noIron'
    | 'resident'
    | 'homeElsewhere'
    | 'atHome'
    // Slice-4 fixes §1 (QA M2): on a ballot where you live; `canMoveFromDay` is the count day.
    | 'onBallot'
    // Slice 5 (screens §8.3): *You can't live or stand here*.
    | 'rivalGround';
  livesIn: string;
  registeredDay?: DayKey;
  votesFromDay?: DayKey;
  canMoveFromDay?: DayKey;
  cost: 500;
  button: { enabled: boolean } | null;
  sheet: { lines: Array<{ text: string; warn: boolean }> } | null;
  // Review 4 #9 (answers §9.3): the room left the card; it is `LocationView.lodgings` at Tram Junction.
}

/**
 * Review 4 #9 (answers §9.3, tech design §10.3): the Lodgings card at a place (Tram Junction), the
 * room's rule unchanged: 100 Iron (half under a rents Issue), seven nights, Rested's cap +50, seven
 * more nights while seven or fewer remain, at most fourteen paid.
 */
export interface LodgingsView {
  /** Content: *A bed on the tram line · 7 nights · 100 Iron*. */
  line: string;
  price: { base: number; lines: PriceLineView[]; total: number };
  running: { untilDay: DayKey } | null;
  /** *Take a bed*, *Seven more nights*, or more than seven nights paid (`renewFromDay`). */
  tap: 'take' | 'renew' | 'notYet';
  renewFromDay: DayKey | null;
  /** Rested's cap now, and with a bed (*up to 250 instead of 200*). */
  cap: { now: number; with: number };
}

export interface DistrictStateView {
  battleground: boolean;
  controlledBy: FactionId | null;
  groundswell: { factionId: FactionId; pct: number } | null;
  word: 'closeRace' | 'leans' | 'held' | 'contested';
  leans: FactionId | null;
}

/** CityView.districts[] (screens §5). */
export interface DistrictView {
  id: string;
  n: number;
  name: string;
  blurb: string;
  frame: Frame;
  anchor: { x: number; y: number };
  /** The user's district lock (3 Oct 2026): the district's shape on the picture, fractions. */
  outline: Array<[number, number]>;
  opinion: OpinionShares;
  state: DistrictStateView;
  issues: Array<{
    issueId: string;
    name: string;
    leader: FactionId | null;
    momentum: Record<FactionId, number>;
  }>;
  seats: Array<{ name: string; factionId: FactionId; local: boolean }>;
  scoreboard: { mine: { swing: number; rank: number; of: number } | null; table: ScoreboardTableView[] };
  residence: ResidenceCardView;
  you: { resident: boolean };
}

/** The paper's and the city's Issue rows (screens §7.1). */
export interface IssueRowView {
  issueId: string;
  name: string;
  cityId: string;
  districtId: string | null;
  placeName: string;
  leader: FactionId | null;
  momentum: Record<FactionId, number>;
  effectLine: string;
  /** Review 4 (ADR 0074): a local edition's row of the city the reader is in (listed first). */
  local?: boolean;
  /** Screens §7.1 (the row opened): the Issue's blurb and each party's stance, from content. */
  blurb?: string;
  stances?: Record<FactionId, string>;
}

/** A named source in force (an ordinance or an Issue effect) with its days left. */
export interface ModifierSourceView {
  sourceId: string;
  name: string;
  kind: 'ordinance' | 'issue';
  effectLine: string;
  daysLeft: number;
}

/** The character's residence on the Me tab and the plate (ADR 0026). */
export interface ResidenceView {
  cityId: string;
  cityName: string;
  districtId: string | null;
  districtName: string | null;
  sinceDay: DayKey;
  votesFromDay: DayKey;
  standsFromDay: DayKey;
  canMoveFromDay: DayKey;
}

/** Tech design §10.5: the capital's count, five districts. */
export interface CapitalCountView {
  kind: 'capital';
  /** Review 3: the capital council's hall (the City Hall), for the header crop. */
  hall?: HallView | null;
  councilKey: string;
  cycle: number;
  countDay: DayKey;
  seatsByFaction: Record<FactionId, number>;
  npcSeats: number;
  districts: Array<{
    districtId: string;
    name: string;
    factions: Array<{
      factionId: FactionId;
      ballots: number;
      ballotShare: number;
      opinionShare: number;
      score: number;
      seats: number;
    }>;
    w: number;
    ballots: number;
    rows: Array<CountRowView & { factionId: FactionId; local: boolean }>;
    seats: Array<{ factionId: FactionId; name: string }>;
    turnout: { voters: number; eligible: number };
    scoreboard: ScoreboardTableView[];
  }>;
}

/** Slice 4 additions to the character view (optional on it until the slice-4 server fills them). */
export interface CharacterViewV5 {
  journey: {
    id: string;
    from: string;
    to: string;
    arrivesAt: number;
    status: 'onTheWay' | 'arrived';
  } | null;
  residence: ResidenceView;
  room: { untilDay: DayKey } | null;
  trainOpen: boolean;
  hero: { title: string; untilDay: DayKey } | null;
  heroes: Array<{ placeName: string; n: number }>;
  scoreboard: ScoreboardLineView[];
}

// ---------------------------------------------------------------------------------------------
// Slice 5 views and results (docs/tech/slice-5.md §8.3, §10). Fields added to the slice 1–4 views
// are optional until the slice-5 server fills them (phase B).
// ---------------------------------------------------------------------------------------------

/**
 * CityView.quarters[] (ADR 0035, 0076): a quarter of the city. The capital's districts carry their
 * frame, outline and label; a home quarter is a group of places with a Level gate (no shape).
 */
export interface QuarterView {
  id: string;
  name: string;
  frame?: Frame;
  outline?: Array<[number, number]>;
  /** Where the name sits on the overview (screens §10). */
  label?: { x: number; y: number } | null;
  open?: boolean;
  lock?: QuarterLock | null;
  blurb?: string | null;
  /** How many places it has (its own content places). */
  places?: number;
}

/** Design §4.7: the ticket's risk line (the client words the band; no digit of odds reaches the screen). */
export interface MissionRiskView {
  heat: number;
  runInChance: number;
  marks: 0 | 1 | 2 | 3;
}

/** LocationView.missions[] (tech design §8.3), after the tickets. */
export interface MissionView {
  id: string;
  name: string;
  type: MissionType;
  /** *Mission · Speech* / *Mission · Watch and listen* / *Mission · Against the {faction}*. */
  label: 'speech' | 'watch' | 'against';
  targetFactionId: FactionId | null;
  energy: number;
  briefing: string;
  ways: Array<{
    id: string;
    title: string;
    hint: string;
    preview: CheckBreakdown;
    agility: boolean;
    /** Only when it differs from the ticket's. */
    risk: { heat: number; runInChance: number } | null;
  }>;
  remembered: string | null;
  suggested: string;
  /** Of the remembered (else the suggested) way. */
  risk: MissionRiskView;
  tags: OrdinanceTagView[];
  placeTags: PlaceTagView[];
  order: { id: string; title: string; progress: number; target: number } | null;
  locked: { reason: 'LEVEL' | 'RANK' | 'STANDING' | 'RECORD'; need: number; rankTitle?: string } | null;
  art: ResultArt;
}

/** The run-in modal's state (ADR 0032): one choice. The client prints odds words, never numbers. */
export interface RunInPending {
  kind: 'runIn';
  encounterId: string;
  decideBy: number;
  serverNow: number;
  place: { cityId: string; locationId: string; locationName: string };
  what: { kind: 'mission' | 'action'; id: string; name: string };
  opponent: {
    id: string;
    label: string;
    appears: string;
    portrait: AssetView;
    bribable: boolean;
    payOff: number | null;
  };
  you: { health: number; healthMax: number; heat: number; heatState: HeatState };
  rows: {
    fight: { chance: number };
    run: { chance: number };
    talk: { chance: number };
    /** null: the opponent cannot be bought. */
    pay: { chance: number; price: number; affordable: boolean } | null;
  };
  /** The *best free odds* tag. */
  luck: 'fight' | 'run' | 'talk';
  character: CharacterView;
}

/** ActionResult.mission (tech design §10.1): *Mission · Against the Vanguard*. */
export interface MissionResultView {
  id: string;
  type: MissionType;
  label: 'speech' | 'watch' | 'against';
  targetFactionId: FactionId | null;
  way: { id: string; title: string; stats: CheckStatSpec; agility: boolean };
  firstTime: boolean;
}

/** ActionResult.street (tech design §10.1–§10.2). */
export interface StreetView {
  runIn: {
    /** `pronoun`: the did line's *he* / *they* (QA fixes §7.3); absent on results stored before it (*he*). */
    opponent: { id: string; label: string; portrait: AssetView; pronoun?: 'he' | 'they' };
    choice: 'fight' | 'run' | 'talk' | 'pay';
    by: 'player' | 'luck' | 'auto';
    /**
     * `band`: the row's odds word (QA fixes n12: a row that didn't come off gives its reason by band);
     * `chance` and `roll` for dev and QA only.
     */
    steps: Array<{
      row: 'fight' | 'run' | 'talk' | 'pay';
      ok: boolean;
      band?: 'good' | 'fair' | 'long';
      chance?: number;
      roll?: number;
    }>;
    outcome: 'won' | 'lost' | 'ran' | 'talked' | 'paid';
    /** The opponent's line for the outcome. */
    line: string;
    cause: 'power' | 'agi' | 'cha' | 'luck' | null;
    health: { before: number; after: number; max: number; fullAt: number | null } | null;
    ironPaid: number;
    heatAdded: number;
    xp: number;
  } | null;
  heat: {
    before: number;
    gain: number;
    after: number;
    state: HeatState;
    stateBefore: HeatState;
    coolsAt: number | null;
    /** The first crossing into this state (the one-line card). */
    first: boolean;
  } | null;
  caught: { caught: boolean; withoutRoll: boolean; chance?: number; roll?: number } | null;
  record: {
    added: number;
    escalated: boolean;
    before: RecordLevel;
    after: RecordLevel;
    marks: number;
    /** The first crossing into the level reached (`after`): its card (QA m5). */
    first: boolean;
    /** Every live mark is minor: the card's fade clause (QA m5). Absent on older results. */
    allMinor?: boolean;
    /**
     * Review 4 #20 (ADR 0078): the marks are an arrest's (*Your record: taken in · 1 mark · On
     * file*), not a name taken. Absent on older results.
     */
    takenIn?: boolean;
  } | null;
  /** Review 4 #20 (ADR 0078): sent to the cells, the day's orders are off (*Orders off until the day turns*). */
  ordersOff?: boolean;
  sentTo: {
    kind: 'cells' | 'infirmary';
    stayId: string;
    placeName: string;
    until: number;
    bail: number | null;
    landing: Landing;
  } | null;
  agility: { quarters: number; gained: boolean } | null;
  /** *Missions remember: next time, one tap* (the first time). */
  remembered: boolean;
  /** A tier-1 tap on rival ground or a mission dropped by a Run or a loss. */
  dropped?: 'ran' | 'lost' | null;
}

/**
 * Review 4 #19 (answers §19, ADR 0078): one row of *In the cells now* on a police station's sheet.
 * Public fields only: being held is printed in the paper; the record, Heat and bail are not shown.
 */
export interface CellsNowRow {
  name: string;
  avatar: AssetView | null;
  factionId: FactionId;
  /** Epoch ms: *out in 24 min*. */
  until: number;
  /** The viewer's own row reads *you*. */
  you: boolean;
}

/** `held.inCells`: the players held at a station now, soonest out first (at most 50). */
export interface CellsNowView {
  rows: CellsNowRow[];
  serverNow: number;
}

/** The cells or the infirmary (`/held`, tech design §8.3). */
export interface HeldView {
  stayId: string;
  kind: 'cells' | 'infirmary';
  state: 'in' | 'out';
  cityId: string;
  cityName: string;
  locationId: string;
  placeName: string;
  since: number;
  until: number;
  serverNow: number;
  rivalGround: boolean;
  /** *You again*: a second arrest in seven days, or a second stay. */
  again: boolean;
  bail: { total: number; lines: PriceLineView[]; affordable: boolean; legalAid: boolean } | null;
  walkOut: { energy: 5; iron: 100; affordable: boolean } | null;
  discharge: { energy: 5; healthTo: number; affordable: boolean } | null;
  health: { value: number; max: number; fullAt: number | null };
  /** *Listen to the cells* / *Talk to the ward*. */
  tap: ActionView;
  /**
   * Phase C (screens §6, §7): the held place's picture (the `jail` or `hospital` binding, the result's
   * ladder) and the voice's portrait (the duty officer, the matron). Optional: stays read before it.
   */
  art?: ResultArt;
  voice?: AssetView;
  /** State `out`: the stored release modal. */
  release: PoliticalResult | null;
  election: PoliticsSummaryView | null;
  paperUnread: number;
  /**
   * Review 4 #20 (ADR 0078): the arrest took today's orders off (*The branch has taken today's orders
   * off the board.*). Absent on the infirmary.
   */
  ordersOff?: boolean;
}

/** Slice 5 additions to the character view (tech design §8.3; optional on it until phase B). */
export interface CharacterViewV6 {
  heat: {
    value: number;
    state: HeatState;
    at: number;
    /** Milliseconds a point (the client projects between reads). */
    stepMs: number;
    /** When it drops under 25 (*Cool by*); null while Cool (design §23.1 #9). */
    coolsAt: number | null;
    zeroAt: number | null;
  };
  health: { value: number; max: number; full: boolean; at: number; fullAt: number | null };
  record: {
    level: RecordLevel;
    marks: number;
    fadesOn: DayKey | null;
    fading: number;
    bailDoubled: boolean;
    ironPct: number;
    strike: { cost: 30; affordable: boolean } | null;
  };
  held: {
    stayId: string;
    kind: 'cells' | 'infirmary';
    state: 'in' | 'out';
    until: number;
    placeName: string;
    cityId: string;
  } | null;
  runIn: { encounterId: string; state: 'pending' | 'resolved'; decideBy: number } | null;
  agiQuarters: number;
  here: { rivalGround: boolean; flags: Array<'watched' | 'warned'> };
  barred: Array<{ cityId: string; cityName: string; until: number }>;
}

/** Slice 5 desk rows (tech design §11.3), live at read. */
export interface DeskViewV5 {
  /** `until` (review 4): the epoch ms the stay ends, for *out in 24 min* (`copy.when`). */
  held: {
    kind: 'cells' | 'infirmary';
    placeName: string;
    minutesLeft: number;
    until: number;
    bail: number | null;
  } | null;
  heat: { value: number; state: HeatState; coolsAt: number | null } | null;
  record: { level: RecordLevel; marks: number } | null;
  where: { rivalGround: { cityName: string } } | null;
}
