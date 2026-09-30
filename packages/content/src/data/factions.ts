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
    // Party ranks, not military ones (content-policy review §1.2, §3; GDD §5.4).
    rankTitles: ['Initiate', 'Steward', 'Bailiff', 'Prefect', 'Intendant', 'Guardian', 'Keeper of the Gate'],
    secretary: { npcId: 'stahl', signature: '— V.S.', addressedAs: 'Organiser Stahl' },
    hqRef: 'Beacon House',
    kit: { outfit: 'outfit.work-jacket', card: 'doc.party-card' },
    // Review 1 (answers §2): slot A by best trained stat; the committee; Take a job.
    welcomeOrders: {
      A: { str: 'dir.v.guard-change', int: 'dir.v.w.ration-queue', agi: 'dir.v.w.leaflets-market' },
      B: 'dir.v.report',
      C: 'dir.v.take-a-job',
    },
    card: {
      // Content-policy review §3: a party, not a militia; its Campaign Event is the Grand Rally.
      blurb:
        'Order, discipline and a strong hand. A party of clerks, foremen and old officials who want the streets quiet, the ration fair and the frontier shut. They hold Duskwall, the frontier town in the mountains.',
      signatureEvent: 'the Grand Rally',
    },
    // Slice 3 (design §10.2, §6.4, §17.4): the branch's motion, the platforms, the Unrest pair.
    branchMotion: 'ord.rally-permits',
    platforms: [
      { id: 'plat.v.order', line: 'Order in the streets, bread at a fixed price.' },
      { id: 'plat.v.frontier', line: 'The frontier shut and the books balanced.' },
      { id: 'plat.v.wards', line: 'Every street in good order by the end of the term.' },
    ],
    restoreOrders: ['dir.v.restore-canvass', 'dir.v.restore-speech'],
  },
  {
    id: 'collective',
    name: 'Red Collective',
    shortName: 'Collective',
    crest: 'circle',
    crestArt: 'crest.collective',
    homeCityId: 'coalport',
    startingBonus: { str: 2, int: 1 },
    // Rank 5 is "Delegate" (designer answer, slice-1 content §12 Q8; GDD §5.4). Ranks 4 and 6 are
    // Convenor and Tribune, not real-world titles (content-policy review §1.7, §3).
    rankTitles: ['Recruit', 'Activist', 'Organiser', 'Convenor', 'Delegate', 'Tribune', 'Chairman'],
    secretary: { npcId: 'holm', signature: '— P.H.', addressedAs: 'Secretary Holm' },
    hqRef: 'the Union Hall',
    kit: { outfit: 'outfit.mill-coat', card: 'doc.party-card' },
    welcomeOrders: {
      A: { str: 'dir.noon-break', int: 'dir.shift-change', agi: 'dir.w.leaflets-market-row' },
      B: 'dir.report',
      C: 'dir.take-a-job',
    },
    card: {
      blurb:
        'The mill and the docks against the men who own them. Strikes, solidarity, and a union hall in every town. They hold Coalport, the steel town on the river.',
      signatureEvent: 'the General Strike',
    },
    branchMotion: 'ord.long-service',
    platforms: [
      { id: 'plat.c.mill', line: 'The mill and the quays, before the men who own them.' },
      { id: 'plat.c.bread', line: 'Rent, bread and the tram. In that order.' },
      { id: 'plat.c.wards', line: 'Every street organised, every door knocked.' },
    ],
    restoreOrders: ['dir.restore-canvass', 'dir.restore-speech'],
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
    rankTitles: [
      'Volunteer',
      'Campaigner',
      'Agent',
      'Senator',
      'Representative',
      'Speaker',
      'Prime Minister',
    ],
    secretary: { npcId: 'grey', signature: '— T.G.', addressedAs: 'Mr Grey' },
    hqRef: 'the Rooms',
    kit: { outfit: 'outfit.worn-overcoat', card: 'doc.party-card' },
    welcomeOrders: {
      A: { str: 'dir.a.w.bills', int: 'dir.a.print-room', agi: 'dir.a.w.evening-run' },
      B: 'dir.a.report',
      C: 'dir.a.take-a-job',
    },
    card: {
      blurb:
        'Elections, courts and a free press. Lawyers, students and shopkeepers who think the republic can still be argued back onto its feet. They hold Ashford, the university town.',
      signatureEvent: 'the Headline Story',
    },
    branchMotion: 'ord.reading-room',
    platforms: [
      { id: 'plat.a.press', line: 'Fair report, free comment, and a council that reads.' },
      { id: 'plat.a.rule', line: 'Rents by rule, licences by rule, no favours.' },
      { id: 'plat.a.franchise', line: 'The franchise for everyone who pays the rates.' },
    ],
    restoreOrders: ['dir.a.restore-canvass', 'dir.a.restore-speech'],
  },
];
