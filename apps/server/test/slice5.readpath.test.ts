/**
 * Slice 5, T11 (tech design §3.3, §7.1–§7.2, §8.3): the read path v5 and the guards. A migrated
 * character reads Cool, unhurt and clean; the lazy Heat and Health project between reads; a stored
 * record reads its level; held and a pending run-in refuse the acts §7.2 names.
 */
import { Character } from '@irongate/db';
import { HEAT, healthMax } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026

beforeAll(async () => {
  await setupDb('slice5-readpath-test');
});
afterAll(teardownDb);

describe('the character view v6 (tech design §8.3)', () => {
  it('a character migrated without the slice-5 fields reads Cool, unhurt and clean', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ada Bare' });
    await Character.updateOne(
      { _id: p.id },
      { $unset: { heat: 1, health: 1, record: 1, held: 1, runIn: 1, flags: 1, barred: 1, 'stats.agiQuarters': 1 } },
    );
    const me = await p.caller.character.me();
    expect(me.heat).toMatchObject({ value: 0, state: 'cool', coolsAt: null, zeroAt: null });
    expect(me.health).toMatchObject({ value: healthMax(6), max: 125, full: true, fullAt: null });
    expect(me.record).toEqual({
      level: 'clean',
      marks: 0,
      fadesOn: null,
      fading: 0,
      bailDoubled: false,
      ironPct: 0,
      strike: null,
    });
    expect(me.held).toBeNull();
    expect(me.runIn).toBeNull();
    expect(me.agiQuarters).toBe(0);
    expect(me.here).toEqual({ rivalGround: false, flags: [] });
    expect(me.barred).toEqual([]);
  });

  it('Heat cools five an hour between reads; Cool by is when it drops under 25', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Bo Warm' });
    await setRisk(p.id, clock.now(), { heat: 40 });
    let me = await p.caller.character.me();
    expect(me.heat).toMatchObject({ value: 40, state: 'noticed', stepMs: 720_000 });
    // 40 → 24 is 16 points: 3 h 12 min at 5 an hour.
    expect(me.heat!.coolsAt).toBe(at(DAY) + 16 * 720_000);
    expect(me.heat!.zeroAt).toBe(at(DAY) + 40 * 720_000);
    clock.set(at(DAY, 11));
    me = await p.caller.character.me();
    expect(me.heat!.value).toBe(30);
    clock.set(at(DAY, 13));
    me = await p.caller.character.me();
    expect(me.heat).toMatchObject({ value: 20, state: 'cool', coolsAt: null });
    expect(HEAT.coolPerHour).toBe(5);
  });

  it('Health comes back ten every ten minutes; the record reads its level and strike-off', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Cy Hurt', pc: 40 });
    await setRisk(p.id, clock.now(), {
      health: 60,
      marks: [
        { day: DAY - 2, kind: 'minor' },
        { day: DAY - 1, kind: 'minor' },
      ],
    });
    clock.set(at(DAY) + 25 * 60_000);
    const me = await p.caller.character.me();
    expect(me.health).toMatchObject({ value: 80, max: 125, full: false });
    expect(me.health!.fullAt).toBe(at(DAY) + 70 * 60_000);
    expect(me.record).toMatchObject({
      level: 'onFile',
      marks: 2,
      fadesOn: DAY - 1 + 14,
      fading: 2,
      ironPct: -10,
      strike: { cost: 30, affordable: true },
    });
  });
});

describe('the guards (tech design §7.2)', () => {
  const TAP = { actionId: 'coalport.union-hall.committee', locationId: 'coalport.union-hall', times: 1 as const };

  it('in the cells: an action and a board are refused HELD; nothing is written', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Di Kept' });
    await setRisk(p.id, clock.now(), {
      held: {
        kind: 'cells',
        cityId: 'coalport',
        locationId: 'coalport.harbour-police',
        since: new Date(clock.now()),
        until: new Date(clock.now() + 20 * 60_000),
        bail: null,
        rivalGround: false,
        state: 'in',
      },
    });
    const before = (await Character.findById(p.id).lean())!;
    await expect(p.caller.action.perform({ ...TAP, idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'HELD',
    );
    await expect(p.caller.travel.board({ to: 'irongate', idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'HELD',
    );
    const after = (await Character.findById(p.id).lean())!;
    expect(after.version).toBe(before.version);
    expect(after.energy).toEqual(before.energy);
  });

  it('with a run-in pending: an action is refused RUN_IN_PENDING', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ed Waits' });
    await setRisk(p.id, clock.now(), {
      runIn: { state: 'pending', day: DAY, decideBy: new Date(clock.now() + 5 * 60_000), cityId: 'coalport' },
    });
    await expect(p.caller.action.perform({ ...TAP, idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'RUN_IN_PENDING',
    );
  });

  it('a released stay whose modal is still open (state out) refuses nothing', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Flo Free' });
    await setRisk(p.id, clock.now(), {
      held: {
        kind: 'infirmary',
        cityId: 'coalport',
        locationId: 'coalport.infirmary',
        since: new Date(clock.now() - 30 * 60_000),
        until: new Date(clock.now() - 10 * 60_000),
        bail: null,
        rivalGround: false,
        state: 'out',
      },
    });
    const r = await p.caller.action.perform({ ...TAP, idempotencyKey: key() });
    expect(r.kind).toBe('checked');
  });
});
