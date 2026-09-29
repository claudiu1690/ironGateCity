import { getContent } from '@irongate/content';
import { mongoose, nativeDb } from '@irongate/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { createAuth } from '../src/auth';
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
