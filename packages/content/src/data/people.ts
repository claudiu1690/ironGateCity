import type { Npc } from '../schemas';

/** Named NPCs (docs/design/slice-1-content.md §6.1). */
export const npcs: Npc[] = [
  {
    id: 'holm',
    name: 'Petra Holm',
    title: 'Branch secretary, Coalport',
    factionId: 'collective',
    cityId: 'coalport',
    portrait: 'portrait.holm',
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
