/**
 * Review 3 (docs/design/review-3-answers.md; GDD §0 "Added 2 Oct 2026 (review 3)", §8.5, §13.1,
 * §15.3): the training button is the action's verb (content, through the city view and the *Trained*
 * result's repeat), and every election screen's view carries the council's hall on the city picture.
 */
import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Character } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hallView } from '../src/services/politicsService';
import { freshCharacter, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, nextCycleDay, player } from './politics.helpers';

const content = getContent();
const ORDERS_DAY = Date.UTC(2026, 9, 19, 9);
const STUDY = { actionId: 'coalport.union-hall.reading-room', locationId: 'coalport.union-hall' } as const;

beforeAll(async () => {
  await setupDb('review3-test');
});
afterAll(teardownDb);

describe('training: the button is the verb (GDD §8.5)', () => {
  it("every training action in the city view carries its content verb, never 'Train'", async () => {
    for (const [cityId, factionId] of [
      ['coalport', 'collective'],
      ['duskwall', 'vanguard'],
      ['ashford', 'alliance'],
    ] as const) {
      // A member sees the city it lives in.
      const { caller } = await freshCharacter(testClock(ORDERS_DAY), 'Mara Lenk', factionId);
      const city = await caller.city.get({ cityId });
      const training = city.locations.flatMap((l) => l.actions.filter((a) => a.kind === 'training'));
      expect(training, cityId).toHaveLength(3);
      for (const a of training) {
        const spec = content
          .city(cityId)!
          .locations.flatMap((l) => l.actions)
          .find((x) => x.id === a.id)!;
        expect('verb' in spec && a.verb, a.id).toBe('verb' in spec ? spec.verb : null);
        expect(a.verb, a.id).toMatch(/^[A-Z][a-z]{1,5}$/);
        expect(a.verb, a.id).not.toBe('Train');
      }
      // Checked actions have none.
      expect(city.locations.flatMap((l) => l.actions.filter((a) => a.kind === 'checked' && a.verb))).toEqual(
        [],
      );
    }
  });

  it("the Trained result's repeat names the verb and the next point's live cost", async () => {
    const { caller, me } = await freshCharacter(testClock(ORDERS_DAY));
    await Character.updateOne({ _id: me.id }, { $set: { 'energy.value': 100 } });
    const r = await caller.action.perform({ ...STUDY, idempotencyKey: randomUUID(), times: 1 });
    expect(r.stamp).toBe('trained');
    expect(r.again).toEqual({ cost1: 46, cost3: null, verb: 'Study' });
    // A checked action's repeat has no verb.
    const c = await caller.action.perform({
      actionId: 'coalport.mill-gate.canvass',
      locationId: 'coalport.mill-gate',
      idempotencyKey: randomUUID(),
      times: 1,
    });
    expect(c.again).toEqual({ cost1: 10, cost3: 30 });
  });
});

describe("the election screens stand on the council's hall (GDD §15.3)", () => {
  it('each home city names its hall on the picture, with the map stills for day and night', () => {
    for (const [cityId, x, y] of [
      ['coalport', 0.525, 0.19],
      ['duskwall', 0.555, 0.55],
      ['ashford', 0.805, 0.275],
    ] as const) {
      const hall = hallView(content, cityId)!;
      const city = content.city(cityId)!;
      expect(hall, cityId).toMatchObject({ name: 'Town Hall', ref: 'the Town Hall', x, y });
      expect(hall.asset.day.id).toBe(city.map.day);
      expect(hall.asset.night.id).toBe(city.map.night);
      expect(hall.asset.day.width).toBeGreaterThan(0);
    }
    // A city without a council has no hall.
    expect(hallView(content, 'irongate')).toBeNull();
  });

  it("who's standing carries the hall", async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 20730);
    const clock = testClock(at(D0));
    const A = await player(clock, { name: 'Mara Lenk', fxp: 2_000, successes: 200, pc: 45 });
    const e = await A.caller.council.election();
    expect(e.hall).toMatchObject({ name: 'Town Hall', ref: 'the Town Hall', x: 0.525, y: 0.19 });
    expect(e.hall!.asset.day.id).toBe('map.coalport.day');
    expect(e.hall!.asset.night.id).toBe('map.coalport.night');
  });
});
