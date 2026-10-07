/**
 * Review 4, QA fix round (docs/qa/review-4-report.md m2, m4): the welcome set is dealt once per
 * character (ADR 0073). A late sign-up's second welcome day carries the evening's set on as it stands,
 * or deals the rotation once it is finished; the Town Hall gives each council's own majority.
 */
import { randomUUID } from 'node:crypto';
import { ActionLog, Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { dayStart } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arrive, callerFor, newUser, setupDb, teardownDb, testClock } from './helpers';
import { at } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const FAVOUR = { actionId: 'coalport.union-hall.favour', locationId: 'coalport.union-hall' } as const;
const doc = async (id: string) => (await Character.findById(id).lean<CharacterDoc>())!;

beforeAll(async () => {
  await setupDb('review4-fixround');
});
afterAll(teardownDb);

async function lateJoin(name: string) {
  const clock = testClock(dayStart(DAY) + 22.5 * 3_600_000);
  const caller = callerFor(newUser(name), clock.now);
  const r = await arrive(caller, { factionId: 'collective' });
  return { caller, clock, id: r.character.id };
}

describe('the welcome set, once per character (QA m2)', () => {
  it('the favour done at 22:30 stays done the next morning; the other two orders carry on', async () => {
    const { caller, clock, id } = await lateJoin('Qa Late Favour');
    await caller.action.perform({ ...FAVOUR, idempotencyKey: randomUUID(), times: 1 });
    const evening = (await doc(id)).orders;
    clock.set(at(DAY + 1, 9));
    await caller.character.me();
    const morning = (await doc(id)).orders;
    expect(morning.day).toBe(DAY + 1);
    expect(morning.items.map((i) => i.templateId)).toEqual(evening.items.map((i) => i.templateId));
    const b = morning.items.find((i) => i.templateId === 'dir.welcome-b')!;
    expect(b.doneAt).not.toBeNull();
    expect(morning.items.filter((i) => i.doneAt === null)).toHaveLength(2);
    expect(
      await ActionLog.countDocuments({ characterId: new Types.ObjectId(id), actionId: FAVOUR.actionId }),
    ).toBe(1);
  });

  it('a set finished the first evening gives way to the day’s rotation', async () => {
    const { caller, clock, id } = await lateJoin('Qa Late Finisher');
    const c = await doc(id);
    // Every welcome order done that evening (as if played through).
    await Character.updateOne(
      { _id: c._id },
      {
        $set: {
          'orders.items': c.orders.items.map((i) => ({ ...i, progress: i.target, doneAt: new Date(clock.now()) })),
          'orders.allDoneAt': new Date(clock.now()),
        },
      },
    );
    clock.set(at(DAY + 1, 9));
    await caller.character.me();
    const morning = (await doc(id)).orders;
    expect(morning.day).toBe(DAY + 1);
    expect(morning.items.map((i) => i.templateId)).not.toContain('dir.welcome-b');
    expect(morning.items.every((i) => i.doneAt === null || i.templateId.includes('job'))).toBe(true);
  });

  it('an early sign-up is dealt the rotation the next morning, as before', async () => {
    const clock = testClock(at(DAY, 9));
    const caller = callerFor(newUser('Qa Early'), clock.now);
    const { character } = await arrive(caller, { factionId: 'collective' });
    clock.set(at(DAY + 1, 9));
    await caller.character.me();
    expect((await doc(character.id)).orders.items.map((i) => i.templateId)).not.toContain('dir.welcome-b');
  });
});
