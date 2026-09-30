import type { ContentInput } from '../schemas';

/**
 * The six political result modals (docs/design/slice-3-screens.md §9, as transcribed and checked in
 * docs/design/slice-3-politics.md §17.3). `{paper}` is the paper's short name with its article
 * ("the Clarion"); `{until}` and `{at}` are rendered by the client in the player's clock;
 * `{weekday}` is the next nominations day 0 after today; `{countDay}` the count's weekday; `{n}`
 * the candidate's endorsements after yours.
 */
export const politics: ContentInput['politics'] = {
  results: {
    ballot: {
      stamp: 'Ballot cast',
      headline: 'Your ballot is in the box',
      body: 'One vote for {name}. Nobody sees who you voted for. The count is in {paper} on {countDay} morning.',
    },
    declare: {
      stamp: 'Filed',
      headline: 'Your name is on the slate',
      body: "Two endorsements by {until} and your name is printed. Do today's orders and the branch backs you.",
    },
    endorse: {
      stamp: 'Endorsed',
      headline: '{name} has your name',
      body: 'An endorsement is public and final. {name} now has {n}: two by {until} put the name on the ballot, and up to five count.',
    },
    withdraw: {
      stamp: 'Withdrawn',
      headline: 'Your name comes off the slate',
      body: 'The deposit stays with the branch. Nominations open again on {weekday}.',
    },
    propose: {
      stamp: 'Moved',
      headline: '{ordinance} is on the order paper',
      body: '{ordinanceLine} The council divides at {at}.',
    },
    councilVote: {
      stamp: 'Voted',
      headline: 'Your vote is recorded',
      body: 'For {ordinance}. Public in the chamber, final. The council divides at {at}; {paper} prints the result.',
    },
  },
};
