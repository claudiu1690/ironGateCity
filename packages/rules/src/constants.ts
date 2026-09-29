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
export const STANDING = { thresholds: [0, 10, 30, 70, 150], bonusPerLevel: 3 } as const;

/** §5.4 — FXP at which Ranks 1..7 are reached (Rank 2 lowered to 400). */
export const RANK_FXP = [0, 400, 2_000, 6_000, 15_000, 25_000, 60_000] as const;

/** §5.3 — stat points granted per level gained, placed on STR or INT. */
export const LEVEL_UP = { statPoints: 1 } as const;

/** §6.5 — Political Capital cap; it never decays. */
export const PC = { cap: 1_000 } as const;

/** §13.3 — FXP rate multiplier by action type (council sessions are party work). */
export const FXP_TYPE_MULTIPLIER: Readonly<Record<string, number>> = { council: 1.5 };

/** §8.5 — training: Energy for the next point = 20 + 2 × stat; XP at half the tier rate. */
export const TRAINING = { baseCost: 20, costPerPoint: 2, xpRateShare: 0.5 } as const;

/** §9.1 — jobs. */
export const JOBS = {
  salaryShare: 0.5,
  streakPerDay: 0.02,
  streakCapDays: 10,
  sickDaysPerWeek: 2,
  switchEnergy: 2,
  /**
   * Designer answer §12 Q1 (GDD §9.1): a sick day is spent only when an ended City Day had no shift
   * and the streak is running (> 0). The Monday refill is unconditional; the ended Sunday is judged first.
   */
  sickDaysOnlyWhileStreak: true,
  /** Designer answer §12 Q2 (GDD §6.3): shifts and job switches never touch Rested. */
  shiftUsesRested: false,
  /** Designer answer §12 Q9 (GDD §9.1, §4.2): one settlement credits at most 14 half-pays. */
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
