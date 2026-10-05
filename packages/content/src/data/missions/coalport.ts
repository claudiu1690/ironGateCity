import type { MissionsByPlace } from './attach';

/**
 * Slice 5: Coalport's missions (docs/design/slice-5-risk.md §5; the briefings, ways and texts word for
 * word). Energy and difficulty are the rules' (MISSION_TYPES, missionDifficulty); the loader holds them.
 * Way ids are the way's stat (`str`, `agi`, `int`, `cha-int`, `best`): unique within a mission.
 */
export const coalportMissions: MissionsByPlace = {
  'coalport.shipyard': [
    {
      id: 'coalport.shipyard.launch',
      name: 'Speak at the launch',
      tier: 2,
      type: 'speech',
      energy: 15,
      level: 6,
      difficulty: 14,
      pool: ['strike-picket', 'street-enforcer'],
      briefing: "The yard launches a collier at noon and two thousand people will stand on the slipway bank to watch it go. There's a platform for the owner's wife and the bottle, a gantry over the staging, and a drawing office full of men who draw the thing and never get asked.",
      ways: [
        { id: 'cha-int', title: 'From the platform, after the bottle', stats: ['cha', 'int'], hint: "The owner's party will not like it. The crowd will." },
        { id: 'str', title: 'From the gantry, among the riveters', stats: ['str'], hint: 'Climb it, hold the rail, and shout over the band.' },
        { id: 'best', title: 'The drawing office first, then the bank', stats: ['best'], hint: 'Find out what the yard wants before you tell it what you want.' },
      ],
      text: {
        success: { headline: 'The hull goes in to your name', body: 'The bottle breaks, the hull slides, and in the silence before the splash you have two thousand people and nothing between you and them. Rates, the slipway, who owns the river. The cheer when she floats is half for the ship.' },
        partial: { headline: 'The band plays you off', body: 'You get through the rates before the bandmaster decides the ship is more important and plays. Half the bank heard you. A chargehand says come back for the fitting-out, and brings three men to shake your hand.' },
        failure: { headline: 'A ship is a ship', body: "The hull sticks on the ways for a quarter of an hour and the crowd watches the yard, not you. By the time she goes in, you're one more voice in a cheer. The owner's wife looks at you once. You walk back along the bank with the flyers." },
      },
    },
  ],
  'coalport.customs-house': [
    {
      id: 'coalport.customs-house.watch',
      name: 'Watch the sheds after dark',
      tier: 2,
      type: 'surveillance',
      energy: 12,
      level: 6,
      difficulty: 14,
      pool: ['city-police'],
      briefing: 'The customs sheds close at six and open again, for some people, at ten. The mole has a bollard with a view of both doors and a lamp that goes out at eleven. Whoever comes and goes after that has a reason, and so will the harbour police if they find you there.',
      ways: [
        { id: 'int', title: 'From the mole, with a flask', stats: ['int'], hint: 'Sit still, count, write it down. The cold is the only thing against you.' },
        { id: 'agi', title: 'Along the shed roofs', stats: ['agi'], hint: 'Closer, quieter, and a long way down if the slates go.' },
      ],
      text: {
        success: { headline: "The ten o'clock door", body: "At ten a shed door opens that was locked at six. Two lorries in without a stamp, one man out with a case, and a plate you've seen on the quays. It all goes in the notebook, with the times." },
        partial: { headline: 'A lamp goes out early', body: "The lamp dies at half past nine and the sheds become shapes. You get one lorry and one plate before the rest is guesswork. Something came in tonight; you'll need another night to say what." },
        failure: { headline: 'A long cold nothing', body: 'Four hours on the mole and the sheds stay shut. A harbour policeman walks past twice and looks at you the second time. You go home with a cold and an empty page, and the sheds have your face.' },
      },
    },
  ],
  'coalport.far-bank': [
    {
      id: 'coalport.far-bank.posters',
      name: "Tear down the Vanguard's posters on the fish quay",
      tier: 2,
      type: 'vandalism',
      energy: 10,
      level: 6,
      difficulty: 14,
      requires: { rank: 3 },
      target: 'vanguard',
      pool: ['street-enforcer', 'city-police'],
      briefing: 'The Vanguard has papered the fish quay overnight: a poster on every pillar under the iron roof, ORDER AND BREAD above the gutting tables. The market opens at six and the beadle makes his round at seven. Whatever is on the pillars at eight is what the Far Bank reads today.',
      ways: [
        { id: 'agi', title: 'Before the market, in the dark', stats: ['agi'], hint: 'Nobody about, nobody to see. One pillar at a time.' },
        { id: 'str', title: 'At the busiest, in plain sight', stats: ['str'], hint: 'Rip them down with the quay watching and let them see you do it.', runIn: 25 },
      ],
      text: {
        success: { headline: 'Bare pillars by eight', body: "Every pillar under the roof is bare by the time the beadle makes his round, and the gutting tables have a view of nothing but the ferry. The Vanguard's man comes at nine with a bucket and finds he's the news." },
        partial: { headline: 'Half the roof', body: "You get the pillars on the ferry side before the beadle's lamp comes round the ice store and you leave by the fish quay steps. Half the roof is bare. The other half is talking about who did it." },
        failure: { headline: 'The paste is good', body: 'Wet night, good paste, and posters that come off in strips the size of your hand. You get two pillars done before the gutting tables arrive and you have to walk out past them with pink hands. The posters stay up.' },
      },
    },
  ],
  'coalport.terraces': [
    {
      id: 'coalport.terraces.stair-meeting',
      name: 'Break up the stair meeting on Foundry Row',
      tier: 2,
      type: 'disruption',
      energy: 15,
      level: 8,
      difficulty: 16,
      requires: { rank: 3 },
      target: 'collective',
      pool: ['branch-inspector', 'strike-picket'],
      briefing: "The Collective holds its stair meeting on Foundry Row at seven, forty people on the landings and a branch inspector at the top with the book. The fuse box is on the ground floor, the back entry is unlocked, and the one question the inspector can't answer is in your pocket.",
      ways: [
        { id: 'str', title: 'Shoulder through the door', stats: ['str'], hint: 'Up the stairs through forty people. They will notice.' },
        { id: 'agi', title: 'Pull the fuse on the stair', stats: ['agi'], hint: 'Dark landings, a crowd that panics, and nobody to say who did it.' },
        { id: 'int', title: "Ask the one question they can't answer", stats: ['int'], hint: 'Stand at the back and take the meeting off them with your mouth.' },
      ],
      text: {
        success: { headline: 'The meeting goes home early', body: 'Forty people on four landings, and by half past seven thirty of them are on the pavement arguing with each other instead of listening. The inspector shuts his book. A woman on the second floor asks for your flyer, to be fair.' },
        partial: { headline: 'A landing and a half', body: 'You take the second floor with you and the inspector holds the rest. It ends ragged, with the stair split and the book half full. Half a meeting is half a meeting.' },
        failure: { headline: 'They close ranks', body: 'The inspector saw you on the pavement before you were on the stair. The meeting goes quiet, moves up a floor, and finishes with the door shut. You stand on the landing with your question and nobody to ask it.' },
      },
    },
  ],
  'coalport.union-hall': [
    {
      id: 'coalport.union-hall.spike',
      name: 'Spike the duplicator at the Union Hall',
      tier: 2,
      type: 'sabotage',
      energy: 20,
      level: 10,
      difficulty: 18,
      requires: { rank: 3 },
      target: 'collective',
      pool: ['branch-inspector', 'city-police'],
      briefing: "The Collective's duplicator runs in the back room of the Union Hall at night, and five hundred flyers come out of it by morning. The yard wall is low, the caretaker's round is at eleven, and a tradesman with a box of parts walks in at the front door. One bent drum and the branch is quiet for a week.",
      ways: [
        { id: 'agi', title: 'Over the yard wall at night', stats: ['agi'], hint: 'The back window, the dark room, the drum. In and out before the round.' },
        { id: 'cha-int', title: 'Walk in as a tradesman', stats: ['cha', 'int'], hint: 'A box, a cap, a grievance about the stencils. Nobody questions a man with a box.' },
        { id: 'int', title: "Wait for the caretaker's round", stats: ['int'], hint: "Learn the hall's hours first. Then the room is yours for twenty minutes." },
      ],
      text: {
        success: { headline: "The drum won't turn", body: "The drum is bent a hair, the ink's in the gearing, and the stencil clamp is in your pocket. It will print again in a week, when someone finds a clamp. Tomorrow's five hundred flyers are tonight's one ruined sheet." },
        partial: { headline: 'Half a job', body: 'You get the ink in the gearing before a light goes on in the yard and you leave by the wall. The machine will print tomorrow, badly, and ghosted. Half the stack goes out. Half is half.' },
        failure: { headline: 'The room is locked', body: "The caretaker changed his round. The back room is locked, the yard has a lamp you didn't know about, and you spend twenty minutes in a coal store listening to a man whistle. The duplicator runs at dawn." },
      },
    },
    {
      id: 'coalport.union-hall.roll',
      name: "Lift the branch's membership roll",
      tier: 2,
      type: 'theft',
      energy: 15,
      level: 10,
      difficulty: 18,
      requires: { rank: 3 },
      target: 'collective',
      pool: ['branch-inspector', 'city-police'],
      briefing: "Every Collective member in Coalport is a line in a ledger on the clerk's desk at the Union Hall: name, street, dues paid. The clerk takes his dinner at one and leaves the window open. Your branch would pay well for a copy, and the Collective would pay more to know who took it.",
      ways: [
        { id: 'agi', title: "The clerk's window at dinner time", stats: ['agi'], hint: 'Twelve minutes, a pencil, and the window he leaves open.' },
        { id: 'cha-int', title: 'Charm the clerk into a copy', stats: ['cha', 'int'], hint: "He's bored and underpaid and nobody ever asks him anything." },
      ],
      text: {
        success: { headline: 'Four hundred names', body: 'Four hundred names, streets and dues, copied in twelve minutes in a hand you can read. The ledger goes back on the desk a quarter-inch from where it was. Your branch pays on sight and asks no questions.' },
        partial: { headline: 'Half the ledger', body: "You get to M before the clerk's step is on the stair and the window has to be the way out. Two hundred names is two hundred names. The branch pays half and asks about the rest." },
        failure: { headline: 'Dinner is early today', body: "The clerk eats at his desk today. You stand in the corridor with a pencil and a story about dues until he asks which branch, and then it's time to leave. The ledger stays on the desk." },
      },
    },
  ],
};
