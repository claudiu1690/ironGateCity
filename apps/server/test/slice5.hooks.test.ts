import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Character, Encounter, Stay, mongoose, nativeDb } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { RANK_FXP, dayKey, healthMax } from '@irongate/rules';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { createAuth } from '../src/auth';
import { streetHooks } from '../src/services/streetHooks';
import { arriveOverHttp, resetCity, setupDb, teardownDb, testEnv } from './helpers';

/**
 * Slice 5 (tech design §8.5): the e2e risk hooks over HTTP. The character hook's Heat, Health,
 * marks, stats and Rank; `/api/test/street` forcing the caller's next act; `/api/test/held` sending
 * to the cells or the infirmary and releasing now; `/api/test/run-in` deciding now. Bodies are
 * validated (400), a caller without a character is refused (401 / 404), and the next read does the
 * rest (the release, the luck).
 */

const ORIGIN = 'http://localhost:5173';
/** Tuesday 13 October 2026, 09:00 UTC. */
const T0 = Date.UTC(2026, 9, 13, 9);
const POSTERS = { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi' };

let uri: string;
beforeAll(async () => {
  uri = await setupDb('slice5-hooks-test');
});
afterAll(async () => {
  await teardownDb();
});

const cookieOf = (setCookie: string | string[] | undefined) =>
  ([] as string[])
    .concat(setCookie ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');

describe('the risk hooks are absent without E2E_TEST_HOOKS', () => {
  it('404 on every route, and the street hooks stay off', async () => {
    const env = testEnv(uri);
    expect(env.E2E_TEST_HOOKS).toBe(false);
    const app = await buildApp({
      env,
      auth: createAuth(env, nativeDb(), mongoose.connection.getClient()),
      content: getContent(),
    });
    await app.ready();
    const bodies: Array<[string, Record<string, unknown>]> = [
      ['/api/test/street', { runIn: 'next' }],
      ['/api/test/held', { send: 'cells' }],
      ['/api/test/run-in', { decideNow: true }],
      ['/api/test/character', { heat: 80 }],
    ];
    for (const [url, payload] of bodies) {
      expect((await app.inject({ method: 'POST', url, payload })).statusCode, url).toBe(404);
    }
    expect(streetHooks.enabled).toBe(false);
    streetHooks.set('abc', { runIn: 'next' });
    expect(streetHooks.take('abc')).toBeNull();
    await app.close();
  });
});

describe('the risk hooks with E2E_TEST_HOOKS (memory mode)', () => {
  let app: FastifyInstance;
  let t = T0;
  let cookie = '';
  let stranger = '';
  const post = (url: string, payload: unknown, who = cookie) =>
    app.inject({
      method: 'POST',
      url,
      headers: { 'content-type': 'application/json', ...(who ? { cookie: who } : {}) },
      payload: payload as object,
    });
  const me = async () => {
    const res = await app.inject({ method: 'GET', url: '/api/trpc/character.me', headers: { cookie } });
    expect(res.statusCode, res.body).toBe(200);
    return res.json().result.data;
  };
  const doc = async () => (await Character.findOne({ name: 'Hook Tester' }).lean<CharacterDoc>())!;
  const signUp = async (name: string) => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      payload: {
        name,
        email: `${name.replace(/\s/g, '').toLowerCase()}-${Date.now()}@example.test`,
        password: 'correct-horse-battery',
      },
    });
    expect(res.statusCode).toBe(200);
    return cookieOf(res.headers['set-cookie']);
  };

  beforeAll(async () => {
    await resetCity('coalport');
    const env = { ...testEnv(uri), E2E_TEST_HOOKS: true };
    app = await buildApp({
      env,
      auth: createAuth(env, nativeDb(), mongoose.connection.getClient()),
      content: getContent(),
      now: () => t,
    });
    await app.ready();
    cookie = await signUp('Hook Tester');
    await arriveOverHttp(app, cookie);
    stranger = await signUp('No Arrival');
  });
  afterAll(async () => {
    streetHooks.clear();
    await app.close();
  });

  it('turns the street hooks on', () => {
    expect(streetHooks.enabled).toBe(true);
  });

  it('refuses a caller with no session (401) or no character (404)', async () => {
    for (const [url, payload] of [
      ['/api/test/street', { runIn: 'next' }],
      ['/api/test/held', { send: 'cells' }],
      ['/api/test/run-in', { decideNow: true }],
    ] as const) {
      expect((await post(url, payload, '')).statusCode, url).toBe(401);
      expect((await post(url, payload, stranger)).statusCode, url).toBe(404);
    }
  });

  it('the character hook: Heat, Health, marks, AGI, STR, CHA base, Rank at now', async () => {
    const res = await post('/api/test/character', {
      level: 6,
      energy: 100,
      iron: 1_000,
      heat: 60,
      health: 50,
      marks: [
        { kind: 'minor', daysAgo: 0 },
        { kind: 'moderate', daysAgo: 3 },
      ],
      agi: 7,
      str: 5,
      cha: 3,
      rank: 3,
    });
    expect(res.statusCode, res.body).toBe(200);
    const c = await doc();
    const today = dayKey(t);
    expect(c.heat).toEqual({ value: 60, at: new Date(t) });
    expect(c.health).toEqual({ damage: healthMax(6) - 50, at: new Date(t) });
    expect(c.record?.marks).toEqual([
      { day: today - 3, kind: 'moderate', logId: null },
      { day: today, kind: 'minor', logId: null },
    ]);
    expect(c.record?.arrests).toEqual([]);
    expect([c.stats.agi, c.stats.str, c.stats.chaBase]).toEqual([7, 5, 3]);
    expect([c.rank, c.fxp]).toEqual([3, RANK_FXP[2]]);
    const view = await me();
    expect(view.heat).toMatchObject({ value: 60, state: 'hot' });
    expect(view.health).toMatchObject({ value: 50, max: healthMax(6) });
    expect(view.record).toMatchObject({ level: 'onFile', marks: 2, fadesOn: today + 14 });
  });

  it('the character hook: Health is kept to the max; a clean record; bad bodies are 400', async () => {
    expect((await post('/api/test/character', { health: 999, marks: [] })).statusCode).toBe(200);
    const c = await doc();
    expect(c.health?.damage).toBe(0);
    expect(c.record?.marks).toEqual([]);
    for (const bad of [
      { heat: 101 },
      { heat: -1 },
      { heat: 2.5 },
      { marks: [{ kind: 'grave', daysAgo: 0 }] },
      { marks: [{ kind: 'minor', daysAgo: -1 }] },
      { rank: 0 },
      { rank: 8 },
      { agi: 'lots' },
    ]) {
      expect((await post('/api/test/character', bad)).statusCode, JSON.stringify(bad)).toBe(400);
    }
    expect((await doc()).heat?.value).toBe(60); // nothing written by a refusal
  });

  it('the street hook: validated, merged, and consumed by the next mission (a run-in with the enforcer)', async () => {
    for (const bad of [
      { runIn: 'always' },
      { opponentId: 'the-butler' },
      { checkRoll: 0 },
      { choiceRoll: 101 },
      { caught: 'sometimes' },
      { surprise: true },
    ]) {
      expect((await post('/api/test/street', bad)).statusCode, JSON.stringify(bad)).toBe(400);
    }
    const id = (await doc())._id.toHexString();
    const a = await post('/api/test/street', { runIn: 'next', opponentId: 'street-enforcer' });
    expect(a.statusCode, a.body).toBe(200);
    const b = await post('/api/test/street', { checkRoll: 1, choiceRoll: 1 });
    expect(b.json().force).toEqual({
      runIn: 'next',
      opponentId: 'street-enforcer',
      checkRoll: 1,
      choiceRoll: 1,
    });
    expect(streetHooks.peek(id)).toEqual(b.json().force);
    await post('/api/test/character', { heat: 0 });
    const start = await post('/api/trpc/mission.start', { ...POSTERS, idempotencyKey: randomUUID() });
    expect(start.statusCode, start.body).toBe(200);
    const pending = start.json().result.data;
    expect(pending.kind).toBe('runIn');
    expect(pending.opponent.id).toBe('street-enforcer');
    expect(streetHooks.peek(id)).toBeNull(); // consumed once
    expect((await doc()).runIn?.state).toBe('pending');
  });

  it('the run-in hook: decide now, and the next read resolves it by luck', async () => {
    expect((await post('/api/test/run-in', { decideNow: false })).statusCode).toBe(400);
    expect((await post('/api/test/run-in', {})).statusCode).toBe(400);
    t += 30_000;
    const res = await post('/api/test/run-in', { decideNow: true });
    expect(res.statusCode, res.body).toBe(200);
    const c = await doc();
    expect(new Date(c.runIn!.decideBy).getTime()).toBe(t);
    const enc = (await Encounter.findById(c.runIn!.encounterId).lean())!;
    expect(new Date(enc.decideBy).getTime()).toBe(t);
    expect(enc.state).toBe('pending'); // nothing resolved by the hook itself
    await me();
    const after = (await Encounter.findById(c.runIn!.encounterId).lean())!;
    expect([after.state, after.by]).toEqual(['resolved', 'auto']); // luck chose for them
    expect((await post('/api/test/run-in', { decideNow: true })).statusCode).toBe(409);
  });

  it('the held hook: the cells now (reason dev), then release now; the next read releases', async () => {
    // Close whatever the run-in left (its modal, or a stay it caused) so the character is free.
    const c0 = await doc();
    if (c0.held?.state === 'in')
      expect((await post('/api/test/held', { releaseNow: true })).statusCode).toBe(200);
    await me();
    for (const bad of [{}, { send: 'jail' }, { releaseNow: false }, { send: 'cells', releaseNow: true }]) {
      expect((await post('/api/test/held', bad)).statusCode, JSON.stringify(bad)).toBe(400);
    }
    expect((await post('/api/test/held', { releaseNow: true })).statusCode).toBe(409);
    t += 60_000;
    const res = await post('/api/test/held', { send: 'cells' });
    expect(res.statusCode, res.body).toBe(200);
    const c = await doc();
    expect(c.held).toMatchObject({ kind: 'cells', state: 'in', cityId: 'coalport' });
    expect(res.json().held.until).toBe(new Date(c.held!.until).getTime());
    expect(new Date(c.held!.until).getTime()).toBeGreaterThan(t);
    const stay = (await Stay.findById(c.held!.stayId).lean())!;
    expect(stay.reason).toBe('dev');
    expect((await post('/api/test/held', { send: 'infirmary' })).statusCode).toBe(409);

    t += 1_000;
    const rel = await post('/api/test/held', { releaseNow: true });
    expect(rel.statusCode, rel.body).toBe(200);
    expect(new Date((await doc()).held!.until).getTime()).toBe(t);
    expect((await doc()).held?.state).toBe('in'); // the hook only moves the time
    const view = await me();
    expect(view.held).toMatchObject({ kind: 'cells', state: 'out' });
  });

  it('the held hook: the infirmary of the city you are in, at the admission Health', async () => {
    t += 60_000;
    const res = await post('/api/test/held', { send: 'infirmary' });
    expect(res.statusCode, res.body).toBe(200);
    const c = await doc();
    expect(c.held).toMatchObject({ kind: 'infirmary', state: 'in', cityId: 'coalport', bail: null });
    const view = await me();
    expect(view.held).toMatchObject({ kind: 'infirmary', state: 'in' });
    expect(view.health.value).toBeLessThan(view.health.max);
  });
});
