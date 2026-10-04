/**
 * Slice 5, T16 (ADR 0033; tech design §8.2 `heldService`, §10.3, §15 "Server — held"): the cells and
 * the infirmary — lazy release and discharge as of `until`, bail, *Walk out well*, *Discharge
 * yourself*, the held tap, `held.get` and `close`, deportation and the bar, and `record.strike`.
 */
import { ActionLog, Character, Journey, Stay } from '@irongate/db';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { releaseHeldNow, sendToHeld } from '../src/services/heldService';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { setIssueEffect } from './slice4.helpers';
import { at, content, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026

beforeAll(async () => {
  await setupDb('slice5-held-test');
});
afterAll(teardownDb);

const oid = (id: string) => new Types.ObjectId(id);

describe('the cells (design §8)', () => {
  it('a stay over: released as of until with Heat 25; the modal stored; close lands at the police', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ada Cell' });
    await setRisk(p.id, clock.now(), { heat: 60 });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    let held = (await p.caller.held.get())!;
    // 10 + 60 ÷ 2 = 40 minutes; bail 100 (no marks).
    expect(held).toMatchObject({ kind: 'cells', state: 'in', placeName: 'Harbour Police', again: false });
    expect(held.until - at(DAY)).toBe(40 * 60_000);
    expect(held.bail).toMatchObject({ total: 100, legalAid: false });
    expect(held.tap).toMatchObject({ id: 'held.cells', energy: 3, energy3: null });
    expect(held.walkOut).toBeNull();

    clock.set(held.until + 5 * 60_000);
    const me = await p.caller.character.me();
    expect(me.held).toMatchObject({ state: 'out' });
    // Heat 25 at `until`, cooled five minutes since (5 an hour → under one point).
    expect(me.heat!.value).toBe(25);
    const stay = (await Stay.findOne({ characterId: p.id }).lean())!;
    expect(stay).toMatchObject({ how: 'served', heatAfter: 25 });
    expect(stay.releasedAt!.getTime()).toBe(held.until);
    held = (await p.caller.held.get())!;
    expect(held.release).toMatchObject({ act: 'released', stamp: { label: 'Released' }, knockOns: { heat: { after: 25 } } });
    const closed = await p.caller.held.close({ stayId: held.stayId });
    expect(closed.landing).toMatchObject({ cityId: 'coalport', locationId: 'coalport.harbour-police' });
    expect(closed.character.held).toBeNull();
    expect(await p.caller.held.get()).toBeNull();
  });

  it('bail: the Iron, out now; bail in the infirmary is refused NOT_IN_CELLS; short of Iron NOT_ENOUGH_IRON', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Bo Bail', iron: 120 });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const r = await p.caller.held.bail({ idempotencyKey: key() });
    expect(r).toMatchObject({ act: 'bail', knockOns: { iron: { before: 120, after: 20 } }, view: { kind: 'held' } });
    expect((await Character.findById(p.id).lean())!.iron).toBe(20);
    expect((await Stay.findOne({ characterId: p.id }).lean())!.how).toBe('bail');

    const q = await member(clock, { name: 'Cy Poor', iron: 50 });
    await sendToHeld(content, oid(q.id), 'cells', clock.now());
    await expect(q.caller.held.bail({ idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'NOT_ENOUGH_IRON',
    );
    const w = await member(clock, { name: 'Di Ward' });
    await sendToHeld(content, oid(w.id), 'infirmary', clock.now());
    await expect(w.caller.held.bail({ idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'NOT_IN_CELLS',
    );
  });

  it('Legal Aid halves an Alliance member’s bail; The Cells Are Full halves it again in Irongate', async () => {
    const clock = testClock(at(DAY));
    const a = await member(clock, { name: 'Ed Aid', factionId: 'alliance' });
    await sendToHeld(content, oid(a.id), 'cells', clock.now());
    expect((await a.caller.held.get())!.bail).toMatchObject({ total: 50, legalAid: true });

    await setIssueEffect('irongate', 'issue.cells-full', DAY - 1, DAY + 6);
    const b = await member(clock, { name: 'Flo Full', level: 10, cityId: 'irongate' });
    await sendToHeld(content, oid(b.id), 'cells', clock.now());
    const bail = (await b.caller.held.get())!.bail!;
    expect(bail.total).toBe(50);
    expect(bail.lines.map((l) => l.id)).toContain('issue.cells-full');
  });

  it('a bail race against the lazy release: one release', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Gil Race' });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const held = (await p.caller.held.get())!;
    clock.set(held.until + 1);
    await Promise.allSettled([p.caller.held.bail({ idempotencyKey: key() }), p.caller.character.me()]);
    const stays = await Stay.find({ characterId: p.id }).lean();
    expect(stays).toHaveLength(1);
    expect(stays[0]!.releasedAt).not.toBeNull();
    const c = (await Character.findById(p.id).lean())!;
    expect(c.held!.state).toBe('out');
    expect(c.iron).toBe(1_000 - stays[0]!.ironPaid);
  });

  it('the held tap: one tap in the cells; refused NOT_HELD outside', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Hal Listen' });
    await expect(p.caller.held.act({ idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'NOT_HELD',
    );
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const r = await p.caller.held.act({ idempotencyKey: key() });
    expect(r).toMatchObject({ kind: 'checked', action: { id: 'held.cells', times: 1 } });
    expect(['success', 'partial', 'failure']).toContain(r.stamp);
    expect(await ActionLog.countDocuments({ characterId: p.id, actionId: 'held.cells' })).toBe(1);
  });
});

describe('the infirmary (design §9)', () => {
  it('discharged as of until with the regen; Walk out well; Discharge yourself', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ivo Mend' });
    await sendToHeld(content, oid(p.id), 'infirmary', clock.now());
    let held = (await p.caller.held.get())!;
    expect(held).toMatchObject({ kind: 'infirmary', health: { value: 30, max: 125 }, bail: null });
    expect(held.walkOut).toMatchObject({ energy: 5, iron: 100, affordable: true });
    expect(held.discharge).toMatchObject({ energy: 5, healthTo: 62 });
    clock.set(held.until);
    const me = await p.caller.character.me();
    expect(me.held!.state).toBe('out');
    expect(me.health!.value).toBe(50); // 30 + 10 × 2 ticks
    held = (await p.caller.held.get())!;
    expect(held.release).toMatchObject({ act: 'discharged' });

    const q = await member(clock, { name: 'Jo Walk' });
    await sendToHeld(content, oid(q.id), 'infirmary', clock.now());
    const before = (await Character.findById(q.id).lean())!;
    const w = await q.caller.held.walkOut({ idempotencyKey: key() });
    expect(w).toMatchObject({ act: 'walkOut', knockOns: { health: { after: 125 }, iron: { after: before.iron - 100 } } });
    const after = (await Character.findById(q.id).lean())!;
    expect(after.rested).toBe(before.rested); // Energy without Rested

    const r = await member(clock, { name: 'Kit Self' });
    await sendToHeld(content, oid(r.id), 'infirmary', clock.now());
    const d = await r.caller.held.discharge({ idempotencyKey: key() });
    expect(d).toMatchObject({ act: 'discharged', knockOns: { health: { after: 62 } } });
  });
});

describe('deportation (design §11.5)', () => {
  it('released on rival ground: the train home from until, a day’s bar, BARRED, the arrival home', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Lu Visitor', level: 10, cityId: 'duskwall' });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const held = (await p.caller.held.get())!;
    expect(held).toMatchObject({ rivalGround: true, bail: { total: 200 } }); // rival ground doubles
    expect(held.until - at(DAY)).toBe(15 * 60_000); // 10 × 1.5
    await releaseHeldNow(oid(p.id), clock.now() + 60_000);
    clock.set(clock.now() + 60_000);
    const me = await p.caller.character.me();
    expect(me.journey).toMatchObject({ from: 'duskwall', to: 'coalport', status: 'onTheWay' });
    expect(me.barred).toEqual([{ cityId: 'duskwall', cityName: 'Duskwall', until: clock.now() + 24 * 3_600_000 }]);
    const j = (await Journey.findById(me.journey!.id).lean())!;
    expect(j).toMatchObject({ kind: 'deported', fare: { total: 0 }, card: null });
    const after = (await p.caller.held.get())!;
    expect(after.release).toMatchObject({ act: 'deported', knockOns: { barred: { cityName: 'Duskwall' } }, view: { landing: { journey: true } } });
    const closed = await p.caller.held.close({ stayId: after.stayId });
    expect(closed.landing).toEqual({ journey: true });

    clock.set(j.arrivesAt.getTime() + 1);
    const home = await p.caller.character.me();
    expect(home.cityId).toBe('coalport');
    await expect(p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'BARRED',
    );
  });
});

describe('the record’s strike-off (design §7.3)', () => {
  it('NO_MARKS; NOT_ENOUGH_PC; then the oldest mark for 30 PC', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Mo Clean', pc: 40 });
    await expect(p.caller.record.strike({ idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'NO_MARKS',
    );
    await setRisk(p.id, clock.now(), {
      marks: [
        { day: DAY - 3, kind: 'minor' },
        { day: DAY - 1, kind: 'moderate' },
      ],
    });
    const r = await p.caller.record.strike({ idempotencyKey: key() });
    expect(r).toMatchObject({
      act: 'strike',
      knockOns: { pc: { before: 40, after: 10 }, record: { before: { marks: 2 }, after: { level: 'onFile', marks: 1 } } },
      view: { kind: 'record' },
    });
    const c = (await Character.findById(p.id).lean())!;
    expect(c.record!.marks).toEqual([{ day: DAY - 1, kind: 'moderate', logId: null }]);
    await expect(p.caller.record.strike({ idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'NOT_ENOUGH_PC',
    );
  });
});
