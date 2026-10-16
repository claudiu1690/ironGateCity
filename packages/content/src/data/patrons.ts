import type { Patron } from '../schemas';

/**
 * Slice 8 (docs/design/slice-8-life.md §5, §16.5; ADR 0055): the two patrons of the MVP, Edith
 * Crane of the *Herald* and Julius Marr the banker, both neutral, both in a battleground. Favour's
 * numbers, the tiers and the Requests' calendar are rules (`PATRON`); the six Requests each are
 * design §16.5 word for word. A Request's `{district}` rotates through the capital's five; `{until}`
 * is its third day; `{issue}` the Herald's first live capital Issue at arrival.
 */
export const patrons: Patron[] = [
  {
    id: 'crane',
    npcId: 'crane',
    name: 'Edith Crane',
    cityId: 'irongate',
    locationId: 'irongate.herald-house',
    portrait: 'portrait.crane',
    voice: 'The Herald prints what it can prove. Bring me something I can prove.',
    gossip: 'political',
    introduction: 'irongate.herald-house.morgue-file',
    favour: { act: 'plantHeadline', pc: 25 },
    piece: 'acc.cranes-pen',
    requests: [
      {
        id: 'req.crane.files',
        title: 'Two entries for my files from {district}',
        line: 'The Herald keeps files. Mine are thin on {district}. Two entries by {until}; what they say is your business. — E.C.',
        match: { kinds: ['dossierEntry'], cityId: 'irongate', districtId: 'rotate' },
        target: 2,
      },
      {
        id: 'req.crane.issue',
        title: "A speech on the Herald's Issue",
        line: "The paper is arguing about {issue} and so should the street. One speech, tagged, where the Herald's man can hear it.",
        match: { actionTypes: ['speech'], issueTagged: true, cityId: 'irongate' },
        target: 1,
      },
      {
        id: 'req.crane.boxes',
        title: 'Watch the boxes for me',
        line: "The Opera's boxes on a Thursday are the republic in miniature. Watch and listen, and tell me who sat with whom.",
        match: { kinds: ['mission'], missionTypes: ['surveillance'], cityId: 'irongate' },
        target: 1,
      },
      {
        id: 'req.crane.hill',
        title: 'Three posters where the Hill can read them',
        line: 'Garrison Hill reads the fences on its way down. Three lots of paper by {until}.',
        match: { actionTypes: ['propaganda'], districtId: 'irongate.garrison-hill' },
        target: 3,
      },
      {
        id: 'req.crane.club',
        title: 'A word at the Press Club',
        line: "My own staff tell me nothing. Listen at the club bar once and tell me what they're saying about the Herald.",
        match: { actionTypes: ['intelligence'], locationIds: ['irongate.press-club'] },
        target: 1,
      },
      {
        id: 'req.crane.print',
        title: 'Something I can print',
        line: 'You have a Case File and I have a page. Take it to the paper by {until}.',
        match: { kinds: ['expose'] },
        target: 1,
        minLevel: 16,
      },
    ],
  },
  {
    id: 'marr',
    npcId: 'marr',
    name: 'Julius Marr',
    cityId: 'clearwater',
    locationId: 'clearwater.pier-hotel',
    portrait: 'portrait.marr',
    voice: 'The bank is patient with people who are useful to it. Sit down.',
    gossip: 'asset',
    introduction: 'clearwater.casino.late-table',
    favour: { act: 'discretion', pc: 20 },
    piece: 'acc.marrs-case',
    requests: [
      {
        id: 'req.marr.cannery',
        title: 'A watch on the cannery gate',
        line: 'The cannery owes the bank and the bank likes to know who comes and goes. One watch, after dark. — J.M.',
        match: { kinds: ['mission'], missionTypes: ['surveillance'], cityId: 'clearwater' },
        target: 1,
      },
      {
        id: 'req.marr.tables',
        title: 'A word at the tables',
        line: 'The tables after midnight are where the Front says what it thinks. Be there, dressed for it.',
        match: { kinds: ['mission'], missionTypes: ['social'], locationIds: ['clearwater.casino'] },
        target: 1,
      },
      {
        id: 'req.marr.rows',
        title: 'Three conversations in the Rows',
        line: 'The Rows think the bank is against the town. Three conversations that say otherwise, by {until}.',
        match: { actionTypes: ['canvass'], cityId: 'clearwater' },
        target: 3,
      },
      {
        id: 'req.marr.ferry',
        title: 'Who comes off the ferry',
        line: 'Twice this week, the ferry stage at the hour. Who comes off with luggage and who without.',
        match: { actionTypes: ['intelligence'], locationIds: ['clearwater.harbour'] },
        target: 2,
      },
      {
        id: 'req.marr.courier',
        title: 'A speech the Courier will quote',
        line: "The Courier quotes anyone who speaks on the lake. Give it a sentence about the bank's patience.",
        match: { actionTypes: ['speech'], cityId: 'clearwater' },
        target: 1,
      },
      {
        id: 'req.marr.tea',
        title: 'Tea, Thursday',
        line: "My table by the window, four o'clock. Come dressed.",
        match: { kinds: ['mission'], missionTypes: ['social'], locationIds: ['clearwater.pier-hotel'] },
        target: 1,
      },
    ],
  },
];
