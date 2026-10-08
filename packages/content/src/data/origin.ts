import type { OriginInput } from '../schemas';

/**
 * The origin (GDD §7.1, review 5: *Coming home*; docs/design/review-5-answers.md §19, which replaces
 * review 4's *The Last Train In* and keeps its ids and mechanics, ADR 0073): three beats of one choice
 * each. Beat 1, the counter: the problem you chase is your party (a row selects, the button commits).
 * Beat 2, the kitbag: +6 to one stat, +1 to another. Beat 3, the post: the Ambition, and the demob
 * suit worn from here on. Effects are the rules' closed DSL; the echo lines show at the top of the
 * next beat. `{helper}`, `{helperPronoun}` and `{city}` are the person you went with and their town.
 */
export const origin: OriginInput = {
  steps: [
    {
      id: 'origin.step-platform',
      kicker: 'Irongate · the demobilisation office · the second morning home',
      title: 'The counter',
      narrative:
        'The demobilisation office, the second morning home. You reach the counter at eleven with a kitbag and your papers, and the clerk gives you three pieces of news without looking up. The mill is sold. The stamp is missing. The flat is gone.',
      art: 'scene.demob-office',
      portrait: null,
      note: "One of these today. The other two will keep, or they won't. Whoever you go with, you go with: a Faction Reset token is the only way back.",
      questions: [
        {
          id: 'origin.platform',
          answers: [
            {
              id: 'holm',
              text: "\"Your mill's sold, but Coalport's rehires on Monday, union men first. Put your name on my sheet now and you've a place at the gate and a bed at the union hostel tonight. The six o'clock to Coalport.\"",
              lines: [
                'Petra Holm · union organiser · at the bench by the door, signing up men off the trains',
                'Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence',
              ],
              portrait: 'portrait.holm',
              confirm: "Go for the work · the six o'clock to Coalport",
              echo: 'You went for the work.',
              effects: [{ kind: 'faction', factionId: 'collective', person: 'holm' }],
            },
            {
              id: 'stahl',
              text: "\"No stamp, no pay, and this office takes six weeks. The League in Duskwall sees to its men: the stamp by Thursday, the pension after, and a bed at the League's hostel till then. The six o'clock; I'll put you on the list.\"",
              lines: [
                "Viktor Stahl · the Duskwall League's welfare desk · stamps, pensions and a bed for men coming home",
                'Iron Vanguard · order, discipline and a strong hand · +3 Strength',
              ],
              portrait: 'portrait.stahl',
              confirm: "Go for the stamp · the six o'clock to Duskwall",
              echo: 'You went for the stamp.',
              effects: [{ kind: 'faction', factionId: 'vanguard', person: 'stahl' }],
            },
            {
              id: 'grey',
              text: "\"A requisition can be appealed, and Ashford's court hears housing cases this week. I need your discharge papers, the flat's address and your signature today; the Rooms file on Thursday. The six o'clock to Ashford.\"",
              lines: [
                'Thomas Grey · legal-aid lawyer · at the end of the counter, taking housing cases',
                'Civic Alliance · elections, courts and a free press · +3 Intelligence',
              ],
              portrait: 'portrait.grey',
              confirm: "Go for the flat · the six o'clock to Ashford",
              echo: 'You went for the flat.',
              effects: [{ kind: 'faction', factionId: 'alliance', person: 'grey' }],
            },
          ],
        },
      ],
    },
    {
      id: 'origin.step-suitcase',
      kicker: "The six o'clock to {city} · the compartment",
      title: 'The kitbag',
      narrative:
        "The six o'clock, the kitbag on the rack. Everything you own is in it, and it still isn't heavy. {helper} asks what a person brings home from four years.",
      art: 'scene.train-compartment',
      portrait: 'helper',
      questions: [
        {
          id: 'origin.suitcase',
          answers: [
            {
              id: 'tools',
              text: "Tools. I kept the workshop's kit when the workshop went.",
              echo: 'You brought tools.',
              effects: [
                { kind: 'stat', stat: 'str', value: 6 },
                { kind: 'stat', stat: 'int', value: 1 },
              ],
            },
            {
              id: 'books',
              text: 'Books, from the camp library. They let us keep those.',
              echo: 'You brought books.',
              effects: [
                { kind: 'stat', stat: 'int', value: 6 },
                { kind: 'stat', stat: 'str', value: 1 },
              ],
            },
            {
              id: 'light',
              text: 'The boots I walked out in. Two hundred miles, and they still fit.',
              echo: 'You brought the boots.',
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
      kicker: "The same compartment · the office's post",
      title: 'The post',
      narrative:
        "The office held post in your name since the autumn: three envelopes, handed over with the bad news, which you open on the train. A list, an order, a torn page. One of them is why you'll stay.",
      art: 'scene.train-compartment',
      portrait: null,
      questions: [
        {
          id: 'origin.lining',
          answers: [
            {
              id: 'ward-book',
              text: "The unit's list.",
              hint: "Forty names in your hand, and the town's memorial being cut without them.",
              effects: [
                { kind: 'ambition', ambitionId: 'finish-his-work' },
                { kind: 'wear', itemId: 'outfit.fathers-coat' },
              ],
            },
            {
              id: 'letter',
              text: 'The requisition order.',
              hint: 'The flat, the date, and a signature you can read.',
              effects: [
                { kind: 'ambition', ambitionId: 'clear-his-name' },
                { kind: 'wear', itemId: 'outfit.fathers-coat' },
              ],
            },
            {
              id: 'marker',
              text: 'The ration page.',
              hint: "A year of rations drawn in your family's name after they were gone. Somebody ate them.",
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
  // §8.5 (review 4, kept by review 5 §19.6): Holm · books · the unit's list (STR 8 / INT 12 / AGI 5 / CHA 5).
  reference: [
    { questionId: 'origin.platform', answerId: 'holm' },
    { questionId: 'origin.suitcase', answerId: 'books' },
    { questionId: 'origin.lining', answerId: 'ward-book' },
  ],
};
