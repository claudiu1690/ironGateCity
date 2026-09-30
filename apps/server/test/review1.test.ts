/**
 * Review 1 (docs/design/review-1-answers.md; GDD §0 "Added 30 Sep 2026 (review 1)", §8.4, §9, §13.4,
 * §13.7): the wage under the Long Service Order, the welcome set by the best trained stat, the First
 * day row, best-stat council sessions, the orders-complete note, and One of Us paying 1 PC a day.
 */
import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Character, City } from '@irongate/db';
import { dayKey, dayStart } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  arrive,
  callerFor,
  freshCharacter,
  newUser,
  noOrdinance,
  rewindCityIfAhead,
  seedRecruit,
  setupDb,
  teardownDb,
  testClock,
} from './helpers';
import { at, doTodaysOrders, nextCycleDay, player } from './politics.helpers';

const DAY = 86_400_000;
const content = getContent();
const CANVASS = { actionId: 'coalport.mill-gate.canvass', locationId: 'coalport.mill-gate' } as const;
const COMMITTEE = { actionId: 'coalport.union-hall.committee', locationId: 'coalport.union-hall' } as const;
const FIRST_DAY_COALPORT = { id: 'first-day', label: 'First day in Coalport', value: 10 };

beforeAll(async () => {
  await setupDb('review1-test');
});
afterAll(teardownDb);

/** A real arrival (the join) at `clock`, the home city rewound if an earlier test left it ahead. */
async function joined(clock = testClock(), factionId: FactionId = 'collective') {
  await rewindCityIfAhead(content.faction(factionId).homeCityId, clock.now());
  const user = newUser('Ada Varga');
  const caller = callerFor(user, clock.now);
  await arrive(caller, { factionId });
  return { user, caller, clock };
}

/** A recruit on its welcome day (arrived now) with the given trained stats. */
async function welcomeRecruit(
  factionId: FactionId,
  stats: Partial<{ str: number; int: number; agi: number }>,
  clock = testClock(),
) {
  const user = newUser('Ada Varga');
  await seedRecruit(user, clock.now(), { factionId, arrivedAt: clock.now(), stats });
  const caller = callerFor(user, clock.now);
  return { user, caller, clock, me: await caller.character.me() };
}

describe('the wage under the Long Service Order (GDD §9.1, §15.3)', () => {
  it('each boundary adds two seniority days: the full rate (+20 %) in five days, the cap unchanged', async () => {
    const D = nextCycleDay('coalport', 2, 20760); // a division day: the next is D+5
    const clock = testClock(at(D));
    const { caller } = await freshCharacter(clock, 'Long Server');
    await noOrdinance('coalport'); // no branch motion at the next division
    await City.updateOne(
      { _id: 'coalport' },
      {
        $set: {
          ordinance: { id: 'ord.long-service', fromDay: D, toDay: D + 5, paperId: null },
          ordinanceHistory: [{ id: 'ord.long-service', fromDay: D, toDay: D + 5 }],
        },
      },
    );
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    // Seniority 2, 4, 6, 8, 10 → lines 9, 17, 26, 35, 43 on 216.
    const lines = [9, 17, 26, 35, 43];
    let iron = 0;
    for (const [i, line] of lines.entries()) {
      clock.set(at(D + i + 1));
      iron += 216 + line;
      const me = await caller.character.me();
      expect(me.iron).toBe(iron);
      expect(me.job!.seniority.days).toBe(2 * (i + 1));
    }
    expect((await caller.character.me()).job!.seniority).toEqual({ days: 10, pct: 20 });
    // The next boundary pays the capped rate, whatever the step: 216 + 43 = 259.
    clock.set(at(D + 6));
    expect((await caller.character.me()).iron).toBe(iron + 259);
  });
});

describe('the welcome set by the best trained stat (GDD §13.7)', () => {
  it('the Vanguard reference recruit (STR 11 = INT 11): the tie goes to STR, the faction’s stat', async () => {
    const { caller } = await joined(testClock(), 'vanguard');
    const me = await caller.character.me();
    expect(me.stats).toMatchObject({ str: 11, int: 11 });
    expect(me.orders.items.map((o) => o.id)).toEqual([
      'dir.v.guard-change',
      'dir.v.report',
      'dir.v.take-a-job',
    ]);
    const paper = await caller.paper.today();
    expect(paper.landing).toEqual({ cityId: 'duskwall', locationId: 'duskwall.garrison-gate' });
    expect(paper.headlines[0]!.deck).toMatch(/Spend it at the Fortress Gate first\.$/);
  });

  it('a STR-heavy Vanguard (STR 14, INT 5): the Fortress Gate canvass, and the committee checks STR', async () => {
    const { caller, me } = await welcomeRecruit('vanguard', { str: 14, int: 5, agi: 5 });
    expect(me.welcomeDay).toBe(true);
    expect(me.orders.items.map((o) => [o.id, o.title])).toEqual([
      ['dir.v.guard-change', 'Talk to the customs men at the Fortress Gate'],
      ['dir.v.report', 'Go to the district meeting at Beacon House'],
      ['dir.v.take-a-job', 'Take a job at the Fortress Gate'],
    ]);
    expect(me.orders.items[0]!.pin?.locationId).toBe('duskwall.garrison-gate');
    const city = await caller.city.get({ cityId: 'duskwall' });
    const committee = city.locations
      .flatMap((l) => l.actions)
      .find((a) => a.id === 'duskwall.beacon-house.committee')!;
    // The best stat, STR 14: 50 + 4 × 6 = 74, and +10 on the welcome day.
    expect(committee.preview).toMatchObject({ stats: ['str'], best: true, statValue: 14, chance: 84 });
  });

  it('an INT-heavy Vanguard: the ration queue at the Customs Market (a welcome-only template)', async () => {
    const { me } = await welcomeRecruit('vanguard', { str: 5, int: 14, agi: 5 });
    expect(me.orders.items[0]).toMatchObject({
      id: 'dir.v.w.ration-queue',
      title: 'Talk to the queue at the Customs Market',
      target: 2,
      pin: { locationId: 'duskwall.quartermaster-market' },
    });
  });

  it('an AGI-heavy Vanguard: leaflets at the Customs Market', async () => {
    const { me } = await welcomeRecruit('vanguard', { str: 5, int: 5, agi: 14 });
    expect(me.orders.items[0]).toMatchObject({
      id: 'dir.v.w.leaflets-market',
      title: 'Hand out flyers at the Customs Market',
      pin: { locationId: 'duskwall.quartermaster-market' },
    });
  });

  it('ties without the faction’s stat go to INT, then STR (INT 12 = AGI 12 for the Vanguard)', async () => {
    const { me } = await welcomeRecruit('vanguard', { str: 5, int: 12, agi: 12 });
    expect(me.orders.items[0]!.id).toBe('dir.v.w.ration-queue');
  });

  it('an AGI-heavy Collective and a STR-heavy Alliance get their cities’ welcome templates', async () => {
    const c = await welcomeRecruit('collective', { str: 5, int: 5, agi: 14 });
    expect(c.me.orders.items[0]).toMatchObject({
      id: 'dir.w.leaflets-market-row',
      title: 'Hand out flyers on Market Row',
    });
    const a = await welcomeRecruit('alliance', { str: 14, int: 5, agi: 5 });
    expect(a.me.orders.items[0]).toMatchObject({
      id: 'dir.a.w.bills',
      title: "Put up posters on Weavers' Row",
    });
  });

  it('the welcome set never comes back in the rotation: the next day is the rotation, with no Take a job', async () => {
    const { caller, clock } = await welcomeRecruit('collective', {});
    clock.advance(DAY);
    const me = await caller.character.me();
    expect(me.welcomeDay).toBe(false);
    const ids = me.orders.items.map((o) => o.id);
    expect(ids).not.toContain('dir.take-a-job');
    expect(
      content
        .ordersOf('collective')
        .filter((t) => ids.includes(t.id))
        .every((t) => t.use === 'rotation'),
    ).toBe(true);
  });
});

describe('First day +10 % (GDD §8.4)', () => {
  it('on the welcome day every home check carries the row, in previews and results; the next day it is gone', async () => {
    const { caller, clock } = await joined();
    const me = await caller.character.me();
    expect(me.welcomeDay).toBe(true);
    const city = await caller.city.get({ cityId: 'coalport' });
    const ticket = city.locations[0]!.actions.find((a) => a.id === CANVASS.actionId)!;
    expect(ticket.preview).toMatchObject({ chance: 76, bonuses: [FIRST_DAY_COALPORT] });
    // Every checked ticket at home carries it.
    for (const a of city.locations.flatMap((l) => l.actions)) {
      if (a.preview) expect(a.preview.bonuses, a.id).toContainEqual(FIRST_DAY_COALPORT);
    }
    const r = await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    expect(r.attempts[0]!.check).toMatchObject({ chance: 76, bonuses: [FIRST_DAY_COALPORT] });
    expect(r.bonusTags).toContainEqual({
      id: 'first-day',
      label: 'First day in Coalport',
      note: 'better odds',
    });

    clock.advance(DAY);
    const next = await caller.character.me();
    expect(next.welcomeDay).toBe(false);
    const later = await caller.city.get({ cityId: 'coalport' });
    const again = later.locations[0]!.actions.find((a) => a.id === CANVASS.actionId)!;
    expect(again.preview?.bonuses).not.toContainEqual(FIRST_DAY_COALPORT);
    expect(again.preview?.chance).toBe(66);
    const r2 = await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    expect(r2.bonusTags.map((t) => t.id)).not.toContain('first-day');
  });

  it('a join after 22:00 UTC: the next City Day is a welcome day too, with the welcome set again; the day after is not', async () => {
    const clock = testClock(Date.UTC(2026, 8, 29, 22, 30));
    const { caller } = await joined(clock);
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    clock.set(Date.UTC(2026, 8, 30, 9));
    const day2 = await caller.character.me();
    expect(day2.welcomeDay).toBe(true);
    expect(day2.orders.items.map((o) => o.id)).toEqual(['dir.shift-change', 'dir.report', 'dir.take-a-job']);
    // The job is already held: Take a job starts done (at the day's start) and pays nothing.
    expect(day2.orders.items[2]).toMatchObject({ done: true, progress: 1 });
    const stored = (await Character.findOne({ _id: day2.id }).lean())!;
    expect(stored.orders.items[2]!.doneAt?.getTime()).toBe(dayStart(dayKey(clock.now())));
    expect(day2.today.fxp).toBe(0);
    const city = await caller.city.get({ cityId: 'coalport' });
    expect(city.locations[0]!.actions[0]!.preview?.chance).toBe(76);
    // Two orders to do; the note's FXP tile counts only the two completed today (the job paid nothing).
    await doTodaysOrders(caller);
    expect((await caller.character.me()).orders.complete).toEqual({ pc: 5, fxp: 40 });

    clock.set(Date.UTC(2026, 9, 1, 9));
    const day3 = await caller.character.me();
    expect(day3.welcomeDay).toBe(false);
    expect(day3.orders.items.map((o) => o.id)).not.toContain('dir.take-a-job');
  });
});

describe('council sessions check the best trained stat (GDD §8.4)', () => {
  it('the committee preview and result name the stat taken: INT 12 for the reference recruit', async () => {
    const { caller } = await freshCharacter(testClock(Date.UTC(2026, 9, 19, 9)));
    const city = await caller.city.get({ cityId: 'coalport' });
    const ticket = city.locations.flatMap((l) => l.actions).find((a) => a.id === COMMITTEE.actionId)!;
    expect(ticket.preview).toMatchObject({ stats: ['int'], best: true, statValue: 12, chance: 66 });
    const r = await caller.action.perform({ ...COMMITTEE, idempotencyKey: randomUUID(), times: 1 });
    expect(r.attempts[0]!.check).toMatchObject({ stats: ['int'], best: true, chance: 66 });
    // A point of STR past INT changes the stat taken.
    await Character.updateOne({ _id: r.character.id }, { $set: { 'stats.str': 13 } });
    const after = await caller.city.get({ cityId: 'coalport' });
    expect(
      after.locations.flatMap((l) => l.actions).find((a) => a.id === COMMITTEE.actionId)!.preview,
    ).toMatchObject({ stats: ['str'], best: true, statValue: 13, chance: 70 });
  });
});

describe('the orders-complete note (GDD §13.7)', () => {
  it('shown once all three are done, waits across a fresh character.me, cleared by seeOrdersNote', async () => {
    const { user, caller, clock } = await freshCharacter(testClock(Date.UTC(2026, 9, 19, 9)), 'Note Reader');
    expect((await caller.character.me()).orders.complete).toBeNull();
    await doTodaysOrders(caller);
    const done = await caller.character.me();
    expect(done.orders.allDone).toBe(true);
    expect(done.orders.complete).toEqual({ pc: 5, fxp: 60 });
    // Resumable: a new session (a new caller) still finds it.
    const other = callerFor(user, clock.now);
    expect((await other.character.me()).orders.complete).toEqual({ pc: 5, fxp: 60 });
    const seen = await caller.character.seeOrdersNote();
    expect(seen.orders.complete).toBeNull();
    expect((await caller.character.seeOrdersNote()).orders.complete).toBeNull(); // idempotent
    expect((await other.character.me()).orders.complete).toBeNull();
    expect((await Character.findById(done.id).lean())!.pc).toBe(5); // seeing it pays nothing more
    // The next day: nothing done yet, no note.
    clock.advance(DAY);
    expect((await caller.character.me()).orders.complete).toBeNull();
  });
});

describe('One of Us pays 1 PC a day (GDD §13.4)', () => {
  it('1 PC per boundary per city where it is held, capped at 14 boundaries; 149 Successes pay nothing', async () => {
    const clock = testClock(at(20800));
    const held = await player(clock, { name: 'One Of Us', successes: 150 });
    const almost = await player(clock, { name: 'Nearly There', successes: 149 });
    const two = await player(clock, { name: 'Two Towns', successes: 150 });
    await Character.updateOne(
      { _id: two.id },
      { $push: { localStanding: { cityId: 'duskwall', successes: 150 } } },
    );
    clock.set(at(20803));
    expect((await held.caller.character.me()).pc).toBe(3);
    expect((await almost.caller.character.me()).pc).toBe(0);
    expect((await two.caller.character.me()).pc).toBe(6);
    // Away 20 days: at most 14 boundaries are paid (like the wage).
    clock.set(at(20823));
    expect((await held.caller.character.me()).pc).toBe(3 + 14);
  });
});
