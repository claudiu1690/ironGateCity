import type { City } from '../../schemas';
import { withMissions } from '../missions/attach';
import { townHall } from './townHall';
import { ashfordMissions } from '../missions/ashford';

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
  // Map atmosphere: clouds by day, fog by night over the map (on for the three home cities, 2 Oct 2026).
  clouds: true,
  // Slice 5 (design §2), review 4 (ADR 0076): three quarters, the Level gates of groups of places
  // (Level 1, Level 6, a later edition), read on the Places list. A home city is one map: no frames,
  // outlines or labels (the capital's only).
  quarters: [
    {
      id: 'ashford.college',
      name: 'The College',
    },
    {
      id: 'ashford.wharf',
      name: 'The Wharf',
      opens: { level: 6 },
      blurb:
        "The lower town across the river: the County Infirmary in its garden, the cattle pens and auction sheds, the police station by the Corn Exchange, the wharf below the bridge and the brewery's chimneys.",
    },
    {
      id: 'ashford.station-road',
      name: 'Station Road',
      opens: { edition: 'later' },
      blurb:
        "The respectable town north of the river: the station's glass roof, the Town Hall clock, the theatre, the Corn Exchange, the park with its bandstand and the Press Club by the bridge.",
    },
  ],
  paper: {
    name: 'The Ashford Gazette',
    shortName: 'Gazette',
    strapline: 'Fair report, free comment',
    price: '6 marks',
  },
  // Slice 3 (GDD §2): the council cycle's offset (Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4).
  // Review 3: the council sits in the clock-tower hall by the river bridge (the survey's
  // `ashford.town-hall`, third quarter; the point is the tower and the front together). The election
  // screens' backdrop. Review 4 (ADR 0077): the hall is a location (read from its pin).
  council: { offset: 1, seats: 7, hall: { locationId: 'ashford.town-hall' } },
  locations: withMissions([
    {
      id: 'ashford.gazette-house',
      name: 'Gazette House',
      kind: 'press',
      blurb:
        "The Ashford Gazette's offices and print room, the biggest building in the old town. The presses run at four, and the evening edition is on the streets by six.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.53, y: 0.47 },
      quarterId: 'ashford.college',
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
          verb: 'Unload',
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
      // Slice 4 (design §4.3): an HQ's tickets are for its own faction's members.
      factionId: 'alliance',
      blurb:
        "The Alliance's rooms above the old concert hall. Committee on the first floor, the duplicator on the landing, the founders of the republic on the stairs.",
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.69, y: 0.27 },
      quarterId: 'ashford.college',
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
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.49, y: 0.25 },
      quarterId: 'ashford.college',
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
          verb: 'Study',
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
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.7, y: 0.37 },
      quarterId: 'ashford.college',
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
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.4, y: 0.55 },
      quarterId: 'ashford.college',
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
      // Maps v3: the approved pin (pins.json).
      map: { x: 0.3, y: 0.62 },
      quarterId: 'ashford.college',
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
          verb: 'Run',
          text: {
            success: {
              headline: 'Every stair in the block',
              body: 'Six notes, four stairwells, one hour. You learn which landings connect and which end in a locked door, and you learn them at a run. By the end you could do it in the dark.',
            },
          },
        },
      ],
    },
    // Slice 5 (design §2.3, §3): the second quarter's five places, pins 7–11.
    {
      id: 'ashford.wharf',
      name: 'The Wharf',
      ref: 'the Wharf',
      kind: 'docks',
      blurb: "The river wharf below the bridge: barges at the lock, the boat club's verandah, and the towpath where the lower town walks on Sundays.",
      // The survey pin (mapPins.ts), pin 7.
      map: { x: 0.79, y: 0.77 },
      quarterId: 'ashford.wharf',
      actions: [
        {
          ...canvass,
          id: 'ashford.wharf.bargemen',
          name: 'Talk to the bargemen at the lock',
          stats: ['str'],
          text: {
            success: { headline: 'They make room on the lock beam', body: "The bargemen wait on the lock beam while the water comes up and have nothing to do but talk. You've the hands for the ropes and it shows. By the time the gates open, the beam has agreed to send two men to the Rooms." },
            partial: { headline: "The lock fills faster than you'd like", body: "You get through the tolls before the gates open and the barges move off. A couple of nods, one argument about the brewery's wharf that goes nowhere. The lock-keeper takes a flyer for later." },
          },
        },
        {
          ...speech,
          id: 'ashford.wharf.speech',
          name: 'Speak from the boat club steps',
          stats: ['cha', 'int'],
          text: {
            success: { headline: 'The towpath stops to listen', body: 'The club steps on a Sunday, the river for a sounding board and the lower town walking past. The tolls, the rents below the bridge, who sits on the wharf board. Both banks slow down. A barge rings its bell for you.' },
            partial: { headline: 'The rowing eight takes half of them', body: "You've a decent crowd until the college eight comes through the bridge and takes it to the rail. You finish for the ones who stayed and a policeman who looks bored. The lock-keeper gives you a nod." },
          },
        },
        {
          ...propaganda,
          id: 'ashford.wharf.towpath',
          name: 'Hand out flyers along the towpath',
          stats: ['agi'],
          text: {
            success: { headline: 'A mile of towpath, empty bag', body: "The whole lower town walks the towpath on a Sunday and can't hurry. You work it at a trot, a flyer into every hand from the lock to the brewery. The bag is empty before the brewery wall." },
            partial: { headline: 'The wind off the river', body: 'Half the bag goes into hands and half into the river when the wind gets up at the bend. The ones that stayed dry are still out there. A boy fishes one out with a net and reads it anyway.' },
          },
        },
      ],
    },
    {
      id: 'ashford.brewery',
      name: 'Brewery',
      ref: 'the brewery',
      kind: 'factory-gate',
      blurb: "The brick brewery with its two chimneys at the river's bend. Draymen at the gate from six, and the whole lower town smells of malt.",
      // The survey pin (mapPins.ts), pin 8.
      map: { x: 0.92, y: 0.82 },
      quarterId: 'ashford.wharf',
      actions: [
        {
          ...canvass,
          id: 'ashford.brewery.draymen',
          name: 'Talk to the draymen at the gate',
          stats: ['str'],
          text: {
            success: { headline: 'They stop for one who can lift a cask', body: "The draymen load at six and come off at two with the horses. You've the shoulders for it, so they stop. Rates, the tolls, who owns the wharf. A head drayman takes ten flyers for the stables." },
            partial: { headline: 'Most of them go with the drays', body: "The drays go out in a line and most of the men go with them. You press flyers on the yard hands. Two stop to argue the tolls; one says his father's a member and takes two." },
          },
        },
        {
          ...propaganda,
          id: 'ashford.brewery.wall',
          name: 'Put up posters on the brewery wall',
          stats: ['str'],
          text: {
            success: { headline: "A wall's length of paper", body: 'Bucket, brush and a hundred yards of brewery wall along the towpath. You get twelve posters up straight and high, one to every bay. The draymen will read them at six, and the whole lower town after.' },
            partial: { headline: "The paste won't hold on sooted brick", body: "The wind off the river is against you and the paste won't take on the chimneys' soot. Five posters stay up; the rest go in the river. Five is five." },
          },
        },
        {
          id: 'ashford.brewery.barrels',
          name: 'Roll barrels in the yard',
          tier: 1,
          type: 'training',
          trains: 'str',
          verb: 'Roll',
          text: { success: { headline: 'An hour on the casks', body: "The yard foreman doesn't ask which party you're with; he asks if you can get a full cask up the ramp onto the dray alone. You can, by the end. Your back will tell you about it tomorrow." } },
        },
      ],
    },
    {
      id: 'ashford.cattle-market',
      name: 'Cattle Market',
      ref: 'the Cattle Market',
      kind: 'market',
      blurb: 'Pens and auction sheds on the edge of the lower town. Market day brings the county in, with money in its pockets and opinions to match.',
      // The survey pin (mapPins.ts), pin 9.
      map: { x: 0.25, y: 0.77 },
      quarterId: 'ashford.wharf',
      actions: [
        {
          ...canvass,
          id: 'ashford.cattle-market.pens',
          name: 'Talk to the farmers at the pens',
          stats: ['cha', 'int'],
          text: {
            success: { headline: 'The county has time to talk', body: "Market day, the pens full, and a county that won't be hurried. You work the rails with the flyer and the tolls sheet, and you take your hat off at every pen. By the auction bell, half the county has one in a waistcoat pocket." },
            partial: { headline: 'The auction starts early', body: "You've done three pens when the bell goes and the county goes to the sheds in a body. A few flyers go into waistcoats. One old farmer says he'll read it after the sale, if his beasts make a price." },
          },
        },
        {
          ...speech,
          id: 'ashford.cattle-market.speech',
          name: "Speak from the auctioneer's box",
          stats: ['cha', 'int'],
          text: {
            success: { headline: 'The box is yours between lots', body: "The auctioneer's box between lots, the sheds for a sounding board and the county on the benches. The tolls, the railway rates, who sits on the market board. Nobody heckles a man in the box. The auctioneer lets you finish before the gavel." },
            partial: { headline: 'The next lot comes in', body: "You get through the tolls before the next lot comes through the gate and takes the sheds' attention with it. A knot of young farmers at the rail stays to argue. The auctioneer looks at his watch." },
          },
        },
      ],
    },
    {
      id: 'ashford.infirmary',
      name: 'County Infirmary',
      ref: 'the County Infirmary',
      kind: 'hospital',
      blurb: "The county infirmary in its walled garden: long wards, a porter's lodge, and a queue of visitors at two with flowers from the market.",
      // The survey pin (mapPins.ts), pin 10.
      map: { x: 0.2, y: 0.47 },
      quarterId: 'ashford.wharf',
      actions: [
        {
          ...canvass,
          id: 'ashford.infirmary.visitors',
          name: 'Talk to people at visiting hour',
          stats: ['cha', 'int'],
          text: {
            success: { headline: "Two o'clock in the garden", body: "Visiting is at two and the queue at the lodge is anxious, patient and can't leave. You work it gently: the beds, the fever, who pays. By the time the porter opens the gate most of it has a flyer among the flowers." },
            partial: { headline: 'The porter opens early', body: "The gate opens at ten to two and the queue is gone up the drive. A few flyers go into baskets. One woman says her husband's on the men's ward and takes two." },
          },
        },
        {
          ...intelligence,
          energy: 4,
          id: 'ashford.infirmary.ambulance',
          name: 'Watch who the ambulance brings',
          stats: ['int'],
          text: {
            success: { headline: 'The ambulance keeps a list', body: "A bench by the lodge and a paper you don't read. Who comes in from the brewery, who from the cattle market, which case the porter signs for without a name. Two names and a time go in your notebook." },
            partial: { headline: 'A quiet afternoon at the lodge', body: 'One ambulance, one broken arm from the wharf. The porter smokes by the gate and says nothing. One name worth writing down. Come back on market day.' },
          },
        },
      ],
    },
    {
      id: 'ashford.police',
      name: 'Police Station',
      ref: 'the police station',
      kind: 'jail',
      blurb: "The police station by the Corn Exchange: a lamp over the door, a duty officer at the desk, and a book in which the whole town's name eventually appears.",
      // The survey pin (mapPins.ts), pin 11.
      map: { x: 0.72, y: 0.52 },
      quarterId: 'ashford.wharf',
      actions: [
        {
          ...intelligence,
          energy: 3,
          id: 'ashford.police.notices',
          name: 'Read the notices at the station door',
          stats: ['int'],
          text: {
            success: { headline: 'Names on the board', body: "The board by the door lists the week's lost property, licences refused and the men wanted for questioning. Two names and a street go in your notebook while the duty officer is on the telephone." },
            partial: { headline: "Last week's sheet", body: "The board is last week's and the duty officer is watching through the glass. One name worth writing down, from the licences refused. Come back on Monday." },
          },
        },
        {
          ...canvass,
          id: 'ashford.police.desk',
          name: 'Talk to people waiting at the desk',
          stats: ['int'],
          text: {
            success: { headline: 'Everyone here has a grievance', body: 'A lost dog, a licence, a son. The bench by the desk is the most patient audience in Ashford. You keep your voice down and your flyers folded small. By the time the duty officer calls next, half the bench has one.' },
            partial: { headline: 'The duty officer has a view', body: 'The duty officer looks up from his book and then at the door. You get two flyers out on the way to it. One man follows you onto the step to ask about the court queue.' },
          },
        },
      ],
    },
    // Review 4 (answers §11.1, ADR 0077): the council's hall, a place open at every Level; appended
    // last so no pin renumbers (answers §29 Q10). Its pin is the survey's.
    townHall({
      id: 'ashford.town-hall',
      name: 'Town Hall',
      ref: 'the Town Hall',
      blurb:
        "The clock-tower hall by the bridge, where the county has argued for two hundred years. The council's rule is printed and posted; the public gallery is free.",
      map: { x: 0.805, y: 0.275 },
      quarterId: 'ashford.station-road',
    }),
  ], ashfordMissions),
  // Slice 5 (design §8.1, §9.2): where the game sends a player in this city.
  services: { cells: 'ashford.police', infirmary: 'ashford.infirmary' },
  // Slice 5 (design §10.5, §23.1 #10): whom a visitor's tier-1 tap meets here (the police on top).
  runInPool: ['party-thug'],
};
