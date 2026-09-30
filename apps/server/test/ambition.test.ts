import { randomUUID } from 'node:crypto';
import { ActionLog, Character } from '@irongate/db';
import { createRng, dayKey, resolveChapterCheck } from '@irongate/rules';
import { getContent } from '@irongate/content';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arrive, callerFor, gameData, newUser, setupDb, teardownDb, testClock } from './helpers';

/** Slice-2 tech design §14 "Server — chapter" (GDD §17.1, ADR 0013). */
beforeAll(async () => {
  await setupDb('ambition-test');
});
afterAll(teardownDb);

const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => null,
      (e: unknown) => e,
    ),
  );
const T0 = Date.UTC(2026, 8, 29, 9); // Tuesday 29 September

async function arrived(name = 'Mara Lenk') {
  const clock = testClock(T0);
  const user = newUser(name);
  const caller = callerFor(user, clock.now);
  await arrive(caller);
  return { user, clock, caller };
}

describe('ambition.get and choose', () => {
  it('chapter 1 is ready: the choose screen with the map crop of the HQ and {secretary} resolved', async () => {
    const { caller } = await arrived();
    const v = await caller.ambition.get();
    expect(v).toMatchObject({
      id: 'finish-his-work',
      title: 'Finish His Work',
      chapter: 1,
      of: 12,
      chapterTitle: 'His ward book',
      status: 'ready',
      letterFrom: "From your father's things",
    });
    expect(v.screen).toMatchObject({
      kicker: 'Ambition · Finish His Work · Chapter 1 of 12',
      title: 'His ward book',
      art: { kind: 'map-crop', x: 0.66, y: 0.3 },
      progress: { step: 1, of: 3 },
    });
    expect(v.screen?.choices.map((c) => c.text)).toEqual([
      'Show it to Secretary Holm',
      'Keep it to yourself for now',
    ]);
  });

  it('n7: the Paper dot stays while the chapter is ready, even once the Letter was opened', async () => {
    const { caller } = await arrived();
    expect((await caller.character.me()).lettersWaiting).toBe(1);
    // Opening the Letter (the chapter screen) without choosing keeps the dot (onboarding §14.3 n7).
    expect((await caller.ambition.get()).status).toBe('ready');
    expect((await caller.character.me()).lettersWaiting).toBe(1);
  });

  it('choose is set-once: five taps at once write once; the check screen shows the odds', async () => {
    const { user, caller } = await arrived();
    const before = (await Character.findOne({ userId: user.id }).lean())!.version;
    const views = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        caller.ambition.choose({ chapter: 1, choiceId: i === 0 ? 'show' : 'keep' }),
      ),
    );
    expect(new Set(views.map((v) => v.screen?.echo)).size).toBe(1);
    const doc = (await Character.findOne({ userId: user.id }).lean())!;
    expect(doc.version).toBe(before + 1);
    expect(doc.ambition).toMatchObject({
      step: 'check',
      flags: [doc.ambition.choiceId === 'show' ? 'showed-book' : 'kept-book'],
    });
    const v = views[0]!;
    expect(v.status).toBe('midway');
    // Review 1 (§8.4, §17.1): on the welcome day the First day row adds +10 % (46 → 56, 66 → 76), and
    // chapter 1 has a third approach, Legwork, on the best trained stat (INT 12: 66 + 10).
    expect(v.screen?.approaches.map((a) => [a.id, a.check.chance])).toEqual([
      ['knock', 56],
      ['sort', 76],
      ['legwork', 76],
    ]);
    expect(v.screen?.approaches[2]?.check).toMatchObject({ stats: ['int'], best: true });
    expect(v.screen?.cta).toEqual({ label: 'Walk his streets', energy: 10, readyAt: null });
    expect((await caller.character.me()).lettersWaiting).toBe(0);
    expect((await caller.paper.today()).letters[0]?.status).toBe('midway');
  });

  it('refuses an unknown choice and a chapter that is not ready', async () => {
    const { caller } = await arrived();
    expect(await refusal(caller.ambition.choose({ chapter: 1, choiceId: 'burn' }))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'UNKNOWN_CHOICE' },
    });
    expect(await refusal(caller.ambition.choose({ chapter: 2, choiceId: 'show' }))).toMatchObject({
      game: { reason: 'CHAPTER_NOT_READY' },
    });
  });
});

describe('ambition.attempt', () => {
  it('before choosing: CHOOSE_FIRST', async () => {
    const { caller } = await arrived();
    expect(
      await refusal(
        caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: randomUUID() }),
      ),
    ).toMatchObject({ code: 'PRECONDITION_FAILED', game: { reason: 'CHOOSE_FIRST' } });
  });

  it('×5 with one key: one log, 10 Energy, one keepsake, the chapter complete; the result replays from its seed', async () => {
    const { user, caller } = await arrived();
    await caller.ambition.choose({ chapter: 1, choiceId: 'keep' });
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: key }),
      ),
    );
    expect(new Set(results.map((r) => JSON.stringify(r))).size).toBe(1);
    const r = results[0]!;
    const doc = (await Character.findOne({ userId: user.id }).lean())!;
    expect(await ActionLog.countDocuments({ characterId: doc._id, kind: 'chapter' })).toBe(1);
    expect(doc.energy.value).toBe(90);
    expect(doc.inventory.filter((e) => e.itemId === 'keep.ward-book')).toHaveLength(1);
    expect(doc.ambition).toMatchObject({ chapter: 2, step: 'choose', choiceId: null, flags: ['kept-book'] });
    expect(doc.ambition.history[0]).toMatchObject({
      chapter: 1,
      choiceId: 'keep',
      approachId: 'sort',
      outcome: r.stamp,
    });

    expect(r).toMatchObject({
      kind: 'chapter',
      action: { id: 'finish-his-work.1', name: 'His ward book', type: 'chapter', tier: 3, times: 1 },
      story: {
        ambitionTitle: 'Finish His Work',
        chapter: 1,
        of: 12,
        approachId: 'sort',
        choiceText: 'Keep it to yourself for now',
      },
      place: { cityId: 'coalport', locationId: 'coalport.union-hall' },
      art: { rung: 'map-crop' },
      again: null,
      effects: {
        item: { itemId: 'keep.ward-book', name: 'His ward book', keepsake: true },
        // Slice 3 (design §17 Q21): chapter 2 opens after the first ballot.
        hooks: ['Chapter 2, "Stand where he stood": from Tuesday 6 October, after your first vote'],
        opinion: null,
        standing: null,
        orders: [],
      },
    });
    const rewards = { success: [150, 40, 100], partial: [75, 20, 50], failure: [25, 0, 0] } as const;
    const want = rewards[r.stamp as keyof typeof rewards];
    expect([r.rewards.xp.total, r.rewards.fxp.total, r.rewards.iron.total]).toEqual(want);
    expect(r.today).toMatchObject({ energy: 10, attempts: 0, successes: 0, xp: want[0], iron: want[2] });
    // Replays from its seed.
    const content = getContent();
    const replay = resolveChapterCheck(
      {
        spec: content.chapterRules('finish-his-work', 1)!,
        approachId: 'sort',
        values: { str: 10, int: 12, agi: 5, cha: 2 },
        energy: { value: 100, rested: 0, updatedAt: T0 },
        now: T0,
      },
      createRng(r.seed),
    );
    expect(replay.ok && replay.resolution.attempt.roll).toBe(r.attempts[0]!.roll);

    // The chapter is done: the Letters row is gone (chapter 2 waits for its day and the first
    // ballot), the keepsake on Me.
    const me = await caller.character.me();
    expect(me.ambition.status).toBe('waiting');
    expect(me.keepsakes.map((k) => k.name)).toEqual(['His ward book']);
    expect((await caller.paper.today()).letters).toEqual([]);
    // n13: the chapter screen now shows the hook, the same as the modal's, and no choices.
    expect(await caller.ambition.get()).toMatchObject({
      chapter: 2,
      chapterTitle: 'Stand where he stood',
      screen: null,
      waitsUntil: 'From Tuesday 6 October, after your first vote',
    });
    expect(
      await refusal(
        caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: randomUUID() }),
      ),
    ).toMatchObject({ game: { reason: 'CHAPTER_NOT_READY' } });
    // The same key with another approach is refused.
    expect(
      await refusal(caller.ambition.attempt({ chapter: 1, approachId: 'knock', idempotencyKey: key })),
    ).toMatchObject({ game: { reason: 'KEY_REUSED' } });
  });

  it('with 9 Energy: refused, nothing written; an unknown approach is refused', async () => {
    const { user, caller } = await arrived();
    await caller.ambition.choose({ chapter: 1, choiceId: 'show' });
    await Character.updateOne(
      { userId: user.id },
      { $set: { 'energy.value': 9, 'energy.updatedAt': new Date(T0) } },
    );
    const before = await Character.findOne({ userId: user.id }).lean();
    expect(
      await refusal(
        caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: randomUUID() }),
      ),
    ).toMatchObject({ game: { reason: 'NOT_ENOUGH_ENERGY', cost: 10, energy: 9 } });
    expect(await Character.findOne({ userId: user.id }).lean()).toEqual(before);
    expect(await ActionLog.countDocuments({ characterId: before!._id })).toBe(0);
    await Character.updateOne({ userId: user.id }, { $set: { 'energy.value': 100 } });
    expect(
      await refusal(
        caller.ambition.attempt({ chapter: 1, approachId: 'bribe', idempotencyKey: randomUUID() }),
      ),
    ).toMatchObject({ code: 'BAD_REQUEST', game: { reason: 'UNKNOWN_APPROACH' } });
  });

  it('a Failure completes the chapter and grants the keepsake; Rested pays +50 % XP and Iron', async () => {
    // Search seeds by retrying with fresh keys until each outcome shows up (the roll is the server's).
    const seen = new Map<string, { xp: number; iron: number; bonus: number }>();
    for (let i = 0; i < 40 && seen.size < 3; i++) {
      const { user, caller } = await arrived(`Seeker ${i}`);
      await caller.ambition.choose({ chapter: 1, choiceId: 'show' });
      // Full bar with 30 Rested: the chapter's 10 Energy are all covered.
      await Character.updateOne({ userId: user.id }, { $set: { rested: 30 } });
      const r = await caller.ambition.attempt({
        chapter: 1,
        approachId: 'knock',
        idempotencyKey: randomUUID(),
      });
      seen.set(r.stamp, { xp: r.rewards.xp.total, iron: r.rewards.iron.total, bonus: r.rewards.xp.bonus });
      expect(r.effects.item?.itemId).toBe('keep.ward-book');
      expect(r.bonusTags[0]).toMatchObject({ id: 'rested', note: '10 of 10 Energy, +50 % XP and Iron' });
      const doc = (await Character.findOne({ userId: user.id }).lean())!;
      expect(doc.ambition.chapter).toBe(2);
      expect(doc.today.day).toBe(dayKey(T0));
    }
    expect(seen.get('success')).toEqual({ xp: 225, iron: 150, bonus: 75 });
    expect(seen.get('failure')).toEqual({ xp: 38, iron: 0, bonus: 13 });
  });
});
