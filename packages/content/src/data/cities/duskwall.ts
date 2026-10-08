import type { City } from '../../schemas';
import { withMissions } from '../missions/attach';
import { townHall } from './townHall';
import { duskwallMissions } from '../missions/duskwall';

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
  // Map atmosphere: clouds by day, fog by night over the map (on for the three home cities, 2 Oct 2026).
  clouds: true,
  // Slice 5 (design §2), review 4 (ADR 0076): three quarters, the Level gates of groups of places
  // (Level 1, Level 6, a later edition), read on the Places list. A home city is one map: no frames,
  // outlines or labels (the capital's only).
  quarters: [
    {
      id: 'duskwall.fortress',
      name: 'The Fortress',
    },
    {
      id: 'duskwall.pass',
      name: 'The Pass',
      opens: { level: 6 },
      blurb:
        "The road up to the frontier: the checkpoint's barrier under the peaks, the lock-up beside it, the last inn before the pass, the infirmary under the spire and the sawmill on the river bend below.",
    },
    {
      id: 'duskwall.town',
      name: 'The Town',
      opens: { edition: 'later' },
      blurb:
        "The town below the fortress, west of the market: the brewery's chimneys, the Signal Lamp, the station under its glass roof, and the square with the domed church where the town meets on Sundays.",
    },
  ],
  paper: {
    name: 'The Duskwall Sentinel',
    shortName: 'Sentinel',
    strapline: 'For the city and the frontier',
    price: '5 marks',
  },
  // Slice 3 (GDD §2): the council cycle's offset (Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4).
  // Review 3: the council sits in the tower hall on the Customs Market, below the fortress (no survey
  // pin; measured on the painting). The election screens' backdrop; review 4: the hall is a location.
  council: { offset: 3, seats: 7, hall: { locationId: 'duskwall.town-hall' } },
  locations: withMissions([
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
          verb: 'Lift',
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
      // Slice 4 (design §4.3): an HQ's tickets are for its own faction's members.
      factionId: 'vanguard',
      blurb:
        "The movement's district office, named for the searchlight on its roof. The committee sits upstairs; the volunteers gather in the yard at six.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.38, y: 0.45 },
      quarterId: 'duskwall.fortress',
      actions: [
        {
          // Review 5 (answers §19.5; review 4 §2.6, §29.2, ADR 0073): the favour, the first action.
          // Slot B of the welcome set; offered only while that order is open, once only.
          id: 'duskwall.beacon-house.favour',
          name: 'Get the stamp',
          tier: 1,
          type: 'council',
          stats: ['best'],
          energy: 10,
          givesFxp: true,
          givesOpinion: false,
          use: 'welcome',
          text: {
            success: {
              headline: 'Thursday, stamped',
              body: "The clerk reads your papers, writes the League's letter in a fair hand and pins the two together. \"Thursday,\" he says, \"and the pension office after.\" Your name goes in the League's book under the word stamp.",
            },
            partial: {
              headline: 'A form the camp never gave you',
              body: 'The clerk wants a form the camp never issued, and writes to say so. Thursday becomes next week. He enters your name in the day book and says the bed is yours till then.',
            },
          },
        },
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
          verb: 'Study',
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
          verb: 'Run',
          text: {
            success: {
              headline: 'Every entry below the wall',
              body: 'Six notes, five streets, one hour. You learn which entries connect and which end in a wall, and you learn them at a run. By the end you could do it in the dark, which is the point.',
            },
          },
        },
      ],
    },
    // Slice 5 (design §2.3, §3): the second quarter's five places, pins 7–11.
    {
      id: 'duskwall.checkpoint',
      name: 'Frontier Checkpoint',
      ref: 'the checkpoint',
      kind: 'ministry',
      blurb: 'The barrier on the mountain road where the republic ends. Lorries queue from dawn; the customs men decide what crosses and what comes back down.',
      // The survey pin (mapPins.ts), pin 7.
      map: { x: 0.8, y: 0.1 },
      quarterId: 'duskwall.pass',
      actions: [
        {
          ...canvass,
          id: 'duskwall.checkpoint.drivers',
          name: 'Talk to the lorry drivers in the queue',
          stats: ['int'],
          text: {
            success: { headline: 'Forty lorries and nowhere to go', body: 'The queue at the barrier starts at dawn and moves when the customs say so. You work the cabs with the flyer and the rates: the frontier, the timber, who signs the chits. When the barrier lifts, half the drivers have one on the dashboard.' },
            partial: { headline: 'The barrier lifts early', body: "You've done six cabs when the barrier goes up and the queue moves off in a cloud. A few flyers go through windows. One driver says he'll read it at the sawmill, waiting to unload." },
          },
        },
        {
          ...intelligence,
          energy: 4,
          id: 'duskwall.checkpoint.turned-back',
          name: 'Note which lorries are turned back',
          stats: ['int'],
          text: {
            success: { headline: 'Who comes back down', body: "A rock above the barrier and a flask. Three lorries go through stamped, two are turned back, one is waved through without a stamp by a man in a plain coat. Two plates and a name go in your notebook." },
            partial: { headline: 'A slow morning on the road', body: 'One lorry, checked, stamped and through. A customs man who smokes by the barrier and looks at the peaks. One plate worth writing down. Come back on market day.' },
          },
        },
      ],
    },
    {
      id: 'duskwall.mountain-inn',
      name: 'Mountain Inn',
      ref: 'the Mountain Inn',
      kind: 'bar',
      blurb: 'The last inn before the pass: a long table, a stove, carters and customs men on the same bench. Talk goes quiet when the door opens.',
      // The survey pin (mapPins.ts), pin 8.
      map: { x: 0.87, y: 0.04 },
      quarterId: 'duskwall.pass',
      actions: [
        {
          ...intelligence,
          energy: 3,
          id: 'duskwall.mountain-inn.listen',
          name: 'Listen in the taproom',
          stats: ['int'],
          text: {
            success: { headline: 'The road talks', body: "You buy one drink and listen to the pass. Which lorry was turned back and why, which customs man takes a drink, who's leaving for the capital. Two names and a rumour go in your notebook." },
            partial: { headline: 'A quiet night at the inn', body: "Two carters and a dog. One thing worth writing down, about a load that went up the pass at night. Come back when the frontier's shut." },
          },
        },
        {
          ...speech,
          id: 'duskwall.mountain-inn.carters',
          name: 'Speak to the carters at the long table',
          stats: ['cha', 'str'],
          text: {
            success: { headline: 'They put their mugs down', body: "The long table at supper, twenty carters who've earned the right not to listen. You keep it to the rates, the frontier and the timber price. They put their mugs down. That's the compliment on the pass." },
            partial: { headline: 'The landlord objects', body: "You get through the rates before the landlord says the table's for eating. Half the bench heard you. One carter says come back tomorrow, same bench, and bring the flyer with the numbers." },
          },
        },
        {
          ...canvass,
          id: 'duskwall.mountain-inn.regulars',
          name: "Win over the inn's regulars",
          stats: ['cha', 'int'],
          text: {
            success: { headline: 'The stove end comes round', body: 'The regulars by the stove have views on everything and nobody to tell them to. You buy one round and argue three: the frontier, the ration, who runs the checkpoint. By closing, the stove end is yours.' },
            partial: { headline: 'The stove end has heard it before', body: "They've heard every party's man and they tell you so. You get one of them nodding and another saying maybe. The landlord takes a flyer for the bar, which is more than he did last time." },
          },
        },
      ],
    },
    {
      id: 'duskwall.sawmill',
      name: 'Sawmill',
      ref: 'the sawmill',
      kind: 'factory-gate',
      blurb: "The mill on the river bend where the mountain's timber comes down. The saws run two shifts and the yard is stacked to the roof.",
      // The survey pin (mapPins.ts), pin 9.
      map: { x: 0.88, y: 0.68 },
      quarterId: 'duskwall.pass',
      actions: [
        {
          ...canvass,
          id: 'duskwall.sawmill.sawyers',
          name: 'Talk to the sawyers coming off shift',
          stats: ['str'],
          text: {
            success: { headline: 'The saws stop, and they stop', body: "You're at the yard gate when the second shift comes off, sawdust to the knees. You've the shoulders for it, so they stop. Rates, the timber price, who owns the river. A foreman takes ten flyers for the mess hut." },
            partial: { headline: 'Most of them head for the inn', body: 'The shift comes off and most of it makes for the inn without slowing. You press flyers on the stragglers. Two stop to argue the rates; one gives you his street.' },
          },
        },
        {
          ...propaganda,
          id: 'duskwall.sawmill.stacks',
          name: 'Put up posters on the timber stacks',
          stats: ['str'],
          text: {
            success: { headline: 'A poster on every stack', body: "Bucket, brush and a yard stacked to the roof. You get twelve posters up on the stacks' ends, high and straight, before the night watchman comes round. Two shifts a day will read them, and the lorries from the pass." },
            partial: { headline: "The resin won't take paste", body: 'Fresh-cut pine and paste that beads and runs. Five posters stay up; the rest peel by morning. Five is five, and one is on the yard gate.' },
          },
        },
        {
          id: 'duskwall.sawmill.stack',
          name: 'Stack timber in the yard',
          tier: 1,
          type: 'training',
          trains: 'str',
          verb: 'Stack',
          text: { success: { headline: 'An hour on the stacks', body: "The yard foreman doesn't ask which party you're with; he asks if you can get a twelve-foot plank onto the top of the stack alone. You can, by the end. Your shoulders will tell you about it tomorrow." } },
        },
      ],
    },
    {
      id: 'duskwall.lock-up',
      name: 'Lock-up',
      ref: 'the lock-up',
      kind: 'jail',
      blurb: 'The stone lock-up beside the checkpoint: three cells, a hatch, and a duty officer who has heard every story the road brings down.',
      // The survey pin (mapPins.ts), pin 10.
      map: { x: 0.76, y: 0.13 },
      quarterId: 'duskwall.pass',
      actions: [
        {
          ...intelligence,
          energy: 3,
          id: 'duskwall.lock-up.notices',
          name: 'Read the notices at the lock-up door',
          stats: ['int'],
          text: {
            success: { headline: 'Names on the board', body: "The board by the hatch lists the week's permits refused, loads seized and the men wanted at the checkpoint. Two names and a plate go in your notebook while the duty officer is at the stove." },
            partial: { headline: "Last week's sheet", body: "The board is last week's and the duty officer is watching through the hatch. One name worth writing down, from the loads seized. Come back on Monday." },
          },
        },
        {
          ...canvass,
          id: 'duskwall.lock-up.hatch',
          name: 'Talk to people waiting at the hatch',
          stats: ['int'],
          text: {
            success: { headline: 'A bench with time to talk', body: 'A driver whose load is in the shed, a woman whose son is in the cells, a carter waiting for a chit. The bench has nothing to do but listen. You keep it low and the flyers folded. By the time the hatch opens, most of the bench has one.' },
            partial: { headline: 'The duty officer has a view', body: 'The duty officer looks through the hatch and then at the door. You get two flyers out on the way to it. One driver follows you onto the road to ask about the timber rates.' },
          },
        },
      ],
    },
    {
      id: 'duskwall.infirmary',
      name: 'Infirmary',
      ref: 'the infirmary',
      kind: 'hospital',
      blurb: "The town's infirmary under the church spire, run by sisters who ask no questions. Visiting is at two; the sawmill keeps the beds full.",
      // The survey pin (mapPins.ts), pin 11.
      map: { x: 0.88, y: 0.4 },
      quarterId: 'duskwall.pass',
      actions: [
        {
          ...canvass,
          id: 'duskwall.infirmary.visitors',
          name: 'Talk to people at visiting hour',
          stats: ['cha', 'int'],
          text: {
            success: { headline: "Two o'clock under the spire", body: "Visiting is at two and the queue at the infirmary door is anxious, patient and can't leave. You work it gently: the beds, the sawmill's accidents, who pays. By the time the sister opens the door most of it has a flyer in a basket." },
            partial: { headline: 'The sister opens early', body: 'The door opens at ten to two and the queue is gone up the stairs. A few flyers go into baskets. One man says his brother lost two fingers at the mill and takes two.' },
          },
        },
        {
          id: 'duskwall.infirmary.errands',
          name: 'Run errands for the sisters',
          tier: 1,
          type: 'training',
          trains: 'agi',
          verb: 'Run',
          text: { success: { headline: 'Every stair under the spire', body: 'Six notes, four wards, one hour, and the sisters want them yesterday. You learn the back stairs, the short cut through the laundry and the door that sticks, and you learn them at a run. By the end you could do it in the dark.' } },
        },
      ],
    },
    // Review 4 (answers §11.1, ADR 0077): the council's hall, a place open at every Level; appended
    // last so no pin renumbers (answers §29 Q10). Its pin is the survey's.
    townHall({
      id: 'duskwall.town-hall',
      name: 'Town Hall',
      ref: 'the Town Hall',
      blurb:
        'A spire over a clock over a long cold façade on the Customs Market. The council sits under the flags of the republic; the rule in force hangs in a frame by the door.',
      map: { x: 0.555, y: 0.55 },
      quarterId: 'duskwall.fortress',
    }),
  ], duskwallMissions),
  // Slice 5 (design §8.1, §9.2): where the game sends a player in this city.
  services: { cells: 'duskwall.lock-up', infirmary: 'duskwall.infirmary' },
  // Slice 5 (design §10.5, §23.1 #10): whom a visitor's tier-1 tap meets here (the police on top).
  runInPool: ['street-enforcer', 'vanguard-doorman'],
};
