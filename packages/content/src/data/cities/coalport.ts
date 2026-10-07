import type { City } from '../../schemas';
import { withMissions } from '../missions/attach';
import { townHall } from './townHall';
import { coalportMissions } from '../missions/coalport';

/**
 * Coalport, home city of the Collective (GDD §14.1, §14.11). Locations, actions and text:
 * docs/design/slice-1-content.md §1–§2 (the Mill Gate canvass is the slice-0 text, unchanged).
 * Rewards are not data: they follow from the type and Energy at the §5.5 rates.
 */

const canvass = { tier: 1, type: 'canvass', energy: 10, givesFxp: true, givesOpinion: true } as const;
const speech = { tier: 1, type: 'speech', energy: 12, givesFxp: true, givesOpinion: true } as const;
const propaganda = { tier: 1, type: 'propaganda', energy: 8, givesFxp: true, givesOpinion: true } as const;
const intelligence = { tier: 1, type: 'intelligence', givesFxp: false, givesOpinion: false } as const;

export const coalport: City = {
  id: 'coalport',
  name: 'Coalport',
  role: 'home',
  homeFactionId: 'collective',
  // §14.11 baseline, pinned for Coalport.
  baselineOpinion: { vanguard: 9, collective: 70, alliance: 6, neutral: 15 },
  map: { day: 'map.coalport.day', night: 'map.coalport.night' },
  // Map atmosphere: clouds by day, fog by night over the map (on for the three home cities, 2 Oct 2026).
  clouds: true,
  // Slice 5 (design §2), review 4 (ADR 0076): three quarters, the Level gates of groups of places
  // (Level 1, Level 6, a later edition), read on the Places list. A home city is one map: no frames,
  // outlines or labels (the capital's only).
  quarters: [
    {
      id: 'coalport.mill',
      name: 'The Mill',
      blurb:
        'The mill and the men who work it, the market below the gate, the union hall, the terraces above and the quay at the bottom of the town. Brick, soot, the hooter three times a day.',
    },
    {
      id: 'coalport.harbour',
      name: 'The Harbour',
      opens: { level: 6 },
      blurb:
        'Where the basin opens to the sea: the slipway, the customs house, the infirmary, the police, and across the water by ferry the far bank with its fish market and its lower town that votes late.',
    },
    {
      id: 'coalport.sidings',
      name: 'The Sidings',
      opens: { edition: 'later' },
      blurb:
        "The way in and out of town: the station where the line comes in, the coal yards where the town's coal is weighed, the tram sheds, and, up in the old town, St Barbara's church by the canal.",
    },
  ],
  paper: {
    name: 'The Coalport Clarion',
    shortName: 'Clarion',
    strapline: 'The voice of the mill and the quays',
    price: '5 marks',
  },
  // Slice 3 (GDD §2): the council cycle's offset (Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4).
  // Review 3: the council sits in the domed hall on the river between the Union Hall and the Mill
  // Gate (measured on the painting). The election screens' backdrop; review 4: the hall is a location.
  council: { offset: 2, seats: 7, hall: { locationId: 'coalport.town-hall' } },
  locations: withMissions([
    {
      id: 'coalport.mill-gate',
      name: 'Mill Gate',
      ref: 'the Mill Gate',
      kind: 'factory-gate',
      blurb:
        'The gates of the Coalport Steel Mill. Three shifts a day, and every one of them walks past here.',
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.75, y: 0.2 },
      quarterId: 'coalport.mill',
      actions: [
        {
          ...canvass,
          id: 'coalport.mill-gate.canvass',
          name: 'Talk to the workers coming off shift',
          stats: ['int'],
          text: {
            success: {
              headline: 'The whistle goes, and they stop',
              body: "You're at the gate before the shift comes off. Coal dust, tired faces, no time for speeches. But the flyers go hand to hand, and a foreman says come back Thursday. That's how a street is won.",
            },
            partial: {
              headline: 'Most of them walk past',
              body: 'The shift comes off in a hurry and most of it heads straight for the tram. You press flyers on the ones who slow down. Two stop to argue; one gives you his street. A start, not a win.',
            },
          },
        },
        {
          ...speech,
          id: 'coalport.mill-gate.speech',
          name: 'Speak from the gate steps',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'Two hundred faces, and they listen',
              body: "You climb the gate steps as the hooters go. Wages, the coal ration, the foreman's book: you keep it short and you keep it theirs. When you come down, a woman from the rolling mill shakes your hand and asks when the next meeting is.",
            },
            partial: {
              headline: 'The hooter drowns the end of it',
              body: 'You get through wages and the ration before the second hooter goes and the crowd breaks for the trams. A knot of lads at the back stays to argue, which is something. Next time, start earlier.',
            },
          },
        },
      ],
    },
    {
      id: 'coalport.market-row',
      name: 'Market Row',
      kind: 'market',
      blurb:
        'Striped awnings between the mill and the quay. Bread, fish, bootlaces, and every opinion in Coalport, out loud.',
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.4, y: 0.44 },
      quarterId: 'coalport.mill',
      actions: [
        {
          ...canvass,
          id: 'coalport.market-row.canvass',
          name: 'Talk to people in the bread queue',
          stats: ['int'],
          text: {
            success: {
              headline: 'The queue has time to talk',
              body: "Forty people and one baker's window. You work the line with the price list in one hand and the flyer in the other. By the time the shutters go up, half the queue knows what the Collective would do about the flour ration.",
            },
            partial: {
              headline: 'The loaves come out early',
              body: "You're three people in when the shutters go up and the queue becomes a scrum. A few flyers go into shopping bags. One old man folds his carefully and says he'll read it after his tea.",
            },
          },
        },
        {
          ...speech,
          id: 'coalport.market-row.speech',
          name: 'Speak from the market cross',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A crowd at the cross',
              body: "You get up on the plinth between the fish stall and the tram stop. Prices, rents, who pays and who doesn't. The stallholders heckle, the crowd laughs, and by the end the laughs are on your side.",
            },
            partial: {
              headline: 'The tram takes half of them',
              body: "You've a decent crowd until the number 4 pulls in and takes most of it. You finish for the stallholders and a policeman who looks bored. The fishmonger gives you a nod. It's a start.",
            },
          },
        },
        {
          ...propaganda,
          id: 'coalport.market-row.leaflets',
          name: 'Hand out flyers between the stalls',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Quick hands, empty bag',
              body: 'You work the aisles at a trot, a flyer into every basket before its owner has noticed. The bag is empty in ten minutes and the market inspector never sees you.',
            },
            partial: {
              headline: 'The inspector sees you',
              body: "Half the bag is gone when the market inspector plants himself in the aisle and asks about your permit. You leave by the fish stall, slower than you'd like. The flyers you handed out are still out there.",
            },
          },
        },
      ],
    },
    {
      id: 'coalport.union-hall',
      name: 'Union Hall',
      kind: 'faction-hq',
      // Slice 4 (design §4.3): an HQ's tickets are for its own faction's members.
      factionId: 'collective',
      blurb:
        "The Collective's hall: columns out front, smoke and a mimeograph inside. The branch committee sits in the back room.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.42, y: 0.35 },
      quarterId: 'coalport.mill',
      actions: [
        {
          id: 'coalport.union-hall.committee',
          name: 'Go to the branch meeting',
          tier: 1,
          type: 'council',
          stats: ['best'],
          energy: 10,
          givesFxp: true,
          givesOpinion: false,
          text: {
            success: {
              headline: 'Minutes taken, proposal carried',
              body: "Smoke, coffee, and a mimeograph that never stops. The committee wants the street lists redone by district and you're the one who says how. Your name goes in the minutes. In this hall, that counts.",
            },
            partial: {
              headline: 'A long meeting',
              body: 'Two hours on the street lists and the price of paper. You get one point in before the chair moves on. The secretary marks you present, which is what matters this week.',
            },
          },
        },
        {
          ...propaganda,
          id: 'coalport.union-hall.mimeograph',
          name: 'Print five hundred flyers',
          stats: ['int'],
          text: {
            success: {
              headline: 'Five hundred copies, still wet',
              body: 'The stencil holds and the drum turns. Five hundred flyers in an hour, stacked for the morning runners. Your hands are purple to the wrist and the hall smells of spirit.',
            },
            partial: {
              headline: 'The stencil tears',
              body: 'The stencil tears at copy two hundred and the rest of the run comes out ghosted. Half a stack goes out; the other half goes in the stove. The secretary shows you how to cut the next one.',
            },
          },
        },
        {
          id: 'coalport.union-hall.reading-room',
          name: 'Study in the reading room',
          tier: 1,
          type: 'training',
          trains: 'int',
          verb: 'Study',
          text: {
            success: {
              headline: 'An evening with the pamphlets',
              body: "The reading room is cold and the light is bad, but the shelves have everything from the factory acts to the price of coal in 1913. You leave knowing the argument better than the man who'll make it against you.",
            },
          },
        },
      ],
    },
    {
      id: 'coalport.terraces',
      name: 'Foundry Row',
      kind: 'street',
      blurb:
        'Row on row of brick terraces above the mill. Washing lines, children, and doors that open for the right accent.',
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.65, y: 0.08 },
      quarterId: 'coalport.mill',
      actions: [
        {
          ...canvass,
          id: 'coalport.terraces.canvass',
          name: 'Knock on doors',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The kettle goes on',
              body: 'Sixty doors in the long terrace. Most open a crack; a dozen open wide, and at three of them the kettle goes on. You leave with a list of names and the name of the man who collects the rent.',
            },
            partial: {
              headline: 'Doors on the chain',
              body: "It's tea-time and the doors stay on the chain. You get the flyer through the gap and a word with the ones who stand on the step. One woman says her husband's in the Union already. Come back after the shift.",
            },
          },
        },
        {
          ...propaganda,
          id: 'coalport.terraces.chalk',
          name: 'Chalk the slogan on the end wall',
          stats: ['agi'],
          text: {
            success: {
              headline: 'White letters on the gable end',
              body: "The gable end at the top of the terrace is the biggest wall in the district. You get the whole slogan up in fair capitals before the rent-man's boy comes round the corner, and you're away down the entry.",
            },
            partial: {
              headline: 'Half a slogan',
              body: 'You get as far as BREAD AND before a window goes up and someone shouts about their wall. You finish the last word small and leave by the back entry. It reads, just about.',
            },
          },
        },
        {
          id: 'coalport.terraces.run',
          name: 'Run messages around the streets',
          tier: 1,
          type: 'training',
          trains: 'agi',
          verb: 'Run',
          text: {
            success: {
              headline: 'Every entry in the district',
              body: 'Six notes, five streets, one hour. You learn which entries connect and which end in a wall, and you learn them at a run. By the end you could do it in the dark.',
            },
          },
        },
      ],
    },
    {
      id: 'coalport.quays',
      name: 'Harbour Quays',
      kind: 'docks',
      blurb:
        'Warehouses, cranes and the coal barges. The dockers eat on the quay with their backs to the wind.',
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.71, y: 0.43 },
      quarterId: 'coalport.mill',
      actions: [
        {
          ...canvass,
          id: 'coalport.quays.noon-break',
          name: 'Talk to the dockers at the noon break',
          stats: ['str'],
          text: {
            success: {
              headline: 'They make room on the bollard',
              body: "The dockers eat on the quay with their backs to the wind. You've the hands for the work and it shows, so they make room on the bollard. By the time the whistle goes, the gang has agreed to send two men to the hall.",
            },
            partial: {
              headline: 'Bread and silence',
              body: "The gang eats and lets you talk. A couple of nods, one argument about the coal ration that goes nowhere. The ganger takes a flyer for later. Nobody gets up when the whistle goes, which is the dockers' way of saying maybe.",
            },
          },
        },
        {
          ...propaganda,
          id: 'coalport.quays.posters',
          name: 'Put up posters on the warehouse walls',
          stats: ['str'],
          text: {
            success: {
              headline: 'A hundred yards of brick',
              body: "Bucket, brush, and a long stretch of warehouse wall. You get twelve posters up straight and high enough that nobody's tearing them down without a ladder. Every barge coming up the river will read them.",
            },
            partial: {
              headline: "The paste won't hold",
              body: "The wind off the river is against you and the paste won't hold on the wet brick. Five posters stay up; the rest go into the water. Five is five.",
            },
          },
        },
        {
          id: 'coalport.quays.haul',
          name: 'Lift cargo with the dockers',
          tier: 1,
          type: 'training',
          trains: 'str',
          verb: 'Lift',
          text: {
            success: {
              headline: 'A shift on the hooks',
              body: "You take a hook and a place on the gang and don't ask to be paid. Sacks, crates, a crate that needs four. Your shoulders will tell you about it tomorrow; that's the point.",
            },
          },
        },
        {
          ...intelligence,
          id: 'coalport.quays.customs',
          name: 'Watch the customs shed',
          stats: ['int'],
          energy: 4,
          text: {
            success: {
              headline: 'Lorries, times, names',
              body: "You sit on a bollard with a paper and a pencil and watch the customs shed. Three lorries, two of them with the same firm's name, one that leaves without stopping. It goes in your notebook for later.",
            },
            partial: {
              headline: 'Nothing much moves',
              body: 'An hour on the bollard and one lorry, which stops, gets stamped and goes. Your notebook has a name and a time. Not nothing.',
            },
          },
        },
      ],
    },
    {
      id: 'coalport.anchor',
      name: 'The Anchor',
      kind: 'bar',
      blurb:
        "Dockers' bar at the bottom of the town. The barman hears everything and sells about half of it.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.62, y: 0.56 },
      quarterId: 'coalport.mill',
      actions: [
        {
          ...canvass,
          id: 'coalport.anchor.regulars',
          name: 'Win over the regulars',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A table by the stove',
              body: "The regulars have a table by the stove and, once you've listened for a while, a place at it. You talk rents and wages and let them talk longer. By closing time two of them have asked where the branch meets.",
            },
            partial: {
              headline: 'Talked over',
              body: 'The table by the stove is louder than you are. You get a word in between the dominoes and a song. One docker wants a flyer; another wants to argue about 1919. You leave the argument where you found it.',
            },
          },
        },
        {
          ...intelligence,
          id: 'coalport.anchor.listen',
          name: 'Listen at the bar',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'The barman hears everything',
              body: "You nurse a half and let the bar talk. Who's hiring at the yard, whose rent went up, which foreman is taking a cut. The barman catches your eye and adds a name.",
            },
            partial: {
              headline: 'A quiet night',
              body: 'Dominoes, the wireless, and two men arguing about a horse. You pick up one thing worth writing down. Come back on a Friday.',
            },
          },
        },
        {
          ...speech,
          id: 'coalport.anchor.songs',
          name: 'Lead the singing',
          stats: ['cha', 'str'],
          text: {
            success: {
              headline: 'The whole bar joins in',
              body: 'Somebody starts the old mill song and you take it up loud enough to carry. By the second verse the whole bar is in, dockers and all. Nobody remembers who started it, and everybody remembers the words.',
            },
            partial: {
              headline: 'Two verses',
              body: 'You get two verses out before the domino table wins. A few voices come in on the chorus. The barman turns the wireless down, which from him is applause.',
            },
          },
        },
      ],
    },
    // Slice 5 (design §2.3, §3): the second quarter's five places, pins 7–11.
    {
      id: 'coalport.shipyard',
      name: 'The Shipyard',
      ref: 'the Shipyard',
      kind: 'docks',
      blurb: 'A hull on the stocks and two hundred men on the staging. When the yard stops, the town hears it.',
      // The survey pin (mapPins.ts), pin 7.
      map: { x: 0.86, y: 0.46 },
      quarterId: 'coalport.harbour',
      actions: [
        {
          ...canvass,
          id: 'coalport.shipyard.riveters',
          name: 'Talk to the riveters at the yard gate',
          stats: ['str'],
          text: {
            success: { headline: 'They stop for one who can swing a hammer', body: "The riveters come off the staging at five with their ears still ringing. You've the shoulders for it, so they stop. Rates, the launch, who owns the slipway. A chargehand takes ten flyers for the staging hut." },
            partial: { headline: 'Most of them head for the ferry', body: "The shift comes off in a body and most of it makes for the ferry stage. You press flyers on the stragglers. Two stop to argue the rates; one says his brother's a member and takes two." },
          },
        },
        {
          ...propaganda,
          id: 'coalport.shipyard.fence',
          name: 'Put up posters on the slipway fence',
          stats: ['str'],
          text: {
            success: { headline: 'A hundred yards of fence', body: 'Bucket, brush and the long fence along the slipway. Twelve posters up straight and high, one to every gap in the boards. Two hundred men will read them at five, and the ferry queue after.' },
            partial: { headline: "The paste won't take on wet boards", body: 'Spray off the basin and paste that runs. Five posters stay up; the rest slide into the mud. Five is five, and one is on the yard gate.' },
          },
        },
      ],
    },
    {
      id: 'coalport.customs-house',
      name: 'Customs House',
      ref: 'the Customs House',
      kind: 'ministry',
      blurb: "The republic's clock on the mole, and its inspectors in the sheds. Every crate in Coalport passes their stamp, or doesn't.",
      // The survey pin (mapPins.ts), pin 8.
      map: { x: 0.66, y: 0.66 },
      quarterId: 'coalport.harbour',
      actions: [
        {
          ...canvass,
          id: 'coalport.customs-house.permits',
          name: 'Talk to people in the permits queue',
          stats: ['int'],
          text: {
            success: { headline: "A queue that can't leave", body: "Forty people, one hatch, and the republic's clock above them taking its time. You work the line with the flyer and the rates sheet. By the time the hatch opens, half the queue knows what your party would do about the shilling." },
            partial: { headline: 'The hatch opens early', body: "You're three people in when the hatch goes up and the queue becomes a crush at the counter. A few flyers go into coat pockets. A carter folds his and says he'll read it on the mole, waiting." },
          },
        },
        {
          ...intelligence,
          energy: 4,
          id: 'coalport.customs-house.sheds',
          name: 'Watch who comes out of the sheds',
          stats: ['int'],
          text: {
            success: { headline: 'The sheds keep hours of their own', body: "A bollard, a paper you don't read, and the shed doors in view. Who comes out with a stamp, who comes out without one, which lorry leaves by the back. Two names and a plate go in your notebook." },
            partial: { headline: 'A quiet afternoon on the mole', body: 'One lorry, stamped and gone. A clerk who smokes by the door and says nothing to anyone. One name worth writing down. Come back when a ship is in.' },
          },
        },
      ],
    },
    {
      id: 'coalport.infirmary',
      name: 'The Infirmary',
      ref: 'the Infirmary',
      kind: 'hospital',
      blurb: "Glass roof, iron beds, a matron who has seen every kind of accident the mill makes. Visiting hour is two o'clock.",
      // The survey pin (mapPins.ts), pin 9.
      map: { x: 0.17, y: 0.5 },
      quarterId: 'coalport.harbour',
      actions: [
        {
          ...canvass,
          id: 'coalport.infirmary.visitors',
          name: 'Talk to people at visiting hour',
          stats: ['cha', 'int'],
          text: {
            success: { headline: "Two o'clock, forty visitors", body: "Visiting is at two and the queue at the gate is anxious, patient and can't leave. You work it gently: the beds, the mill's accidents, who pays. By the time the porter opens the gate most of it has a flyer in a basket." },
            partial: { headline: 'The porter opens early', body: "The gate opens at ten to two and the queue is gone up the steps. A few flyers go into baskets. One man says his wife's on the women's ward and takes two." },
          },
        },
        {
          id: 'coalport.infirmary.porters',
          name: 'Carry for the porters',
          tier: 1,
          type: 'training',
          trains: 'str',
          verb: 'Carry',
          text: { success: { headline: 'Stretchers up three flights', body: "The porters don't ask which party you're with; they ask if you can take the foot end up three flights without stopping. You can, by the end. The matron watches you go up and says nothing, which is approval." } },
        },
      ],
    },
    {
      id: 'coalport.harbour-police',
      name: 'Harbour Police',
      ref: 'the harbour police station',
      kind: 'jail',
      blurb: 'The harbour police station by the ferry stage: two cells, a stove, and a duty officer who writes everything down.',
      // The survey pin (mapPins.ts), pin 10.
      map: { x: 0.56, y: 0.83 },
      quarterId: 'coalport.harbour',
      actions: [
        {
          ...intelligence,
          energy: 3,
          id: 'coalport.harbour-police.notices',
          name: 'Read the notices at the station door',
          stats: ['int'],
          text: {
            success: { headline: 'Names on the board', body: "The board by the door lists the week's lost property, licences refused and the men wanted for questioning. Two names and a street go in your notebook while the duty officer is on the telephone." },
            partial: { headline: "Last week's sheet", body: "The board is last week's and the duty officer is watching through the glass. One name worth writing down, from the licences refused. Come back on Monday." },
          },
        },
        {
          ...canvass,
          id: 'coalport.harbour-police.desk',
          name: 'Talk to people waiting at the desk',
          stats: ['int'],
          text: {
            success: { headline: 'Everyone here has a grievance', body: 'Lost bicycles, a licence, a son. The bench by the desk is the most patient audience in Coalport. You keep your voice down and your flyers folded small. By the time the duty officer calls next, half the bench has one.' },
            partial: { headline: 'The duty officer has a view', body: 'The duty officer looks up from his book and then at the door. You get two flyers out on the way to it. One woman follows you onto the step to ask about the rent tribunal.' },
          },
        },
      ],
    },
    {
      id: 'coalport.far-bank',
      name: 'The Far Bank',
      ref: 'the Far Bank',
      kind: 'market',
      blurb: 'Across the water by ferry: the fish market under its iron roof, the bonded warehouses, and a lower town that makes up its mind late.',
      // The survey pin (mapPins.ts), pin 11.
      map: { x: 0.93, y: 0.62 },
      quarterId: 'coalport.harbour',
      actions: [
        {
          ...canvass,
          id: 'coalport.far-bank.ferry',
          name: 'Talk to people in the ferry queue',
          stats: ['cha', 'int'],
          text: {
            success: { headline: 'Ten minutes to the next boat', body: "The ferry queue has ten minutes and nowhere to go. You work the stage with the flyer and the fare table: the harbour rates, the ferry penny, who decides. By the time the boat comes, the queue has an opinion it didn't have." },
            partial: { headline: 'The boat comes early', body: "You're four people in when the ferry noses in and the queue becomes a scrum for the gangway. A few flyers go into shopping bags. One old woman says she'll read it on the crossing, which is three minutes." },
          },
        },
        {
          ...speech,
          id: 'coalport.far-bank.speech',
          name: 'Speak from the fish quay steps',
          stats: ['cha', 'str'],
          text: {
            success: { headline: 'The fish quay stops gutting', body: 'The quay steps at the morning sale, the iron roof for a sounding board. The rates, the ferry penny, who owns the ice. The fishwives heckle, the quay laughs, and by the end the laughs are on your side.' },
            partial: { headline: 'The auctioneer starts up', body: "You get through the rates before the auctioneer's bell goes and takes the quay with it. A knot of boys at the back stays to argue. A fishwife gives you a herring, which is not a no." },
          },
        },
        {
          ...propaganda,
          id: 'coalport.far-bank.leaflets',
          name: 'Hand out flyers under the iron roof',
          stats: ['agi'],
          text: {
            success: { headline: 'Quick hands, wet floor', body: 'You work the fish market aisles at a trot, a flyer into every basket before its owner looks up from the scales. The bag is empty in ten minutes and the market beadle never sees you.' },
            partial: { headline: 'The beadle sees you', body: "Half the bag is gone when the beadle plants himself in the aisle and asks about your permit. You leave by the ice store, slower than you'd like. The flyers you handed out are still out there, damp." },
          },
        },
      ],
    },
    // Review 4 (answers §11.1, ADR 0077): the council's hall, a place open at every Level; appended
    // last so no pin renumbers (answers §29 Q10). Its pin is the survey's.
    townHall({
      id: 'coalport.town-hall',
      name: 'Town Hall',
      ref: 'the Town Hall',
      blurb:
        "The dome on the river, soot on the stone and the council's clock a minute slow. Seven councillors sit here five days at a time, and the rule they pass is pinned in the lobby.",
      map: { x: 0.525, y: 0.19 },
      quarterId: 'coalport.mill',
    }),
  ], coalportMissions),
  // Slice 5 (design §8.1, §9.2): where the game sends a player in this city.
  services: { cells: 'coalport.harbour-police', infirmary: 'coalport.infirmary' },
  // Slice 5 (design §10.5, §23.1 #10): whom a visitor's tier-1 tap meets here (the police on top).
  runInPool: ['strike-picket', 'branch-inspector'],
};
