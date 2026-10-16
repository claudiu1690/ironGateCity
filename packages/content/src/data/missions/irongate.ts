import type { MissionsByPlace } from './attach';

/**
 * Slice 5: Irongate's missions (docs/design/slice-5-risk.md §5; the briefings, ways and texts word for
 * word). Energy and difficulty are the rules' (MISSION_TYPES, missionDifficulty); the loader holds them.
 * Way ids are the way's stat (`str`, `agi`, `int`, `cha-int`, `best`): unique within a mission.
 */
/**
 * Slice 8 (docs/design/slice-8-life.md §3.7): a society call is a tier-2 mission of type `social`:
 * legal, 15 Energy, Level 10, no run-in, no Heat, no Party XP; its difficulty is its Charisma
 * figure and the door is ten under it (rules). Three ways: Charisma, Charisma and Intelligence, best.
 */
const call = { tier: 2, type: 'social', energy: 15, level: 10, pool: [] as string[] } as const;

export const irongateMissions: MissionsByPlace = {
  // ----- The capital's society calls and Crane's introduction (design §3.7, §5.4) ---------------
  'irongate.opera': [
    {
      ...call,
      id: 'irongate.opera.interval',
      name: 'The interval in the boxes',
      difficulty: 15,
      society: { needs: 15 },
      briefing:
        "The Opera's interval: twenty minutes, the boxes open to the corridor, and the republic's money leaning on the rail with a glass. A minister's wife, two deputies, a Chancery Row lawyer, and the talk that the chamber never minutes. The usher reads coats before tickets.",
      ways: [
        { id: 'cha', title: 'The corridor of the boxes, glass in hand', stats: ['cha'], hint: 'Walk it as if you had a box. Somebody will ask which.' },
        { id: 'cha-int', title: "Ask the minister's wife about the second act", stats: ['cha', 'int'], hint: 'She has an opinion of the tenor and of the Ministries, in that order.' },
        { id: 'best', title: "Legwork. The stage door, the flies, the boxes from behind", stats: ['best'], hint: "The stagehands know which box is whose and don't care about coats." },
      ],
      text: {
        success: { headline: 'Box seven', body: "Box seven for the second act, by invitation of the minister's wife, who wants your view of the tenor and gets your view of the estimates. Two deputies lean in. The usher brings a second chair." },
        partial: { headline: 'The corridor', body: 'The corridor, two glasses and a deputy who mistakes you for someone useful and talks until the bell. Half of what he says is true. The boxes close with you outside them.' },
        failure: { headline: 'The bell', body: "The usher reads the coat, looks for the ticket and finds the stalls. The bell goes. You hear the second act from the back of the circle, which has a view of the boxes and none of the talk." },
      },
    },
  ],
  'irongate.grand-hotel': [
    {
      ...call,
      id: 'irongate.grand-hotel.thursday-dance',
      name: 'The Thursday dance',
      difficulty: 20,
      society: { needs: 20 },
      briefing:
        "The Grand's ballroom on a Thursday: a band, a card from the manager at the door, and every family in the capital that has a daughter and a view. The deputies dance badly and talk well. A card gets you in; a coat gets you a partner; a partner gets you the room.",
      ways: [
        { id: 'cha', title: 'The manager’s card, and the first waltz', stats: ['cha'], hint: 'The room watches the first waltz. Dance it like you belong.' },
        { id: 'cha-int', title: 'Sit out the waltz with the deputies by the bar', stats: ['cha', 'int'], hint: 'They dance less and say more.' },
        { id: 'best', title: 'Legwork. The cloakroom, the band’s break, the terrace', stats: ['best'], hint: 'The cloakroom girl knows every coat in the room and whose it really is.' },
      ],
      text: {
        success: { headline: 'The last waltz', body: "Three dances, a card for the next Thursday and a deputy's daughter who asks what your party would do about the trams. The deputy asks the same, later, by the bar. The manager sends a glass over." },
        partial: { headline: 'The band’s break', body: "One dance and the band's break, which you spend with two shareholders and a lawyer who talks about the estimates. The room has seen you. It will decide next Thursday." },
        failure: { headline: 'The cloakroom', body: "The manager's card is for another night and the cloakroom girl says so kindly. You hear the waltz from the lobby, where the hall porter looks at your coat for the second time this month." },
      },
    },
    {
      id: 'irongate.grand-hotel.lobby-watch',
      name: "Watch the Grand Hotel's lobby after midnight",
      tier: 2,
      type: 'surveillance',
      energy: 12,
      level: 10,
      difficulty: 20,
      pool: ['city-police'],
      briefing: "The Grand's lobby is where deputies dine and lobbyists wait, and after midnight it is where the ones who don't want to be seen together are seen together. There's an armchair behind the palms with a view of the lift, and a hall porter who knows every face in the capital.",
      ways: [
        { id: 'int', title: 'The armchair behind the palms', stats: ['int'], hint: "A paper, a coffee you don't drink, and the lift in view. The hall porter is against you." },
        { id: 'agi', title: 'The service stairs', stats: ['agi'], hint: 'Closer, quieter, and no explanation if the night manager finds you there.' },
      ],
      text: {
        success: { headline: 'Who came down at one', body: "At one the lift brings down a minister, a man who isn't his secretary, and a lawyer from Chancery Row who leaves by the side door. Three names and a time go in the notebook. The hall porter never looks up." },
        partial: { headline: "The porter's eye", body: "The hall porter looks at your coat at half past twelve and keeps looking. You get one name off the lift before it's wiser to leave by the dining room. Something was arranged tonight; you'll need another night to say what." },
        failure: { headline: 'A quiet night at the Grand', body: "Two hours behind the palms and the lift brings down nobody but a drunk deputy and his hat. The night manager asks if sir is a guest. Sir is not. You leave with an empty page and the porter's memory of your face." },
      },
    },
  ],
  'irongate.herald-house': [
    {
      // Design §5.4 (§21.1 Q12): Crane's introduction, from Associate: an entry on a capital name of
      // the player's choosing (the briefing's name picker); Iron 48, the tier-2 rate on 12 Energy. A
      // legal watch indoors: the pool is the loader's one-or-more, at the type's 5 % run-in.
      id: 'irongate.herald-house.morgue-file',
      name: 'The morgue file',
      tier: 2,
      type: 'surveillance',
      energy: 12,
      level: 10,
      difficulty: 20,
      requires: { patron: { id: 'crane', tier: 'associate' } },
      pool: ['city-police'],
      dossier: { category: 'political', subject: 'choose' },
      briefing:
        "The Herald's morgue: forty years of cuttings in brown envelopes, one for every name in the capital, and a key Edith Crane does not lend to anyone. Tonight she lends it. Pick a name; the envelope is thin or thick, and the night is long. The morgue clerk counts the envelopes back at six.",
      ways: [
        { id: 'int', title: 'Read the envelope end to end and copy what matters', stats: ['int'], hint: 'Forty years of cuttings. The one line is in there somewhere.' },
        { id: 'cha-int', title: 'Ask the morgue clerk what the envelope leaves out', stats: ['cha', 'int'], hint: 'He has read them all and remembers what was spiked.' },
        { id: 'best', title: 'Legwork. Cross the envelope with the Herald’s bound volumes', stats: ['best'], hint: 'What the cutting says and what the paper printed are not always the same.' },
      ],
      text: {
        success: { headline: 'A thick envelope', body: "The envelope is thick and the one line is on the third cutting from the bottom, in Crane's own pencil: a meeting, a date, no minutes. You copy it and put the envelope back a little thinner than it was." },
        partial: { headline: 'A thin envelope', body: 'A thin envelope and a clerk who remembers more than it holds. You get a line, and a question you did not have before. The key goes back on her desk at six.' },
        failure: { headline: 'Six o’clock', body: 'The clerk counts the envelopes back at six and yours is still open on the table with nothing copied. Crane says the morgue keeps. So does she.' },
      },
    },
  ],
  'irongate.forecourt': [
    {
      id: 'irongate.forecourt.rally',
      name: 'Speak to the lunch-hour rally on the Forecourt',
      tier: 2,
      type: 'speech',
      energy: 15,
      level: 10,
      difficulty: 20,
      pool: ['street-enforcer', 'strike-picket', 'party-thug'],
      briefing: "At one the whole Quarter eats on the Forecourt, and on Thursdays somebody always has the plinth. Today it's yours if you want it: a thousand clerks, the Parliament steps for a backdrop, a constable who looks bored, and a rival crew at the back who have come for the heckling.",
      ways: [
        { id: 'cha-int', title: 'From the plinth, to the whole Forecourt', stats: ['cha', 'int'], hint: 'The ministries will not like it. A thousand clerks will.' },
        { id: 'str', title: 'From the Parliament steps, over their heads', stats: ['str'], hint: 'Climb them, hold the rail, and shout over the trams.' },
        { id: 'best', title: "The messengers' room first, then the plinth", stats: ['best'], hint: "Find out what the Quarter is angry about before you tell it what you'd do." },
      ],
      text: {
        success: { headline: 'A thousand lunches, one voice', body: "The Forecourt stops eating. The cuts, the estimates, who decides. A deputy heckles from the steps and the crowd laughs on your side; the rival crew at the back go for a sandwich. By two, the Quarter has an opinion it didn't bring to lunch." },
        partial: { headline: 'The bell cuts you off', body: 'You get through the cuts before the bell for the vote goes and the steps empty of everyone who matters. A few hundred clerks stay to hear the end. One asks which party. You tell him.' },
        failure: { headline: 'Rain off the dome', body: "The rain comes off the dome at ten past one and the Forecourt goes under the arcades without you. You finish for the statue and the rival crew, who enjoy it. Same plinth next Thursday, if it's dry." },
      },
    },
  ],
  'irongate.tram-junction': [
    {
      id: 'irongate.tram-junction.shelters',
      name: "Tear down the rivals' posters on the tram shelters",
      tier: 2,
      type: 'vandalism',
      energy: 10,
      level: 10,
      difficulty: 20,
      requires: { rank: 3 },
      target: 'leader',
      pool: ['street-enforcer', 'strike-picket', 'party-thug', 'city-police'],
      briefing: "Somebody papered every shelter at the Junction overnight and every tram queue in the capital is reading them. Eight shelters, a bucket and a brush are all it took them; a scraper and ten minutes is all it takes you. The inspectors' hut has a window on the platforms and the first tram is at five.",
      ways: [
        { id: 'agi', title: 'Before the first tram, platform by platform', stats: ['agi'], hint: 'Nobody about, nobody to see. One shelter at a time.' },
        { id: 'str', title: 'In the morning rush, before the queues', stats: ['str'], hint: 'Rip them down with the queues watching and let them say so.', runIn: 25 },
      ],
      text: {
        success: { headline: 'Eight bare shelters', body: "Every shelter at the Junction is bare glass by the time the first tram comes through, and every queue in the capital reads the timetable instead. Their man comes at nine with a bucket and finds he's the morning's story." },
        partial: { headline: 'Five platforms', body: "You get the five near platforms before the inspectors' hut lights up and you leave by the Market Square side. Five shelters are bare. The other three are being argued over in the queues." },
        failure: { headline: 'The paste is good', body: "Wet night, good paste, and posters that come off the glass in strips the size of your hand. You get one shelter done before the inspector's lamp comes down the platform. The posters stay, and the Junction has your face." },
      },
    },
    {
      // Review 5 (answers §12.1, §18.2, §18.2a: a speech, 15 Energy): a night mission, at the night rate.
      id: 'irongate.tram-junction.last-tram',
      name: 'Ride the last tram with the Eastside flyers',
      tier: 2,
      type: 'speech',
      energy: 15,
      level: 10,
      difficulty: 20,
      pool: ['street-enforcer', 'party-thug'],
      window: 'night',
      briefing: "The last tram to Eastside carries the late shift home, two hundred people with nothing to read. The conductor doesn't mind flyers; he minds trouble. Who gets off at the Iron Bridge decides which it is.",
      ways: [
        { id: 'cha-int', title: 'A seat by the door, a flyer for every stop', stats: ['cha', 'int'], hint: 'A word for every face that gets on. The conductor is with you while nobody shouts.' },
        { id: 'agi', title: 'The whole bundle on the rear platform, and off at the bridge', stats: ['agi'], hint: "Faster than anyone can object, then the step at the Iron Bridge. Don't miss it." },
      ],
      text: {
        success: { headline: 'The whole car', body: 'A flyer for every stop and a word for every face, and by the Iron Bridge the whole car is reading. The conductor takes one for his wife. Two hundred people get off in Eastside with your side in their pockets.' },
        partial: { headline: 'Half a car', body: 'The front half of the car takes flyers and the back half takes offence, and the conductor rings for the bridge before it comes to anything. A hundred flyers out and a hundred still in your coat.' },
        failure: { headline: 'Off at the bridge', body: 'A man in the back seat wants to know who printed it, loudly, and the car takes his side. The conductor stops at the bridge and says this is your stop. The flyers go out of the window behind you.' },
      },
    },
  ],
  'irongate.station-buffet': [
    {
      id: 'irongate.station-buffet.meeting',
      name: 'Break up the rival meeting at the Station Buffet',
      tier: 2,
      type: 'disruption',
      energy: 15,
      level: 10,
      difficulty: 20,
      requires: { rank: 3 },
      target: 'leader',
      pool: ['street-enforcer', 'strike-picket', 'party-thug', 'city-police'],
      briefing: "The party leading this district holds its night meeting in the Buffet's back room at midnight: thirty porters and tram crews, a committee man on a chair with the lists. The fuse box is behind the counter, the yard door is on the latch, and the question the chair can't answer is about the fare.",
      ways: [
        { id: 'str', title: 'Shoulder through the back-room door', stats: ['str'], hint: 'Thirty men with their cups down. They will notice.' },
        { id: 'agi', title: 'Pull the fuse behind the counter', stats: ['agi'], hint: 'A dark room, a crowd that scatters, and nobody to say who did it.' },
        { id: 'int', title: 'Ask about the fare, loudly', stats: ['int'], hint: 'Stand in the doorway and take the meeting off him with one question.' },
      ],
      text: {
        success: { headline: 'The back room empties', body: 'Thirty men at the tables, and by half past twelve twenty of them are on the platforms arguing with each other about the fare instead of listening. The man on the chair gets down. A tram conductor asks for your flyer, to be fair.' },
        partial: { headline: 'Half the tables', body: 'You take the door end with you and the committee man holds the rest. It ends ragged, with the room split and the lists half read. Half a meeting is half a meeting.' },
        failure: { headline: 'The counterman shuts the door', body: 'The counterman saw you at the arch before you were at the door. The meeting goes quiet, moves to the far tables, and finishes with the door shut. You stand under the arch with your question and nobody to ask it.' },
      },
    },
  ],
};
