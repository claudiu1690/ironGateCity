/**
 * Review 5 fix round (the favour's *Once more*): a result offers *Once more* / *Three more* only when a
 * repeat would be taken. The welcome favour is once only (ADR 0073), so its result has no `again`; an
 * ordinary canvass keeps both.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arrive, callerFor, gameData, newUser, setupDb, teardownDb, testClock } from './helpers';
import { at } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const key = () => randomUUID();
const FAVOUR = { actionId: 'coalport.union-hall.favour', locationId: 'coalport.union-hall' } as const;
const CANVASS = { actionId: 'coalport.mill-gate.canvass', locationId: 'coalport.mill-gate' } as const;

beforeAll(async () => {
  await setupDb('review5-again');
});
afterAll(teardownDb);

async function joined() {
  const clock = testClock(at(DAY, 9));
  const caller = callerFor(newUser(`Again ${Math.random()}`), clock.now);
  await arrive(caller, { factionId: 'collective' });
  return caller;
}

describe('no *again* where a repeat would be refused', () => {
  it('the welcome favour: Continue only; a second tap is refused, as the result said', async () => {
    const caller = await joined();
    const r = await caller.action.perform({ ...FAVOUR, idempotencyKey: key(), times: 1 });
    expect('stamp' in r && r.again).toBeNull();
    const second = await caller.action.perform({ ...FAVOUR, idempotencyKey: key(), times: 1 }).then(
      () => null,
      (e: unknown) => gameData(e),
    );
    expect(second).toMatchObject({ game: { reason: 'NOT_OFFERED' } });
  });

  it('an ordinary canvass keeps *Once more* and *Three more*', async () => {
    const caller = await joined();
    const r = await caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 1 });
    expect('stamp' in r && r.again).toEqual({ cost1: 10, cost3: 30 });
  });
});
