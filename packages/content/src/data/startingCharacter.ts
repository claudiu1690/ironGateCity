import type { StartingCharacter } from '../schemas';

/**
 * Every new character, until the origin story and faction choice arrive in slice 2: the
 * **reference recruit** (GDD §8.5). A Collective recruit who answered the origin story with
 * the library (+3 INT), watched from the corner (+2 INT) and fix anything (+3 STR +1 INT), in basic
 * work clothes (CHA 2, §8.2). 5 base + origin + Collective (+2 STR +1 INT) = STR 10 / INT 12 / AGI 5.
 * Home canvass odds: 50 + 4 × (12 − 8) = 66 %.
 *
 * `chaBase` stands in for worn CHA in slice 0 (no equipment yet); in slice 2 it becomes 0 plus a
 * worn item of 2.
 */
export const startingCharacter: StartingCharacter = {
  factionId: 'collective',
  stats: { str: 10, int: 12, agi: 5, chaBase: 2 },
};
