import type { ContentInput } from '../schemas';

/**
 * The political result modals (docs/design/slice-3-screens.md §9; review 2: the *Next* line of
 * docs/design/review-2-answers.md §4.4; the voting rework, docs/design/voting-simplified.md §4.8).
 * `{paper}` is the paper's short name with its article ("the Clarion"); `{until}` and `{at}` are
 * rendered by the client in the player's clock; `{countDay}` the count's weekday; `{pollsWeekday}`
 * the weekday voting opens (cycle day 2).
 */
export const politics: ContentInput['politics'] = {
  results: {
    // The voting rework (design §4.8): `{rule}` the rule voted for or named; `{countDay}` the count's
    // weekday (the result morning, and the day the winner starts); `{name}` the candidate backed.
    ballot: {
      stamp: 'Vote cast',
      headline: 'Your vote is in',
      body: '{rule}. Nobody can see who you chose. The result is in {paper} on {countDay} morning; if it wins, it runs from {countDay} for five days.',
      next: 'Next: the result, {countDay} morning.',
    },
    declare: {
      stamp: "You're standing",
      headline: 'Your name is on the list',
      body: "Your rule: {rule}. Seats are counted {countDay} morning: the seven best known here, counting backers. Do today's orders and the branch backs you.",
      next: 'Next: the result, {countDay} morning.',
    },
    endorse: {
      stamp: 'Backed',
      headline: '{name} has your backing',
      body: "Backing is public and final: three more to {name}'s count at {countDay}'s result.",
      next: 'Next: the result, {countDay} morning.',
    },
    // Slice 4 (docs/design/slice-4-screens.md §6.3): `{district}` the new residence, `{weekday}` the
    // weekday its vote opens (register) or the room ends (room), `{hq}` the faction's capital HQ,
    // `{cap}` the Rested cap with the room.
    register: {
      // Review 4 #9 (answers §9.2): *Moved in* (was *Registered*).
      stamp: 'Moved in',
      headline: '{district} has a new voter',
      body: 'The Herald is your paper from tomorrow. {district} votes from {weekday}. {hq} expects you at six.',
      next: 'Next: vote in {district} from {weekday}.',
    },
    // Review 4 #9 (answers §9.3): the bed at Tram Junction (*A bed in Irongate*, was *A room in Irongate*).
    room: {
      stamp: 'Taken',
      headline: 'A bed in Irongate',
      body: 'Seven nights, a window on the tram line. Rested banks to {cap} until {weekday}.',
      // The Next line (screens §6.3, written 3 Oct 2026).
      // Slice-4 fixes §6 (QA m5): a renewal adds seven nights.
      next: 'Next: rest up. Renew any day to add seven nights.',
    },
    // Slice-4 fixes §6: seven more nights on a room running; `{weekday}` the room's new last day.
    renew: {
      stamp: 'Renewed',
      headline: 'A bed in Irongate',
      body: 'Seven more nights on the tram line. Rested banks to {cap} until {weekday}.',
      next: 'Next: rest up. The room runs to {weekday}.',
    },
    // The voting rework (docs/design/voting-simplified.md §4.8): a councillor names their rule.
    // `{rule}` the rule, `{line}` its plain line (filled with a capital, at a sentence start),
    // `{pollsWeekday}` the weekday the vote opens (cycle day 2), `{weekday}` the last day of the vote.
    setRule: {
      stamp: 'Changed',
      headline: 'Your rule is {rule}',
      body: '{line}. On the ballot from {pollsWeekday}; the town votes until {weekday}.',
      next: 'Next: the vote opens {pollsWeekday}.',
    },
  },
};
