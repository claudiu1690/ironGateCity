import type { ContentInput } from '../schemas';

type HeadlineInput = ContentInput['headlines'][number];

const ambient = (n: number, headline: string): HeadlineInput => ({
  id: `hl.ambient-${n}`,
  cityId: 'coalport',
  group: 'ambient',
  headline,
});

/**
 * The Coalport Clarion's headline templates (docs/design/slice-1-content.md §7.4 and §13), split as
 * the tech design §4.2 describes: `hl.streak` is two templates, `hl.morale` three share bands, the
 * ambient pool ten templates rotated by the day. Placeholders are resolved on the server.
 */
export const headlines: HeadlineInput[] = [
  {
    id: 'hl.first-day',
    cityId: 'coalport',
    group: 'personal',
    priority: 1,
    when: [{ kind: 'firstEdition' }],
    headline: 'Welcome to Coalport',
    deck: 'Your branch secretary has three orders for you below. Spend your Energy; it refills, five points every ten minutes.',
  },
  // Rank-up and level-up variants (content §13.5): exactly one of each can match on a morning.
  {
    id: 'hl.rank-up-2',
    cityId: 'coalport',
    group: 'personal',
    priority: 2,
    when: [{ kind: 'rankRose', values: [2] }],
    headline: '{name} Made Activist by the Branch',
    deck: 'Recruits become Activists on the strength of their party work. The vote follows.',
  },
  {
    id: 'hl.rank-up-3',
    cityId: 'coalport',
    group: 'personal',
    priority: 2,
    when: [{ kind: 'rankRose', values: [3] }],
    headline: '{name} Made Organiser by the Branch',
    deck: 'An Organiser can stand for the council. Secretary Holm: "Now the real work starts."',
  },
  {
    id: 'hl.rank-up',
    cityId: 'coalport',
    group: 'personal',
    priority: 2,
    when: [{ kind: 'rankRose', min: 4 }],
    headline: '{name} Made {rank} by the Branch',
    deck: 'Made {rank} on the strength of party work. The branch takes note.',
  },
  {
    id: 'hl.level-up',
    cityId: 'coalport',
    group: 'personal',
    priority: 3,
    when: [{ kind: 'levelRose' }, { kind: 'energyYesterday', min: 1 }],
    headline: 'Coalport {rank} Rises to Level {level}',
    deck: '{name} of the Collective spent {energyYesterday} Energy on the ward yesterday. The branch has noticed.',
  },
  {
    id: 'hl.level-up-quiet',
    cityId: 'coalport',
    group: 'personal',
    priority: 3,
    when: [{ kind: 'levelRose' }, { kind: 'energyYesterday', max: 0 }],
    headline: 'Coalport {rank} Rises to Level {level}',
    deck: '{name} of the Collective has been putting the hours in on the ward. The branch has noticed.',
  },
  {
    id: 'hl.standing',
    cityId: 'coalport',
    group: 'personal',
    priority: 4,
    when: [{ kind: 'standingRose' }],
    headline: 'A {standing} Face in Coalport',
    deck: 'Coalport knows {name} now: {standing}. Actions here get +{bonus} %.',
  },
  {
    id: 'hl.orders-done',
    cityId: 'coalport',
    group: 'personal',
    priority: 5,
    when: [{ kind: 'ordersAllDoneYesterday' }],
    headline: 'Branch Praises Its Canvassers',
    deck: 'Every order carried out yesterday. Secretary Holm: "That\'s how it\'s done." +5 Political Capital banked.',
  },
  {
    id: 'hl.streak-5',
    cityId: 'coalport',
    group: 'personal',
    priority: 6,
    when: [{ kind: 'streakHitYesterday', values: [5] }],
    headline: 'Five Straight Shifts and Counting',
    deck: '{name} has not missed a shift in {streak} days. Pay is up {bonus} %.',
  },
  {
    id: 'hl.streak-10',
    cityId: 'coalport',
    group: 'personal',
    priority: 6,
    when: [{ kind: 'streakHitYesterday', values: [10] }],
    headline: 'Ten Straight Shifts and Counting',
    deck: '{name} has not missed a shift in {streak} days. Pay is up {bonus} %.',
  },
  {
    id: 'hl.away',
    cityId: 'coalport',
    group: 'personal',
    priority: 7,
    when: [
      { kind: 'daysSinceLastPaper', min: 2 },
      { kind: 'halfPaysCredited', min: 1 },
    ],
    headline: 'While You Were Away',
    // {days} is the number of half-pays credited, at most 14 (designer answer §12 Q9).
    deck: '{days} days of half pay banked ({iron} Iron). Rested is full. The ward is where you left it.',
  },
  {
    id: 'hl.away-no-job',
    cityId: 'coalport',
    group: 'personal',
    priority: 7,
    // Content §13.1: the credited count decides, not whether a job is held.
    when: [
      { kind: 'daysSinceLastPaper', min: 2 },
      { kind: 'halfPaysCredited', max: 0 },
    ],
    headline: 'While You Were Away',
    deck: 'No job, so no half pay banked. Rested is full and the ward is where you left it. The mill is still hiring: the Jobs card is at Mill Gate.',
  },
  {
    id: 'hl.idle',
    cityId: 'coalport',
    group: 'personal',
    priority: 8,
    when: [{ kind: 'idleYesterday' }],
    headline: 'Quiet Day in the Ward',
    deck: "No leaflets went out yesterday. Today's orders are below.",
  },
  // The space before "%" in the three morale headlines is a no-break space (U+00A0), so the
  // figure and its sign never split across lines.
  {
    id: 'hl.morale-fired',
    cityId: 'coalport',
    group: 'city',
    priority: 1,
    when: [{ kind: 'homeShare', min: 80 }],
    headline: 'Collective Holds Coalport at {share} %',
    deck: 'The mill is singing.',
  },
  {
    id: 'hl.morale-steady',
    cityId: 'coalport',
    group: 'city',
    priority: 1,
    when: [{ kind: 'homeShare', min: 60, max: 80 }],
    headline: 'Collective Holds Coalport at {share} %',
    deck: '"Steady," says the branch. Steady isn\'t enough.',
  },
  {
    id: 'hl.morale-unrest',
    cityId: 'coalport',
    group: 'city',
    priority: 1,
    when: [{ kind: 'homeShare', max: 60 }],
    headline: 'Collective Holds Coalport at {share} %',
    deck: 'Unrest in Coalport: dockers question the party.',
  },
  {
    id: 'hl.orders-call',
    cityId: 'coalport',
    group: 'city',
    priority: 2,
    when: [{ kind: 'noPersonal' }],
    headline: 'Secretary Holm Calls for {ordersTitle}',
    deck: '{ordersLine}',
  },
  ambient(0, 'Bread Up Two Marks a Loaf'),
  ambient(1, 'Night Shift Back to Full Time at the Mill'),
  ambient(2, 'Freighter Clearwater Star Three Days Late'),
  ambient(3, 'Tram Fares to Stay at Two Marks, Says Council'),
  ambient(4, "Dockers' Benevolent Fund Dance Saturday"),
  ambient(5, 'Fog on the River: Barges Held at the Lock'),
  ambient(6, 'Rent-Man Seen Off in Foundry Row'),
  ambient(7, 'Coal Ration Unchanged for October'),
  ambient(8, 'Rolling-Mill Hooter Silent for Repairs'),
  ambient(9, 'Market Inspector Fines Three Stallholders'),
];
