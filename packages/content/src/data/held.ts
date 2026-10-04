import type { HeldAction } from '../schemas';

/**
 * Slice 5 (docs/design/slice-5-risk.md §8.2, §9.2, texts §23.3): the one tap in the cells and on the
 * ward. Both intelligence on Intelligence, 3 Energy, never a run-in (§23.1 #11); a Success is a win
 * for Reputation. Rewards are the rules' (14 / 7 XP, 6 / 3 Iron).
 */
export const held: { cells: HeldAction; infirmary: HeldAction } = {
  cells: {
    id: 'held.cells',
    name: 'Listen to the cells',
    type: 'intelligence',
    stats: ['int'],
    energy: 3,
    text: {
      success: {
        headline: 'Two cells, three stories',
        body: "The man in the next cell talks to the wall and the wall is you. A name, a yard, a night that went wrong. The duty officer's boots stop outside and the talking stops with them. You have enough.",
      },
      partial: {
        headline: 'The hatch stays open',
        body: "The hatch stays open and so does the duty officer's ear, so the next cell says nothing worth having. You get a street and a grudge. Tomorrow's paper may say the rest.",
      },
    },
  },
  infirmary: {
    id: 'held.ward',
    name: 'Talk to the ward',
    type: 'intelligence',
    stats: ['int'],
    energy: 3,
    text: {
      success: {
        headline: 'The bed by the window',
        body: 'The man in the bed by the window broke his arm at the mill and his patience with the foreman long before. Names, shifts, who signs what. The matron lets him talk; it keeps him still.',
      },
      partial: {
        headline: 'Visiting hour',
        body: "The ward fills at two and every bed is a family, so you get half a story from the bed opposite before his wife arrives. A name and a street. The matron's look ends it.",
      },
    },
  },
};
