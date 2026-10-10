import type { MissionsByPlace } from './attach';

/**
 * Slice 5: Ashford's missions (docs/design/slice-5-risk.md §5; the briefings, ways and texts word for
 * word). Energy and difficulty are the rules' (MISSION_TYPES, missionDifficulty); the loader holds them.
 * Way ids are the way's stat (`str`, `agi`, `int`, `cha-int`, `best`): unique within a mission.
 */
export const ashfordMissions: MissionsByPlace = {
  'ashford.cattle-market': [
    {
      id: 'ashford.cattle-market.auction',
      name: 'Speak at the cattle auction',
      tier: 2,
      type: 'speech',
      energy: 15,
      level: 6,
      difficulty: 14,
      pool: ['party-thug', 'strike-picket'],
      briefing: "Market day fills the auction shed with the whole county, five hundred farmers on the benches and nothing to do between lots but talk. There's the auctioneer's box, the top of the pens where the drovers stand, and the sale office where the tolls are argued before anyone speaks.",
      ways: [
        { id: 'cha-int', title: "From the auctioneer's box, between lots", stats: ['cha', 'int'], hint: 'The market board will not like it. The benches will.' },
        { id: 'str', title: 'From the top rail of the pens', stats: ['str'], hint: 'Climb it, hold on, and shout over the beasts.' },
        { id: 'best', title: 'The sale office first, then the shed', stats: ['best'], hint: "Find out what the county is angry about before you tell it what you'd do." },
      ],
      text: {
        success: { headline: 'The county stops bidding', body: "Five hundred farmers, and between lots they'd rather hear you than the auctioneer. The tolls, the railway rates, who sits on the market board. The auctioneer waits for you to finish, which has not happened before. A drover shakes your hand." },
        partial: { headline: 'The next lot comes in', body: 'You get through the tolls before the next lot comes through the gate and takes the shed with it. A knot of young farmers at the rail stays to argue. One says come back next market, same box.' },
        failure: { headline: 'A beast is a beast', body: "A bull gets loose between lots and five hundred farmers watch it, not you. By the time it's penned you're one more voice under the roof. The auctioneer looks at you once and lifts his gavel. You walk out past the pens with the flyers." },
      },
    },
  ],
  'ashford.wharf': [
    {
      id: 'ashford.wharf.watch',
      name: 'Watch the wharf after dark',
      tier: 2,
      type: 'surveillance',
      energy: 12,
      level: 6,
      difficulty: 14,
      pool: ['city-police'],
      briefing: "The wharf closes at six and the lock-keeper at eight. After that the barges below the bridge are nobody's business, and what comes off them goes up the towpath without a toll. There's the boat club verandah with a view of the lock, and the towpath, closer, with the police on it twice a night.",
      ways: [
        { id: 'int', title: 'From the boat club verandah', stats: ['int'], hint: 'Sit still, count the barges, write down the names. Only the cold is against you.' },
        { id: 'agi', title: 'Along the towpath to the lock', stats: ['agi'], hint: 'Close enough to read the barge names. Close enough to be read.', window: 'night' },
      ],
      text: {
        success: { headline: "The eleven o'clock barge", body: "At eleven a barge comes up through the lock with no lights and three men who don't tie up. Two names, a crate count and the time. The notebook has a page the wharf board would pay for." },
        partial: { headline: 'Fog off the river', body: "The fog comes up at ten and the lock becomes lamplight and shapes. One barge name before the rest is guesswork. Something came up tonight without a toll; you'll need another night to say whose." },
        failure: { headline: 'A long cold nothing', body: 'Four hours on the verandah and the lock stays shut. A policeman walks the towpath twice and looks at you the second time. You go home with a cold and an empty page, and the lock has your face.' },
      },
    },
  ],
  'ashford.brewery': [
    {
      id: 'ashford.brewery.posters',
      name: "Tear down the Collective's posters on the brewery wall",
      tier: 2,
      type: 'vandalism',
      energy: 10,
      level: 6,
      difficulty: 14,
      requires: { rank: 3 },
      target: 'collective',
      pool: ['strike-picket', 'city-police'],
      briefing: "The Collective has papered the brewery wall overnight, a hundred yards of towpath that the whole lower town walks on its way to the bridge. The draymen come out at six and the police walk the towpath at seven. Whatever's on the wall at eight is what the lower town reads today.",
      ways: [
        { id: 'agi', title: 'Before the draymen, in the dark', stats: ['agi'], hint: 'Nobody about, nobody to see. One bay at a time.', window: 'night' },
        { id: 'str', title: 'At the gate, with the draymen watching', stats: ['str'], hint: 'Rip them down with the yard watching and let them say so.', runIn: 25 },
      ],
      text: {
        success: { headline: 'A hundred yards of bare brick', body: "The wall is bare from the gate to the bend by the time the draymen come out, and the towpath has nothing to read but the brewery's name. The Collective's man comes at nine with a bucket and finds he's the morning's story." },
        partial: { headline: 'The gate end', body: 'You get the gate end before the yard lamp comes on and you leave by the towpath. Half the wall is bare. The other half is being argued over at the lock.' },
        failure: { headline: 'The paste is good', body: 'Wet night, good paste, and posters that come off in strips the size of your hand. You get two bays done before the draymen are at the gate and you have to walk out past them with red hands. The posters stay up.' },
      },
    },
    {
      // Review 5 (answers §12.1, §18.2, §18.2a): a night mission, at the night rate.
      id: 'ashford.brewery.dawn-shift',
      name: 'Paste over the brewery gate before the dawn shift',
      tier: 2,
      type: 'vandalism',
      energy: 10,
      level: 6,
      difficulty: 14,
      requires: { rank: 3 },
      target: 'alliance',
      pool: ['party-thug', 'city-police'],
      window: 'night',
      briefing: "The Alliance papers the brewery gate for the dawn shift, when four hundred men read whatever is there. The watchman does his round at four. What is on the gate at five is the morning's news.",
      ways: [
        { id: 'agi', title: 'Lamp out, bucket and brush', stats: ['agi'], hint: "Dark gate, cold paste, one sheet at a time. The watchman's round is at four." },
        { id: 'str', title: 'Two of you and a ladder, quickly', stats: ['str'], hint: 'Top to bottom of the gate in ten minutes. Fast, loud, and the watchman has ears.' },
      ],
      text: {
        success: { headline: 'Four hundred readers', body: "The watchman does his round at four, the gate is bare at five and yours by ten past. Four hundred men read it at the dawn shift, and the dray horses after. The Rooms' man comes with a bucket at seven and finds he is the news." },
        partial: { headline: 'Half the gate', body: "You get the left-hand gate pasted before the watchman's lamp comes round the stables, and leave by the hop store. Half the gate is yours. The shift reads both halves and argues." },
        failure: { headline: "The paste won't take", body: 'Wet night, cold paste, and the posters slide off the gate in sheets the size of a tablecloth. The watchman finds you on the second. You walk out past the stables with the bucket. The gate says what it said.' },
      },
    },
  ],
  'ashford.weavers-row': [
    {
      id: 'ashford.weavers-row.tenants-meeting',
      name: "Break up the tenants' meeting on Weavers' Row",
      tier: 2,
      type: 'disruption',
      energy: 15,
      level: 8,
      difficulty: 16,
      requires: { rank: 3 },
      target: 'alliance',
      pool: ['party-thug', 'city-police'],
      briefing: "The Alliance holds its tenants' meeting in the yard on Weavers' Row at seven: forty people on the steps, a solicitor's clerk with the rent cases and Mr Grey's man at the gate with the register. The yard has one lamp, two entries, and a landlord's question the clerk has been dreading all week.",
      ways: [
        { id: 'str', title: 'Shoulder through the gate', stats: ['str'], hint: "Past Mr Grey's man and into the yard. They will notice." },
        { id: 'agi', title: 'Put the yard lamp out', stats: ['agi'], hint: 'A dark yard, a crowd that scatters, and nobody to say who did it.' },
        { id: 'int', title: "Ask the landlord's question", stats: ['int'], hint: 'Stand at the back and take the meeting off the clerk with one question.' },
      ],
      text: {
        success: { headline: 'The yard empties', body: 'Forty people on the steps, and by half past seven thirty of them are on the Row arguing with each other about the rent cases instead of listening. The clerk shuts his file. A woman at a window asks for your flyer, to be fair.' },
        partial: { headline: 'Half the yard', body: "You take the entry end with you and Mr Grey's man holds the rest. It ends ragged, with the yard split and the cases half read. Half a meeting is half a meeting." },
        failure: { headline: 'The gate shuts', body: "Mr Grey's man saw you on the Row before you were at the gate. The meeting goes quiet, moves to the far steps, and finishes with the gate shut. You stand in the entry with your question and nobody to ask it." },
      },
    },
  ],
  'ashford.assembly-rooms': [
    {
      id: 'ashford.assembly-rooms.spike',
      name: 'Spike the duplicator at the Rooms',
      tier: 2,
      type: 'sabotage',
      energy: 20,
      level: 10,
      difficulty: 18,
      requires: { rank: 3 },
      target: 'alliance',
      pool: ['party-thug', 'city-police'],
      briefing: "The Alliance's duplicator runs in the committee room at the Assembly Rooms at night, and five hundred sheets are out by morning. The railings are low, the porter's round is at eleven, and a tradesman with a box of parts walks in at the side door. One bent drum and the Rooms are quiet for a week.",
      ways: [
        { id: 'agi', title: 'Over the area railings at night', stats: ['agi'], hint: 'The area window, the dark room, the drum. In and out before the round.', window: 'night' },
        { id: 'cha-int', title: 'Walk in as a tradesman', stats: ['cha', 'int'], hint: 'A box, a cap, a grievance about the stencils. Nobody questions a man with a box.' },
        { id: 'int', title: "Learn the porter's round first", stats: ['int'], hint: "Know the Rooms' hours. Then the committee room is yours for twenty minutes." },
      ],
      text: {
        success: { headline: "The drum won't turn", body: "The drum is bent a hair, the ink's in the gearing, and the stencil clamp is in your pocket. It will print again in a week, when someone finds a clamp. Tomorrow's five hundred sheets are tonight's one ruined one." },
        partial: { headline: 'Half a job', body: 'You get the ink in the gearing before a light goes on in the hall and you leave by the area. The machine will print tomorrow, badly, and ghosted. Half the stack goes out. Half is half.' },
        failure: { headline: 'The room is locked', body: "The porter changed his round. The committee room is locked, the area has a lamp you didn't know about, and you spend twenty minutes in a coal store listening to a man whistle. The duplicator runs at dawn." },
      },
    },
    {
      id: 'ashford.assembly-rooms.roll',
      name: 'Lift the constituency roll',
      tier: 2,
      type: 'theft',
      energy: 15,
      level: 10,
      difficulty: 18,
      requires: { rank: 3 },
      target: 'alliance',
      pool: ['party-thug', 'city-police'],
      briefing: "Every Alliance member in Ashford is a line in a roll on the agent's desk at the Assembly Rooms: name, street, subscription paid. The agent's clerk takes his dinner at one and leaves the window open. Your branch would pay well for a copy, and the Rooms would pay more to know who took it.",
      ways: [
        { id: 'agi', title: "The clerk's window at dinner time", stats: ['agi'], hint: 'Twelve minutes, a pencil, and the window he leaves open.', window: 'night' },
        { id: 'cha-int', title: 'Charm the clerk into a copy', stats: ['cha', 'int'], hint: "He's bored and underpaid and nobody at the Rooms ever asks him anything." },
      ],
      text: {
        success: { headline: 'Four hundred names', body: 'Four hundred names, streets and subscriptions, copied in twelve minutes in a hand you can read. The roll goes back on the desk a quarter-inch from where it was. Your branch pays on sight and asks no questions.' },
        partial: { headline: 'Half the roll', body: "You get to M before the clerk's step is on the stair and the window has to be the way out. Two hundred names is two hundred names. The branch pays half and asks about the rest." },
        failure: { headline: 'Dinner is early today', body: "The clerk eats at his desk today. You stand in the corridor with a pencil and a story about subscriptions until he asks which street, and then it's time to leave. The roll stays on the desk." },
      },
    },
  ],
};
