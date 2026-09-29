import type { Npc } from '../schemas';

/** Named NPCs: the three party secretaries (slice-1 content §6.1, slice-2 cities §1.4, §2.4). */
export const npcs: Npc[] = [
  {
    id: 'holm',
    name: 'Petra Holm',
    title: 'Branch secretary, Coalport',
    factionId: 'collective',
    cityId: 'coalport',
    portrait: 'portrait.holm',
  },
  {
    // docs/design/slice-2-cities.md §1.4: the movement's administrator, not its face.
    id: 'stahl',
    name: 'Viktor Stahl',
    title: 'District organiser, Duskwall',
    factionId: 'vanguard',
    cityId: 'duskwall',
    portrait: 'portrait.stahl',
  },
  {
    // docs/design/slice-2-cities.md §2.4: a former Gazette sub-editor who counts words.
    id: 'grey',
    name: 'Thomas Grey',
    title: 'Constituency agent, Ashford',
    factionId: 'alliance',
    cityId: 'ashford',
    portrait: 'portrait.grey',
  },
];

/** §13.4: Local Standing names, level 0..4 (thresholds 10 / 30 / 70 / 150 are in rules). */
export const standingLevels = [
  { name: 'Stranger' },
  { name: 'Familiar' },
  { name: 'Known' },
  { name: 'Trusted' },
  { name: 'One of Us' },
];
