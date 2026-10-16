import type { City } from '../../schemas';
import { withMissions } from '../missions/attach';
import { clearwaterMissions } from '../missions/clearwater';

/**
 * Clearwater, the second battleground (slice 7; docs/design/slice-7-nation.md §9, GDD §14.1, §14.8,
 * §14.11, §15.3; ADR 0050). One meter, seven seats three ways, cycle offset 4, 30 % of the republic.
 * Places, actions and texts: design §9.2–§9.3, word for word; every pin is the survey's
 * (`mapPins.clearwater`). Review 4 (ADR 0076): a one-map city, no frames, outlines or labels; the
 * Places list groups by quarter. The Casino is the council's hall (ADR 0077: the hall is a place;
 * kind `bar`, one gallery ticket like every town hall's). Slice 8 (docs/design/slice-8-life.md
 * §3.7, §16.3): the Front opens, the Promenade, the Lido and the Pier Hotel leaving the later pins,
 * each with two tier-1 actions and a society call (missions/clearwater.ts). Difficulty 10 on tier 1
 * and 20 on missions are the rules' (a battleground), never data.
 */

const canvass = { tier: 1, type: 'canvass', energy: 10, givesFxp: true, givesOpinion: true } as const;
const speech = { tier: 1, type: 'speech', energy: 12, givesFxp: true, givesOpinion: true } as const;
const propaganda = { tier: 1, type: 'propaganda', energy: 8, givesFxp: true, givesOpinion: true } as const;
const intelligence = { tier: 1, type: 'intelligence', givesFxp: false, givesOpinion: false } as const;

export const clearwater: City = {
  id: 'clearwater',
  name: 'Clearwater',
  role: 'battleground',
  // Design §8 (GDD §14.11, Appendix C #70, approved 15 Oct 2026): evened, so nobody starts ahead.
  baselineOpinion: { vanguard: 22, collective: 22, alliance: 22, neutral: 34 },
  map: { day: 'map.clearwater.day', night: 'map.clearwater.night' },
  clouds: true,
  // Design §8 (GDD §14.8): the city's weight in who holds the republic.
  nationalWeight: 0.3,
  // The survey's quarter order (The Front 1, The Depot 2, The Harbour 3; design §9.1, §17 Q6). All
  // three are open: nobody reaches the lake below Level 10; the Front's four places are playable
  // from slice 8 (society calls need worn Charisma, not a Level).
  quarters: [
    {
      id: 'clearwater.front',
      name: 'The Front',
      blurb:
        "The lake's edge: the promenade, the domed casino above the terraces, the lido's pavilion, the pier and its hotel. The money side of town; the council sits in the casino's committee room.",
    },
    {
      id: 'clearwater.depot',
      name: 'The Depot',
      blurb:
        "The working town: the tram sheds' glass roof and fan of track, the arches with the barrows under them, the terraces below, St Martin's green spire, the sanatorium on the slope.",
    },
    {
      id: 'clearwater.harbour',
      name: 'The Harbour',
      blurb:
        "The harbour mole and its lighthouse, the fish quay, the station's canopy, the cannery's chimney, the harbour police by the ferry stage. Where the lake line ends and the town begins.",
    },
  ],
  paper: {
    name: 'The Clearwater Courier',
    shortName: 'Courier',
    strapline: 'Lake, town and harbour, every morning',
    price: '6 marks',
  },
  // GDD §2: offset 4. ADR 0050: seven seats, lists of three; the Casino is the hall (ADR 0077).
  council: { offset: 4, seats: 7, listSize: 3, hall: { locationId: 'clearwater.casino' } },
  locations: withMissions(
    [
      // ----- The Depot ---------------------------------------------------------------------------
      {
        id: 'clearwater.tram-depot',
        name: 'Tram Depot',
        ref: 'the Tram Depot',
        kind: 'station',
        blurb:
          "The company's sheds under a glass roof: a fan of track, four trams in for the night, crews at the gate at six. Whoever runs the trams runs the town's mornings.",
        map: { x: 0.38, y: 0.32 },
        quarterId: 'clearwater.depot',
        actions: [
          {
            ...canvass,
            id: 'clearwater.tram-depot.crews',
            name: 'Talk to the tram crews at the gate',
            stats: ['str'],
            text: {
              success: {
                headline: "Six o'clock at the sheds",
                body: "The crews come through the gate at six with their tins and the company's timetable in their pockets, and they have opinions about both. You've the shoulders for the yard, so they stop. A driver takes flyers for the depot board.",
              },
              partial: {
                headline: 'The bell for the first car',
                body: 'You get through the fares before the shed bell rings for the first car and the crews go to their trams at a trot. A conductress takes a handful of flyers for the top deck. The rest wait for the next change.',
              },
            },
          },
          {
            ...speech,
            id: 'clearwater.tram-depot.platform',
            name: "Speak from a tram's platform in the yard",
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: 'From the platform of number four',
                body: "A tram's rear platform is a pulpit on wheels and the yard knows it. You speak to the fitters and the crews between cars, on the fares and the Rows, and the shed foreman leaves the gate open an extra minute.",
              },
              partial: {
                headline: 'The car moves off',
                body: 'Someone rings the bell and number four moves off with you on the platform, which gets a laugh and loses the speech. You finish it walking back up the track. Half the yard heard the half that mattered.',
              },
            },
          },
          {
            ...intelligence,
            energy: 4,
            id: 'clearwater.tram-depot.office',
            name: 'Watch the shed office',
            stats: ['int'],
            text: {
              success: {
                headline: 'Who signs the sheets',
                body: "The shed office has one window and the duty sheets go through it at nine. You see who signs them, who argues and which inspector takes an envelope from the company's man. The time goes in the book.",
              },
              partial: {
                headline: 'The blind comes down',
                body: 'The office blind comes down at nine and the rest is shapes behind it. One name and one raised voice. The sheets go through tomorrow too.',
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.back-lane-market',
        name: 'Back Lane Market',
        kind: 'market',
        blurb:
          'Barrows under the railway arches behind the depot: fish, bootlaces, things without a receipt. A café with a hatch, and men who watch who buys what.',
        map: { x: 0.45, y: 0.4 },
        quarterId: 'clearwater.depot',
        // Slice 8 (design §3.5): the clothes stall; it buys anything sellable at a tenth.
        shops: [{ kind: 'clothesStall', items: ['outfit.standard-coat', 'acc.good-hat'], buys: 'any' }],
        actions: [
          {
            ...canvass,
            id: 'clearwater.back-lane-market.barrows',
            name: 'Talk to the barrow men',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: 'Under the arches',
                body: "The barrow men sell what the market inspector doesn't see and vote for whoever leaves them alone, so you talk about the rents and the dues and not the inspector. A fish man takes flyers for the wrapping and the café hatch takes two.",
              },
              partial: {
                headline: 'Business first',
                body: "A train goes over the arches and the lane is noise and smoke for a minute. You get one barrow's attention between lots. He takes a flyer and asks if the party can do anything about the inspector. You say you'll ask.",
              },
            },
          },
          {
            ...propaganda,
            id: 'clearwater.back-lane-market.arches',
            name: 'Hand out flyers under the arches',
            stats: ['agi'],
            text: {
              success: {
                headline: "Lane's end to lane's end",
                body: 'The lane is forty barrows long and you work it from the depot end to the café in ten minutes, a flyer on every barrow and one in every basket that passes. The inspector never sees you.',
              },
              partial: {
                headline: 'The inspector sees you',
                body: "Half the bag is gone when the market inspector plants himself in the lane and asks for your permit. You haven't one. You give him a flyer and leave by the café. The lane reads the half.",
              },
            },
          },
          {
            ...intelligence,
            energy: 3,
            id: 'clearwater.back-lane-market.hatch',
            name: 'Listen at the café hatch',
            stats: ['int'],
            text: {
              success: {
                headline: 'Tea and names',
                body: "The café hatch serves tea to the lane and to the harbour police, who sit with their backs to the lane and talk. A boat, a landlord's man and a date. The woman at the hatch tops up your cup without being asked.",
              },
              partial: {
                headline: 'Too much steam',
                body: "The urn hisses over the one conversation worth having. You get a street and a grudge, and the woman at the hatch gives you a look that says come back when it's quieter.",
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.rows',
        name: 'The Rows',
        ref: 'the Rows',
        kind: 'street',
        blurb:
          "Workers' terraces below the depot, back yards and washing, a corner shop on tick. The lake is a mile away and nobody here has seen the casino's inside.",
        map: { x: 0.52, y: 0.47 },
        quarterId: 'clearwater.depot',
        // Review 4 addendum (design §24): the Lodgings card on the Rows; half price under *Rents in the Rows*.
        lodgings: { line: 'A bed in the Rows · 7 nights · 100 Iron' },
        actions: [
          {
            ...canvass,
            id: 'clearwater.rows.doors',
            name: 'Knock on doors in the Rows',
            stats: ['int'],
            text: {
              success: {
                headline: 'Every other door',
                body: "The Rows open their doors to anyone who isn't the rent man. You get rents, the lake damp, the cannery's wage and three cups of tea, and leave a flyer behind every one. The corner shop puts one in the window.",
              },
              partial: {
                headline: "The rent man's day",
                body: "It's the rent man's day and half the Rows is out when you knock, which is to say in and not answering. The other half talks. A woman on the end house takes ten flyers for the back yards.",
              },
            },
          },
          {
            ...propaganda,
            id: 'clearwater.rows.gables',
            name: 'Put up posters on the gable ends',
            stats: ['str'],
            text: {
              success: {
                headline: 'Six gables',
                body: "The Rows have six gable ends facing the depot road and by the time the trams go by in the morning every one says the party's name. The rent man sees them from his bicycle.",
              },
              partial: {
                headline: 'A window goes up',
                body: 'Three gables done when a window goes up and somebody shouts about their wall. You finish the fourth small and leave by the back entry. It reads, from the tram.',
              },
            },
          },
          {
            id: 'clearwater.rows.run',
            name: "Run messages for the tenants' committee",
            tier: 1,
            type: 'training',
            trains: 'agi',
            verb: 'Run',
            text: {
              success: {
                headline: 'Up and down the Rows',
                body: "The tenants' committee needs a runner between the end house and the depot gate and doesn't ask your party, only whether you can do it before the tram. You can, twice. Your legs will tell you in the morning.",
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.st-martins',
        name: "St Martin's",
        kind: 'square',
        blurb:
          "The working town's church: a stone nave and a green copper spire above the tram sheds. The bell goes at six for the early shift and at noon for the market.",
        map: { x: 0.55, y: 0.22 },
        quarterId: 'clearwater.depot',
        actions: [
          {
            ...speech,
            id: 'clearwater.st-martins.door',
            name: 'Speak at the church door after the service',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: 'After the blessing',
                body: "The congregation comes out into the noon bell and stops on the steps, because you're on them. Rents, the sanatorium's beds and a council that reads. The priest listens from the door and doesn't move you on.",
              },
              partial: {
                headline: 'The bell takes the end',
                body: 'The noon bell goes over the last of it and the steps empty for the market. A dozen stay to hear you finish, two of them because they took it for a collection. One takes a flyer for the church porch.',
              },
            },
          },
          {
            ...canvass,
            id: 'clearwater.st-martins.steps',
            name: 'Talk to the congregation on the steps',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: 'Sunday best, Monday worries',
                body: 'Sunday best and Monday worries: the rent, the cannery, the daughter at the sanatorium. You listen more than you talk and the flyers go into prayer books. The verger takes one for the porch.',
              },
              partial: {
                headline: "The priest's hand",
                body: 'The priest shakes every hand on the steps and the congregation moves on with him. You get the stragglers: two conversations and a flyer in a hymn book.',
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.sanatorium',
        name: 'The Sanatorium',
        ref: 'the Sanatorium',
        kind: 'hospital',
        blurb:
          "The lake-air sanatorium on the slope: long verandahs, iron beds, a reading room with the Courier on a stick. The town's infirmary, whatever the brochure says.",
        map: { x: 0.71, y: 0.12 },
        quarterId: 'clearwater.depot',
        // Review 5 (answers §8, §18 Q14): the Treatment card; the sanatorium's sisters do the work.
        treatment: { carer: 'sister' },
        actions: [
          {
            ...canvass,
            id: 'clearwater.sanatorium.visitors',
            name: 'Talk to people at visiting hour',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: 'Verandah talk',
                body: 'Visiting hour on the verandahs: families with grapes and the Courier, and time to talk about the fees, the beds and who pays. You keep your voice down and the flyers go under the grapes. The sister pretends not to see.',
              },
              partial: {
                headline: "The matron's round",
                body: "You've two families talking when the matron comes along the verandah and visiting hour becomes visiting hour. One flyer stays, under a plate.",
              },
            },
          },
          {
            id: 'clearwater.sanatorium.reading-room',
            name: "Study in the sanatorium's reading room",
            tier: 1,
            type: 'training',
            trains: 'int',
            verb: 'Study',
            text: {
              success: {
                headline: 'An hour by the window',
                body: "The reading room looks over the lake and nobody reads in it, so it's yours. The bound Couriers go back to the war and the clerk brings a lamp without asking. An hour, and a stiff neck.",
              },
            },
          },
        ],
      },
      // ----- The Harbour -------------------------------------------------------------------------
      {
        id: 'clearwater.harbour',
        name: 'The Harbour',
        ref: 'the Harbour',
        kind: 'docks',
        blurb:
          'A stone mole with a small lighthouse, a fish quay with its crates, yachts on one side and the fishing fleet on the other. The ferry leaves from the stage at the hour.',
        map: { x: 0.72, y: 0.62 },
        quarterId: 'clearwater.harbour',
        actions: [
          {
            ...canvass,
            id: 'clearwater.harbour.fish-quay',
            name: 'Talk to the fish quay at the morning sale',
            stats: ['int'],
            text: {
              success: {
                headline: 'Between the lots',
                body: "The auctioneer sells by the crate and you sell between crates: rents, the dues, the cannery's wage. Fishwives listen with their arms folded, which on this quay is a yes. Ten flyers go into aprons.",
              },
              partial: {
                headline: 'Sold before you finish',
                body: 'The sale moves faster than your sentences. You get the dues in before a lot of perch goes under the hammer and the crowd goes with it. Two women take a flyer for the wrapping.',
              },
            },
          },
          {
            ...propaganda,
            id: 'clearwater.harbour.ferry-stage',
            name: 'Hand out flyers at the ferry stage',
            stats: ['agi'],
            text: {
              success: {
                headline: 'The quarter-past',
                body: 'The ferry queue is a captive one: forty people, a bell, and nothing to read. Your flyers go hand to hand along the rail before the gangway drops. Half of them cross the lake with the party in their pockets.',
              },
              partial: {
                headline: 'The bell beats you',
                body: 'The ferry bell goes early and the queue surges past you onto the stage. You press flyers on the stragglers and the deckhand, who reads his aloud for the saloon. Not nothing.',
              },
            },
          },
          {
            ...speech,
            id: 'clearwater.harbour.mole',
            name: 'Speak from the mole steps',
            stats: ['cha', 'str'],
            text: {
              success: {
                headline: 'Over the water',
                body: 'The mole carries a voice a long way on a still morning. You speak to the quay and the fleet hears you across the basin, and a skipper leans on his wheelhouse to listen. The lighthouse keeper nods once.',
              },
              partial: {
                headline: 'The wind off the lake',
                body: 'Halfway through the dues the wind comes round and takes the rest of it up the slope to the Front. The quay hears you; the boats hear the gulls. You finish for the people who stayed.',
              },
            },
          },
          {
            ...intelligence,
            energy: 4,
            id: 'clearwater.harbour.night-boats',
            name: 'Note which boats land after dark',
            stats: ['int'],
            text: {
              success: {
                headline: 'Three lamps, one dark',
                body: 'Three boats come in after the light goes: two with lamps and the crates stamped, one dark, met by a van with no name on it. The plate, the time and the quay go in the notebook.',
              },
              partial: {
                headline: 'A fog on the water',
                body: 'The fog comes down at ten and the basin is a sound of oars. One boat lands that you can swear to, with a lamp and nothing to hide. Another night for the dark one.',
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.cannery',
        name: 'The Cannery',
        ref: 'the Cannery',
        kind: 'factory-gate',
        blurb:
          "The fish cannery under its one chimney: the working town's biggest wage and its loudest hooter. Two shifts, and the lake wind takes the smell to the Front.",
        map: { x: 0.92, y: 0.47 },
        quarterId: 'clearwater.harbour',
        actions: [
          {
            ...canvass,
            id: 'clearwater.cannery.shift',
            name: 'Talk to the cannery workers at the shift change',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: 'The hooter stops them',
                body: "The hooter goes and four hundred come out of the gate smelling of brine and wanting to be talked to by anyone who isn't the foreman. You keep it to the wage and the Rows. Flyers go by the dozen.",
              },
              partial: {
                headline: 'Most make for the tram',
                body: "The shift comes off at a run for the depot tram and most of it is gone before you've said the party's name. A knot of the older hands stops. One asks what you'd do about the hooter.",
              },
            },
          },
          {
            ...propaganda,
            id: 'clearwater.cannery.wall',
            name: 'Put up posters on the cannery wall',
            stats: ['str'],
            text: {
              success: {
                headline: 'The long wall',
                body: "The cannery wall runs the length of the quay and by the end of the shift it says the party's name forty times, dry and square. The night watchman walks past twice and reads one.",
              },
              partial: {
                headline: 'The wet end',
                body: "The quay end of the wall is wet from the hoses and the paste won't hold. You get twenty up on the dry half and watch two slide off the rest. The watchman laughs, which is a kind of notice.",
              },
            },
          },
          {
            id: 'clearwater.cannery.crates',
            name: 'Stack crates on the loading bank',
            tier: 1,
            type: 'training',
            trains: 'str',
            verb: 'Stack',
            text: {
              success: {
                headline: 'An hour on the bank',
                body: "The loading bank takes crates of tins six high and the forewoman doesn't ask your party, only whether you can lift the seventh. By the end you can. Your shoulders will have views tomorrow.",
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.station',
        name: 'Clearwater Station',
        ref: 'the station',
        kind: 'station',
        blurb:
          'The end of the lake line: one canopy, a buffet, and twenty-five minutes of capital on the board. Arrivals are met; departures are watched.',
        map: { x: 0.8, y: 0.5 },
        quarterId: 'clearwater.harbour',
        actions: [
          {
            ...canvass,
            id: 'clearwater.station.platform',
            name: 'Talk to the arrivals on the platform',
            stats: ['int'],
            text: {
              success: {
                headline: 'Off the capital train',
                body: "The Irongate train brings clerks, a salesman, two families with the sea in mind and a man who asks which party you are before you've said. You tell them all. The salesman takes ten flyers for the hotels.",
              },
              partial: {
                headline: 'They have luggage',
                body: 'People with luggage want a porter, not a party. You get three conversations between the barrier and the cab rank, one of them with the porter. He takes a flyer for the buffet.',
              },
            },
          },
          {
            ...intelligence,
            energy: 4,
            id: 'clearwater.station.watch',
            name: 'Watch who meets the Irongate train',
            stats: ['int'],
            text: {
              success: {
                headline: 'Met by a car',
                body: "The six o'clock brings a man in a good coat who is met by a car from the Front and not by his wife. The plate, the coat, the hotel the car turns into. The buffet girl says he comes on Thursdays.",
              },
              partial: {
                headline: 'A crowd on the barrier',
                body: 'Market day and the barrier is a wall of baskets. You see the good coat and lose the car. Thursday, then, and earlier.',
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.harbour-police',
        name: 'Harbour Police',
        ref: 'the harbour police station',
        kind: 'jail',
        blurb:
          "The harbour police station by the ferry stage: two cells, a stove, and a duty officer who knows every boat on the lake by its lamp. The town's cells.",
        map: { x: 0.8, y: 0.76 },
        quarterId: 'clearwater.harbour',
        actions: [
          {
            ...intelligence,
            energy: 3,
            id: 'clearwater.harbour-police.notices',
            name: 'Read the notices at the station door',
            stats: ['int'],
            text: {
              success: {
                headline: 'The board says',
                body: "Lost dogs, a reward for a stolen outboard, two names wanted for questioning and the hours of the harbourmaster's clerk. The two names go in the notebook. One of them drinks at the café hatch.",
              },
              partial: {
                headline: 'Half a board',
                body: "Half the board is the fishing by-laws and the rest is a page the rain has had. You get one name and the clerk's hours. The duty officer watches you read through the glass.",
              },
            },
          },
          {
            ...canvass,
            id: 'clearwater.harbour-police.desk',
            name: 'Talk to people waiting at the desk',
            stats: ['int'],
            text: {
              success: {
                headline: 'The long bench',
                body: "Nobody waits at a police desk because things are going well. You hear about the dues, the landlord's man and the boat that went missing, and you talk back about what a council could do. Three take a flyer, folded small.",
              },
              partial: {
                headline: 'The hatch opens',
                body: "You've one conversation going on the bench when the hatch opens and the duty officer calls the next name, which is theirs. The man beside you takes a flyer without looking at it.",
              },
            },
          },
        ],
      },
      // ----- The Front: the council's hall (ADR 0077), appended last so no pin renumbers ---------
      // Slice 8 (design §3.7, §16.3): the Front opens. The Casino gains its two tier-1 actions, the
      // back room (§3.5), the bar's card (§24.3) and its own scene; the other three places follow.
      {
        id: 'clearwater.casino',
        name: 'The Casino',
        ref: 'the Casino',
        kind: 'bar',
        blurb:
          "The company's domed palace: a long bar, the tables after midnight, and the committee room upstairs it lends the council. The cashier sees everything.",
        map: { x: 0.33, y: 0.6 },
        quarterId: 'clearwater.front',
        scene: 'scene.casino',
        shops: [{ kind: 'backRoom', items: ['doc.forged-papers', 'tool.wire-cutters'], buys: 'own', bribe: true }],
        bar: true,
        actions: [
          {
            ...canvass,
            id: 'clearwater.casino.bar',
            name: 'Talk to people at the long bar',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: "The bar's view",
                body: 'The long bar talks licence, trams and who\'s buying. Three of them will vote, one of them for you.',
              },
              partial: {
                headline: "A round you didn't buy",
                body: "Somebody else's round and the talk stays on the tables. One name, one maybe.",
              },
            },
          },
          {
            ...intelligence,
            energy: 3,
            id: 'clearwater.casino.listen',
            name: "Listen at the cashier's window",
            stats: ['int'],
            text: {
              success: {
                headline: "The cashier's arithmetic",
                body: "Chips out, chips in, and who signs for them. The cashier's book is a ledger of the Front. One line worth remembering.",
              },
              partial: {
                headline: 'A busy night',
                body: 'Too busy to overhear anything but the sums. The sums are large.',
              },
            },
          },
          {
            ...intelligence,
            energy: 6,
            id: 'clearwater.casino.gallery',
            name: 'Sit in on the council in the committee room',
            stats: ['int'],
            text: {
              success: {
                headline: 'From the chair by the door',
                body: "An hour on the hard chair by the committee room's door while the tables click downstairs. Who sits with whom, who leaves before the vote, which clerk the chairman looks at. The minute book says less than the room.",
              },
              partial: {
                headline: 'The room is cleared',
                body: "The company's man clears the room for a closed session after twenty minutes and the croupiers watch you go down. You get the seating plan and a cold. The rest is in the Courier tomorrow, if it's anywhere.",
              },
            },
          },
        ],
      },
      // Slice 8 (design §16.3): the Front's other three places, on their survey pins (mapPins.clearwater).
      {
        id: 'clearwater.promenade',
        name: 'The Promenade',
        ref: 'the Promenade',
        kind: 'square',
        blurb:
          'A mile of benches, a bandstand and the people who have time for both. The money side of town walks here at four and talks about the other side.',
        map: { x: 0.2, y: 0.69 },
        quarterId: 'clearwater.front',
        actions: [
          {
            ...canvass,
            id: 'clearwater.promenade.canvass',
            name: 'Talk to people on the benches',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: 'A bench a vote',
                body: "Four benches, four conversations, one of them a councillor's widow who has opinions about the trams. She'll tell her bridge table.",
              },
              partial: {
                headline: 'The band starts',
                body: 'Two benches before the band starts and nobody can hear the trams argument. The widow waves.',
              },
            },
          },
          {
            ...intelligence,
            energy: 4,
            id: 'clearwater.promenade.watch',
            name: 'Watch who walks with whom',
            stats: ['int'],
            text: {
              success: {
                headline: "Four o'clock, as usual",
                body: "The tram director walks with the casino's manager, as usual, and today with a third man who isn't. You note the hat.",
              },
              partial: {
                headline: 'A hat',
                body: "Rain at four and the walkers under the bandstand. One hat you'd know again.",
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.lido',
        name: 'The Lido',
        ref: 'the Lido',
        kind: 'square',
        blurb:
          "The lake's pavilion and its deckchairs, the bandstand the parties fight over, a Sunday crowd that reads the Courier and votes.",
        map: { x: 0.42, y: 0.88 },
        quarterId: 'clearwater.front',
        scene: 'scene.lido',
        actions: [
          {
            ...canvass,
            id: 'clearwater.lido.deckchairs',
            name: 'Talk to people in the deckchairs',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: "A Sunday's worth",
                body: "The deckchairs vote and say so: the bandstand, the licence, the Rows' water. Three conversations, one convert.",
              },
              partial: {
                headline: 'Sunburn',
                body: 'Two deckchairs and a child with a bucket. One of the two is yours.',
              },
            },
          },
          {
            ...speech,
            id: 'clearwater.lido.bandstand',
            name: 'Speak from the bandstand',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: "The bandstand's ours",
                body: "Twenty minutes before the band, two hundred deckchairs, and the lake carries a voice. They clap because it's Sunday; some of them mean it.",
              },
              partial: {
                headline: "The band's early",
                body: 'Ten minutes and the brass. A knot by the pavilion stays to argue, which is the point.',
              },
            },
          },
        ],
      },
      {
        id: 'clearwater.pier-hotel',
        name: 'The Pier Hotel',
        ref: 'the Pier Hotel',
        kind: 'hotel',
        blurb:
          "Terraces over the water, tea at four, a lounge where the bank's business is done quietly. Julius Marr keeps a table by the window.",
        map: { x: 0.56, y: 0.82 },
        quarterId: 'clearwater.front',
        // Design §3.5, §5.1, §24.3: the tailor, Marr's table and the dining room.
        shops: [{ kind: 'tailor', items: ['outfit.greatcoat', 'outfit.evening-dress', 'acc.wristwatch'], buys: 'own' }],
        patronId: 'marr',
        dining: true,
        actions: [
          {
            ...canvass,
            id: 'clearwater.pier-hotel.lounge',
            name: 'Talk to people in the lounge',
            stats: ['cha', 'int'],
            text: {
              success: {
                headline: 'Tea and a vote',
                body: 'The lounge talks quietly and votes loudly. A retired magistrate, a tram shareholder, a sister from the sanatorium: three views, one yours.',
              },
              partial: {
                headline: "The waiter's eye",
                body: "The waiter has opinions about who sits where. Two conversations before you're moved.",
              },
            },
          },
          {
            ...intelligence,
            energy: 3,
            id: 'clearwater.pier-hotel.porters',
            name: 'Listen to the porters',
            stats: ['int'],
            text: {
              success: {
                headline: 'What the porters carry',
                body: "Who arrived, who paid cash, who had the banker's table. Porters know the Front by its luggage.",
              },
              partial: {
                headline: 'Luggage only',
                body: "Trunks, a dog, a crate marked fragile. The dog's name is Max.",
              },
            },
          },
        ],
      },
    ],
    clearwaterMissions,
  ),
  // Slice 5 (design §8.1, §9.2): the cells and the infirmary. No `runInPool`: the lake is nobody's
  // home, so there is no rival-ground run-in on a tier-1 tap (the missions carry their own pools).
  services: { cells: 'clearwater.harbour-police', infirmary: 'clearwater.sanatorium' },
};
