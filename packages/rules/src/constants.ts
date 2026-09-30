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

/** §5.5 — reward rates per Energy, by tier. */
export const TIER_RATES = {
  1: { xpPerEnergy: 4.5, fxpPerEnergy: 0.6, ironPerEnergy: 2 },
} as const;

/** §14.2 — opinion swing in percentage points per Energy, by tier (halved on a Partial like every reward). */
export const OPINION_PER_ENERGY = { 1: 0.005 } as const;

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

/** §2.2 — night is 20:00–06:00 UTC, the same for everyone. Cosmetic in slice 1. */
export const DAY_NIGHT = { dayFromHour: 6, nightFromHour: 20 } as const;

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
  passVotes: 4,
  maxProposals: 3,
  endorsementsNeeded: 2,
  endorsementsCounted: 5,
  endorsementWeight: 3,
  wardDivisor: 5,
  npcJitter: 2,
  smallBranchBelow: 3,
  activeEndorserDays: 7,
  termDays: 5,
  ordinanceDays: 5,
  /** STANDING level "Known". */
  knownLevel: 2,
  standRank: 3,
  voteRank: 2,
  cost: { declare: 10, endorse: 10, propose: 20 },
  stipend: { pc: 10, fxp: 20 },
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
} as const;

/** `{ordinal}` in the count's headlines: first … seventh. */
export const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'] as const;
