import { describe, expect, it } from 'vitest';
import { DIRECTIVES, createRng, resolveTier1Action, startOrders, usesSuccessText } from '../src';
import type { OrdersState, Tier1ActionInput } from '../src';
import { NAMES, TEMPLATES, fixedRng } from './helpers';

const T0 = 1_790_000_000_000;
const NO_ORDERS: OrdersState = { day: 0, items: [], allDoneAt: null };

const input = (over: Partial<Tier1ActionInput> = {}): Tier1ActionInput => ({
  action: {
    id: 'coalport.mill-gate.canvass',
    type: 'canvass',
    locationId: 'coalport.mill-gate',
    cityId: 'coalport',
    energy: 10,
    stats: ['int'],
    givesFxp: true,
    givesOpinion: true,
  },
  cityRole: 'home',
  values: { str: 10, int: 12, agi: 5, cha: 2 },
  energy: { value: 100, rested: 0, updatedAt: T0 },
  now: T0,
  times: 1,
  standing: { successes: 0, names: NAMES, cityName: 'Coalport' },
  orders: NO_ORDERS,
  orderTemplates: TEMPLATES,
  homeCityId: 'coalport',
  ...over,
});

function ok(r: ReturnType<typeof resolveTier1Action>) {
  if (!r.ok) throw new Error('expected ok');
  return r.resolution;
}

describe('resolveTier1Action ×1 (slice-0 numbers unchanged)', () => {
  it('replays: same seed + same input ⇒ identical resolution', () => {
    expect(resolveTier1Action(input(), createRng('abc'))).toEqual(
      resolveTier1Action(input(), createRng('abc')),
    );
  });

  it('spends 10, rolls once against 66 % and pays 45/6/20 or 23/3/10', () => {
    const r = ok(resolveTier1Action(input(), createRng('abc')));
    expect(r.attempts).toHaveLength(1);
    const a = r.attempts[0]!;
    expect(a.check.chance).toBe(66);
    expect(a.roll).toBe(createRng('abc').roll100());
    expect(r.summary.stamp).toBe(a.roll <= 66 ? 'success' : 'partial');
    expect(r.energy.after).toEqual({ value: 90, rested: 0, updatedAt: T0 });
    expect(r.energy.cost).toBe(10);
    expect([r.rewards.xp.total, r.rewards.fxp.total, r.rewards.iron.total]).toEqual(
      a.outcome === 'success' ? [45, 6, 20] : [23, 3, 10],
    );
  });

  it('68/6/30 with full Rested', () => {
    const r = ok(
      resolveTier1Action(input({ energy: { value: 100, rested: 30, updatedAt: T0 } }), fixedRng([1])),
    );
    expect(r.rewards.xp).toEqual({ base: 45, bonus: 23, total: 68 });
    expect(r.rewards.iron.total).toBe(30);
    expect(r.rewards.fxp.total).toBe(6);
  });

  it('never fails, over many seeds', () => {
    const outcomes = new Set<string>();
    for (let i = 0; i < 200; i++)
      outcomes.add(ok(resolveTier1Action(input(), createRng(`s${i}`))).attempts[0]!.outcome);
    expect(outcomes).toEqual(new Set(['success', 'partial']));
  });

  it('uses 10 in a battleground and passes bonuses through', () => {
    const r = ok(
      resolveTier1Action(
        input({ cityRole: 'battleground', bonuses: [{ id: 'item', label: 'Kit', value: 5 }] }),
        createRng('x'),
      ),
    );
    expect(r.attempts[0]!.check.chance).toBe(50 + 4 * 2 + 5);
  });

  it('refuses without rolling when Energy is short', () => {
    const rng = createRng('z');
    const r = resolveTier1Action(input({ energy: { value: 4, rested: 0, updatedAt: T0 } }), rng);
    expect(r).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_ENERGY', shortBy: 6, cost: 10 });
    expect(rng.roll100()).toBe(createRng('z').roll100());
  });

  it('council pays FXP ×1.5 (9 / 5) and two-stat checks average', () => {
    const council = { ...input().action, type: 'council', givesOpinion: false };
    expect(ok(resolveTier1Action(input({ action: council }), fixedRng([1]))).rewards.fxp.total).toBe(9);
    expect(ok(resolveTier1Action(input({ action: council }), fixedRng([99]))).rewards.fxp.total).toBe(5);
    const speech = { ...input().action, type: 'speech', energy: 12, stats: ['cha', 'int'] as ['cha', 'int'] };
    expect(ok(resolveTier1Action(input({ action: speech }), fixedRng([1]))).attempts[0]!.check.chance).toBe(
      46,
    );
  });
});

describe('resolveTier1Action ×3 (ADR 0006)', () => {
  it('Energy 100 → 70 in one run, three rows from one seed stream', () => {
    const r = ok(resolveTier1Action(input({ times: 3 }), createRng('run')));
    const rng = createRng('run');
    expect(r.attempts.map((a) => a.roll)).toEqual([rng.roll100(), rng.roll100(), rng.roll100()]);
    expect(r.energy.before.value).toBe(100);
    expect(r.energy.after.value).toBe(70);
    expect(r.energy.cost).toBe(30);
    expect(r.times).toBe(3);
    expect(resolveTier1Action(input({ times: 3 }), createRng('run'))).toEqual({ ok: true, resolution: r });
  });

  it('refuses 25 Energy with cost 30; nothing spent', () => {
    const r = resolveTier1Action(
      input({ times: 3, energy: { value: 25, rested: 0, updatedAt: T0 } }),
      createRng('a'),
    );
    expect(r).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_ENERGY', cost: 30, shortBy: 5 });
  });

  it('spends Rested per row: 15 → 10 / 5 / 0 with XP bonus 23 / 11 / 0 on Successes', () => {
    const r = ok(
      resolveTier1Action(
        input({ times: 3, energy: { value: 100, rested: 15, updatedAt: T0 } }),
        fixedRng([1, 1, 1]),
      ),
    );
    expect(r.attempts.map((a) => a.restedUsed)).toEqual([10, 5, 0]);
    expect(r.attempts.map((a) => a.rewards.xp.bonus)).toEqual([23, 11, 0]);
    expect(r.energy.restedUsed).toBe(15);
    expect(r.energy.after.rested).toBe(0);
    expect(r.rewards.xp).toEqual({ base: 135, bonus: 34, total: 169 });
  });

  it('Standing 9: a Success on row 1 gives row 2 +3 %', () => {
    const r = ok(
      resolveTier1Action(
        input({ times: 3, standing: { successes: 9, names: NAMES, cityName: 'Coalport' } }),
        fixedRng([1, 90, 1]),
      ),
    );
    expect(r.attempts.map((a) => a.check.chance)).toEqual([66, 69, 69]);
    expect(r.attempts[1]!.check.bonuses).toEqual([
      { id: 'standing', label: 'Familiar in Coalport', value: 3 },
    ]);
    expect(r.standing).toEqual({ before: 9, after: 11 });
  });

  it('an order at 1 / 2 gets +25 % on the completing row only', () => {
    const base = startOrders(TEMPLATES, DIRECTIVES.epochDay + 1, true); // shift-change first
    const orders = { ...base, items: base.items.map((x, i) => (i === 0 ? { ...x, progress: 1 } : x)) };
    const r = ok(resolveTier1Action(input({ times: 3, orders }), fixedRng([1, 1, 90])));
    expect(r.attempts.map((a) => a.orderId)).toEqual(['dir.shift-change', null, null]);
    expect(r.attempts.map((a) => a.rewards.fxp)).toEqual([
      { base: 6, bonus: 2, total: 8 },
      { base: 6, bonus: 0, total: 6 },
      { base: 3, bonus: 0, total: 3 },
    ]);
    expect(r.orders.completed).toEqual(['dir.shift-change']);
    expect(r.orders.allDone).toBe(false);
    expect(r.orders.after.items[0]).toMatchObject({ progress: 2, doneAt: T0 });
    expect(r.summary).toEqual({ stamp: 'batch', successes: 2 });
  });

  it('a Partial advancing an open order gets 3 → +1', () => {
    const orders = startOrders(TEMPLATES, DIRECTIVES.epochDay + 1, true);
    const r = ok(resolveTier1Action(input({ orders }), fixedRng([99])));
    expect(r.attempts[0]!.rewards.fxp).toEqual({ base: 3, bonus: 1, total: 4 });
  });

  it('stamps every batch "n of N" and uses the success text by majority', () => {
    expect(ok(resolveTier1Action(input({ times: 3 }), fixedRng([1, 1, 1]))).summary).toEqual({
      stamp: 'batch',
      successes: 3,
    });
    expect(ok(resolveTier1Action(input({ times: 3 }), fixedRng([99, 99, 99]))).summary.successes).toBe(0);
    expect(usesSuccessText(2, 3)).toBe(true);
    expect(usesSuccessText(1, 3)).toBe(false);
    expect(usesSuccessText(1, 1)).toBe(true);
    expect(usesSuccessText(0, 1)).toBe(false);
    expect(usesSuccessText(3, 5)).toBe(true);
  });

  it('opinion sums per row to three decimals', () => {
    const r = ok(resolveTier1Action(input({ times: 3 }), fixedRng([1, 99, 99])));
    expect(r.rewards.opinion).toBe(0.1);
  });
});
