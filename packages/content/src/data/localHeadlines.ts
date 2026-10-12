import type { ContentInput } from '../schemas';

type HeadlineInput = ContentInput['headlines'][number];

/**
 * Review 4 (docs/design/review-4-answers.md §29.1, ADR 0074): the neutral local line of a home-city
 * edition, word for word. `cityId: '*'` (any city), `group: 'city'`; read at `paper.today` for the city
 * the reader is in when it is not their paper's (never at settlement, never in the reader's own
 * town). The slot prints at most one, by priority. `{city}` is the city, `{faction}` its home party
 * (home cities only), `{plainLine}` the ordinance's plain words. In the capital the Herald's own lines
 * serve instead; there (and in Clearwater) the last two never match.
 */
export const localHeadlines: HeadlineInput[] = [
  {
    id: 'hl.local.count',
    cityId: '*',
    group: 'city',
    priority: 0,
    when: [{ kind: 'countToday' }],
    headline: '{city} Has a New Council',
    deck: "Seven seats counted overnight: {playerSeats} went to players, {npcSeats} to local candidates. The town's rule for the week was counted with them and runs from this morning.",
  },
  {
    id: 'hl.local.voting',
    cityId: '*',
    group: 'city',
    priority: 1,
    when: [{ kind: 'phaseToday', phase: 'polling', cycleDay: 2 }],
    headline: '{city} Votes on Its Rule',
    deck: 'Three rules on the ballot until {until}. Residents vote from the paper or at the Town Hall; everyone else reads about it here.',
  },
  {
    id: 'hl.local.candidates',
    cityId: '*',
    group: 'city',
    priority: 1,
    when: [{ kind: 'phaseToday', phase: 'nominations', cycleDay: 0 }],
    headline: '{city} Council: Names Go In',
    deck: 'Names go in until {until}. Residents who are Known here and senior enough in their party can stand, naming the rule they would put to the town; the Town Hall has the list.',
  },
  {
    id: 'hl.local.rule',
    cityId: '*',
    group: 'city',
    priority: 2,
    when: [{ kind: 'ruleFromToday' }],
    headline: '{ordinance} in Force in {city}',
    deck: "{plainLine}. Five days, everyone in town whatever their party; it is pinned in the Town Hall's lobby.",
  },
  {
    id: 'hl.local.rival-pressure',
    cityId: '*',
    group: 'city',
    priority: 3,
    when: [{ kind: 'moraleLostToRivals', min: 1 }],
    headline: "Callers from Other Parties on {city}'s Streets",
    deck: "The {faction}'s share of the town fell {lost} yesterday to visitors. The streets answer the door to whoever knocks.",
  },
  {
    id: 'hl.local.morale',
    cityId: '*',
    group: 'city',
    priority: 4,
    when: [{ kind: 'homeShare', min: 0 }],
    headline: '{faction} Holds {city} at {share} %',
    deck: "The home party's share of the town this morning. Above 80 the branch is fired up; below 60 it is in trouble.",
  },
];
