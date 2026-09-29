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
