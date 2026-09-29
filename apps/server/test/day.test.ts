import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Character, PaperEntry } from '@irongate/db';
import { dayKey } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Context } from '../src/trpc/context';
import { createCaller } from '../src/trpc/router';
import { freshCharacter, newUser, setupDb, teardownDb, testClock } from './helpers';

const DAY = 86_400_000;
const CANVASS = { actionId: 'coalport.mill-gate.canvass', locationId: 'coalport.mill-gate' } as const;

beforeAll(async () => {
  await setupDb('day-test');
});
afterAll(teardownDb);

describe('the City Day (ADR 0005)', () => {
  it('a new day settles once: one edition, the tally reset, orders rotated; a second read writes nothing', async () => {
    const { caller, me, clock } = await freshCharacter();
    await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    clock.advance(DAY);
    const next = await caller.character.me();
    expect(next.day.key).toBe(dayKey(clock.now()));
    expect(next.today).toMatchObject({ energy: 0, attempts: 0 });
    // Day index 272: Knock Foundry Row, Paper the town, A full day.
    expect(next.orders.items.map((o) => o.id)).toEqual([
      'dir.foundry-row',
      'dir.paper-the-town',
      'dir.full-day',
    ]);
    expect(await PaperEntry.countDocuments({ characterId: me.id })).toBe(2);
    const stored = await Character.findById(me.id).lean();
    await caller.character.me();
    expect(await Character.findById(me.id).lean()).toEqual(stored);
  });

  it('concurrent first requests of a new day make one paper and credit the salary once', async () => {
    const { caller, me, clock } = await freshCharacter();
    await caller.job.take({ jobId: 'factory-worker', idempotencyKey: randomUUID() });
    clock.advance(DAY);
    await Promise.all([
      caller.character.me(),
      caller.paper.today(),
      caller.city.get({ cityId: 'coalport' }),
      caller.character.me(),
    ]);
    expect(await PaperEntry.countDocuments({ characterId: me.id })).toBe(2);
    expect((await Character.findById(me.id).lean())!.iron).toBe(108);
  });

  it('an action straddling midnight counts on the new day, after the new day is settled', async () => {
    const clock = testClock(Date.UTC(2026, 8, 29, 23, 59, 59, 900));
    const user = newUser();
    await createCaller({ user, content: getContent(), now: clock.now }).character.me();
    let calls = 0;
    const straddling = () => (calls++ === 0 ? clock.now() : clock.now() + 200);
    const ctx: Context = { user, content: getContent(), now: straddling };
    const r = await createCaller(ctx).action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    const newDay = dayKey(clock.now() + 200);
    expect(r.today).toMatchObject({ day: newDay, energy: 10 });
    expect(r.character.day.key).toBe(newDay);
    const doc = (await Character.findOne({ userId: user.id }).lean())!;
    expect(doc.day.settled).toBe(newDay);
    expect(await PaperEntry.countDocuments({ characterId: doc._id, day: newDay })).toBe(1);
  });
});
