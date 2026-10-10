import type { MissionsByPlace } from './attach';

/**
 * Slice 5: Duskwall's missions (docs/design/slice-5-risk.md §5; the briefings, ways and texts word for
 * word). Energy and difficulty are the rules' (MISSION_TYPES, missionDifficulty); the loader holds them.
 * Way ids are the way's stat (`str`, `agi`, `int`, `cha-int`, `best`): unique within a mission.
 */
export const duskwallMissions: MissionsByPlace = {
  'duskwall.sawmill': [
    {
      id: 'duskwall.sawmill.whistle',
      name: 'Speak at the whistle',
      tier: 2,
      type: 'speech',
      energy: 15,
      level: 6,
      difficulty: 14,
      pool: ['street-enforcer', 'vanguard-doorman'],
      briefing: "The sawmill's two shifts cross at the yard gate at two, four hundred men going in and coming out, and the whistle holds them there for three minutes while the foremen count. There's a timber stack for a platform, the mill office's steps, and a foreman's hut where the counting is done.",
      ways: [
        { id: 'cha-int', title: "From the office steps, in the foremen's hearing", stats: ['cha', 'int'], hint: 'The office will not like it. Four hundred men will.' },
        { id: 'str', title: 'From the top of the stack', stats: ['str'], hint: 'Climb it and shout over the saws. They stop for a voice that carries.' },
        { id: 'best', title: "Ask the foreman's hut first", stats: ['best'], hint: "Find out what the yard is angry about before you tell it what you'd do." },
      ],
      text: {
        success: { headline: 'The whistle goes, and they stay', body: "Four hundred men who were going home, and they stay past the whistle to hear the end. The timber price, the frontier, who owns the river. A foreman shouts for the count and nobody moves until you're done." },
        partial: { headline: 'The second whistle', body: 'You get through the rates before the second whistle goes and the gate empties in a body. A knot of sawyers at the stack stays to argue. One says come back Thursday, same stack.' },
        failure: { headline: 'Sawdust and silence', body: "The saws start up again before you've finished the first sentence and four hundred men can't hear you. You finish for the foreman's hut, which has its back to you. You climb down with the flyers still in your bag." },
      },
    },
  ],
  'duskwall.checkpoint': [
    {
      id: 'duskwall.checkpoint.watch',
      name: 'Watch the checkpoint after dark',
      tier: 2,
      type: 'surveillance',
      energy: 12,
      level: 6,
      difficulty: 14,
      pool: ['city-police', 'street-enforcer'],
      briefing: "The barrier comes down at eight and the customs men go to the inn, all but two. Between eight and midnight the road is quiet, and what goes up it goes up without a stamp. There's a rock above the barrier with a view of the hut, and a lamp on the hut that goes out when it suits them.",
      ways: [
        { id: 'int', title: 'From the rock, with a flask', stats: ['int'], hint: 'Sit still, count the lorries, write down the plates. Only the cold is against you.' },
        { id: 'agi', title: 'Along the ditch to the hut', stats: ['agi'], hint: 'Close enough to hear the chits read. Close enough to be heard.', window: 'night' },
      ],
      text: {
        success: { headline: 'What goes up at eleven', body: "At eleven the barrier lifts for a lorry with no lights and a man in the hut doesn't write anything down. Two plates, a name said twice, and the time. The notebook has a page the customs would pay for." },
        partial: { headline: 'The lamp goes out', body: "The lamp on the hut dies at ten and the road becomes engine noise and shapes. One plate before the dark. Something went up tonight without a stamp; you'll need another night to say whose." },
        failure: { headline: 'Nothing goes up', body: 'Four hours on the rock and the barrier stays down. A customs man walks the ditch twice with a lamp and finds your flask the second time. You go home with a cold and an empty page, and the hut has your face.' },
      },
    },
    {
      // Review 5 (answers §12.1, §18.2, §18.2a): a night mission, at the night rate.
      id: 'duskwall.checkpoint.log',
      name: "Lift the checkpoint's log after lights-out",
      tier: 2,
      type: 'theft',
      energy: 15,
      level: 10,
      difficulty: 18,
      requires: { rank: 3 },
      target: 'vanguard',
      pool: ['street-enforcer', 'city-police'],
      window: 'night',
      briefing: "The checkpoint's log says who crossed the Pass and when, in the night clerk's hand. The club reads it on Fridays. Anyone else who reads it first has a week of their business.",
      ways: [
        { id: 'agi', title: 'Through the window while the stove is lit', stats: ['agi'], hint: 'A lit stove keeps him in the back room. The book is on the table, and the window sticks.' },
        { id: 'cha', title: 'Talk the night clerk into a smoke outside', stats: ['cha'], hint: 'He has a cold hut, a long night and nobody to talk to. Bring the tobacco.' },
      ],
      text: {
        success: { headline: 'A week of the Pass', body: "The log is a school exercise book in the night clerk's hand, and a week of the Pass is in it: who crossed, when, who was turned back and why. It is in your coat before the stove needs feeding." },
        partial: { headline: 'Three pages', body: 'The clerk comes back for his tobacco and you get three pages, torn clean, before the window. Thursday to Saturday, and a name the club will miss on Friday. The rest stays by the stove.' },
        failure: { headline: 'The stove goes out', body: 'The stove goes out and the clerk comes to see why, with the lamp. You are gone by the time he reaches the window, and the book is where it was. The Pass has your face now.' },
      },
    },
  ],
  'duskwall.mountain-inn': [
    {
      id: 'duskwall.mountain-inn.posters',
      name: "Tear down the Alliance's posters on the inn wall",
      tier: 2,
      type: 'vandalism',
      energy: 10,
      level: 6,
      difficulty: 14,
      requires: { rank: 3 },
      target: 'alliance',
      pool: ['party-thug', 'city-police'],
      briefing: "The Alliance has papered the inn's long wall overnight, where every carter on the pass reads while he waits for the barrier. The landlord doesn't care who papers his wall; the customs men on the bench do. Whatever's on the wall when the first lorry comes down is what the pass reads today.",
      ways: [
        { id: 'agi', title: 'Before first light, from the yard', stats: ['agi'], hint: 'Nobody about but the dog. One sheet at a time.', window: 'night' },
        { id: 'str', title: "At the long table's dinner, before the whole bench", stats: ['str'], hint: 'Rip them down with the bench watching and let them say so.', runIn: 25 },
      ],
      text: {
        success: { headline: 'A bare wall by the first lorry', body: "The long wall is bare by the time the first lorry comes down the pass and the carters have nothing to read but the price of beer. The Alliance's man comes at nine with a bucket and finds he's the morning's story." },
        partial: { headline: 'The yard end', body: "You get the yard end before the dog starts and the landlord's lamp comes on upstairs. Half the wall is bare. The other half is being argued over at the long table." },
        failure: { headline: 'Good paste, cold night', body: "Frost and paste that's set like glass. Two sheets come off in strips the size of your hand before the dog has the whole yard up. The posters stay, and so does the story of who tried." },
      },
    },
  ],
  'duskwall.rampart-row': [
    {
      id: 'duskwall.rampart-row.street-meeting',
      name: 'Break up the street meeting on Rampart Row',
      tier: 2,
      type: 'disruption',
      energy: 15,
      level: 8,
      difficulty: 16,
      requires: { rank: 3 },
      target: 'vanguard',
      pool: ['street-enforcer', 'vanguard-doorman'],
      briefing: "The Vanguard holds its street meeting on Rampart Row at seven: fifty people in the road, a steward at each end and the organiser's man on a chair with the lists. The corner lamp is the only light, the back entries are open, and the one question the man on the chair can't answer is about the ration.",
      ways: [
        { id: 'str', title: 'Shoulder through the stewards', stats: ['str'], hint: 'Two stewards, fifty people, and a chair to take. They will notice.' },
        { id: 'agi', title: 'Put the corner lamp out', stats: ['agi'], hint: 'A dark street, a crowd that scatters, and nobody to say who did it.' },
        { id: 'int', title: 'Ask about the ration, loudly', stats: ['int'], hint: 'Stand at the back and take the meeting off him with one question.' },
      ],
      text: {
        success: { headline: 'The Row goes indoors', body: 'Fifty people in the road, and by half past seven thirty of them are on their own steps arguing about the ration instead of listening. The man on the chair gets down. A woman at a window asks for your flyer, to be fair.' },
        partial: { headline: 'Half the street', body: 'You take the lamp end with you and the stewards hold the rest. It ends ragged, with the Row split and the lists half read. Half a meeting is half a meeting.' },
        failure: { headline: 'The stewards close up', body: 'A steward saw you on the corner before you were in the road. The meeting goes quiet, moves under the lamp, and finishes with the stewards facing out. You stand in the entry with your question and nobody to ask it.' },
      },
    },
  ],
  'duskwall.beacon-house': [
    {
      id: 'duskwall.beacon-house.spike',
      name: 'Spike the duplicator at Beacon House',
      tier: 2,
      type: 'sabotage',
      energy: 20,
      level: 10,
      difficulty: 18,
      requires: { rank: 3 },
      target: 'vanguard',
      pool: ['vanguard-doorman', 'city-police'],
      briefing: "The Vanguard's duplicator runs in the basement of Beacon House every night, and five hundred sheets come out of it by morning. The yard wall is high, the doorman's round is at eleven, and a tradesman with a box of parts walks in at the side door. One bent drum and the district is quiet for a week.",
      ways: [
        { id: 'agi', title: 'Over the yard wall at night', stats: ['agi'], hint: 'The coal chute, the dark basement, the drum. In and out before the round.', window: 'night' },
        { id: 'cha-int', title: 'Walk in as a tradesman', stats: ['cha', 'int'], hint: 'A box, a cap, a grievance about the stencils. Nobody questions a man with a box.' },
        { id: 'int', title: "Learn the doorman's round first", stats: ['int'], hint: "Know the house's hours. Then the basement is yours for twenty minutes." },
      ],
      text: {
        success: { headline: "The drum won't turn", body: "The drum is bent a hair, the ink's in the gearing, and the stencil clamp is in your pocket. It will print again in a week, when someone finds a clamp. Tomorrow's five hundred sheets are tonight's one ruined one." },
        partial: { headline: 'Half a job', body: 'You get the ink in the gearing before a light goes on in the yard and you leave by the chute. The machine will print tomorrow, badly, and ghosted. Half the stack goes out. Half is half.' },
        failure: { headline: 'The basement is locked', body: "The doorman changed his round. The basement is locked, the yard has a lamp you didn't know about, and you spend twenty minutes in a coal store listening to a man whistle. The duplicator runs at dawn." },
      },
    },
    {
      id: 'duskwall.beacon-house.roll',
      name: 'Lift the district roll',
      tier: 2,
      type: 'theft',
      energy: 15,
      level: 10,
      difficulty: 18,
      requires: { rank: 3 },
      target: 'vanguard',
      pool: ['vanguard-doorman', 'city-police'],
      briefing: "Every Vanguard member in Duskwall is a line in a register on the clerk's desk at Beacon House: name, street, dues paid, in order. The clerk takes his dinner at one and leaves the window on the latch. Your branch would pay well for a copy, and Beacon House would pay more to know who took it.",
      ways: [
        { id: 'agi', title: "The clerk's window at dinner time", stats: ['agi'], hint: 'Twelve minutes, a pencil, and the window he leaves on the latch.', window: 'night' },
        { id: 'cha-int', title: 'Charm the clerk into a copy', stats: ['cha', 'int'], hint: "He's bored and underpaid and nobody at Beacon House ever asks him anything." },
      ],
      text: {
        success: { headline: 'Four hundred names, in order', body: 'Four hundred names, streets and dues, copied in twelve minutes in a hand you can read. The register goes back on the desk a quarter-inch from where it was. Your branch pays on sight and asks no questions.' },
        partial: { headline: 'Half the register', body: "You get to M before the clerk's step is on the stair and the window has to be the way out. Two hundred names is two hundred names. The branch pays half and asks about the rest." },
        failure: { headline: 'Dinner is early today', body: "The clerk eats at his desk today. You stand in the corridor with a pencil and a story about dues until he asks which branch, and then it's time to leave. The register stays on the desk." },
      },
    },
  ],
};
