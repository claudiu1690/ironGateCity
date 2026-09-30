/**
 * Review 2 (docs/design/review-2-answers.md §1): the plain-words pass supersedes some texts of the
 * slice design docs, which were swept for titles only ("rule prose keeps the design's terms"). The
 * content tests still read the design docs word for word; this module is the overlay they apply,
 * read from the answers' tables where there is one and listed here where the answers give a rule
 * (§1.4–§1.6 body swaps, §1.12 deltas, §1.13 word table) rather than a table.
 */
import { expect } from 'vitest';
import R2 from '../../../docs/design/review-2-answers.md?raw';

function answersSection(start: string, end: string): string {
  const from = R2.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = R2.indexOf(end, from + 1);
  expect(to, end).toBeGreaterThan(from);
  return R2.slice(from, to);
}
function tableRows(text: string, row: RegExp): string[][] {
  return text
    .split('\n')
    .filter((l) => row.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
}
const unbold = (s: string) => s.replace(/\*\*/g, '');
const tick = (s: string) => s.replace(/`/g, '');

/**
 * The prose swaps of §1.4–§1.6 ("Body swaps") and §1.13, as applied to the content's bodies, blurbs,
 * lines and story texts. Ids never match: a word after `.`, `-` or `_` is an id.
 */
export const PROSE_SWAPS: ReadonlyArray<readonly [RegExp | string, string]> = [
  [/(?<![.\-_\w])leaflet/g, 'flyer'],
  [/(?<![.\-_\w])Leaflet/g, 'Flyer'],
  ['Five hundred bulletins', 'Five hundred flyers'],
  ['ward lists', 'street lists'],
  ['canvass returns', 'street returns'],
  ["That's how a ward is won.", "That's how a street is won."],
  ['Minutes taken, motion carried', 'Minutes taken, proposal carried'],
  ['a ward map on the piano', 'a street map on the piano'],
  ['The house divides and the motion carries.', 'The house votes and the proposal carries.'],
  ['The motion carries', 'The proposal carries'],
  ['The motion is lost by four votes.', 'The proposal is lost by four votes.'],
  ["the hoardings round the builder's yard", "the fences round the builder's yard"],
  ['twelve bills up', 'twelve posters up'],
  ['Five bills stay up', 'Five posters stay up'],
  // §1.10: the platforms, Lenz's line, the street's note.
  ['Every ward organised, every door knocked.', 'Every street organised, every door knocked.'],
  ['Every ward in good order by the end of the term.', 'Every street in good order by the end of the term.'],
  ['Printer, the bulletin.', 'Printer, the party paper.'],
  ['Permanent. A Faction Reset token is the only way back.', "Permanent: you can't change party later."],
  // §1.13 on the chapter texts (the ward book keeps its name: it is his book, §1.10).
  ['Walk his ward', 'Walk his streets'],
  ['walk back through the ward in the rain', 'walk back through the streets in the rain'],
  ["You've cast a ballot here now.", "You've cast a vote here now."],
];

function swap(text: string, swaps: ReadonlyArray<readonly [RegExp | string, string]>): string {
  return swaps.reduce(
    (t, [from, to]) => (typeof from === 'string' ? t.split(from).join(to) : t.replace(from, to)),
    text,
  );
}
/** A design doc's text with the review-2 prose swaps applied. */
export const plainProse = (text: string): string => swap(text, PROSE_SWAPS);

/** §1.7: the order titles and lines the answers change (absent where the answers say "(keep)"). */
export const R2_ORDERS: ReadonlyMap<string, { title?: string; line?: string }> = new Map(
  tableRows(answersSection('### 1.7', '### 1.8'), /^\| `dir\./).map(([id, , title, line]) => [
    tick(id!),
    {
      ...(title === '(keep)' ? {} : { title: unbold(title!) }),
      ...(line === '(keep)' ? {} : { line: line! }),
    },
  ]),
);

/** §1.8, for the slice-1 and slice-2 papers' personal headlines and decks. */
export const HEADLINE_SWAPS: ReadonlyArray<readonly [RegExp | string, string]> = [
  [
    'Recruits become Activists on the strength of their party work. The vote follows.',
    'Recruits become Activists by doing party work. Activists vote: Coalport elects its council every five days, and the Election card says when.',
  ],
  [
    'Initiates become Stewards on the strength of their work. The vote follows.',
    'Initiates become Stewards on the strength of their work. Stewards vote: Duskwall elects its council every five days, and the Election card says when.',
  ],
  ['{name} Made Canvasser by the Alliance', '{name} Made Campaigner by the Alliance'],
  [
    'Volunteers become Canvassers on the strength of their work. The vote follows.',
    'Volunteers become Campaigners on the strength of their work. Campaigners vote: Ashford elects its council every five days, and the Election card says when.',
  ],
  [' on the ward', ' on the streets'],
  [/Actions here get \+\{bonus\} %\./g, 'Everything here goes a little better.'],
  ['Branch Praises Its Canvassers', 'Branch Praises Its Helpers'],
  ['Vanguard Commends Its Canvassers', 'Vanguard Commends Its Volunteers'],
  ['The ward is where you left it.', 'The town is where you left it.'],
  ['and the ward is where you left it.', 'and the town is where you left it.'],
  ['No leaflets went out yesterday.', 'No flyers went out yesterday.'],
  // §1.13 on the two idle headlines: "the ward" → "the streets", "in the wards" → "in the town".
  [/^Quiet Day in the Ward$/, 'Quiet Day in the Streets'],
  [/^Quiet Day in the Wards$/, 'Quiet Day in the Town'],
];
export const plainHeadline = (text: string): string => swap(text, HEADLINE_SWAPS);

/** §1.10: the six political result texts, with the new *Next* line. */
export const R2_POLITICS: Readonly<
  Record<string, { stamp: string; headline: string; body: string; next: string }>
> = Object.fromEntries(
  tableRows(answersSection('**`politics.ts`**', '**`ordinances.ts`:**'), /^\| `[a-zA-Z]+` \|/).map(
    ([act, stamp, headline, body, next]) => [
      tick(act!),
      { stamp: stamp!, headline: headline!, body: body!, next: next! },
    ],
  ),
);

/**
 * §1.10 `ordinances.ts`: the lines and names that change, by the design's (old) id. The answers'
 * cells hold several fields joined by " · ", which the effect lines also use, so the values are
 * copied here; `ord.rest-day` is §1.13 ("ordinance" → council rule) on the one line the table omits.
 */
export const R2_ORDINANCES: Readonly<Record<string, { id?: string; name?: string; line: string }>> = {
  'ord.street-permits': { line: 'Flyers and posters go up without a permit for the week.' },
  'ord.open-doors': { line: 'The council asks every household to open the door to party callers.' },
  'ord.ward-register': {
    id: 'ord.street-register',
    name: 'Street Register',
    line: 'Every street keeps a register: a name once known stays known.',
  },
  'ord.ward-fund': {
    id: 'ord.street-fund',
    name: 'Street Fund',
    line: 'A street fund pays party callers by the door, raised from the wage packet.',
  },
  'ord.rest-day': { line: 'A day of rest by council rule: the town sleeps in.' },
};

/** §1.12: the Clarion's political headlines in full, by id: [headline, deck]. */
export const R2_CLARION: ReadonlyMap<string, readonly [string, string]> = new Map(
  tableRows(answersSection('### 1.12', 'Sentinel and Gazette deltas'), /^\| `hl\./).map(
    ([id, headline, deck]) => [tick(id!), [headline!, deck!] as const],
  ),
);

/** §1.12: the Sentinel and the Gazette take the Clarion's swaps; their own voice lines stay. */
export const POLITICAL_SWAPS: ReadonlyArray<readonly [RegExp | string, string]> = [
  ['{votes} votes', '{votes} support'],
  ['Nominations reopen today.', 'Candidates can put their names in again today.'],
  ['The deposit stays with the district.', 'The 10 Political Capital stays with the district.'],
  [
    'Deposits are not returned; the Gazette has asked.',
    'The 10 Political Capital is not returned; the Gazette has asked.',
  ],
  [/Files for (\w+) Council/, 'Stands for $1 Council'],
  ['Endorsements {endorsements} / 2 by', 'Backers {endorsements} of 2 by'],
  ['Is on the Ballot', 'Is a Candidate'],
  [
    'On the ballot with {endorsements} endorsements. Polls open today until',
    'On the list with {endorsements} backers. Voting is open today until',
  ],
  ['Comes Off the Ballot', 'Comes Off the List'],
  ['Short of two endorsements at the close.', 'Short of two backers at the close.'],
  ['The deposit is returned', 'The 10 Political Capital is returned'],
  ['Nominations reopen on {weekday}', 'Candidates can put their names in again on {weekday}'],
  ['Moves {ordinance}', 'Puts Forward {ordinance}'],
  ['The council divides at', 'The council votes at'],
  ['prints the division in full', "prints the council's vote in full"],
  ['one ordinance', 'one rule'],
  [
    'Nominations for the next but one open today.',
    'Candidates for the council after next can put their names in today.',
  ],
  ['Council Rises Without a Motion', "Council Can't Agree on a Rule"],
  ['No ordinance reached four votes.', 'No rule reached four votes.'],
  [/^Polls Close in (\w+): /, '$1 Result: '],
  ['by ward members', 'by local candidates'],
  [/^Polls Open in (\w+)$/, 'Voting Open in $1'],
  ['The ballot is secret.', 'Your vote is secret.'],
  [/^(\w+) Council: Nominations Open$/, '$1 Council: Candidates Wanted'],
  [
    'Bailiffs Known in the wards may file at Beacon House',
    'Bailiffs who are Known in the town can stand from the Election card',
  ],
  [
    'Agents Known in the wards may file at the Rooms',
    'Agents who are Known in the town can stand from the Election card',
  ],
];
export const plainPolitical = (text: string): string => swap(text, POLITICAL_SWAPS);
