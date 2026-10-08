/**
 * Review 5 #7 (answers §7, GDD §14.10): the journey card stays until a row is tapped. Its explicit
 * put-aside row is the card's last choice: *Sleep through it* (the ordinary deck, *Nothing happens.*)
 * or *Let it pass* (the hostile deck, its consequence on the detail line). Chosen, it prints the
 * card's `ignore` text with no stamp, applies the `ignoreEffects` at once and only once (the arrival
 * and Continue apply nothing again), and is idempotent like any other choice.
 */
import { Character, Journey } from '@irongate/db';
import type { CharacterDoc, JourneyDoc } from '@irongate/db';
import { JOURNEY_SET_ASIDE } from '@irongate/rules';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { noScheduler, setJourneyScheduler } from '../src/jobs/scheduler';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import type { Player } from './politics.helpers';
import { at, key, member } from './slice5.helpers';
import { cardNow } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026

beforeAll(async () => {
  await setupDb('review5-travel-test');
});
afterAll(teardownDb);
afterEach(() => setJourneyScheduler(noScheduler));

type Clock = ReturnType<typeof testClock>;
const fresh = async (name: string): Promise<Player & { clock: Clock }> => {
  const clock = testClock(at(DAY));
  const p = await member(clock, { level: 10, name });
  return { ...p, clock };
};
const doc = async (id: string) => (await Character.findById(id).lean<CharacterDoc>())!;
const journey = async (id: string) => (await Journey.findById(id).lean<JourneyDoc>())!;

async function boardCard(p: Player & { clock: Clock }, to: string) {
  const b = await p.caller.travel.board({ to, idempotencyKey: key() });
  await cardNow(b.journey.id, p.clock.now());
  return (await p.caller.travel.journey())!;
}

describe('the put-aside row (review 5 #7)', () => {
  it('the hostile deck: *Let it pass* with its consequence; Heat +10 and Watched now, once', async () => {
    const p = await fresh('Ria Passes');
    const j = await boardCard(p, 'duskwall');
    expect(j.card!.eventId).toBe('jev.checkpoint');
    const row = j.card!.choices.at(-1)!;
    expect(row).toEqual({
      id: JOURNEY_SET_ASIDE,
      title: 'Let it pass',
      detail: 'your name gets written down · Heat +10 · Watched today',
      stat: null,
      chance: null,
      cost: null,
      affordable: true,
      setAside: true,
    });
    // Only the last row is the put-aside one.
    expect(j.card!.choices.slice(0, -1).every((c) => !c.setAside)).toBe(true);

    const k = key();
    const r = await p.caller.travel.choose({ journeyId: j.id, choiceId: JOURNEY_SET_ASIDE, idempotencyKey: k });
    expect(r).toMatchObject({
      choiceId: JOURNEY_SET_ASIDE,
      stamp: null,
      headline: 'Let it pass',
      body: 'You keep your eyes shut. They write your name down anyway.',
      reason: null,
      rewards: [{ id: 'heat', amount: 10 }],
      flag: { flag: 'watched' },
    });
    expect(r.character.heat?.value).toBe(10);
    // The same key: the same result, nothing applied twice; another key: already chosen.
    const again = await p.caller.travel.choose({ journeyId: j.id, choiceId: JOURNEY_SET_ASIDE, idempotencyKey: k });
    expect(again.performedAt).toBe(r.performedAt);
    const refused = await p.caller.travel
      .choose({ journeyId: j.id, choiceId: JOURNEY_SET_ASIDE, idempotencyKey: key() })
      .then(
        () => null,
        (e: unknown) => gameData(e),
      );
    expect(refused).toMatchObject({ game: { reason: 'ALREADY_CHOSEN' } });
    expect((await doc(p.id)).heat?.value).toBe(10);
    expect((await journey(j.id)).sleptThrough).toBe(true);

    // The arrival shows the Heat it moved; Continue applies nothing again.
    p.clock.set(j.arrivesAt);
    const arrived = (await p.caller.travel.journey())!;
    expect(arrived.arrival!.knockOns).toMatchObject({ heat: { before: 0, after: 10 }, flags: ['watched'] });
    expect(arrived.card!.chosen?.choiceId).toBe(JOURNEY_SET_ASIDE);
    await p.caller.travel.close({ journeyId: j.id });
    const c = await doc(p.id);
    expect([c.heat?.value, c.flags, c.journey]).toEqual([10, [{ cityId: 'duskwall', day: DAY, flag: 'watched' }], null]);
    expect((await journey(j.id)).sleptThrough).toBe(true);
  });

  it('the ordinary deck: *Sleep through it* · *Nothing happens.*; the ignore text, nothing else', async () => {
    const p = await fresh('Ria Sleeps On');
    const j = await boardCard(p, 'irongate');
    expect(j.card!.deck).toBe('ordinary');
    const row = j.card!.choices.at(-1)!;
    expect([row.id, row.title, row.detail, row.setAside]).toEqual([
      JOURNEY_SET_ASIDE,
      'Sleep through it',
      'Nothing happens.',
      true,
    ]);
    const before = await doc(p.id);
    const r = await p.caller.travel.choose({ journeyId: j.id, choiceId: JOURNEY_SET_ASIDE, idempotencyKey: key() });
    expect(r.stamp).toBeNull();
    expect(r.headline).toBe('Sleep through it');
    expect(r.rewards).toEqual([]);
    expect(r.flag).toBeUndefined();
    expect(r.body.length).toBeGreaterThan(0);
    const after = await doc(p.id);
    expect([after.iron, after.xp, after.heat?.value ?? 0, after.version]).toEqual([
      before.iron,
      before.xp,
      before.heat?.value ?? 0,
      before.version,
    ]);
    // The journey view folds it in: the card is answered.
    const view = (await p.caller.travel.journey())!;
    expect(view.card!.chosen?.choiceId).toBe(JOURNEY_SET_ASIDE);
  });
});
