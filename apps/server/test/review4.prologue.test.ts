/**
 * Review 4 #2 (the opening, since review 5 *Coming home*; GDD §7.1, §7.5, §13.7; ADR 0073; tech design
 * docs/tech/review-4.md §4.4, T26): the join from beat 1's party, the favour as a once-only welcome
 * ticket gated by its open order inside the keyed transaction (NOT_OFFERED, ONCE_ONLY), the landing on
 * the HQ with the favour, the welcome deck's place, and migration 008's reset of old drafts.
 */
import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { ActionLog, Arrival, Character, resetOldDrafts } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arrive, callerFor, gameData, newUser, originAnswers, setupDb, teardownDb, testClock } from './helpers';

beforeAll(async () => {
  await setupDb('review4-prologue-test');
});
afterAll(teardownDb);

const content = getContent();
const T0 = Date.UTC(2026, 8, 29, 9);
const FAVOUR = { actionId: 'coalport.union-hall.favour', locationId: 'coalport.union-hall' } as const;
const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => null,
      (e: unknown) => e,
    ),
  );
async function joined(factionId: 'collective' | 'vanguard' | 'alliance' = 'collective') {
  const clock = testClock(T0);
  const user = newUser('Mara Lenk');
  const caller = callerFor(user, clock.now);
  const r = await arrive(caller, { factionId });
  return { user, caller, clock, r };
}
const hqActions = async (caller: Awaited<ReturnType<typeof joined>>['caller'], cityId = 'coalport') =>
  (await caller.city.get({ cityId })).locations.find((l) => l.kind === 'faction-hq')!.actions.map((a) => a.id);

describe('the join from beat 1 (ADR 0073)', () => {
  it('the reference answers: the Collective in Coalport, 8 / 12 / 5, his coat; orders A by best stat, the favour, a job', async () => {
    const { caller, r } = await joined();
    expect(r.character).toMatchObject({ factionId: 'collective', homeCityId: 'coalport' });
    expect(r.character.stats).toEqual({ str: 8, int: 12, agi: 5, cha: 5 });
    const me = await caller.character.me();
    expect(me.orders.items.map((o) => o.id)).toEqual(['dir.shift-change', 'dir.welcome-b', 'dir.take-a-job']);
    expect(me.orders.items[1]).toMatchObject({ title: "Sign on at the Union Hall", target: 1 });
    const paper = await caller.paper.today();
    expect(paper.headlines[0]!.deck).toMatch(/The rehiring sheet wants your name at the Union Hall; start there\.$/);
    expect(r.landing).toEqual({ cityId: 'coalport', ...FAVOUR });
    expect(paper.landing).toEqual({ cityId: 'coalport', ...FAVOUR });
  });

  it('helping Stahl is the Vanguard in Duskwall, whatever the client might want', async () => {
    const { r } = await joined('vanguard');
    expect(r.character).toMatchObject({ factionId: 'vanguard', homeCityId: 'duskwall' });
    expect(r.landing).toEqual({
      cityId: 'duskwall',
      locationId: 'duskwall.beacon-house',
      actionId: 'duskwall.beacon-house.favour',
    });
  });
});

describe('the favour: a once-only welcome ticket (ADR 0073 §3)', () => {
  it('is the HQ’s first ticket while its order is open, ×1 only, with the order tag and First day', async () => {
    const { caller } = await joined();
    const city = await caller.city.get({ cityId: 'coalport' });
    const hall = city.locations.find((l) => l.id === FAVOUR.locationId)!;
    expect(hall.actions[0]).toMatchObject({
      id: FAVOUR.actionId,
      name: 'Sign on',
      kind: 'checked',
      energy: 10,
      energy3: null,
      order: { id: 'dir.welcome-b', progress: 0, target: 1 },
    });
    expect(hall.actions[0]!.preview?.bonuses).toContainEqual({
      id: 'first-day',
      label: 'First day in Coalport',
      value: 10,
    });
    // The committee session is still there, after it.
    expect(hall.actions.map((a) => a.id)).toContain('coalport.union-hall.committee');
  });

  it('a tap pays the council rates with First day +10 %, completes slot B; then the favour is gone and a new key is NOT_OFFERED', async () => {
    const { user, caller } = await joined();
    const key = randomUUID();
    const r = await caller.action.perform({ ...FAVOUR, idempotencyKey: key, times: 1 });
    expect(r.action).toMatchObject({ id: FAVOUR.actionId, type: 'council' });
    expect(r.attempts[0]!.check.bonuses).toContainEqual({ id: 'first-day', label: 'First day in Coalport', value: 10 });
    // INT 12 (the best stat) at difficulty 8: 66 %, +10 % on the welcome day.
    expect(r.attempts[0]!.check.chance).toBe(76);
    expect(r.effects.orders).toContainEqual(
      expect.objectContaining({ id: 'dir.welcome-b', before: 0, after: 1, target: 1, done: true, fxp: 20 }),
    );
    expect(r.rewards.fxp.total).toBeGreaterThan(0);
    expect(r.rewards.opinion).toBe(0);
    // The same key returns the stored result.
    expect(await caller.action.perform({ ...FAVOUR, idempotencyKey: key, times: 1 })).toEqual(r);
    // The order is done: the favour leaves the sheet, and a new key is refused.
    expect(await hqActions(caller)).not.toContain(FAVOUR.actionId);
    const before = (await Character.findOne({ userId: user.id }).lean())!;
    expect(await refusal(caller.action.perform({ ...FAVOUR, idempotencyKey: randomUUID(), times: 1 }))).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'NOT_OFFERED', actionId: FAVOUR.actionId },
    });
    const after = (await Character.findOne({ userId: user.id }).lean())!;
    expect([after.version, after.energy.value]).toEqual([before.version, before.energy.value]);
  });

  it('×3 is ONCE_ONLY (nothing written)', async () => {
    const { user, caller } = await joined();
    expect(await refusal(caller.action.perform({ ...FAVOUR, idempotencyKey: randomUUID(), times: 3 }))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'ONCE_ONLY' },
    });
    expect(await ActionLog.countDocuments({ characterId: (await Character.findOne({ userId: user.id }))!._id })).toBe(0);
  });

  it('two concurrent taps under two keys: one result, one log, 10 Energy; the loser is NOT_OFFERED', async () => {
    const { user, caller } = await joined();
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => caller.action.perform({ ...FAVOUR, idempotencyKey: randomUUID(), times: 1 })),
    );
    const ok = results.filter((x) => x.status === 'fulfilled');
    expect(ok).toHaveLength(1);
    for (const x of results) {
      if (x.status === 'rejected') expect(gameData(x.reason).game?.reason).toBe('NOT_OFFERED');
    }
    const doc = (await Character.findOne({ userId: user.id }).lean())!;
    expect(doc.energy.value).toBe(90);
    expect(await ActionLog.countDocuments({ characterId: doc._id, actionId: FAVOUR.actionId })).toBe(1);
  });

  it('outside the welcome day (no open welcome order) it is not on the sheet and is NOT_OFFERED', async () => {
    const { caller, clock } = await joined();
    clock.advance(2 * 86_400_000);
    expect(await hqActions(caller)).not.toContain(FAVOUR.actionId);
    expect(await refusal(caller.action.perform({ ...FAVOUR, idempotencyKey: randomUUID(), times: 1 }))).toMatchObject({
      game: { reason: 'NOT_OFFERED' },
    });
  });

  it('another party’s favour is members only, as every HQ ticket', async () => {
    const { caller } = await joined('vanguard');
    expect(await refusal(caller.action.perform({ ...FAVOUR, idempotencyKey: randomUUID(), times: 1 }))).toMatchObject({
      game: { reason: 'WRONG_CITY' },
    });
  });
});

describe('migration 008: an old draft starts again at the platform', () => {
  it('a draft mid-way through the six old questions is reset; the face and name stay; the platform is next', async () => {
    const clock = testClock(T0);
    const user = newUser('Old Draft');
    const caller = callerFor(user, clock.now);
    await caller.arrival.start({ avatarId: 'avatar.man-40s' });
    const at = new Date(T0);
    await Arrival.updateOne(
      { userId: user.id },
      {
        $set: {
          answers: [
            { questionId: 'origin.summer', answerId: 'c', at },
            { questionId: 'origin.trouble', answerId: 'c', at },
            { questionId: 'origin.talent', answerId: 'b', at },
          ],
        },
      },
    );
    expect((await resetOldDrafts(content)).modified).toBeGreaterThanOrEqual(1);
    const v = await caller.arrival.get();
    expect(v).toMatchObject({ phase: 'story', questionId: 'origin.platform', name: 'Old Draft' });
    expect(v.avatar?.id).toBe('avatar.man-40s');
    expect(v.screen?.title).toBe('The counter');
    for (const a of originAnswers('alliance')) await caller.arrival.answer(a);
    expect((await caller.arrival.join({})).character.factionId).toBe('alliance');
  });
});
