import type { ContentInput } from '../schemas';

type HeadlineInput = ContentInput['headlines'][number];

type HomeCityId = 'coalport' | 'duskwall' | 'ashford';
type Prefix = 'hl.' | 'hl.v.' | 'hl.a.';

/** The ten texts of one paper, in the design's order (§12.1): [headline, deck]. */
interface HomeTexts {
  trainOpen: [string, string];
  movedAway: [string, string];
  hero: [string, string];
  quoted: [string, string];
  issuePc: [string, string];
  issuesDrawn: [string, string];
  issueLeading: [string, string];
  issueOpen: [string, string];
  issueResolved: [string, string];
  issueLapsed: [string, string];
}

/**
 * Slice 4 (docs/design/slice-4-battleground.md §12.1, written 3 Oct 2026): what the three home
 * papers gain, each in its own voice: the train, the move to the capital, the City Hero, the
 * reporter's quote and the Issues. Same conditions, groups and priorities as the Herald's
 * (`moved-away` takes `hl.ig.welcome-resident`'s); `moved-away` is one text in all three.
 */
const homeAdditions = (cityId: HomeCityId, prefix: Prefix, t: HomeTexts): HeadlineInput[] => {
  const h = (
    name: string,
    group: 'personal' | 'city',
    priority: number,
    when: HeadlineInput['when'],
    [headline, deck]: [string, string],
  ): HeadlineInput => ({ id: `${prefix}${name}`, cityId, group, priority, when, headline, deck });
  return [
    h('train-open', 'personal', 2, [{ kind: 'levelCrossed', level: 10 }], t.trainOpen),
    h('moved-away', 'personal', 0, [{ kind: 'registeredYesterday' }], t.movedAway),
    h('hero', 'personal', 0, [{ kind: 'heroYesterday', place: 'city' }], t.hero),
    h('quoted', 'personal', 2, [{ kind: 'quotedYesterday' }], t.quoted),
    h('issue-pc', 'personal', 2, [{ kind: 'issuePcYesterday' }], t.issuePc),
    h('issues-drawn', 'city', 0, [{ kind: 'issuesDrawnToday' }], t.issuesDrawn),
    h('issue-leading', 'city', 2, [{ kind: 'issueLeading' }], t.issueLeading),
    h('issue-open', 'city', 2, [{ kind: 'issueOpen' }], t.issueOpen),
    h('issue-resolved', 'city', 0, [{ kind: 'issueResolvedToday', owned: true }], t.issueResolved),
    h('issue-lapsed', 'city', 0, [{ kind: 'issueResolvedToday', owned: false }], t.issueLapsed),
  ];
};

const movedAway: [string, string] = [
  '{name} Takes Up Residence in the Capital',
  'The branch keeps a chair for them. Orders now come from the capital; they vote in {district}.',
];

export const capitalHomeHeadlines: HeadlineInput[] = [
  // The Coalport Clarion: plain and warm.
  ...homeAdditions('coalport', 'hl.', {
    trainOpen: [
      'The Train Is Open to {name}',
      'Level 10. The nation map is on the Map tab: Irongate in twelve minutes, third class, 20 Iron. The branch says go and look; the capital has five districts and not enough Coalport in any of them.',
    ],
    movedAway,
    hero: [
      '{name} Named City Hero of Coalport',
      'Moved Coalport {swing} for the {faction} this election, more than anyone at Level {bracket}. 25 Political Capital, and a line in the Clarion for keeps.',
    ],
    quoted: [
      '{name} Quoted in the Herald on {issueShort}',
      "One sentence, printed whole, in the capital's paper. The Clarion reprints it with pleasure; the branch has cut it out.",
    ],
    issuePc: [
      'Your Work on {issueShort} Counted',
      'Among the five who moved it most for the {faction}. +4 Political Capital, and the branch knows your name.',
    ],
    issuesDrawn: [
      'This Week in Coalport: {issue1} and {issue2}',
      '{issue1Blurb} Also on the table: {issue2}. Both settle Sunday night.',
    ],
    issueLeading: [
      '{faction} Leads on {issue1Short}',
      '{faction} {m1} · {second} {m2} · {third} {m3}. Work on it in Coalport moves opinion half again.',
    ],
    issueOpen: [
      'Nobody Has Spoken on {issue1Short} Yet',
      'Not a word from any party. Work on it in Coalport moves opinion half again; somebody should.',
    ],
    issueResolved: ['{faction} Owns {issueShort}', '{stance} {effectLine} for the week.'],
    issueLapsed: [
      'Nobody Spoke for {issueShort}',
      'A week and not a word from any party. The Clarion notes it, and so will the town.',
    ],
  }),
  // The Duskwall Sentinel: clipped and orderly.
  ...homeAdditions('duskwall', 'hl.v.', {
    trainOpen: [
      'The Train Is Open to {name}',
      'Level 10. The nation map is on the Map tab: Irongate in fifteen minutes, third class, 20 Iron. Beacon House expects a report on your return.',
    ],
    movedAway,
    hero: [
      '{name} Named City Hero of Duskwall',
      'Moved Duskwall {swing} for the {faction} this election, more than anyone at Level {bracket}. 25 Political Capital. Noted.',
    ],
    quoted: [
      '{name} Quoted in the Herald on {issueShort}',
      "One sentence, printed whole, in the capital's paper. The Sentinel records it; Beacon House has the cutting.",
    ],
    issuePc: [
      'Your Work on {issueShort} Counted',
      'Among the five who moved it most for the {faction}. +4 Political Capital. Beacon House has the list.',
    ],
    issuesDrawn: [
      'This Week in Duskwall: {issue1} and {issue2}',
      '{issue1Blurb} Second on the list: {issue2}. Both settle Sunday night.',
    ],
    issueLeading: [
      '{faction} Leads on {issue1Short}',
      '{faction} {m1} · {second} {m2} · {third} {m3}. Work on it in Duskwall moves opinion half again.',
    ],
    issueOpen: [
      'Nobody Has Spoken on {issue1Short} Yet',
      'No party has moved on it. Work on it in Duskwall moves opinion half again. The Sentinel expects better.',
    ],
    issueResolved: ['{faction} Owns {issueShort}', '{stance} {effectLine} for the week. Settled.'],
    issueLapsed: [
      'Nobody Spoke for {issueShort}',
      'A week and not a word from any party. The Sentinel records it.',
    ],
  }),
  // The Ashford Gazette: civic and dry.
  ...homeAdditions('ashford', 'hl.a.', {
    trainOpen: [
      'The Train Is Open to {name}',
      'Level 10. The nation map is on the Map tab: Irongate in twelve minutes, third class, 20 Iron. The Rooms suggest a return ticket and an open mind.',
    ],
    movedAway,
    hero: [
      '{name} Named City Hero of Ashford',
      'Moved Ashford {swing} for the {faction} this election, more than anyone at Level {bracket}. 25 Political Capital. The Gazette offers its congratulations.',
    ],
    quoted: [
      '{name} Quoted in the Herald on {issueShort}',
      "One sentence, printed whole, in the capital's paper. The Gazette is pleased to reprint it; the Rooms have framed it.",
    ],
    issuePc: [
      'Your Work on {issueShort} Counted',
      'Among the five who moved it most for the {faction}. +4 Political Capital. Mr Grey: "Good. Keep at it."',
    ],
    issuesDrawn: [
      'This Week in Ashford: {issue1} and {issue2}',
      '{issue1Blurb} The other matter: {issue2}. Both settle Sunday night.',
    ],
    issueLeading: [
      '{faction} Leads on {issue1Short}',
      '{faction} {m1} · {second} {m2} · {third} {m3}. Work on it in Ashford moves opinion half again.',
    ],
    issueOpen: [
      'Nobody Has Spoken on {issue1Short} Yet',
      'No party has moved on it. Work on it in Ashford moves opinion half again. The Gazette would welcome a view.',
    ],
    issueResolved: ['{faction} Owns {issueShort}', '{stance} {effectLine} for the week.'],
    issueLapsed: [
      'Nobody Spoke for {issueShort}',
      'A week and not a word from any party. The Gazette notes it, more in sorrow than in anger.',
    ],
  }),
];
