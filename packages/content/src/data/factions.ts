import type { Faction } from '../schemas';

/**
 * GDD §16.1 and §7.3. Names are the GDD's working names: faction naming is parked (CLAUDE.md), so
 * only the display strings here change when it is decided. Crests: ■ Vanguard, ● Collective, ▲ Alliance.
 */
export const factions: Faction[] = [
  {
    id: 'vanguard',
    name: 'Iron Vanguard',
    shortName: 'Vanguard',
    crest: 'square',
    homeCityId: 'duskwall',
    startingBonus: { str: 3 },
  },
  {
    id: 'collective',
    name: 'Red Collective',
    shortName: 'Collective',
    crest: 'circle',
    homeCityId: 'coalport',
    startingBonus: { str: 2, int: 1 },
  },
  {
    id: 'alliance',
    name: 'Civic Alliance',
    shortName: 'Alliance',
    crest: 'triangle',
    homeCityId: 'ashford',
    startingBonus: { int: 3 },
  },
];
