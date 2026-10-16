import type { ContentInput } from '../schemas';

type HeadlineInput = ContentInput['headlines'][number];

/**
 * Slice 8 (docs/design/slice-8-life.md §10.1, §21.4; tech design §11.2): a life in the city's
 * personal lines, every paper, in the paper's own voice. The conditions are the rules' life kinds
 * (stored at the settlement from the member's facts; `requestArrived` is live). Factual lines print
 * the Herald's deck in every paper; four carry a voice (§21.4). `patron-letter` and `informant` are
 * the Letters row's; `expose-front` is the front page. The season's lines are deferred (§23).
 * Every deck is at most 200 characters with the longest tokens; `{office}` reads *visitor* for a
 * player with none and `{coat}` is the coat's name in lower case.
 *
 * The bodyguards' two lines (`bodyguard-last`, `bodyguard-gone`) wait in `copy.life.minder.paper`
 * for their condition kinds (T26); they join this file when the kinds exist.
 */

type Paper = { prefix: string; cityId: string };

const PAPERS: Record<'clarion' | 'sentinel' | 'gazette' | 'herald' | 'courier', Paper> = {
  clarion: { prefix: 'hl.', cityId: 'coalport' },
  sentinel: { prefix: 'hl.v.', cityId: 'duskwall' },
  gazette: { prefix: 'hl.a.', cityId: 'ashford' },
  herald: { prefix: 'hl.ig.', cityId: 'irongate' },
  courier: { prefix: 'hl.cw.', cityId: 'clearwater' },
};
type PaperKey = keyof typeof PAPERS;

interface Line {
  name: string;
  priority: number;
  when: HeadlineInput['when'];
  headline: string;
  /** The Herald's deck, printed in every paper unless `voices` gives the paper its own. */
  deck: string;
  voices?: Partial<Record<Exclude<PaperKey, 'herald'>, string>>;
}

const LINES: Line[] = [
  // ----- The Wardrobe -------------------------------------------------------------------------
  {
    name: 'wardrobe-first',
    priority: 2,
    when: [{ kind: 'coatBought' }],
    headline: 'A New Coat on {name}',
    deck: "{item}, {charisma} Charisma, seen on {street} yesterday. The {paper} notes that the party's work pays.",
    voices: {
      clarion: '{item}, {charisma} Charisma, seen on {street} yesterday. Holm: "Mind it on the picket line."',
      sentinel: '{item}, {charisma} Charisma, seen on {street} yesterday. The committee approves of a tidy coat.',
      gazette: '{item}, {charisma} Charisma, seen on {street} yesterday. Mr Grey asks who the tailor is.',
      courier: '{item}, {charisma} Charisma, seen on {street} yesterday. The Front has noticed; the Rows have not.',
    },
  },
  {
    name: 'recognised',
    priority: 1,
    when: [{ kind: 'recognised' }],
    headline: '{name} Recognised in {city}',
    deck: 'A {office} in a {coat} does not pass for a stranger. Plain clothes and a quiet night would.',
    voices: {
      clarion: 'A {office} in a {coat} does not pass for a stranger in {city}. Holm: "Wear the mill coat next time."',
      sentinel: 'A {office} in a {coat} does not pass for a stranger in {city}. Plain clothes, the committee notes, were available.',
      gazette: 'A {office} in a {coat} does not pass for a stranger in {city}. Mr Grey suggests the worn overcoat, and a quiet night.',
      courier: 'A {office} in a {coat} does not pass for a stranger in {city}. The lake dresses down for a reason.',
    },
  },
  // ----- The Dossier and the exposé -----------------------------------------------------------
  {
    name: 'expose-front',
    priority: 0,
    when: [{ kind: 'exposePrinted' }],
    headline: '{subject} EXPOSED: {headlineLine}',
    deck: 'By {name}. {line1} {line2} The {party} has not replied. Opinion in {city}: {party} −1.0.',
  },
  {
    name: 'expose-p3',
    priority: 1,
    when: [{ kind: 'exposeP3' }],
    headline: '{subject}: Questions on Page Three',
    deck: 'By {name}. {line1} The {party} calls it gossip. Opinion in {city}: {party} −0.5.',
  },
  {
    name: 'expose-spiked',
    priority: 2,
    when: [{ kind: 'exposeSpiked' }],
    headline: 'The Editor Wants More',
    deck: "{name}'s piece on {subject} is held for want of a second source. The Case File is kept.",
  },
  {
    name: 'case-file',
    priority: 2,
    when: [{ kind: 'caseFileMade' }],
    headline: 'A File on {subject}',
    deck: "Three fresh entries make a Case File. Take it to a newspaper, sell it at the station, or turn it with a patron's help.",
  },
  {
    name: 'dossier-stale',
    priority: 3,
    when: [{ kind: 'staleTomorrow' }],
    headline: '{n} Entries Go Stale Tomorrow',
    deck: 'Stale entries count half toward a Case File and sell for half. Nothing is lost; it just gets old.',
  },
  // ----- Patrons (the Letters row and the desk) -----------------------------------------------
  {
    name: 'patron-letter',
    priority: 1,
    when: [{ kind: 'requestArrived' }],
    headline: 'From {patron}: {request}',
    deck: "By {until}. Favour +6 when it's done.",
  },
  {
    name: 'patron-thanks',
    priority: 2,
    when: [{ kind: 'requestThanks' }],
    headline: "{patron}'s Thanks",
    deck: '{request}, done. Favour {favour}; {tier} at {next}.',
  },
  {
    name: 'patron-tier',
    priority: 1,
    when: [{ kind: 'patronTier' }],
    headline: '{name}, {tier} of {patron}',
    deck: '{perkLine}',
  },
  {
    name: 'informant',
    priority: 2,
    when: [{ kind: 'informantReport' }],
    headline: 'From your informant',
    deck: '{line} · {subject} · {category}. {daysLeft} days of reports left.',
  },
  // ----- The flat -----------------------------------------------------------------------------
  {
    name: 'flat-bought',
    priority: 1,
    when: [{ kind: 'flatBought' }],
    headline: '{name} Takes a Flat in {city}',
    deck: "{restedLine}. Rent 150 a week, paid until {until}. The {paper}'s housing column approves.",
    voices: {
      clarion: '{restedLine}. Rent 150 a week, paid until {until}. The branch knows the landlady.',
      sentinel: '{restedLine}. Rent 150 a week, paid until {until}. The committee notes the address.',
      gazette: '{restedLine}. Rent 150 a week, paid until {until}. The Rooms will call, with a book.',
      courier: '{restedLine}. Rent 150 a week, paid until {until}. The lake air, the Courier adds, is included.',
    },
  },
  {
    name: 'flat-due',
    priority: 2,
    when: [{ kind: 'flatDue' }],
    headline: 'Rent Due on {street}',
    deck: 'Your flat is paid until tonight. Pay a week on the Me tab, or let it wait: nothing is lost either way.',
  },
  {
    name: 'flat-waiting',
    priority: 2,
    when: [{ kind: 'flatWaiting' }],
    headline: 'The Flat Waits',
    deck: 'The rent ran out at midnight. A rented room until you pay a week; the flat is yours whenever you do.',
    voices: {
      clarion: 'The rent ran out at midnight. A rented room until you pay a week; the flat is yours whenever you do. Holm says the landlady is patient.',
      sentinel: 'The rent ran out at midnight. A rented room until you pay a week; the flat waits. The committee expects the matter settled.',
      gazette: 'The rent ran out at midnight. A rented room until you pay a week; the flat is yours whenever you do. No arrears, the Gazette confirms.',
      courier: 'The rent ran out at midnight. A rented room until you pay a week; the flat waits, lake view and all.',
    },
  },
  // ----- Legacy -------------------------------------------------------------------------------
  {
    name: 'legacy-entry',
    priority: 2,
    when: [{ kind: 'legacyEntry' }],
    headline: 'For the Record: {entry}',
    deck: 'Legacy {total}. {toSpend} to spend on a lasting perk.',
  },
];

const paperLines = (key: PaperKey): HeadlineInput[] => {
  const paper = PAPERS[key];
  return LINES.map((l) => ({
    id: `${paper.prefix}${l.name}`,
    cityId: paper.cityId,
    group: 'personal',
    priority: l.priority,
    when: l.when,
    headline: l.headline,
    deck: (key !== 'herald' && l.voices?.[key]) || l.deck,
  }));
};

/** The fifteen lines in each of the five papers (the Herald's deck where the voice adds nothing). */
export const lifeHeadlines: HeadlineInput[] = [
  ...paperLines('clarion'),
  ...paperLines('sentinel'),
  ...paperLines('gazette'),
  ...paperLines('herald'),
  ...paperLines('courier'),
];

/** The ids every paper carries (by suffix), for the loader's per-paper check. */
export const LIFE_HEADLINE_NAMES = LINES.map((l) => l.name);
