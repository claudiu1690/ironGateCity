import type { AmbitionInput } from '../schemas';

/**
 * The three Ambitions (GDD §17.1) with chapter 1 of each (docs/design/slice-2-onboarding.md §3) and
 * the chapter-2 teasers (title and requirement only: not playable in slice 2). A chapter is
 * choose → check → result and never fails as a chapter. Story placeholders: {secretary} {hq} {city}.
 *
 * Review 5 (docs/design/review-5-answers.md §19.6, §19.10): *Coming home* re-anchors the three
 * without the father: *The Names on the Stone*, *Who Sold the Homes* and *The Ration Ledger*. The
 * ids, the ladder, the numbers, the flags and the keepsake ids are unchanged; only the strings move.
 */
const CHAPTER_1_REWARDS = {
  success: { xp: 150, fxp: 40, iron: 100 },
  partial: { xp: 75, fxp: 20, iron: 50 },
  failure: { xp: 25, fxp: 0, iron: 0 },
};
/** §19.10: chapter 1 is the envelope opened on the train (§19.4), read properly at the HQ. */
const LETTER_FROM = "From the office's post";

export const ambitions: AmbitionInput[] = [
  {
    id: 'finish-his-work',
    title: 'The Names on the Stone',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: "The unit's list",
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: "The unit's list",
            narrative:
              "The list, opened properly for the first time on the hall's table: forty names in the quartermaster's hand, a home street against each, and the council's notice beside it. The memorial is being cut. Their names aren't on it.",
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
            title: 'Three families',
            narrative:
              "Three of the forty had people in {city}: the list gives a street for each. Twenty minutes' walk. You have the flyers, the list and your own name; it's a question of how you use them.",
            approaches: [
              {
                id: 'knock',
                text: 'Knock the three doors and say you were in the same unit',
                stats: ['cha', 'int'],
              },
              { id: 'sort', text: 'Sort the list by street first, then knock', stats: ['int'] },
              // Review 1 (answers §2.1): a third approach on the best trained stat.
              {
                id: 'legwork',
                text: 'Legwork. Walk the three streets yourself, list in hand, and knock until the names answer.',
                stats: ['best'],
              },
            ],
            cta: 'Knock the three doors',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'Two of the three ask you in',
              body: "One cries, one puts the kettle on, one shuts the door and then opens it again. All three take a flyer. The third asks, on the step, whether you'll be standing. You say not yet.",
            },
            partial: {
              headline: 'One door opens',
              body: "New tenants at two of the three; the third knew the name and not much else. She takes a flyer for the landing. It's a start, and the list is still forty names long.",
            },
            failure: {
              headline: 'Nobody home',
              body: 'No one answers at any of the three. You leave a flyer with the name written on each and walk back through the streets in the rain. The list goes back in the kitbag, for now.',
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.ward-book',
          art: 'home-hq',
        },
      },
      // Slice 3 (docs/design/slice-3-politics.md §17.7): after the first ballot, seven days on.
      {
        n: 2,
        title: 'Stand for the stone',
        requires: { ballotCast: true },
        story: {
          letterFrom: "From the branch's press",
          choose: {
            title: 'Your election bill',
            narrative:
              "Off the branch's press this morning: your name in capitals on brown paper, the forty names under it, and the corner by {hq} where the council's man speaks at six. You've cast a vote here now. The bill asks what comes next.",
            choices: [
              {
                id: 'branch',
                text: "Tell {secretary} you'll speak at the corner",
                hint: 'The branch can bring a crowd, and will want a say in what you tell it.',
                flag: 'told-branch',
              },
              {
                id: 'alone',
                text: 'Go at six, alone, and see who stops',
                hint: 'Whoever comes, comes for the names.',
                flag: 'went-alone',
              },
            ],
          },
          check: {
            title: "Six o'clock",
            narrative:
              "Same corner, same hour, the council's man gone home. People slow because a stranger is standing where somebody usually does. You have forty names, your own, the bill in your pocket and about five minutes before they walk on.",
            approaches: [
              { id: 'step', text: 'Speak from the step: the forty names first, then yours', stats: ['cha', 'int'] },
              {
                id: 'edge',
                text: 'Work the edge of the crowd one at a time, the bill in your hand',
                stats: ['int'],
              },
            ],
            cta: 'Stand for the stone',
            difficulty: 14,
            energy: 15,
          },
          result: {
            success: {
              headline: 'They stopped',
              body: "Thirty by the end, and an old woman in the front row who reads the forty aloud and finds her nephew. She asks if you're standing. You say: when the branch lets me. She says she'll hold you to it.",
            },
            partial: {
              headline: 'A few stopped',
              body: 'Nine, two of them because they took it for a tram queue. One old man knew one of the forty and says so, loudly, which helps more than the speech. You get through it. The corner is yours if you want it.',
            },
            failure: {
              headline: 'A corner is only a corner',
              body: "Rain at six, and the square empties before you've read a name. A boy asks who you're talking to. You finish the list anyway, to nobody, and walk home with the bill under your coat. Same corner tomorrow, if the rain lets you.",
            },
          },
          rewards: {
            success: { xp: 300, fxp: 80, iron: 150 },
            partial: { xp: 150, fxp: 40, iron: 75 },
            failure: { xp: 50, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.election-bill',
          art: 'home-hq',
        },
      },
      // The teaser: written with the slice that follows (design §17.7).
      { n: 3, title: 'The deposit', requires: { rank: 3 } },
    ],
  },
  {
    id: 'clear-his-name',
    title: 'Who Sold the Homes',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: 'The requisition order',
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: 'The requisition order',
            narrative:
              "The order, read again in daylight: the flat's address, a date in the autumn, the word vacant typed where your family's name should be, and a signature you can read.",
            choices: [
              {
                id: 'lamp',
                text: 'Hold the order up to the lamp',
                hint: 'See what the typewriter struck out.',
                flag: 'read-name',
              },
              {
                id: 'branch',
                text: 'Take it to {secretary} as it is',
                hint: 'The branch has long memories.',
                flag: 'told-branch',
              },
            ],
          },
          check: {
            title: "The housing office's register",
            narrative:
              'Every requisition in {city} went through one register, and the register names who got each flat and what they paid. The housing office keeps it; the caretakers of the blocks remember it. Pick your door.',
            approaches: [
              { id: 'report', text: "Find your flat's entry in the housing office's register", stats: ['int'] },
              {
                id: 'market',
                text: "Ask the block's tenants who moved in, and who let them",
                stats: ['cha', 'int'],
              },
              {
                id: 'legwork',
                text: 'Legwork. Walk the block at the shift change and find who holds the keys at night.',
                stats: ['best'],
              },
            ],
            cta: 'Start asking',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'A name comes back',
              body: "The register has your flat under a new name, and the hand that entered it is Brandauer: the block's night caretaker now, drawing a second wage from a senator's office. You write the name down twice, in case.",
            },
            partial: {
              headline: 'A name in pencil',
              body: "The register's page is torn at your flat, but someone has written a name in the margin in pencil: Brandauer, caretaker. Nobody in the block will say the name out loud. That tells you something too.",
            },
            failure: {
              headline: 'Out on loan',
              body: "The register is out on loan to a ministry, and the tenants go quiet when you say the flat's number. You leave your name with the clerk, which may have been a mistake.",
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.prison-letter',
          art: 'home-hq',
        },
      },
      { n: 2, title: 'The night caretaker', requires: { level: 6 } },
    ],
  },
  {
    id: 'settle-his-debts',
    title: 'The Ration Ledger',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: 'The ration page',
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: 'The ration page',
            narrative:
              "The page, flat on the table: a year of rations drawn in your family's name, every month after they were gone, and a Clearwater stamp in the corner, small, as if that made it less.",
            choices: [
              {
                id: 'ask',
                text: 'Ask the branch who in Clearwater stamps paper like this',
                hint: 'A name is worth more than a month.',
                flag: 'asked-name',
              },
              {
                id: 'silent',
                text: 'Say nothing to anyone, and put it back in the kitbag',
                hint: 'Let them come to you, if they come.',
                flag: 'said-nothing',
              },
            ],
          },
          check: {
            title: 'The man in the good coat',
            narrative:
              "He finds you on the third evening, on the stairs, with a copy of the page and a good coat. The Clearwater people know which train you took. He has a price for your silence. You have a minute, and it's a question of how you use it.",
            approaches: [
              { id: 'date', text: 'Look him in the eye and name a date', stats: ['cha', 'str'] },
              { id: 'read', text: 'Read the page properly before you answer', stats: ['int'] },
              {
                id: 'legwork',
                text: 'Legwork. Walk the riverside road first and see whose house he goes back to.',
                stats: ['best'],
              },
            ],
            cta: 'Answer him',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'A month, and a name',
              body: "The stamp in the corner is a house on the Clearwater riverside. He shrugs: a month to bring the page back, then they'll want something instead of silence. A month is a long time in politics. You write the house down.",
            },
            partial: {
              headline: 'A month, no name',
              body: "You get a month, not a name. He takes the stairs two at a time, whistling, and leaves his copy of the page on the banister. You'll see him again; you'd both rather it was later.",
            },
            failure: {
              headline: 'A fortnight',
              body: "He gives you a fortnight and no name, and looks round the room as if pricing it. The stairwell is very quiet after he's gone. You put the page back in the kitbag, under everything else.",
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.marker',
          art: 'home-hq',
        },
      },
      // Slice 5 (docs/design/slice-5-risk.md §13): Level 6, seven days on. The quiet way adds Heat
      // on any outcome: for most players the first Heat they see, in a story that explains it.
      {
        n: 2,
        title: 'The riverside house',
        requires: { level: 6 },
        story: {
          letterFrom: "From the page's other side",
          choose: {
            title: 'The riverside house',
            narrative:
              "The man in the good coat is at the door this time, with a figure on a card and no hurry. The page has an address on its other side you never noticed: a house on the river road, in a clerk's hand, and three words. What they want.",
            choices: [
              {
                id: 'friday',
                text: "Tell him you'll have it by Friday",
                hint: "A week bought with a lie. He'll be back on Friday, and so will you, with whatever's in that house.",
                flag: 'promised-friday',
              },
              {
                id: 'shut',
                text: 'Shut the door on him',
                hint: 'He takes it well, which is worse. The street has seen him now.',
                flag: 'shut-the-door',
              },
            ],
          },
          check: {
            title: 'The riverside house',
            narrative:
              "A boarded house on the river road, a clerk's brass plate still by the bell. The yard gate is loose, the housekeeper next door has a key and a memory, and the whole street has seen the man in the good coat go by twice.",
            approaches: [
              // "The quiet way is the police's business if anyone saw you": Heat +6, whatever happens.
              { id: 'yard', text: 'In by the yard, quietly', stats: ['agi'], heat: 6 },
              { id: 'key', text: 'Ask the housekeeper for the key', stats: ['cha', 'int'] },
              { id: 'neighbours', text: 'The neighbours first, then the door', stats: ['best'] },
            ],
            cta: 'Open the house',
            difficulty: 14,
            energy: 15,
          },
          result: {
            success: {
              headline: "A page of the ring's ledger",
              body: 'Under the back-room floor, a biscuit tin: a ledger with every page torn out but one. On it, in a clerk\'s hand, the names the ring drew rations in, yours among them, and what each fetched. You put the tin back and the page in your coat.',
            },
            partial: {
              headline: 'A tin, and a page torn in half',
              body: 'The tin is where the page said, and empty but for half a page: the sums, no names. Somebody has been here first, or the ring tore it itself. Half a page is half an argument. You take it.',
            },
            failure: {
              headline: 'A boarded house is a boarded house',
              body: "The back room has been stripped to the boards and the boards to the joists. Whatever was here went before you came. You stand in the dust with the ration page until the housekeeper's light goes on next door. You take the page home.",
            },
          },
          rewards: {
            success: { xp: 300, fxp: 80, iron: 150 },
            partial: { xp: 150, fxp: 40, iron: 75 },
            failure: { xp: 50, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.ledger-page',
          art: 'home-hq',
        },
      },
      // The teaser: the man in the good coat comes for the page (written with the slice that follows).
      { n: 3, title: 'The collector', requires: { rank: 3 } },
    ],
  },
];
