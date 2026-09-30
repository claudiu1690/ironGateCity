import { describe, expect, it } from 'vitest';
import {
  DIRECTIVES,
  ORDINANCE_BOUNDS,
  actionEnergy,
  cityModifiers,
  computeRewards,
  dayKey,
  dayStart,
  emptyTally,
  jobPayWith,
  ordinanceBoundProblem,
  ordinanceOnDay,
  ordinanceTags,
  orderRewards,
  ordersForDay,
  projectEnergy,
  projectEnergyThrough,
  resolveShift,
  resolveTier1Action,
  resolveTraining,
  restedCapFor,
  settleDays,
  shiftEnergy,
  startOrders,
  trainingEnergy,
} from '../src';
import type { CityModifiers, OrderTemplate, OrdersState, OrdinanceSpec, Tier1ActionInput } from '../src';
import { NAMES, TEMPLATES, fixedRng } from './helpers';

const T0 = 1_790_000_000_000;
const NO_ORDERS: OrdersState = { day: 0, items: [], allDoneAt: null };

/** The ten ordinances' effects (design §10.1). */
const ORD: Record<string, OrdinanceSpec> = {
  publicWorks: {
    id: 'ord.public-works',
    name: 'Public Works Order',
    effects: [{ kind: 'jobPayPct', value: 10 }],
  },
  shiftHours: {
    id: 'ord.shift-hours',
    name: 'Shift Hours Order',
    effects: [
      { kind: 'shiftEnergyDelta', value: -1, floor: 2 },
      { kind: 'shiftStreakDays', value: 2 },
    ],
  },
  streetPermits: {
    id: 'ord.street-permits',
    name: 'Street Permits',
    effects: [{ kind: 'swingPct', actionType: 'propaganda', value: 15 }],
  },
  rallyPermits: {
    id: 'ord.rally-permits',
    name: 'Rally Permits',
    effects: [{ kind: 'energyDelta', actionType: 'speech', value: -2 }],
  },
  readingRoom: {
    id: 'ord.reading-room',
    name: 'Reading Room Grant',
    effects: [{ kind: 'trainingEnergyPct', value: -20 }],
  },
  restDay: { id: 'ord.rest-day', name: 'Rest Day Order', effects: [{ kind: 'restedCapDelta', value: 50 }] },
  openDoors: {
    id: 'ord.open-doors',
    name: 'Open Doors',
    effects: [{ kind: 'chancePct', actionType: 'canvass', value: 4 }],
  },
  wardRegister: {
    id: 'ord.ward-register',
    name: 'Ward Register',
    effects: [{ kind: 'standingMultiplier', value: 2 }],
  },
  wardFund: {
    id: 'ord.ward-fund',
    name: 'Ward Fund',
    effects: [
      { kind: 'ironPct', scope: 'checked', value: 25 },
      { kind: 'jobPayPct', value: -25 },
    ],
  },
  publicMeetings: {
    id: 'ord.public-meetings',
    name: 'Public Meetings Order',
    effects: [{ kind: 'fxpPct', scope: 'actions', value: 25 }],
  },
};

const mods = (o: OrdinanceSpec | null, fired = false): CityModifiers =>
  cityModifiers({ ordinance: o, moraleState: fired ? 'fired' : 'steady', actorIsHomeFaction: true });

const canvass = (over: Partial<Tier1ActionInput> = {}): Tier1ActionInput => ({
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

const speech = (over: Partial<Tier1ActionInput> = {}) =>
  canvass({
    action: {
      id: 'coalport.plinth.speech',
      type: 'speech',
      locationId: 'coalport.plinth',
      cityId: 'coalport',
      energy: 12,
      stats: ['cha'],
      givesFxp: true,
      givesOpinion: true,
    },
    ...over,
  });

function ok<T>(r: { ok: true; resolution: T } | { ok: false }): T {
  if (!r.ok) throw new Error('expected ok');
  return r.resolution;
}

describe('the DSL and its bounds (ADR 0021)', () => {
  it('every design ordinance is inside ORDINANCE_BOUNDS; outside is named', () => {
    for (const o of Object.values(ORD))
      for (const e of o.effects) expect(ordinanceBoundProblem(e)).toBeNull();
    expect(ordinanceBoundProblem({ kind: 'jobPayPct', value: 11 })).toMatch(
      /jobPayPct 11 is outside its bound -25…10/,
    );
    expect(ORDINANCE_BOUNDS.restedCapDelta).toEqual([0, 50]);
  });

  it('no ordinance, no modifier: the slice-1/2 numbers', () => {
    const m = mods(null);
    expect(actionEnergy(12, 'speech', m)).toBe(12);
    expect(trainingEnergy(44, m)).toBe(44);
    expect(shiftEnergy(4, m)).toBe(4);
    expect(jobPayWith(216, m)).toBe(216);
    expect(restedCapFor(m)).toBe(200);
    expect(ordinanceTags({ kind: 'checked', type: 'canvass', base: 10, m })).toEqual([]);
  });

  it('ordinanceOnDay: the latest window holding the day', () => {
    const h = [
      { id: 'a', fromDay: 10, toDay: 15 },
      { id: 'b', fromDay: 15, toDay: 20 },
    ];
    expect(ordinanceOnDay(h, 9)).toBeNull();
    expect(ordinanceOnDay(h, 14)).toBe('a');
    expect(ordinanceOnDay(h, 15)).toBe('b');
    expect(ordinanceOnDay(h, 20)).toBeNull();
  });
});

describe('every effect at the design numbers', () => {
  it('Rally Permits: a speech costs 10, pays on 12; with 10 Rested the full +50 %', () => {
    const plain = ok(resolveTier1Action(speech(), fixedRng([1])));
    const r = ok(resolveTier1Action(speech({ modifiers: mods(ORD.rallyPermits!) }), fixedRng([1])));
    expect(r.energy.cost).toBe(10);
    expect(r.rewards.xp.total).toBe(plain.rewards.xp.total);
    expect(r.rewards.iron.total).toBe(plain.rewards.iron.total);
    const rested = ok(
      resolveTier1Action(
        speech({ modifiers: mods(ORD.rallyPermits!), energy: { value: 100, rested: 10, updatedAt: T0 } }),
        fixedRng([1]),
      ),
    );
    expect(rested.rewards.xp).toEqual({ base: 54, bonus: 27, total: 81 });
    expect(ordinanceTags({ kind: 'checked', type: 'speech', base: 12, m: mods(ORD.rallyPermits!) })).toEqual([
      { ordinanceId: 'ord.rally-permits', name: 'Rally Permits', kind: 'energy', value: 10 },
    ]);
  });

  it('Reading Room Grant: INT 12 → 13 costs 35, still pays 99 XP', () => {
    const r = ok(
      resolveTraining({
        trains: 'int',
        base: { str: 10, int: 12, agi: 5 },
        energy: { value: 100, rested: 0, updatedAt: T0 },
        now: T0,
        orders: NO_ORDERS,
        orderTemplates: TEMPLATES,
        homeCityId: 'coalport',
        descriptor: { kind: 'training', type: 'training', cityId: 'coalport' },
        modifiers: mods(ORD.readingRoom!),
      }),
    );
    expect(r.energy.cost).toBe(35);
    expect(r.rows[0]!.cost).toBe(35);
    expect(r.xp.total).toBe(99);
    expect(
      ordinanceTags({ kind: 'training', type: 'training', base: 44, m: mods(ORD.readingRoom!) })[0],
    ).toMatchObject({
      kind: 'energy',
      value: 35,
    });
  });

  const shift = (m: CityModifiers, streak = 0) =>
    ok(
      resolveShift({
        job: { id: 'coalport-factory-worker', since: 0, streak, lastShiftDay: null },
        today: 100,
        pay: 216,
        shiftEnergy: 4,
        energy: { value: 100, rested: 0, updatedAt: T0 },
        now: T0,
        orders: NO_ORDERS,
        orderTemplates: TEMPLATES,
        homeCityId: 'coalport',
        descriptor: { kind: 'shift', type: 'job', cityId: 'coalport' },
        modifiers: m,
      }),
    );

  it('Shift Hours: 4 → 3 (2 stays 2); two streak days a shift; the +20 % cap unchanged', () => {
    const m = mods(ORD.shiftHours!);
    expect(shiftEnergy(2, m)).toBe(2);
    const r = shift(m, 0);
    expect(r.energy.cost).toBe(3);
    expect(r.streak).toEqual({ before: 0, after: 2 });
    expect(r.pay).toEqual({ half: 108, bonus: 9, pct: 0.04, total: 117 });
    expect(shift(m, 9).pay).toMatchObject({ bonus: 43, pct: 0.2 });
  });

  it('Public Works 216 → half 119 (+11); Ward Fund half 81 (−27); the streak bonus unchanged', () => {
    expect(jobPayWith(216, mods(ORD.publicWorks!))).toBe(238);
    const pw = shift(mods(ORD.publicWorks!), 9);
    expect(pw.pay).toEqual({
      half: 108,
      bonus: 43,
      pct: 0.2,
      total: 162,
      ordinance: { id: 'ord.public-works', label: 'Public Works Order', amount: 11 },
    });
    const wf = shift(mods(ORD.wardFund!), 9);
    expect(wf.pay.ordinance!.amount).toBe(-27);
    expect(wf.pay.total).toBe(108 + 43 - 27);
    expect(ordinanceTags({ kind: 'shift', type: 'job', base: 4, m: mods(ORD.wardFund!) })).toEqual([
      { ordinanceId: 'ord.ward-fund', name: 'Ward Fund', kind: 'iron', value: -25 },
    ]);
  });

  it('Open Doors: 66 → 70 with a named line; 93 → 95 at the clamp', () => {
    const r = ok(resolveTier1Action(canvass({ modifiers: mods(ORD.openDoors!) }), fixedRng([1])));
    expect(r.attempts[0]!.check.chance).toBe(70);
    expect(r.attempts[0]!.check.bonuses).toContainEqual({
      id: 'ord.open-doors',
      label: 'Open Doors',
      value: 4,
    });
    const high = ok(
      resolveTier1Action(
        canvass({
          values: { str: 10, int: 18, agi: 5, cha: 2 },
          standing: { successes: 10, names: NAMES, cityName: 'Coalport' },
          modifiers: mods(ORD.openDoors!),
        }),
        fixedRng([1]),
      ),
    );
    expect(high.attempts[0]!.check.raw).toBe(97);
    expect(high.attempts[0]!.check.chance).toBe(95);
  });

  it('Street Permits: a propaganda swing 0.04 → 0.046', () => {
    const base = {
      tier: 1 as const,
      energy: 8,
      outcome: 'success' as const,
      givesFxp: false,
      givesOpinion: true,
      restedUsed: 0,
    };
    expect(computeRewards(base).opinion).toBe(0.04);
    expect(computeRewards({ ...base, swingMultiplier: 1.15 }).opinion).toBe(0.046);
  });

  it('Ward Register ×2 inside a ×3 run: row 3 is Known (+6), not Familiar (+3)', () => {
    const run = (m?: CityModifiers) =>
      ok(
        resolveTier1Action(
          canvass({
            times: 3,
            standing: { successes: 26, names: NAMES, cityName: 'Coalport' },
            modifiers: m,
          }),
          fixedRng([1, 1, 1]),
        ),
      );
    const plain = run();
    expect(plain.standing.after).toBe(29);
    expect(plain.attempts[2]!.check.bonuses.find((b) => b.id === 'standing')?.value).toBe(3);
    const reg = run(mods(ORD.wardRegister!));
    expect(reg.standing.after).toBe(32);
    expect(reg.attempts[2]!.check.bonuses.find((b) => b.id === 'standing')?.value).toBe(6);
  });

  it('a 6-FXP canvass with an order, Fired up and Public Meetings: parts +2, +1, +2', () => {
    const orders = startOrders(TEMPLATES, DIRECTIVES.epochDay, true);
    const r = ok(
      resolveTier1Action(canvass({ orders, modifiers: mods(ORD.publicMeetings!, true) }), fixedRng([1])),
    );
    expect(r.rewards.fxp).toEqual({
      base: 6,
      bonus: 5,
      total: 11,
      parts: [
        { id: 'order', label: 'Party order', amount: 2 },
        { id: 'morale.fired', label: 'Fired up', amount: 1 },
        { id: 'ord.public-meetings', label: 'Public Meetings Order', amount: 2 },
      ],
    });
  });

  it('Ward Fund: Iron +25 % beside Rested, as two parts', () => {
    const r = ok(
      resolveTier1Action(
        canvass({ energy: { value: 100, rested: 10, updatedAt: T0 }, modifiers: mods(ORD.wardFund!) }),
        fixedRng([1]),
      ),
    );
    expect(r.rewards.iron).toEqual({
      base: 20,
      bonus: 15,
      total: 35,
      parts: [
        { id: 'rested', label: 'Rested', amount: 10 },
        { id: 'ord.ward-fund', label: 'Ward Fund', amount: 5 },
      ],
    });
  });

  it('Fired up pays only on actions that give FXP, and only for the home faction', () => {
    expect(cityModifiers({ ordinance: null, moraleState: 'fired', actorIsHomeFaction: false }).firedUp).toBe(
      false,
    );
    const r = ok(resolveTier1Action(canvass({ modifiers: mods(null, true) }), fixedRng([1])));
    expect(r.rewards.fxp.parts).toEqual([{ id: 'morale.fired', label: 'Fired up', amount: 1 }]);
    expect(r.rewards.xp.parts).toBeUndefined();
  });
});

describe('Rested and the Rest Day Order (ADR 0021 §5)', () => {
  const tick = 600_000;

  it('banks to 250 under the Rest Day Order', () => {
    const p = projectEnergy({ value: 100, rested: 190, updatedAt: T0 }, T0 + 20 * tick, 100, 250);
    expect(p.rested).toBe(250);
  });

  it('keeps 250 after expiry and never banks above 200 again until spent below it', () => {
    const kept = projectEnergy({ value: 100, rested: 250, updatedAt: T0 }, T0 + 20 * tick, 100, 200);
    expect(kept.rested).toBe(250);
    expect(projectEnergy({ value: 100, rested: 240, updatedAt: T0 }, T0 + 20 * tick, 100, 200).rested).toBe(
      240,
    );
    expect(projectEnergy({ value: 100, rested: 150, updatedAt: T0 }, T0 + 20 * tick, 100, 200).rested).toBe(
      200,
    );
  });

  it('the piecewise projection across a cap change equals the day-by-day one, and equals one cap throughout', () => {
    const d0 = dayKey(T0);
    const start = { value: 100, rested: 150, updatedAt: T0 };
    const capOn = (d: number) => (d === d0 + 1 ? 250 : 200);
    const until = dayStart(d0 + 3) + 3 * tick + 1;
    let s = start;
    for (let d = d0; d < d0 + 3; d++) {
      const p = projectEnergy(s, dayStart(d + 1), 100, capOn(d));
      s = { value: p.value, rested: p.rested, updatedAt: p.updatedAt };
    }
    const manual = projectEnergy(s, until, 100, capOn(d0 + 3));
    const through = projectEnergyThrough(start, until, capOn);
    expect(through).toEqual(manual);
    expect(through.rested).toBe(250);
    expect(projectEnergyThrough(start, until, () => 200)).toEqual(projectEnergy(start, until));
    expect(projectEnergyThrough(start, T0 + tick, () => 200)).toEqual(projectEnergy(start, T0 + tick));
  });
});

describe('the settlement and orders under slice 3', () => {
  it('each ended day pays its own ordinance’s half pay', () => {
    const d = 20_700;
    const s = settleDays({
      settled: d,
      today: d + 3,
      job: { id: 'coalport-factory-worker', since: 0, streak: 0, lastShiftDay: null },
      pay: 216,
      sickDays: { week: 0, left: 2 },
      tally: emptyTally(d),
      energy: { value: 100, rested: 0, updatedAt: dayStart(d) },
      now: dayStart(d + 3),
      halfPayOn: (ended) =>
        ended === d
          ? { amount: 119, label: 'Public Works Order' }
          : ended === d + 1
            ? { amount: 81, label: 'Ward Fund' }
            : { amount: 108, label: null },
    })!;
    expect(s.salary).toEqual({
      days: 3,
      perDay: 108,
      total: 308,
      ordinance: { label: 'Public Works Order · Ward Fund', amount: -16 },
    });
  });

  const crisis: OrderTemplate[] = [
    {
      id: 'dir.restore-canvass',
      factionId: 'collective',
      slot: 'A',
      title: 'Restore the base: the doors',
      line: 'Three conversations.',
      match: { actionTypes: ['canvass'], cityId: 'home' },
      target: 3,
      counts: 'attempts',
      use: 'crisis',
      doneFxp: 40,
    },
    {
      id: 'dir.restore-speech',
      factionId: 'collective',
      slot: 'B',
      title: 'Restore the base: say it',
      line: 'Out loud.',
      match: { actionTypes: ['speech'], cityId: 'home' },
      target: 1,
      counts: 'attempts',
      use: 'crisis',
      doneFxp: 40,
    },
  ];
  const all = [...TEMPLATES, ...crisis];

  it('crisis templates never rotate; the pair replaces A and B; +40 each; the welcome set wins', () => {
    for (let day = DIRECTIVES.epochDay; day < DIRECTIVES.epochDay + 60; day++) {
      expect(ordersForDay(all, day).some((t) => t.use === 'crisis')).toBe(false);
    }
    const o = startOrders(all, DIRECTIVES.epochDay, true, undefined, [
      'dir.restore-canvass',
      'dir.restore-speech',
    ]);
    expect(o.items.map((i) => i.templateId)).toEqual([
      'dir.restore-canvass',
      'dir.restore-speech',
      ordersForDay(all, DIRECTIVES.epochDay)[2]!.id,
    ]);
    expect(orderRewards(crisis, false)).toEqual({ fxp: 80, pc: 0 });
    expect(orderRewards([crisis[0], undefined], true)).toEqual({ fxp: 60, pc: 5 });
    const w = startOrders(
      all,
      DIRECTIVES.epochDay,
      true,
      ['dir.shift-change', 'dir.report', 'dir.work-shift'],
      ['dir.restore-canvass', 'dir.restore-speech'],
    );
    expect(w.items.map((i) => i.templateId)).toEqual(['dir.shift-change', 'dir.report', 'dir.work-shift']);
  });
});
