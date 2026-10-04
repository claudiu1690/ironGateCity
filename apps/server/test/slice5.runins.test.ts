/**
 * Slice 5, T15 (ADR 0032; tech design §3.1, §3.3, §7.1, §8.2 `streetService`, §15 "Server — run-ins"
 * and "the read path"): the pending branch of `mission.start` and of a rival tap, `encounter.choose`,
 * `current` and `close`, and luck on the read path (after five minutes, or at the day's turn, as of the
 * decide time). Every roll is forced through the street hooks.
 */
import { ActionLog, Character, Encounter, PaperEntry, Stay } from '@irongate/db';
import { HEALTH, RUN_IN, dayStart } from '@irongate/rules';
import type { ActionResult, RunInPending } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { streetHooks } from '../src/services/streetHooks';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, key, member } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const POSTERS = { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi' };
const LAUNCH = { locationId: 'coalport.shipyard', missionId: 'coalport.shipyard.launch', wayId: 'str' };

beforeAll(async () => {
  await setupDb('slice5-runins-test');
  streetHooks.enabled = true;
});
afterAll(async () => {
  streetHooks.enabled = false;
  await teardownDb();
});

const asPending = (r: unknown) => r as RunInPending;
const asResult = (r: unknown) => r as ActionResult;

async function pendingPosters(name: string, opts: { opponentId?: string; checkRoll?: number; choiceRoll?: number; iron?: number } = {}) {
  const clock = testClock(at(DAY));
  const p = await member(clock, { name, rank: 3, iron: opts.iron ?? 1_000 });
  streetHooks.set(p.id, {
    runIn: 'next',
    opponentId: opts.opponentId ?? 'street-enforcer',
    checkRoll: opts.checkRoll ?? 1,
    ...(opts.choiceRoll !== undefined ? { choiceRoll: opts.choiceRoll } : {}),
  });
  const k = key();
  const pending = asPending(await p.caller.mission.start({ ...POSTERS, idempotencyKey: k }));
  return { clock, p, k, pending };
}

describe('the pending branch (ADR 0032)', () => {
  it('a mission whose run-in fires: Energy, Heat and the way written; the encounter pending; the modal state', async () => {
    const { p, k, pending } = await pendingPosters('Ada Corner');
    expect(pending).toMatchObject({
      kind: 'runIn',
      what: { kind: 'mission', id: POSTERS.missionId },
      opponent: { id: 'street-enforcer', bribable: true, payOff: 60 },
      rows: { pay: { price: 60, affordable: true } },
    });
    expect(pending.decideBy).toBe(at(DAY) + RUN_IN.decideMs);
    expect(['fight', 'run', 'talk']).toContain(pending.luck);
    const c = (await Character.findById(p.id).lean())!;
    expect(c.runIn).toMatchObject({ state: 'pending', day: DAY });
    expect(c.heat!.value).toBe(6);
    expect(c.ways).toEqual([{ missionId: POSTERS.missionId, wayId: 'agi' }]);
    expect(await ActionLog.countDocuments({ characterId: p.id })).toBe(0);
    // The start's retry returns the same pending view; another act is refused.
    const again = asPending(await p.caller.mission.start({ ...POSTERS, idempotencyKey: k }));
    expect(again.encounterId).toBe(pending.encounterId);
    await expect(p.caller.mission.start({ ...LAUNCH, idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'RUN_IN_PENDING',
    );
    expect((await p.caller.encounter.current())).toMatchObject({ pending: { encounterId: pending.encounterId } });
  });

  it('Pay them off: the Iron, the run-in block, the log under the start key; close clears the pointer', async () => {
    const { p, k, pending } = await pendingPosters('Bo Pays', { choiceRoll: 1 });
    const ironBefore = (await Character.findById(p.id).lean())!.iron;
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'pay', idempotencyKey: key() });
    expect(r.stamp).toBe('success');
    expect(r.street!.runIn).toMatchObject({ choice: 'pay', by: 'player', outcome: 'paid', ironPaid: 60, xp: 0 });
    expect(r.street!.runIn!.line).toContain('notes');
    expect(r.rewards.iron.parts).toContainEqual({ id: 'paidOff', label: 'Paid off', amount: -60 });
    expect(r.street!.heat).toMatchObject({ after: 6 });
    const c = (await Character.findById(p.id).lean())!;
    expect(c.iron).toBe(ironBefore + r.rewards.iron.total);
    expect(c.runIn).toMatchObject({ state: 'resolved' });
    const log = (await ActionLog.findOne({ characterId: p.id }).lean())!;
    expect(log.idempotencyKey).toBe(k);
    expect(String(log.encounterId)).toBe(pending.encounterId);
    expect((await Encounter.findById(pending.encounterId).lean())!).toMatchObject({ state: 'resolved', choice: 'pay', by: 'player', outcome: 'paid' });
    // The start's retry after the resolution returns the result; current shows it until closed.
    expect(asResult(await p.caller.mission.start({ ...POSTERS, idempotencyKey: k })).logId).toBe(r.logId);
    expect(await p.caller.encounter.current()).toMatchObject({ result: { logId: r.logId } });
    const closed = await p.caller.encounter.close({ encounterId: pending.encounterId });
    expect(closed.landing).toBeNull();
    expect(closed.character.runIn).toBeNull();
    expect(await p.caller.encounter.current()).toBeNull();
    // A second choice on a resolved run-in returns the first result.
    const late = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() });
    expect(late.logId).toBe(r.logId);
  });

  it('Pay without the Iron is refused CANNOT_PAY (NOT_ENOUGH_IRON)', async () => {
    const { p, pending } = await pendingPosters('Cy Broke', { iron: 10 });
    await expect(
      p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'pay', idempotencyKey: key() }),
    ).rejects.toSatisfy((e) => gameData(e).game?.reason === 'CANNOT_PAY' && gameData(e).game?.why === 'NOT_ENOUGH_IRON');
  });

  it('a party loss: the infirmary at 30 Health, Taken to the infirmary, the landing', async () => {
    const { p, pending } = await pendingPosters('Di Ward', { choiceRoll: 100 });
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() });
    expect(r.stamp).toBe('carriedOff');
    expect(r.street!.runIn).toMatchObject({ outcome: 'lost', cause: 'power' });
    expect(r.street!.sentTo).toMatchObject({ kind: 'infirmary', landing: { cityId: 'coalport', locationId: 'coalport.infirmary' } });
    expect(r.street!.caught).toBeNull(); // no caught check after a loss
    expect(r.attempts[0]!).toMatchObject({ dropped: 'lost' });
    const c = (await Character.findById(p.id).lean())!;
    expect(c.held).toMatchObject({ kind: 'infirmary', state: 'in' });
    expect((await p.caller.character.me()).health!.value).toBe(HEALTH.admitted);
    const stay = (await Stay.findOne({ characterId: p.id }).lean())!;
    expect(stay).toMatchObject({ kind: 'infirmary', reason: 'runInLost', minutes: 20 });
    expect(String(stay.encounterId)).toBe(pending.encounterId);
    const closed = await p.caller.encounter.close({ encounterId: pending.encounterId });
    expect(closed.landing).toMatchObject({ locationId: 'coalport.infirmary' });
  });

  it('a police loss: the cells with the type’s mark', async () => {
    const { p, pending } = await pendingPosters('Ed Nicked', { opponentId: 'city-police', choiceRoll: 100 });
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() });
    expect(r.stamp).toBe('takenIn');
    expect(r.street!.sentTo).toMatchObject({ kind: 'cells' });
    expect(r.street!.record).toMatchObject({ added: 1 });
    expect((await Stay.findOne({ characterId: p.id }).lean())!.reason).toBe('policeLoss');
  });

  it('a Run that works: dropped to Failure’s XP with the run-in’s +10, no caught check', async () => {
    const { p, pending } = await pendingPosters('Flo Legs', { choiceRoll: 1 });
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'run', idempotencyKey: key() });
    expect(r.street!.runIn).toMatchObject({ outcome: 'ran', xp: 10 });
    expect(r.street!.dropped).toBe('ran');
    expect(r.stamp).toBe('success'); // the check's outcome (design §23.1 #19)
    expect(r.rewards.xp.base).toBe(10 * 5 * 0.2 * 1); // a fifth of 5 × 10 Energy
    expect(r.rewards.xp.parts).toContainEqual({ id: 'runIn', label: 'The run-in', amount: 10 });
    expect(r.rewards.iron.total).toBe(0);
    expect(r.street!.caught).toBeNull();
  });
});

describe('luck on the read path (ADR 0032 §5)', () => {
  it('not one millisecond before the decide time; at it, luck takes it as of the decide time', async () => {
    const { clock, p, pending } = await pendingPosters('Gil Away', { choiceRoll: 1 });
    clock.set(pending.decideBy - 1);
    expect((await p.caller.character.me()).runIn).toMatchObject({ state: 'pending' });
    clock.set(pending.decideBy + 60_000);
    const me = await p.caller.character.me();
    expect(me.runIn).toMatchObject({ state: 'resolved' });
    const enc = (await Encounter.findById(pending.encounterId).lean())!;
    expect(enc).toMatchObject({ state: 'resolved', by: 'auto', choice: pending.luck });
    expect(enc.resolvedAsOf!.getTime()).toBe(pending.decideBy);
    const cur = await p.caller.encounter.current();
    expect(cur).toMatchObject({ result: { street: { runIn: { by: 'auto' } } } });
  });

  it('a choice after the decide time, while still pending, wins over luck', async () => {
    const { clock, p, pending } = await pendingPosters('Hal Late', { choiceRoll: 1 });
    clock.set(pending.decideBy + 30_000);
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'talk', idempotencyKey: key() });
    expect(r.street!.runIn).toMatchObject({ choice: 'talk', by: 'player' });
  });

  it('choose against luck concurrently: one resolution', async () => {
    const { clock, p, pending } = await pendingPosters('Ivo Race', { choiceRoll: 1 });
    clock.set(pending.decideBy + 1);
    const [a, b] = await Promise.allSettled([
      p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() }),
      p.caller.character.me(),
    ]);
    expect(a.status).toBe('fulfilled');
    expect(b.status).toBe('fulfilled');
    expect(await ActionLog.countDocuments({ characterId: p.id })).toBe(1);
  });

  it('a run-in started at 23:59:59 and left: resolved before the next day settles, its tally on its own day', async () => {
    const clock = testClock(dayStart(DAY + 1) - 1_000);
    const p = await member(clock, { name: 'Jo Midnight', rank: 3 });
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'street-enforcer', checkRoll: 1, choiceRoll: 1 });
    const pending = asPending(await p.caller.mission.start({ ...POSTERS, idempotencyKey: key() }));
    clock.set(dayStart(DAY + 1) + 1_000);
    const me = await p.caller.character.me();
    expect(me.day.key).toBe(DAY + 1);
    const enc = (await Encounter.findById(pending.encounterId).lean())!;
    expect(enc.state).toBe('resolved');
    expect(enc.resolvedAsOf!.getTime()).toBe(dayStart(DAY + 1) - 1);
    // Yesterday's tally (the paper's desk) carries the mission.
    const paper = (await PaperEntry.findOne({ characterId: p.id, day: DAY + 1 }).lean())!;
    expect(paper.desk.yesterday).toMatchObject({ day: DAY, attempts: 1 });
  });
});

describe('a rival tap’s run-in (design §10.5)', () => {
  it('fires on a tap in Duskwall; Run drops the row to Partial', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Kit Visitor', level: 10, cityId: 'duskwall' });
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'street-enforcer', checkRoll: 1, choiceRoll: 1 });
    const pending = asPending(
      await p.caller.action.performAny({
        actionId: 'duskwall.quartermaster-market.canvass',
        locationId: 'duskwall.quartermaster-market',
        idempotencyKey: key(),
        times: 1,
      }),
    );
    expect(pending).toMatchObject({ kind: 'runIn', what: { kind: 'action' } });
    // A Collective member is never met by the Collective's own (the pool drops your side).
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'run', idempotencyKey: key() });
    expect(r.kind).toBe('checked');
    expect(r.stamp).toBe('partial');
    expect(r.street!.dropped).toBe('ran');
    expect(r.street!.runIn).toMatchObject({ outcome: 'ran', xp: 10 });
  });
});
