import type { City } from '../../schemas';

/**
 * Duskwall, home city of the Vanguard (GDD §14.1, §14.11). Locations, actions and text:
 * docs/design/slice-2-cities.md §1 (generated from its tables, then checked by the content tests).
 * Rewards are not data: they follow from the type and Energy at the §5.5 rates.
 *
 * Content policy: docs/design/content-policy-review.md §4. Ids keep their original words
 * (`garrison-gate`, `quartermaster-market`, `muster`, `drill`) because ids are never shown and
 * characters' jobs, orders and logs reference them; only the display text changed.
 */

const canvass = { tier: 1, type: 'canvass', energy: 10, givesFxp: true, givesOpinion: true } as const;
const speech = { tier: 1, type: 'speech', energy: 12, givesFxp: true, givesOpinion: true } as const;
const propaganda = { tier: 1, type: 'propaganda', energy: 8, givesFxp: true, givesOpinion: true } as const;
const intelligence = { tier: 1, type: 'intelligence', givesFxp: false, givesOpinion: false } as const;

export const duskwall: City = {
  id: 'duskwall',
  name: 'Duskwall',
  role: 'home',
  homeFactionId: 'vanguard',
  // §14.11 baseline, pinned in slice 2 (cities §1).
  baselineOpinion: { vanguard: 70, collective: 6, alliance: 9, neutral: 15 },
  map: { day: 'map.duskwall.day', night: 'map.duskwall.night' },
  // Maps v3 §2: a quarter is a frame on the city's one picture (its pins' box + 0.06, clamped). Only
  // the first quarter until quarter 2 is built (city-quarters.md §8.1 names).
  quarters: [
    { id: 'duskwall.fortress', name: 'The Fortress', frame: { x0: 0.07, y0: 0.06, x1: 0.65, y1: 0.91 } },
  ],
  paper: {
    name: 'The Duskwall Sentinel',
    shortName: 'Sentinel',
    strapline: 'For the city and the frontier',
    price: '5 marks',
  },
  // Slice 3 (GDD §2): the council cycle's offset (Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4).
  council: { offset: 3, seats: 7 },
  locations: [
    {
      id: 'duskwall.garrison-gate',
      name: 'Fortress Gate',
      ref: 'the Fortress Gate',
      kind: 'ministry',
      blurb:
        'The gatehouse of the old fortress, now the frontier customs house. The shift changes at four, and the whole town sets its watch by it.',
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.59, y: 0.37 },
      quarterId: 'duskwall.fortress',
      actions: [
        {
          ...canvass,
          id: 'duskwall.garrison-gate.canvass',
          name: 'Talk to the customs men coming off shift',
          stats: ['str'],
          text: {
            success: {
              headline: 'They stop for one of their own',
              body: "The customs men come off at four, boots loud on the cobbles. You've the shoulders for it, so they stop. Ration, rents, the checkpoint queues: you keep it short. A senior man takes ten flyers for the office.",
            },
            partial: {
              headline: 'Most of them go past',
              body: "The night shift goes in and the day shift heads for the canteen without slowing. You press flyers on the stragglers. One asks if the movement can do anything about the pay. You say you'll ask.",
            },
          },
        },
        {
          ...speech,
          id: 'duskwall.garrison-gate.speech',
          name: 'Speak from the gate steps',
          stats: ['cha', 'str'],
          text: {
            success: {
              headline: 'The square goes quiet',
              body: 'You take the top step under the arch and pitch it to the back of the square. Order on the streets, bread at a fixed price, the frontier shut. Nobody heckles here. When you finish, the chief of customs nods once.',
            },
            partial: {
              headline: "The four o'clock bell cuts you off",
              body: 'You get through prices and the checkpoint queues before the bell goes for the shift and the square empties at a trot. A few townsfolk stay to hear the end. The chief looks at his watch.',
            },
          },
        },
        {
          id: 'duskwall.garrison-gate.drill',
          name: 'Lift crates in the customs store',
          tier: 1,
          type: 'training',
          trains: 'str',
          text: {
            success: {
              headline: 'An hour in the bonded store',
              body: "The storeman doesn't ask which party you're with; he asks if you can get a crate of tinned beef onto the top rack. You can, by the end. Your shoulders will tell you about it tomorrow.",
            },
          },
        },
      ],
    },
    {
      id: 'duskwall.quartermaster-market',
      name: 'Customs Market',
      ref: 'the Customs Market',
      kind: 'market',
      blurb:
        "Tents and trestles under the walls, where the customs auctions what it seizes at the frontier and the town buys what it can't get elsewhere.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.44, y: 0.53 },
      quarterId: 'duskwall.fortress',
      actions: [
        {
          ...canvass,
          id: 'duskwall.quartermaster-market.canvass',
          name: 'Talk to people in the ration queue',
          stats: ['int'],
          text: {
            success: {
              headline: 'The queue has nowhere to go',
              body: 'Sixty people and one tent with sugar in it. You work the line with the price list and the flyer. By the time the clerk shouts next, half the queue knows what the movement would do about the ration.',
            },
            partial: {
              headline: 'The sugar runs out early',
              body: "Three people in, the clerk drops the flap and the queue turns into an argument. A few flyers go into shopping bags. One woman folds hers small and says she'll read it when her husband's out.",
            },
          },
        },
        {
          ...propaganda,
          id: 'duskwall.quartermaster-market.leaflets',
          name: 'Hand out flyers between the tents',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Quick hands, empty bag',
              body: 'You work the tent rows at a trot, a flyer into every basket before the owner looks up. The bag is empty in ten minutes and the market inspector never sees you.',
            },
            partial: {
              headline: 'The inspector sees you',
              body: "Half the bag is gone when the market inspector plants himself in the row and asks for your permit. You leave by the boot tent, slower than you'd like. The flyers you handed out are still out there.",
            },
          },
        },
        {
          ...speech,
          id: 'duskwall.quartermaster-market.speech',
          name: 'Speak from the lorry bed',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A crowd between the tents',
              body: "You climb onto the tailboard of a parked lorry and give it to them. Prices, the ration, who queues and who doesn't. The stallholders heckle, the crowd laughs, and by the end the laughs are on your side.",
            },
            partial: {
              headline: 'The lorry has to leave',
              body: "You've a fair crowd until the driver climbs into the cab and you're speaking from a moving platform. You finish on the ground for the tea stall and an inspector who looks bored. The tea stall gives you a nod.",
            },
          },
        },
      ],
    },
    {
      id: 'duskwall.beacon-house',
      name: 'Beacon House',
      kind: 'faction-hq',
      blurb:
        "The movement's district office, named for the searchlight on its roof. The committee sits upstairs; the volunteers gather in the yard at six.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.38, y: 0.45 },
      quarterId: 'duskwall.fortress',
      actions: [
        {
          id: 'duskwall.beacon-house.committee',
          name: 'Go to the district meeting',
          tier: 1,
          type: 'council',
          stats: ['best'],
          energy: 10,
          givesFxp: true,
          givesOpinion: false,
          text: {
            success: {
              headline: 'Minutes taken, proposal carried',
              body: 'Coffee, a wall map stuck with pins, and a chairman who likes short answers. The committee wants the street lists redone by street and you say how. Your name goes in the minutes. In this house, that counts.',
            },
            partial: {
              headline: 'A long meeting',
              body: 'Two hours on the street lists and the price of paper. You get one point in before the chairman moves on. The organiser marks you present, which is what matters this week.',
            },
          },
        },
        {
          ...propaganda,
          id: 'duskwall.beacon-house.duplicator',
          name: 'Print five hundred flyers',
          stats: ['int'],
          text: {
            success: {
              headline: 'Five hundred copies, still wet',
              body: 'The stencil holds and the drum turns. Five hundred flyers in an hour, stacked for the morning runners. Your hands are purple to the wrist and the office smells of spirit.',
            },
            partial: {
              headline: 'The stencil tears',
              body: 'The stencil tears at copy two hundred and the rest come out ghosted. Half a stack goes out; the other half goes in the stove. The organiser shows you how to cut the next one.',
            },
          },
        },
        {
          ...speech,
          id: 'duskwall.beacon-house.muster',
          name: 'Speak to the evening volunteers',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The yard listens',
              body: "Forty volunteers in the yard at six, caps off, waiting to be told. You tell them: which streets tonight, which doors, what to say at each. Nobody asks a question. That's the compliment here.",
            },
            partial: {
              headline: 'Half the yard is thinking about supper',
              body: 'You get the street list out before the back rows start shuffling. The front row writes it down, which is something. The organiser says: shorter, next time.',
            },
          },
        },
      ],
    },
    {
      id: 'duskwall.archives',
      name: 'State Archives',
      kind: 'library',
      blurb:
        "The republic's records, kept in a stone quadrangle the movement now holds the keys to. Every ration book, lease and conviction in the district is in here somewhere.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.58, y: 0.12 },
      quarterId: 'duskwall.fortress',
      actions: [
        {
          id: 'duskwall.archives.reading-room',
          name: 'Study in the reading room',
          tier: 1,
          type: 'training',
          trains: 'int',
          text: {
            success: {
              headline: 'An evening with the registers',
              body: "The reading room is cold and the light is bad, but the shelves hold everything from the frontier acts to the grain returns of 1913. You leave knowing the argument better than the man who'll make it against you.",
            },
          },
        },
        {
          ...intelligence,
          id: 'duskwall.archives.registers',
          name: 'Look through the records',
          stats: ['int'],
          energy: 4,
          text: {
            success: {
              headline: 'Names, dates, addresses',
              body: "You sign for a ledger and read it like a paper. Who moved into the new terrace by the fortress last spring, who sold a lease in a hurry, who's drawing two ration books. It goes in your notebook for later.",
            },
            partial: {
              headline: 'The wrong volume',
              body: 'The clerk brings the wrong year and takes an hour to find the right one. You get one address worth writing down before closing. Not nothing.',
            },
          },
        },
        {
          ...canvass,
          id: 'duskwall.archives.clerks',
          name: 'Talk to the clerks at closing time',
          stats: ['int'],
          text: {
            success: {
              headline: 'The steps at five',
              body: 'The clerks come down the steps at five in a body, ink on their cuffs. You know the wage scales better than they do, so they listen. One asks for three flyers: for the office, he says.',
            },
            partial: {
              headline: 'Umbrellas up',
              body: "It's raining at five and the clerks go down the steps at a run. You get flyers to the ones waiting for the tram. One says the office already reads the Sentinel. Come back when it's dry.",
            },
          },
        },
      ],
    },
    {
      id: 'duskwall.goods-yard',
      name: 'Goods Yard',
      ref: 'the Goods Yard',
      kind: 'station',
      blurb:
        'The sidings below the fortress wall, where the frontier freight is broken down and the coal comes in. The loaders eat at noon with their backs to the wagons.',
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.13, y: 0.85 },
      quarterId: 'duskwall.fortress',
      actions: [
        {
          ...canvass,
          id: 'duskwall.goods-yard.loaders',
          name: 'Talk to the loaders at the break',
          stats: ['str'],
          text: {
            success: {
              headline: 'They make room on the buffer',
              body: "The loaders eat on the buffers with their backs to the wind. You've the hands for the work and it shows, so they make room. By the time the whistle goes, the gang has agreed to send two men to Beacon House.",
            },
            partial: {
              headline: 'Bread and silence',
              body: "The gang eats and lets you talk. A couple of nods, one argument about the coal ration that goes nowhere. The ganger takes a flyer for later. Nobody gets up when the whistle goes, which is the loaders' way of saying maybe.",
            },
          },
        },
        {
          ...propaganda,
          id: 'duskwall.goods-yard.posters',
          name: 'Put up posters on the wagons',
          stats: ['str'],
          text: {
            success: {
              headline: "A train's length of paper",
              body: 'Bucket, brush, and a rake of empty wagons waiting for the morning. You get twelve posters up straight and high, one to a wagon. Every station between here and the capital will read them by noon.',
            },
            partial: {
              headline: "The paste won't hold",
              body: "The wind off the mountains is against you and the paste won't take on the frosted boards. Five posters stay up; the rest go under the wheels. Five is five.",
            },
          },
        },
        {
          ...intelligence,
          id: 'duskwall.goods-yard.manifests',
          name: 'Note which wagons carry what',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'Wagons, firms, times',
              body: "You sit on a bollard with a paper and a pencil and watch the checker's hut. Three wagons for one firm, two of them sealed, one that leaves without a stamp. It goes in your notebook for later.",
            },
            partial: {
              headline: 'Nothing much moves',
              body: 'An hour on the bollard and one wagon, which is checked, stamped and shunted. Your notebook has a firm and a time. Not nothing.',
            },
          },
        },
      ],
    },
    {
      id: 'duskwall.rampart-row',
      name: 'Rampart Row',
      kind: 'street',
      blurb:
        "Railwaymen's terraces along the line below the walls. Washing across the street, children on the steps, and doors that open for the right accent.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.22, y: 0.38 },
      quarterId: 'duskwall.fortress',
      actions: [
        {
          ...canvass,
          id: 'duskwall.rampart-row.canvass',
          name: 'Knock on doors',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The kettle goes on',
              body: "Sixty doors below the wall. Most open a crack; a dozen open wide, and at three the kettle goes on. Railwaymen's wives talk about the curfew and the price of coal. You leave with a list of names.",
            },
            partial: {
              headline: 'Doors on the chain',
              body: "It's tea-time and the doors stay on the chain. You get the flyer through the gap and a word with the ones on the step. One man says he's heard the movement's speeches from the wall already. Come back after the shift.",
            },
          },
        },
        {
          ...propaganda,
          id: 'duskwall.rampart-row.chalk',
          name: 'Chalk the slogan on the end wall',
          stats: ['agi'],
          text: {
            success: {
              headline: 'White letters on the gable end',
              body: "The gable end at the bottom of the row is the biggest wall on the line. You get ORDER AND BREAD up in fair capitals, the movement's name beneath it, before the rent-man's boy comes round the corner. Then you're away down the entry.",
            },
            partial: {
              headline: 'Half a slogan',
              body: 'You get as far as ORDER AND before a window goes up and someone shouts about their wall. You finish the last word small and leave by the back entry. It reads, just about.',
            },
          },
        },
        {
          id: 'duskwall.rampart-row.run',
          name: 'Run messages around the streets',
          tier: 1,
          type: 'training',
          trains: 'agi',
          text: {
            success: {
              headline: 'Every entry below the wall',
              body: 'Six notes, five streets, one hour. You learn which entries connect and which end in a wall, and you learn them at a run. By the end you could do it in the dark, which is the point.',
            },
          },
        },
      ],
    },
  ],
};
