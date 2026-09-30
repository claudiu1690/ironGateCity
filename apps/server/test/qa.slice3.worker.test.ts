/**
 * QA, slice 3 (docs/qa/slice-3.md §2.10, §2.8, §2.9): two real Agenda workers at once settle each
 * boundary once; the admin boost is not reachable through the API; Ambition chapter 2's two
 * requirements (seven City Days and the first ballot) in the order the developer's test does not
 * cover, and the other Ambitions' silence after chapter 1.
 */
import { randomUUID } from 'node:crypto';
import { MongoBackend } from '@agendajs/mongo-backend';
import { getContent } from '@irongate/content';
import { City, Election, OfficeTerm, nativeDb } from '@irongate/db';
import { councilDay, councilKey, electionKey } from '@irongate/rules';
import { Agenda } from 'agenda';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CITY_DAY_JOB, scheduleCityDay } from '../src/jobs/cityDay';
import { settleCityDay } from '../src/services/cityDay';
import { appRouter } from '../src/trpc/router';
import { resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, key, nextCycleDay, player } from './politics.helpers';

const content = getContent();

beforeAll(async () => {
  await setupDb('qa-slice3-worker');
});
afterAll(teardownDb);

describe('QA 10 · the worker', () => {
  it('two workers started at once (two job documents raced, two start-up runs): every city settled once', async () => {
    const cities = ['coalport', 'duskwall', 'ashford'];
    for (const c of cities) await resetCity(c);
    const D = nextCycleDay('coalport', 0, 21000);
    for (const c of cities) await settleCityDay(content, c, at(D - 1));
    const now = () => at(D, 0) + 60_000; // 00:01 on Coalport's count day
    const agendas = [0, 1].map(
      () => new Agenda({ backend: new MongoBackend({ mongo: nativeDb() }), processEvery: '1 second' }),
    );
    try {
      await Promise.all(agendas.map((a) => a.start()));
      await Promise.all(agendas.map((a) => scheduleCityDay(a, content, () => {}, now)));
      const deadline = Date.now() + 20_000;
      for (;;) {
        const settled = await Promise.all(cities.map((c) => City.findById(c).lean()));
        const done = settled.every((c) => c?.world?.settledDay === D);
        const runs = await nativeDb()
          .collection('agendaJobs')
          .countDocuments({ name: CITY_DAY_JOB, lastFinishedAt: { $exists: true } });
        if (done && runs >= 2) break;
        if (Date.now() > deadline) throw new Error('the workers did not run the job within 20 s');
        await new Promise((r) => setTimeout(r, 200));
      }
    } finally {
      await Promise.all(agendas.map((a) => a.stop()));
    }
    // One recurring job document by name, however many workers scheduled it.
    const recurring = await nativeDb()
      .collection('agendaJobs')
      .countDocuments({ name: CITY_DAY_JOB, repeatInterval: { $exists: true, $ne: null } });
    // n-list: two workers starting at the same moment each upsert the recurring job (no unique
    // index on the name), so two may exist; harmless, since every run is idempotent.
    expect(recurring).toBeGreaterThanOrEqual(1);
    expect(recurring).toBeLessThanOrEqual(2);
    for (const c of cities) {
      const city = (await City.findById(c).lean())!;
      expect(city.moraleLog!.map((m) => m.day)).toEqual([D]);
      const cal = councilDay(D, content.city(c)!.council!.offset);
      expect(await OfficeTerm.countDocuments({ councilKey: councilKey(c, cal.cycle) })).toBe(7);
      expect(await Election.countDocuments({ _id: electionKey(c, cal.cycle) })).toBe(1);
    }
  });
});

describe('QA 11 · no admin surface in the API', () => {
  it('no procedure boosts, seeds or reports: the boost is an operator script only', () => {
    const paths = Object.keys(
      (appRouter as unknown as { _def: { procedures: Record<string, unknown> } })._def.procedures,
    );
    expect(paths.length).toBeGreaterThan(20);
    for (const p of paths) expect(p).not.toMatch(/boost|admin|seed|report|playtest|test/i);
  });
});

describe('QA 12 · Ambition chapter 2', () => {
  it('a first ballot before the seventh day does not open it early; the seventh day does', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 2, 21200);
    const clock = testClock(at(D));
    const p = await player(clock, { fxp: 400 });
    await p.caller.ambition.choose({ chapter: 1, choiceId: 'keep' });
    await p.caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: randomUUID() });
    await p.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() });
    clock.set(at(D + 6));
    expect(await p.caller.ambition.get()).toMatchObject({ chapter: 2, status: 'waiting' });
    expect((await p.caller.paper.today()).letters).toEqual([]);
    clock.set(at(D + 7));
    expect(await p.caller.ambition.get()).toMatchObject({ chapter: 2, status: 'ready' });
    expect((await p.caller.character.me()).lettersWaiting).toBe(1);
  });
});
