import type { AmbitionInput } from '../schemas';

/**
 * The three Ambitions (GDD §17.1) with chapter 1 of each (docs/design/slice-2-onboarding.md §3) and
 * the chapter-2 teasers (title and requirement only: not playable in slice 2). A chapter is
 * choose → check → result and never fails as a chapter. Story placeholders: {secretary} {hq} {city}.
 */
const CHAPTER_1_REWARDS = {
  success: { xp: 150, fxp: 40, iron: 100 },
  partial: { xp: 75, fxp: 20, iron: 50 },
  failure: { xp: 25, fxp: 0, iron: 0 },
};
const LETTER_FROM = "From your father's things";

export const ambitions: AmbitionInput[] = [
  {
    id: 'finish-his-work',
    title: 'Finish His Work',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: 'His ward book',
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: 'His ward book',
            narrative:
              'At the bottom of the suitcase, under the shirts: a ward book. Two hundred names in his hand, a tick or a cross against each, and the last page dated the week he lost his seat.',
            choices: [
              {
                id: 'show',
                text: 'Show it to {secretary}',
                hint: 'The branch will know what you carry.',
                flag: 'showed-book',
              },
              {
                id: 'keep',
                text: 'Keep it to yourself for now',
                hint: 'Some things you do alone first.',
                flag: 'kept-book',
              },
            ],
          },
          check: {
            title: 'Three names',
            narrative:
              "Three names in the book have two ticks: the ones who came out for him in the rain. Their street is twenty minutes' walk. You have the leaflets and his name; it's a question of how you use them.",
            approaches: [
              {
                id: 'knock',
                text: 'Knock the three doors and say whose child you are',
                stats: ['cha', 'int'],
              },
              { id: 'sort', text: 'Sort the book by street first, then knock', stats: ['int'] },
            ],
            cta: 'Walk his ward',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'Two of the three remember him',
              body: "One cries, one puts the kettle on, one shuts the door and then opens it again. All three take a leaflet. The third asks, on the step, whether you'll be standing. You say not yet.",
            },
            partial: {
              headline: 'One door opens',
              body: "New tenants at two of the three; the third remembers the name and not much else. She takes a leaflet for the landing. It's a start, and the book is still two hundred names long.",
            },
            failure: {
              headline: 'Nobody home',
              body: 'No one answers at any of the three. You leave a leaflet with his name written on each and walk back through the ward in the rain. The book goes back in the suitcase, for now.',
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.ward-book',
          art: 'home-hq',
        },
      },
      { n: 2, title: 'Stand where he stood', requires: { rank: 2 } },
    ],
  },
  {
    id: 'clear-his-name',
    title: 'Clear His Name',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: 'The prison letter',
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: 'The prison letter',
            narrative:
              'Sewn into the lining of the suitcase: a letter on prison paper, dated the second winter of his sentence. Someone has crossed a name out so hard the pen went through. He kept it twenty-five years.',
            choices: [
              {
                id: 'lamp',
                text: 'Hold the letter up to the lamp',
                hint: 'See what the pen cut through.',
                flag: 'read-name',
              },
              {
                id: 'branch',
                text: 'Take it to {secretary} unread',
                hint: 'The branch has long memories.',
                flag: 'told-branch',
              },
            ],
          },
          check: {
            title: "The Mill Fire of '19",
            narrative:
              'Three dead in the fire, one man convicted, and a witness whose name was crossed out. The old report is somewhere in the {city} records, and the old men who remember are in the market. Pick your door.',
            approaches: [
              { id: 'report', text: 'Find the fire report in the reading room', stats: ['int'] },
              {
                id: 'market',
                text: "Ask the oldest men in the market who remembers '19",
                stats: ['cha', 'int'],
              },
            ],
            cta: 'Start asking',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'A name comes back',
              body: "One man convicted on the word of a night foreman called Brandauer. Brandauer is alive, retired, and drawing a pension from a senator's office. You write the name down twice, in case.",
            },
            partial: {
              headline: 'A name in pencil',
              body: 'The report is missing its last page, but someone has written a name in the margin in pencil: Brandauer, foreman. Nobody in the market will say the name out loud. That tells you something too.',
            },
            failure: {
              headline: 'Out on loan',
              body: 'The file is out on loan to a ministry, and the old men in the market go quiet when you say the year. You leave your name with the clerk, which may have been a mistake.',
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.prison-letter',
          art: 'home-hq',
        },
      },
      { n: 2, title: 'The night foreman', requires: { level: 6 } },
    ],
  },
  {
    id: 'settle-his-debts',
    title: 'Settle His Debts',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: 'The marker',
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: 'The marker',
            narrative:
              'Your first night in the rented room, a man in a good coat knocks and doesn\'t come in. He leaves a folded paper: a marker for two thousand marks in your father\'s hand, countersigned in Clearwater. "No hurry," he says. "Not yet."',
            choices: [
              {
                id: 'ask',
                text: 'Ask who sent him',
                hint: 'A name is worth more than a month.',
                flag: 'asked-name',
              },
              {
                id: 'silent',
                text: 'Say nothing and shut the door',
                hint: 'Let them wonder what you know.',
                flag: 'said-nothing',
              },
            ],
          },
          check: {
            title: 'The man in the good coat',
            narrative:
              "He's back the next evening, on the stairs, with the same paper and the same smile. You have no two thousand marks. What you have is a minute, and it's a question of how you use it.",
            approaches: [
              { id: 'date', text: 'Look him in the eye and name a date', stats: ['cha', 'str'] },
              { id: 'read', text: 'Read the marker properly before you answer', stats: ['int'] },
            ],
            cta: 'Answer him',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'A month, and a name',
              body: "The countersignature is a house on the Clearwater riverside. He shrugs: a month, then they'll want something instead of money. A month is a long time in politics. You write the house down.",
            },
            partial: {
              headline: 'A month, no name',
              body: "You get a month, not a name. He takes the stairs two at a time, whistling, and leaves the marker on the banister. You'll see him again; you'd both rather it was later.",
            },
            failure: {
              headline: 'A fortnight',
              body: "He gives you a fortnight and no name, and looks round the room as if pricing it. The stairwell is very quiet after he's gone. You put the marker in the suitcase, next to the shirts.",
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.marker',
          art: 'home-hq',
        },
      },
      { n: 2, title: 'The riverside house', requires: { level: 6 } },
    ],
  },
];
