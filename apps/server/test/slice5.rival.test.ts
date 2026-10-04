/**
 * Slice 5, T13 (tech design §8.2 actionService, §10.2, §15 "Server — rival ground"; ADR 0034): a
 * tier-1 tap on rival ground without run-ins — ×1 only, the rival row and the Party XP line, opinion
 * against the home faction with the day's cap and `rivalPressure`, the two ledger legs and the actor's
 * contribution, orders untouched, the tally's rival city.
 */
import { City, Character, Contribution, InfluenceLedger } from '@irongate/db';
import type { CityDoc } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { streetHooks } from '../src/services/streetHooks';
import { at, content, key, member } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const CANVASS = {
  actionId: 'duskwall.quartermaster-market.canvass',
  locationId: 'duskwall.quartermaster-market',
};

beforeAll(async () => {
  await setupDb('slice5-rival-test');
  streetHooks.enabled = true;
});
afterAll(teardownDb);

async function visitor(clock: { now: () => number }, name: string) {
  return member(clock, { name, level: 10, cityId: 'duskwall' });
}

async function setDuskwall(opinion: CityDoc['opinion'] | null, pressure: CityDoc['rivalPressure'] | null) {
  const set: Record<string, unknown> = { rivalPressure: pressure };
  if (opinion) set.opinion = opinion;
  await City.updateOne({ _id: 'duskwall' }, { $set: set });
}

describe('a tier-1 tap on rival ground (tech design §10.2)', () => {
  it('×3 is refused ONCE_ON_RIVAL_GROUND and nothing is written', async () => {
    const clock = testClock(at(DAY));
    const p = await visitor(clock, 'Ana Three');
    const before = (await Character.findById(p.id).lean())!;
    await expect(p.caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 3 })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'ONCE_ON_RIVAL_GROUND',
    );
    expect((await Character.findById(p.id).lean())!.version).toBe(before.version);
  });

  it('×1: the rival row, +50 % Party XP, opinion against the Vanguard, two ledger legs, orders untouched', async () => {
    const clock = testClock(at(DAY));
    const p = await visitor(clock, 'Ben Once');
    await setDuskwall({ vanguard: 70, collective: 10, alliance: 5, neutral: 15 }, null);
    const ordersBefore = (await Character.findById(p.id).lean())!.orders;
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = await p.caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 1 });

    expect(r.attempts[0]!.check.bonuses).toContainEqual({ id: 'rivalGround', label: 'Rival ground', value: -16 });
    expect(r.bonusTags.find((t) => t.id === 'rivalGround')).toMatchObject({ note: '+50 % Party XP · worse odds' });
    const part = r.rewards.fxp.parts?.find((x) => x.id === 'rivalGround');
    expect(r.stamp).toBe('success');
    expect(part?.amount).toBeGreaterThan(0);
    expect(r.again).toMatchObject({ cost3: null });
    expect(r.street).toMatchObject({ runIn: null, heat: null, sentTo: null });

    const op = r.effects.opinion!;
    expect(op).toMatchObject({ mode: 'against', targetFactionId: 'vanguard', factionId: 'collective', capped: false });
    expect(op.shareBefore).toBe(70);
    {
      expect(r.rewards.opinion).toBeGreaterThan(0);
      expect(op.applied).toBeCloseTo(r.rewards.opinion, 3);
      expect(op.shareAfter).toBeCloseTo(70 - op.applied, 3);
      const city = (await City.findById('duskwall').lean<CityDoc>())!;
      expect(city.opinion!.vanguard).toBeCloseTo(70 - op.applied, 3);
      expect(city.opinion!.collective).toBeCloseTo(10 + op.toActor!, 3);
      expect(city.rivalPressure).toMatchObject({ day: DAY, lost: Math.round(op.applied * 1_000) });
      const legs = await InfluenceLedger.find({ ref: r.logId }).lean();
      expect(legs.map((l) => [l.factionId, l.swing]).sort()).toEqual(
        [
          ['collective', Math.round(op.toActor! * 1_000)],
          ['vanguard', -Math.round(op.applied * 1_000)],
        ].sort(),
      );
      const mine = await Contribution.find({ characterId: p.id, kind: 'influence' }).lean();
      expect(mine.reduce((s, x) => s + x.amount, 0)).toBe(Math.round(op.toActor! * 1_000));
    }
    const after = (await Character.findById(p.id).lean())!;
    expect(after.orders.items.map((x) => x.progress)).toEqual(ordersBefore.items.map((x) => x.progress));
    expect(after.today.rivalCityId).toBe('duskwall');
  });

  it('in Unrest the Party XP share is +75 %', async () => {
    const clock = testClock(at(DAY));
    const p = await visitor(clock, 'Cas Unrest');
    // The Vanguard under its Unrest threshold (60) in its own home city.
    await setDuskwall({ vanguard: 55, collective: 15, alliance: 10, neutral: 20 }, null);
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = await p.caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 1 });
    expect(r.bonusTags.find((t) => t.id === 'rivalGround')?.note).toBe('+75 % Party XP · worse odds');
  });

  it('the day cap: 1.97 lost → the next tap takes 0.03 (capped); then nothing', async () => {
    const clock = testClock(at(DAY));
    const p = await visitor(clock, 'Dov Cap');
    await setDuskwall({ vanguard: 70, collective: 10, alliance: 5, neutral: 15 }, { day: DAY, lost: 1_970, prev: null });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = await p.caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 1 });
    expect(r.rewards.opinion).toBeGreaterThan(0.03);
    {
      expect(r.effects.opinion).toMatchObject({ mode: 'against', capped: true });
      expect(r.effects.opinion!.applied).toBeCloseTo(0.03, 3);
      expect((await City.findById('duskwall').lean<CityDoc>())!.rivalPressure).toMatchObject({ lost: 2_000 });
    }
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r2 = await p.caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 1 });
    expect(r2.rewards.opinion).toBeGreaterThan(0);
    expect(r2.effects.opinion?.applied ?? 0).toBe(0);
    expect((await City.findById('duskwall').lean<CityDoc>())!.rivalPressure).toMatchObject({ lost: 2_000 });
  });

  it('at home nothing changes: persuasion, ×3 allowed, no street block', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Eda Home', level: 10 });
    const r = await p.caller.action.perform({
      actionId: 'coalport.union-hall.committee',
      locationId: 'coalport.union-hall',
      idempotencyKey: key(),
      times: 3,
    });
    expect(r.street).toBeUndefined();
    expect(r.effects.opinion?.mode).toBeUndefined();
    expect(content.city('coalport')?.homeFactionId).toBe('collective');
  });
});
