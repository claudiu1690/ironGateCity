import type { Opponent } from '../schemas';

/**
 * Slice 5 (docs/design/slice-5-risk.md §10.2, §10.6): the six opponents of a run-in, their numbers
 * and their six lines. The police are the republic's (`side: 'police'`); Inspector Kessler's face
 * stands for the force (his own values are slice 8's). The branch inspector won't be bought (no
 * `paid` line) and takes 10 off the player's Fight odds.
 */
export const opponents: Opponent[] = [
  {
    id: 'street-enforcer',
    label: 'A Vanguard street enforcer',
    side: 'vanguard',
    power: 22,
    agi: 10,
    wits: 10,
    payOff: 60,
    portrait: 'portrait.street-enforcer',
    lines: {
      appears: "A man in a good coat steps off the kerb and asks what party you're with. He knows.",
      won: 'He goes down on the setts and stays there, swearing. You walk on, not fast.',
      lost: 'The setts come up to meet you. The last thing you see is his boots.',
      ran: "You're round the corner before he's off the kerb. He shouts your party's name after you.",
      talked: '"Wrong man," you say, and mean it, and he almost believes you. He lets you go, slowly.',
      paid: 'He takes the notes without counting and steps back onto the kerb. "Didn\'t see you."',
    },
  },
  {
    id: 'vanguard-doorman',
    label: 'The doorman at Beacon House',
    side: 'vanguard',
    power: 35,
    agi: 9,
    wits: 12,
    payOff: 150,
    portrait: 'portrait.vanguard-doorman',
    lines: {
      appears: 'The doorman fills the doorway. He has your face and he has all evening.',
      won: "He sits down in the doorway, surprised, and lets you past. He'll remember.",
      lost: 'He puts you down on the step without effort and goes back to his door.',
      ran: "You take the yard wall he's too big for. He doesn't bother to follow.",
      talked: 'You say a name from the committee and he thinks about it long enough for you to leave.',
      paid: "He takes the notes and opens the door for you, which is worse than if he hadn't.",
    },
  },
  {
    id: 'strike-picket',
    label: 'A Collective strike picket',
    side: 'collective',
    power: 25,
    agi: 12,
    wits: 11,
    payOff: 80,
    portrait: 'portrait.strike-picket',
    lines: {
      appears: 'Three men with armbands come off the gate. "You\'re not from the branch."',
      won: 'The big one goes down and the other two decide the gate matters more. You walk.',
      lost: 'They put you in the gutter by the gate and go back to their brazier.',
      ran: "You're through the gate and gone before the third one has his cap on.",
      talked: '"I\'m from the capital," you say, with the right accent, and the armbands let you through.',
      paid: 'The big one pockets it. "For the strike fund." They turn back to the brazier.',
    },
  },
  {
    id: 'branch-inspector',
    label: 'A Collective branch inspector',
    side: 'collective',
    power: 17,
    agi: 11,
    wits: 16,
    payOff: null,
    fightPct: -10,
    portrait: 'portrait.branch-inspector',
    lines: {
      appears: "A small man with a book steps out of a doorway. He's written your face down already.",
      won: "The book goes in the gutter and so does he. He'll write that down too.",
      lost: "He doesn't hit hard, but he hits where it counts, and he had the book ready.",
      ran: 'You leave him with his book open and the pencil still moving.',
      talked:
        "You give him a name from his own branch and watch him look for it. By the time he can't find it, you're gone.",
    },
  },
  {
    id: 'party-thug',
    label: 'An Alliance party heavy',
    side: 'alliance',
    power: 19,
    agi: 10,
    wits: 10,
    payOff: 50,
    portrait: 'portrait.party-thug',
    lines: {
      appears: 'A big man with a party badge and a quiet voice asks you to step into the yard.',
      won: 'He goes down on the cobbles, surprised, and asks you to leave, which you do.',
      lost: "He's quiet about it, and thorough. You wake on the cobbles.",
      ran: "You're over the yard wall before he's finished his sentence.",
      talked: '"I\'m looking for Mr Grey\'s man," you say, and he points you out of the yard.',
      paid: 'He takes it with a nod and a word about not making a habit of it.',
    },
  },
  {
    id: 'city-police',
    label: 'A constable of the city police',
    side: 'police',
    power: 30,
    agi: 12,
    wits: 14,
    payOff: 300,
    portrait: 'portrait.kessler',
    lines: {
      appears: 'A constable steps under the lamp and asks for your name. He has a notebook and a whistle.',
      won: "He goes down and the whistle goes with him. You've a minute before the rest come.",
      lost: 'The whistle goes before you do, and so do you. The cells.',
      ran: "You're two streets away before the whistle. He has your coat, not your face.",
      talked: '"On my way home, constable," and the right accent, and he lets you go with a look.',
      paid: 'The notebook closes. "Mind how you go." Three hundred marks is the going rate.',
    },
  },
];
