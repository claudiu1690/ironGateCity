import { describe, expect, it } from 'vitest';
import { DIRECTIVES, advanceOrders, dayKey, orderMatches, ordersForDay, startOrders } from '../src';
import type { ActionDescriptor } from '../src';
import { TEMPLATES } from './helpers';

const DAY0 = DIRECTIVES.epochDay; // 2026-01-01: index 0
const canvass: ActionDescriptor = {
  kind: 'checked',
  actionId: 'coalport.mill-gate.canvass',
  type: 'canvass',
  locationId: 'coalport.mill-gate',
  cityId: 'coalport',
};

describe('ordersForDay (content §6.2)', () => {
  it('rotates A[i mod 5], B[i mod 4], C[i mod 3]; welcome templates never enter it (review 1)', () => {
    expect(ordersForDay(TEMPLATES, DAY0).map((t) => t.id)).toEqual([
      'dir.canvass-coalport',
      'dir.paper-the-town',
      'dir.sharpen-up',
    ]);
    expect(ordersForDay(TEMPLATES, DAY0 + 1).map((t) => t.id)).toEqual([
      'dir.shift-change',
      'dir.say-it',
      'dir.full-day',
    ]);
    expect(ordersForDay(TEMPLATES, DAY0 + 2).map((t) => t.id)).toEqual([
      'dir.foundry-row',
      'dir.report',
      'dir.five-in-the-book',
    ]);
  });

  it('never repeats a set on consecutive days, and the cycle is 60 days', () => {
    const key = (d: number) =>
      ordersForDay(TEMPLATES, d)
        .map((t) => t.id)
        .join();
    const start = dayKey(Date.UTC(2026, 8, 1));
    for (let d = start; d < start + 60; d++) expect(key(d)).not.toBe(key(d + 1));
    expect(key(start)).toBe(key(start + 60));
    expect(new Set(Array.from({ length: 60 }, (_, i) => key(start + i))).size).toBe(60);
  });

  it('works before the epoch too', () => {
    expect(ordersForDay(TEMPLATES, DAY0 - 1)).toHaveLength(3);
  });
});

describe('startOrders', () => {
  it('builds the welcome set from the given ids (ADR 0012, review 1)', () => {
    const welcome = ['dir.shift-change', 'dir.report', 'dir.take-a-job'] as const;
    for (const day of [DAY0, DAY0 + 1, DAY0 + 7]) {
      const o = startOrders(TEMPLATES, day, false, welcome);
      expect(o.items.map((i) => [i.templateId, i.variant, i.target, i.progress])).toEqual([
        ['dir.shift-change', 'main', 2, 0],
        ['dir.report', 'main', 1, 0],
        ['dir.take-a-job', 'main', 1, 0],
      ]);
    }
    // Without `welcome`, the rotation.
    expect(startOrders(TEMPLATES, DAY0, false).items.map((i) => i.templateId)).toEqual([
      'dir.canvass-coalport',
      'dir.paper-the-town',
      'dir.sharpen-up',
    ]);
    expect(() => startOrders(TEMPLATES, DAY0, false, ['nope', 'dir.report', 'dir.take-a-job'])).toThrow();
  });

  it('a second welcome day with a job already held starts Take a job done, with no reward', () => {
    const welcome = ['dir.shift-change', 'dir.report', 'dir.take-a-job'] as const;
    const o = startOrders(TEMPLATES, DAY0, true, welcome, undefined, 77);
    expect(o.items[2]).toEqual({
      templateId: 'dir.take-a-job',
      variant: 'main',
      target: 1,
      progress: 1,
      doneAt: 77,
    });
    expect(o.allDoneAt).toBeNull();
  });
});

describe('orderMatches', () => {
  it('ANDs the fields present; home resolves to the actor home city', () => {
    expect(orderMatches({ actionTypes: ['canvass'], cityId: 'coalport' }, canvass, 'coalport')).toBe(true);
    expect(orderMatches({ actionTypes: ['speech'] }, canvass, 'coalport')).toBe(false);
    expect(orderMatches({ kinds: ['checked'], cityId: 'home' }, canvass, 'coalport')).toBe(true);
    expect(orderMatches({ kinds: ['checked'], cityId: 'home' }, canvass, 'duskwall')).toBe(false);
    expect(orderMatches({ locationIds: ['coalport.quays'] }, canvass, 'coalport')).toBe(false);
    expect(orderMatches({ kinds: ['takeJob'] }, { kind: 'takeJob' }, 'coalport')).toBe(true);
    expect(orderMatches({ actionIds: ['x'] }, { kind: 'takeJob' }, 'coalport')).toBe(false);
  });
});

describe('advanceOrders', () => {
  it('advances the first open match, completes at target, then moves on', () => {
    let o = startOrders(TEMPLATES, DAY0 + 6, true); // shift-change (2), report (1), sharpen-up (1)
    let r = advanceOrders(o, TEMPLATES, canvass, 'partial', 'coalport', 100);
    expect(r.advanced).toMatchObject({ templateId: 'dir.shift-change', progress: 1 });
    expect(r.completed).toBeNull();
    o = r.orders;
    r = advanceOrders(o, TEMPLATES, canvass, 'success', 'coalport', 200);
    expect(r.completed).toMatchObject({ templateId: 'dir.shift-change', progress: 2, doneAt: 200 });
    r = advanceOrders(r.orders, TEMPLATES, canvass, 'success', 'coalport', 300);
    expect(r.advanced).toBeNull();
    expect(r.orders.items[0]!.progress).toBe(2);
  });

  it('"A full day" counts Successes only', () => {
    const o = startOrders(TEMPLATES, DAY0 + 7, true); // foundry-row, ears-open, full-day
    const partial = advanceOrders(o, TEMPLATES, canvass, 'partial', 'coalport', 1);
    expect(partial.advanced).toBeNull();
    const success = advanceOrders(o, TEMPLATES, canvass, 'success', 'coalport', 1);
    expect(success.advanced).toMatchObject({ templateId: 'dir.full-day', progress: 1 });
  });

  it('taking a job completes Take a job; all three done sets allDoneAt once', () => {
    const welcome = ['dir.canvass-coalport', 'dir.paper-the-town', 'dir.take-a-job'] as const;
    let o = startOrders(TEMPLATES, DAY0, false, welcome);
    o = { ...o, items: o.items.map((x, i) => (i < 2 ? { ...x, progress: x.target, doneAt: 5 } : x)) };
    const r = advanceOrders(o, TEMPLATES, { kind: 'takeJob' }, 'success', 'coalport', 9);
    expect(r.completed?.templateId).toBe('dir.take-a-job');
    expect(r.allDone).toBe(true);
    expect(r.orders.allDoneAt).toBe(9);
    // Training does not match it.
    expect(
      advanceOrders(
        startOrders(TEMPLATES, DAY0, false, welcome),
        TEMPLATES,
        { kind: 'training' },
        'success',
        'coalport',
        1,
      ).advanced,
    ).toBeNull();
  });
});
