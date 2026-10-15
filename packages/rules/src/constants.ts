/**
 * Every number the rules use, in one place. Section numbers refer to docs/GDD.md.
 * Values pinned by the game designer for slice 0 are in docs/design/slice-0-answers.md.
 */

/** §6.2 — Energy: max 100, +5 every 10-minute tick. */
export const ENERGY = { max: 100, regenPerTick: 5, tickMs: 10 * 60_000 } as const;

/** §6.3 — Rested: regen that overflows a full bar; +50 % XP and Iron per Energy point it covers. */
export const RESTED = { cap: 200, xpBonus: 0.5, ironBonus: 0.5 } as const;

/** §8.4 — Chance = 50 + 4 × (stat − difficulty) + bonuses, clamped 5..95. Partial up to 20 above. */
export const CHECK = { base: 50, perPoint: 4, min: 5, max: 95, partialWindow: 20 } as const;

/** §8.4 — difficulty of a tier-1 action by city role. */
export const TIER1_DIFFICULTY = { home: 8, battleground: 10 } as const;

/** §5.5 — reward rates per Energy, by tier (slice 5: tier 2, the missions). */
export const TIER_RATES = {
  1: { xpPerEnergy: 4.5, fxpPerEnergy: 0.6, ironPerEnergy: 2 },
  2: { xpPerEnergy: 5, fxpPerEnergy: 0.8, ironPerEnergy: 4 },
} as const;

/** §14.2 — opinion swing in percentage points per Energy, by tier (halved on a Partial like every reward). */
export const OPINION_PER_ENERGY = { 1: 0.005, 2: 0.01 } as const;

/** §14.2 — opinion keeps three decimals (shown to one). */
export const OPINION_DECIMALS = 3;

/** §8.4 — share of the rewards each outcome pays (a tier-1 action never fails). */
export const OUTCOME_FACTOR = { success: 1, partial: 0.5, failure: 0 } as const;

/**
 * §5.3 — cumulative XP at which each level is reached, Levels 1..51 (index 0 = Level 1).
 * Level-ups are not applied until slice 1; the table lives here so the rules own it.
 */
// prettier-ignore
export const LEVEL_XP_THRESHOLDS = [
  0, 150, 450, 900, 1_600, 2_500, 3_500, 4_650, 5_950, 7_400, //                       1-10
  9_000, 10_800, 12_800, 15_000, 17_400, 20_000, 22_800, 25_900, 29_300, 33_000, //    11-20
  37_000, 41_400, 46_200, 51_400, 57_000, 63_000, 69_400, 76_300, 83_700, 91_600, //   21-30
  100_000, 109_300, 119_200, 129_700, 140_800, 152_500, 164_800, 177_700, 191_200, 205_300, // 31-40
  220_000, 235_300, 251_200, 267_700, 284_800, 302_500, 320_800, 339_700, 359_200, 379_300, // 41-50
  400_000, //                                                                          51
] as const;

/** §5.3 — from Level 31 the XP for the next level is 9,300 and grows by 600 per level, with no cap. */
export const LEVEL_XP_STEP = { fromLevel: 31, firstStep: 9_300, growth: 600 } as const;

// ---------------------------------------------------------------------------------------------
// Slice 1 (docs/tech/slice-1.md §6.1). Content numbers: docs/design/slice-1-content.md, docs/economy.md.
// ---------------------------------------------------------------------------------------------

/** §2.2 — the City Day runs from 00:00 UTC; one constant so the boundary can move (ADR 0005). */
export const CITY_DAY = { ms: 86_400_000, utcOffsetMs: 0 } as const;

/**
 * §2.2 (review 5, ADR 0079): the town's own day is six hours, aligned to the City Day so 00:00 UTC is
 * a dawn; night is its last two (dusk at 04, 10, 16 and 22 UTC). The same for everyone. Every daily
 * rule stays on the real City Day.
 */
export const GAME_DAY_HOURS = 6;
export const NIGHT_HOURS = 2;

/** §13.4 — Local Standing: Successes needed for each level (0–4) and +3 % per level on checks there. */
/** Review 1 (§13.4): One of Us (level 4) pays 1 PC a day at the boundary, per city where held. */
export const STANDING = { thresholds: [0, 10, 30, 70, 150], bonusPerLevel: 3, oneOfUsPcPerDay: 1 } as const;

/**
 * Review 1 (§8.4, §7.5): the First day bonus, +10 % on every checked action in the home city during
 * the welcome day (the creation day, and the next one when created at or after 22:00 UTC).
 */
export const FIRST_DAY = { chancePct: 10, lateFromHourUtc: 22 } as const;

/** §5.4 — FXP at which Ranks 1..7 are reached (Rank 2 lowered to 400). */
export const RANK_FXP = [0, 400, 2_000, 6_000, 15_000, 25_000, 60_000] as const;

/**
 * Review 4 #25 (answers §25, GDD §5.4): what each Rank opens, Rank 1 first, as keys of the ladder's
 * plain-words lines (`copy.ranks.opens`): the same in every party.
 */
export const RANK_OPENS = ['hall', 'vote', 'stand', 'chair', 'list', 'president', 'life'] as const;

/** §5.3 — stat points granted per level gained, placed on STR, INT or AGI (review 1). */
export const LEVEL_UP = { statPoints: 1 } as const;

/** §6.5 — Political Capital cap; it never decays. */
export const PC = { cap: 1_000 } as const;

/** §13.3 — FXP rate multiplier by action type (council sessions are party work). */
export const FXP_TYPE_MULTIPLIER: Readonly<Record<string, number>> = { council: 1.5 };

/** §8.5 — training: Energy for the next point = 20 + 2 × stat; XP at half the tier rate. */
export const TRAINING = { baseCost: 20, costPerPoint: 2, xpRateShare: 0.5 } as const;

/** §9.1 — jobs. */
export const JOBS = {
  /**
   * Review 1 (GDD §9.1): a job is a wage. Seniority is +2 % of the daily pay for every City Day
   * boundary the job has been held, to +20 % after ten days; it resets only on a switch.
   */
  seniorityPerDay: 0.02,
  seniorityCapDays: 10,
  /** Designer answer §12 Q9 (GDD §9.1, §4.2): one settlement credits at most 14 days' pay. */
  salaryMaxDays: 14,
} as const;

/** §15.4, §13.7 — Party Directives v1 (the NPC secretary's orders). */
export const DIRECTIVES = {
  matchFxpBonus: 0.25,
  orderDoneFxp: 20,
  allDonePc: 5,
  /** dayKey(2026-01-01): the rotation counts City Days from here. */
  epochDay: 20_454,
  /** Designer answer §12 Q3 (GDD §15.4): only rows that advance an open order get +25 % FXP. */
  bonusOnlyWhileOpen: true,
} as const;

/** §14.2 — Neutral never below 5 %; a home faction never below 50 % in its home city. */
export const OPINION_FLOORS = { neutral: 5, homeFaction: 50 } as const;

/** §3.3 — the Morning Paper. */
export const PAPER = { dueAfterAbsenceMs: 3 * 3_600_000, personalMax: 2, headlines: 3 } as const;

/** §13.1 — repeat counts the rules accept (the API allows 1 | 3 in slice 1). */
export const REPEAT = { allowed: [1, 3, 5] } as const;

// ---------------------------------------------------------------------------------------------
// Slice 2 (docs/tech/slice-2.md §6.1). Content numbers: docs/design/slice-2-onboarding.md.
// ---------------------------------------------------------------------------------------------

/** §8.5: 5 in each trained stat before the origin; §21.4: a new character starts with 0 Iron. */
export const STARTING = { baseStat: 5, iron: 0 } as const;

/** §17.1: at most one chapter every seven City Days; twelve chapters per Ambition. */
export const AMBITION = { daysBetweenChapters: 7, chaptersPlanned: 12 } as const;

/** §8.4: a chapter check uses the tier-3 outcome bands (Success / Partial / Failure). */
export const CHAPTER = { tier: 3 } as const;

/**
 * §7.3 (onboarding §14.2): a player's name is 2–40 characters once trimmed, inner runs of spaces
 * collapsed to one. Forty: the name is printed in a day-1 headline and in the HUD.
 */
export const NAME = { min: 2, max: 40 } as const;

// ---------------------------------------------------------------------------------------------
// Slice 3 (docs/tech/slice-3.md §6.1). Rules: docs/design/slice-3-politics.md; GDD §15.1, §15.3,
// §6.5, §14.11.
// ---------------------------------------------------------------------------------------------

/** §15.1, §15.3, §6.5: the home council cycle, the race and its costs. */
export const COUNCIL = {
  cycleDays: 5,
  seats: 7,
  slateSize: 9,
  endorsementsCounted: 5,
  endorsementWeight: 3,
  wardDivisor: 5,
  npcJitter: 2,
  activeEndorserDays: 7,
  termDays: 5,
  ordinanceDays: 5,
  /** STANDING level "Known". */
  knownLevel: 2,
  standRank: 3,
  voteRank: 2,
  /** The voting rework (ADR 0084): standing is 10 PC spent; backing 10 PC. */
  cost: { declare: 10, endorse: 10 },
  stipend: { pc: 10, fxp: 20 },
  /** Voting rework (ADR 0083, design §3.3): the rule cards on a home ballot. */
  ballotCards: 3,
} as const;

/** §14.11: morale states, the drift and the slice-3 inputs. */
export const MORALE = {
  firedFrom: 80,
  unrestBelow: 60,
  driftTarget: 70,
  driftShare: 0.02,
  ballot: 0.5,
  seat: 2,
  noVoterPenalty: 3,
  firedFxpShare: 0.1,
} as const;

/** §15.3 (ADR 0021): each ordinance effect kind's bounds; the menu is closed, so a bound is a value. */
export const ORDINANCE_BOUNDS = {
  jobPayPct: [-25, 10],
  /** Review 1: the Long Service Order (was Shift Hours): seniority builds two days a day. */
  seniorityDays: [1, 2],
  swingPct: [0, 15],
  energyDelta: [-2, 0],
  trainingEnergyPct: [-20, 0],
  restedCapDelta: [0, 50],
  chancePct: [0, 4],
  standingMultiplier: [1, 2],
  ironPct: [0, 25],
  fxpPct: [0, 25],
  /** Slice 4 (ADR 0030): Tram Subsidy and the Tram Fare Hike halve tickets (never below 5 Iron). */
  ticketPct: [-50, 0],
  /** Slice 4 (tech design §23 #2): Eviction Notices halve the room. */
  roomPct: [-50, 0],
  /** Slice 5 (design §12.1): the Customs Strike, Heat cools half again as fast. */
  heatCoolPct: [0, 100],
  /** Slice 5 (design §12.1): The Cells Are Full halves bail. */
  bailPct: [-50, 0],
} as const;

/** `{ordinal}` in the count's headlines: first … seventh. */
export const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'] as const;

// ---------------------------------------------------------------------------------------------
// Slice 4 (docs/tech/slice-4.md §6.1). Rules: docs/design/slice-4-battleground.md; GDD §14.2–§14.6,
// §14.9–§14.11, §15.3, §18.3.
// ---------------------------------------------------------------------------------------------

/** §14.10, §18.3: the train from Level 10, a 20-Iron ticket (never below 5), a card one trip in three. */
export const TRAVEL = { level: 10, fare: 20, fareFloor: 5, cardOneIn: 3 } as const;

/** §14.11: registering a residence: Rank 2, 500 Iron, seven City Days between moves. */
export const RESIDENCE = { rank: 2, cost: 500, cooldownDays: 7 } as const;

/** §14.11: a room in Irongate, 100 Iron for seven City Days, Rested cap +50 while it runs. */
export const ROOM = { cost: 100, days: 7, restedBonus: 50, cityId: 'irongate' } as const;

/** §14.2, §14.4: a district's drift, close race, control and comeback (Groundswell). */
export const DISTRICT = {
  driftShare: 0.01,
  battlegroundWithin: 10,
  controlAbove: 50,
  groundswellPerDay: 5,
  groundswellMax: 30,
  groundswellDays: 14,
} as const;

/** §14.4: a close race gives political actions +25 % swing, +25 % Party XP and +5 chance. */
export const BATTLEGROUND = {
  swingPct: 25,
  fxpShare: 0.25,
  chancePct: 5,
  types: ['canvass', 'speech', 'propaganda', 'council'],
} as const;

/** §14.6: two Issues a city a week; +50 % swing when tagged; the owner +3; 4 PC to the top five. */
export const ISSUES = {
  perCity: 2,
  swingPct: 50,
  ownerSwing: 3,
  topFive: 5,
  topPc: 4,
  effectDays: 7,
} as const;

/** §15.3: the capital's council: ten seats, two a district, the turnout weight (the largest bloc's rule, ADR 0085). */
export const CAPITAL_COUNCIL = {
  seats: 10,
  perDistrict: 2,
  fullTurnout: 10,
  ballotWeightMax: 50,
  npcPerFaction: 2,
} as const;

/** §14.5: District / City Hero: at least +0.5, 25 PC, by level bracket. */
export const HERO = {
  minSwing: 0.5,
  pc: 25,
  brackets: [
    [1, 15],
    [16, 30],
    [31, Infinity],
  ],
} as const;

/** dayKey(2026-01-05), a Monday: the week starts on Monday (Issues of the Week). */
export const WEEK = { mondayEpoch: 20_458 } as const;

// ---------------------------------------------------------------------------------------------
// Slice 5 (docs/tech/slice-5.md §6.1). Rules: docs/design/slice-5-risk.md (§23 settles the points
// of the tech design's §22.1); GDD §6.1, §6.4, §8.4, §11, §13.1–§13.3, §14.11–§14.13, §19, §20.
// ---------------------------------------------------------------------------------------------

/** §5.5, §8.4, §14.2: tier 2 (missions) from Level 6; a Failure pays a fifth of the XP. */
export const TIER2 = {
  rates: TIER_RATES[2],
  opinionPerEnergy: OPINION_PER_ENERGY[2],
  failureXpShare: 0.2,
  fromLevel: 6,
} as const;

/** §8.4 (design §4.3): difficulty by the mission's Level; +2 in the capital (a battleground). */
export const MISSION_LADDER = { 6: 14, 8: 16, 10: 18, 12: 20, battlegroundStep: 2 } as const;

/** Design §4.2: the six mission types (GDD §13.3, §6.4, §11.2 pinned for slice 5). */
export const MISSION_TYPE_IDS = [
  'speech',
  'surveillance',
  'vandalism',
  'disruption',
  'sabotage',
  'theft',
] as const;
export type MissionType = (typeof MISSION_TYPE_IDS)[number];

export type MarkKind = 'minor' | 'moderate' | 'serious';

export interface MissionTypeSpec {
  energy: number;
  /** Heat added on every outcome (×2 on rival ground). */
  heat: number;
  /** The run-in base, % (×2 on rival ground). */
  runIn: number;
  /** The caught check's base, %, or null (legal types: no check). */
  caught: number | null;
  marks: 0 | 1 | 2 | 3;
  markKind: MarkKind | null;
  givesFxp: boolean;
  /** Persuasion from Neutral, against the target faction, or none. */
  opinion: 'persuade' | 'against' | null;
  opinionMult: number;
  ironMult: number;
  /** The action type orders and Issues see (ADR 0031 §4). */
  seenAs: string;
  illegal: boolean;
}

// prettier-ignore
export const MISSION_TYPES: Readonly<Record<MissionType, MissionTypeSpec>> = {
  speech: { energy: 15, heat: 0, runIn: 5, caught: null, marks: 0, markKind: null, givesFxp: true, opinion: 'persuade', opinionMult: 1, ironMult: 1, seenAs: 'speech', illegal: false },
  surveillance: { energy: 12, heat: 5, runIn: 10, caught: null, marks: 0, markKind: null, givesFxp: false, opinion: null, opinionMult: 0, ironMult: 1, seenAs: 'intelligence', illegal: false },
  vandalism: { energy: 10, heat: 6, runIn: 15, caught: 8, marks: 1, markKind: 'minor', givesFxp: true, opinion: 'against', opinionMult: 2, ironMult: 1, seenAs: 'vandalism', illegal: true },
  disruption: { energy: 15, heat: 8, runIn: 30, caught: 10, marks: 1, markKind: 'minor', givesFxp: true, opinion: 'against', opinionMult: 2, ironMult: 1, seenAs: 'disruption', illegal: true },
  sabotage: { energy: 20, heat: 12, runIn: 25, caught: 20, marks: 3, markKind: 'serious', givesFxp: true, opinion: 'against', opinionMult: 2, ironMult: 1, seenAs: 'sabotage', illegal: true },
  theft: { energy: 15, heat: 10, runIn: 25, caught: 15, marks: 2, markKind: 'moderate', givesFxp: true, opinion: null, opinionMult: 0, ironMult: 2, seenAs: 'theft', illegal: true },
};

/** §6.4 (design §6): Heat 0–100, cooling 5 an hour; the four states; 25 after a release. */
export const HEAT = {
  max: 100,
  coolPerHour: 5,
  states: { noticed: 25, hot: 50, wanted: 75 },
  /** The state's bonus on the run-in chance and the caught check. */
  bonus: { cool: 0, noticed: 5, hot: 15, wanted: 15 },
  afterRelease: 25,
  /** A failed *Pay them off* (design §10.3). */
  failedPayOff: 10,
} as const;

/** §11.2 (design §7.1): base + Heat ÷ 2 + the state's bonus − AGI ÷ 2, kept 2–95. */
export const CAUGHT = { min: 2, max: 95, agiDivisor: 2, heatDivisor: 2 } as const;

/** §11.3–§11.4 (design §7.3): the record's levels, penalties, fade and strike-off. */
export const RECORD = {
  levels: { onFile: 1, repeat: 3, notorious: 6 },
  ironPct: { clean: 0, onFile: -10, repeat: -20, notorious: -30 },
  repeatBonus: 5,
  minorFadeDays: 14,
  strikePc: 30,
  escalateWithinDays: 7,
  escalatedMarks: 3,
  /** Review 4 #20 (GDD §11.2, ADR 0078): an arrest on work that carries no mark is one minor mark. */
  arrestMarks: 1,
  notoriousBars: { kinds: ['court', 'university'], hqOf: 'alliance' },
} as const;

/** §6.1, §19.1 (design §9): Health, the infirmary's stay and its two ways out. */
export const HEALTH = {
  base: 100,
  perLevel: 5,
  regen: 10,
  tickMs: 600_000,
  admitted: 30,
  stayMinutes: 20,
  walkOut: { energy: 5, iron: 100 },
  discharge: { energy: 5, share: 0.5 },
} as const;

/**
 * Review 5 (answers §8, GDD §19.1, §18.3): *Get patched up* at any infirmary, a walk-in: one Iron a
 * point of Health missing, at least 10; no Energy; Health to its maximum at once.
 */
export const TREATMENT = { perPoint: 1, minIron: 10 } as const;

/** §19.2 (design §8.2): the sentence and bail. */
export const CELLS = {
  /** Review 4 #20 (GDD §19.2, ADR 0078): was 10. */
  baseMinutes: 20,
  heatDivisor: 2,
  maxMinutes: 60,
  rivalFactor: 1.5,
  bail: { base: 100, perMark: 50, notoriousPct: 100, rivalPct: 100, legalAidPct: -50, roundTo: 10 },
} as const;

/** §20 (design §10): run-ins. */
export const RUN_IN = {
  /** ADR 0032: luck takes an unanswered run-in after five minutes (or at the day's end). */
  decideMs: 5 * 60_000,
  max: 90,
  watched: 10,
  warned: -10,
  repeatBonus: 5,
  /** Design §23.1 #2: a tier-1 tap on rival ground, 15 flat. */
  rivalTier1: 15,
  /** §14.12 (review 5, ADR 0080): at night on rival ground the tier-1 base is 25. */
  rivalTier1Night: 25,
  /** §14.12 (review 5, ADR 0080): a mission's run-in at night on rival ground, after the ×2. */
  rivalNightAdd: 10,
  rivalFactor: 2,
  policeShare: 0.5,
  tier2PowerFactor: 1.1,
  rivalPowerAdd: 4,
  fight: { base: 50, perPower: 3 },
  run: { factor: 60 },
  talk: { base: 50, perPoint: 4 },
  pay: { chance: 90 },
  /** A failed Run or Talk: the fight at −10. */
  followUpPct: -10,
  xp: { won: 20, away: 10 },
  /** *Won at full strength*: +10 % on the mission's XP and Party XP. */
  fullStrengthShare: 0.1,
  damage: { factor: 0.8, spreadPct: 20 },
  clamp: [5, 95],
} as const;

/** §20.3: armour by clothing tier (Tier I = 4); your power adds half of it. */
export const ARMOUR_BY_TIER = [4, 8, 12, 16, 20] as const;

/** §14.11–§14.12 (design §11.2): rival ground. The +4 difficulty is a check row of −16. */
export const RIVAL_GROUND = {
  checkRow: -16,
  fxpShare: 0.5,
  fxpShareUnrest: 0.75,
  heatFactor: 2,
  caughtFactor: 2,
  /** Points of opinion a home faction loses to rivals per City Day, at most. */
  pressureCapPerDay: 2,
  barredMs: 24 * 3_600_000,
  cardDifficulty: 14,
} as const;

/**
 * Review 5 (answers §10.3, GDD §14.11, ADR 0082): the Unrest prize. When a rival home city enters
 * Unrest, every member of a pushing party who moved at least `minPushedK` thousandths there in the
 * `windowDays` City Days before gets `fxp` Party XP; paid once per entry and at most once in
 * `everyDays` per city. `legacy` waits for slice 8.
 */
export const UNREST_PRIZE = {
  fxp: 50,
  minPushedK: 500,
  windowDays: 7,
  everyDays: 7,
  legacy: 2,
  top: 3,
} as const;

/** §14.13: quarters open by Level, per character. */
export const QUARTERS = { levels: [1, 6, 10] } as const;

// ---------------------------------------------------------------------------------------------
// Slice 6 (docs/tech/slice-6.md §6.1). Rules: docs/design/slice-6-together.md §2, §9; GDD §16.2,
// §16.3, §19.1; docs/economy.md §20.
// ---------------------------------------------------------------------------------------------

/** Design §2 (GDD §16.3): Campaign Events. Bands, rates, volunteers, hands and the limits. */
export const EVENTS = {
  startsInHours: [1, 3, 6, 12],
  withdrawBeforeMs: 3_600_000,
  hands: { max: 4, energy: 5 },
  namedRoleRank: 2,
  callRank: 3,
  maxOpenSignups: 3,
  /** + the fixture = three starts a place a City Day. */
  perPlaceDay: { memberStarts: 2, memberOpen: 1 },
  volunteer: { score: 0.5, firedUp: 0.75 },
  bands: [
    { min: 0.875, band: 'triumph', m: 1.5 },
    { min: 0.625, band: 'success', m: 1 },
    { min: 0.375, band: 'mixed', m: 0.5 },
    { min: 0, band: 'fiasco', m: 0 },
  ],
  roleScore: { success: 1, partial: 0.5, failure: 0 },
  fillCap: 1.25,
  xp: {
    perEnergy: 5,
    byRoll: { success: 1, partial: 0.5, failure: 0.2 },
    handByBand: { triumph: 1, success: 1, mixed: 0.5, fiasco: 0.2 },
  },
  fxp: { perEnergy: 0.8, byBand: { triumph: 1.5, success: 1, mixed: 0.5, fiasco: 0.25 } },
  /** Halves up after the first event of the member's City Day: 8 / 5 / 3 / 2 (economy §20.4). */
  pc: { triumph: 15, success: 10, mixed: 6, fiasco: 3, laterShare: 0.5 },
  momentumByBand: { triumph: 1, success: 1, mixed: 0.5, fiasco: 0 },
  doubleMomentum: 2,
  grandRallyHeat: 5,
  rivalHeldAbove: 50,
  resultsKept: 10,
} as const;

/** Design §7 (ADR 0040): *here now* is seen in the last ten minutes; the touch at most once a minute. */
export const PRESENCE = { hereNowMs: 600_000, touchEveryMs: 60_000, trainWindowMs: 600_000, namesShown: 2 } as const;

/** Design §8 (ADR 0039): 280 characters, 200 lines or 7 days, the three rate limits. */
export const CHAT = {
  maxLength: 280,
  keep: 200,
  page: 50,
  ttlDays: 7,
  minGapMs: 3_000,
  window: { ms: 600_000, max: 30 },
  repeatMs: 60_000,
  maxMutes: 200,
} as const;

/** Design §9 (GDD §19.1, §19.2): a mate's bail and a visit on the ward. */
export const FAVOURS = {
  bail: { fxp: 10 },
  visit: { energy: 3, health: 10, minutes: 5, counted: 3, minStayMinutes: 5, fxp: 10 },
} as const;
