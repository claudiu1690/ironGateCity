import type { Faction } from '../schemas';

/**
 * GDD §16.1 and §7.3. Names are the GDD's working names: faction naming is parked (CLAUDE.md), so
 * only the display strings here change when it is decided. Small marks: ■ Vanguard, ● Collective,
 * ▲ Alliance; the street and party cards use the SVG crests (`crestArt`, onboarding §13 Q6).
 * Rank titles: §5.4. Each secretary issues Party orders until a Chair exists (§13.7). Street cards,
 * kits and welcome sets: docs/design/slice-2-onboarding.md §4, §5, §7.3.
 */
export const factions: Faction[] = [
  {
    id: 'vanguard',
    name: 'Iron Vanguard',
    shortName: 'Vanguard',
    crest: 'square',
    crestArt: 'crest.vanguard',
    homeCityId: 'duskwall',
    startingBonus: { str: 3 },
    // TODO(content-policy): the Vanguard rank titles are flagged as military framing (tech design §20.3 item 1).
    rankTitles: ['Initiate', 'Footsoldier', 'Sergeant', 'Lieutenant', 'Captain', 'Commander', 'Marshal'],
    secretary: { npcId: 'stahl', signature: '— V.S.', addressedAs: 'Organiser Stahl' },
    hqRef: 'Beacon House',
    kit: { outfit: 'outfit.work-jacket', card: 'doc.party-card' },
    welcomeOrders: ['dir.v.guard-change', 'dir.v.report', 'dir.v.work-shift'],
    card: {
      // TODO(content-policy): the card text ("ex-soldiers", "the nation above all") is flagged (tech design §20.3 item 3).
      blurb:
        'Order, discipline, and the nation above all. A movement of ex-soldiers and clerks who want the streets quiet, the ration fair and the frontier shut. They hold Duskwall, the garrison town in the mountains.',
      // TODO(content-policy): the Torchlight March is flagged (tech design §20.3 item 2).
      signatureEvent: 'the Torchlight March',
    },
  },
  {
    id: 'collective',
    name: 'Red Collective',
    shortName: 'Collective',
    crest: 'circle',
    crestArt: 'crest.collective',
    homeCityId: 'coalport',
    startingBonus: { str: 2, int: 1 },
    // Rank 5 is "Delegate" (designer answer, slice-1 content §12 Q8; GDD §5.4).
    rankTitles: ['Recruit', 'Activist', 'Organiser', 'Commissar', 'Delegate', 'Comrade-General', 'Chairman'],
    secretary: { npcId: 'holm', signature: '— P.H.', addressedAs: 'Secretary Holm' },
    hqRef: 'the Union Hall',
    kit: { outfit: 'outfit.mill-coat', card: 'doc.party-card' },
    welcomeOrders: ['dir.shift-change', 'dir.report', 'dir.work-shift'],
    card: {
      blurb:
        'The mill and the docks against the men who own them. Strikes, solidarity, and a union hall in every town. They hold Coalport, the steel town on the river.',
      signatureEvent: 'the General Strike',
    },
  },
  {
    id: 'alliance',
    name: 'Civic Alliance',
    shortName: 'Alliance',
    crest: 'triangle',
    crestArt: 'crest.alliance',
    homeCityId: 'ashford',
    startingBonus: { int: 3 },
    // Rank 3 is "Agent" (GDD §5.4, slice-2 onboarding §12).
    rankTitles: ['Volunteer', 'Canvasser', 'Agent', 'Senator', 'Representative', 'Speaker', 'Prime Minister'],
    secretary: { npcId: 'grey', signature: '— T.G.', addressedAs: 'Mr Grey' },
    hqRef: 'the Rooms',
    kit: { outfit: 'outfit.worn-overcoat', card: 'doc.party-card' },
    welcomeOrders: ['dir.a.print-room', 'dir.a.report', 'dir.a.work-shift'],
    card: {
      blurb:
        'Elections, courts and a free press. Lawyers, students and shopkeepers who think the republic can still be argued back onto its feet. They hold Ashford, the university town.',
      signatureEvent: 'the Headline Story',
    },
  },
];
