import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshCharacter, setupDb, teardownDb } from './helpers';

const H = 3_600_000;
const CANVASS = { actionId: 'coalport.mill-gate.canvass', locationId: 'coalport.mill-gate' } as const;

beforeAll(async () => {
  await setupDb('paper-test');
});
afterAll(teardownDb);

describe('paper.today (§3.3)', () => {
  it('the first edition: masthead, dateline, 3 headlines, orders signed P.H., the desk', async () => {
    const { caller } = await freshCharacter();
    const p = await caller.paper.today();
    expect(p.paper).toEqual({
      name: 'The Coalport Clarion',
      strapline: 'The voice of the mill and the quays',
      price: '5 marks',
    });
    expect(p.dateline).toEqual({ weekday: 'Tuesday', date: '29 September', city: 'Coalport' });
    expect(p.firstEdition).toBe(true);
    expect(p.headlines).toHaveLength(3);
    expect(p.headlines[0]).toMatchObject({ group: 'personal', headline: 'Welcome to Coalport' });
    expect(p.headlines[1]).toMatchObject({ group: 'city', headline: 'Collective Holds Coalport at 70.0 %' });
    expect(p.headlines[2]).toMatchObject({
      group: 'ambient',
      headline: 'Night Shift Back to Full Time at the Mill',
    });
    expect(p.orders.issuer?.signature).toBe('— P.H.');
    expect(p.orders.items).toHaveLength(3);
    expect(p.desk).toMatchObject({
      salary: null,
      jobName: null,
      energy: { value: 100, max: 100, fullAt: null },
      level: { level: 1, xpToNext: 150, next: 2, statPointsPending: 0 },
      standing: { name: 'Stranger', nextName: 'Familiar' },
      yesterday: null,
    });
    expect(p.due).toBe(true);
    expect(p.readAt).toBeNull();
  });

  it('markRead is idempotent; due again 3 h after the later of read and last action', async () => {
    const { caller, clock } = await freshCharacter();
    const p = await caller.paper.today();
    const first = await caller.paper.markRead({ day: p.day });
    expect(first.readAt).toBe(clock.now());
    clock.advance(60_000);
    expect(await caller.paper.markRead({ day: p.day })).toEqual(first);
    expect((await caller.character.me()).paperDue).toBe(false);
    await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    clock.advance(3 * H - 1);
    expect((await caller.character.me()).paperDue).toBe(false);
    clock.advance(1);
    expect((await caller.character.me()).paperDue).toBe(true);
  });

  it('the next day: Yesterday on the desk; a personal-less edition calls for the slot-A order', async () => {
    const { caller, clock } = await freshCharacter();
    await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    clock.advance(24 * H);
    const p = await caller.paper.today();
    expect(p.firstEdition).toBe(false);
    expect(p.desk.yesterday).toMatchObject({ energy: 10, attempts: 1 });
    expect(p.desk.daysSinceLastPaper).toBe(1);
    expect(p.headlines.map((h) => h.group)).toEqual(['city', 'city', 'ambient']);
    expect(p.headlines[1]).toEqual({
      group: 'city',
      headline: 'Secretary Holm Calls for Knock Foundry Row',
      deck: 'Sixty doors in Foundry Row. Start at the top and work down.',
    });
    expect(p.due).toBe(true);
  });
});
