import { describe, expect, it } from 'vitest';
import { DIRECTIVES, resolveTraining, startOrders, trainingCost } from '../src';
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
const orders = startOrders(TEMPLATES, DIRECTIVES.epochDay + 6, true); // includes Sharpen up (review 1 rotation)

const run = (value = 200, rested = 0) =>
  resolveTraining({
    trains: 'int',
    base,
    energy: { value, rested, updatedAt: T0 },
    now: T0,
    orders,
    orderTemplates: TEMPLATES,
    homeCityId: 'coalport',
    descriptor,
  });

describe('training (§8.5, ×1 only)', () => {
  it('costs 20 + 2 × stat, rising per point', () => {
    expect(trainingCost(12)).toBe(44);
    expect(trainingCost(13)).toBe(46);
    expect(trainingCost(5)).toBe(30);
    expect(trainingCost(10)).toBe(40);
  });

  it('INT 12 ×1 = 44 Energy, 99 XP, INT 13, one row; completes Sharpen up', () => {
    const r = run(100);
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.times).toBe(1);
    expect(r.resolution.rows.map((x) => [x.from, x.to, x.cost])).toEqual([[12, 13, 44]]);
    expect(r.resolution.energy.cost).toBe(44);
    expect(r.resolution.energy.after.value).toBe(56);
    expect(r.resolution.xp).toEqual({ base: 99, bonus: 0, total: 99 });
    expect(r.resolution.stat).toEqual({ stat: 'int', before: 12, after: 13 });
    expect(r.resolution.orders.completed).toEqual(['dir.sharpen-up']);
  });

  it('refuses at 43 Energy (short by 1) and spends exactly to 0 at 44', () => {
    expect(run(43)).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_ENERGY', cost: 44, shortBy: 1 });
    const r = run(44);
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.energy.after.value).toBe(0);
  });

  it('Rested boosts XP only', () => {
    const r = run(100, 44);
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.xp).toEqual({ base: 99, bonus: 50, total: 149 });
    expect(r.resolution.energy.restedUsed).toBe(44);
  });
});
