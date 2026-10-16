import type { ContentInput } from '../schemas';

type HeadlineInput = ContentInput['headlines'][number];

/**
 * Slice 7 (docs/design/slice-7-nation.md §11.2, §23.9; tech design §11.2): the personal national
 * lines, every paper, in the paper's own voice. The conditions are the rules' national kinds (stored
 * at the settlement from the member's facts; `pushed` is live). Thirteen factual lines print the
 * Herald's deck in every paper (counts and dates, where a voice adds nothing); eight carry a voice
 * (§23.9). The four front-page lines use the slice-3 front page (the stamp ELECTED, the caption
 * naming the office) on the first edition the holder opens in the term. Every deck is at most 200
 * characters with the longest tokens.
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
  // ----- The Governor -------------------------------------------------------------------------
  {
    name: 'governor',
    priority: 0,
    when: [{ kind: 'governorTookOffice' }],
    // `{title}` is *Governor* at home, *Mayor* in Irongate and Clearwater (settled 16 Oct 2026, phase C).
    headline: '{name} Is {title} of {city}',
    deck: "Top of the poll with a council term behind them. The party's card on the town's ballot is theirs to choose; the Address is theirs once this term.",
    voices: {
      clarion: 'Top of the poll with a council term behind them. Secretary Holm: "The card\'s yours. Pick one the quays can feel." The Address is yours once this term.',
      sentinel: "Top of the poll, a term served, the committee's confidence recorded. The party's card on the ballot is the {title}'s; the Address once this term.",
      gazette: "Top of the poll with a council term behind them, which the Gazette has checked. The party's card is the {title}'s to choose; the Address is yours once.",
      courier: "Top of the poll on the lake, a term behind them. The party's card on the ballot is the Mayor's to choose at the Casino; the Address once this term.",
    },
  },
  {
    name: 'governor-local',
    priority: 2,
    when: [{ kind: 'governorLocal' }],
    headline: "A Local Holds the {title}'s Chair",
    deck: 'No councillor with a completed term, so {local} holds it and sets nothing. Complete this term and the chair is within reach.',
  },
  {
    name: 'address',
    priority: 2,
    when: [{ kind: 'addressGiven' }],
    headline: '{title} {name} Speaks on {issueShort}',
    deck: 'Fifty points to the {faction} on {issueShort}, from the steps of {hall}. The Address is spent for the term.',
  },
  // ----- The Chair ----------------------------------------------------------------------------
  {
    name: 'chair-filed',
    priority: 2,
    when: [{ kind: 'chairFiled' }],
    headline: '{name} Stands for Chair of the {faction}',
    deck: "Backers {backers} so far, three on the count each. The secretary is on the ballot too; beat the branch's own administrator and the orders are yours.",
  },
  {
    name: 'chair-front',
    priority: 0,
    when: [{ kind: 'chairElected' }],
    headline: '{name} Chairs the {faction}',
    deck: "{votes} votes. Every member's morning orders, the party line in Parliament and the branch's event are yours for twenty-eight days.",
    voices: {
      clarion: "{votes} votes, and the secretary's own. Every member's morning orders, the party line in Parliament and the branch's event are yours for twenty-eight days. Holm: \"Don't waste them.\"",
      sentinel: "{votes} votes. The orders, the party line and the fixture are the Chair's for twenty-eight days; the committee expects them set by tomorrow.",
      gazette: "{votes} votes, counted twice. The orders, the party line and the Rooms' event are yours for twenty-eight days. Mr Grey has left you the pencil.",
      courier: "{votes} votes, lake and capital counted together. The orders, the party line and every branch's event are yours for twenty-eight days.",
    },
  },
  {
    name: 'chair-lost',
    priority: 1,
    when: [{ kind: 'chairLost' }],
    headline: '{name} Falls Short for Chair',
    deck: '{winner} took it with {votes} to your {yourVotes}. Twenty-eight days to the next.',
    voices: {
      clarion: '{winner} took it with {votes} to your {yourVotes}. Holm: "The orders still want doing." Twenty-eight days to the next.',
      sentinel: '{winner} took it with {votes} to your {yourVotes}. The committee records the result and expects the orders done. Twenty-eight days to the next.',
      gazette: '{winner} took it with {votes} to your {yourVotes}; the Gazette prints the count in full. Twenty-eight days to the next.',
      courier: '{winner} took it with {votes} to your {yourVotes}. The lake voted too. Twenty-eight days to the next.',
    },
  },
  {
    name: 'chair-vote',
    priority: 2,
    when: [{ kind: 'chairVoteOpened' }],
    headline: 'A Vote on the Chair',
    deck: '{reason}. Confidence or no confidence, until {until}; two thirds remove.',
    voices: {
      clarion: '{reason}. Confidence or no confidence, until {until}; two thirds remove. Holm is saying nothing, loudly.',
      sentinel: '{reason}. Confidence or no confidence, until {until}; two thirds remove. The committee votes in order.',
      gazette: '{reason}. Confidence or no confidence, until {until}; two thirds remove. The Gazette is impartial, and curious.',
      courier: '{reason}. Confidence or no confidence, until {until}; two thirds remove. The lake has a view.',
    },
  },
  // ----- Parliament ---------------------------------------------------------------------------
  {
    name: 'deputy-front',
    priority: 0,
    when: [{ kind: 'deputySeated' }],
    headline: '{name} Takes a Seat in Parliament',
    deck: "{ordinal} on the {faction}'s list, sworn under the dome. One law a term is yours to put; every bill is yours to vote on.",
    voices: {
      clarion: '{ordinal} on the list, sworn under the dome. One law a term is yours to put; every bill is yours to vote on. The Union Hall has the train times.',
      sentinel: '{ordinal} on the list, sworn in order. One law a term; every bill a vote. Beacon House expects the lists of who voted how.',
      gazette: "{ordinal} on the list, sworn under the dome, which the Gazette's man watched from the gallery. One law a term; every bill a vote.",
      courier: '{ordinal} on the list, sworn under the dome, twenty-five minutes from the lake. One law a term; every bill a vote.',
    },
  },
  {
    name: 'list-missed',
    priority: 1,
    when: [{ kind: 'listMissed' }],
    headline: '{name} Misses Parliament by {margin} Places',
    deck: 'The {faction} took {seats} seats; you were {ordinal} on the list. Back a bigger party, or be first on the list next term.',
  },
  // ----- The President ------------------------------------------------------------------------
  {
    name: 'president-front',
    priority: 0,
    when: [{ kind: 'presidentSeated' }],
    headline: 'President {name}',
    deck: "The republic's, for twenty-eight days. A law a week, the veto once, the Address once, and every paper watching.",
    voices: {
      clarion: "The republic's, for twenty-eight days. A law a week, the veto once, the Address once, and the Clarion watching with the rest.",
      sentinel: "The republic's, for twenty-eight days. A law a week, the veto once, the Address once. The committee has sent its congratulations and its list.",
      gazette: "The republic's, for twenty-eight days. A law a week, the veto once, the Address once, and the Gazette's leader column every morning.",
      courier: "The republic's, for twenty-eight days, and the lake's for a term. A law a week, the veto once, the Address once.",
    },
  },
  {
    name: 'president-lost',
    priority: 1,
    when: [{ kind: 'presidentLost' }],
    headline: '{name} Short of the Presidency',
    deck: "{winner} scored {score} to your {yourScore}. First on the {faction}'s list: a deputy's seat is yours.",
    voices: {
      clarion: "{winner} scored {score} to your {yourScore}. First on the list: a deputy's seat is yours, and Holm says that's where the work is.",
      sentinel: "{winner} scored {score} to your {yourScore}. First on the list: a deputy's seat, and the committee's expectation of a full term.",
      gazette: "{winner} scored {score} to your {yourScore}; the Gazette has checked the arithmetic. First on the list: a deputy's seat is yours.",
      courier: "{winner} scored {score} to your {yourScore}. First on the list: a deputy's seat, and the lake line to it.",
    },
  },
  {
    name: 'pick-won',
    priority: 1,
    when: [{ kind: 'pickWon' }],
    headline: "{name} Is the {faction}'s Candidate",
    deck: "{votes} votes at the {pickName}; the party's own figure stood aside. The republic votes from {weekday}.",
  },
  {
    name: 'pick-lost',
    priority: 1,
    when: [{ kind: 'pickLost' }],
    headline: 'The {pickName} Chooses {winner}',
    deck: "{winner} took the party's name with {votes} to your {yourVotes}. Your name goes on the list.",
  },
  // ----- Bills and laws -----------------------------------------------------------------------
  {
    name: 'bill-tabled',
    priority: 2,
    when: [{ kind: 'billTabled' }],
    headline: 'Deputy {name} Puts {law} to Parliament',
    deck: '{lawLine} Deputies vote until {until}; {needed} carry it.',
  },
  {
    name: 'bill-passed',
    priority: 1,
    when: [{ kind: 'billPassed' }],
    headline: "{name}'s {law} Passes",
    deck: '{forVotes} of sixty. In force from tomorrow for {days} days, in every city, with your name in the law book.',
  },
  {
    name: 'bill-failed',
    priority: 1,
    when: [{ kind: 'billFailed' }],
    headline: "{name}'s {law} Falls",
    deck: '{forVotes} of the {needed} needed. A week before it can return.',
  },
  {
    name: 'pledge-kept',
    priority: 1,
    when: [{ kind: 'pledgeKept' }],
    headline: 'Pledge Kept: {law}',
    deck: 'Promised on the ballot, passed by Parliament. The Herald keeps count.',
  },
  // ----- Petitions ----------------------------------------------------------------------------
  {
    name: 'petition-opened',
    priority: 2,
    when: [{ kind: 'petitionOpened' }],
    headline: 'A Petition to Dissolve {city} Council',
    deck: '{signatures} of {needed} names by {until}. Residents of any party sign on the Election card.',
  },
  {
    name: 'petition-failed',
    priority: 2,
    when: [{ kind: 'petitionFailed' }],
    headline: 'The Petition Falls Short',
    deck: "{signatures} of {needed}. The council sits to {weekday}'s result. No petition for a week.",
  },
  {
    name: 'dissolved-councillor',
    priority: 0,
    when: [{ kind: 'dissolvedCouncillor' }],
    headline: '{city} Dissolves Its Council',
    deck: '{signatures} residents signed. Your seat ends today, the term uncompleted. Candidates can put their names in on {weekday}.',
    voices: {
      clarion: '{signatures} residents signed. Your seat ends today, the term uncompleted. Holm: "Then win it back." Names in on {weekday}.',
      sentinel: '{signatures} residents signed. Your seat ends today, the term uncompleted; the committee will want to know why. Names in on {weekday}.',
      gazette: '{signatures} residents signed, which the Gazette has counted. Your seat ends today, the term uncompleted. Names in on {weekday}.',
      courier: '{signatures} residents signed, from the Front to the Rows. Your seat ends today, the term uncompleted. Names in on {weekday}.',
    },
  },
  // ----- The Chair's push (live) --------------------------------------------------------------
  {
    name: 'pushed',
    priority: 3,
    when: [{ kind: 'pushed' }],
    headline: 'The Chair Wants {place}',
    deck: "{orderTitle}: the party's target is {target} today. Everyone who knocks shares the bonus if it's met.",
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

/** The twenty-one lines in each of the five papers (the Herald's deck where the voice adds nothing). */
export const nationHeadlines: HeadlineInput[] = [
  ...paperLines('clarion'),
  ...paperLines('sentinel'),
  ...paperLines('gazette'),
  ...paperLines('herald'),
  ...paperLines('courier'),
];

/** The ids every paper carries (by suffix), for the loader's per-paper check. */
export const NATION_HEADLINE_NAMES = LINES.map((l) => l.name);
