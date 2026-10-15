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
    // ----- Slice 7 (docs/design/slice-7-nation.md §12, §23.7; the 10 Oct addendum for the Governor's
    // card): the nation's acts, one modal each (≤ 240, with a *Next* line). `{line}` is *For* /
    // *Against* / *a free vote*; `{vote}` *For* / *Against* / *Confidence* / *No confidence*;
    // `{pickName}` the party's word; `{countDay}` / `{resultWeekday}` the result's weekday.
    // The Chair's election (§4.1; voting simplified: 25 PC spent, no backers needed, backing optional).
    chairDeclare: {
      stamp: "You're standing",
      headline: 'Your name is on the list for Chair',
      body: "25 Political Capital, spent. Your name is printed beside the secretary's until the result; backers add three each. Do today's orders and the branch backs you.",
      next: 'Next: find backers. Voting opens {pollsWeekday}.',
    },
    chairBack: {
      stamp: 'Backed',
      headline: '{name} has your backing',
      body: 'Backing is public and final, one a Chair election. {name} has {n} now; each backer is three on the count, and up to five count.',
      next: 'Next: voting for Chair opens {pollsWeekday}.',
    },
    chairVote: {
      stamp: 'Vote cast',
      headline: 'Your vote is in',
      body: 'You voted for {name}. Nobody can see who you chose. The result is on {countDay} morning, in every paper of the {faction}.',
      next: 'Next: the result, {countDay} morning.',
    },
    // The Chair's desk (§4.2–§4.4).
    chairOrders: {
      stamp: 'Set',
      headline: 'The orders are yours',
      body: 'From tomorrow every member reads these three in the morning, until you change them. The secretary writes the lines; your name is under them.',
      next: "Next: the party's target shows on the Orders tab tomorrow.",
    },
    partyLine: {
      stamp: 'Line set',
      headline: 'The party line is {line}',
      body: 'Every {faction} deputy run by the game votes {line} on {law}. Player deputies vote as they please. Parliament votes at {at}.',
      next: "Next: Parliament's vote, {resultWeekday} morning.",
    },
    partyRule: {
      stamp: 'Set',
      headline: "{ordinance} is the party's card in {city}",
      body: "The party's card on every {city} ballot from {weekday}'s vote, wherever no Governor of ours sits: what the town votes on.",
      next: 'Next: the town votes from {weekday}.',
    },
    fixture: {
      stamp: 'Set',
      headline: "Tomorrow's event in {city}",
      body: "The branch's event tomorrow is {event} at {venue}: posted at midnight, settled at the next. Members join it from the Faction tab; roles still empty at the start go to volunteers.",
      next: "Next: it's on the board from midnight.",
    },
    chairCall: {
      stamp: 'Called',
      headline: 'The {event} is called in {city}',
      body: 'At {venue}, settles at {at}, called by the Chair with no role taken. Members in {city} join it from the Faction tab; roles still empty at the start go to volunteers.',
      next: "Next: it's on the board now.",
    },
    // The Governor (§3.1; the 10 Oct addendum: the party's card).
    governorRule: {
      stamp: 'Set',
      headline: "{ordinance} is the party's card",
      body: "Card 1 on the town's ballot, at no cost. The town votes on it from {pollsWeekday} until {weekday}; the winner runs for five days.",
      next: 'Next: the town votes from {pollsWeekday}.',
    },
    address: {
      stamp: 'Spoken',
      headline: 'The Address: {issueShort}',
      body: 'Fifty points to the {faction} on {issueShort}, in your name. Once a term; this was it.',
      next: 'Next: the Issue settles on Monday morning.',
    },
    // The national election (§6).
    presidentDeclare: {
      stamp: "You're standing",
      headline: 'Your name is in for President',
      body: "100 Political Capital, two pledges and your party's pick to win. The {pickName} sits on {weekday}; the party's own figure is on its ballot.",
      next: "Next: the party's pick, {weekday}.",
    },
    presidentWithdraw: {
      stamp: 'Withdrawn',
      headline: 'Your name is off the list for President',
      body: "The 100 Political Capital is back in your pocket, and your place at the top of the party's list goes with the candidacy. The party picks on {weekday} without you.",
      next: "Next: nothing until the next term's names in.",
    },
    listDeclare: {
      stamp: "You're standing",
      headline: "Your name is on the {faction}'s list",
      body: "The list is ordered by backers. Parliament's seats go down it on {weekday}, as many as the party's score wins.",
      next: 'Next: find backers. The republic votes from {pollsWeekday}.',
    },
    pickVote: {
      stamp: 'Vote cast',
      headline: 'Your vote is in',
      body: "You chose {name} to carry the {faction}. Nobody can see who you chose. The party's candidate is named on {weekday} morning.",
      next: "Next: the party's candidate, {weekday}.",
    },
    nationalVote: {
      stamp: 'Vote cast',
      headline: 'Your vote is in',
      body: 'You voted for {name} for President. Nobody can see who you chose. The result is on {countDay} morning, to be confirmed the day after.',
      next: 'Next: the result, {countDay} morning.',
    },
    nationalBack: {
      stamp: 'Backed',
      headline: '{name} has your backing',
      body: "Backing is public and final, one a term. {name}'s party scores a point more for it; up to five count.",
      next: 'Next: the result, {countDay} morning.',
    },
    listBack: {
      stamp: 'Backed',
      headline: '{name} has your backing',
      body: "Backing is public and final, one a term. {name} is now {ordinal} on the {faction}'s list.",
      next: 'Next: the seats go down the list on {countDay}.',
    },
    // Parliament (§5).
    tableBill: {
      stamp: 'Put to Parliament',
      headline: '{law} is up for a vote',
      body: '{lawLine} Deputies vote until {until}; {needed} of sixty carry it.',
      next: "Next: Parliament's vote, {resultWeekday} morning.",
    },
    tableRemoval: {
      stamp: 'Put to Parliament',
      headline: 'A vote to remove the President',
      body: 'Forty of sixty remove {president}; the runner-up takes the rest of the term. Deputies vote until {until}.',
      next: "Next: Parliament's vote, {resultWeekday} morning.",
    },
    billVote: {
      stamp: 'Voted',
      headline: 'Your vote is recorded',
      body: "{vote} {law}. The whole chamber can see it, and it's final. Parliament votes at {at}; every paper prints the result.",
      next: 'Next: the result, {resultWeekday} morning.',
    },
    veto: {
      stamp: 'Vetoed',
      headline: '{law} stops at your desk',
      body: 'Passed by {forVotes}, and not in force. Parliament may vote it through anyway with forty; the vote is put up this morning.',
      // Q14: when the second vote cannot settle before the term ends, the server's *Next* reads
      // *Next: the veto is final; Parliament cannot vote it through before the term ends.*
      next: "Next: Parliament's second vote, {resultWeekday} morning.",
    },
    // Petitions and removals (§10).
    petitionOpen: {
      stamp: 'Opened',
      headline: 'A petition to dissolve {city} council',
      body: 'Your name is the first of {needed}. Residents of any party sign until {until}, 10 Political Capital each; the council is dissolved if the names come in.',
      next: 'Next: the count of names, {resultWeekday} morning.',
    },
    petitionSign: {
      stamp: 'Signed',
      headline: 'Your name is on the petition',
      body: '{signatures} of {needed} by {until}. Signing is public and final.',
      next: 'Next: the count of names, {resultWeekday} morning.',
    },
    chairPetitionOpen: {
      stamp: 'Opened',
      headline: 'A vote on the Chair',
      body: 'Your name is the first of {needed}. Members of Rank 3 and above sign until {until}, 10 Political Capital each; if the names come in, every member votes for two days.',
      next: 'Next: the count of names, {resultWeekday} morning.',
    },
    chairPetitionSign: {
      stamp: 'Signed',
      headline: 'Your name is on the petition',
      body: '{signatures} of {needed} by {until}. Signing is public and final, and the Chair can see who signed.',
      next: 'Next: the count of names, {resultWeekday} morning.',
    },
    confidenceVote: {
      stamp: 'Vote cast',
      headline: 'Your vote is in',
      body: '{vote} in the Chair. Nobody can see who you chose. The result is on {countDay} morning.',
      next: 'Next: the result, {countDay} morning.',
    },
  },
};
