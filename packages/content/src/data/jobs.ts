import type { Job } from '../schemas';

/** Coalport's three jobs (docs/design/slice-1-content.md §3; GDD §9.2, pay pinned for slice 1). */
export const jobs: Job[] = [
  {
    id: 'street-vendor',
    name: 'Street vendor',
    locationId: 'coalport.market-row',
    shiftActionId: 'coalport.market-row.stall',
    unlock: { level: 1 },
    shiftEnergy: 3,
    dailyPay: 100,
    blurb: "Matches, bootlaces and yesterday's paper from a stall on Market Row.",
  },
  {
    id: 'factory-worker',
    name: 'Factory worker',
    locationId: 'coalport.mill-gate',
    shiftActionId: 'coalport.mill-gate.shift',
    unlock: { level: 1, stats: { str: 5 } },
    shiftEnergy: 4,
    dailyPay: 180,
    factionPayBonus: { collective: 0.2 },
    blurb: 'The rolling floor of the Coalport Steel Mill. Collective members are paid a fifth more.',
  },
  {
    id: 'driver',
    name: 'Driver',
    locationId: 'coalport.quays',
    shiftActionId: 'coalport.quays.lorry',
    unlock: { level: 3, stats: { agi: 10 } },
    shiftEnergy: 4,
    dailyPay: 200,
    blurb: 'The dock lorry between the quay and the goods yard, a full load each way.',
  },
];
