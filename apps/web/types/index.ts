export type Faction = 'FASCIST' | 'COMMUNIST' | 'DEMOCRAT';
export type MissionType = 'ASSAULT' | 'INFILTRATION' | 'PROPAGANDA' | 'EXTORTION' | 'ALLIANCE' | 'SABOTAGE';
export type MissionOutcome = 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'ENCOUNTER_WIN' | 'ENCOUNTER_LOSS';
export type ItemSlot = 'WEAPON' | 'ARMOUR' | 'UTILITY' | 'ACCESSORY' | 'DOCUMENT';
export type Weather = 'CLEAR' | 'RAIN' | 'FOG' | 'SNOW' | 'HEAT_WAVE' | 'FROST';
export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export interface Character {
  id: string;
  name: string;
  level: number;
  /** factionRank is the Prisma field name */
  rank: number;
  factionRank: number;
  faction: Faction | null;
  str: number;
  int: number;
  /** agi = agility — the backend field name. Also exposed as `char` alias on some API responses. */
  agi: number;
  char?: number;
  charisma: number;
  xp: number;
  fxp: number;
  factionXp: number;
  ironMarks: number;
  currentHealth: number;
  maxHealth: number;
  criminalPoints: number;
  isHospitalised: boolean;
  hospitalisedUntil?: string;
  originStoryComplete: boolean;
  currentCityId: string;
  currentCity?: City;
  equipment?: Equipment;
  bodyguards?: Bodyguard[];
}

export interface City {
  id: string;
  name: string;
  slug: string;
  influence?: CityInfluence;
}

export interface CityInfluence {
  cityId: string;
  fascistPct: number;
  communistPct: number;
  democratPct: number;
}

export interface NationalControl {
  FASCIST: number;
  COMMUNIST: number;
  DEMOCRAT: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  energyCost: number;
  xpReward: number;
  ironReward: number;
  fxpReward: number;
  encounterChance: number;
  minStr?: number;
  minInt?: number;
  minChar?: number;
  minEnd?: number;
  minLevel?: number;
  minRank?: number;
  faction?: Faction;
  cityId: string;
  eligible: boolean;
  ineligibilityReason?: string;
}

export interface CombatRound {
  round: number;
  playerDamage: number;
  npcDamage: number;
  playerHp: number;
  npcHp: number;
  npcName: string;
}

export interface MissionResult {
  outcome: MissionOutcome;
  narrative: string;
  xpGained: number;
  ironGained: number;
  fxpGained: number;
  combatLog?: CombatRound[];
  leveledUp: boolean;
  newLevel?: number;
  rankedUp?: boolean;
  newRank?: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  tier: number;
  faction?: Faction;
  price: number;
  strBonus?: number;
  intBonus?: number;
  charBonus?: number;
  endBonus?: number;
  hpBonus?: number;
}

export interface Equipment {
  weapon?: Item;
  armour?: Item;
  utility?: Item;
  accessory?: Item;
  document?: Item;
}

export interface DossierEntry {
  id: string;
  targetName: string;
  targetFaction?: Faction;
  intel: string[];
  isStale: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  minStr?: number;
  minInt?: number;
  minRank?: number;
  energyCost: number;
  ironMin: number;
  ironMax: number;
  available: boolean;
}

export interface Law {
  id: string;
  title: string;
  description: string;
  effect: string;
  status: 'PROPOSED' | 'ACTIVE' | 'EXPIRED';
  proposedBy?: Faction;
  yesVotes: number;
  noVotes: number;
  activatedAt?: string;
  expiresAt?: string;
}

export interface Election {
  id: string;
  faction: Faction;
  status: 'NOMINATION' | 'VOTING' | 'CONCLUDED';
  nominationEnds: string;
  votingEnds: string;
  candidates?: ElectionCandidate[];
  winnerId?: string;
}

export interface ElectionCandidate {
  id: string;
  characterId: string;
  name: string;
  voteWeight: number;
}

export interface WeatherState {
  season: Season;
  weather: Weather;
  createdAt: string;
}

export interface NewsItem {
  message: string;
  type: 'election' | 'law' | 'influence' | 'president' | 'weather';
  timestamp: number;
}

export interface Bodyguard {
  id: string;
  tier: number;
  name: string;
  str: number;
  hp: number;
  dailyCost: number;
  active: boolean;
}

export interface EnergyPack {
  priceId: string;
  amount: number;
  price: number;
  label: string;
  description: string;
}

export interface BarStatus {
  drinksToday: number;
  contactsMet: number;
  gamblesWon: number;
  limits: { drink: number; meet_contact: number; gamble: number };
}

export interface HospitalStatus {
  isHospitalised: boolean;
  currentHealth: number;
  maxHealth: number;
  hospitalisedUntil?: string;
  hasNeglectDebuff: boolean;
}
