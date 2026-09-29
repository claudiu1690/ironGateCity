import type { ActionResult, CharacterView } from '../types';

/**
 * Test fixtures shared by packages (`@irongate/rules/testing`): a reference-recruit character and
 * the result of one successful Mill Gate canvass, in the exact shape the server returns.
 */

const T0 = Date.UTC(2026, 8, 29, 9, 0, 0);

export const characterViewFixture: CharacterView = {
  id: '66f9a0000000000000000001',
  name: 'Mara Lenk',
  factionId: 'collective',
  factionName: 'Collective',
  homeCityId: 'coalport',
  cityId: 'coalport',
  stats: { str: 10, int: 12, agi: 5, cha: 2 },
  energy: { value: 90, max: 100, updatedAt: T0, nextTickAt: T0 + 600_000, fullAt: T0 + 2 * 600_000 },
  rested: 0,
  xp: 45,
  level: 1,
  fxp: 6,
  iron: 20,
  version: 1,
};

export const actionResultFixture: ActionResult = {
  logId: '66f9a0000000000000000002',
  idempotencyKey: '3b241101-e2bb-4255-8caf-4136c566a962',
  performedAt: new Date(T0).toISOString(),
  seed: '0123456789abcdef0123456789abcdef',
  place: {
    cityId: 'coalport',
    cityName: 'Coalport',
    locationId: 'coalport.mill-gate',
    locationName: 'Mill Gate',
    kind: 'factory-gate',
  },
  action: { id: 'coalport.mill-gate.canvass', name: 'Canvass the shift change', type: 'canvass', tier: 1 },
  stamp: 'success',
  headline: 'The whistle goes, and they stop',
  body: "You're at the gate before the shift comes off. Coal dust, tired faces, no time for speeches.",
  attempts: [
    {
      index: 1,
      roll: 41,
      outcome: 'success',
      check: {
        stat: 'int',
        statValue: 12,
        difficulty: 8,
        base: 50,
        statTerm: 16,
        bonuses: [],
        bonusTotal: 0,
        raw: 66,
        chance: 66,
      },
    },
  ],
  rewards: {
    xp: { base: 45, bonus: 0, total: 45 },
    fxp: { base: 6, bonus: 0, total: 6 },
    iron: { base: 20, bonus: 0, total: 20 },
    opinion: 0.05,
  },
  bonusTags: [],
  effects: {
    energy: { before: 100, after: 90, max: 100, nextTickAt: T0 + 600_000 },
    rested: { before: 0, after: 0 },
    xp: { before: 0, after: 45 },
    fxp: { before: 0, after: 6 },
    iron: { before: 0, after: 20 },
    level: 1,
    opinion: { cityId: 'coalport', factionId: 'collective', delta: 0.05, applied: false },
  },
  character: characterViewFixture,
};
