import { getContent } from '@irongate/content';
import { Character, City, PaperEntry, mongoose, nativeDb } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { cycleOf, dayKey, dayStart } from '@irongate/rules';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { createAuth } from '../src/auth';
import type { DevActionResult, DevStatus } from '../src/dev/types';
import { appRouter } from '../src/trpc/router';
import { arriveOverHttp, resetCity, setupDb, teardownDb, testEnv } from './helpers';

/**
 * The dev time-skip panel (README "Reviewing with the dev panel"): its routes exist only with
 * E2E_TEST_HOOKS (memory mode), and they only move the shared test clock and run the existing city
 * day, settlement and character hook.
 */

const ORIGIN = 'http://localhost:5173';
const ACTIONS = ['hour', 'day', 'phase', 'boost', 'energy'] as const;
/** Tuesday 29 September 2026, 09:00 UTC: Coalport cycle day 3 (the polls, day 2 of 3). */
const BASE = Date.UTC(2026, 8, 29, 9);

let uri: string;
beforeAll(async () => {
  uri = await setupDb('dev-panel-test');
});
afterAll(async () => {
  await teardownDb();
});

const cookieOf = (setCookie: string | string[] | undefined) =>
  ([] as string[])
    .concat(setCookie ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');

describe('dev panel refused when the test hooks are off', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    const env = testEnv(uri);
    expect(env.E2E_TEST_HOOKS).toBe(false);
    app = await buildApp({
      env,
      auth: createAuth(env, nativeDb(), mongoose.connection.getClient()),
      content: getContent(),
    });
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it('the status route does not exist, whatever the method', async () => {
    for (const method of ['GET', 'POST'] as const) {
      const res = await app.inject({ method, url: '/api/test/dev/status' });
      expect(res.statusCode, method).toBe(404);
    }
  });

  it('no dev action exists, and none moves the clock', async () => {
    const before = (await app.inject({ method: 'GET', url: '/api/trpc/health.ping' })).json().result.data.now;
    for (const action of ACTIONS) {
      const res = await app.inject({ method: 'POST', url: `/api/test/dev/${action}`, payload: {} });
      expect(res.statusCode, action).toBe(404);
    }
    const after = (await app.inject({ method: 'GET', url: '/api/trpc/health.ping' })).json().result.data.now;
    // The real clock only: nowhere near a day on.
    expect(after - before).toBeLessThan(60_000);
  });

  it('nothing dev-only is in the tRPC router', () => {
    const names = Object.keys(appRouter._def.procedures);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => /^(dev|test)\./.test(n))).toEqual([]);
  });
});

describe('dev panel with the test hooks on', () => {
  let app: FastifyInstance;
  let cookie = '';
  const get = () =>
    app.inject({ method: 'GET', url: '/api/test/dev/status', headers: { cookie } }).then((r) => {
      expect(r.statusCode).toBe(200);
      return r.json() as DevStatus;
    });
  const act = async (action: string, withCookie = true) =>
    app.inject({
      method: 'POST',
      url: `/api/test/dev/${action}`,
      headers: { 'content-type': 'application/json', ...(withCookie ? { cookie } : {}) },
      payload: {},
    });
  const ok = async (action: string) => {
    const res = await act(action);
    expect(res.statusCode, res.body).toBe(200);
    return res.json() as DevActionResult;
  };
  const character = () => Character.findOne({ name: 'Dev Tester' }).lean<CharacterDoc>();

  beforeAll(async () => {
    await resetCity('coalport');
    const env = { ...testEnv(uri), E2E_TEST_HOOKS: true };
    app = await buildApp({
      env,
      auth: createAuth(env, nativeDb(), mongoose.connection.getClient()),
      content: getContent(),
      now: () => BASE,
    });
    await app.ready();
    const signUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      payload: {
        name: 'Dev Tester',
        email: `dev-${Date.now()}@example.test`,
        password: 'correct-horse-battery',
      },
    });
    expect(signUp.statusCode).toBe(200);
    cookie = cookieOf(signUp.headers['set-cookie']);
  });
  afterAll(async () => {
    await app.close();
  });

  it('status before the arrival: the clock, no character; character actions refused', async () => {
    const s = await get();
    expect(s).toMatchObject({
      hooks: true,
      now: BASE,
      utc: 'Tuesday 29 Sep 09:00 UTC',
      offsetMs: 0,
      cityDay: dayKey(BASE),
      character: null,
      home: null,
    });
    for (const action of ['phase', 'boost', 'energy'])
      expect((await act(action)).statusCode, action).toBe(409);
    for (const action of ['phase', 'boost', 'energy']) {
      expect((await act(action, false)).statusCode, action).toBe(401);
    }
    expect((await act('rewind')).statusCode).toBe(404);
    expect((await get()).now).toBe(BASE); // nothing moved
    await arriveOverHttp(app, cookie);
  });

  it('status after the arrival: the home city phase, next phase, morale, ordinance', async () => {
    const s = await get();
    expect(s.character).toMatchObject({ name: 'Dev Tester', energyMax: 100 });
    expect(s.home).toMatchObject({
      cityId: 'coalport',
      cityName: 'Coalport',
      council: {
        cycleDay: 3,
        phase: 'polls',
        phaseLabel: 'Polls open (day 2 of 3)',
        next: { phase: 'count', at: Date.UTC(2026, 9, 1), atUtc: 'Thursday 1 Oct 00:00 UTC' },
      },
    });
    expect(s.home?.morale?.word).toMatch(/^(Fired up|Steady|Unrest)$/);
    // Bootstrapped today: the branch's motion is in force (ADR 0017).
    expect(s.home?.ordinance?.name).toBeTruthy();
  });

  it('Boost me: Rank 3, Known at home, 30 PC, full Energy; never the playtest mark; idempotent', async () => {
    const r = await ok('boost');
    expect(r.line).toMatch(
      /^Boosted: .*Rank 1 → 3.*One of Us in Coalport.*Political Capital \d+ → 30.* · Energy 100$/,
    );
    const c = (await character())!;
    expect(c.fxp).toBeGreaterThanOrEqual(2000);
    expect(c.rank).toBeGreaterThanOrEqual(3);
    expect(c.localStanding.find((s) => s.cityId === 'coalport')?.successes).toBeGreaterThanOrEqual(30);
    expect(c.pc).toBeGreaterThanOrEqual(30);
    expect(c.energy.value).toBe(100);
    expect(c.playtest).toBeUndefined();
    expect(r.status.character).toMatchObject({ rank: c.rank, pc: c.pc, energy: 100 });
    expect((await ok('boost')).line).toBe('Already boosted · Energy 100');
  });

  it('Refill Energy', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/test/character',
      headers: { cookie },
      payload: { energy: 7 },
    });
    expect((await get()).character?.energy).toBe(7);
    const r = await ok('energy');
    expect(r.line).toBe('Energy 100 / 100');
    expect(r.status.character?.energy).toBe(100);
  });

  it('Skip to next phase: the polls → the count (00:01, counted, settled, paper in)', async () => {
    const r = await ok('phase');
    const countDay = dayKey(Date.UTC(2026, 9, 1));
    expect(r.status.now).toBe(Date.UTC(2026, 9, 1, 0, 1));
    expect(r.status.cityDay).toBe(countDay);
    expect(r.status.home?.council).toMatchObject({
      cycleDay: 0,
      phase: 'count-day',
      next: { phase: 'polls' },
    });
    expect(r.line).toMatch(
      /^Now Thursday 1 Oct 00:01 UTC · the count is in · nominations open in Coalport · 2 days on/,
    );
    const city = await City.findById('coalport').lean();
    expect(city?.world?.settledDay).toBe(countDay);
    const c = (await character())!;
    expect(c.day.settled).toBe(countDay);
    expect(await PaperEntry.countDocuments({ characterId: c._id, day: countDay })).toBe(1);
  });

  it('Skip to next phase again: nominations → the polls', async () => {
    const r = await ok('phase');
    const pollsDay = dayKey(Date.UTC(2026, 9, 3));
    expect(cycleOf(pollsDay, 2).cycleDay).toBe(2);
    expect(r.status.now).toBe(dayStart(pollsDay) + 60_000);
    expect(r.status.home?.council).toMatchObject({ cycleDay: 2, phase: 'polls', next: { phase: 'count' } });
    expect(r.line).toMatch(/^Now Saturday 3 Oct 00:01 UTC · polls open in Coalport · 2 days on/);
  });

  it('Next day: just past the next 00:00 UTC, the paper settled; +1 hour: an hour', async () => {
    const r = await ok('day');
    expect(r.status.now).toBe(Date.UTC(2026, 9, 4, 0, 1));
    expect(r.line).toMatch(/^Now Sunday 4 Oct 00:01 UTC · polls open \(day 2 of 3\) in Coalport/);
    const c = (await character())!;
    expect(await PaperEntry.countDocuments({ characterId: c._id, day: r.status.cityDay })).toBe(1);
    const h = await ok('hour');
    expect(h.status.now).toBe(Date.UTC(2026, 9, 4, 1, 1));
    expect(h.line).toBe('Now Sunday 4 Oct 01:01 UTC');
    expect(h.status.offsetMs).toBe(h.status.now - BASE);
  });

  it('the clock is the one every procedure reads', async () => {
    const ping = await app.inject({ method: 'GET', url: '/api/trpc/health.ping' });
    expect(ping.json().result.data.now).toBe(Date.UTC(2026, 9, 4, 1, 1));
  });
});
