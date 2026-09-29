import type { OriginInput } from '../schemas';

/**
 * The origin story (GDD §7.2, docs/design/slice-2-onboarding.md §2 and §5): three steps of two of
 * the father's questions, then the street. Effects are the rules' closed DSL; no number is ever
 * shown to the player. Echo lines (§2, designer answer §13 Q1) follow the first question of a step.
 */
export const origin: OriginInput = {
  steps: [
    {
      id: 'origin.step-room',
      kicker: 'Irongate · a rented room above the tram depot · night',
      title: 'The room',
      narrative:
        'Your father has the bed by the window and not much else. The trams have stopped. He wants to talk, and there is no one else he can talk to.',
      art: 'scene.origin-deathbed',
      portrait: 'portrait.father',
      questions: [
        {
          id: 'origin.summer',
          prompt: 'Do you remember the summer you were ten? What did you do every day?',
          answers: [
            {
              id: 'a',
              text: 'Fished the river with you.',
              echo: 'You went fishing with him.',
              effects: [{ kind: 'stat', stat: 'agi', value: 3 }],
            },
            {
              id: 'b',
              text: 'Worked the factory floor after school.',
              echo: 'You worked the factory floor.',
              effects: [{ kind: 'stat', stat: 'str', value: 3 }],
            },
            {
              id: 'c',
              text: 'Sat in the library till they threw me out.',
              echo: 'You sat in the library.',
              effects: [{ kind: 'stat', stat: 'int', value: 3 }],
            },
          ],
        },
        {
          id: 'origin.trouble',
          prompt: 'And when the street kids got into trouble. What did you do?',
          answers: [
            {
              id: 'a',
              text: 'Led them in. Someone had to.',
              effects: [{ kind: 'stat', stat: 'str', value: 2 }],
            },
            { id: 'b', text: 'Talked them out of it.', effects: [{ kind: 'chaBase', value: 2 }] },
            {
              id: 'c',
              text: 'Watched from the corner, and learned.',
              effects: [{ kind: 'stat', stat: 'int', value: 2 }],
            },
          ],
        },
      ],
    },
    {
      id: 'origin.step-talent',
      kicker: 'The same room · later',
      title: 'The talent',
      narrative: 'He coughs, and waves you back down when you stand. The lamp needs oil. He is not finished.',
      art: 'scene.origin-deathbed',
      portrait: 'portrait.father',
      questions: [
        {
          id: 'origin.talent',
          prompt: 'You always had a talent. What was it?',
          answers: [
            {
              id: 'a',
              text: 'I could outrun anyone on the block.',
              echo: 'You could outrun anyone.',
              effects: [{ kind: 'stat', stat: 'agi', value: 3 }],
            },
            {
              id: 'b',
              text: 'I could fix anything with my hands.',
              echo: 'You could fix anything.',
              effects: [
                { kind: 'stat', stat: 'str', value: 3 },
                { kind: 'stat', stat: 'int', value: 1 },
              ],
            },
            {
              id: 'c',
              text: 'I could read people like a book.',
              echo: 'You could read people.',
              effects: [
                { kind: 'chaBase', value: 1 },
                { kind: 'stat', stat: 'int', value: 3 },
              ],
            },
          ],
        },
        {
          id: 'origin.coat',
          prompt: "Take my coat. It's all I have left.",
          answers: [
            {
              id: 'a',
              text: 'Take it, and say nothing.',
              hint: 'A good wool coat.',
              effects: [{ kind: 'wear', itemId: 'outfit.fathers-coat' }],
            },
            {
              id: 'b',
              text: "No. I'll earn my own.",
              hint: 'He tells you where the tin is.',
              effects: [{ kind: 'iron', value: 150 }],
            },
            {
              id: 'c',
              text: 'Take it, and promise to bring it back.',
              hint: 'His coat, and your word.',
              effects: [
                { kind: 'wear', itemId: 'outfit.fathers-coat-promised' },
                { kind: 'chaBase', value: 1 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'origin.step-promise',
      kicker: 'The same room · before the first tram',
      title: 'The promise',
      narrative:
        'Near the end he holds your wrist harder than a dying man should. There is something he has carried for twenty years, and now it is yours.',
      art: 'scene.origin-deathbed',
      portrait: 'portrait.father',
      questions: [
        {
          id: 'origin.promise',
          prompt: 'Promise me one thing…',
          answers: [
            {
              id: 'a',
              text: "…I'll clear your name.",
              hint: "The Mill Fire of '19. He didn't set it.",
              echo: 'You promised to clear his name.',
              effects: [{ kind: 'ambition', ambitionId: 'clear-his-name' }],
            },
            {
              id: 'b',
              text: "…I'll settle what you owed.",
              hint: 'The Clearwater people will come for it.',
              echo: 'You promised to settle what he owed.',
              effects: [{ kind: 'ambition', ambitionId: 'settle-his-debts' }],
            },
            {
              id: 'c',
              text: "…I'll finish what you started.",
              hint: 'He lost his seat, and everything with it.',
              echo: 'You promised to finish what he started.',
              effects: [{ kind: 'ambition', ambitionId: 'finish-his-work' }],
            },
          ],
        },
        {
          id: 'origin.wish',
          prompt: 'And you. What do you want, when all this is over?',
          answers: [
            {
              id: 'a',
              text: 'Order. Somebody has to keep the streets quiet.',
              effects: [{ kind: 'wish', factionId: 'vanguard', fxp: 50 }],
            },
            {
              id: 'b',
              text: 'Justice. The workers deserve better.',
              effects: [{ kind: 'wish', factionId: 'collective', fxp: 50 }],
            },
            {
              id: 'c',
              text: 'Truth. Let the people decide.',
              effects: [{ kind: 'wish', factionId: 'alliance', fxp: 50 }],
            },
          ],
        },
      ],
    },
  ],
  street: {
    kicker: 'Irongate · morning',
    title: 'He dies before the first tram.',
    narrative:
      'You come down into the street with his suitcase. A newsboy is shouting the Herald: the government has fallen, and every party in the republic is recruiting.',
    art: 'scene.origin-street',
    note: 'Permanent. A Faction Reset token is the only way back.',
  },
  // §8.5, onboarding §2.4: library · watched · fix anything · refuse the coat · Finish His Work · Justice.
  reference: [
    { questionId: 'origin.summer', answerId: 'c' },
    { questionId: 'origin.trouble', answerId: 'c' },
    { questionId: 'origin.talent', answerId: 'b' },
    { questionId: 'origin.coat', answerId: 'b' },
    { questionId: 'origin.promise', answerId: 'c' },
    { questionId: 'origin.wish', answerId: 'b' },
  ],
};
