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
    // Review 5 (answers §19.4): the demob suit (the id kept from review 4's coat).
    id: 'outfit.fathers-coat',
    name: 'The demob suit',
    slot: 'clothing',
    tier: 1,
    cha: 5,
    keepsake: false,
    art: 'item.winter-coat',
    note: "The office's suit and the coat that came with it. Nobody mistakes it for anything else.",
  },
  {
    id: 'outfit.fathers-coat-promised',
    name: 'The demob suit',
    slot: 'clothing',
    tier: 1,
    cha: 5,
    keepsake: true,
    art: 'item.winter-coat',
    note: "The office's suit, and your word.",
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
    name: "The unit's list",
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
    note: "Forty names in the quartermaster's hand, a home street against each.",
  },
  {
    id: 'keep.prison-letter',
    name: 'The requisition order',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
    note: 'The flat, the date, and a signature you can read.',
  },
  {
    id: 'keep.marker',
    name: 'The ration page',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
    note: "A year of rations drawn in your family's name after they were gone.",
  },
  // GDD §21.4: The Names on the Stone's (`finish-his-work`) chapter 2 keepsake. Its chapter is
  // slice 3; the item is catalogued now because the GDD's table lists it.
  {
    id: 'keep.election-bill',
    name: 'Your election bill',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
    note: 'Your name in capitals on brown paper, and the forty names under it.',
  },
  // GDD §21.4: The Ration Ledger's (`settle-his-debts`) chapter 2 keepsake (*The riverside house*,
  // slice 5, docs/design/slice-5-risk.md §13: no slot, the document folder's art), on every outcome.
  // Review 5 (answers §19.10.6): the notes of the suit and the keepsakes.
  {
    id: 'keep.ledger-page',
    name: "A page of the ring's ledger",
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
    note: "The one page they didn't tear out: the names the ring drew rations in, and what each fetched.",
  },
  // GDD §21.4: The Names on the Stone's chapter 3 keepsake (*The list*, slice 7; voting simplified
  // §8.12 #7: the id is kept from *Your deposit receipt*, the name is the line on the branch's list).
  {
    id: 'keep.deposit-receipt',
    name: 'Your line on the list',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
    note: "The branch's printed list of names, and the line on it that is yours, in the secretary's hand.",
  },
];
