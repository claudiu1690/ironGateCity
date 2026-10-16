import type { MissionsByPlace } from './attach';

/**
 * Slice 7: Clearwater's four missions (docs/design/slice-7-nation.md §9.4, word for word; slice 5's
 * rules). Energy and difficulty are the rules' (MISSION_TYPES, missionDifficulty: 20 at Level 10 on a
 * battleground, 22 at Level 12); the loader holds them. Way ids are the way's stat. The illegal pair
 * targets *the leading rival in Clearwater at the last boundary* (`target: 'leader'`, as the capital's).
 */
/**
 * Slice 8 (docs/design/slice-8-life.md §3.7): a society call is a tier-2 mission of type `social`:
 * legal, 15 Energy, Level 10, no run-in, no Heat, no Party XP; its difficulty is its Charisma
 * figure and the door is ten under it (rules). Three ways: Charisma, Charisma and Intelligence, best.
 */
const call = { tier: 2, type: 'social', energy: 15, level: 10, pool: [] as string[] } as const;

export const clearwaterMissions: MissionsByPlace = {
  // ----- The Front's society calls (design §3.7) ------------------------------------------------
  'clearwater.promenade': [
    {
      ...call,
      id: 'clearwater.promenade.four-oclock',
      name: "The four o'clock promenade",
      difficulty: 10,
      society: { needs: 10 },
      briefing:
        "At four the money side of town walks the mile from the bandstand to the pier and back, two abreast, and who walks with whom is the week's news. A good coat gets you a nod; a word gets you a turn of the mile. The Courier's man watches from a bench.",
      ways: [
        { id: 'cha', title: 'Fall in beside the tram director', stats: ['cha'], hint: 'He walks alone on Thursdays and likes to be agreed with.' },
        { id: 'cha-int', title: 'Take the widow’s arm and the widow’s opinions', stats: ['cha', 'int'], hint: 'She knows every hat on the mile and what it owes.' },
        { id: 'best', title: 'Legwork. Walk the mile twice, listening', stats: ['best'], hint: 'Nobody notices the third man on a bench.' },
      ],
      text: {
        success: { headline: 'A turn of the mile', body: "A turn of the mile with the director and a second with the widow, and by the pier the Front knows your name and thinks it always has. The Courier's man writes down the hat." },
        partial: { headline: 'A nod from the bandstand', body: "A nod, a name, and the widow's view of the trams at length. The director walks on. The Front has seen you; it hasn't decided." },
        failure: { headline: 'The wrong side of the mile', body: 'You fall in a step too late and walk the mile on the lake side, where the wind is. The talk stays two abreast and you stay outside it. Tomorrow at four.' },
      },
    },
  ],
  'clearwater.pier-hotel': [
    {
      ...call,
      id: 'clearwater.pier-hotel.tea',
      name: 'Tea on the terrace',
      difficulty: 15,
      society: { needs: 15 },
      briefing:
        "Tea at four on the Pier Hotel's terrace: a retired magistrate, two tram shareholders, the sanatorium's sister in her afternoon off, and Julius Marr at his table by the window, reading. The waiter seats by coat. A table on the terrace is the Front's good opinion, poured.",
      ways: [
        { id: 'cha', title: 'Take a table on the terrace as if it were yours', stats: ['cha'], hint: 'The waiter looks at the coat first and the face second.' },
        { id: 'cha-int', title: 'Ask the magistrate about the licence, and listen', stats: ['cha', 'int'], hint: 'He has views, and the table next to him has the shareholders.' },
        { id: 'best', title: "Legwork. The tradesmen's door, the kitchen, the terrace", stats: ['best'], hint: 'The kitchen knows who takes sugar and who takes the bank’s money.' },
      ],
      text: {
        success: { headline: 'A second pot', body: "The magistrate orders a second pot and the shareholders move their chairs. By five the terrace has your view of the licence and Marr has looked up from his paper once, which the waiter says is twice more than usual." },
        partial: { headline: 'One cup', body: 'One cup at the end table and the magistrate’s opinion of the trams, which is long. The shareholders leave before you reach them. The waiter remembers your name, or your coat.' },
        failure: { headline: 'The inside room', body: "The waiter seats you in the inside room, by the stairs, where the tea is the same and the company is a commercial traveller. Marr's table is through the glass. Another coat, another afternoon." },
      },
    },
  ],
  'clearwater.lido': [
    {
      ...call,
      id: 'clearwater.lido.sunday',
      name: "The lido's Sunday",
      difficulty: 12,
      society: { needs: 12 },
      briefing:
        "Sunday at the Lido: the band on the stand, two hundred deckchairs to the water, the pavilion's tea and the Courier under every arm. The front row is the town's money and its wives; the back rows are the Rows on their day off. A deckchair in the front row is a word in every ear by the second waltz.",
      ways: [
        { id: 'cha', title: 'A deckchair in the front row, and the band to talk over', stats: ['cha'], hint: 'The front row looks at your shoes.' },
        { id: 'cha-int', title: 'Hire the chairs beside the casino manager’s wife', stats: ['cha', 'int'], hint: 'She knows the licence vote by heart and says so between numbers.' },
        { id: 'best', title: 'Legwork. Carry the pavilion’s tea tray down the rows', stats: ['best'], hint: 'A tray goes anywhere. So does the man carrying it.' },
      ],
      text: {
        success: { headline: 'The second waltz', body: "By the second waltz the front row has your name and the manager's wife has your view of the licence, loudly, with the band as cover. Three deckchairs ask when you're speaking. You say Sunday." },
        partial: { headline: 'The interval', body: 'The interval is ten minutes and you get two chairs’ worth of them. The manager’s wife approves of your hat and reserves judgement on the rest. The band comes back.' },
        failure: { headline: 'The back rows', body: 'Every front-row chair is taken by eleven and the attendant looks at your coat and points to the back. The Rows are friendly and already yours. The band plays the same waltz for everyone.' },
      },
    },
  ],
  'clearwater.casino': [
    {
      ...call,
      id: 'clearwater.casino.midnight',
      name: 'The tables after midnight',
      difficulty: 20,
      card: 'scene.casino',
      society: { needs: 20 },
      briefing:
        "After midnight the Casino's committee room is a card room and the men who run the Front play in it: the company's manager, the tram director, a councillor or two off duty, the bank's man. The door is the doorman's and the doorman reads coats. A chair at the long table is worth a week of benches.",
      ways: [
        { id: 'cha', title: 'Through the door on the strength of the coat', stats: ['cha'], hint: 'The doorman has seen every coat on the Front. Yours had better be new to him.' },
        { id: 'cha-int', title: 'Lose a little at the tables and be invited upstairs', stats: ['cha', 'int'], hint: 'The manager likes a man who loses gracefully and talks sense.' },
        { id: 'best', title: "Legwork. The cashier's window, the stairs, the card room", stats: ['best'], hint: 'The cashier signs you in if you know whose chips you’re carrying.' },
      ],
      text: {
        success: { headline: 'A chair at the long table', body: 'A chair at the long table until two, a hand you lose on purpose and a conversation about the licence you win. The director says the Front could use a man like you. The bank’s man says nothing and looks at your coat.' },
        partial: { headline: 'The doorway', body: 'The doorway, and twenty minutes of the card room from it before the manager asks if you’re playing. You aren’t. The director nods on his way to the stairs, which the doorman notices.' },
        failure: { headline: 'The doorman reads coats', body: 'The doorman reads your coat, looks at your shoes and says the committee room is closed, sir. Downstairs the tables click. You lose ten at roulette for the look of it and go home.' },
      },
    },
    {
      // Design §5.4: Marr's introduction, from Associate; Favour +3 and an asset entry on a Success.
      ...call,
      id: 'clearwater.casino.late-table',
      name: 'The late table',
      difficulty: 25,
      card: 'scene.casino',
      society: { needs: 25, favour: 3, entry: 'onSuccess' },
      requires: { patron: { id: 'marr', tier: 'associate' } },
      briefing:
        "Marr's late table in the card room: four chairs, one of them his, and a card for you with the bank's crest on the back. The stakes are the Front's leases and who holds them. Nobody at the table plays for the money. Dress for it.",
      ways: [
        { id: 'cha', title: "Take Marr's card to the door and the chair he's left", stats: ['cha'], hint: "The card opens the door. The chair is yours only if the table agrees." },
        { id: 'cha-int', title: 'Play the hand Marr deals you and read the others’ faces', stats: ['cha', 'int'], hint: 'He deals to see what you do with it.' },
        { id: 'best', title: 'Legwork. Learn the three other players before you sit', stats: ['best'], hint: 'Who owes the bank, who owns the lease, who is bluffing.' },
      ],
      text: {
        success: { headline: "Marr's chair", body: 'You take the chair, play the hand and say the one thing about the lease that nobody at the table wanted said. Marr folds, smiling. At two he walks you to the door and says the bank will remember.' },
        partial: { headline: 'A hand, then the door', body: 'One hand and a glass, and the table closes over your chair like water. Marr says nothing against you, which is something. The card goes back in your coat for next week.' },
        failure: { headline: 'The card, declined', body: 'The doorman reads the card, reads you, and says the table is full tonight, sir. Through the door Marr does not look up. Another night, better dressed.' },
      },
    },
  ],
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
