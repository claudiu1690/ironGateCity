/**
 * QA (slices 0–1): security basics at the HTTP edge — CORS, the auth origin check, cookie
 * attributes, GET-mutations, the test clock guard and env validation (ADR 0001, tech design §7.8).
 */
import { randomUUID } from 'node:crypto';
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
const EVIL = 'https://evil.example';

const cookieHeader = (setCookie: string | string[] | undefined) =>
  ([] as string[])
    .concat(setCookie ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');

async function signUp(origin = ORIGIN) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: { 'content-type': 'application/json', origin },
    payload: {
      name: 'Mara Lenk',
      email: `qa-${randomUUID()}@example.test`,
      password: 'correct-horse-battery',
    },
  });
}

beforeAll(async () => {
  const env = testEnv(await setupDb('qa-http'));
  app = await buildApp({
    env,
    auth: createAuth(env, nativeDb(), mongoose.connection.getClient()),
    content: getContent(),
  });
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await teardownDb();
});

describe('HTTP security basics', () => {
  it('no CORS: a cross-origin preflight or read gets no Access-Control-Allow-Origin (same origin via the proxy, ADR 0001)', async () => {
    const pre = await app.inject({
      method: 'OPTIONS',
      url: '/api/trpc/action.perform',
      headers: { origin: EVIL, 'access-control-request-method': 'POST' },
    });
    expect(pre.headers['access-control-allow-origin']).toBeUndefined();
    const get = await app.inject({ method: 'GET', url: '/api/trpc/health.ping', headers: { origin: EVIL } });
    expect(get.headers['access-control-allow-origin']).toBeUndefined();
  });

  // Better Auth skips its origin (CSRF) check when NODE_ENV=test, so it is verified in Playwright
  // against the production build instead (apps/client/e2e/qa.spec.ts).
  it('non-JSON bodies (form posts, text/plain) are refused with 415 before reaching auth or tRPC', async () => {
    const form = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: EVIL },
      payload: 'name=A&email=a%40example.test&password=correct-horse-battery',
    });
    expect(form.statusCode).toBe(415);
    const text = await app.inject({
      method: 'POST',
      url: '/api/trpc/action.perform',
      headers: { 'content-type': 'text/plain', origin: EVIL },
      payload: '{}',
    });
    expect(text.statusCode).toBe(415);
  });

  it('the session cookie is HttpOnly, SameSite=Lax, host-only (no Domain), Path=/', async () => {
    const res = await signUp();
    expect(res.statusCode).toBe(200);
    const session = ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .find((c) => /session_token=/.test(c))!;
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(session).toMatch(/Path=\//i);
    expect(session).not.toMatch(/Domain=/i);
  });

  it('a session cookie opens only its own character; a forged cookie is UNAUTHORIZED', async () => {
    const res = await signUp();
    const forged = await app.inject({
      method: 'GET',
      url: '/api/trpc/character.me',
      headers: { cookie: 'better-auth.session_token=forged.value' },
    });
    expect(forged.statusCode).toBe(401);
    const me = await app.inject({
      method: 'GET',
      url: '/api/trpc/character.me',
      headers: { cookie: cookieHeader(res.headers['set-cookie']) },
    });
    expect(me.statusCode).toBe(200);
  });

  it('mutations cannot be sent as GET (tRPC refuses), even with a valid session', async () => {
    const res = await signUp();
    const input = encodeURIComponent(
      JSON.stringify({
        actionId: 'coalport.mill-gate.canvass',
        locationId: 'coalport.mill-gate',
        idempotencyKey: randomUUID(),
        times: 1,
      }),
    );
    const get = await app.inject({
      method: 'GET',
      url: `/api/trpc/action.perform?input=${input}`,
      headers: { cookie: cookieHeader(res.headers['set-cookie']) },
    });
    expect(get.statusCode).toBeGreaterThanOrEqual(400);
    const me = await app.inject({
      method: 'GET',
      url: '/api/trpc/character.me',
      headers: { cookie: cookieHeader(res.headers['set-cookie']) },
    });
    expect(me.json().result.data.energy.value).toBe(100);
  });

  it('the test clock route does not exist without E2E_TEST_HOOKS, whatever the method', async () => {
    for (const method of ['GET', 'POST', 'PUT'] as const) {
      const res = await app.inject({ method, url: '/api/test/clock', payload: { advanceMs: 86_400_000 } });
      expect(res.statusCode).toBe(404);
    }
  });
});

describe('env validation (apps/server/src/env.ts)', () => {
  const base = { BETTER_AUTH_SECRET: 'x'.repeat(40), PUBLIC_ORIGIN: ORIGIN, MONGODB_URI: 'mongodb://db' };

  it('refuses a short secret and uri mode without MONGODB_URI', () => {
    expect(() => loadEnv({ ...base, BETTER_AUTH_SECRET: 'short' })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => loadEnv({ BETTER_AUTH_SECRET: base.BETTER_AUTH_SECRET, PUBLIC_ORIGIN: ORIGIN })).toThrow(
      /MONGODB_URI/,
    );
  });

  // m5 (QA slices 0–1, "PUBLIC_ORIGIN accepts any URL"; fixed in fix round 1): z.url() took
  // `localhost:5173` (scheme "localhost"), `ftp://…` or an origin with a path, so a typo passed
  // start-up and auth failed later. PUBLIC_ORIGIN must now be an http(s) origin.
  it('m5: PUBLIC_ORIGIN must be an http(s) origin without a path', () => {
    for (const bad of ['localhost:5173', 'ftp://x.test', 'http://localhost:5173/app']) {
      expect(() => loadEnv({ ...base, PUBLIC_ORIGIN: bad }), bad).toThrow(/PUBLIC_ORIGIN/);
    }
  });

  it('E2E_TEST_HOOKS (test clock, rate limit off) is refused unless DB_MODE=memory, in every NODE_ENV', () => {
    for (const NODE_ENV of ['development', 'test', 'production']) {
      expect(() => loadEnv({ ...base, NODE_ENV, E2E_TEST_HOOKS: '1' })).toThrow(/E2E_TEST_HOOKS/);
      expect(() => loadEnv({ ...base, NODE_ENV, DB_MODE: 'uri', E2E_TEST_HOOKS: '1' })).toThrow(
        /E2E_TEST_HOOKS/,
      );
    }
    // Any value other than exactly "1" leaves the hooks off (no "true" / "yes" surprises).
    expect(() => loadEnv({ ...base, E2E_TEST_HOOKS: 'true' })).toThrow();
    expect(loadEnv({ ...base, E2E_TEST_HOOKS: '0' }).E2E_TEST_HOOKS).toBe(false);
  });
});
