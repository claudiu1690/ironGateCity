import type { City } from '../../schemas';

/**
 * Ashford, home city of the Alliance (GDD §14.1, §14.11). Locations, actions and text:
 * docs/design/slice-2-cities.md §2 (generated from its tables, then checked by the content tests).
 * Rewards are not data: they follow from the type and Energy at the §5.5 rates.
 */

const canvass = { tier: 1, type: 'canvass', energy: 10, givesFxp: true, givesOpinion: true } as const;
const speech = { tier: 1, type: 'speech', energy: 12, givesFxp: true, givesOpinion: true } as const;
const propaganda = { tier: 1, type: 'propaganda', energy: 8, givesFxp: true, givesOpinion: true } as const;
const intelligence = { tier: 1, type: 'intelligence', givesFxp: false, givesOpinion: false } as const;

export const ashford: City = {
  id: 'ashford',
  name: 'Ashford',
  role: 'home',
  homeFactionId: 'alliance',
  // §14.11 baseline, pinned in slice 2 (cities §2).
  baselineOpinion: { vanguard: 6, collective: 9, alliance: 70, neutral: 15 },
  map: { day: 'map.ashford.day', night: 'map.ashford.night' },
  paper: {
    name: 'The Ashford Gazette',
    shortName: 'Gazette',
    strapline: 'Fair report, free comment',
    price: '6 marks',
  },
  // Slice 3 (GDD §2): the council cycle's offset (Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4).
  council: { offset: 1, seats: 7 },
  locations: [
    {
      id: 'ashford.gazette-house',
      name: 'Gazette House',
      kind: 'press',
      blurb:
        "The Ashford Gazette's offices and print room, the biggest building in the old town. The presses run at four, and the evening edition is on the streets by six.",
      map: { x: 0.18, y: 0.16 },
      actions: [
        {
          ...canvass,
          id: 'ashford.gazette-house.print-room',
          name: 'Talk to the printers coming off shift',
          stats: ['int'],
          text: {
            success: {
              headline: 'The presses stop, and they listen',
              body: "The print-room shift comes off at four with ink to the elbow. They read for a living, so you don't waste words: rents, the tram fare, the licensing bill. A compositor takes ten flyers for the stone.",
            },
            partial: {
              headline: 'Most of them head for the tram',
              body: 'The shift comes off in a hurry and most of it makes for the tram. You press flyers on the ones who slow down. Two stop to argue the licensing bill; one gives you his street. A start.',
            },
          },
        },
        {
          ...propaganda,
          id: 'ashford.gazette-house.evening-run',
          name: 'Slip flyers into the evening paper',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Every stand by six',
              body: 'A bundle under each arm and the Alliance flyer folded inside every copy. Bridge Street, the station, the college gate, all before the church clock strikes six. Nobody asks whose flyer it is.',
            },
            partial: {
              headline: 'The bundle splits',
              body: 'The string goes on Bridge Street and half the edition ends up in the gutter. You save what you can and get it to two stands out of four. The flyers inside the dry ones are still out there.',
            },
          },
        },
        {
          ...intelligence,
          id: 'ashford.gazette-house.wires',
          name: 'Read the news as it comes in',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'The wire room at midnight',
              body: "The night editor lets you sit by the wire machine if you keep quiet. Irongate, Clearwater, the frontier: who's meeting whom, which bill is stuck in committee. Two names go in your notebook.",
            },
            partial: {
              headline: 'A slow night',
              body: 'The machine chatters about grain prices and a regatta. You pick up one thing worth writing down before the night editor wants his chair back. Come back on a sitting night.',
            },
          },
        },
        {
          id: 'ashford.gazette-house.newsprint',
          name: 'Unload the paper lorry',
          tier: 1,
          type: 'training',
          trains: 'str',
          text: {
            success: {
              headline: 'Twenty rolls, one lorry',
              body: "The newsprint comes on a lorry at dawn in rolls that need two men. You take one end and don't ask to be paid. Your back will tell you about it tomorrow; that's the point.",
            },
          },
        },
      ],
    },
    {
      id: 'ashford.assembly-rooms',
      name: 'Assembly Rooms',
      kind: 'faction-hq',
      blurb:
        "The Alliance's rooms above the old concert hall. Committee on the first floor, the duplicator on the landing, the founders of the republic on the stairs.",
      map: { x: 0.33, y: 0.11 },
      actions: [
        {
          id: 'ashford.assembly-rooms.committee',
          name: 'Go to the meeting',
          tier: 1,
          type: 'council',
          stats: ['best'],
          energy: 10,
          givesFxp: true,
          givesOpinion: false,
          text: {
            success: {
              headline: 'Minutes taken, proposal carried',
              body: 'Tea, a street map on the piano, and a chairman who believes in procedure. The committee wants the street returns redone by street and you say how. Your name goes in the minutes. In these rooms, that counts.',
            },
            partial: {
              headline: 'A long meeting',
              body: 'Two hours on the street returns and a point of order about the biscuits. You get one word in before the chairman moves on. The agent marks you present, which is what matters this week.',
            },
          },
        },
        {
          ...propaganda,
          id: 'ashford.assembly-rooms.duplicator',
          name: 'Print five hundred flyers',
          stats: ['int'],
          text: {
            success: {
              headline: 'Five hundred copies, still wet',
              body: 'The stencil holds and the drum turns. Five hundred flyers in an hour, stacked for the morning runners. Your hands are purple to the wrist and the landing smells of spirit.',
            },
            partial: {
              headline: 'The stencil tears',
              body: 'The stencil tears at copy two hundred and the rest come out ghosted. Half a stack goes out; the other half goes in the grate. The agent shows you how to cut the next one.',
            },
          },
        },
        {
          ...canvass,
          id: 'ashford.assembly-rooms.letters',
          name: 'Write to old members',
          stats: ['int'],
          text: {
            success: {
              headline: 'Forty letters, forty stamps',
              body: 'The card index has three hundred names who paid a subscription once. You pick forty and write to each by hand: what the Alliance is doing about the thing they cared about. Two reply by return, with cheques.',
            },
            partial: {
              headline: 'The index is out of date',
              body: "Half the addresses come back marked gone away. You write to the rest and get one reply, from a woman who says her husband died but she'll come to the meeting herself.",
            },
          },
        },
      ],
    },
    {
      id: 'ashford.university',
      name: 'University Quad',
      kind: 'university',
      blurb:
        "The college quadrangle under the dome. Lectures end at eleven and three, and the whole town's argument spills across the grass with the students.",
      map: { x: 0.59, y: 0.3 },
      actions: [
        {
          ...canvass,
          id: 'ashford.university.students',
          name: 'Talk to the students between lectures',
          stats: ['int'],
          text: {
            success: {
              headline: 'They argue, then they listen',
              body: "The eleven o'clock crowd comes out arguing already. You give them something to argue about: the licensing bill, the franchise, rents in the old town. Half take a flyer; a dozen take two. One asks where the Rooms are.",
            },
            partial: {
              headline: 'The coffee house wins',
              body: "The crowd is across the quad and into the coffee house before you've said franchise. You catch the ones who stop to light a pipe. A law student wants to argue clause four. You let him.",
            },
          },
        },
        {
          ...speech,
          id: 'ashford.university.union-debate',
          name: 'Speak in the student debate',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The proposal carries',
              body: 'The Debating Union takes anyone who can hold the floor for ten minutes. You hold it for twelve: the republic, the courts, the right to be wrong in print. The house votes and the proposal carries. A don asks your name.',
            },
            partial: {
              headline: 'Points of order',
              body: 'You get six minutes in before the other side starts raising points of order and the chair enjoys them. The proposal is lost by four votes. Two undergraduates ask for a flyer on the way out.',
            },
          },
        },
        {
          id: 'ashford.university.reading-room',
          name: 'Study in the college reading room',
          tier: 1,
          type: 'training',
          trains: 'int',
          text: {
            success: {
              headline: 'An evening under the dome',
              body: "The reading room stays open till ten and nobody asks for a college card after six. Blue books, the debates, the electoral acts. You leave knowing the argument better than the man who'll make it against you.",
            },
          },
        },
      ],
    },
    {
      id: 'ashford.courts',
      name: 'The Courts',
      kind: 'court',
      blurb:
        'The county courts on the square. The public queue starts at eight, the gallery fills by ten, and a speech from the steps carries to the tram stop.',
      map: { x: 0.78, y: 0.2 },
      actions: [
        {
          ...intelligence,
          id: 'ashford.courts.gallery',
          name: 'Sit in the public gallery',
          stats: ['int'],
          energy: 4,
          text: {
            success: {
              headline: 'Names from the dock',
              body: "Two hours in the gallery with a pencil. A brewery foreman up for short measure, a landlord for a fire escape that wasn't, a clerk who won't say who paid him. Three names go in your notebook.",
            },
            partial: {
              headline: 'A dull list',
              body: 'Debt, debt, a dog and a drunk. You pick up one name worth writing down before the court rises for lunch. Come back on a sessions day.',
            },
          },
        },
        {
          ...canvass,
          id: 'ashford.courts.queue',
          name: 'Talk to people in the court queue',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A captive audience',
              body: "The queue for the gallery is bored, cold and can't leave. You work it with the flyer and the case list. Half of them have a grievance with a landlord already; by the door, most have the Alliance's line on it too.",
            },
            partial: {
              headline: 'The doors open early',
              body: "The usher opens up at half past nine and the queue becomes a crowd on the stairs. A few flyers go into coat pockets. One old man says he'll read it in the gallery, which is more than most.",
            },
          },
        },
        {
          ...speech,
          id: 'ashford.courts.steps',
          name: 'Speak from the court steps',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The square stops',
              body: 'The top step at the lunch adjournment, with the tram stop for a gallery. Fair trials, fair rents, a press that prints what it finds. A barrister heckles and you quote his own case back at him. The square laughs on your side.',
            },
            partial: {
              headline: 'The tram takes half of them',
              body: "You've a decent crowd until the number 2 pulls in and takes most of it. You finish for the ushers and a constable who looks bored. The usher gives you a nod. It's a start.",
            },
          },
        },
      ],
    },
    {
      id: 'ashford.bridge-street',
      name: 'Bridge Street',
      kind: 'market',
      blurb:
        'Stalls and cafés along the river between the two bridges. Bread, fish, secondhand books, and every opinion in Ashford, out loud and over coffee.',
      map: { x: 0.2, y: 0.45 },
      actions: [
        {
          ...canvass,
          id: 'ashford.bridge-street.cafes',
          name: 'Talk to people at the café tables',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A chair at every table',
              body: 'The pavement tables are full by ten. You work them one by one, a chair borrowed at each. Rents, the tram fare, the licensing bill. By the third café the waiters know your name, and one has taken a flyer for the kitchen.',
            },
            partial: {
              headline: 'Nobody wants company',
              body: "It's a reading morning and the tables are hidden behind the Gazette. You get a word at three of them and a flyer under the saucer at the rest. One man lowers his paper to argue clause four. That's a start.",
            },
          },
        },
        {
          ...propaganda,
          id: 'ashford.bridge-street.leaflets',
          name: 'Hand out flyers between the stalls',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Quick hands, empty bag',
              body: 'You work the stalls at a trot, a flyer into every basket before its owner has noticed. The bag is empty in ten minutes and the market beadle never sees you.',
            },
            partial: {
              headline: 'The beadle sees you',
              body: "Half the bag is gone when the market beadle plants himself in the aisle and asks about your permit. You leave by the bookstall, slower than you'd like. The flyers you handed out are still out there.",
            },
          },
        },
        {
          ...speech,
          id: 'ashford.bridge-street.speech',
          name: 'Speak from the bridge steps',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A crowd on the bridge',
              body: "You take the steps at the bridge end with the river behind you. Prices, rents, who votes and who can't. The fishwives heckle, the crowd laughs, and by the end the laughs are on your side.",
            },
            partial: {
              headline: 'The rain takes half of them',
              body: "You've a decent crowd until the rain comes off the river and takes most of it under the awnings. You finish for the bookseller and a constable who looks bored. The bookseller gives you a nod.",
            },
          },
        },
      ],
    },
    {
      id: 'ashford.weavers-row',
      name: "Weavers' Row",
      kind: 'street',
      blurb:
        "The old weavers' tenements behind the station, four floors round a yard. Washing lines, children, and landlords who never come themselves.",
      map: { x: 0.69, y: 0.69 },
      actions: [
        {
          ...canvass,
          id: 'ashford.weavers-row.canvass',
          name: 'Knock on doors',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The kettle goes on',
              body: 'Sixty doors up four flights. Most open a crack; a dozen open wide, and at three of them the kettle goes on. The fire escape, the rent, the landlord nobody has met. You leave with a list of names and a case for the Courts.',
            },
            partial: {
              headline: 'Doors on the chain',
              body: "It's tea-time and the doors stay on the chain. You get the flyer through the gap and a word with the ones on the landing. One woman says her son's at the college already. Come back on Sunday.",
            },
          },
        },
        {
          ...propaganda,
          id: 'ashford.weavers-row.bills',
          name: 'Put up posters on the yard fences',
          stats: ['str'],
          text: {
            success: {
              headline: "A yard's worth of paper",
              body: "Bucket, brush, and the fences round the builder's yard. You get twelve posters up straight and high enough that nobody's tearing them down without a ladder. Every window on four floors will read them.",
            },
            partial: {
              headline: "The paste won't hold",
              body: "The rain is against you and the paste won't take on the wet boards. Five posters stay up; the rest go into the yard. Five is five.",
            },
          },
        },
        {
          id: 'ashford.weavers-row.run',
          name: 'Run messages up and down the stairs',
          tier: 1,
          type: 'training',
          trains: 'agi',
          text: {
            success: {
              headline: 'Every stair in the block',
              body: 'Six notes, four stairwells, one hour. You learn which landings connect and which end in a locked door, and you learn them at a run. By the end you could do it in the dark.',
            },
          },
        },
      ],
    },
  ],
};
