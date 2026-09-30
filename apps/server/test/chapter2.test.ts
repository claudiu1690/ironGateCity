/**
 * T19: Finish His Work chapter 2, "Stand where he stood" (design §17.7): it opens seven City Days
 * after chapter 1 and after the player's first ballot, as a Letter from the back of the ward book,
 * and pays the chapter-2 numbers with the election bill.
 */
import { randomUUID } from 'node:crypto';
import { Character } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, key, nextCycleDay, player } from './politics.helpers';

beforeAll(async () => {
  await setupDb('chapter2-test');
});
afterAll(teardownDb);

describe('Finish His Work, chapter 2', () => {
  it('waits for the day and the first ballot, then plays with its numbers and keepsake', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 0, 21100);
    const clock = testClock(at(D));
    const p = await player(clock, { fxp: 400 });
    await p.caller.ambition.choose({ chapter: 1, choiceId: 'keep' });
    const r1 = await p.caller.ambition.attempt({
      chapter: 1,
      approachId: 'sort',
      idempotencyKey: randomUUID(),
    });
    expect(r1.effects.hooks[0]).toMatch(
      /^Chapter 2, "Stand where he stood": from .+, after your first ballot$/,
    );

    // Seven days on (a polling day), but no ballot yet: still waiting.
    clock.set(at(D + 7));
    let a = await p.caller.ambition.get();
    expect(a).toMatchObject({ chapter: 2, status: 'waiting', needs: { ballotCast: true }, screen: null });
    expect((await p.caller.paper.today()).letters).toEqual([]);

    await p.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() });
    expect((await Character.findById(p.id).lean())!.firstBallotAt).toBeInstanceOf(Date);
    a = await p.caller.ambition.get();
    expect(a).toMatchObject({ chapter: 2, status: 'ready', letterFrom: 'From the back of the ward book' });
    expect(a.screen?.title).toBe('His election bill');
    expect(a.screen?.narrative).toContain('the Union Hall');
    const paper = await p.caller.paper.today();
    expect(paper.letters).toEqual([
      {
        kind: 'chapter',
        from: 'From the back of the ward book',
        title: 'His election bill',
        chapter: 2,
        status: 'ready',
        energy: 15,
      },
    ]);
    expect((await p.caller.character.me()).lettersWaiting).toBe(1);

    await p.caller.ambition.choose({ chapter: 2, choiceId: 'alone' });
    const check = await p.caller.ambition.get();
    expect(check.screen?.approaches.map((x) => x.check.difficulty)).toEqual([14, 14]);
    expect(check.screen?.cta).toMatchObject({ label: 'Stand where he stood', energy: 15 });
    const r2 = await p.caller.ambition.attempt({
      chapter: 2,
      approachId: 'edge',
      idempotencyKey: randomUUID(),
    });
    const want = { success: [300, 80, 150], partial: [150, 40, 75], failure: [50, 0, 0] } as const;
    expect([r2.rewards.xp.base, r2.rewards.fxp.total, r2.rewards.iron.base]).toEqual(
      want[r2.stamp as keyof typeof want],
    );
    expect(r2.effects.item).toMatchObject({ itemId: 'keep.election-bill', name: 'His election bill' });
    expect(r2.effects.hooks[0]).toMatch(/^Chapter 3, "The deposit": from .+, at Rank 3$/);
    expect(r2.story).toMatchObject({ chapter: 2, of: 12 });
  });
});
