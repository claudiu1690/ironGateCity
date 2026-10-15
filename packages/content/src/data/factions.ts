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
      B: 'dir.v.welcome-b',
      C: 'dir.v.take-a-job',
    },
    card: {
      // Content-policy review §3: a party, not a militia; its Campaign Event is the Grand Rally.
      blurb:
        'Order, discipline and a strong hand. A party of clerks, foremen and old officials who want the streets quiet, the ration fair and the frontier shut. They hold Duskwall, the frontier town in the mountains.',
      signatureEvent: 'the Grand Rally',
    },
    // Slice 3 (design §10.2, §17.4): the branch's motion (the secretary's default rule), the Unrest pair.
    branchMotion: 'ord.rally-permits',
    restoreOrders: ['dir.v.restore-canvass', 'dir.v.restore-speech'],
    // Slice 7 (docs/design/slice-7-nation.md §4.6, §6.2, §6.5, §7.3, §23.5; GDD §15.10). Written cold
    // (content policy §7): a committee's chairman, a retired judge; its deputies clerks and officials.
    nationalFigure: {
      npcId: 'npc.v.albrecht',
      name: 'Dr Konrad Albrecht',
      who: "Chairman of the Vanguard's national committee; a retired appeal-court judge, Irongate",
      line: 'A republic in order, from the frontier to the forecourt.',
      portrait: 'portrait.albrecht',
    },
    pickName: 'the Acclamation',
    chairPlatforms: [
      { id: 'plat.v.order', line: 'Order in the party before order in the republic.' },
      { id: 'plat.v.reports', line: 'Every district reported on, every night.' },
      { id: 'plat.v.committee', line: "The committee's work done, in order, by the end of the term." },
    ],
    preferredLaws: ['law.public-assembly', 'law.curfew', 'law.emergency-permits', 'law.special-powers'],
    localDeputies: [
      { npcId: 'npc.v.dep.hennig', name: 'Dr Ulrich Hennig', who: 'retired schools inspector, Duskwall' },
      { npcId: 'npc.v.dep.zoller', name: 'Margit Zoller', who: 'director of the ration office, Irongate' },
      { npcId: 'npc.v.dep.brauer', name: 'Theodor Brauer', who: 'customs comptroller, retired, Duskwall' },
      { npcId: 'npc.v.dep.pfeiffer', name: 'Ernst Pfeiffer', who: 'director of the tram company, Clearwater' },
      { npcId: 'npc.v.dep.kaltenbach', name: 'Luise Kaltenbach', who: "secretary of the landlords' association, Garrison Hill" },
      { npcId: 'npc.v.dep.kranich', name: 'Walter Kranich', who: 'stationmaster, retired, Central Station' },
      { npcId: 'npc.v.dep.muhl', name: 'Dorothea Mühl', who: 'archivist, the State Archives' },
      { npcId: 'npc.v.dep.vollmer', name: 'Heinrich Vollmer', who: 'permits commissioner, retired, Duskwall' },
    ],
    house: { name: 'Vanguard House', locationId: 'irongate.vanguard-house' },
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
      B: 'dir.welcome-b',
      C: 'dir.take-a-job',
    },
    card: {
      blurb:
        'The mill and the docks against the men who own them. Strikes, solidarity, and a union hall in every town. They hold Coalport, the steel town on the river.',
      signatureEvent: 'the General Strike',
    },
    branchMotion: 'ord.long-service',
    restoreOrders: ['dir.restore-canvass', 'dir.restore-speech'],
    // Slice 7 (design §4.6, §6.2, §6.5, §7.3, §23.5). *General secretary* is every union's title
    // (content policy §7); the Congress is the party's pick.
    nationalFigure: {
      npcId: 'npc.c.brod',
      name: 'Hanna Brod',
      who: "General secretary of the Red Collective; a tram conductors' union secretary from Coalport",
      line: 'The wage, the rent and the tram, settled by the people who pay them.',
      portrait: 'portrait.brod',
    },
    pickName: 'the Congress',
    chairPlatforms: [
      { id: 'plat.c.branches', line: 'Every branch organised, every battleground worked.' },
      { id: 'plat.c.doors', line: 'The orders written by someone who knocks doors.' },
      { id: 'plat.c.hall', line: 'The party line decided in the hall, not the Herald.' },
    ],
    preferredLaws: ['law.eight-hour-day', 'law.peoples-education', 'law.universal-care', 'law.workers-charter'],
    localDeputies: [
      { npcId: 'npc.c.dep.dvorak', name: 'Stefan Dvorak', who: 'crane driver, Harbour Quays' },
      { npcId: 'npc.c.dep.tichy', name: 'Marie Tichy', who: 'nurse, the Infirmary, Coalport' },
      { npcId: 'npc.c.dep.sedlak', name: 'Jakub Sedlak', who: 'compositor, the Clarion' },
      { npcId: 'npc.c.dep.prochazka', name: 'Eva Prochazka', who: 'shop steward, the cannery, Clearwater' },
      { npcId: 'npc.c.dep.kratochvil', name: 'Milan Kratochvil', who: 'docker, Coalport' },
      { npcId: 'npc.c.dep.horak', name: 'Irena Horak', who: 'seamstress, Foundry Row, Coalport' },
      { npcId: 'npc.c.dep.vlk', name: 'Bohumil Vlk', who: 'tram driver, the Hill line, Irongate' },
      { npcId: 'npc.c.dep.rybar', name: 'Zuzana Rybar', who: "tenants' committee, Eastside" },
    ],
    house: { name: 'Union House', locationId: 'irongate.union-house' },
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
      B: 'dir.a.welcome-b',
      C: 'dir.a.take-a-job',
    },
    card: {
      blurb:
        'Elections, courts and a free press. Lawyers, students and shopkeepers who think the republic can still be argued back onto its feet. They hold Ashford, the university town.',
      signatureEvent: 'the Headline Story',
    },
    branchMotion: 'ord.reading-room',
    restoreOrders: ['dir.a.restore-canvass', 'dir.a.restore-speech'],
    // Slice 7 (design §4.6, §6.2, §6.5, §7.3, §23.5): a law professor; the Convention is the party's pick.
    nationalFigure: {
      npcId: 'npc.a.faber',
      name: 'Professor Emil Faber',
      who: 'Chairman of the Civic Alliance; a constitutional lawyer at Ashford University',
      line: 'Read the law, keep the courts, count every vote.',
      portrait: 'portrait.faber',
    },
    pickName: 'the Convention',
    chairPlatforms: [
      { id: 'plat.a.reads', line: 'A party that reads the bill before it votes.' },
      { id: 'plat.a.rooms', line: 'The orders argued in the Rooms and printed in the Gazette.' },
      { id: 'plat.a.voice', line: "Every member's vote, every member's voice." },
    ],
    preferredLaws: [
      'law.free-market',
      'law.open-borders',
      'law.rehabilitation',
      'law.press-licensing',
      'law.civic-education',
    ],
    localDeputies: [
      { npcId: 'npc.a.dep.sauer', name: 'Dr Ingrid Sauer', who: 'barrister, Chancery Row' },
      { npcId: 'npc.a.dep.lorenz', name: 'Benedikt Lorenz', who: 'bookseller, Bridge Street, Ashford' },
      { npcId: 'npc.a.dep.winter', name: 'Dr Hedda Winter', who: 'lecturer in history, Ashford' },
      { npcId: 'npc.a.dep.brandl', name: 'Oskar Brandl', who: "magistrate's clerk, the Courts" },
      { npcId: 'npc.a.dep.amann', name: 'Therese Amann', who: 'café owner, Old Town' },
      { npcId: 'npc.a.dep.reiss', name: 'Konstantin Reiss', who: "solicitor, tenants' cases, Ashford" },
      { npcId: 'npc.a.dep.steindl', name: 'Johanna Steindl', who: 'leader-writer, the Gazette' },
      { npcId: 'npc.a.dep.wendt', name: 'Paul Wendt', who: "schoolmaster, St Martin's, Clearwater" },
    ],
    house: { name: 'Concord House', locationId: 'irongate.concord-house' },
  },
];
