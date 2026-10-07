/**
 * QA (slice 5): the cells, the infirmary and the record under load and at their edges. Bail,
 * *Walk out well* / *Discharge yourself* and the strike-off from several taps at once; what being held
 * refuses and what it lets through; Energy refilling inside; Heat 25 after a release whatever it was;
 * Heat cooling at the **residence** city's rate wherever the player stands (design §23.1 #8); the
 * deportation train to the residence city (Irongate for a capital resident, §23.1 #16) and the
 * 24-hour bar to the millisecond. ADR 0033; design §7–§9, §11.5; GDD §6.4, §19.1–§19.2.
 */
import { Character, RequestLog, Stay } from '@irongate/db';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { releaseHeldNow, sendToHeld } from '../src/services/heldService';
import { streetHooks } from '../src/services/streetHooks';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { setIssueEffect, traveller } from './slice4.helpers';
import { at, content, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const H = 3_600_000;
const oid = (id: string) => new Types.ObjectId(id);
const settled = <T>(rs: PromiseSettledResult<T>[]) => ({
  ok: rs.filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled').map((r) => r.value),
  bad: rs.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason),
});
const reason = (e: unknown) => gameData(e).game?.reason ?? gameData(e).code;

beforeAll(async () => {
  await setupDb('qa-slice5-held');
  streetHooks.enabled = true;
});
afterAll(async () => {
  streetHooks.enabled = false;
  await teardownDb();
});

describe('QA · the ways out, from several taps at once', () => {
  it('Pay bail from five taps (five keys) at once: one release, the bail once, the rest refused NOT_IN_CELLS', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ada Five', iron: 1_000 });
    await setRisk(p.id, clock.now(), { heat: 60, marks: [{ day: DAY, kind: 'minor' }] });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const bail = (await p.caller.held.get())!.bail!.total;
    // Review 4 #20 (ADR 0078): the arrest adds its own mark: 100 + 50 × 2.
    expect(bail).toBe(200);
    const { ok, bad } = settled(await Promise.allSettled(Array.from({ length: 5 }, () => p.caller.held.bail({ idempotencyKey: key() }))));
    expect(ok).toHaveLength(1);
    expect(bad.map(reason).every((r) => r === 'NOT_IN_CELLS' || r === 'NOT_HELD')).toBe(true);
    expect((await Character.findById(p.id).lean())!.iron).toBe(1_000 - bail);
    const stays = await Stay.find({ characterId: p.id }).lean();
    expect(stays).toHaveLength(1);
    expect(stays[0]).toMatchObject({ how: 'bail', ironPaid: bail, heatAfter: 25 });
  });

  it('Pay bail with one key five times: five identical answers, one request log, the bail once', async () => {
    const clock = testClock(at(DAY) + 60_000);
    const p = await member(clock, { name: 'Bo Same', iron: 500 });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const k = key();
    const rs = await Promise.all(Array.from({ length: 5 }, () => p.caller.held.bail({ idempotencyKey: k })));
    expect(new Set(rs.map((r) => JSON.stringify(r))).size).toBe(1);
    expect(await RequestLog.countDocuments({ characterId: p.id, idempotencyKey: k })).toBe(1);
    expect((await Character.findById(p.id).lean())!.iron).toBe(350); // review 4: bail 150 (the arrest's mark)
  });

  it('Walk out well and Discharge yourself at once: one of them, its cost once', async () => {
    const clock = testClock(at(DAY) + 2 * 60_000);
    for (let n = 0; n < 6; n++) {
      const p = await member(clock, { name: `Cy Both ${n}`, iron: 300 });
      await sendToHeld(content, oid(p.id), 'infirmary', clock.now());
      const before = (await Character.findById(p.id).lean())!;
      const rs = await Promise.allSettled([
        p.caller.held.walkOut({ idempotencyKey: key() }),
        p.caller.held.discharge({ idempotencyKey: key() }),
      ]);
      const { ok, bad } = settled(rs);
      expect(ok).toHaveLength(1);
      for (const e of bad) expect(['NOT_IN_INFIRMARY', 'NOT_HELD']).toContain(reason(e));
      const after = (await Character.findById(p.id).lean())!;
      expect(before.energy.value - after.energy.value).toBe(5);
      expect(before.iron - after.iron).toBe(ok[0]!.act === 'walkOut' ? 100 : 0);
    }
  });

  it('Walk out well spends Energy, never Rested: Energy 3 with 100 Rested is refused NOT_ENOUGH_ENERGY', async () => {
    const clock = testClock(at(DAY) + 3 * 60_000);
    const p = await member(clock, { name: 'Di Tired', iron: 300 });
    await sendToHeld(content, oid(p.id), 'infirmary', clock.now());
    await Character.updateOne({ _id: p.id }, { $set: { 'energy.value': 3, 'energy.updatedAt': new Date(clock.now()), rested: 100 }, $inc: { version: 1 } });
    for (const call of [() => p.caller.held.walkOut({ idempotencyKey: key() }), () => p.caller.held.discharge({ idempotencyKey: key() })]) {
      await expect(call()).rejects.toSatisfy((e) => reason(e) === 'NOT_ENOUGH_ENERGY');
    }
    const c = (await Character.findById(p.id).lean())!;
    expect([c.energy.value, c.rested, c.iron]).toEqual([3, 100, 300]);
  });

  it('Have a mark struck off from four taps at once with PC for one: one strike, 30 PC once', async () => {
    const clock = testClock(at(DAY) + 4 * 60_000);
    const p = await member(clock, { name: 'Ed Strike', pc: 45 });
    await setRisk(p.id, clock.now(), { marks: [{ day: DAY - 2, kind: 'minor' }, { day: DAY - 1, kind: 'minor' }, { day: DAY, kind: 'moderate' }] });
    const { ok, bad } = settled(await Promise.allSettled(Array.from({ length: 4 }, () => p.caller.record.strike({ idempotencyKey: key() }))));
    expect(ok).toHaveLength(1);
    expect(bad.map(reason).every((r) => r === 'NOT_ENOUGH_PC')).toBe(true);
    const c = (await Character.findById(p.id).lean())!;
    expect(c.pc).toBe(15);
    expect(c.record!.marks.map((m) => m.day)).toEqual([DAY - 1, DAY]);
  });

  it('with PC for many and two marks, four taps strike exactly two; the others NO_MARKS', async () => {
    const clock = testClock(at(DAY) + 5 * 60_000);
    const p = await member(clock, { name: 'Flo Plenty', pc: 200 });
    await setRisk(p.id, clock.now(), { marks: [{ day: DAY - 2, kind: 'minor' }, { day: DAY, kind: 'serious' }] });
    const { ok, bad } = settled(await Promise.allSettled(Array.from({ length: 4 }, () => p.caller.record.strike({ idempotencyKey: key() }))));
    expect(ok).toHaveLength(2);
    expect(bad.map(reason).every((r) => r === 'NO_MARKS')).toBe(true);
    const c = (await Character.findById(p.id).lean())!;
    expect(c.pc).toBe(140);
    expect(c.record!.marks).toEqual([]);
  });
});

describe('QA · while held (design §8.2, §9.2)', () => {
  it('in the cells: a mission is refused HELD; the paper, the Me tab and the strike-off work; Energy keeps refilling', async () => {
    const clock = testClock(at(DAY) + 6 * 60_000);
    const p = await member(clock, { name: 'Gil Inside', rank: 3, pc: 40 });
    await setRisk(p.id, clock.now(), { heat: 60, marks: [{ day: DAY, kind: 'minor' }] });
    await Character.updateOne({ _id: p.id }, { $set: { 'energy.value': 40, 'energy.updatedAt': new Date(clock.now()) }, $inc: { version: 1 } });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const held = (await p.caller.held.get())!;
    expect(held.until - clock.now()).toBe(50 * 60_000); // review 4: 20 + 60 ÷ 2
    await expect(
      p.caller.mission.start({ locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi', idempotencyKey: key() }),
    ).rejects.toSatisfy((e) => reason(e) === 'HELD');
    await expect(p.caller.paper.today()).resolves.toBeTruthy();
    await expect(p.caller.record.strike({ idempotencyKey: key() })).resolves.toMatchObject({ act: 'strike' });
    // The sentence is served in the background; Energy refilled 5 every 10 minutes the whole time.
    clock.set(held.until + 1);
    const me = await p.caller.character.me();
    expect(me.held).toMatchObject({ state: 'out' });
    expect(me.energy.value).toBe(65); // review 4: 40 + 5 × 5 over the 50 minutes
  });

  it('Heat is 25 after a release whatever it was before (here 0: a speech lost to the police)', async () => {
    const clock = testClock(at(DAY) + 7 * 60_000);
    const p = await member(clock, { name: 'Hal Zero' });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const held = (await p.caller.held.get())!;
    clock.set(held.until);
    expect((await p.caller.character.me()).heat).toMatchObject({ value: 25, state: 'noticed' });
  });

  it('a release read two hours late: Heat 25 at `until`, then cooling 5 an hour (15 at +2 h)', async () => {
    const clock = testClock(at(DAY) + 8 * 60_000);
    const p = await member(clock, { name: 'Ivo Late' });
    await setRisk(p.id, clock.now(), { heat: 90 });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const held = (await p.caller.held.get())!;
    expect(held.until - clock.now()).toBe(60 * 60_000); // review 4: 20 + 45, at most 60
    clock.set(held.until + 2 * H);
    expect((await p.caller.character.me()).heat!.value).toBe(15);
  });
});

describe('QA · Heat cools at the residence city’s rate (design §23.1 #8, GDD §6.4)', () => {
  it('a capital resident in Coalport during its Customs Strike cools at 5; a Coalport resident in Irongate cools at 7.5', async () => {
    const day = DAY + 1;
    await setIssueEffect('coalport', 'issue.customs-strike', day - 1, day + 6);
    const clock = testClock(at(day));
    const capital = await traveller(clock, {
      name: 'Jo Capital',
      level: 10,
      cityId: 'coalport',
      residence: { cityId: 'irongate', districtId: 'irongate.eastside' },
    });
    const home = await traveller(clock, { name: 'Kit Coalport', level: 10, cityId: 'irongate' });
    await setRisk(capital.id, clock.now(), { heat: 60 });
    await setRisk(home.id, clock.now(), { heat: 60 });
    clock.set(at(day) + 2 * H);
    expect((await capital.caller.character.me()).heat!.value).toBe(50);
    expect((await home.caller.character.me()).heat!.value).toBe(45);
  });
});

describe('QA · deportation (design §11.5, §23.1 #16)', () => {
  it('a capital resident released on rival ground is put on the train to Irongate; the bar ends at until + 24 h to the millisecond', async () => {
    const clock = testClock(at(DAY + 2));
    const p = await traveller(clock, {
      name: 'Lu Deport',
      level: 10,
      cityId: 'duskwall',
      residence: { cityId: 'irongate', districtId: 'irongate.eastside' },
    });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const releasedAt = clock.now() + 60_000;
    await releaseHeldNow(oid(p.id), releasedAt);
    clock.set(releasedAt + 1);
    const me = await p.caller.character.me();
    expect(me.journey).toMatchObject({ from: 'duskwall', to: 'irongate' });
    expect(me.barred).toEqual([{ cityId: 'duskwall', cityName: 'Duskwall', until: releasedAt + 24 * H }]);
    // Arrive home, then try to board for Duskwall either side of the bar's end.
    const stay = (await p.caller.held.get())!;
    await p.caller.held.close({ stayId: stay.stayId });
    clock.set(releasedAt + 24 * H - 1);
    expect((await p.caller.character.me()).cityId).toBe('irongate');
    await expect(p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() })).rejects.toSatisfy((e) => reason(e) === 'BARRED');
    const card = (await p.caller.travel.nation()).cities.find((c) => c.cityId === 'duskwall');
    expect(card).toMatchObject({ state: 'barred', lockWord: 'barred', barredUntil: releasedAt + 24 * H, canBoard: { ok: false } });
    clock.set(releasedAt + 24 * H);
    await expect(p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() })).resolves.toBeTruthy();
  });

  it('a deported player away for three days comes back home, unbarred, with everything they owned', async () => {
    const clock = testClock(at(DAY + 3));
    const p = await member(clock, { name: 'Mo Gone', level: 10, cityId: 'ashford', iron: 777 });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    const before = (await Character.findById(p.id).lean())!;
    clock.set(clock.now() + 3 * 24 * H);
    const me = await p.caller.character.me();
    expect(me.cityId).toBe('coalport');
    expect(me.barred).toEqual([]);
    const after = (await Character.findById(p.id).lean())!;
    expect(after.iron).toBeGreaterThanOrEqual(before.iron);
    expect(after.inventory).toEqual(before.inventory);
    expect(after.equipment).toEqual(before.equipment);
  });
});
