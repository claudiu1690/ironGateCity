import { getContent } from '@irongate/content';
import { connectDb, disconnectDb, ensureIndexes, mongoose, seed } from '@irongate/db';
import { withDbName } from '@irongate/db/testing';
import { inject } from 'vitest';
import type { Env } from '../src/env';
import type { Context, SessionUser } from '../src/trpc/context';
import { createCaller } from '../src/trpc/router';

/** Connect to a fresh database for this test file, with indexes and the city seed in place. */
export async function setupDb(name: string): Promise<string> {
  const uri = withDbName(inject('mongoUri'), name);
  await connectDb(uri);
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
  await seed(getContent());
  return uri;
}

export async function teardownDb(): Promise<void> {
  await disconnectDb();
}

export function testEnv(uri: string): Env {
  return {
    NODE_ENV: 'test',
    PORT: 0,
    HOST: '127.0.0.1',
    DB_MODE: 'uri',
    MONGODB_URI: uri,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-000',
    PUBLIC_ORIGIN: 'http://localhost:5173',
    SENTRY_DSN: undefined,
    LOG_LEVEL: 'silent',
    E2E_TEST_HOOKS: false,
  };
}

/** A controllable server clock for lazy-timer tests. */
export function testClock(start = Date.UTC(2026, 8, 29, 9, 0, 0)) {
  let t = start;
  return {
    now: () => t,
    set: (ms: number) => {
      t = ms;
    },
    advance: (ms: number) => {
      t += ms;
    },
  };
}

let userCounter = 0;
export function newUser(name = 'Mara Lenk'): SessionUser {
  userCounter += 1;
  return { id: `user-${process.pid}-${Date.now()}-${userCounter}`, name };
}

export function callerFor(user: SessionUser | null, now: () => number = Date.now) {
  const ctx: Context = { user, content: getContent(), now };
  return createCaller(ctx);
}

/** `error.cause.toData()` of a refused call, with its tRPC code. */
export function gameData(err: unknown): { code: string; game: Record<string, unknown> | undefined } {
  const e = err as { code: string; cause?: { toData?: () => Record<string, unknown> } };
  return { code: e.code, game: e.cause?.toData?.() };
}

/** A fresh character (auto-created and settled) with its caller. */
export async function freshCharacter(clock = testClock(), name = 'Mara Lenk') {
  const user = newUser(name);
  const caller = callerFor(user, clock.now);
  const me = await caller.character.me();
  return { user, caller, me, clock };
}
