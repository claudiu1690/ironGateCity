import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Character, City, Encounter, PaperEntry, mongoose, nativeDb } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { RANK_FXP, cycleOf, dayKey, dayStart, healthMax } from '@irongate/rules';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { createAuth } from '../src/auth';
import type { DevActionResult, DevStatus } from '../src/dev/types';
import { streetHooks } from '../src/services/streetHooks';
import { appRouter } from '../src/trpc/router';
import { arriveOverHttp, resetCity, setupDb, teardownDb, testEnv } from './helpers';

/**
 * The dev time-skip panel (README "Reviewing with the dev panel"): its routes exist only with
 * E2E_TEST_HOOKS (memory mode), and they only move the shared test clock and run the existing city
 * day, settlement and character hook.
 */

const ORIGIN = 'http://localhost:5173';
const ACTIONS = [
  'hour',
  'day',
  'phase',
  'boost',
  'energy',
  'arrive',
  'monday',
  'level10',
  'irongate',
  'live',
  // Slice 5 (tech design §8.6).
  'heat',
  'health',
  'record',
  'runIn',
  'caught',
  'cells',
  'infirmary',
  'release',
  'decide',
  'level6',
  'rank3',
  'goto',
  'unbar',
] as const;
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

  it('the slice-4 hooks do not exist either', async () => {
    for (const url of ['/api/test/journey', '/api/test/character', '/api/test/clock', '/api/test/issues']) {
      const res = await app.inject({ method: 'POST', url, payload: { arriveNow: true } });
      expect(res.statusCode, url).toBe(404);
    }
  });

  it('nor the slice-5 hooks; the street hooks stay off', async () => {
    for (const url of ['/api/test/street', '/api/test/held', '/api/test/run-in']) {
      const res = await app.inject({
        method: 'POST',
        url,
        payload: { runIn: 'next', send: 'cells', decideNow: true },
      });
      expect(res.statusCode, url).toBe(404);
    }
    expect(streetHooks.enabled).toBe(false);
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

describe('dev panel, slice 4 (tech design §8.6–§8.7)', () => {
  let app: FastifyInstance;
  let cookie = '';
  const post = (url: string, payload: Record<string, unknown> = {}) =>
    app.inject({ method: 'POST', url, headers: { 'content-type': 'application/json', cookie }, payload });
  const status = () =>
    app
      .inject({ method: 'GET', url: '/api/test/dev/status', headers: { cookie } })
      .then((r) => r.json() as DevStatus);
  const ok = async (action: string, payload: Record<string, unknown> = {}) => {
    const res = await post(`/api/test/dev/${action}`, payload);
    expect(res.statusCode, res.body).toBe(200);
    return res.json() as DevActionResult;
  };
  const character = () => Character.findOne({ name: 'Slice Four' }).lean<CharacterDoc>();

  beforeAll(async () => {
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
        name: 'Slice Four',
        email: `four-${Date.now()}@example.test`,
        password: 'correct-horse-battery',
      },
    });
    cookie = cookieOf(signUp.headers['set-cookie']);
    await arriveOverHttp(app, cookie);
  });
  afterAll(async () => {
    await app.close();
  });

  it('Level 10 (and Rank 2); the status says where you are and where you live', async () => {
    const r = await ok('level10');
    expect(r.line).toBe('Level 10, Rank 2');
    const c = (await character())!;
    expect([c.level, c.rank]).toEqual([10, 2]);
    expect(r.status.where).toEqual({ cityId: 'coalport', cityName: 'Coalport' });
    expect(r.status.residence).toMatchObject({ cityName: 'Coalport', districtName: null });
    expect(r.status.issues.length).toBeGreaterThan(0);
  });

  it('on a train: the status counts the minutes; Arrive now (the e2e hook and the button)', async () => {
    const board = await post('/api/trpc/travel.board', { to: 'irongate', idempotencyKey: randomUUID() });
    expect(board.statusCode, board.body).toBe(200);
    expect((await status()).where).toEqual({
      train: { to: 'irongate', toName: 'Irongate', minutesLeft: 12 },
    });
    const hook = await post('/api/test/journey', { arriveNow: true });
    expect(hook.statusCode).toBe(200);
    const r = await ok('arrive').catch(() => null);
    // The hook already made it due; the button settles it (or finds it arrived).
    expect(r?.status.where ?? (await status()).where).toEqual({ cityId: 'irongate', cityName: 'Irongate' });
    expect((await post('/api/test/journey', { arriveNow: true })).statusCode).toBe(409);
    expect((await status()).capital).toHaveLength(5);
  });

  it('Live in… a district, then home; Take me to Irongate', async () => {
    const r = await ok('live', { target: 'irongate.eastside' });
    expect(r.line).toBe('Lives in Eastside');
    expect(r.status.residence).toMatchObject({ cityName: 'Irongate', districtName: 'Eastside' });
    expect((await post('/api/test/dev/live', { target: 'atlantis' })).statusCode).toBe(400);
    expect((await ok('live', { target: 'home' })).status.residence?.districtName).toBeNull();
    await Character.updateOne({ name: 'Slice Four' }, { $set: { cityId: 'coalport' } });
    expect((await ok('irongate')).status.where).toEqual({ cityId: 'irongate', cityName: 'Irongate' });
  });

  it('Next Monday: the clock to Monday 00:01, the Issues drawn; the e2e clock hook to Monday 09:00', async () => {
    const r = await ok('monday');
    expect(r.status.utc).toMatch(/^Monday \d+ Oct 00:01 UTC$/);
    expect(r.status.issues).toHaveLength(2);
    const c = await post('/api/test/clock', { advanceTo: { weekday: 'monday' } });
    expect(c.statusCode).toBe(200);
    const now = c.json().now as number;
    expect(new Date(now).getUTCDay()).toBe(1);
    expect(new Date(now).getUTCHours()).toBe(9);
    // The first Monday 09:00 after now: the same Monday, as the cycle-day hook does.
    expect(now - r.status.now).toBe(9 * 3_600_000 - 60_000);
  });

  it('the Issues hook: the live Issues of a city this week, set or cleared', async () => {
    const set = await post('/api/test/issues', {
      cityId: 'coalport',
      issueIds: ['issue.mill-strike', 'issue.harbour-rates'],
    });
    expect(set.statusCode, set.body).toBe(200);
    expect(set.json().live).toEqual(['issue.mill-strike', 'issue.harbour-rates']);
    const cleared = await post('/api/test/issues', { cityId: 'coalport', issueIds: [] });
    expect(cleared.json().live).toEqual([]);
    expect(
      (await post('/api/test/issues', { cityId: 'coalport', issueIds: ['issue.tram-fares'] })).statusCode,
    ).toBe(400);
    expect((await post('/api/test/issues', { cityId: 'clearwater', issueIds: [] })).statusCode).toBe(400);
  });

  it('the character hook: level, cityId, a residence with every window open', async () => {
    const res = await post('/api/test/character', {
      level: 12,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: 'irongate.old-town' },
      irongateSuccesses: 30,
    });
    expect(res.statusCode, res.body).toBe(200);
    const c = (await character())!;
    expect([c.level, c.cityId, c.journey]).toEqual([12, 'irongate', null]);
    expect(c.residence).toEqual({
      cityId: 'irongate',
      districtId: 'irongate.old-town',
      sinceDay: 0,
      votesFromDay: 0,
      standsFromDay: 0,
      canMoveFromDay: 0,
    });
    expect(c.localStanding.find((s) => s.cityId === 'irongate')?.successes).toBe(30);
    expect(
      (await post('/api/test/character', { residence: { cityId: 'irongate', districtId: null } })).statusCode,
    ).toBe(400);
  });
});

describe('dev panel, slice 5 (tech design §8.6)', () => {
  let app: FastifyInstance;
  let cookie = '';
  const content = getContent();
  const post = (url: string, payload: Record<string, unknown> = {}) =>
    app.inject({ method: 'POST', url, headers: { 'content-type': 'application/json', cookie }, payload });
  const status = () =>
    app
      .inject({ method: 'GET', url: '/api/test/dev/status', headers: { cookie } })
      .then((r) => r.json() as DevStatus);
  const ok = async (action: string, target?: string) => {
    const res = await post(`/api/test/dev/${action}`, target === undefined ? {} : { target });
    expect(res.statusCode, res.body).toBe(200);
    return res.json() as DevActionResult;
  };
  const refused = async (action: string, target?: string) =>
    (await post(`/api/test/dev/${action}`, target === undefined ? {} : { target })).statusCode;
  const character = () => Character.findOne({ name: 'Slice Five' }).lean<CharacterDoc>();
  const today = dayKey(BASE);

  beforeAll(async () => {
    await resetCity('coalport');
    const env = { ...testEnv(uri), E2E_TEST_HOOKS: true };
    app = await buildApp({
      env,
      auth: createAuth(env, nativeDb(), mongoose.connection.getClient()),
      content,
      now: () => BASE,
    });
    await app.ready();
    const signUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      payload: {
        name: 'Slice Five',
        email: `five-${Date.now()}@example.test`,
        password: 'correct-horse-battery',
      },
    });
    cookie = cookieOf(signUp.headers['set-cookie']);
    expect((await status()).risk).toBeNull(); // no character yet
    expect(await refused('heat', '30')).toBe(409);
    await arriveOverHttp(app, cookie);
  });
  afterAll(async () => {
    streetHooks.clear();
    await app.close();
  });

  it('the status: Heat, Health, the record, held, the run-in, flags, bars, the pressure, the rival homes', async () => {
    const s = await status();
    expect(s.character).toMatchObject({ name: 'Slice Five' });
    expect(s.risk).toEqual({
      level: 1,
      heat: { value: 0, state: 'cool', coolBy: null, coolByUtc: null },
      health: { value: 100, max: 100 },
      record: { level: 'clean', marks: 0, fadesOn: null, fadesOnUtc: null },
      held: null,
      runIn: null,
      flags: [],
      barred: [],
      pressure: { cityName: 'Coalport', homeFaction: 'Collective', rivalGround: false, lostToday: 0, cap: 2 },
      street: null,
      rivalHomes: expect.arrayContaining([
        { cityId: 'duskwall', cityName: 'Duskwall' },
        { cityId: 'ashford', cityName: 'Ashford' },
      ]),
      opponents: content.opponents.map((o) => ({ id: o.id, label: o.label })),
    });
    expect(s.risk!.rivalHomes).toHaveLength(2);
  });

  it('Heat 0 / 30 / 60 / 80: the value, the state and the cool-by time', async () => {
    for (const [v, state] of [
      [30, 'noticed'],
      [60, 'hot'],
      [80, 'wanted'],
      [0, 'cool'],
    ] as const) {
      const r = await ok('heat', String(v));
      expect(r.line).toBe(`Heat ${v} · ${state}`);
      expect(r.status.risk!.heat).toMatchObject({ value: v, state });
      if (v === 0) expect(r.status.risk!.heat.coolBy).toBeNull();
      else {
        expect(r.status.risk!.heat.coolBy).toBeGreaterThan(BASE);
        expect(r.status.risk!.heat.coolByUtc).toMatch(/ UTC$/);
      }
    }
    expect(await refused('heat', '101')).toBe(400);
    expect(await refused('heat', 'hot')).toBe(400);
  });

  it('Health full / half / 10', async () => {
    expect((await ok('health', '10')).status.risk!.health).toEqual({ value: 10, max: 100 });
    expect((await ok('health', 'half')).status.risk!.health).toEqual({ value: 50, max: 100 });
    const full = await ok('health', 'full');
    expect(full.line).toBe('Health 100 / 100');
    expect(full.status.risk!.health).toEqual({ value: 100, max: 100 });
    expect(await refused('health', 'lots')).toBe(400);
  });

  it('Record clean / 2 / 4 / 7 marks: the level, the count and the fade day', async () => {
    for (const [n, level] of [
      [2, 'onFile'],
      [4, 'repeat'],
      [7, 'notorious'],
    ] as const) {
      const r = await ok('record', String(n));
      expect(r.status.risk!.record).toEqual({
        level,
        marks: n,
        fadesOn: today + 14,
        fadesOnUtc: expect.stringMatching(/ 00:00 UTC$/),
      });
    }
    const clean = await ok('record', '0');
    expect(clean.line).toBe('Record clean');
    expect(clean.status.risk!.record).toMatchObject({ level: 'clean', marks: 0, fadesOn: null });
    expect((await character())!.record).toEqual({ marks: [], arrests: [] });
  });

  it('Next run-in: off, random, each of the six opponents; Next caught', async () => {
    const off = await ok('runIn', 'off');
    expect(off.line).toBe('Next act: no run-in');
    expect(off.status.risk!.street).toEqual({ runIn: 'never' });
    expect(content.opponents).toHaveLength(6);
    for (const o of content.opponents) {
      const r = await ok('runIn', o.id);
      expect(r.line).toBe(`Next act: a run-in with ${o.label}`);
      expect(r.status.risk!.street).toEqual({ runIn: 'next', opponentId: o.id });
    }
    const random = await ok('runIn', 'random');
    expect(random.status.risk!.street).toEqual({ runIn: 'next' });
    const caught = await ok('caught');
    expect(caught.line).toBe('Next act: caught');
    expect(caught.status.risk!.street).toEqual({ runIn: 'next', caught: 'always' });
    // *Next run-in* keeps the caught check.
    expect((await ok('runIn', 'off')).status.risk!.street).toEqual({ runIn: 'never', caught: 'always' });
    expect(await refused('runIn', 'the-butler')).toBe(400);
    streetHooks.clear();
    expect((await status()).risk!.street).toBeNull();
  });

  it('Level 6 and Rank 3 (once each)', async () => {
    const l = await ok('level6');
    expect(l.line).toBe('Level 6');
    expect(l.status.risk!.level).toBe(6);
    expect(l.status.risk!.health.max).toBe(healthMax(6));
    expect((await ok('level6')).line).toBe('Already Level 6');
    const r = await ok('rank3');
    expect(r.line).toBe(`Rank 3 (FXP ${RANK_FXP[2]})`);
    expect(r.status.character?.rank).toBe(3);
    expect((await character())!.fxp).toBe(RANK_FXP[2]);
    expect((await ok('rank3')).line).toBe('Already Rank 3');
  });

  it('Decide now (while a run-in is pending): luck decides on the settle', async () => {
    expect(await refused('decide')).toBe(409);
    await ok('energy');
    await post('/api/test/street', { runIn: 'next', opponentId: 'city-police', checkRoll: 1, choiceRoll: 1 });
    const start = await post('/api/trpc/mission.start', {
      locationId: 'coalport.far-bank',
      missionId: 'coalport.far-bank.posters',
      wayId: 'agi',
      idempotencyKey: randomUUID(),
    });
    expect(start.statusCode, start.body).toBe(200);
    const s = await status();
    expect(s.risk!.runIn).toMatchObject({
      state: 'pending',
      opponent: content.opponent('city-police')!.label,
      decidesAt: expect.any(Number),
      decidesAtUtc: expect.stringMatching(/ UTC$/),
    });
    expect(s.risk!.runIn!.decidesAt).toBeGreaterThan(BASE);
    const d = await ok('decide');
    expect(d.line).toBe('The run-in is decided by luck (the result modal waits)');
    expect(d.status.risk!.runIn).toMatchObject({ state: 'resolved', decidesAt: BASE });
    const enc = (await Encounter.findById((await character())!.runIn!.encounterId).lean())!;
    expect([enc.state, enc.by]).toEqual(['resolved', 'auto']);
    expect(await refused('decide')).toBe(409);
  });

  it('Cells now: held with the minutes and the bail; Release now; Infirmary now (no bail)', async () => {
    // Whatever the luck did, start free.
    if ((await character())!.held?.state === 'in') await ok('release');
    expect(await refused('release')).toBe(409);
    const cells = await ok('cells');
    expect(cells.line).toBe('Taken in: the cells');
    expect(cells.status.risk!.held).toMatchObject({
      kind: 'cells',
      state: 'in',
      placeName: expect.any(String),
    });
    expect(cells.status.risk!.held!.minutesLeft).toBeGreaterThan(0);
    expect(cells.status.risk!.held!.bail).toBeGreaterThan(0);
    expect(await refused('cells')).toBe(409);
    expect(await refused('goto', 'duskwall')).toBe(409);
    const rel = await ok('release');
    expect(rel.status.risk!.held).toMatchObject({ kind: 'cells', state: 'out', minutesLeft: 0 });
    const inf = await ok('infirmary');
    expect(inf.line).toBe('Taken to the infirmary');
    expect(inf.status.risk!.held).toMatchObject({ kind: 'infirmary', state: 'in', bail: null });
    expect(inf.status.risk!.health.value).toBeLessThan(inf.status.risk!.health.max);
    expect((await ok('release')).status.risk!.held).toMatchObject({ kind: 'infirmary', state: 'out' });
  });

  it('Take me to… a rival home (no ticket, no card): the rival pressure there, and the flags today', async () => {
    expect(await refused('goto', 'irongate')).toBe(400);
    expect(await refused('goto', 'coalport')).toBe(400);
    const r = await ok('goto', 'duskwall');
    expect(r.line).toBe('Now in Duskwall (rival ground)');
    expect(r.status.where).toEqual({ cityId: 'duskwall', cityName: 'Duskwall' });
    expect(r.status.risk!.pressure).toMatchObject({
      cityName: 'Duskwall',
      homeFaction: 'Vanguard',
      rivalGround: true,
      cap: 2,
    });
    expect((await character())!.journey).toBeNull();
    await Character.updateOne(
      { name: 'Slice Five' },
      {
        $set: {
          flags: [
            { cityId: 'duskwall', day: today, flag: 'watched' },
            { cityId: 'duskwall', day: today - 1, flag: 'warned' },
          ],
        },
      },
    );
    expect((await status()).risk!.flags).toEqual(['watched']);
  });

  it('Lift the bar: the barred cities listed, then cleared', async () => {
    const until = BASE + 3_600_000;
    await Character.updateOne(
      { name: 'Slice Five' },
      { $set: { barred: [{ cityId: 'ashford', until: new Date(until) }] } },
    );
    expect((await status()).risk!.barred).toEqual([
      { cityId: 'ashford', cityName: 'Ashford', until, untilUtc: 'Tuesday 29 Sep 10:00 UTC' },
    ]);
    const r = await ok('unbar');
    expect(r.line).toBe('The bar is lifted');
    expect(r.status.risk!.barred).toEqual([]);
    expect((await ok('unbar')).line).toBe('No bar to lift');
  });
});
