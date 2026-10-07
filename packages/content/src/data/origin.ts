import type { OriginInput } from '../schemas';

/**
 * The origin (GDD §7.1, review 4: *The Last Train In*; docs/design/review-4-answers.md §2, ADR 0073):
 * three beats of one choice each. Beat 1, the platform: whom you help is your party (a row selects,
 * the button commits). Beat 2, the suitcase: +6 to one stat, +1 to another. Beat 3, the lining: the
 * Ambition, and his coat worn from here on. Effects are the rules' closed DSL; the echo lines show at
 * the top of the next beat. `{helper}`, `{helperPronoun}` and `{city}` are the person helped and
 * their town (the designer's `{Holm}`, `{She}`, `{City}`).
 */
export const origin: OriginInput = {
  steps: [
    {
      id: 'origin.step-platform',
      kicker: 'Irongate · Central Station · the last train in',
      title: 'The platform',
      narrative:
        'The night train empties onto a platform that smells of coal smoke and wet wool. One suitcase, nobody waiting. Three people are, in their way, and each wants two minutes of you.',
      art: 'scene.station',
      portrait: null,
      note: 'Whoever you help, you go with. Permanent: a Faction Reset token is the only way back.',
      questions: [
        {
          id: 'origin.platform',
          answers: [
            {
              id: 'holm',
              text: '"Carry this parcel for me as far as the Coalport train. My hands are full and the porter\'s been bought."',
              lines: [
                'Petra Holm · union organiser · Coalport',
                'Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence',
              ],
              portrait: 'portrait.holm',
              confirm: "Help Holm · the six o'clock to Coalport",
              echo: "You carried Holm's parcel.",
              effects: [{ kind: 'faction', factionId: 'collective', person: 'holm' }],
            },
            {
              id: 'stahl',
              text: '"Take a bundle. Hand them out on your way down the platform. The meeting is Thursday and this town forgets."',
              lines: [
                'Viktor Stahl · steward · Duskwall',
                'Iron Vanguard · order, discipline and a strong hand · +3 Strength',
              ],
              portrait: 'portrait.stahl',
              confirm: "Help Stahl · the six o'clock to Duskwall",
              echo: "You took Stahl's bundle.",
              effects: [{ kind: 'faction', factionId: 'vanguard', person: 'stahl' }],
            },
            {
              id: 'grey',
              text: '"Witness a signature. A pen, your name, two minutes. His lease runs out at midnight and the office that stamps it opens at nine."',
              lines: [
                'Thomas Grey · agent · Ashford',
                'Civic Alliance · elections, courts and a free press · +3 Intelligence',
              ],
              portrait: 'portrait.grey',
              confirm: "Help Grey · the six o'clock to Ashford",
              echo: "You witnessed Grey's signature.",
              effects: [{ kind: 'faction', factionId: 'alliance', person: 'grey' }],
            },
          ],
        },
      ],
    },
    {
      id: 'origin.step-suitcase',
      kicker: "The six o'clock to {city} · the compartment",
      title: 'The suitcase',
      narrative:
        '{helper} dozes against the window before the viaduct. The suitcase sits between your feet, heavier than it should be. {helperPronoun} wakes long enough to ask what a person carries to a new town.',
      art: 'scene.train-compartment',
      portrait: 'helper',
      questions: [
        {
          id: 'origin.suitcase',
          answers: [
            {
              id: 'tools',
              text: "Tools, mostly. I'm better with my hands than my mouth.",
              echo: 'You carry tools.',
              effects: [
                { kind: 'stat', stat: 'str', value: 6 },
                { kind: 'stat', stat: 'int', value: 1 },
              ],
            },
            {
              id: 'books',
              text: 'Books. His, and a few of mine.',
              echo: 'You carry books.',
              effects: [
                { kind: 'stat', stat: 'int', value: 6 },
                { kind: 'stat', stat: 'str', value: 1 },
              ],
            },
            {
              id: 'light',
              text: 'Not much. I travel light, and I run when I have to.',
              echo: 'You travel light.',
              effects: [
                { kind: 'stat', stat: 'agi', value: 6 },
                { kind: 'stat', stat: 'str', value: 1 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'origin.step-lining',
      kicker: 'The same compartment · under the lining',
      title: 'The lining',
      narrative:
        'Under the lining, where he kept what mattered: his coat, folded small, and one thing more. Your father has been three weeks in the ground in the capital. This is what he left you to finish.',
      art: 'scene.train-compartment',
      portrait: null,
      questions: [
        {
          id: 'origin.lining',
          answers: [
            {
              id: 'ward-book',
              text: 'His ward book.',
              hint: 'Two hundred names in his hand, and the seat he lost.',
              effects: [
                { kind: 'ambition', ambitionId: 'finish-his-work' },
                { kind: 'wear', itemId: 'outfit.fathers-coat' },
              ],
            },
            {
              id: 'letter',
              text: 'His letter from prison.',
              hint: "The Mill Fire of '19, and the word innocent, underlined twice.",
              effects: [
                { kind: 'ambition', ambitionId: 'clear-his-name' },
                { kind: 'wear', itemId: 'outfit.fathers-coat' },
              ],
            },
            {
              id: 'marker',
              text: 'The marker.',
              hint: 'What he owed, to whom, and the Clearwater address.',
              effects: [
                { kind: 'ambition', ambitionId: 'settle-his-debts' },
                { kind: 'wear', itemId: 'outfit.fathers-coat' },
              ],
            },
          ],
        },
      ],
    },
  ],
  // §8.5 (review 4): helped Holm · books · his ward book (STR 8 / INT 12 / AGI 5 / CHA 5).
  reference: [
    { questionId: 'origin.platform', answerId: 'holm' },
    { questionId: 'origin.suitcase', answerId: 'books' },
    { questionId: 'origin.lining', answerId: 'ward-book' },
  ],
};
