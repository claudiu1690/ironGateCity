import type { Content, ContentInput } from '../schemas';

/**
 * Slice 6: Campaign Events (docs/design/slice-6-together.md §3, §3.7, §4; GDD §16.3). Six types,
 * one venue per event per city (per district in the capital), and the secretary's fixture rotation.
 * Numbers that are rules (bands, rates, hands, limits) live in `EVENTS` (packages/rules).
 * Grand Rally texts are written cold (content policy §7.4): the movement's manner, never that it is right.
 */
export const campaignEventTypes: Content['campaignEventTypes'] = [
  {
    id: 'event.rally',
    name: 'Rally',
    runningName: 'rally',
    venueKinds: ['square', 'market', 'factory-gate', 'ministry'],
    roles: [
      { id: 'speaker', name: 'Speaker', stats: ['cha', 'int'], energy: 15, hint: 'On the crate. The crowd has to hear you and the heckler has to lose.' },
      { id: 'organiser', name: 'Organiser', stats: ['int'], energy: 10, hint: 'The flyers, the crate, the permit and the time. If it starts on time, that was you.' },
      { id: 'security', name: 'Security', stats: ['str'], energy: 10, hint: 'The edges of the crowd. A quiet word before it becomes a loud one.' },
      { id: 'press', name: 'Press', stats: ['int'], energy: 10, hint: 'Get the reporter there, get the name spelt right, get the photograph.' },
    ],
    baseSwing: 1.5,
    difficulty: { home: 12, capital: 14 },
    actionType: 'speech',
    art: 'scene.square',
    blurb:
      'A platform, a speaker, a crowd and someone to keep the edges tidy. The oldest thing a party does, and still the best way to be heard.',
    text: {
      triumph: {
        headline: 'The square was ours',
        body: "The crowd filled the square before the speaker was on the crate and stayed after the police had gone home. Every question had an answer and every flyer found a hand. People went home saying the party's name as if they'd always known it.",
      },
      success: {
        headline: 'They stayed to the end',
        body: 'A good crowd, a fair hearing and no trouble at the back. The speech ran long and nobody minded. The press took a name down correctly, which is rarer than it should be.',
      },
      mixed: {
        headline: 'Half the square',
        body: 'The speaker was good and the sound was bad. Half the square listened; the other half bought chestnuts. The organiser says next time bring a cart to stand on.',
      },
      fiasco: {
        headline: 'Twenty people and a heckler',
        body: 'Twenty people, a heckler who knew his business and a platform that gave at the first stamp. The press wrote it up, which was the worst of it. Nobody mentions it at the branch.',
      },
    },
  },
  {
    id: 'event.canvass-drive',
    name: 'Doorstep Drive',
    runningName: 'doorstep drive',
    venueKinds: ['street'],
    roles: [
      { id: 'coordinator', name: 'Coordinator', stats: ['int'], energy: 10, hint: 'The list, the street and who takes which doors.' },
      { id: 'canvasser-1', name: 'Door-knocker', stats: ['best'], energy: 10, hint: "A run of doors and a flyer for each that opens. You get the doors you're fit for." },
      { id: 'canvasser-2', name: 'Door-knocker', stats: ['best'], energy: 10, hint: "A run of doors and a flyer for each that opens. You get the doors you're fit for." },
      { id: 'canvasser-3', name: 'Door-knocker', stats: ['best'], energy: 10, hint: "A run of doors and a flyer for each that opens. You get the doors you're fit for." },
    ],
    baseSwing: 1.0,
    difficulty: { home: 10, capital: 12 },
    actionType: 'canvass',
    art: 'scene.street',
    blurb:
      'Crews on a street with a list and a coordinator who knows which doors to knock. Low risk, steady work, and the best first event for a new member.',
    text: {
      triumph: {
        headline: 'Every door on the street',
        body: "Four crews, one street, every door knocked before the lamps came on. The coordinator's list came back with more ticks than crosses and three names for the branch. The street will remember who came.",
      },
      success: {
        headline: 'Most of the doors',
        body: 'The crews worked the street in the light and finished in the dusk. Most doors opened; a few shut again, politely. The list is a good list.',
      },
      mixed: {
        headline: 'Half the street',
        body: 'One crew got lost and one got talked at for an hour by a man with views on drains. Half the street was done. The other half can wait for Thursday.',
      },
      fiasco: {
        headline: 'Nobody in',
        body: "Wrong night: the street was at the pictures and the dogs were not. Two doors opened and one of them was the wrong party's. The crews went home early and the list is mostly blank.",
      },
    },
  },
  {
    id: 'event.poster-night',
    name: 'Poster Night',
    runningName: 'poster night',
    // Tech §22.1 Q1 (settled 3 Oct 2026): university, square and bar added for three venues.
    venueKinds: ['street', 'station', 'docks', 'press', 'ministry', 'university', 'square', 'bar'],
    roles: [
      { id: 'printer', name: 'Printer', stats: ['int'], energy: 10, hint: 'The run: clean, dry and counted before the crews leave.' },
      { id: 'paster-agi', name: 'Paster', stats: ['agi'], energy: 10, hint: 'Up the fences, quick, before the lamps go out.' },
      { id: 'paster-str', name: 'Paster', stats: ['str'], energy: 10, hint: 'The bucket, the brush and the high fences nobody else reaches.' },
    ],
    baseSwing: 0.8,
    difficulty: { home: 10, capital: 12 },
    actionType: 'propaganda',
    art: 'scene.event-poster-night',
    blurb:
      'A run of posters, two crews with paste and a printer who counts the sheets. The town reads it at breakfast and never sees who put it there.',
    text: {
      triumph: {
        headline: 'The town woke up to us',
        body: "By dawn every fence from the yard to the market said the party's name in fresh paste. The run was clean, the crews were quick and nobody saw them because nobody came. The town read it with its breakfast.",
      },
      success: {
        headline: 'Up before dawn',
        body: "The posters went up in the dark and stayed up in the light. One crew ran out of paste and one ran out of fences. The rest of the town saw the party's name on its way to work.",
      },
      mixed: {
        headline: 'Paste and rain',
        body: 'The paste was thin and the rain came at two. Half the posters held; the rest slid off the fences like wet bread. The printer blames the weather and the weather says nothing.',
      },
      fiasco: {
        headline: 'Torn down by six',
        body: "A rival crew followed yours with a bucket and a scraper. By six the fences were bare and the town read somebody else's posters instead. The printer counted the run twice and the crews once.",
      },
    },
  },
  {
    id: 'event.grand-rally',
    name: 'Grand Rally',
    runningName: 'grand rally',
    factionId: 'vanguard',
    venueKinds: ['square', 'market'],
    roles: [
      { id: 'speaker', name: 'Speaker', stats: ['cha', 'int'], energy: 15, hint: 'The square has to hear you to the far wall.' },
      { id: 'stand-builder', name: 'Stand-builder', stats: ['str'], energy: 10, hint: 'The stand goes up at noon and must hold until the end.' },
      { id: 'usher-1', name: 'Usher', stats: ['str'], energy: 10, hint: 'The edges of the square, quiet and tidy.' },
      { id: 'usher-2', name: 'Usher', stats: ['str'], energy: 10, hint: 'The edges of the square, quiet and tidy.' },
      { id: 'lookout', name: 'Lookout', stats: ['agi'], energy: 10, hint: 'The side streets and the police. Know first.' },
    ],
    baseSwing: 2.0,
    difficulty: { home: 14, capital: 16 },
    actionType: 'speech',
    special: 'heatInRivalHeld',
    art: 'scene.event-grand-rally',
    blurb:
      'The movement fills the main square by the thousand: a stand, a speaker, ushers and a lookout. A show of numbers, and the biggest swing a rally gives.',
    text: {
      triumph: {
        headline: 'The square, by the thousand',
        body: 'The stand went up at noon and the square was full by seven, row on row in the lamplight, quiet until the speaker spoke. Nobody heckled; the ushers saw to that. The town will talk about the numbers for a week.',
      },
      success: {
        headline: 'A full square',
        body: 'A full square, a stand that held and a speech that ended on time. The ushers kept the edges tidy and the lookout kept the police informed. The movement counts the crowd twice and prints the larger number.',
      },
      mixed: {
        headline: 'Half a crowd and a cold wind',
        body: "The stand went up late and the crowd came early and left in the same order. The speaker shouted into a wind that took every third word. The movement's paper calls it a success; the square knew better.",
      },
      fiasco: {
        headline: 'The stand came down',
        body: 'A plank gave, the stand went over and the speaker went with it. The crowd laughed, which is the one thing a show of discipline cannot survive. The ushers blamed the stand-builder and the stand-builder blamed the wood.',
      },
    },
  },
  {
    id: 'event.general-strike',
    name: 'General Strike',
    runningName: 'general strike',
    factionId: 'collective',
    venueKinds: ['factory-gate', 'docks'],
    roles: [
      { id: 'shop-steward', name: 'Shop Steward', stats: ['cha', 'int'], energy: 15, hint: 'Hold the gate with your voice. The shift has to believe you.' },
      { id: 'picket-captain', name: 'Picket Captain', stats: ['str'], energy: 15, hint: 'The gate itself, from six to six.' },
      { id: 'printer', name: 'Printer', stats: ['int'], energy: 10, hint: 'The bulletin on every bench by noon.' },
      { id: 'runner', name: 'Runner', stats: ['agi'], energy: 10, hint: 'Between the gate, the hall and the other branches, all day.' },
    ],
    baseSwing: 2.0,
    difficulty: { home: 14, capital: 16 },
    actionType: 'speech',
    special: 'doubleMomentum',
    art: 'scene.news-strike',
    blurb:
      'The gate held shut from the first shift to the last, a bulletin on every bench and a runner between the branches. The town hears the quiet.',
    text: {
      triumph: {
        headline: 'The gates stayed shut',
        body: 'Not a wheel turned. The pickets held the gate from the first shift to the last, the bulletin was on every bench by noon and the runner kept the branches talking. The owners sent a man to ask what the men wanted.',
      },
      success: {
        headline: 'A day off the clock',
        body: 'The gate held through the morning and most of the afternoon. The bulletin went round; a few went in at the back and were spoken to. The town noticed the quiet.',
      },
      mixed: {
        headline: 'Half out',
        body: 'Half the shift came out and half went in, and the picket captain spent the day keeping them from arguing with each other. The bulletin was late. The owners noticed nothing they could not ignore.',
      },
      fiasco: {
        headline: 'Back by dinner',
        body: "The gate was open by nine and the picket was six people and a dog. The bulletin blamed the weather, the runner got lost and the owner's clerk counted everyone who went in. A bad day for the branch.",
      },
    },
  },
  {
    id: 'event.headline-story',
    name: 'Headline Story',
    runningName: 'headline story',
    factionId: 'alliance',
    venueKinds: ['press'],
    roles: [
      { id: 'reporter', name: 'Reporter', stats: ['int'], energy: 15, hint: 'The facts, the names, the dates. Every one has to stand up.' },
      { id: 'editor', name: 'Editor', stats: ['int'], energy: 10, hint: 'What runs, where it runs, and what gets cut.' },
      { id: 'source-handler', name: 'Source-handler', stats: ['agi'], energy: 10, hint: 'Meet the source, keep the source, and keep the source a secret.' },
      { id: 'lawyer', name: 'Lawyer', stats: ['int'], energy: 10, hint: "Read every line as the rival's lawyer would." },
    ],
    baseSwing: 2.0,
    difficulty: { home: 14, capital: 16 },
    actionType: 'propaganda',
    special: 'againstLeader',
    art: 'scene.newsroom',
    blurb:
      'A reporter, an editor, a source handled with care and a lawyer who reads every line. The story that moves a town against a rival in one morning.',
    text: {
      triumph: {
        headline: 'Front page, above the fold',
        body: "The story ran on the front page under the paper's name and the rival's. Every fact stood up, the lawyer had read every line and the source stayed a source. By noon the whole town was reading it aloud to each other.",
      },
      success: {
        headline: 'Page three, and it held',
        body: "The story ran on page three with a photograph and nobody has denied it. The editor cut the best paragraph for space. The rival's branch sent a letter, which the paper printed under the story.",
      },
      mixed: {
        headline: 'A paragraph on page nine',
        body: 'The lawyer struck two claims and the editor struck two more, and what was left was a paragraph on page nine. True, every word of it. Nobody read it.',
      },
      fiasco: {
        headline: 'Spiked',
        body: "The source dried up on the night and the lawyer would not pass a line of it. The editor spiked the story at eleven and ran the weather. The reporter's notebook is full and the paper is empty.",
      },
    },
  },
  // Slice 7 (docs/design/slice-7-nation.md §10.4, §23.6; GDD §16.3's seventh): the Town Hall, a
  // common event; when a petition to dissolve the council is open in the city, it adds townspeople's
  // signatures (Triumph 3 · Success 2 · Mixed 1 · Fiasco 0).
  {
    id: 'event.town-hall',
    name: 'Town Hall',
    runningName: 'town hall',
    venueKinds: ['square', 'university', 'court', 'theatre', 'hotel', 'library', 'faction-hq'],
    roles: [
      { id: 'moderator', name: 'Moderator', stats: ['int'], energy: 10, hint: 'The questions in order and the heckler out of it.' },
      { id: 'speaker-1', name: 'Speaker', stats: ['cha', 'int'], energy: 15, hint: 'The case, in five minutes, to people who came to argue.' },
      { id: 'speaker-2', name: 'Speaker', stats: ['cha', 'int'], energy: 15, hint: 'The answers, to the questions the first speaker left.' },
      { id: 'press', name: 'Press', stats: ['int'], energy: 10, hint: "The hall's own words in tomorrow's paper, spelt right." },
    ],
    baseSwing: 1.2,
    difficulty: { home: 12, capital: 14 },
    actionType: 'speech',
    special: 'petitionSignatures',
    art: 'scene.event-town-hall',
    blurb:
      'A hall, a platform with three chairs and a jug of water, and a town with questions. Two speakers, someone to keep order and someone to write it up. The event that turns a grievance into a petition.',
    text: {
      triumph: {
        headline: 'The hall signed',
        body: 'The hall was full before the chairs were out and stayed after the questions ran dry. Both speakers had the numbers and the moderator had the heckler. People queued at the table on the way out to put their names down.',
      },
      success: {
        headline: 'A fair hearing',
        body: 'A good hall, hard questions and answers that held. The press got the best line and the moderator got everyone home by ten. Names went down at the table, not many, enough.',
      },
      mixed: {
        headline: 'Two halls in one',
        body: 'The front rows came to listen and the back rows came to shout, and the moderator kept the two apart for most of an hour. One speaker was good. The paper printed the shouting.',
      },
      fiasco: {
        headline: 'The jug went over',
        body: 'The water jug went over in the first ten minutes and the meeting with it. A man with a grievance about drains held the floor until the caretaker put the lights out. The press left early, which was the kindest thing.',
      },
    },
  },
];

const row = (eventId: string, cityId: string, districtId: string | null, locationId: string) => ({
  eventId,
  cityId,
  districtId,
  locationId,
});
const R = 'event.rally';
const C = 'event.canvass-drive';
const P = 'event.poster-night';
const T = 'event.town-hall';

/** Design §3.7: one venue per event per city; in the capital one per district (the common three) and one district each for the signature events. */
export const eventVenues: Content['eventVenues'] = [
  row(R, 'coalport', null, 'coalport.market-row'),
  row(C, 'coalport', null, 'coalport.terraces'),
  row(P, 'coalport', null, 'coalport.quays'),
  row('event.general-strike', 'coalport', null, 'coalport.mill-gate'),
  row(R, 'duskwall', null, 'duskwall.garrison-gate'),
  row(C, 'duskwall', null, 'duskwall.rampart-row'),
  row(P, 'duskwall', null, 'duskwall.goods-yard'),
  row('event.grand-rally', 'duskwall', null, 'duskwall.quartermaster-market'),
  row(R, 'ashford', null, 'ashford.bridge-street'),
  row(C, 'ashford', null, 'ashford.weavers-row'),
  row(P, 'ashford', null, 'ashford.university'),
  row('event.headline-story', 'ashford', null, 'ashford.gazette-house'),
  row(R, 'irongate', 'irongate.government-quarter', 'irongate.forecourt'),
  row(C, 'irongate', 'irongate.government-quarter', 'irongate.chancery-row'),
  row(P, 'irongate', 'irongate.government-quarter', 'irongate.ministries'),
  row(R, 'irongate', 'irongate.old-town', 'irongate.basilica-square'),
  row(C, 'irongate', 'irongate.old-town', 'irongate.lantern-lane'),
  row(P, 'irongate', 'irongate.old-town', 'irongate.herald-house'),
  row('event.headline-story', 'irongate', 'irongate.old-town', 'irongate.herald-house'),
  row(R, 'irongate', 'irongate.station-market', 'irongate.market-square'),
  row(C, 'irongate', 'irongate.station-market', 'irongate.bombed-blocks'),
  row(P, 'irongate', 'irongate.station-market', 'irongate.tram-junction'),
  row(R, 'irongate', 'irongate.eastside', 'irongate.ironworks-gate'),
  row(C, 'irongate', 'irongate.eastside', 'irongate.foundry-row'),
  row(P, 'irongate', 'irongate.eastside', 'irongate.riverside-quays'),
  row('event.general-strike', 'irongate', 'irongate.eastside', 'irongate.ironworks-gate'),
  row(R, 'irongate', 'irongate.garrison-hill', 'irongate.esplanade'),
  row(C, 'irongate', 'irongate.garrison-hill', 'irongate.villas'),
  row(P, 'irongate', 'irongate.garrison-hill', 'irongate.gate-tavern'),
  row('event.grand-rally', 'irongate', 'irongate.garrison-hill', 'irongate.esplanade'),
  // Slice 7 (design §23.6): the Town Hall's hall in every city and district; the call sheet reads
  // *at {venue}'s hall*.
  row(T, 'coalport', null, 'coalport.union-hall'),
  row(T, 'duskwall', null, 'duskwall.archives'),
  row(T, 'ashford', null, 'ashford.university'),
  row(T, 'irongate', 'irongate.government-quarter', 'irongate.opera'),
  row(T, 'irongate', 'irongate.old-town', 'irongate.basilica-square'),
  row(T, 'irongate', 'irongate.station-market', 'irongate.grand-hotel'),
  row(T, 'irongate', 'irongate.eastside', 'irongate.iron-bridge'),
  row(T, 'irongate', 'irongate.garrison-hill', 'irongate.esplanade'),
  // Slice 7 (design §23.6): Clearwater's common events; no signature event on the lake in slice 7.
  row(R, 'clearwater', null, 'clearwater.cannery'),
  row(C, 'clearwater', null, 'clearwater.rows'),
  row(P, 'clearwater', null, 'clearwater.tram-depot'),
  row(T, 'clearwater', null, 'clearwater.st-martins'),
];

/** Design §4: the fixture's rotation, `(day + factionIndex) mod 3` over these. */
export const fixtureRotation: Content['fixtureRotation'] = [C, R, P];

/**
 * Design §5: one slot-B rotation template per faction, *Take part in the branch's event today*
 * (`kinds: ['event']`, the residence city, one attempt, counted at the sign-up). Transcribed in
 * phase A; **wired into `orderTemplates` by phase B's T10**, when a sign-up can carry it out (in the
 * rotation now it would be an order nobody can do, and it would shift the slot-B rotation the
 * existing e2e specs read).
 */
export const eventOrderTemplates: ContentInput['orderTemplates'] = [
  {
    id: 'dir.event',
    family: 'event',
    factionId: 'collective',
    slot: 'B',
    title: "Take part in the branch's event today",
    line: "There's a canvass tonight and a list with your name on it. Take a role, or take a bucket.",
    match: { kinds: ['event'], cityId: 'home' },
    target: 1,
    counts: 'attempts',
    residence: 'any',
  },
  {
    id: 'dir.v.event',
    family: 'event',
    factionId: 'vanguard',
    slot: 'B',
    title: "Take part in the branch's event today",
    line: 'The movement is in the square tonight. Take a role. Numbers are the point.',
    match: { kinds: ['event'], cityId: 'home' },
    target: 1,
    counts: 'attempts',
    residence: 'any',
  },
  {
    id: 'dir.a.event',
    family: 'event',
    factionId: 'alliance',
    slot: 'B',
    title: "Take part in the branch's event today",
    line: "The Rooms have something on this evening. A role if you can, a pair of hands if you can't.",
    match: { kinds: ['event'], cityId: 'home' },
    target: 1,
    counts: 'attempts',
    residence: 'any',
  },
];
