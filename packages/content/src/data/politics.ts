import type { ContentInput } from '../schemas';

/**
 * The six political result modals (docs/design/slice-3-screens.md §9; review 2: the words of
 * docs/design/review-2-answers.md §1.10 and the *Next* line of §4.4). `{paper}` is the paper's short
 * name with its article ("the Clarion"); `{until}` and `{at}` are rendered by the client in the
 * player's clock; `{weekday}` is the next nominations day 0 after today; `{countDay}` the count's
 * weekday; `{pollsWeekday}` the weekday voting opens (cycle day 2); `{resultWeekday}` the weekday
 * the council's vote is printed; `{n}` the candidate's endorsements after yours.
 */
export const politics: ContentInput['politics'] = {
  results: {
    ballot: {
      stamp: 'Vote cast',
      headline: 'Your vote is in',
      body: 'You voted for {name}. Nobody can see who you chose. The result is in {paper} on {countDay} morning, and on the Election card.',
      next: 'Next: the result, {countDay} morning.',
    },
    declare: {
      stamp: "You're standing",
      headline: 'Your name is on the list',
      body: "You need two backers by {until} or your name comes off. Do today's Party orders and the branch backs you.",
      next: 'Next: find backers. Voting opens {pollsWeekday}.',
    },
    endorse: {
      stamp: 'Backed',
      headline: '{name} has your backing',
      body: 'Backing is public and final. {name} has {n} now; two by {until} keep the name on the list, and up to five count.',
      next: 'Next: voting opens {pollsWeekday}.',
    },
    withdraw: {
      stamp: 'Withdrawn',
      headline: 'Your name comes off the list',
      body: 'The 10 Political Capital stays with the branch. Candidates can put their names in again on {weekday}.',
      next: 'Next: nothing until {weekday}.',
    },
    propose: {
      stamp: 'Put forward',
      headline: '{ordinance} is up for a vote',
      body: '{ordinanceLine} The council votes at {at}.',
      next: 'Next: vote for a rule before {at}.',
    },
    councilVote: {
      stamp: 'Voted',
      headline: 'Your vote is recorded',
      body: "For {ordinance}. The whole council can see it, and it's final. The council votes at {at}; {paper} prints the result.",
      next: 'Next: the result, {resultWeekday} morning.',
    },
  },
};
