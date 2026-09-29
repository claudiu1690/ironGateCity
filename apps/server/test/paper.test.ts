import { randomUUID } from 'node:crypto';
import { Character } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arrive, callerFor, freshCharacter, newUser, setupDb, teardownDb, testClock } from './helpers';

const H = 3_600_000;
const CANVASS = { actionId: 'coalport.mill-gate.canvass', locationId: 'coalport.mill-gate' } as const;

beforeAll(async () => {
  await setupDb('paper-test');
});
afterAll(teardownDb);

describe('paper.today (§3.3)', () => {
  // Slice 2: the first edition is the welcome edition, printed at the join (onboarding §7).
  it('the first edition: masthead, dateline, 3 headlines, orders signed P.H., the desk', async () => {
    const caller = callerFor(newUser('Mara Lenk'), testClock().now);
    await arrive(caller);
    const p = await caller.paper.today();
    expect(p.paper).toEqual({
      name: 'The Coalport Clarion',
      shortName: 'Clarion',
      strapline: 'The voice of the mill and the quays',
      price: '5 marks',
    });
    expect(p.dateline).toEqual({ weekday: 'Tuesday', date: '29 September', city: 'Coalport' });
    expect(p.firstEdition).toBe(true);
    expect(p.headlines).toHaveLength(3);
    // The welcome, the arrival notice with the name, the morale line (onboarding §7.2).
    expect(p.headlines[0]).toEqual({
      group: 'personal',
      headline: 'Welcome to Coalport',
      deck: "Three orders from Secretary Holm below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Spend it at the Mill Gate first.",
    });
    expect(p.headlines[1]).toEqual({
      group: 'city',
      headline: 'Mara Lenk Steps Off the Irongate Train',
      deck: 'One more pair of hands for the branch, says the Union Hall. The mill is hiring.',
    });
    expect(p.headlines[2]).toMatchObject({ group: 'city', headline: 'Collective Holds Coalport at 70.0 %' });
    expect(p.letters).toEqual([
      {
        kind: 'chapter',
        from: "From your father's things",
        title: 'His ward book',
        chapter: 1,
        status: 'ready',
        energy: 10,
      },
    ]);
    expect(p.landing).toEqual({ cityId: 'coalport', locationId: 'coalport.mill-gate' });
    expect(p.desk.wearing).toEqual({ name: 'Mill work coat', cha: 2 });
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

describe('headline variants (content §13, QA fix round 1)', () => {
  const headlinesOf = async (caller: Awaited<ReturnType<typeof freshCharacter>>['caller']) =>
    (await caller.paper.today()).headlines.map((h) => ({ headline: h.headline, deck: h.deck }));

  it('away 3 days without a job, levelled before leaving: the quiet level-up and the no-job away line', async () => {
    const { caller, me, clock } = await freshCharacter();
    await Character.updateOne({ _id: me.id }, { $set: { level: 2, xp: 150 } });
    clock.advance(3 * 24 * H);
    expect(await headlinesOf(caller)).toEqual(
      expect.arrayContaining([
        {
          headline: 'Coalport Recruit Rises to Level 2',
          deck: 'Mara Lenk of the Collective has been putting the hours in on the ward. The branch has noticed.',
        },
        {
          headline: 'While You Were Away',
          deck: 'No job, so no half pay banked. Rested is full and the ward is where you left it. The mill is still hiring: the Jobs card is at Mill Gate.',
        },
      ]),
    );
  });

  it('the next day after playing: the level-up names the real rank and yesterday’s Energy; a rank-up to 3 is "Organiser"', async () => {
    const { caller, me, clock } = await freshCharacter();
    await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    await Character.updateOne({ _id: me.id }, { $set: { level: 4, xp: 1_000, rank: 3, fxp: 2_000 } });
    clock.advance(24 * H);
    const hl = await headlinesOf(caller);
    expect(hl.slice(0, 2)).toEqual([
      {
        headline: 'Mara Lenk Made Organiser by the Branch',
        deck: 'An Organiser can stand for the council. Secretary Holm: "Now the real work starts."',
      },
      {
        headline: 'Coalport Organiser Rises to Level 4',
        deck: 'Mara Lenk of the Collective spent 10 Energy on the ward yesterday. The branch has noticed.',
      },
    ]);
  });

  it('a rank-up to 4 or higher uses the rank title from content', async () => {
    const { caller, me, clock } = await freshCharacter();
    await Character.updateOne({ _id: me.id }, { $set: { rank: 4, fxp: 6_000 } });
    clock.advance(24 * H);
    expect((await headlinesOf(caller))[0]).toEqual({
      headline: 'Mara Lenk Made Commissar by the Branch',
      deck: 'Made Commissar on the strength of party work. The branch takes note.',
    });
  });
});
