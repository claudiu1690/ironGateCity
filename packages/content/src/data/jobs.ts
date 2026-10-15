import type { Job } from '../schemas';

/**
 * The nine jobs of the three home cities (GDD §9.2). Ids are prefixed by city: a job belongs to one
 * location, and a player who moves (slice 4) keeps it where it is (slice-2 cities §3 Q1; Coalport's
 * ids were renamed in slice 2, migration 002). Coalport: docs/design/slice-1-content.md §3;
 * Duskwall and Ashford: docs/design/slice-2-cities.md §1.3, §2.3.
 */
export const jobs: Job[] = [
  {
    id: 'coalport-street-vendor',
    name: 'Street vendor',
    locationId: 'coalport.market-row',
    unlock: { level: 1 },
    dailyPay: 100,
    blurb: "Matches, bootlaces and yesterday's paper from a stall on Market Row. Nobody asks for a permit.",
  },
  {
    id: 'coalport-factory-worker',
    name: 'Factory worker',
    locationId: 'coalport.mill-gate',
    unlock: { level: 1, stats: { str: 5 } },
    dailyPay: 180,
    factionPayBonus: { collective: 0.2 },
    blurb:
      'Eight hours on the rolling floor of the Coalport Steel Mill. Collective members draw a fifth more.',
  },
  {
    id: 'coalport-driver',
    name: 'Driver',
    locationId: 'coalport.quays',
    unlock: { level: 3, stats: { agi: 10 } },
    dailyPay: 240, // Review 5 (answers §5, GDD §9.2): was 200.
    blurb:
      'The dock lorry between the quay and the goods yard, a full load each way. Needs a quick hand on the cobbles.',
  },
  {
    id: 'duskwall-stores-hand',
    name: 'Stores hand',
    locationId: 'duskwall.garrison-gate',
    unlock: { level: 1, stats: { str: 5 } },
    dailyPay: 180,
    factionPayBonus: { vanguard: 0.2 },
    blurb:
      'Eight hours counting seized tobacco and bonded spirits in the customs stores. Vanguard members draw a fifth more.',
  },
  {
    id: 'duskwall-street-vendor',
    name: 'Street vendor',
    locationId: 'duskwall.quartermaster-market',
    unlock: { level: 1 },
    dailyPay: 100,
    blurb:
      "Bootlaces, tobacco and yesterday's Sentinel from a stall in the Customs Market. The inspector has stopped asking.",
  },
  {
    id: 'duskwall-driver',
    name: 'Driver',
    locationId: 'duskwall.goods-yard',
    unlock: { level: 3, stats: { agi: 10 } },
    dailyPay: 240, // Review 5 (answers §5, GDD §9.2): was 200.
    blurb:
      'The yard lorry between the sidings and the customs depot, a full load each way. Needs a quick hand on the frost.',
  },
  {
    id: 'ashford-copy-clerk',
    name: 'Copy clerk',
    locationId: 'ashford.gazette-house',
    unlock: { level: 1, stats: { int: 5 } },
    dailyPay: 180,
    factionPayBonus: { alliance: 0.2 },
    blurb:
      "Eight hours on the Gazette's copy desk, checking other people's sentences. Alliance members draw a fifth more.",
  },
  {
    id: 'ashford-street-vendor',
    name: 'Street vendor',
    locationId: 'ashford.bridge-street',
    unlock: { level: 1 },
    dailyPay: 100,
    blurb:
      'The Gazette, the Herald and matches from a news-stand on Bridge Street. Nobody asks for a permit.',
  },
  {
    id: 'ashford-driver',
    name: 'Driver',
    locationId: 'ashford.bridge-street',
    unlock: { level: 3, stats: { agi: 10 } },
    dailyPay: 240, // Review 5 (answers §5, GDD §9.2): was 200.
    blurb:
      'The market van between Bridge Street and the station goods shed, a full load each way. Needs a quick hand on the wet setts.',
  },
];

/**
 * Slice 4: the three Irongate jobs (docs/design/slice-4-battleground.md §4.5). No faction draws a
 * fifth more here: the +20 % is a home-city perk. Kept apart from `jobs` until Irongate is wired into
 * the content (a job at an unknown location fails validation); merged then.
 */
export const irongateJobs: Job[] = [
  {
    id: 'irongate-porter',
    name: 'Porter',
    locationId: 'irongate.central-station',
    unlock: { level: 1, stats: { str: 5 } },
    dailyPay: 180,
    blurb:
      "Eight hours of trunks and hatboxes under the glass arches. The stationmaster pays by the day and asks nobody's party.",
  },
  {
    id: 'irongate-street-vendor',
    name: 'Street vendor',
    locationId: 'irongate.market-square',
    unlock: { level: 1 },
    dailyPay: 100,
    blurb:
      "Matches, bootlaces and this morning's Herald from a stall under the column. The market beadle has stopped asking.",
  },
  {
    id: 'irongate-driver',
    name: 'Driver',
    locationId: 'irongate.riverside-quays',
    unlock: { level: 3, stats: { agi: 10 } },
    dailyPay: 240, // Review 5 (answers §5, GDD §9.2): was 200.
    blurb:
      'The quay lorry between the cranes and the works, a full load each way. Needs a quick hand on the setts by the bridge.',
  },
];

/**
 * Slice 7: the three Clearwater jobs (docs/design/slice-7-nation.md §9.4; the capital's rule: no
 * faction draws a fifth more on a battleground). The Tram conductor at 240 by review 5's rung rule
 * (GDD §9.2). Merged into the content with the city (T6).
 */
export const clearwaterJobs: Job[] = [
  {
    id: 'clearwater-street-vendor',
    name: 'Street vendor',
    locationId: 'clearwater.back-lane-market',
    unlock: { level: 1 },
    dailyPay: 100,
    blurb:
      "Bootlaces, fish and yesterday's Courier from a barrow under the arches. Nobody asks for a permit, and nobody gets one.",
  },
  {
    id: 'clearwater-cannery-hand',
    name: 'Cannery hand',
    locationId: 'clearwater.cannery',
    unlock: { level: 1, stats: { str: 5 } },
    dailyPay: 180,
    blurb:
      'Eight hours on the loading bank of the fish cannery. No party draws a fifth more here: the company pays everyone the same, which is the trouble.',
  },
  {
    id: 'clearwater-tram-conductor',
    name: 'Tram conductor',
    locationId: 'clearwater.tram-depot',
    unlock: { level: 3, stats: { agi: 10 } },
    dailyPay: 240, // Review 5 (answers §5, GDD §9.2): was 200.
    blurb: 'The fares on the lake line, up and down the hill all day. Needs a quick hand on a moving platform.',
  },
];
