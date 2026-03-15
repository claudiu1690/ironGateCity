import {
  PrismaClient,
  Faction,
  MissionType,
  ItemSlot,
  Season,
  Weather,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// 9.1  CITIES
// ─────────────────────────────────────────────────────────────────────────────

const CITIES = [
  { name: 'Irongate',    slug: 'irongate',    influenceWeight: 30, fascistPct: 33.33, communistPct: 33.33, democratPct: 33.34 },
  { name: 'Ashford',    slug: 'ashford',     influenceWeight: 15, fascistPct: 20,    communistPct: 20,    democratPct: 60    },
  { name: 'Coalport',   slug: 'coalport',    influenceWeight: 20, fascistPct: 20,    communistPct: 60,    democratPct: 20    },
  { name: 'Duskwall',   slug: 'duskwall',    influenceWeight: 20, fascistPct: 60,    communistPct: 20,    democratPct: 20    },
  { name: 'Clearwater', slug: 'clearwater',  influenceWeight: 15, fascistPct: 33.33, communistPct: 33.33, democratPct: 33.34 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 9.2  MISSIONS  (8 per city = 40 total)
// Key: each city has exactly the required types from spec §9.2
// ─────────────────────────────────────────────────────────────────────────────

type MissionSeed = {
  slug: string;
  title: string;
  description: string;
  type: MissionType;
  faction: Faction | null;
  citySlug: string;
  energyCost: number;
  minLevel: number;
  minFactionRank: number;
  minCha: number;
  minAgi: number;
  minStr: number;
  xpReward: number;
  fxpReward: number;
  ironReward: number;
  encounterChance: number;
  influenceGain: number;
  dossierReward: boolean;
};

const MISSIONS: MissionSeed[] = [
  // ── IRONGATE (capital, balanced) ──────────────────────────────────────────
  {
    slug: 'irongate-basic-combat-training',
    title: 'Basic Combat Training',
    description: 'Drill with faction recruits at the Irongate garrison yard.',
    type: MissionType.TRAINING, faction: null, citySlug: 'irongate',
    energyCost: 10, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 0, minStr: 0,
    xpReward: 60, fxpReward: 10, ironReward: 15, encounterChance: 0, influenceGain: 0, dossierReward: false,
  },
  {
    slug: 'irongate-street-informant-network',
    title: 'Street Informant Network',
    description: 'Cultivate a web of informants across Irongate\'s market district.',
    type: MissionType.INTELLIGENCE, faction: null, citySlug: 'irongate',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 0, minStr: 0,
    xpReward: 90, fxpReward: 15, ironReward: 30, encounterChance: 0.05, influenceGain: 0.3, dossierReward: true,
  },
  {
    slug: 'irongate-iron-shield-flyer-campaign',
    title: 'Iron Shield Flyer Campaign',
    description: 'Blanket Irongate\'s tenements with Fascist recruitment flyers.',
    type: MissionType.PROPAGANDA, faction: Faction.FASCIST, citySlug: 'irongate',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 3, minAgi: 0, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.08, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'irongate-workers-banner-march',
    title: "Workers' Banner March",
    description: 'Lead a column of workers through the factory quarter under red banners.',
    type: MissionType.PROPAGANDA, faction: Faction.COMMUNIST, citySlug: 'irongate',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 3, minAgi: 0, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.08, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'irongate-sabotage-railway-depot',
    title: 'Sabotage the Railway Depot',
    description: 'Disable the opposition\'s supply line before the election rally.',
    type: MissionType.DISRUPTION, faction: Faction.FASCIST, citySlug: 'irongate',
    energyCost: 25, minLevel: 3, minFactionRank: 2, minCha: 0, minAgi: 4, minStr: 8,
    xpReward: 200, fxpReward: 35, ironReward: 60, encounterChance: 0.3, influenceGain: 1.2, dossierReward: false,
  },
  {
    slug: 'irongate-lobby-city-council',
    title: 'Lobby the City Council',
    description: 'Work the floor of the Irongate Council chamber to swing a key vote.',
    type: MissionType.POLITICAL, faction: Faction.DEMOCRAT, citySlug: 'irongate',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 5, minAgi: 0, minStr: 0,
    xpReward: 150, fxpReward: 30, ironReward: 40, encounterChance: 0.05, influenceGain: 1.0, dossierReward: true,
  },
  {
    slug: 'irongate-food-kitchen',
    title: 'Organise the Food Kitchen',
    description: 'Win popular support by running a community kitchen in the slum quarter.',
    type: MissionType.SOCIAL, faction: null, citySlug: 'irongate',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 0, minStr: 0,
    xpReward: 80, fxpReward: 5, ironReward: 20, encounterChance: 0, influenceGain: 0.4, dossierReward: false,
  },
  {
    slug: 'irongate-trade-legislation-debate',
    title: 'Floor Debate: Trade Legislation',
    description: 'Deliver a polished speech in the Grand Council chamber.',
    type: MissionType.COUNCIL, faction: Faction.DEMOCRAT, citySlug: 'irongate',
    energyCost: 30, minLevel: 5, minFactionRank: 3, minCha: 10, minAgi: 0, minStr: 0,
    xpReward: 350, fxpReward: 60, ironReward: 30, encounterChance: 0, influenceGain: 1.5, dossierReward: true,
  },

  // ── ASHFORD (Democrat stronghold) ─────────────────────────────────────────
  {
    slug: 'ashford-rhetorical-debate-practice',
    title: 'Rhetorical Debate Practice',
    description: 'Sharpen your oratory at the Ashford Town Hall public forum.',
    type: MissionType.TRAINING, faction: null, citySlug: 'ashford',
    energyCost: 10, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 0, minStr: 0,
    xpReward: 60, fxpReward: 10, ironReward: 15, encounterChance: 0, influenceGain: 0, dossierReward: false,
  },
  {
    slug: 'ashford-monitor-opposition-mail',
    title: 'Monitor Opposition Mail',
    description: 'Intercept and transcribe rival faction correspondence at the postal depot.',
    type: MissionType.INTELLIGENCE, faction: null, citySlug: 'ashford',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 2, minStr: 0,
    xpReward: 90, fxpReward: 15, ironReward: 30, encounterChance: 0.05, influenceGain: 0.3, dossierReward: true,
  },
  {
    slug: 'ashford-freedom-press-broadsheet',
    title: 'Freedom Press Broadsheet',
    description: 'Print and distribute the Ashford Liberal Broadsheet across the borough.',
    type: MissionType.PROPAGANDA, faction: Faction.DEMOCRAT, citySlug: 'ashford',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 4, minAgi: 0, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.06, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'ashford-peoples-radio-broadcast',
    title: "People's Radio Broadcast",
    description: 'Hijack Ashford\'s municipal radio to broadcast Communist programming.',
    type: MissionType.PROPAGANDA, faction: Faction.COMMUNIST, citySlug: 'ashford',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 3, minAgi: 2, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.1, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'ashford-disrupt-fascist-rally',
    title: 'Disrupt the Fascist Rally',
    description: 'Scatter an Iron Shield rally in Ashford\'s market square before it gains momentum.',
    type: MissionType.DISRUPTION, faction: Faction.COMMUNIST, citySlug: 'ashford',
    energyCost: 25, minLevel: 3, minFactionRank: 2, minCha: 0, minAgi: 4, minStr: 6,
    xpReward: 200, fxpReward: 35, ironReward: 55, encounterChance: 0.28, influenceGain: 1.2, dossierReward: false,
  },
  {
    slug: 'ashford-swing-township-vote',
    title: 'Swing the Township Vote',
    description: 'Canvas the Ashford rural townships ahead of the district plebiscite.',
    type: MissionType.POLITICAL, faction: Faction.DEMOCRAT, citySlug: 'ashford',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 6, minAgi: 0, minStr: 0,
    xpReward: 150, fxpReward: 30, ironReward: 40, encounterChance: 0.04, influenceGain: 1.0, dossierReward: false,
  },
  {
    slug: 'ashford-community-clinic',
    title: 'Ashford Community Clinic',
    description: 'Staff a free clinic in the Ashford slums to win hearts and trust.',
    type: MissionType.SOCIAL, faction: null, citySlug: 'ashford',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 5, minAgi: 0, minStr: 0,
    xpReward: 80, fxpReward: 5, ironReward: 20, encounterChance: 0, influenceGain: 0.4, dossierReward: false,
  },
  {
    slug: 'ashford-draft-charter',
    title: 'Draft the Ashford Charter',
    description: 'Propose and shepherd a landmark civic charter through the Ashford Assembly.',
    type: MissionType.COUNCIL, faction: Faction.DEMOCRAT, citySlug: 'ashford',
    energyCost: 30, minLevel: 5, minFactionRank: 3, minCha: 12, minAgi: 0, minStr: 0,
    xpReward: 350, fxpReward: 60, ironReward: 30, encounterChance: 0, influenceGain: 1.5, dossierReward: true,
  },

  // ── COALPORT (Communist stronghold) ───────────────────────────────────────
  {
    slug: 'coalport-union-organizer-training',
    title: 'Union Organiser Training',
    description: 'Train at the Coalport Miners\' Union hall under seasoned agitators.',
    type: MissionType.TRAINING, faction: null, citySlug: 'coalport',
    energyCost: 10, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 0, minStr: 0,
    xpReward: 60, fxpReward: 10, ironReward: 15, encounterChance: 0, influenceGain: 0, dossierReward: false,
  },
  {
    slug: 'coalport-track-factory-supervisor',
    title: 'Track the Factory Supervisor',
    description: 'Shadow and document a hostile factory supervisor\'s movements and contacts.',
    type: MissionType.INTELLIGENCE, faction: null, citySlug: 'coalport',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 3, minStr: 0,
    xpReward: 90, fxpReward: 15, ironReward: 30, encounterChance: 0.06, influenceGain: 0.3, dossierReward: true,
  },
  {
    slug: 'coalport-red-dawn-pamphlet-drop',
    title: 'Red Dawn Pamphlet Drop',
    description: 'Flood the Coalport pit-head with Red Dawn agitprop at shift change.',
    type: MissionType.PROPAGANDA, faction: Faction.COMMUNIST, citySlug: 'coalport',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 3, minAgi: 0, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.07, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'coalport-nationalist-unity-flyer',
    title: 'Nationalist Unity Flyer',
    description: 'Post Iron Shield unity posters through Coalport\'s residential streets.',
    type: MissionType.PROPAGANDA, faction: Faction.FASCIST, citySlug: 'coalport',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 3, minAgi: 0, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.12, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'coalport-strike-power-plant',
    title: 'Strike the Power Plant',
    description: 'Lead a wildcat strike that shuts down Coalport\'s central power plant.',
    type: MissionType.DISRUPTION, faction: Faction.COMMUNIST, citySlug: 'coalport',
    energyCost: 25, minLevel: 3, minFactionRank: 2, minCha: 0, minAgi: 3, minStr: 8,
    xpReward: 200, fxpReward: 35, ironReward: 60, encounterChance: 0.32, influenceGain: 1.2, dossierReward: false,
  },
  {
    slug: 'coalport-sway-mine-foremen',
    title: 'Sway the Mine Foremen',
    description: 'Meet privately with Coalport\'s pit foremen to secure their union vote.',
    type: MissionType.POLITICAL, faction: Faction.COMMUNIST, citySlug: 'coalport',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 4, minAgi: 0, minStr: 0,
    xpReward: 150, fxpReward: 30, ironReward: 40, encounterChance: 0.05, influenceGain: 1.0, dossierReward: false,
  },
  {
    slug: 'coalport-soup-run',
    title: 'Coalport Soup Run',
    description: 'Organise a daily soup run through the Coalport industrial slums.',
    type: MissionType.SOCIAL, faction: null, citySlug: 'coalport',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 4, minAgi: 0, minStr: 0,
    xpReward: 80, fxpReward: 5, ironReward: 20, encounterChance: 0, influenceGain: 0.4, dossierReward: false,
  },
  {
    slug: 'coalport-nationalization-debate',
    title: 'Nationalization Debate',
    description: 'Present the Communist case for mine nationalisation before the Coalport Syndicate.',
    type: MissionType.COUNCIL, faction: Faction.COMMUNIST, citySlug: 'coalport',
    energyCost: 30, minLevel: 5, minFactionRank: 3, minCha: 10, minAgi: 0, minStr: 0,
    xpReward: 350, fxpReward: 60, ironReward: 30, encounterChance: 0, influenceGain: 1.5, dossierReward: true,
  },

  // ── DUSKWALL (Fascist stronghold) ─────────────────────────────────────────
  {
    slug: 'duskwall-iron-march-drill',
    title: 'Iron March Drill',
    description: 'Conduct parade-ground drills with Fascist storm troopers in Duskwall barracks.',
    type: MissionType.TRAINING, faction: null, citySlug: 'duskwall',
    energyCost: 10, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 0, minStr: 0,
    xpReward: 60, fxpReward: 10, ironReward: 15, encounterChance: 0, influenceGain: 0, dossierReward: false,
  },
  {
    slug: 'duskwall-identify-resistance-cells',
    title: 'Identify Resistance Cells',
    description: 'Map underground resistance networks operating from Duskwall\'s docklands.',
    type: MissionType.INTELLIGENCE, faction: null, citySlug: 'duskwall',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 3, minStr: 0,
    xpReward: 90, fxpReward: 15, ironReward: 30, encounterChance: 0.08, influenceGain: 0.3, dossierReward: true,
  },
  {
    slug: 'duskwall-blood-and-iron-broadsheet',
    title: 'Blood and Iron Broadsheet',
    description: 'Publish and distribute the Fascist manifesto broadsheet across Duskwall.',
    type: MissionType.PROPAGANDA, faction: Faction.FASCIST, citySlug: 'duskwall',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 3, minAgi: 0, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.06, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'duskwall-liberty-flyer',
    title: 'Liberty Flyer',
    description: 'Post Democrat civic-freedom flyers on the walls of Duskwall\'s occupied quarter.',
    type: MissionType.PROPAGANDA, faction: Faction.DEMOCRAT, citySlug: 'duskwall',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 3, minAgi: 3, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.15, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'duskwall-rout-red-brigade',
    title: 'Rout the Red Brigade',
    description: 'Break up a Communist Red Brigade cell before it can arm itself.',
    type: MissionType.DISRUPTION, faction: Faction.FASCIST, citySlug: 'duskwall',
    energyCost: 25, minLevel: 3, minFactionRank: 2, minCha: 0, minAgi: 4, minStr: 10,
    xpReward: 200, fxpReward: 35, ironReward: 60, encounterChance: 0.35, influenceGain: 1.2, dossierReward: false,
  },
  {
    slug: 'duskwall-intimidate-judges',
    title: 'Intimidate the Local Judges',
    description: 'Ensure the Duskwall judiciary rules in the Fascist interest on the zoning act.',
    type: MissionType.POLITICAL, faction: Faction.FASCIST, citySlug: 'duskwall',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 0, minAgi: 0, minStr: 8,
    xpReward: 150, fxpReward: 30, ironReward: 45, encounterChance: 0.08, influenceGain: 1.0, dossierReward: false,
  },
  {
    slug: 'duskwall-orphan-fund',
    title: 'Duskwall Orphan Fund',
    description: 'Raise money and public support for the orphans left by the dock accident.',
    type: MissionType.SOCIAL, faction: null, citySlug: 'duskwall',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 6, minAgi: 0, minStr: 0,
    xpReward: 80, fxpReward: 5, ironReward: 20, encounterChance: 0, influenceGain: 0.4, dossierReward: false,
  },
  {
    slug: 'duskwall-martial-law-proposal',
    title: 'Martial Law Proposal',
    description: 'Argue the case for emergency martial powers before the Duskwall Military Council.',
    type: MissionType.COUNCIL, faction: Faction.FASCIST, citySlug: 'duskwall',
    energyCost: 30, minLevel: 5, minFactionRank: 3, minCha: 8, minAgi: 0, minStr: 10,
    xpReward: 350, fxpReward: 60, ironReward: 30, encounterChance: 0, influenceGain: 1.5, dossierReward: true,
  },

  // ── CLEARWATER (balanced port city) ───────────────────────────────────────
  {
    slug: 'clearwater-wilderness-survival-course',
    title: 'Wilderness Survival Course',
    description: 'Train in the marshes outside Clearwater under a grizzled militia veteran.',
    type: MissionType.TRAINING, faction: null, citySlug: 'clearwater',
    energyCost: 10, minLevel: 1, minFactionRank: 1, minCha: 0, minAgi: 0, minStr: 0,
    xpReward: 60, fxpReward: 10, ironReward: 15, encounterChance: 0, influenceGain: 0, dossierReward: false,
  },
  {
    slug: 'clearwater-port-cargo-manifest-leak',
    title: 'Port Cargo Manifest Leak',
    description: 'Bribe a dock clerk for the weekly cargo manifest — invaluable intelligence.',
    type: MissionType.INTELLIGENCE, faction: null, citySlug: 'clearwater',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 3, minAgi: 0, minStr: 0,
    xpReward: 90, fxpReward: 15, ironReward: 30, encounterChance: 0.05, influenceGain: 0.3, dossierReward: true,
  },
  {
    slug: 'clearwater-solidarity-march',
    title: 'Clearwater Solidarity March',
    description: 'Lead dockworkers in a solidarity march through the Clearwater harbour front.',
    type: MissionType.PROPAGANDA, faction: Faction.COMMUNIST, citySlug: 'clearwater',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 4, minAgi: 0, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.07, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'clearwater-order-and-progress-leaflet',
    title: 'Order and Progress Leaflet',
    description: 'Distribute Iron Shield law-and-order leaflets to Clearwater\'s merchants.',
    type: MissionType.PROPAGANDA, faction: Faction.FASCIST, citySlug: 'clearwater',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 3, minAgi: 0, minStr: 0,
    xpReward: 120, fxpReward: 25, ironReward: 35, encounterChance: 0.08, influenceGain: 0.8, dossierReward: false,
  },
  {
    slug: 'clearwater-seize-dockworkers-union',
    title: "Seize the Dockworkers' Union",
    description: 'Contest control of the Clearwater Dockworkers\' Union executive.',
    type: MissionType.DISRUPTION, faction: Faction.DEMOCRAT, citySlug: 'clearwater',
    energyCost: 25, minLevel: 3, minFactionRank: 2, minCha: 5, minAgi: 2, minStr: 6,
    xpReward: 200, fxpReward: 35, ironReward: 55, encounterChance: 0.22, influenceGain: 1.2, dossierReward: false,
  },
  {
    slug: 'clearwater-cross-faction-talks',
    title: 'Broker Cross-Faction Talks',
    description: 'Negotiate a fragile truce between rival faction bosses at the Clearwater Grand Hotel.',
    type: MissionType.POLITICAL, faction: Faction.DEMOCRAT, citySlug: 'clearwater',
    energyCost: 20, minLevel: 2, minFactionRank: 1, minCha: 8, minAgi: 0, minStr: 0,
    xpReward: 150, fxpReward: 30, ironReward: 40, encounterChance: 0.04, influenceGain: 1.0, dossierReward: false,
  },
  {
    slug: 'clearwater-youth-program',
    title: 'Clearwater Youth Program',
    description: 'Run an after-school skills program for Clearwater dock children.',
    type: MissionType.SOCIAL, faction: null, citySlug: 'clearwater',
    energyCost: 15, minLevel: 1, minFactionRank: 1, minCha: 5, minAgi: 0, minStr: 0,
    xpReward: 80, fxpReward: 5, ironReward: 20, encounterChance: 0, influenceGain: 0.4, dossierReward: false,
  },
  {
    slug: 'clearwater-port-trade-agreement',
    title: 'Port Trade Agreement',
    description: 'Steer the Clearwater Port Authority Council toward a favourable trade compact.',
    type: MissionType.COUNCIL, faction: Faction.DEMOCRAT, citySlug: 'clearwater',
    energyCost: 30, minLevel: 5, minFactionRank: 3, minCha: 12, minAgi: 0, minStr: 0,
    xpReward: 350, fxpReward: 60, ironReward: 30, encounterChance: 0, influenceGain: 1.5, dossierReward: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 9.3  ITEMS  (3 per slot × 5 tiers = 75 items)
// CHA for ARMOUR: T1=2-5, T2=8-15, T3=18-28, T4=30-40, T5=42-50
// ─────────────────────────────────────────────────────────────────────────────

type ItemSeed = {
  name: string;
  slug: string;
  slot: ItemSlot;
  tier: number;
  faction: Faction | null;
  strBonus: number;
  intBonus: number;
  chaBonus: number;
  defBonus: number;
  fxpBonus: number;
  missionBonus: number;
  description: string;
  acquireMethod: string;
  ironCost: number;
};

const ITEMS: ItemSeed[] = [
  // ── WEAPONS ──────────────────────────────────────────────────────────────
  { slug:'knife',                   name:'Knife',                    slot:ItemSlot.WEAPON, tier:1, faction:null,              strBonus:2, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.02, description:'A simple iron knife. Reliable and easily concealed.',             acquireMethod:'store',       ironCost:30  },
  { slug:'brass-knuckles',          name:'Brass Knuckles',           slot:ItemSlot.WEAPON, tier:1, faction:null,              strBonus:3, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.02, description:'Forged brass — direct and brutal.',                              acquireMethod:'store',       ironCost:25  },
  { slug:'concealed-pistol',        name:'Concealed Pistol',         slot:ItemSlot.WEAPON, tier:1, faction:Faction.FASCIST,   strBonus:2, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.03, description:'An officer\'s sidearm, kept hidden under the coat.',             acquireMethod:'store',       ironCost:50  },

  { slug:'revolver',                name:'Revolver',                 slot:ItemSlot.WEAPON, tier:2, faction:null,              strBonus:5, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.04, description:'Six shots of cold iron justice.',                               acquireMethod:'store',       ironCost:120 },
  { slug:'truncheon',               name:'Truncheon',                slot:ItemSlot.WEAPON, tier:2, faction:Faction.FASCIST,   strBonus:6, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.04, description:'A weighted police truncheon stamped with the Iron Shield crest.',acquireMethod:'store',       ironCost:100 },
  { slug:'workers-hammer',          name:"Worker's Hammer",          slot:ItemSlot.WEAPON, tier:2, faction:Faction.COMMUNIST, strBonus:6, intBonus:0, chaBonus:0, defBonus:1, fxpBonus:0, missionBonus:0.04, description:'A heavy hammer repurposed from the factory floor.',              acquireMethod:'store',       ironCost:100 },

  { slug:'military-rifle',          name:'Military Rifle',           slot:ItemSlot.WEAPON, tier:3, faction:Faction.FASCIST,   strBonus:10, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.06, description:'Standard-issue bolt-action infantry rifle.',                  acquireMethod:'blackmarket', ironCost:350 },
  { slug:'submachine-gun',          name:'Submachine Gun',           slot:ItemSlot.WEAPON, tier:3, faction:null,              strBonus:9,  intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.06, description:'Compact automatic fire, preferred by enforcers.',             acquireMethod:'blackmarket', ironCost:400 },
  { slug:'propaganda-press',        name:'Propaganda Press',         slot:ItemSlot.WEAPON, tier:3, faction:Faction.COMMUNIST, strBonus:2,  intBonus:5, chaBonus:2, defBonus:0, fxpBonus:0.1, missionBonus:0.08, description:'A portable press — words as weapons.',                  acquireMethod:'craft',       ironCost:300 },

  { slug:'sniper-rifle',            name:'Sniper Rifle',             slot:ItemSlot.WEAPON, tier:4, faction:Faction.FASCIST,   strBonus:14, intBonus:2, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.09, description:'Long-range precision. One shot, one result.',                acquireMethod:'blackmarket', ironCost:800 },
  { slug:'assault-rifle',           name:'Assault Rifle',            slot:ItemSlot.WEAPON, tier:4, faction:null,              strBonus:13, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.08, description:'Automatic fire for those who need certainty.',               acquireMethod:'blackmarket', ironCost:750 },
  { slug:'peoples-cannon',          name:"People's Cannon",          slot:ItemSlot.WEAPON, tier:4, faction:Faction.COMMUNIST, strBonus:12, intBonus:3, chaBonus:0, defBonus:0, fxpBonus:0.1, missionBonus:0.1, description:'A modified field gun wheeled out for the revolution.',      acquireMethod:'quest',       ironCost:900 },

  { slug:'iron-executioner',        name:'Iron Executioner',         slot:ItemSlot.WEAPON, tier:5, faction:Faction.FASCIST,   strBonus:20, intBonus:0, chaBonus:0, defBonus:2, fxpBonus:0, missionBonus:0.12, description:'The ceremonial blade of the Iron Chancellor\'s guard.',       acquireMethod:'quest',       ironCost:2500 },
  { slug:'red-star-blade',          name:'Red Star Blade',           slot:ItemSlot.WEAPON, tier:5, faction:Faction.COMMUNIST, strBonus:18, intBonus:4, chaBonus:2, defBonus:0, fxpBonus:0.15, missionBonus:0.12, description:'Forged by revolutionary artisans, etched with the star.',acquireMethod:'quest',       ironCost:2500 },
  { slug:'justice-sword',           name:'Justice Sword',            slot:ItemSlot.WEAPON, tier:5, faction:Faction.DEMOCRAT,  strBonus:16, intBonus:5, chaBonus:4, defBonus:2, fxpBonus:0.1, missionBonus:0.12, description:'Symbol of righteous authority. Worn, not swung.',        acquireMethod:'quest',       ironCost:2500 },

  // ── ARMOUR ───────────────────────────────────────────────────────────────
  { slug:'workers-coat',            name:"Worker's Coat",            slot:ItemSlot.ARMOUR, tier:1, faction:Faction.COMMUNIST, strBonus:0, intBonus:0, chaBonus:2, defBonus:2, fxpBonus:0, missionBonus:0.01, description:'A rough linen coat stitched with a small red star.',             acquireMethod:'store',       ironCost:40  },
  { slug:'street-jacket',           name:'Street Jacket',            slot:ItemSlot.ARMOUR, tier:1, faction:null,              strBonus:0, intBonus:0, chaBonus:3, defBonus:2, fxpBonus:0, missionBonus:0.01, description:'An unremarkable jacket that lets you blend into any crowd.',    acquireMethod:'store',       ironCost:35  },
  { slug:'grey-tunic',              name:'Grey Tunic',               slot:ItemSlot.ARMOUR, tier:1, faction:Faction.FASCIST,   strBonus:0, intBonus:0, chaBonus:2, defBonus:3, fxpBonus:0, missionBonus:0.01, description:'A crisp grey tunic in the parade style of the Iron Shield.',   acquireMethod:'store',       ironCost:40  },

  { slug:'party-uniform',           name:'Party Uniform',            slot:ItemSlot.ARMOUR, tier:2, faction:Faction.COMMUNIST, strBonus:0, intBonus:1, chaBonus:10, defBonus:4, fxpBonus:0, missionBonus:0.02, description:'Full dress uniform of a Communist Party cadre.',               acquireMethod:'store',       ironCost:200 },
  { slug:'officers-coat',           name:"Officer's Coat",           slot:ItemSlot.ARMOUR, tier:2, faction:Faction.FASCIST,   strBonus:1, intBonus:0, chaBonus:12, defBonus:5, fxpBonus:0, missionBonus:0.02, description:'Tailored Fascist officer\'s great-coat with brass buttons.',   acquireMethod:'store',       ironCost:220 },
  { slug:'civic-suit',              name:'Civic Suit',               slot:ItemSlot.ARMOUR, tier:2, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:1, chaBonus:8,  defBonus:3, fxpBonus:0, missionBonus:0.02, description:'A sharp three-piece suit for the civic-minded politician.',   acquireMethod:'store',       ironCost:180 },

  { slug:'commanders-dress',        name:"Commander's Dress Uniform",slot:ItemSlot.ARMOUR, tier:3, faction:Faction.FASCIST,   strBonus:2, intBonus:0, chaBonus:20, defBonus:7, fxpBonus:0, missionBonus:0.04, description:'Full-dress military regalia of a Fascist field commander.',     acquireMethod:'store',       ironCost:600 },
  { slug:'commissars-uniform',      name:"Commissar's Uniform",      slot:ItemSlot.ARMOUR, tier:3, faction:Faction.COMMUNIST, strBonus:1, intBonus:2, chaBonus:18, defBonus:6, fxpBonus:0.05, missionBonus:0.04, description:'The authoritative uniform of a Communist commissar.',      acquireMethod:'store',       ironCost:580 },
  { slug:'senators-attire',         name:"Senator's Attire",         slot:ItemSlot.ARMOUR, tier:3, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:3, chaBonus:22, defBonus:5, fxpBonus:0, missionBonus:0.05, description:'Distinguished senatorial robes that command the chamber.',    acquireMethod:'store',       ironCost:620 },

  { slug:'generals-regalia',        name:"General's Regalia",        slot:ItemSlot.ARMOUR, tier:4, faction:Faction.FASCIST,   strBonus:4, intBonus:0, chaBonus:35, defBonus:10, fxpBonus:0, missionBonus:0.06, description:'Ceremonial dress of the Iron Shield\'s supreme general.',       acquireMethod:'blackmarket', ironCost:1800 },
  { slug:'red-marshal-coat',        name:'Red Marshal Coat',         slot:ItemSlot.ARMOUR, tier:4, faction:Faction.COMMUNIST, strBonus:3, intBonus:3, chaBonus:30, defBonus:9,  fxpBonus:0.1, missionBonus:0.06, description:'The legendary coat of the Red Marshal of the Revolution.',  acquireMethod:'quest',       ironCost:1800 },
  { slug:'high-diplomat-suit',      name:'High Diplomat Suit',       slot:ItemSlot.ARMOUR, tier:4, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:5, chaBonus:40, defBonus:7,  fxpBonus:0, missionBonus:0.07, description:'A bespoke suit worn at the highest levels of government.',    acquireMethod:'blackmarket', ironCost:2000 },

  { slug:'iron-chancellor-robe',    name:'Iron Chancellor\'s Robe',  slot:ItemSlot.ARMOUR, tier:5, faction:Faction.FASCIST,   strBonus:6, intBonus:2, chaBonus:48, defBonus:14, fxpBonus:0, missionBonus:0.1, description:'The supreme vestment of the Irongate Chancellorship.',          acquireMethod:'quest',       ironCost:5000 },
  { slug:'revolutionary-mantle',    name:'Revolutionary Mantle',     slot:ItemSlot.ARMOUR, tier:5, faction:Faction.COMMUNIST, strBonus:4, intBonus:5, chaBonus:42, defBonus:12, fxpBonus:0.2, missionBonus:0.1, description:'Draped in the blood of the revolution, worn with pride.',     acquireMethod:'quest',       ironCost:5000 },
  { slug:'grand-constitution-gown', name:'Grand Constitution Gown',  slot:ItemSlot.ARMOUR, tier:5, faction:Faction.DEMOCRAT,  strBonus:2, intBonus:8, chaBonus:50, defBonus:10, fxpBonus:0.1, missionBonus:0.12, description:'The ceremonial gown of the Grand President of the Republic.',acquireMethod:'quest',       ironCost:5000 },

  // ── UTILITY ──────────────────────────────────────────────────────────────
  { slug:'lockpick-set',            name:'Lockpick Set',             slot:ItemSlot.UTILITY, tier:1, faction:null,              strBonus:0, intBonus:1, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.03, description:'A worn leather roll of picks and tension wrenches.',             acquireMethod:'store',       ironCost:30  },
  { slug:'forged-papers-t1',        name:'Forged Papers',            slot:ItemSlot.UTILITY, tier:1, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:1, chaBonus:1, defBonus:0, fxpBonus:0, missionBonus:0.03, description:'Passable forgeries of civic identity documents.',               acquireMethod:'blackmarket', ironCost:40  },
  { slug:'whistle',                 name:'Signal Whistle',           slot:ItemSlot.UTILITY, tier:1, faction:null,              strBonus:0, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.02, description:'A tin whistle used to coordinate street actions.',              acquireMethod:'store',       ironCost:10  },

  { slug:'surveillance-kit',        name:'Surveillance Kit',         slot:ItemSlot.UTILITY, tier:2, faction:null,              strBonus:0, intBonus:3, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.05, description:'Binoculars, a notebook and a camera in a plain satchel.',       acquireMethod:'store',       ironCost:160 },
  { slug:'agitator-pamphlets',      name:'Agitator Pamphlets',       slot:ItemSlot.UTILITY, tier:2, faction:Faction.COMMUNIST, strBonus:0, intBonus:2, chaBonus:1, defBonus:0, fxpBonus:0.05, missionBonus:0.04, description:'A stack of incendiary political pamphlets.',              acquireMethod:'store',       ironCost:120 },
  { slug:'interrogation-kit',       name:'Interrogation Kit',        slot:ItemSlot.UTILITY, tier:2, faction:Faction.FASCIST,   strBonus:2, intBonus:2, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.05, description:'Tools for extracting information under pressure.',              acquireMethod:'blackmarket', ironCost:180 },

  { slug:'radio-transmitter',       name:'Radio Transmitter',        slot:ItemSlot.UTILITY, tier:3, faction:null,              strBonus:0, intBonus:4, chaBonus:0, defBonus:0, fxpBonus:0.05, missionBonus:0.06, description:'A portable short-wave radio for clandestine coordination.',  acquireMethod:'blackmarket', ironCost:450 },
  { slug:'printing-press',          name:'Portable Printing Press',  slot:ItemSlot.UTILITY, tier:3, faction:Faction.COMMUNIST, strBonus:0, intBonus:5, chaBonus:2, defBonus:0, fxpBonus:0.1, missionBonus:0.07, description:'A compact press that churns out leaflets by the thousand.',  acquireMethod:'craft',       ironCost:500 },
  { slug:'intelligence-dossier',    name:'Intelligence Dossier',     slot:ItemSlot.UTILITY, tier:3, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:6, chaBonus:0, defBonus:0, fxpBonus:0.1, missionBonus:0.08, description:'A thick file of compromising intelligence on key figures.',   acquireMethod:'quest',       ironCost:400 },

  { slug:'encryption-device',       name:'Encryption Device',        slot:ItemSlot.UTILITY, tier:4, faction:null,              strBonus:0, intBonus:7, chaBonus:0, defBonus:0, fxpBonus:0.1, missionBonus:0.08, description:'A mechanical cipher machine for secure communications.',     acquireMethod:'blackmarket', ironCost:1200 },
  { slug:'explosive-charge',        name:'Explosive Charge',         slot:ItemSlot.UTILITY, tier:4, faction:Faction.FASCIST,   strBonus:5, intBonus:2, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.1, description:'A pre-set demolition charge for infrastructure operations.',    acquireMethod:'blackmarket', ironCost:1000 },
  { slug:'mass-leaflet-machine',    name:'Mass Leaflet Machine',     slot:ItemSlot.UTILITY, tier:4, faction:Faction.COMMUNIST, strBonus:0, intBonus:6, chaBonus:3, defBonus:0, fxpBonus:0.15, missionBonus:0.1, description:'Industrial propaganda production in a portable chassis.',    acquireMethod:'craft',       ironCost:1100 },

  { slug:'quantum-cipher',          name:'Quantum Cipher',           slot:ItemSlot.UTILITY, tier:5, faction:null,              strBonus:0, intBonus:10, chaBonus:0, defBonus:0, fxpBonus:0.2, missionBonus:0.12, description:'State-of-the-art unbreakable communication encryption.',     acquireMethod:'quest',       ironCost:3000 },
  { slug:'iron-network-device',     name:'Iron Network Device',      slot:ItemSlot.UTILITY, tier:5, faction:Faction.FASCIST,   strBonus:3, intBonus:10, chaBonus:0, defBonus:0, fxpBonus:0.15, missionBonus:0.12, description:'The surveillance backbone of the Iron Shield\'s network.', acquireMethod:'quest',       ironCost:3500 },
  { slug:'peoples-broadcast-tower', name:"People's Broadcast Tower", slot:ItemSlot.UTILITY, tier:5, faction:Faction.COMMUNIST, strBonus:0, intBonus:10, chaBonus:5, defBonus:0, fxpBonus:0.2, missionBonus:0.14, description:'A mobile tower that can broadcast propaganda city-wide.',    acquireMethod:'quest',       ironCost:3500 },

  // ── ACCESSORY ────────────────────────────────────────────────────────────
  { slug:'iron-pin',                name:'Iron Pin',                 slot:ItemSlot.ACCESSORY, tier:1, faction:Faction.FASCIST,   strBonus:0, intBonus:0, chaBonus:1, defBonus:0, fxpBonus:0, missionBonus:0.01, description:'A small lapel pin in the form of the Iron Shield crest.',        acquireMethod:'store',       ironCost:10  },
  { slug:'red-star-badge',          name:'Red Star Badge',           slot:ItemSlot.ACCESSORY, tier:1, faction:Faction.COMMUNIST, strBonus:0, intBonus:0, chaBonus:1, defBonus:0, fxpBonus:0, missionBonus:0.01, description:'A bright red star pinned to the lapel.',                        acquireMethod:'store',       ironCost:10  },
  { slug:'liberty-ribbon',          name:'Liberty Ribbon',           slot:ItemSlot.ACCESSORY, tier:1, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:0, chaBonus:1, defBonus:0, fxpBonus:0, missionBonus:0.01, description:'A blue-and-white ribbon worn by civic liberalists.',             acquireMethod:'store',       ironCost:10  },

  { slug:'silver-insignia',         name:'Silver Insignia',          slot:ItemSlot.ACCESSORY, tier:2, faction:Faction.FASCIST,   strBonus:0, intBonus:0, chaBonus:3, defBonus:0, fxpBonus:0, missionBonus:0.02, description:'Polished silver rank insignia worn at the collar.',             acquireMethod:'store',       ironCost:80  },
  { slug:'factory-medallion',       name:'Factory Medallion',        slot:ItemSlot.ACCESSORY, tier:2, faction:Faction.COMMUNIST, strBonus:0, intBonus:1, chaBonus:3, defBonus:0, fxpBonus:0.02, missionBonus:0.02, description:'An award medallion from the Central Planning Commissariat.',acquireMethod:'store',       ironCost:75  },
  { slug:'civic-brooch',            name:'Civic Brooch',             slot:ItemSlot.ACCESSORY, tier:2, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:1, chaBonus:4, defBonus:0, fxpBonus:0, missionBonus:0.02, description:'A handsome civic brooch bearing the scales of justice.',       acquireMethod:'store',       ironCost:85  },

  { slug:'golden-eagle',            name:'Golden Eagle Clasp',       slot:ItemSlot.ACCESSORY, tier:3, faction:Faction.FASCIST,   strBonus:1, intBonus:0, chaBonus:7, defBonus:0, fxpBonus:0, missionBonus:0.04, description:'A gilded eagle clasp for the officer\'s cloak.',              acquireMethod:'store',       ironCost:280 },
  { slug:'peoples-medal',           name:"People's Medal",           slot:ItemSlot.ACCESSORY, tier:3, faction:Faction.COMMUNIST, strBonus:0, intBonus:2, chaBonus:6, defBonus:0, fxpBonus:0.05, missionBonus:0.04, description:'Awarded by the Soviet of Workers for distinguished service.',acquireMethod:'quest',       ironCost:250 },
  { slug:'justice-seal',            name:'Justice Seal',             slot:ItemSlot.ACCESSORY, tier:3, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:2, chaBonus:8, defBonus:0, fxpBonus:0, missionBonus:0.05, description:'An engraved seal ring bearing the motto of the Republic.',    acquireMethod:'store',       ironCost:300 },

  { slug:'iron-cross',              name:'Iron Cross',               slot:ItemSlot.ACCESSORY, tier:4, faction:Faction.FASCIST,   strBonus:2, intBonus:0, chaBonus:12, defBonus:1, fxpBonus:0, missionBonus:0.06, description:'The highest Fascist decoration for valorous service.',         acquireMethod:'quest',       ironCost:900 },
  { slug:'red-banner-sash',         name:'Red Banner Sash',          slot:ItemSlot.ACCESSORY, tier:4, faction:Faction.COMMUNIST, strBonus:0, intBonus:3, chaBonus:10, defBonus:0, fxpBonus:0.1, missionBonus:0.06, description:'A ceremonial sash worn by Communist Central Committee members.',acquireMethod:'quest',       ironCost:850 },
  { slug:'democratic-charter-badge',name:'Democratic Charter Badge', slot:ItemSlot.ACCESSORY, tier:4, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:4, chaBonus:15, defBonus:0, fxpBonus:0, missionBonus:0.07, description:'A gilded badge awarded to signatories of the National Charter.',acquireMethod:'quest',       ironCost:950 },

  { slug:'supreme-commander-medal', name:'Supreme Commander Medal',  slot:ItemSlot.ACCESSORY, tier:5, faction:Faction.FASCIST,   strBonus:4, intBonus:2, chaBonus:18, defBonus:2, fxpBonus:0, missionBonus:0.1, description:'Awarded only by the Chancellor. One of six in existence.',      acquireMethod:'quest',       ironCost:2500 },
  { slug:'revolutionary-hero-star', name:'Revolutionary Hero Star',  slot:ItemSlot.ACCESSORY, tier:5, faction:Faction.COMMUNIST, strBonus:2, intBonus:5, chaBonus:15, defBonus:0, fxpBonus:0.2, missionBonus:0.1, description:'The supreme honour of the Communist revolution.',            acquireMethod:'quest',       ironCost:2500 },
  { slug:'grand-charter-crest',     name:'Grand Charter Crest',      slot:ItemSlot.ACCESSORY, tier:5, faction:Faction.DEMOCRAT,  strBonus:2, intBonus:6, chaBonus:20, defBonus:1, fxpBonus:0.1, missionBonus:0.1, description:'The Grand Republic crest, worn by the President\'s council.',  acquireMethod:'quest',       ironCost:2500 },

  // ── DOCUMENT ─────────────────────────────────────────────────────────────
  { slug:'forged-id',               name:'Forged Identity Papers',   slot:ItemSlot.DOCUMENT, tier:1, faction:null,              strBonus:0, intBonus:1, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.02, description:'Low-quality forgeries, good enough for a street check.',          acquireMethod:'blackmarket', ironCost:20  },
  { slug:'party-card',              name:'Party Membership Card',    slot:ItemSlot.DOCUMENT, tier:1, faction:null,              strBonus:0, intBonus:0, chaBonus:1, defBonus:0, fxpBonus:0.02, missionBonus:0.02, description:'Official faction membership card — opens doors, closes others.', acquireMethod:'store',       ironCost:15  },
  { slug:'travel-permit',           name:'Travel Permit',            slot:ItemSlot.DOCUMENT, tier:1, faction:null,              strBonus:0, intBonus:0, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.03, description:'A stamped permit allowing inter-city movement.',                  acquireMethod:'store',       ironCost:25  },

  { slug:'intelligence-brief',      name:'Intelligence Brief',       slot:ItemSlot.DOCUMENT, tier:2, faction:null,              strBonus:0, intBonus:3, chaBonus:0, defBonus:0, fxpBonus:0, missionBonus:0.04, description:'A classified intelligence summary from a handler.',              acquireMethod:'quest',       ironCost:120 },
  { slug:'press-credential',        name:'Press Credential',         slot:ItemSlot.DOCUMENT, tier:2, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:2, chaBonus:2, defBonus:0, fxpBonus:0.05, missionBonus:0.04, description:'A journalist press card that grants access to public events.',   acquireMethod:'store',       ironCost:100 },
  { slug:'party-directive',         name:'Party Directive',          slot:ItemSlot.DOCUMENT, tier:2, faction:Faction.COMMUNIST, strBonus:0, intBonus:2, chaBonus:1, defBonus:0, fxpBonus:0.05, missionBonus:0.04, description:'A signed directive from the Communist Party Central Bureau.',   acquireMethod:'store',       ironCost:110 },

  { slug:'military-commission',     name:'Military Commission',      slot:ItemSlot.DOCUMENT, tier:3, faction:Faction.FASCIST,   strBonus:2, intBonus:3, chaBonus:2, defBonus:0, fxpBonus:0, missionBonus:0.06, description:'A field commission granting officer authority over units.',        acquireMethod:'quest',       ironCost:400 },
  { slug:'peoples-court-order',     name:"People's Court Order",     slot:ItemSlot.DOCUMENT, tier:3, faction:Faction.COMMUNIST, strBonus:0, intBonus:4, chaBonus:2, defBonus:0, fxpBonus:0.1, missionBonus:0.06, description:'An order signed by the People\'s Tribunal — legally binding.',  acquireMethod:'quest',       ironCost:380 },
  { slug:'parliamentary-pass',      name:'Parliamentary Pass',       slot:ItemSlot.DOCUMENT, tier:3, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:4, chaBonus:3, defBonus:0, fxpBonus:0.08, missionBonus:0.07, description:'A security pass granting access to Parliament\'s inner chambers.',acquireMethod:'quest',       ironCost:420 },

  { slug:'supreme-decree',          name:'Supreme Decree',           slot:ItemSlot.DOCUMENT, tier:4, faction:Faction.FASCIST,   strBonus:3, intBonus:5, chaBonus:3, defBonus:0, fxpBonus:0, missionBonus:0.09, description:'A personal decree signed by the Chancellor himself.',              acquireMethod:'quest',       ironCost:1200 },
  { slug:'central-committee-order', name:'Central Committee Order',  slot:ItemSlot.DOCUMENT, tier:4, faction:Faction.COMMUNIST, strBonus:0, intBonus:6, chaBonus:3, defBonus:0, fxpBonus:0.15, missionBonus:0.09, description:'An order from the inner ring of the Communist Central Committee.',acquireMethod:'quest',       ironCost:1200 },
  { slug:'presidential-warrant',    name:'Presidential Warrant',     slot:ItemSlot.DOCUMENT, tier:4, faction:Faction.DEMOCRAT,  strBonus:0, intBonus:6, chaBonus:4, defBonus:0, fxpBonus:0.12, missionBonus:0.1, description:'A warrant issued under the President\'s personal seal.',         acquireMethod:'quest',       ironCost:1300 },

  { slug:'iron-mandate',            name:'Iron Mandate',             slot:ItemSlot.DOCUMENT, tier:5, faction:Faction.FASCIST,   strBonus:5, intBonus:8, chaBonus:5, defBonus:0, fxpBonus:0, missionBonus:0.14, description:'The supreme instrument of Fascist executive authority.',           acquireMethod:'quest',       ironCost:4000 },
  { slug:'revolutionary-charter',   name:'Revolutionary Charter',    slot:ItemSlot.DOCUMENT, tier:5, faction:Faction.COMMUNIST, strBonus:2, intBonus:10, chaBonus:5, defBonus:0, fxpBonus:0.25, missionBonus:0.14, description:'The founding charter of the Communist revolution.',           acquireMethod:'quest',       ironCost:4000 },
  { slug:'grand-constitution',      name:'Grand Constitution',       slot:ItemSlot.DOCUMENT, tier:5, faction:Faction.DEMOCRAT,  strBonus:2, intBonus:10, chaBonus:6, defBonus:0, fxpBonus:0.2, missionBonus:0.15, description:'The original handwritten constitution of the Grand Republic.', acquireMethod:'quest',       ironCost:4000 },
];

// ─────────────────────────────────────────────────────────────────────────────
// 9.4  JOBS  (§6.2 — 10 jobs)
// ─────────────────────────────────────────────────────────────────────────────

type JobSeed = {
  title: string;
  slug: string;
  tier: number;
  energyCost: number;
  minLevel: number;
  minStr: number;
  minInt: number;
  minAgi: number;
  minFactionRank: number;
  ironMinPay: number;
  ironMaxPay: number;
  requiresTravel: boolean;
};

const JOBS: JobSeed[] = [
  { slug:'street-vendor',      title:'Street Vendor',       tier:1, energyCost:10, minLevel:1,  minStr:0,  minInt:0,  minAgi:0,  minFactionRank:0, ironMinPay:20,  ironMaxPay:40,  requiresTravel:false },
  { slug:'factory-worker',     title:'Factory Worker',      tier:1, energyCost:10, minLevel:1,  minStr:6,  minInt:0,  minAgi:0,  minFactionRank:0, ironMinPay:25,  ironMaxPay:45,  requiresTravel:true  },
  { slug:'driver',             title:'Driver',              tier:1, energyCost:15, minLevel:1,  minStr:0,  minInt:0,  minAgi:4,  minFactionRank:0, ironMinPay:30,  ironMaxPay:55,  requiresTravel:true  },
  { slug:'market-trader',      title:'Market Trader',       tier:2, energyCost:15, minLevel:3,  minStr:0,  minInt:4,  minAgi:0,  minFactionRank:0, ironMinPay:50,  ironMaxPay:90,  requiresTravel:false },
  { slug:'security-guard',     title:'Security Guard',      tier:2, energyCost:20, minLevel:3,  minStr:8,  minInt:0,  minAgi:2,  minFactionRank:0, ironMinPay:55,  ironMaxPay:95,  requiresTravel:true  },
  { slug:'newspaper-reporter', title:'Newspaper Reporter',  tier:2, energyCost:20, minLevel:5,  minStr:0,  minInt:10, minAgi:0,  minFactionRank:0, ironMinPay:70,  ironMaxPay:120, requiresTravel:true  },
  { slug:'factory-foreman',    title:'Factory Foreman',     tier:2, energyCost:20, minLevel:5,  minStr:10, minInt:4,  minAgi:0,  minFactionRank:1, ironMinPay:80,  ironMaxPay:140, requiresTravel:true  },
  { slug:'lawyers-clerk',      title:"Lawyer's Clerk",      tier:3, energyCost:25, minLevel:8,  minStr:0,  minInt:12, minAgi:0,  minFactionRank:0, ironMinPay:110, ironMaxPay:180, requiresTravel:true  },
  { slug:'professor',          title:'Professor',           tier:3, energyCost:25, minLevel:10, minStr:0,  minInt:15, minAgi:0,  minFactionRank:0, ironMinPay:140, ironMaxPay:220, requiresTravel:true  },
  { slug:'political-aide',     title:'Political Aide',      tier:3, energyCost:30, minLevel:10, minStr:0,  minInt:10, minAgi:0,  minFactionRank:3, ironMinPay:160, ironMaxPay:260, requiresTravel:true  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 9.5  NPC ENEMY TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const NPC_TEMPLATES = [
  { slug:'street-enforcer',    name:'Street Enforcer',     faction:Faction.FASCIST,   str:12, hp:40, minLevel:1,  special:null             },
  { slug:'militia-guard',      name:'Militia Guard',       faction:Faction.FASCIST,   str:18, hp:60, minLevel:5,  special:null             },
  { slug:'red-guard',          name:'Red Guard',           faction:Faction.COMMUNIST, str:14, hp:50, minLevel:3,  special:null             },
  { slug:'peoples-commissar',  name:"People's Commissar",  faction:Faction.COMMUNIST, str:10, hp:35, minLevel:1,  special:'debuff_accuracy'},
  { slug:'party-thug',         name:'Party Thug',          faction:Faction.DEMOCRAT,  str:10, hp:35, minLevel:1,  special:null             },
  { slug:'city-police',        name:'City Police',         faction:null,              str:16, hp:55, minLevel:1,  special:null             },
  { slug:'secret-police',      name:'Secret Police',       faction:Faction.FASCIST,   str:22, hp:75, minLevel:20, special:null             },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── Seeding Irongate City database ─────────────────────────────\n');

  // ── Cities ────────────────────────────────────────────────────────────────
  console.log('Cities…');
  const cityMap: Record<string, string> = {};

  for (const c of CITIES) {
    const city = await prisma.city.upsert({
      where: { slug: c.slug },
      update: { name: c.name, influenceWeight: c.influenceWeight },
      create: { name: c.name, slug: c.slug, influenceWeight: c.influenceWeight },
    });
    cityMap[c.slug] = city.id;

    await prisma.cityInfluence.upsert({
      where: { cityId: city.id },
      update: { fascistPct: c.fascistPct, communistPct: c.communistPct, democratPct: c.democratPct },
      create: { cityId: city.id, fascistPct: c.fascistPct, communistPct: c.communistPct, democratPct: c.democratPct },
    });
  }
  console.log(`  ✓ ${CITIES.length} cities seeded`);

  // ── Missions ──────────────────────────────────────────────────────────────
  console.log('Missions…');
  for (const m of MISSIONS) {
    const cityId = cityMap[m.citySlug];
    if (!cityId) throw new Error(`Unknown city slug: ${m.citySlug}`);

    await prisma.mission.upsert({
      where: { slug: m.slug },
      update: {
        title: m.title, description: m.description, type: m.type, faction: m.faction,
        cityId, energyCost: m.energyCost, minLevel: m.minLevel, minFactionRank: m.minFactionRank,
        minCha: m.minCha, minAgi: m.minAgi, minStr: m.minStr, xpReward: m.xpReward,
        fxpReward: m.fxpReward, ironReward: m.ironReward, encounterChance: m.encounterChance,
        influenceGain: m.influenceGain, dossierReward: m.dossierReward,
      },
      create: {
        slug: m.slug, title: m.title, description: m.description, type: m.type, faction: m.faction,
        cityId, energyCost: m.energyCost, minLevel: m.minLevel, minFactionRank: m.minFactionRank,
        minCha: m.minCha, minAgi: m.minAgi, minStr: m.minStr, xpReward: m.xpReward,
        fxpReward: m.fxpReward, ironReward: m.ironReward, encounterChance: m.encounterChance,
        influenceGain: m.influenceGain, dossierReward: m.dossierReward,
      },
    });
  }
  console.log(`  ✓ ${MISSIONS.length} missions seeded`);

  // ── Items ─────────────────────────────────────────────────────────────────
  console.log('Items…');
  for (const item of ITEMS) {
    await prisma.item.upsert({
      where: { slug: item.slug },
      update: item,
      create: item,
    });
  }
  console.log(`  ✓ ${ITEMS.length} items seeded`);

  // ── Jobs ──────────────────────────────────────────────────────────────────
  console.log('Jobs…');
  for (const job of JOBS) {
    await prisma.job.upsert({
      where: { slug: job.slug },
      update: job,
      create: { ...job, cityId: null },
    });
  }
  console.log(`  ✓ ${JOBS.length} jobs seeded`);

  // ── NPC Templates ─────────────────────────────────────────────────────────
  console.log('NPC templates…');
  for (const npc of NPC_TEMPLATES) {
    await prisma.npcTemplate.upsert({
      where: { slug: npc.slug },
      update: npc,
      create: npc,
    });
  }
  console.log(`  ✓ ${NPC_TEMPLATES.length} NPC templates seeded`);

  // ── Initial Weather ────────────────────────────────────────────────────────
  const weatherCount = await prisma.weatherState.count();
  if (weatherCount === 0) {
    await prisma.weatherState.create({ data: { season: Season.SPRING, weather: Weather.CLEAR } });
    console.log('  ✓ Initial weather: SPRING / CLEAR');
  }

  console.log('\n── Seed complete ───────────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
