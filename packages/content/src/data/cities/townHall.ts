import type { Location } from '../../schemas';

/**
 * Review 4 (answers §11.1, §29.2; GDD §15.3, §13.5; ADR 0077): every city's council hall is a place,
 * kind `town-hall`, open at every Level, with one ordinary ticket, *Sit in the public gallery*
 * (*Watch and listen*, Intelligence, 6 Energy; no Party XP, no opinion). The same texts in every city.
 * Each hall is appended last in its city's list, so no pin renumbers (§29 Q10).
 */
export function townHall(i: {
  id: string;
  name: string;
  ref: string;
  blurb: string;
  map: { x: number; y: number };
  quarterId: string;
}): Location {
  return {
    id: i.id,
    name: i.name,
    ref: i.ref,
    kind: 'town-hall',
    blurb: i.blurb,
    map: i.map,
    quarterId: i.quarterId,
    actions: [
      {
        tier: 1,
        type: 'intelligence',
        givesFxp: false,
        givesOpinion: false,
        id: `${i.id}.gallery`,
        name: 'Sit in the public gallery',
        stats: ['int'],
        energy: 6,
        text: {
          success: {
            headline: 'From the hard bench',
            body: 'An hour on the hard bench above the chamber. Who sits with whom, who leaves before the vote, which clerk the chairman looks at. The minute book says less than the room.',
          },
          partial: {
            headline: 'Gallery cleared',
            body: "The gallery is cleared for a closed session after twenty minutes. You get the seating plan and the clerk's cold. The rest is in the paper tomorrow, if it's anywhere.",
          },
        },
      },
    ],
  };
}
