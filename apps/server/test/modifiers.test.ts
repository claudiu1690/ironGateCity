/**
 * The settlement v3 and modifiers in play (tech design §8.4, §8.5, §14; ADR 0021, 0022): salary
 * under a pay ordinance, Rested kept after the Rest Day Order, the Unrest crisis orders paying 40,
 * Stands Firm, Fired up parts, Ward Register, and a morale crossing in an action's modal.
 */
import { randomUUID } from 'node:crypto';
import { Character, City } from '@irongate/db';
import type { OpinionShares } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, nextCycleDay, player } from './politics.helpers';

beforeAll(async () => {
  await setupDb('modifiers-test');
});
afterAll(teardownDb);

const CANVASS = {
  actionId: 'coalport.mill-gate.canvass',
  locationId: 'coalport.mill-gate',
} as const;

const shares = (collective: number): OpinionShares => ({
  vanguard: 9,
  collective,
  alliance: 6,
  neutral: 100 - 15 - collective,
});

async function inForce(id: string, fromDay: number, toDay: number) {
  await City.updateOne(
    { _id: 'coalport' },
    {
      $set: { ordinance: { id, fromDay, toDay, paperId: null }, ordinanceHistory: [{ id, fromDay, toDay }] },
    },
  );
}

describe('the settlement v3', () => {
  it('salary: each ended day under the Ward Fund pays 216 − 54 plus seniority, and the desk says why', async () => {
    await resetCity('coalport');
    const D2 = nextCycleDay('coalport', 2, 20950);
    const clock = testClock(at(D2));
    const p = await player(clock);
    await p.caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    await inForce('ord.ward-fund', D2, D2 + 5);
    clock.set(at(D2 + 2));
    const paper = await p.caller.paper.today();
    // Review 1 (§9.1): the full wage per ended day; the Ward Fund's −25 % is a line on the unmodified
    // 216 (−54 a day), beside seniority's (+4, +9). There is no shift to carry a second Iron line.
    expect(paper.desk.salary).toEqual({
      jobName: 'Factory worker',
      days: 2,
      perDay: 216,
      seniority: { days: 2, pct: 4, amount: 13 },
      total: 2 * 216 + 13 - 108,
      ordinance: { label: 'Ward Fund', amount: -108 },
    });
  });

  it('Rested banked to 250 under the Rest Day Order stays 250 after it expires', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 20970);
    const clock = testClock(at(D, 1));
    const p = await player(clock);
    await inForce('ord.rest-day', D, D + 1);
    expect((await p.caller.character.me()).restedCap).toBe(250);
    clock.set(at(D + 2, 9));
    const me = await p.caller.character.me();
    expect(me.restedCap).toBe(200);
    expect(me.rested).toBe(250);
    const paper = await p.caller.paper.today();
    expect(paper.desk.rested).toEqual({ value: 250, cap: 200 });
  });

  it('Unrest: the Restore-the-base pair replaces slots A and B and pays 40 each; Stands Firm next', async () => {
    await resetCity('coalport');
    // Cycle day 0: the next two boundaries are not counts (a count with no ballot costs 3).
    const D = nextCycleDay('coalport', 0, 20990);
    const clock = testClock(at(D));
    const p = await player(clock, { successes: 50 });
    await City.updateOne(
      { _id: 'coalport' },
      { $set: { opinion: shares(55), morale: { state: 'unrest', since: D, previous: 'steady' } } },
    );
    clock.set(at(D + 1));
    const me = await p.caller.character.me();
    expect(me.orders.items.map((o) => o.id).slice(0, 2)).toEqual([
      'dir.restore-canvass',
      'dir.restore-speech',
    ]);
    // Review 1 (§13.7): titles say what and where.
    expect(me.orders.items[0]!.title).toBe('Restore the base: canvass anywhere in Coalport');
    let last;
    for (let i = 0; i < 3; i++) {
      last = await p.caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    }
    expect(last!.effects.orders).toContainEqual(
      expect.objectContaining({ id: 'dir.restore-canvass', done: true, fxp: 40 }),
    );
    // Leaving Unrest: back above 60 at a boundary → Stands Firm the next morning.
    await City.updateOne({ _id: 'coalport' }, { $set: { opinion: shares(59.9) } });
    clock.set(at(D + 2));
    const paper = await p.caller.paper.today();
    expect((await City.findById('coalport').lean())!.morale).toMatchObject({
      state: 'steady',
      previous: 'unrest',
    });
    expect(paper.headlines.map((h) => h.headline)).toContain('Coalport Stands Firm');
  });
});

describe('modifiers in play', () => {
  it('Fired up: +10 % FXP as a part on a canvass', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21010);
    const clock = testClock(at(D));
    const p = await player(clock);
    await City.updateOne({ _id: 'coalport' }, { $set: { opinion: shares(85) } });
    // INT 20: 95 % a row, so the ×3 has a Success (a Partial's 0.3 FXP rounds to no part).
    await Character.updateOne({ _id: p.id }, { $set: { 'stats.int': 20 } });
    const r = await p.caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 });
    expect(r.rewards.fxp.parts?.find((x) => x.id === 'morale.fired')?.amount).toBe(r.successes);
    expect(r.bonusTags).toContainEqual({ id: 'morale.fired', label: 'Fired up', note: '+10 % FXP' });
    // Review 1 (§9.1): "nothing on a shift" is gone with the shift.
    const city = await p.caller.city.get({ cityId: 'coalport' });
    expect(city.morale).toMatchObject({ state: 'fired' });
  });

  it('Ward Register: every Success writes two Successes of Local Standing', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21030);
    const clock = testClock(at(D));
    const p = await player(clock);
    await inForce('ord.ward-register', D, D + 5);
    const r = await p.caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 });
    expect(r.effects.standing!.after.successes).toBe(2 * r.successes);
  });

  it('an action crossing 80 writes the morale record and says so in the modal', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21050);
    const clock = testClock(at(D));
    const p = await player(clock);
    await City.updateOne({ _id: 'coalport' }, { $set: { opinion: shares(79.99) } });
    const r = await p.caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 });
    expect(r.effects.morale).toEqual({
      cityId: 'coalport',
      cityName: 'Coalport',
      before: 'steady',
      after: 'fired',
    });
    expect((await City.findById('coalport').lean())!.morale).toMatchObject({ state: 'fired', since: D });
  });
});
