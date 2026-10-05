/**
 * Slice 5 fix round (docs/qa/slice-5-report.md; docs/design/slice-5-fixes.md): one key looked up in
 * every keyed collection inside the transaction (M1), the per-key seed, the record card on the first
 * crossing into each level (m5), the run-in view's pronoun and band (§7.3, n12), and the record tag's
 * level (§7.1). The M1 race itself is QA's `qa.slice5.street.test.ts`.
 */
import { ActionLog, Character, Encounter, RequestLog } from '@irongate/db';
import type { ActionResult, RunInPending } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { keySeed } from '../src/services/keyGuard';
import { streetHooks } from '../src/services/streetHooks';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const POSTERS = { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi' };

beforeAll(async () => {
  await setupDb('slice5-fixround');
  streetHooks.enabled = true;
});
afterAll(async () => {
  streetHooks.enabled = false;
  streetHooks.clear();
  await teardownDb();
});

const asResult = (r: ActionResult | RunInPending) => r as ActionResult;

describe('M1: one key, every keyed collection', () => {
  it('the seed is the same for one character and key, different for another key or character', () => {
    const a = new Types.ObjectId();
    const b = new Types.ObjectId();
    expect(keySeed(a, 'k1')).toBe(keySeed(a, 'k1'));
    expect(keySeed(a, 'k1')).toMatch(/^[0-9a-f]{32}$/);
    expect(keySeed(a, 'k2')).not.toBe(keySeed(a, 'k1'));
    expect(keySeed(b, 'k1')).not.toBe(keySeed(a, 'k1'));
  });

  it('a key a request-keyed act already used (requestLogs) is KEY_REUSED for a mission, and nothing is written', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ada Reuse', rank: 3, pc: 60 });
    await setRisk(p.id, clock.now(), { marks: [{ day: DAY, kind: 'minor' }] });
    const k = key();
    await p.caller.record.strike({ idempotencyKey: k });
    expect(await RequestLog.countDocuments({ characterId: p.id, idempotencyKey: k })).toBe(1);
    const before = (await Character.findById(p.id).lean())!;
    await expect(p.caller.mission.start({ ...POSTERS, idempotencyKey: k })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'KEY_REUSED',
    );
    expect(await ActionLog.countDocuments({ characterId: p.id })).toBe(0);
    expect(await Encounter.countDocuments({ characterId: p.id })).toBe(0);
    const after = (await Character.findById(p.id).lean())!;
    expect(after.energy.value).toBe(before.energy.value);
    expect(after.version).toBe(before.version);
  });

  it('a key a pending run-in holds is KEY_REUSED for a tier-1 tap', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Bo Reuse', rank: 3, iron: 500 });
    const k = key();
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'street-enforcer' });
    const r = await p.caller.mission.start({ ...POSTERS, idempotencyKey: k });
    expect((r as RunInPending).kind).toBe('runIn');
    // The same key again for the same mission: the pending view, not a second start.
    const again = await p.caller.mission.start({ ...POSTERS, idempotencyKey: k });
    expect((again as RunInPending).encounterId).toBe((r as RunInPending).encounterId);
    expect(await Encounter.countDocuments({ characterId: p.id })).toBe(1);
  });
});

describe('m5: the record card on the first crossing into each level', () => {
  it('a first offence of three serious marks: the Repeat offender card, not all minor', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Cy Three', rank: 3, level: 10, iron: 2000, cityId: 'duskwall' });
    await setRisk(p.id, clock.now(), { heat: 60 });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    const r = asResult(
      await p.caller.mission.start({
        locationId: 'duskwall.beacon-house',
        missionId: 'duskwall.beacon-house.spike',
        wayId: 'agi',
        idempotencyKey: key(),
      }),
    ).street!.record!;
    expect(r).toMatchObject({ added: 3, after: 'repeat', first: true, allMinor: false });
    const c = (await Character.findById(p.id).lean())!;
    expect(c.firsts?.repeat).toBeInstanceOf(Date);
    expect(c.firsts?.mark).toBeInstanceOf(Date);
  });

  it('On file once: a second minor mark at the same level shows no card; a character with the old first-mark card does not see On file again', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Di Twice', rank: 3, iron: 500 });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    const first = asResult(await p.caller.mission.start({ ...POSTERS, idempotencyKey: key() })).street!
      .record!;
    expect(first).toMatchObject({ after: 'onFile', marks: 1, first: true, allMinor: true });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    const second = asResult(await p.caller.mission.start({ ...POSTERS, idempotencyKey: key() })).street!
      .record!;
    expect(second).toMatchObject({ after: 'onFile', marks: 2, first: false });

    const q = await member(clock, { name: 'Ed Legacy', rank: 3, iron: 500 });
    await Character.updateOne({ _id: q.id }, { $set: { 'firsts.mark': new Date(at(DAY - 30)) } });
    streetHooks.set(q.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    const legacy = asResult(await q.caller.mission.start({ ...POSTERS, idempotencyKey: key() })).street!
      .record!;
    expect(legacy).toMatchObject({ after: 'onFile', first: false });
  });
});

describe('§7.3 and n12: the run-in view', () => {
  it("carries the opponent's pronoun and each step's odds band", async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Fi Band', rank: 3, iron: 500 });
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'strike-picket', choiceRoll: 100, checkRoll: 1 });
    const pending = (await p.caller.mission.start({
      locationId: 'coalport.shipyard',
      missionId: 'coalport.shipyard.launch',
      wayId: 'str',
      idempotencyKey: key(),
    })) as RunInPending;
    expect(pending.kind).toBe('runIn');
    const r = await p.caller.encounter.choose({
      encounterId: pending.encounterId,
      choice: 'run',
      idempotencyKey: key(),
    });
    const runIn = r.street!.runIn!;
    expect(runIn.opponent.pronoun).toBe('they');
    expect(runIn.steps[0]).toMatchObject({ row: 'run', ok: false });
    expect(['good', 'fair', 'long']).toContain(runIn.steps[0]!.band);
  });
});
