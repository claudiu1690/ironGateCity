import type { DossierLines } from '../schemas';

/**
 * Slice 8 (docs/design/slice-8-life.md §16.4; GDD §10.3): the Dossier's twenty lines, four a
 * category, drawn seeded at landing. `{name}` and `{party}` are the entry's name; `{place}` is a
 * location of the name's town and `{weekday}` a day, both drawn from the entry's stream and stored,
 * so a line always reads the same; `{city}` is the name's town.
 */
export const dossierLines: DossierLines = {
  political: [
    "Met the {party}'s organiser at {place} on {weekday}, an hour, no minutes.",
    "Spoke against the {party}'s rule at a meeting the paper didn't cover.",
    "Has a letter from the Chair's office; carries it.",
    "Backed a name the branch didn't, quietly, in {city}.",
  ],
  criminal: [
    "Paid off a constable at {place} on {weekday}; the constable's name is in the book.",
    "Signed for a parcel at the station that wasn't theirs.",
    "Was in the cells at {place} in '45 under another name.",
    "The licence at {place} was renewed on a signature that isn't the clerk's.",
  ],
  pattern: [
    'At {place} every {weekday} after six.',
    'Takes the last tram from {place}; alone.',
    'Lodges above the shop at {place}; a light until two.',
    'Leaves {city} on the {weekday} train and is back by Monday.',
  ],
  asset: [
    'Owns the lease on {place}, through a cousin.',
    'Owes the bank in Clearwater; the bank is patient.',
    "Keeps a box at the station's left-luggage, paid a year ahead.",
    'Sold a share in the tram company the week before the fare vote.',
  ],
  neutral: [
    'Drinks at {place}; tea, not beer.',
    'Has a sister at the sanatorium; visits {weekday}s.',
    'Reads the paper standing up at {place}.',
    'Walks a dog called Max on the front at four.',
  ],
};
