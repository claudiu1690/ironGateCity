import type { Faction } from '../schemas';

/**
 * GDD §16.1 and §7.3. Names are the GDD's working names: faction naming is parked (CLAUDE.md), so
 * only the display strings here change when it is decided. Crests: ■ Vanguard, ● Collective, ▲ Alliance.
 * Rank titles: §5.4. The Collective's secretary issues Party orders until a Chair exists (§13.7).
 */
export const factions: Faction[] = [
  {
    id: 'vanguard',
    name: 'Iron Vanguard',
    shortName: 'Vanguard',
    crest: 'square',
    homeCityId: 'duskwall',
    startingBonus: { str: 3 },
    rankTitles: ['Initiate', 'Footsoldier', 'Sergeant', 'Lieutenant', 'Captain', 'Commander', 'Marshal'],
  },
  {
    id: 'collective',
    name: 'Red Collective',
    shortName: 'Collective',
    crest: 'circle',
    homeCityId: 'coalport',
    startingBonus: { str: 2, int: 1 },
    // Rank 5 is "Delegate" (designer answer, slice-1 content §12 Q8; GDD §5.4).
    rankTitles: ['Recruit', 'Activist', 'Organiser', 'Commissar', 'Delegate', 'Comrade-General', 'Chairman'],
    secretary: { npcId: 'holm', signature: '— P.H.' },
  },
  {
    id: 'alliance',
    name: 'Civic Alliance',
    shortName: 'Alliance',
    crest: 'triangle',
    homeCityId: 'ashford',
    startingBonus: { int: 3 },
    rankTitles: [
      'Volunteer',
      'Canvasser',
      'Councillor',
      'Senator',
      'Representative',
      'Speaker',
      'Prime Minister',
    ],
  },
];
