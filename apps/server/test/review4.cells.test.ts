/**
 * Review 4, T7 (docs/tech/review-4.md §11.4, §11.7; ADR 0078; GDD §19.2, §11.2, §13.7): the cells'
 * three costs on every arrest path (a mission with no run-in, a run-in lost by choice, by luck, a
 * rival tap's run-in, the test hook), and *In the cells now* (`held.inCells`).
 */
import { Character, Stay } from '@irongate/db';
import type { ActionResult, RunInPending } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { releaseHeldNow, sendToHeld } from '../src/services/heldService';
import { streetHooks } from '../src/services/streetHooks';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import type { Player } from './politics.helpers';
import { at, content, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const POSTERS = { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi' };
const WATCH = { locationId: 'coalport.customs-house', missionId: 'coalport.customs-house.watch', wayId: 'int' };
const CANVASS = { actionId: 'coalport.mill-gate.canvass', locationId: 'coalport.mill-gate' };
const RIVAL_CANVASS = { actionId: 'duskwall.quartermaster-market.canvass', locationId: 'duskwall.quartermaster-market' };

beforeAll(async () => {
  await setupDb('review4-cells-test');
  streetHooks.enabled = true;
});
afterAll(async () => {
  streetHooks.enabled = false;
  await teardownDb();
});

const oid = (id: string) => new Types.ObjectId(id);
const asResult = (r: unknown) => r as ActionResult;

/**
 * Today's orders set by hand (after the day settled): the canvass two of three, the mission order
 * open, *Sharpen up* done. A mission at the Far Bank would complete the mission order.
 */
async function withOrders(p: Player): Promise<void> {
  await p.caller.character.me();
  await Character.updateOne(
    { _id: p.id },
    {
      $set: {
        orders: {
          day: DAY,
          items: [
            { templateId: 'dir.canvass-coalport', variant: 'main', target: 3, progress: 2, doneAt: null },
            { templateId: 'dir.mission', variant: 'main', target: 1, progress: 0, doneAt: null },
            { templateId: 'dir.sharpen-up', variant: 'main', target: 1, progress: 1, doneAt: new Date(at(DAY)) },
          ],
          allDoneAt: null,
        },
      },
      $inc: { version: 1 },
    },
  );
}

describe('a caught Partial while Hot (a mission with no run-in)', () => {
  it('the sentence 20 + Heat ÷ 2, orders off from the arrest, the act counts for no order; after bail nothing advances and the +5 PC is not paid; the next day opens', async () => {
    const clock = testClock(at(DAY) + 30 * 60_000);
    const p = await member(clock, { name: 'Ada Closed', rank: 3, iron: 1_000 });
    await withOrders(p);
    await setRisk(p.id, clock.now(), { heat: 60 });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    const r = asResult(await p.caller.mission.start({ ...POSTERS, idempotencyKey: key() }));
    expect(r.stamp).toBe('takenIn');
    expect(r.effects.orders).toEqual([]);
    expect(r.street).toMatchObject({ ordersOff: true, record: { added: 1, takenIn: true, after: 'onFile' } });

    const c = (await Character.findById(p.id).lean())!;
    const heatAtArrest = r.street!.heat!.after;
    expect(c.held!.until.getTime() - c.held!.since.getTime()).toBe((20 + Math.floor(heatAtArrest / 2)) * 60_000);
    expect(c.orders.off).toEqual({ at: new Date(clock.now()), reason: 'cells' });
    expect(c.orders.items.map((i) => i.progress)).toEqual([2, 0, 1]);
    expect(c.record!.arrests).toEqual([DAY]);

    const me = await p.caller.character.me();
    expect(me.orders.off).toEqual({ reason: 'cells' });
    expect(me.orders.items.every((o) => o.pin === null)).toBe(true);
    expect((await p.caller.held.get())!.ordersOff).toBe(true);

    const out = await p.caller.held.bail({ idempotencyKey: key() });
    expect(out.knockOns).toMatchObject({ takenIn: { added: 1, marks: 1, level: 'onFile' }, ordersOff: true });

    // An action after it advances nothing; the third canvass would have finished all three.
    const pcBefore = (await Character.findById(p.id).lean())!.pc;
    const a = await p.caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 1 });
    expect(a.effects.orders).toEqual([]);
    expect(a.effects.ordersAllDone).toBeNull();
    const after = (await Character.findById(p.id).lean())!;
    expect(after.pc).toBe(pcBefore);
    expect(after.orders.items.map((i) => i.progress)).toEqual([2, 0, 1]);
    // The tickets carry no order tag while the orders are off.
    const city = await p.caller.city.get({ cityId: 'coalport' });
    expect(city.locations.flatMap((l) => l.actions).every((t) => t.order === null)).toBe(true);

    // The next City Day's orders are open.
    clock.set(at(DAY + 1) + 60_000);
    const tomorrow = await p.caller.character.me();
    expect(tomorrow.orders.off ?? null).toBeNull();
    expect((await Character.findById(p.id).lean())!.orders.off ?? null).toBeNull();
  });
});

describe('a run-in with the police lost', () => {
  it('by choice, on a watch: the cells, one minor mark, orders off; the stay counts the mark', async () => {
    const clock = testClock(at(DAY) + 40 * 60_000);
    const p = await member(clock, { name: 'Bo Watch', rank: 3, iron: 1_000 });
    await withOrders(p);
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'city-police', checkRoll: 1, choiceRoll: 100 });
    const pending = (await p.caller.mission.start({ ...WATCH, idempotencyKey: key() })) as unknown as RunInPending;
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() });
    expect(r.stamp).toBe('takenIn');
    expect(r.street).toMatchObject({ ordersOff: true, record: { added: 1, takenIn: true } });
    const c = (await Character.findById(p.id).lean())!;
    expect(c.record!.marks).toMatchObject([{ day: DAY, kind: 'minor' }]);
    expect(c.record!.arrests).toEqual([DAY]);
    expect(c.orders.off?.reason).toBe('cells');
    expect(c.orders.items.map((i) => i.progress)).toEqual([2, 0, 1]);
    expect(c.held!.bail!.total).toBe(150);
    expect((await Stay.findOne({ characterId: p.id }).lean())!.marks).toBe(1);
  });

  it('by luck (the read path after the decide time): the same', async () => {
    const clock = testClock(at(DAY) + 50 * 60_000);
    const p = await member(clock, { name: 'Cy Luck', rank: 3, iron: 1_000 });
    await withOrders(p);
    // Strong enough that luck fights (its best row), and the forced roll loses it.
    await Character.updateOne({ _id: p.id }, { $set: { 'stats.str': 60 }, $inc: { version: 1 } });
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'city-police', checkRoll: 1, choiceRoll: 100 });
    const pending = (await p.caller.mission.start({ ...POSTERS, idempotencyKey: key() })) as unknown as RunInPending;
    expect(pending.luck).toBe('fight');
    clock.set(pending.decideBy + 1_000);
    const me = await p.caller.character.me();
    expect(me.held).toMatchObject({ kind: 'cells', state: 'in' });
    expect(me.orders.off).toEqual({ reason: 'cells' });
    const c = (await Character.findById(p.id).lean())!;
    expect(c.orders.off!.at.getTime()).toBe(pending.decideBy);
    expect(c.record!.arrests).toEqual([DAY]);
    expect(c.record!.marks.length).toBeGreaterThanOrEqual(1);
  });

  it('on a rival tap: one minor mark, recorded, orders off, bail on the mark (×2 on rival ground)', async () => {
    const clock = testClock(at(DAY) + 60 * 60_000);
    const p = await member(clock, { name: 'Di Rival', level: 10, rank: 3, cityId: 'duskwall', iron: 1_000 });
    await withOrders(p);
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'city-police', checkRoll: 1, choiceRoll: 100 });
    const pending = (await p.caller.action.perform({ ...RIVAL_CANVASS, idempotencyKey: key(), times: 1 })) as unknown as RunInPending;
    expect(pending.kind).toBe('runIn');
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() });
    expect(r.stamp).toBe('takenIn');
    expect(r.street).toMatchObject({ ordersOff: true, record: { added: 1, before: 'clean', after: 'onFile', takenIn: true } });
    const c = (await Character.findById(p.id).lean())!;
    expect(c.record!.marks).toMatchObject([{ day: DAY, kind: 'minor' }]);
    expect(c.record!.arrests).toEqual([DAY]);
    expect(c.orders.off?.reason).toBe('cells');
    expect(c.held!.bail!.total).toBe(300);
    expect((await Stay.findOne({ characterId: p.id }).lean())!.marks).toBe(1);
  });

  it('the test hook writes the same: the mark, the arrest, the orders off', async () => {
    const clock = testClock(at(DAY) + 70 * 60_000);
    const p = await member(clock, { name: 'Ed Hook' });
    await withOrders(p);
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const c = (await Character.findById(p.id).lean())!;
    expect(c.record!.marks).toMatchObject([{ day: DAY, kind: 'minor' }]);
    expect(c.record!.arrests).toEqual([DAY]);
    expect(c.orders.off?.reason).toBe('cells');
    expect((await Stay.findOne({ characterId: p.id }).lean())!.marks).toBe(1);
  });
});

describe('In the cells now (held.inCells)', () => {
  it('any party, soonest out first; not a stay past until; you; a place that is not the cells is refused', async () => {
    const clock = testClock(at(DAY) + 2 * 3_600_000);
    const viewer = await member(clock, { name: 'Flo Looks' });
    const van = await member(clock, { name: 'Gil Vanguard', factionId: 'vanguard', level: 10, cityId: 'coalport' });
    const gone = await member(clock, { name: 'Hal Gone' });
    await setRisk(van.id, clock.now(), { heat: 60 });
    await sendToHeld(content, oid(van.id), 'cells', clock.now());
    await sendToHeld(content, oid(gone.id), 'cells', clock.now());
    // Past its `until` and not yet released (release is lazy): not shown.
    await releaseHeldNow(oid(gone.id), clock.now() - 1);

    const list = await viewer.caller.held.inCells({ locationId: 'coalport.harbour-police' });
    expect(list.serverNow).toBe(clock.now());
    expect(list.rows).toHaveLength(1);
    expect(list.rows[0]).toMatchObject({ name: 'Gil Vanguard', factionId: 'vanguard', you: false });
    expect(list.rows[0]!.until).toBeGreaterThan(clock.now());
    expect(Object.keys(list.rows[0]!).sort()).toEqual(['avatar', 'factionId', 'name', 'until', 'you']);

    await sendToHeld(content, oid(viewer.id), 'cells', clock.now());
    const mine = await viewer.caller.held.inCells({ locationId: 'coalport.harbour-police' });
    expect(mine.rows.map((r) => [r.name, r.you])).toEqual([
      ['Flo Looks', true],
      ['Gil Vanguard', false],
    ]);
    // Nobody held at the Lock-up.
    expect((await viewer.caller.held.inCells({ locationId: 'duskwall.lock-up' })).rows).toEqual([]);

    await expect(viewer.caller.held.inCells({ locationId: 'coalport.mill-gate' })).rejects.toSatisfy(
      (e) => gameData(e).code === 'NOT_FOUND',
    );
    await expect(viewer.caller.held.inCells({ locationId: 'nowhere' })).rejects.toSatisfy(
      (e) => gameData(e).code === 'NOT_FOUND',
    );
  });

  it('the station sheet says so: cellsHere on each city’s cells only', async () => {
    const clock = testClock(at(DAY) + 3 * 3_600_000);
    const p = await member(clock, { name: 'Ivo Map' });
    const city = await p.caller.city.get({ cityId: 'coalport' });
    expect(city.locations.filter((l) => l.cellsHere).map((l) => l.id)).toEqual(['coalport.harbour-police']);
  });
});
