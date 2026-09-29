import type { City } from '../../schemas';

/**
 * Coalport, home city of the Collective (GDD §14.1, §14.11). Slice 0 has one location with one
 * action; slice 1 adds the rest of the city. Numbers and text: docs/design/slice-0-answers.md.
 */
export const coalport: City = {
  id: 'coalport',
  name: 'Coalport',
  role: 'home',
  homeFactionId: 'collective',
  // §14.11 baseline, pinned for Coalport.
  baselineOpinion: { vanguard: 9, collective: 70, alliance: 6, neutral: 15 },
  locations: [
    {
      id: 'coalport.mill-gate',
      name: 'Mill Gate',
      kind: 'factory-gate',
      blurb:
        'The gates of the Coalport Steel Mill. Three shifts a day, and every one of them walks past here.',
      actions: [
        {
          id: 'coalport.mill-gate.canvass',
          name: 'Canvass the shift change',
          tier: 1,
          type: 'canvass',
          stat: 'int',
          energy: 10, // §13.3: Canvass is the 10-Energy reference action.
          givesFxp: true,
          givesOpinion: true,
          text: {
            success: {
              headline: 'The whistle goes, and they stop',
              body: "You're at the gate before the shift comes off. Coal dust, tired faces, no time for speeches. But the leaflets go hand to hand, and a foreman says come back Thursday. That's how a ward is won.",
            },
            partial: {
              headline: 'Most of them walk past',
              body: 'The shift comes off in a hurry and most of it heads straight for the tram. You press leaflets on the ones who slow down. Two stop to argue; one gives you his street. A start, not a win.',
            },
          },
        },
      ],
    },
  ],
};
