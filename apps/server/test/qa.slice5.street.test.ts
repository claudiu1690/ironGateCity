/**
 * QA (slice 5): run-ins under load. `mission.start` with one key from many copies at once, with the
 * street hooks off (production) and on (the phase-B race fix); two keys at once; `encounter.choose`
 * from four rows and two reads past the decide window at once; the same key five times; luck after a
 * long absence (as of the decide time, then the lazy discharge, nothing owned lost); `encounter.close`
 * on a pending run-in; another player's encounter; a key reused for another mission.
 * ADR 0002, 0032; tech design §3.1, §3.3, §7.1, §8.2, §14, §18; design §4.6, §10.4.
 */
import { ActionLog, Character, Encounter, RequestLog, Stay } from '@irongate/db';
import { RUN_IN } from '@irongate/rules';
import type { ActionResult, RunInPending } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { streetHooks } from '../src/services/streetHooks';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const POSTERS = { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi' };
const LAUNCH = { locationId: 'coalport.shipyard', missionId: 'coalport.shipyard.launch', wayId: 'str' };

beforeAll(async () => {
  await setupDb('qa-slice5-street');
});
afterAll(async () => {
  streetHooks.enabled = false;
  streetHooks.clear();
  await teardownDb();
});

const isPending = (r: unknown): r is RunInPending => (r as RunInPending)?.kind === 'runIn';
const settled = <T>(rs: PromiseSettledResult<T>[]) => ({
  ok: rs.filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled').map((r) => r.value),
  bad: rs.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason),
});

describe('QA · mission.start: one key from many copies at once', () => {
  // QA slice 5 M1 (fixed in the fix round): with the hooks off a copy that loses the race is re-run
  // by the driver (a TransientTransactionError re-runs the callback). It used to never look the key up
  // again and drew a fresh seed, so it could take the other branch: a final `actionLogs` row and a
  // pending `encounters` row under one key, Energy and Heat paid twice. Each run of the transaction now
  // looks the key up in every keyed collection first (`assertKeyFree`), and the seed is per key.
  it('M1 · hooks OFF (production): 24 players × 6 copies of one tap → one start each, one answer for all copies', async () => {
    streetHooks.enabled = false;
    const clock = testClock(at(DAY));
    let pendings = 0;
    let finals = 0;
    for (let n = 0; n < 24; n++) {
      const p = await member(clock, { name: `Quinn Copy ${n}`, rank: 3, iron: 1_000 });
      // Hot: the run-in chance is 15 + 15 = 30 %, so both branches turn up across the players.
      await setRisk(p.id, clock.now(), { heat: 60 });
      const before = (await Character.findById(p.id).lean())!;
      const k = key();
      const { ok, bad } = settled(
        await Promise.allSettled(Array.from({ length: 6 }, () => p.caller.mission.start({ ...POSTERS, idempotencyKey: k }))),
      );
      expect(bad.map((e) => gameData(e).game?.reason ?? String(e))).toEqual([]);
      const logs = await ActionLog.countDocuments({ characterId: p.id });
      const encs = await Encounter.countDocuments({ characterId: p.id });
      expect(logs + encs, `player ${n}`).toBe(1);
      if (encs === 1) {
        pendings++;
        const id = (await Encounter.findOne({ characterId: p.id }).lean())!._id.toHexString();
        for (const r of ok) expect(isPending(r) ? r.encounterId : `final:${(r as ActionResult).logId}`).toBe(id);
      } else {
        finals++;
        const logId = (await ActionLog.findOne({ characterId: p.id }).lean())!._id.toHexString();
        for (const r of ok) expect(isPending(r) ? 'pending' : (r as ActionResult).logId).toBe(logId);
      }
      const after = (await Character.findById(p.id).lean())!;
      // Energy once (10), Heat once (+6).
      expect(before.energy.value - after.energy.value).toBe(10);
      expect(after.heat!.value).toBe(66);
    }
    // Both branches were exercised (30 % of 24).
    expect(pendings).toBeGreaterThan(0);
    expect(finals).toBeGreaterThan(0);
  });

  it('hooks ON (the phase-B fix): a forced run-in, 8 copies of one key → one encounter, the same pending view for all', async () => {
    streetHooks.enabled = true;
    const clock = testClock(at(DAY));
    for (let n = 0; n < 6; n++) {
      const p = await member(clock, { name: `Rhea Twin ${n}`, rank: 3 });
      streetHooks.set(p.id, { runIn: 'next', opponentId: 'street-enforcer', checkRoll: 1 });
      const k = key();
      const { ok, bad } = settled(
        await Promise.allSettled(Array.from({ length: 8 }, () => p.caller.mission.start({ ...POSTERS, idempotencyKey: k }))),
      );
      expect(bad).toEqual([]);
      expect(await Encounter.countDocuments({ characterId: p.id })).toBe(1);
      expect(await ActionLog.countDocuments({ characterId: p.id })).toBe(0);
      const ids = new Set(ok.map((r) => (isPending(r) ? r.encounterId : 'not pending')));
      expect([...ids]).toHaveLength(1);
      expect([...ids][0]).not.toBe('not pending');
    }
  });

  // QA slice 5 M1, the same race on a tap on rival ground (its run-in branch writes an encounter,
  // its quiet branch an action log). Fixed in the fix round.
  it('M1 · a tap on rival ground, hooks OFF: 24 visitors × 6 copies of one key → one start each', async () => {
    streetHooks.enabled = false;
    const clock = testClock(at(DAY));
    for (let n = 0; n < 24; n++) {
      const p = await member(clock, { name: `Ike Visit ${n}`, level: 10, cityId: 'duskwall' });
      // Hot: the tier-1 run-in on rival ground is 15 + 15 = 30 %.
      await setRisk(p.id, clock.now(), { heat: 60 });
      const before = (await Character.findById(p.id).lean())!;
      const k = key();
      const input = { actionId: 'duskwall.quartermaster-market.canvass', locationId: 'duskwall.quartermaster-market', idempotencyKey: k, times: 1 as const };
      const { bad } = settled(await Promise.allSettled(Array.from({ length: 6 }, () => p.caller.action.performAny(input))));
      expect(bad.map((e) => gameData(e).game?.reason ?? String(e))).toEqual([]);
      const starts = (await ActionLog.countDocuments({ characterId: p.id })) + (await Encounter.countDocuments({ characterId: p.id }));
      expect(starts, `visitor ${n}`).toBe(1);
      const after = (await Character.findById(p.id).lean())!;
      expect(before.energy.value - after.energy.value, `visitor ${n}`).toBe(10);
    }
  });

  it('two keys at once (a hand-made double tap): every start that succeeded paid once; a pending run-in refuses the other', async () => {
    streetHooks.enabled = false;
    const clock = testClock(at(DAY));
    for (let n = 0; n < 8; n++) {
      const p = await member(clock, { name: `Sol Double ${n}`, rank: 3 });
      await setRisk(p.id, clock.now(), { heat: 60 });
      const before = (await Character.findById(p.id).lean())!;
      const { ok, bad } = settled(
        await Promise.allSettled([
          p.caller.mission.start({ ...POSTERS, idempotencyKey: key() }),
          p.caller.mission.start({ ...POSTERS, idempotencyKey: key() }),
        ]),
      );
      for (const e of bad) expect(['RUN_IN_PENDING', 'HELD', 'ACTION_CONFLICT']).toContain(gameData(e).game?.reason);
      const starts = (await ActionLog.countDocuments({ characterId: p.id })) + (await Encounter.countDocuments({ characterId: p.id }));
      expect(starts).toBe(ok.length);
      const after = (await Character.findById(p.id).lean())!;
      expect(before.energy.value - after.energy.value).toBe(10 * starts);
      expect(after.heat!.value).toBe(60 + 6 * starts);
    }
  });

  it('a key reused for another mission is KEY_REUSED, and nothing is written', async () => {
    streetHooks.enabled = true;
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Tam Reuse', rank: 3 });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const k = key();
    await p.caller.mission.start({ ...POSTERS, idempotencyKey: k });
    const v = (await Character.findById(p.id).lean())!.version;
    await expect(p.caller.mission.start({ ...LAUNCH, idempotencyKey: k })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'KEY_REUSED',
    );
    expect((await Character.findById(p.id).lean())!.version).toBe(v);
  });
});

async function pending(clock: ReturnType<typeof testClock>, name: string, f: { choiceRoll?: number; opponentId?: string; iron?: number; str?: number } = {}) {
  streetHooks.enabled = true;
  const p = await member(clock, { name, rank: 3, iron: f.iron ?? 1_000 });
  if (f.str !== undefined) await Character.updateOne({ _id: p.id }, { $set: { 'stats.str': f.str }, $inc: { version: 1 } });
  streetHooks.set(p.id, {
    runIn: 'next',
    opponentId: f.opponentId ?? 'street-enforcer',
    checkRoll: 1,
    ...(f.choiceRoll !== undefined ? { choiceRoll: f.choiceRoll } : {}),
  });
  const r = await p.caller.mission.start({ ...POSTERS, idempotencyKey: key() });
  if (!isPending(r)) throw new Error('no run-in');
  return { p, r };
}

describe('QA · encounter.choose under load', () => {
  it('four rows and two reads past the window at once: one resolution, one log, one answer, the Iron at most once', async () => {
    const clock = testClock(at(DAY));
    for (let n = 0; n < 6; n++) {
      clock.set(at(DAY) + n * 60_000);
      const { p, r } = await pending(clock, `Uma Rush ${n}`, { choiceRoll: n % 2 === 0 ? 1 : 100 });
      const iron0 = (await Character.findById(p.id).lean())!.iron;
      clock.set(r.decideBy + 1);
      const rs = await Promise.allSettled([
        p.caller.encounter.choose({ encounterId: r.encounterId, choice: 'fight', idempotencyKey: key() }),
        p.caller.encounter.choose({ encounterId: r.encounterId, choice: 'run', idempotencyKey: key() }),
        p.caller.encounter.choose({ encounterId: r.encounterId, choice: 'talk', idempotencyKey: key() }),
        p.caller.encounter.choose({ encounterId: r.encounterId, choice: 'pay', idempotencyKey: key() }),
        p.caller.character.me(),
        p.caller.encounter.current(),
      ]);
      const { ok, bad } = settled(rs.slice(0, 4) as PromiseSettledResult<ActionResult>[]);
      expect(bad.map((e) => gameData(e).game?.reason ?? String(e))).toEqual([]);
      expect(new Set(ok.map((x) => x.logId)).size).toBe(1);
      expect(await ActionLog.countDocuments({ characterId: p.id })).toBe(1);
      const enc = (await Encounter.findById(r.encounterId).lean())!;
      expect(enc.state).toBe('resolved');
      const c = (await Character.findById(p.id).lean())!;
      const paid = enc.choice === 'pay' ? 60 : 0;
      const result = ok[0]!;
      expect(c.iron).toBe(iron0 + result.rewards.iron.total);
      expect(result.street!.runIn!.ironPaid).toBe(paid);
      // Every copy agrees on who decided it.
      expect(new Set(ok.map((x) => x.street!.runIn!.by)).size).toBe(1);
    }
  });

  it('the same key five times: one request log, five identical answers', async () => {
    const clock = testClock(at(DAY) + 20 * 60_000);
    const { p, r } = await pending(clock, 'Vic Same', { choiceRoll: 1 });
    const k = key();
    const rs = await Promise.all(
      Array.from({ length: 5 }, () => p.caller.encounter.choose({ encounterId: r.encounterId, choice: 'pay', idempotencyKey: k })),
    );
    expect(new Set(rs.map((x) => JSON.stringify(x))).size).toBe(1);
    expect(await RequestLog.countDocuments({ characterId: p.id, idempotencyKey: k })).toBe(1);
    expect(rs[0]!.street!.runIn!.ironPaid).toBe(60);
  });

  it("another player's encounter is NOT_FOUND, and theirs stays pending", async () => {
    const clock = testClock(at(DAY) + 25 * 60_000);
    const { r } = await pending(clock, 'Wes Owner');
    const thief = await member(clock, { name: 'Xan Thief', rank: 3 });
    await expect(thief.caller.encounter.choose({ encounterId: r.encounterId, choice: 'fight', idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).code === 'NOT_FOUND',
    );
    await expect(thief.caller.encounter.close({ encounterId: r.encounterId })).rejects.toSatisfy((e) => gameData(e).code === 'NOT_FOUND');
    expect((await Encounter.findById(r.encounterId).lean())!.state).toBe('pending');
  });

  it('encounter.close on a pending run-in does not clear it (the modal cannot be dismissed)', async () => {
    const clock = testClock(at(DAY) + 30 * 60_000);
    const { p, r } = await pending(clock, 'Yul Close');
    const closed = await p.caller.encounter.close({ encounterId: r.encounterId });
    expect(closed.landing).toBeNull();
    expect(closed.character.runIn).toMatchObject({ state: 'pending' });
    await expect(p.caller.mission.start({ ...LAUNCH, idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'RUN_IN_PENDING',
    );
  });
});

describe('QA · luck after a long absence (design §4.6, §10.4; pillar: away costs opportunity, never assets)', () => {
  it('three days away on a run-in: luck as of the decide time, the infirmary from then, discharged lazily, nothing owned lost', async () => {
    const clock = testClock(at(DAY) + 40 * 60_000);
    // Strong (STR 60), so luck picks Fight; its forced roll of 100 is a loss: the infirmary.
    const { p, r } = await pending(clock, 'Zia Away', { choiceRoll: 100, str: 60 });
    expect(r.luck).toBe('fight');
    const before = (await Character.findById(p.id).lean())!;
    clock.set(r.decideBy + 3 * 86_400_000);
    const me = await p.caller.character.me();
    const enc = (await Encounter.findById(r.encounterId).lean())!;
    expect(enc).toMatchObject({ state: 'resolved', by: 'auto', outcome: 'lost' });
    expect(enc.resolvedAsOf!.getTime()).toBe(r.decideBy);
    const stay = (await Stay.findOne({ characterId: p.id }).lean())!;
    expect(stay.kind).toBe('infirmary');
    expect(stay.since.getTime()).toBe(enc.resolvedAsOf!.getTime());
    expect(stay.until.getTime()).toBe(enc.resolvedAsOf!.getTime() + 20 * 60_000);
    // Discharged as of until, lazily, in the same read.
    expect(stay.releasedAt?.getTime()).toBe(stay.until.getTime());
    expect(me.held).toMatchObject({ state: 'out' });
    // Nothing owned is lost: Iron only gained (luck never pays), the items are the same, Health full again.
    const after = (await Character.findById(p.id).lean())!;
    expect(after.iron).toBeGreaterThanOrEqual(before.iron);
    expect(after.inventory).toEqual(before.inventory);
    expect(me.health).toMatchObject({ full: true });
    // The run-in's result waits for the player, then the release modal.
    expect(me.runIn).toMatchObject({ state: 'resolved' });
    expect(await p.caller.encounter.current()).toMatchObject({ result: { stamp: 'carriedOff' } });
  });

  it('luck never chooses Pay, and the player who never answers is never charged Iron (12 run-ins)', async () => {
    for (let n = 0; n < 12; n++) {
      const clock = testClock(at(DAY) + (50 + n) * 60_000);
      const { p, r } = await pending(clock, `Abe Never ${n}`, { opponentId: n % 2 ? 'city-police' : 'street-enforcer' });
      clock.set(r.decideBy + 10 * 60_000);
      await p.caller.character.me();
      const enc = (await Encounter.findById(r.encounterId).lean())!;
      expect(enc.state).toBe('resolved');
      expect(enc.choice).not.toBe('pay');
      expect(enc.choice).toBe(r.luck);
    }
  });

  it('the decide window is five minutes (GDD §13.1, §20; design §23.1 #17)', () => {
    expect(RUN_IN.decideMs).toBe(5 * 60_000);
  });
});
