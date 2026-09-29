import type { Item } from '../schemas';

/**
 * The slice-2 item catalogue (GDD §21.4, docs/design/slice-2-onboarding.md §4.2, ADR 0014). CHA is
 * worn (§8.2): a character's CHA is its origin base plus what it has equipped. Keepsakes are unique.
 */
export const items: Item[] = [
  {
    id: 'outfit.work-jacket',
    name: 'Work jacket and cap',
    slot: 'clothing',
    tier: 1,
    cha: 2,
    keepsake: false,
    art: 'item.work-jacket',
    note: 'The Vanguard starting outfit.',
  },
  {
    id: 'outfit.mill-coat',
    name: 'Mill work coat',
    slot: 'clothing',
    tier: 1,
    cha: 2,
    keepsake: false,
    art: 'item.mill-coat',
    note: 'The Collective starting outfit.',
  },
  {
    id: 'outfit.worn-overcoat',
    name: 'Worn wool overcoat',
    slot: 'clothing',
    tier: 1,
    cha: 2,
    keepsake: false,
    art: 'item.worn-overcoat',
    note: 'The Alliance starting outfit.',
  },
  {
    id: 'outfit.fathers-coat',
    name: "Your father's coat",
    slot: 'clothing',
    tier: 1,
    cha: 5,
    keepsake: false,
    art: 'item.winter-coat',
    note: 'A good wool coat.',
  },
  {
    id: 'outfit.fathers-coat-promised',
    name: "Your father's coat",
    slot: 'clothing',
    tier: 1,
    cha: 5,
    keepsake: true,
    art: 'item.winter-coat',
    note: 'His coat, and your word.',
  },
  {
    id: 'doc.party-card',
    name: 'Party card',
    slot: 'document',
    tier: 1,
    cha: 0,
    keepsake: true,
    // Drawn with the holder's faction crest.
    art: 'faction-crest',
  },
  {
    id: 'keep.ward-book',
    name: 'His ward book',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
  },
  {
    id: 'keep.prison-letter',
    name: 'The prison letter',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
  },
  {
    id: 'keep.marker',
    name: 'The marker',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
  },
  // GDD §21.4: Finish His Work chapter 2's keepsake. Its chapter is slice 3; the item is catalogued
  // now because the GDD's table lists it.
  {
    id: 'keep.election-bill',
    name: 'His election bill',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
  },
];
