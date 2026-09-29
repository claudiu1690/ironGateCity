import { getContent } from '@irongate/content';
import { mongoose, nativeDb } from '@irongate/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { createAuth } from '../src/auth';
import { loadEnv } from '../src/env';
import { setupDb, teardownDb, testEnv } from './helpers';

let app: FastifyInstance;
const ORIGIN = 'http://localhost:5173';

beforeAll(async () => {
  const env = testEnv(await setupDb('http-test'));
  const auth = createAuth(env, nativeDb(), mongoose.connection.getClient());
  app = await buildApp({ env, auth, content: getContent() });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await teardownDb();
});

const cookieHeader = (setCookie: string | string[] | undefined) =>
  ([] as string[])
    .concat(setCookie ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');

describe('HTTP', () => {
  it('GET /healthz reports the database', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, db: 'up' });
    expect(typeof res.json().version).toBe('string');
  });

  it('sign up → session cookie → character.me', async () => {
    const email = `mara-${Date.now()}@example.test`;
    const signUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      payload: { name: 'Mara Lenk', email, password: 'correct-horse-battery' },
    });
    expect(signUp.statusCode).toBe(200);
    const setCookie = signUp.headers['set-cookie'];
    expect(String(setCookie)).toMatch(/session_token=/);
    expect(String(setCookie)).toMatch(/HttpOnly/i);
    expect(String(setCookie)).toMatch(/SameSite=Lax/i);

    const me = await app.inject({
      method: 'GET',
      url: '/api/trpc/character.me',
      headers: { cookie: cookieHeader(setCookie) },
    });
    expect(me.statusCode).toBe(200);
    const view = me.json().result.data;
    expect(view).toMatchObject({ name: 'Mara Lenk', factionId: 'collective', cityId: 'coalport' });

    const session = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie: cookieHeader(setCookie) },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().user.email).toBe(email);
  });

  it('a request without a session gets UNAUTHORIZED', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/trpc/character.me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.data.code).toBe('UNAUTHORIZED');
  });

  it('has no test clock unless E2E_TEST_HOOKS is on', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/test/clock', payload: { advanceMs: 1 } });
    expect(res.statusCode).toBe(404);
  });

  it('refuses E2E_TEST_HOOKS outside DB_MODE=memory', () => {
    const base = { BETTER_AUTH_SECRET: 'x'.repeat(40), PUBLIC_ORIGIN: ORIGIN, MONGODB_URI: 'mongodb://x' };
    expect(() => loadEnv({ ...base, E2E_TEST_HOOKS: '1' })).toThrow(/E2E_TEST_HOOKS/);
    expect(loadEnv({ ...base, DB_MODE: 'memory', E2E_TEST_HOOKS: '1' }).E2E_TEST_HOOKS).toBe(true);
    expect(loadEnv(base).E2E_TEST_HOOKS).toBe(false);
  });

  it('sign in with the wrong password is refused', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      payload: { email: 'nobody@example.test', password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('test clock (E2E_TEST_HOOKS)', () => {
  it('advances the server clock used by procedures', async () => {
    const env = { ...testEnv('mongodb://unused'), E2E_TEST_HOOKS: true };
    const auth = createAuth(env, nativeDb(), mongoose.connection.getClient());
    const hooked = await buildApp({ env, auth, content: getContent(), now: () => 1_000 });
    const res = await hooked.inject({
      method: 'POST',
      url: '/api/test/clock',
      payload: { advanceMs: 86_400_000 },
    });
    expect(res.json()).toEqual({ offsetMs: 86_400_000, now: 86_401_000 });
    const ping = await hooked.inject({ method: 'GET', url: '/api/trpc/health.ping' });
    expect(ping.json().result.data.now).toBe(86_401_000);
    const bad = await hooked.inject({
      method: 'POST',
      url: '/api/test/clock',
      payload: { advanceMs: 'soon' },
    });
    expect(bad.statusCode).toBe(400);
    await hooked.close();
  });
});
