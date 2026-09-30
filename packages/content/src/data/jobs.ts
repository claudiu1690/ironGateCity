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
    dailyPay: 200,
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
    dailyPay: 200,
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
    dailyPay: 200,
    blurb:
      'The market van between Bridge Street and the station goods shed, a full load each way. Needs a quick hand on the wet setts.',
  },
];
