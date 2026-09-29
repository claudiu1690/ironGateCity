import { describe, expect, it } from 'vitest';
import { DIRECTIVES, resolveTraining, startOrders, trainingCost, trainingRunCost } from '../src';
import type { ActionDescriptor } from '../src';
import { TEMPLATES } from './helpers';

const T0 = 1_790_000_000_000;
const descriptor: ActionDescriptor = {
  kind: 'training',
  actionId: 'coalport.union-hall.reading-room',
  type: 'training',
  locationId: 'coalport.union-hall',
  cityId: 'coalport',
};
const base = { str: 10, int: 12, agi: 5 };
const orders = startOrders(TEMPLATES, DIRECTIVES.epochDay + 1, true); // includes Sharpen up

const run = (times: 1 | 3, value = 200, rested = 0) =>
  resolveTraining({
    trains: 'int',
    base,
    energy: { value, rested, updatedAt: T0 },
    now: T0,
    times,
    orders,
    orderTemplates: TEMPLATES,
    homeCityId: 'coalport',
    descriptor,
  });

describe('training (§8.5)', () => {
  it('costs 20 + 2 × stat, rising per point', () => {
    expect(trainingCost(12)).toBe(44);
    expect(trainingCost(5)).toBe(30);
    expect(trainingCost(10)).toBe(40);
    expect(trainingRunCost(12, 3)).toBe(138);
  });

  it('INT 12 ×1 = 44 Energy, 99 XP, INT 13; completes Sharpen up', () => {
    const r = run(1, 100);
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.energy.cost).toBe(44);
    expect(r.resolution.energy.after.value).toBe(56);
    expect(r.resolution.xp).toEqual({ base: 99, bonus: 0, total: 99 });
    expect(r.resolution.stat).toEqual({ stat: 'int', before: 12, after: 13 });
    expect(r.resolution.orders.completed).toEqual(['dir.sharpen-up']);
  });

  it('×3 = 138 Energy, INT 15, three rows', () => {
    const r = run(3, 200);
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.rows.map((x) => [x.from, x.to, x.cost])).toEqual([
      [12, 13, 44],
      [13, 14, 46],
      [14, 15, 48],
    ]);
    expect(r.resolution.energy.cost).toBe(138);
    expect(r.resolution.stat.after).toBe(15);
    expect(r.resolution.xp.total).toBe(99 + 104 + 108);
  });

  it('refuses ×3 at 137 Energy', () => {
    expect(run(3, 137)).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_ENERGY', cost: 138, shortBy: 1 });
  });

  it('Rested boosts XP only', () => {
    const r = run(1, 100, 44);
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.xp).toEqual({ base: 99, bonus: 50, total: 149 });
    expect(r.resolution.energy.restedUsed).toBe(44);
  });
});
