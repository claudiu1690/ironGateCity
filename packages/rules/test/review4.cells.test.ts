/**
 * Review 4, T6 (docs/tech/review-4.md §11.2; ADR 0078; GDD §19.2, §11.2, §13.7): the cells cost
 * more and take nothing. The sentence is 20 + Heat ÷ 2 minutes; an arrest always marks and counts
 * for the escalation; the day's orders are off from the arrest, and the arresting act counts for none.
 */
import { describe, expect, it } from 'vitest';
import {
  CELLS,
  advanceOrders,
  arrestOnRecord,
  closeOrders,
  createRng,
  findAdvancingItem,
  finishMission,
  marksFor,
  orderRewards,
  ordersOff,
  recordArrest,
  resolveMission,
  sentenceMinutes,
  startOrders,
} from '../src';
import type { ActionDescriptor, MissionInput, MissionStart, OrderTemplate, OrdersState } from '../src';
import { NAMES } from './helpers';

const T0 = Date.UTC(2026, 9, 3, 14);
const DAY = 20_730;

const tpl = (id: string, slot: 'A' | 'B' | 'C', match: OrderTemplate['match'], target: number): OrderTemplate => ({
  id,
  factionId: 'collective',
  slot,
  title: id,
  line: `${id}.`,
  match,
  target,
  counts: 'attempts',
});
// One order each slot, every one matched by a vandalism mission in Coalport (the worst case).
const TEMPLATES: OrderTemplate[] = [
  tpl('o.a', 'A', { kinds: ['mission'] }, 1),
  tpl('o.b', 'B', { cityId: 'home' }, 1),
  tpl('o.c', 'C', { cityId: 'home' }, 3),
];

const orders = (): OrdersState => startOrders(TEMPLATES, DAY, false);

describe('the sentence (GDD §19.2, review 4: 20 + Heat ÷ 2, at most 60, ×1.5 on rival ground)', () => {
  it('Heat 0 → 20, 58 → 49, 80 → 60, 58 on rival ground → 60', () => {
    expect(CELLS.baseMinutes).toBe(20);
    expect(sentenceMinutes(0, false)).toBe(20);
    expect(sentenceMinutes(58, false)).toBe(49);
    expect(sentenceMinutes(80, false)).toBe(60);
    expect(sentenceMinutes(58, true)).toBe(60);
  });
});

describe('an arrest always marks (GDD §11.2, ADR 0078)', () => {
  it('a speech arrest is one minor mark; a speech with no arrest none', () => {
    expect(marksFor({ type: 'speech', arrested: true, arrests: [], today: DAY, logId: 'l' })).toEqual({
      add: [{ day: DAY, kind: 'minor', logId: 'l' }],
      escalated: false,
    });
    expect(marksFor({ type: 'speech', arrested: false, arrests: [], today: DAY, logId: 'l' }).add).toEqual([]);
  });

  it('a legal arrest on day 3, then a vandalism arrest on day 8: three serious marks', () => {
    const first = arrestOnRecord({ marks: [], arrests: [], today: 3, logId: 'a', type: 'speech' });
    expect(first.added).toEqual([{ day: 3, kind: 'minor', logId: 'a' }]);
    expect(first.arrests).toEqual([3]);
    expect([first.before, first.after]).toEqual(['clean', 'onFile']);
    const second = marksFor({ type: 'vandalism', arrested: true, arrests: first.arrests, today: 8, logId: 'b' });
    expect(second.escalated).toBe(true);
    expect(second.add).toEqual(Array.from({ length: 3 }, () => ({ day: 8, kind: 'serious', logId: 'b' })));
  });

  it('a tap (no type) is one minor mark, escalated within seven days; every arrest is kept', () => {
    const r = arrestOnRecord({ marks: [{ day: 5, kind: 'moderate', logId: null }], arrests: [5], today: 9, logId: 'x' });
    expect(r.escalated).toBe(true);
    expect(r.added).toHaveLength(3);
    expect(r.marks).toHaveLength(4);
    expect(r.after).toBe('repeat');
    expect(recordArrest([1, 2, 3], 4)).toEqual([2, 3, 4]);
  });
});

describe('the day orders off (GDD §13.7, ADR 0078)', () => {
  const a: ActionDescriptor = { kind: 'mission', cityId: 'coalport', type: 'vandalism', actionId: 'm', locationId: 'l' };

  it('closeOrders sets `off` once; twice is the same state', () => {
    const o = orders();
    const closed = closeOrders(o, T0);
    expect(closed.off).toEqual({ at: T0, reason: 'cells' });
    expect(closed.items).toEqual(o.items);
    expect(ordersOff(closed)).toBe(true);
    expect(ordersOff(o)).toBe(false);
    expect(closeOrders(closed, T0 + 60_000)).toBe(closed);
    expect(closeOrders(closed, T0 + 60_000).off).toEqual({ at: T0, reason: 'cells' });
  });

  it('nothing advances while off; done orders stay done', () => {
    const o = orders();
    const done = advanceOrders(o, TEMPLATES, a, 'success', 'coalport', T0).orders;
    expect(done.items[0]!.doneAt).toBe(T0);
    const closed = closeOrders(done, T0 + 1);
    expect(findAdvancingItem(closed, TEMPLATES, a, 'success', 'coalport')).toBe(-1);
    const r = advanceOrders(closed, TEMPLATES, a, 'success', 'coalport', T0 + 2);
    expect(r).toMatchObject({ advanced: null, completed: null, allDone: false });
    expect(r.orders).toEqual(closed);
    expect(r.orders.items[0]!.doneAt).toBe(T0);
    // A row that advances keeps the state's other fields.
    expect(advanceOrders({ ...o, allDoneAt: null }, TEMPLATES, a, 'success', 'coalport', T0).orders.off).toBeUndefined();
  });

  it('orderRewards with nothing advanced pays nothing (no +5 PC for all three)', () => {
    expect(orderRewards([], false)).toEqual({ fxp: 0, pc: 0 });
  });

  it('the next City Day starts open', () => {
    expect(startOrders(TEMPLATES, DAY + 1, false).off).toBeUndefined();
  });
});

describe('finishMission: the cells close the orders, the arresting act counts for none', () => {
  const base: MissionInput = {
    mission: {
      id: 'coalport.far-bank.posters',
      type: 'vandalism',
      energy: 10,
      difficulty: 14,
      locationId: 'coalport.far-bank',
      cityId: 'coalport',
      pool: ['city-police'],
    },
    way: { id: 'dark', stats: ['agi'] },
    values: { str: 10, int: 25, agi: 19, cha: 5 },
    energy: { value: 100, rested: 0, updatedAt: T0 },
    now: T0,
    standing: { successes: 0, names: NAMES, cityName: 'Coalport' },
    orders: orders(),
    orderTemplates: TEMPLATES,
    homeCityId: 'coalport',
    factionId: 'collective',
    target: 'vanguard',
    heat: { value: 50, at: T0 },
    rateOn: () => 5,
    record: 'clean',
    flags: { watched: false, warned: false },
    opponents: { sideOf: () => 'police', policeId: 'city-police' },
  };
  const startOf = (over: Partial<MissionInput> = {}): MissionStart => {
    const r = resolveMission({ ...base, ...over }, createRng('r4-cells'));
    if (!r.ok) throw new Error('refused');
    return r.start;
  };
  const fin = (s: MissionStart, arrest: boolean) =>
    finishMission({
      start: s,
      runIn: null,
      opponentSide: null,
      caught: { checked: true, chance: 50, roll: 1, caught: true, withoutRoll: false, arrest },
      marks: [],
      arrests: [],
      agiQuarters: 0,
      health: { damage: 0, at: T0 },
      level: 6,
      at: T0 + 60_000,
      today: DAY,
      rateOn: () => 5,
      logId: 'log',
      bail: { alliance: false, sources: [] },
    });

  it('caught while Hot on a Partial: orders off from the arrest, unchanged from before, no order Party XP', () => {
    const s = startOf({ force: { checkRoll: 80 } });
    expect(s.attempt.outcome).toBe('partial');
    // As rolled, the Partial would have advanced the first order and paid its +25 %.
    expect(s.orders.rolled.advanced).toBe('o.a');
    expect(s.rewards.rolled.fxp.bonus).toBeGreaterThan(0);
    const f = fin(s, true);
    expect(f.sentTo?.kind).toBe('cells');
    expect(f.ordersOff).toBe(true);
    expect(f.orders.advanced).toBeNull();
    expect(f.orders.completed).toEqual([]);
    expect(f.orders.allDone).toBe(false);
    expect(f.orders.after.items).toEqual(s.orders.before.items);
    expect(f.orders.after.off).toEqual({ at: T0 + 60_000, reason: 'cells' });
    expect(f.rewards.fxp.bonus).toBe(0);
    expect(f.rewards.fxp.total).toBe(f.rewards.fxp.base);
    // The sentence: 20 + Heat ÷ 2 at the arrest (50 + the type's 6 = 56 → 48).
    expect(f.sentTo?.held.minutes).toBe(20 + Math.floor(s.heat.after / 2));
    expect(f.record.arrests).toEqual([DAY]);
  });

  it('caught while Noticed (the name taken, no arrest): the orders advance as rolled', () => {
    const s = startOf({ force: { checkRoll: 80 }, heat: { value: 10, at: T0 } });
    const f = fin(s, false);
    expect(f.sentTo).toBeNull();
    expect(f.ordersOff).toBe(false);
    expect(f.orders.advanced).toBe('o.a');
    expect(f.orders.after.off).toBeUndefined();
  });
});
