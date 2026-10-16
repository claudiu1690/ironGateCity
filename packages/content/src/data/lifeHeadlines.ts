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
 * The bodyguards' two lines (`bodyguard-last`, `bodyguard-gone`) joined with T26's condition kinds;
 * `{minder}` is his name and `{price}` the week.
 *
 * Priorities (design §24.9 #4; the paper prints two personal lines a day, lowest number first, and
 * the selector's sort is stable, so the order of this array breaks ties): 0 the front page; 1 a
 * deadline tonight, a lapse that landed at midnight, or a once-only fact told nowhere else; 2 news
 * of the player's own doing that a modal already showed; 3 lines the desk rows or the Letters row
 * repeat word for word, safe to lose. Counts (`{n}`, `{daysLeft}`) are bare numerals from the
 * server, so they sit after a colon, where "1" reads right.
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
  // ----- 0: the front page ----------------------------------------------------------------------
  {
    name: 'expose-front',
    priority: 0,
    when: [{ kind: 'exposePrinted' }],
    headline: '{subject} EXPOSED: {headlineLine}',
    deck: 'By {name}. {line1} {line2} The {party} has not replied. Opinion in {city}: {party} −1.0.',
  },
  // ----- 1: must reach the player (a deadline tonight, a lapse at midnight, a once-only fact) ----
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
  {
    name: 'flat-due',
    priority: 1,
    when: [{ kind: 'flatDue' }],
    headline: 'Rent Due on {street}',
    deck: 'Your flat is paid until tonight. Pay a week on the Me tab, or let it wait: nothing is lost either way.',
  },
  // Someone to walk with you (tech design §24.5; moved from copy.life.minder.paper with T26).
  // `{minder}` is the man's name (the copy's `{name}`, renamed so it never reads as the player's).
  {
    name: 'bodyguard-last',
    priority: 1,
    when: [{ kind: 'bodyguardLast' }],
    headline: "{minder}'s Week Is Up Tonight",
    deck: "Paid until tonight. Another week on the party store's card, or he goes back to the door. Nothing else changes.",
    voices: {
      clarion: 'Paid until tonight. Another week on the party store\'s card, or he goes back to the door. Holm: "The quays will miss the width of him."',
      sentinel: "Paid until tonight. Another week on the party store's card, or he goes back to the door. The committee notes the date.",
      gazette: "Paid until tonight. Another week on the party store's card, or he goes back to the door. Mr Grey has the receipt ready.",
      courier: "Paid until tonight. Another week on the party store's card, or he goes back to the door. The lake has seen him coming.",
    },
  },
  {
    name: 'bodyguard-gone',
    priority: 1,
    when: [{ kind: 'bodyguardGone' }],
    headline: '{minder} Has Gone Back to the Door',
    deck: "The week ran out at midnight. He'll walk with you again for {price} a week; the card is at the party store.",
    voices: {
      clarion: "The week ran out at midnight. He'll walk with you again for {price} a week; the card is at the Union Hall. Holm says he was never on the books.",
      sentinel: "The week ran out at midnight. He'll walk with you again for {price} a week; the card is at Beacon House. The committee expects you to manage.",
      gazette: "The week ran out at midnight. He'll walk with you again for {price} a week; the card is at the Rooms. Mr Grey wishes him well.",
      courier: "The week ran out at midnight. He'll walk with you again for {price} a week; the card is at the party store. The Front walks alone, mostly.",
    },
  },
  {
    name: 'flat-waiting',
    priority: 1,
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
  {
    name: 'patron-tier',
    priority: 1,
    when: [{ kind: 'patronTier' }],
    headline: '{name}, {tier} of {patron}',
    deck: '{perkLine}',
  },
  // ----- 2: the player's own doing, already shown in a modal ------------------------------------
  {
    name: 'expose-p3',
    priority: 2,
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
    name: 'patron-thanks',
    priority: 2,
    when: [{ kind: 'requestThanks' }],
    headline: "{patron}'s Thanks",
    deck: '{request}, done. Favour {favour}; {tier} at {next}.',
  },
  {
    name: 'patron-letter',
    priority: 2,
    when: [{ kind: 'requestArrived' }],
    headline: 'From {patron}: {request}',
    deck: "By {until}. Favour +6 when it's done.",
  },
  {
    name: 'flat-bought',
    priority: 2,
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
  // ----- 3: repeated word for word on the desk or in the Letters row; safe to lose --------------
  {
    name: 'legacy-entry',
    priority: 3,
    when: [{ kind: 'legacyEntry' }],
    headline: 'For the Record: {entry}',
    deck: 'Legacy {total}. {toSpend} to spend on a lasting perk.',
  },
  {
    name: 'informant',
    priority: 3,
    when: [{ kind: 'informantReport' }],
    headline: 'From your informant',
    deck: '{line} · {subject} · {category}. Days of reports left: {daysLeft}.',
  },
  {
    name: 'dossier-stale',
    priority: 3,
    when: [{ kind: 'staleTomorrow' }],
    headline: 'Stale Tomorrow: {n} in the Dossier',
    deck: 'Stale entries count half toward a Case File and sell for half. Nothing is lost; it just gets old.',
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

/** The seventeen lines in each of the five papers (the Herald's deck where the voice adds nothing). */
export const lifeHeadlines: HeadlineInput[] = [
  ...paperLines('clarion'),
  ...paperLines('sentinel'),
  ...paperLines('gazette'),
  ...paperLines('herald'),
  ...paperLines('courier'),
];

/** The ids every paper carries (by suffix), for the loader's per-paper check. */
export const LIFE_HEADLINE_NAMES = LINES.map((l) => l.name);
