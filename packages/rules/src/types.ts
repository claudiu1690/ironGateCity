/**
 * Shared vocabulary and DTOs. The server builds these; the client and `@irongate/ui` render them.
 * Kept in the rules package so every layer imports types from one place.
 */

export const FACTION_IDS = ['vanguard', 'collective', 'alliance'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export const STAT_KEYS = ['str', 'int', 'agi', 'cha'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
/** Stats as a check sees them; `cha` is already the worn value (§8.2). */
export type Stats = Record<StatKey, number>;

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
  stat: StatKey;
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
}

export interface ActionPreview {
  id: string;
  name: string;
  type: string;
  stat: StatKey;
  energy: number;
  preview: CheckBreakdown;
}

export interface LocationView {
  id: string;
  name: string;
  kind: string;
  blurb: string;
  actions: ActionPreview[];
}

export interface CityView {
  id: string;
  name: string;
  role: CityRole;
  homeFactionId?: FactionId;
  opinion: OpinionShares;
  locations: LocationView[];
}

export interface BonusTag {
  id: string;
  label: string;
  note: string;
}

/** The whole result modal (GDD §13.1a), stored verbatim in `actionLogs.result`. */
export interface ActionResult {
  logId: string;
  idempotencyKey: string;
  /** ISO 8601, UTC. */
  performedAt: string;
  seed: string;
  place: { cityId: string; cityName: string; locationId: string; locationName: string; kind: string };
  action: { id: string; name: string; type: string; tier: 1 };
  stamp: 'success' | 'partial';
  headline: string;
  body: string;
  attempts: ActionAttempt[];
  rewards: Rewards;
  bonusTags: BonusTag[];
  effects: {
    energy: { before: number; after: number; max: number; nextTickAt: number | null };
    rested: { before: number; after: number };
    xp: { before: number; after: number };
    fxp: { before: number; after: number };
    iron: { before: number; after: number };
    level: number;
    opinion: { cityId: string; factionId: FactionId; delta: number; applied: false };
  };
  character: CharacterView;
}

export type GameErrorReason =
  | 'NOT_ENOUGH_ENERGY'
  | 'WRONG_CITY'
  | 'UNKNOWN_CITY'
  | 'UNKNOWN_ACTION'
  | 'UNKNOWN_LOCATION'
  | 'ACTION_CONFLICT';

/** `error.data.game` on a tRPC error: a reason the client can switch on, plus its numbers. */
export interface GameErrorData {
  reason: GameErrorReason;
  [key: string]: unknown;
}
