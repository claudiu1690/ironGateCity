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
  it('rotates A[i mod 5], B[i mod 4], C[i mod 3]', () => {
    expect(ordersForDay(TEMPLATES, DAY0).map((t) => t.id)).toEqual([
      'dir.canvass-coalport',
      'dir.paper-the-town',
      'dir.work-shift',
    ]);
    expect(ordersForDay(TEMPLATES, DAY0 + 1).map((t) => t.id)).toEqual([
      'dir.shift-change',
      'dir.say-it',
      'dir.sharpen-up',
    ]);
    expect(ordersForDay(TEMPLATES, DAY0 + 2).map((t) => t.id)).toEqual([
      'dir.foundry-row',
      'dir.report',
      'dir.full-day',
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
  it('freezes the no-job variant and its target', () => {
    const o = startOrders(TEMPLATES, DAY0, false);
    expect(o.items[2]).toEqual({
      templateId: 'dir.work-shift',
      variant: 'noJob',
      target: 1,
      progress: 0,
      doneAt: null,
    });
    expect(startOrders(TEMPLATES, DAY0, true).items[2]!.variant).toBe('main');
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
    let o = startOrders(TEMPLATES, DAY0 + 1, true); // shift-change (2), say-it (1), sharpen-up (1)
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
    const o = startOrders(TEMPLATES, DAY0 + 2, true); // foundry-row, report, full-day
    const partial = advanceOrders(o, TEMPLATES, canvass, 'partial', 'coalport', 1);
    expect(partial.advanced).toBeNull();
    const success = advanceOrders(o, TEMPLATES, canvass, 'success', 'coalport', 1);
    expect(success.advanced).toMatchObject({ templateId: 'dir.full-day', progress: 1 });
  });

  it('taking a job completes the no-job variant; all three done sets allDoneAt once', () => {
    let o = startOrders(TEMPLATES, DAY0, false); // canvass-coalport (3), paper-the-town (3), take a job
    o = { ...o, items: o.items.map((x, i) => (i < 2 ? { ...x, progress: x.target, doneAt: 5 } : x)) };
    const r = advanceOrders(o, TEMPLATES, { kind: 'takeJob' }, 'success', 'coalport', 9);
    expect(r.completed?.templateId).toBe('dir.work-shift');
    expect(r.allDone).toBe(true);
    expect(r.orders.allDoneAt).toBe(9);
    // A shift does not match the frozen no-job variant.
    expect(
      advanceOrders(
        startOrders(TEMPLATES, DAY0, false),
        TEMPLATES,
        { kind: 'shift' },
        'success',
        'coalport',
        1,
      ).advanced,
    ).toBeNull();
  });
});
