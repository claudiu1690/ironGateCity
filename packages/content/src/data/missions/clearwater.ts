import type { MissionsByPlace } from './attach';

/**
 * Slice 7: Clearwater's four missions (docs/design/slice-7-nation.md §9.4, word for word; slice 5's
 * rules). Energy and difficulty are the rules' (MISSION_TYPES, missionDifficulty: 20 at Level 10 on a
 * battleground, 22 at Level 12); the loader holds them. Way ids are the way's stat. The illegal pair
 * targets *the leading rival in Clearwater at the last boundary* (`target: 'leader'`, as the capital's).
 */
export const clearwaterMissions: MissionsByPlace = {
  'clearwater.st-martins': [
    {
      id: 'clearwater.st-martins.supper',
      name: "Address the harvest supper at St Martin's",
      tier: 2,
      type: 'speech',
      energy: 15,
      level: 10,
      difficulty: 20,
      pool: ['party-thug', 'street-enforcer'],
      briefing:
        'The parish harvest supper fills the church hall with the Rows, the cannery and half the depot, and the priest lets each party say five minutes after the pudding. The other two parties have sent somebody. The hall has a stage, a kitchen hatch and a long table of people who came for the supper.',
      ways: [
        { id: 'cha-int', title: 'From the stage, after the pudding', stats: ['cha', 'int'], hint: 'Five minutes, a hall that has eaten, and two rivals who go after you.' },
        { id: 'int', title: 'Table by table, with the tea', stats: ['int'], hint: 'Skip the stage. Sit at every table and talk to the Rows one at a time.' },
        { id: 'best', title: 'The kitchen first, then the hall', stats: ['best'], hint: 'Help with the hatch and the hall knows you before you open your mouth.' },
      ],
      text: {
        success: { headline: 'The hall stays for the end', body: 'Five minutes becomes eight and nobody minds, because the hall has eaten and the Rows have never heard the rents said out loud in church. The rival after you gets the tea urn. The priest keeps your flyer.' },
        partial: { headline: 'The pudding wins', body: 'You go on while the pudding is coming round, which is a mistake, and get the wage and the beds in before the custard. Half the hall heard; the other half will hear it from them. Fair.' },
        failure: { headline: 'The hatch slams', body: "The kitchen hatch goes down halfway through your five minutes with a bang that empties your head. The Vanguard's man goes next, in order, and the Alliance's after him. The hall remembers the supper." },
      },
    },
  ],
  'clearwater.harbour': [
    {
      id: 'clearwater.harbour.night-watch',
      name: 'Watch the night boats on the mole',
      tier: 2,
      type: 'surveillance',
      energy: 12,
      level: 10,
      difficulty: 20,
      pool: ['city-police'],
      briefing:
        'Three nights a week a boat lands at the mole after the lighthouse keeper has gone to bed, met by a van with no name. The crates go up the Front, not to the cannery. The mole has a bollard with a view of the stage and a wind that goes through anything.',
      ways: [
        { id: 'int', title: 'From the bollard, with a flask', stats: ['int'], hint: 'Sit still, count the crates, write down the van.' },
        { id: 'agi', title: 'Along the lighthouse rail', stats: ['agi'], hint: 'Closer, higher, and a long drop to the basin if the rail is wet.' },
      ],
      text: {
        success: { headline: 'The van from the Front', body: "The boat lands at one, the van backs down the stage, and the crates go in under a tarpaulin with a hotel's name on it. Plate, name, the hour, and a face you've seen at the station. The notebook is full." },
        partial: { headline: 'The lamp on the stage', body: "A lamp comes on at the stage before the boat's in and the rest is silhouettes. One crate counted, the van's shape and the hour. Another night, without the lamp." },
        failure: { headline: 'A night of weather', body: 'The lake gets up at eleven and nothing lands but spray. A harbour policeman walks the mole at midnight and looks at the bollard, and you, twice. You go home with the flask empty.' },
      },
    },
  ],
  'clearwater.tram-depot': [
    {
      id: 'clearwater.tram-depot.timetable',
      name: "Spoil the tram company's timetable",
      tier: 2,
      type: 'disruption',
      energy: 15,
      level: 10,
      difficulty: 20,
      requires: { rank: 3 },
      target: 'leader',
      pool: ['street-enforcer', 'party-thug', 'city-police'],
      briefing:
        "The rival branch has the company's ear and the company has the morning: the duty sheets for the week are chalked on the shed board at nine and the whole town plans its day by them. Rub out one line and the Rows miss their shift; move one and the branch that sits with the company gets the blame.",
      ways: [
        { id: 'agi', title: 'Over the shed wall before dawn', stats: ['agi'], hint: 'The board, a rag, a piece of chalk, and out before the first car.' },
        { id: 'cha-int', title: 'Talk your way into the shed office', stats: ['cha', 'int'], hint: 'A clipboard and a complaint about car four. The clerk leaves you alone with the board.' },
        { id: 'int', title: 'Change the sheets, not the board', stats: ['int'], hint: 'The sheets go through a window at nine. Yours go through at five to.' },
      ],
      text: {
        success: { headline: 'The seven-ten never comes', body: "The seven-ten up the hill is on the board and not on the track, and the Rows wait twenty minutes in the rain with the rival's posters on the shelter. By noon the depot is explaining itself at the Casino. Nobody saw the chalk." },
        partial: { headline: 'Half a board', body: 'You get two lines changed before the lamp comes on in the office and you leave by the wall. One car runs late and one runs twice. The town notices the first and argues about who did it.' },
        failure: { headline: 'A clean board', body: 'The shed foreman comes in at five with a bucket and washes the board down before chalking it fresh, as he does every morning, it turns out. Your rag is in your pocket and the first car is on time. The yard dog has your scent.' },
      },
    },
  ],
  'clearwater.cannery': [
    {
      id: 'clearwater.cannery.wage-book',
      name: "Lift the cannery's wage book",
      tier: 2,
      type: 'theft',
      energy: 15,
      level: 12,
      difficulty: 22,
      requires: { rank: 3 },
      target: 'leader',
      pool: ['vanguard-doorman', 'branch-inspector', 'city-police'],
      briefing:
        "The cannery's wage book sits in the timekeeper's office with the names, the rates and a column headed 'party' that shouldn't exist. The rival branch would pay to keep it where it is. Yours would pay more to read it. The office has a frosted door, a stove and a timekeeper who goes for his tea at ten.",
      ways: [
        { id: 'agi', title: 'Through the yard window at ten', stats: ['agi'], hint: 'The window, the book, the window. Ten minutes while the kettle boils.' },
        { id: 'cha-int', title: 'Ask for your own wage line', stats: ['cha', 'int'], hint: 'A grievance, a cap in your hand and the book open on the desk between you.' },
      ],
      text: {
        success: { headline: "The column headed 'party'", body: 'The book is in your coat before the kettle whistles and the column is everything the branch said it was: who draws more, and why. The timekeeper finds a tidy desk and a draught. The branch pays, and reads.' },
        partial: { headline: 'Six pages', body: 'You get the first six pages out before boots on the stair send you back through the window. Six pages is half the loading bank, and a name the branch wanted. The rest can wait for the next tea break.' },
        failure: { headline: "The kettle's quick", body: 'The timekeeper takes his tea at the desk today. You stand in the yard with a cap in your hand and a story about a wage line that nobody believes, and leave by the gate with the hooter going. The book stays where it is.' },
      },
    },
  ],
};
