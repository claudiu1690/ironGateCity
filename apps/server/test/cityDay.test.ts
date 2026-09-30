/**
 * The city day (slice-3 tech design §7, §14; ADR 0017): the bootstrap on every cycle day, the job
 * and the request path racing, the worker down for twelve days, and the degrade path.
 */
import { copy, getContent, turnoutOf } from '@irongate/content';
import { Character, City, Election, OfficeTerm, OrderPaper, PaperEntry } from '@irongate/db';
import { applyDrift, applyMoraleLoss, councilDay, dayKey, dayStart, moraleState } from '@irongate/rules';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cityDayHooks, runCityDay, settleCityDay } from '../src/services/cityDay';
import { callerFor, newUser, resetCity, seedRecruit, setupDb, teardownDb } from './helpers';
import { key, player } from './politics.helpers';

const content = getContent();
/** Thursday 1 October 2026: Coalport's cycle day 0 (election 4145 opens, tech design §3.1). */
const D0 = 20727;
const at = (day: number, hour = 9) => dayStart(day) + hour * 3_600_000;
const COALPORT = content.city('coalport')!;

beforeAll(async () => {
  await setupDb('city-day-test');
});
afterAll(teardownDb);
afterEach(() => {
  delete cityDayHooks.seed;
  delete cityDayHooks.beforeBoundary;
});

/** Everything the city day wrote for a city, without timestamps and ids (for deep comparisons). */
async function snapshot(cityId: string) {
  const strip = (x: unknown): unknown => {
    if (x instanceof Date) return 'date';
    if (Array.isArray(x)) return x.map(strip);
    if (x && typeof x === 'object' && !(x as { _bsontype?: string })._bsontype) {
      return Object.fromEntries(
        Object.entries(x as Record<string, unknown>)
          .filter(([k]) => !['createdAt', 'updatedAt', 'closedAt', 'countedAt', 'at'].includes(k))
          .filter(([k]) => !(k === '_id' && typeof (x as Record<string, unknown>)[k] !== 'string'))
          .map(([k, v]) => [k, strip(v)]),
      );
    }
    return x && typeof x === 'object' ? String(x) : x;
  };
  const city = await City.findById(cityId).lean();
  return strip({
    city: { ...city, world: { settledDay: city?.world?.settledDay } },
    elections: await Election.find({ cityId }).sort({ _id: 1 }).lean(),
    terms: await OfficeTerm.find({ cityId }).sort({ councilKey: 1, seat: 1 }).lean(),
    papers: await OrderPaper.find({ cityId }).sort({ _id: 1 }).lean(),
  });
}

describe('the bootstrap (ADR 0017 §4, tech design §7.3)', () => {
  it.each([0, 1, 2, 3, 4])(
    'on cycle day %i: an NPC council, the branch motion in force, the election',
    async (cd) => {
      await resetCity('coalport');
      const day = D0 + cd;
      const city = await settleCityDay(content, 'coalport', at(day));
      expect(city.world).toEqual({ settledDay: day, bootstrappedDay: day });
      expect(city.morale).toEqual({ state: 'steady', since: day, previous: null });
      expect(city.council).toEqual({ key: 'coalport:4145', fromDay: D0, toDay: D0 + 5, npcSeats: 7 });
      const terms = await OfficeTerm.find({ councilKey: 'coalport:4145' }).sort({ seat: 1 }).lean();
      expect(terms.map((t) => [t.seat, t.holder.kind, t.holder.name])).toEqual(
        content
          .slateOf('coalport')
          .slice(0, 7)
          .map((c, i) => [i + 1, 'npc', c.name]),
      );
      expect(terms.every((t) => t.fromDay === D0 && t.toDay === D0 + 5 && !t.completed)).toBe(true);
      const paper = (await OrderPaper.findById('coalport:4145').lean())!;
      expect(paper.items.map((i) => [i.ordinanceId, i.movedBy.kind, i.movedBy.name])).toEqual([
        ['ord.shift-hours', 'branch', 'Petra Holm'],
      ]);
      const e = (await Election.findById('coalport:4145').lean())!;
      expect(e.npcSlate).toHaveLength(9);
      if (cd < 2) {
        expect(paper.status).toBe('open');
        expect(city.ordinance).toEqual({
          id: 'ord.shift-hours',
          fromDay: D0 - 3,
          toDay: D0 + 2,
          paperId: null,
        });
        expect(e.status).toBe('nominations');
        expect(e.ballot).toBeNull();
      } else {
        expect(paper.status).toBe('divided');
        expect(paper.division).toMatchObject({ passed: 'ord.shift-hours', npcChoice: 'ord.shift-hours' });
        expect(city.ordinance).toEqual({
          id: 'ord.shift-hours',
          fromDay: D0 + 2,
          toDay: D0 + 7,
          paperId: 'coalport:4145',
        });
        expect(e.status).toBe('polling');
        expect(e.ballot!.map((b) => b.name)).toEqual(content.slateOf('coalport').map((c) => c.name));
      }
      expect(city.ordinanceHistory).toHaveLength(1);
    },
  );
});

describe('the count boundary, raced (ADR 0017 §1)', () => {
  it('three jobs and a request at once: one count, one council, one election, morale moved once', async () => {
    await resetCity('coalport');
    await settleCityDay(content, 'coalport', at(D0 + 4));
    const user = newUser();
    await seedRecruit(user, at(D0 + 4));
    const caller = callerFor(user, () => at(D0 + 5));
    const before = (await City.findById('coalport').lean())!.opinion;
    await Promise.all([
      runCityDay(content, at(D0 + 5)),
      runCityDay(content, at(D0 + 5)),
      runCityDay(content, at(D0 + 5)),
      caller.paper.today(),
    ]);
    expect(await Election.countDocuments({ cityId: 'coalport' })).toBe(2);
    expect((await Election.findById('coalport:4145').lean())!.status).toBe('counted');
    expect((await Election.findById('coalport:4146').lean())!.status).toBe('nominations');
    expect(await OfficeTerm.countDocuments({ councilKey: 'coalport:4146' })).toBe(7);
    expect(await OfficeTerm.countDocuments({ councilKey: 'coalport:4145', completed: true })).toBe(7);
    expect(await OrderPaper.countDocuments({ cityId: 'coalport' })).toBe(2);
    const city = (await City.findById('coalport').lean())!;
    const expected = applyMoraleLoss(applyDrift(before, 'collective').shares, 'collective', 3).shares;
    expect(city.opinion).toEqual(expected);
    expect(city.moraleLog!.map((m) => m.day)).toEqual([D0 + 5]);
    expect(city.world!.settledDay).toBe(D0 + 5);
    // The character's own day was settled after its city's.
    const c = (await Character.findOne({ userId: user.id }).lean())!;
    expect(c.day.settled).toBe(D0 + 5);
    expect(await PaperEntry.countDocuments({ characterId: c._id, day: D0 + 5 })).toBe(1);
  });
});

describe('the worker down (ADR 0017 §3)', () => {
  it('twelve days with no job, then one request: every boundary in order, as if the job ran daily', async () => {
    cityDayHooks.seed = (cityId, cycle) => `seed-${cityId}-${cycle}`;
    await resetCity('coalport');
    await settleCityDay(content, 'coalport', at(D0));
    for (let d = D0 + 1; d <= D0 + 12; d++) await runCityDay(content, at(d, 0) + 60_000);
    const daily = await snapshot('coalport');

    await resetCity('coalport');
    await settleCityDay(content, 'coalport', at(D0));
    await settleCityDay(content, 'coalport', at(D0 + 12, 15));
    const caughtUp = await snapshot('coalport');
    expect(caughtUp).toEqual(daily);
    const city = (await City.findById('coalport').lean())!;
    expect(city.moraleLog!.map((m) => m.day)).toEqual(Array.from({ length: 12 }, (_, i) => D0 + 1 + i));
    // Counts on D0+5 and D0+10; divisions on D0+2, D0+7, D0+12 (the branch's motion each time).
    expect(await Election.countDocuments({ cityId: 'coalport', status: 'counted' })).toBe(2);
    expect(city.ordinance).toMatchObject({ id: 'ord.shift-hours', fromDay: D0 + 12, toDay: D0 + 17 });
    expect(city.ordinanceHistory!.map((h) => h.fromDay)).toEqual([D0 - 3, D0 + 2, D0 + 7, D0 + 12]);
    // Two unvoted counts: 70 − 3 − 3 plus the drift back.
    expect(moraleState(city.opinion.collective)).toBe('steady');
    expect(city.opinion.collective).toBeLessThan(65);
  });
});

describe('the degrade path (ADR 0017 §5)', () => {
  it('a throwing boundary: the request still answers; the next run completes the boundary', async () => {
    await resetCity('coalport');
    await settleCityDay(content, 'coalport', at(D0));
    const user = newUser();
    await seedRecruit(user, at(D0));
    let fail = true;
    cityDayHooks.beforeBoundary = () => {
      if (fail) throw new Error('boom');
    };
    const caller = callerFor(user, () => at(D0 + 1));
    const me = await caller.character.me();
    expect(me.day.key).toBe(D0 + 1);
    expect((await City.findById('coalport').lean())!.world!.settledDay).toBe(D0);
    fail = false;
    await runCityDay(content, at(D0 + 1));
    expect((await City.findById('coalport').lean())!.world!.settledDay).toBe(D0 + 1);
    expect(councilDay(D0 + 1, COALPORT.council!.offset).phase).toBe('nominations');
    expect(dayKey(at(D0 + 1))).toBe(D0 + 1);
  });
});

describe('turnout (ADR 0017, walk-through fix)', () => {
  it('a voter who has not acted in the last seven days still counts among the eligible', async () => {
    await resetCity('coalport');
    await settleCityDay(content, 'coalport', at(D0));
    const clock = { now: () => at(D0 + 3) };
    const p = await player(clock, { fxp: 400 });
    await p.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() });
    // Votes only from the paper: no action in the seven days before the count.
    await Character.updateOne({ _id: p.id }, { $set: { lastActionAt: new Date(at(D0 - 10)) } });
    await settleCityDay(content, 'coalport', at(D0 + 5));
    const counted = await Election.findOne({ cityId: 'coalport', status: 'counted' }).lean();
    expect(counted!.result!.turnout).toEqual({ voters: 1, eligible: 1 });
  });

  it('a quiet city counts with nobody eligible, and the paper reads "nil" rather than "0 of 0"', async () => {
    await resetCity('coalport');
    await settleCityDay(content, 'coalport', at(D0));
    await settleCityDay(content, 'coalport', at(D0 + 5));
    const counted = await Election.findOne({ cityId: 'coalport', status: 'counted' }).lean();
    expect(counted!.result!.turnout).toEqual({ voters: 0, eligible: 0 });
    expect(turnoutOf(0, 0)).toBe('nil');
    expect(turnoutOf(3, 4)).toBe('3 of 4');
    expect(copy.turnout(0, 0)).toBe('Turnout nil');
  });
});
