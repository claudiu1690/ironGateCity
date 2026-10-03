import type { ContentInput } from '../schemas';

/**
 * Slice 4: the seven journey cards (docs/design/slice-4-battleground.md §3; §19 Q2 for the parcel's
 * Iron). Checks are §8.4 at difficulty 10 and never fail; opinion goes to the destination (Station &
 * Market for the capital); points go to the destination's first Issue. `{destination}` and `{issue}`
 * are resolved on the server. The first journey always draws `jev.passenger`.
 */
export const journeyEvents: ContentInput['journeyEvents'] = [
  {
    id: 'jev.passenger',
    title: 'A talkative passenger',
    first: true,
    setup:
      'The man opposite has a Herald, a flask and no intention of reading. "Capital, is it? Five districts, three parties, and a tram that goes round in circles. Which are you?" He has already guessed.',
    choices: [
      {
        id: 'talk',
        title: 'Talk politics with him',
        detail: 'Charisma and Intelligence · +6 Party XP · opinion +0.03 in {destination}',
        stats: ['cha', 'int'],
        success: {
          rewards: { fxp: 6, opinion: 0.03 },
          text: {
            headline: "He'll think about it",
            body: 'By the second tunnel he has your flyer folded in the Herald and is arguing your side with the woman by the door. "I\'m not saying you\'re right," he says at the station. "I\'m saying I\'ll think about it."',
          },
        },
        partial: {
          rewards: { fxp: 3, opinion: 0.015 },
          text: {
            headline: 'He talks you into a corner',
            body: 'He knows the tram fares to the halfpenny and the names of every councillor since the war. You hold your own for a stop and a half. He takes the flyer anyway, for the crossword on the back.',
          },
        },
      },
      {
        id: 'listen',
        title: 'Let him talk',
        detail: '+14 XP',
        success: {
          rewards: { xp: 14 },
          text: {
            headline: 'Five districts, explained',
            body: 'You let him run. Who holds the Hill, which paper the Quays read, why nothing ever passes in the Government Quarter. By the last bridge you know the capital better than most people who live in it.',
          },
        },
      },
    ],
    ignore: 'You nod at the window until he gives up. You arrive as you left.',
  },
  {
    id: 'jev.leaflets',
    title: 'Flyers on the seats',
    setup:
      "Somebody has been through the carriage before you: a rival's flyer on every seat, still warm from the press. Your own bag has forty in it and the conductor is two carriages away.",
    choices: [
      {
        id: 'swap',
        title: 'Swap them for yours',
        detail: 'Agility · opinion +0.05 in {destination} · +5 Party XP',
        stats: ['agi'],
        success: {
          rewards: { opinion: 0.05, fxp: 5 },
          text: {
            headline: 'Forty seats, forty flyers',
            body: 'You work the carriage between stations, theirs into your bag and yours onto the seat. Nobody looks up from a newspaper. The train pulls in with a different opinion on every seat.',
          },
        },
        partial: {
          rewards: { opinion: 0.025, fxp: 2 },
          text: {
            headline: 'Half the carriage',
            body: "You get to the middle door before the conductor comes through and have to sit down with a lap full of somebody else's paper. Half the seats are yours. Half is half.",
          },
        },
      },
      {
        id: 'read',
        title: 'Read theirs',
        detail: '+14 XP',
        success: {
          rewards: { xp: 14 },
          text: {
            headline: 'Know the other side',
            body: "You read it twice. It's not bad: short sentences, one promise, a name at the bottom. You'll write a better one. You leave it on the seat for the next passenger to argue with.",
          },
        },
      },
    ],
    ignore: 'You leave them where they are. Paper is only paper.',
  },
  {
    id: 'jev.parcel',
    title: 'The parcel',
    setup:
      'The man in the grey coat folds his paper. "Someone will meet the train and ask for this. Fifty marks now, fifty when it\'s collected. Don\'t open it." The parcel is heavier than it looks.',
    choices: [
      {
        id: 'carry',
        title: 'Carry it',
        detail: '+50 Iron now · Agility at the barrier for 50 more',
        stats: ['agi'],
        success: {
          rewards: { iron: 100 },
          text: {
            headline: 'A boy in a cloth cap',
            body: 'You walk it through the barrier under your coat. On the platform a boy asks for "Uncle Tomas\'s shoes" and hands you the other fifty. The parcel was heavier than shoes. You don\'t ask.',
          },
        },
        partial: {
          rewards: { iron: 50 },
          text: {
            headline: 'The inspector has a good eye',
            body: "The station inspector at the barrier asks what's under your coat, and it's easier to give it up than to explain. Fifty marks for carrying a parcel to a barrier. The man in the grey coat is nowhere.",
          },
        },
      },
      {
        id: 'guard',
        title: 'Hand it to the guard',
        detail: '+14 XP',
        success: {
          rewards: { xp: 14 },
          text: {
            headline: 'The guard writes something down',
            body: "The guard takes it without a word and writes in his book. You get a long look at the man in grey as he leaves at the next stop, hat down, not hurrying. You'll know him again.",
          },
        },
      },
      {
        id: 'open',
        title: 'Open it when he steps out',
        detail: 'Intelligence · +5 points on {issue} for your party · +14 XP',
        stats: ['int'],
        success: {
          rewards: { momentum: 5, xp: 14 },
          text: {
            headline: 'Pamphlets',
            body: "Pamphlets, printed cheap, about {issue}, in a rival's name and worse than they'd ever put their name to. Somebody wants the argument to turn ugly. You take one for the branch and tie the string the way it was.",
          },
        },
        partial: {
          rewards: { xp: 7 },
          text: {
            headline: 'String',
            body: "The knot is a sailor's and the man is back before you're through it. You've seen the corner of a printed sheet and nothing else. He takes the parcel back with a look and gets off at the halt.",
          },
        },
      },
    ],
    ignore: 'You sleep through it. The parcel and the man leave at the halt.',
  },
  {
    id: 'jev.cards',
    title: 'The card school',
    setup:
      'Three commercial travellers and a folded newspaper for a table. "Fourth hand? Small stakes." The one dealing has done this before. So have you, once or twice.',
    choices: [
      {
        id: 'sit',
        title: 'Sit in',
        detail: 'Stake 20 Iron · Intelligence · win 40',
        stats: ['int'],
        cost: { iron: 20 },
        success: {
          rewards: { iron: 40 },
          text: {
            headline: 'A good hand at the right stop',
            body: "You lose the first two and remember the third. By the viaduct the dealer has stopped smiling and you are twenty marks up. You stand at the next stop, while it's still friendly.",
          },
        },
        partial: {
          rewards: { iron: 20 },
          text: {
            headline: 'Honours even',
            body: "Two up, two down, and the dealer calls it at the viaduct before anybody's luck changes. You get your stake back and a card school's nod. Another day.",
          },
        },
      },
      {
        id: 'watch',
        title: 'Watch the game',
        detail: '+7 XP',
        success: {
          rewards: { xp: 7 },
          text: {
            headline: "How it's done",
            body: "You watch the dealer's hands instead of the cards. Nothing crooked, just fast, and a way of talking that keeps the other two from counting. Worth knowing.",
          },
        },
      },
    ],
    ignore: 'You keep your money in your pocket. The dealer wins, as dealers do.',
  },
  {
    id: 'jev.reporter',
    title: 'The reporter',
    setup:
      "The young woman with the satchel is from the Herald and out of copy. \"You're a party person. Give me a line on {issue} and I'll give you a name in tomorrow's paper.\" Her pencil is already moving.",
    choices: [
      {
        id: 'line',
        title: 'Give her a line',
        detail: 'Charisma and Intelligence · +10 points on {issue} · your name in the Herald',
        stats: ['cha', 'int'],
        success: {
          rewards: { momentum: 10, quoted: true },
          text: {
            headline: 'Quoted',
            body: "You give her one sentence and she writes it down whole, which almost never happens. \"Tomorrow's edition, page two, if the sub doesn't cut it.\" He doesn't.",
          },
        },
        partial: {
          rewards: { momentum: 5 },
          text: {
            headline: 'Paraphrased',
            body: "You give her three sentences and she keeps the weakest half of one. It's roughly what you meant. The branch's name is spelled right, which is the main thing.",
          },
        },
      },
      {
        id: 'flyer',
        title: 'Give her the flyer',
        detail: '+3 Party XP',
        success: {
          rewards: { fxp: 3 },
          text: {
            headline: 'For the file',
            body: '"No comment, but this says it better." She reads it on the spot and puts it in the satchel. Reporters keep everything. That one will turn up.',
          },
        },
      },
    ],
    ignore: "You say you're not a party person. She doesn't believe you, and moves on.",
  },
  {
    id: 'jev.signal',
    title: 'The signal stop',
    setup:
      'The train stops at a halt outside the city and stays stopped. "Signal," says the guard, which means nobody knows. The waiting room is full of people going the same way as you.',
    choices: [
      {
        id: 'work',
        title: 'Work the waiting room',
        detail: 'Intelligence · opinion +0.05 in {destination} · +6 Party XP',
        stats: ['int'],
        success: {
          rewards: { opinion: 0.05, fxp: 6 },
          text: {
            headline: 'A captive audience',
            body: "Thirty people, one stove and nowhere to go. You work the benches with the flyer and the timetable. By the time the signal drops, the waiting room has an opinion it didn't have before.",
          },
        },
        partial: {
          rewards: { opinion: 0.025, fxp: 3 },
          text: {
            headline: 'The signal drops early',
            body: "You've done one bench when the guard shouts and the room empties for the train. A few flyers go into coat pockets. One woman says she'll read it if the train's slow, which it is.",
          },
        },
      },
      {
        id: 'doze',
        title: 'Doze',
        detail: '+10 Rested',
        success: {
          rewards: { rested: 10 },
          text: {
            headline: 'A quarter of an hour',
            body: "You put your hat over your eyes and let the halt happen without you. The guard wakes you when the signal drops. Fifteen minutes you didn't know you needed.",
          },
        },
      },
    ],
    ignore: 'You stare at the signal until it changes. The train goes on.',
  },
  {
    id: 'jev.boy',
    title: 'The boy without a ticket',
    setup:
      "The boy across the aisle has no ticket and the inspector is one carriage away. He isn't asking anyone. He's looking at the door and doing sums.",
    choices: [
      {
        id: 'pay',
        title: 'Pay his fare',
        detail: '10 Iron · opinion +0.02 in {destination} · +3 Party XP',
        cost: { iron: 10 },
        success: {
          rewards: { opinion: 0.02, fxp: 3 },
          text: {
            headline: 'His whole stair will hear',
            body: "Ten marks to the inspector and a name to the boy: your party's. He lives on a stair with twelve families and a mother who talks. By Sunday the whole stair knows which party paid.",
          },
        },
      },
      {
        id: 'show',
        title: 'Show him the lavatory',
        detail: 'Agility · +14 XP',
        stats: ['agi'],
        success: {
          rewards: { xp: 14 },
          text: {
            headline: 'The oldest trick on the line',
            body: "You give him the nod and the timing, and he's behind the lavatory door as the inspector reaches your seat. Two stations on he's out, unseen, and off at the halt with a grin.",
          },
        },
        partial: {
          rewards: {},
          text: {
            headline: 'The inspector knows the trick',
            body: 'The inspector tries the door on his way through, as inspectors do. The boy is put off at the halt with a warning and no fare. You keep your seat and your face straight.',
          },
        },
      },
    ],
    ignore: 'You read your paper. The inspector does his job.',
  },
];
