import type { MissionsByPlace } from './attach';

/**
 * Slice 5: Irongate's missions (docs/design/slice-5-risk.md §5; the briefings, ways and texts word for
 * word). Energy and difficulty are the rules' (MISSION_TYPES, missionDifficulty); the loader holds them.
 * Way ids are the way's stat (`str`, `agi`, `int`, `cha-int`, `best`): unique within a mission.
 */
export const irongateMissions: MissionsByPlace = {
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
  'irongate.grand-hotel': [
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
