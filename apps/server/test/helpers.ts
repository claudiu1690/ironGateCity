import { getContent } from '@irongate/content';
import { Character, connectDb, disconnectDb, ensureIndexes, mongoose, seed } from '@irongate/db';
import { buildNewCharacter, dayKey, resolveOrigin } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { Types } from 'mongoose';
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
    TRUST_PROXY: 2,
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

/**
 * Slice-2 tech design §14: the reference recruit (the origin's reference answers, through the same
 * rules the join uses), inserted as if settled "yesterday", so the next touch settles today with the
 * rotation's orders and slice-1 numbers hold: Iron 0 and FXP 0 unless overridden (the origin's 150
 * Iron and 50 FXP are a slice-2 one-off), no first edition.
 */
export async function seedRecruit(
  user: SessionUser,
  now: number,
  overrides: { factionId?: FactionId; iron?: number; fxp?: number; avatarId?: string | null } = {},
) {
  const content = getContent();
  const factionId = overrides.factionId ?? 'collective';
  const faction = content.faction(factionId);
  const answers = content.origin.reference;
  const r = resolveOrigin({ origin: content.originSpec, answers, faction });
  if (!r.ok) throw new Error(r.reason);
  const doc = buildNewCharacter({
    userId: user.id,
    name: user.name,
    avatarId: overrides.avatarId === undefined ? 'avatar.woman-30s' : overrides.avatarId,
    factionId,
    homeCityId: faction.homeCityId,
    outcome: r.outcome,
    answers,
    now,
    uid: () => new Types.ObjectId().toHexString(),
  });
  const at = new Date(now);
  await Character.create({
    ...doc,
    iron: overrides.iron ?? 0,
    fxp: overrides.fxp ?? 0,
    energy: { value: doc.energy.value, updatedAt: at },
    origin: { ...doc.origin, arrivedAt: at },
    day: { settled: dayKey(now) - 1 },
    createdAt: at,
    updatedAt: at,
  });
}

/** A fresh reference recruit (seeded, then settled by `character.me`) with its caller. */
export async function freshCharacter(
  clock = testClock(),
  name = 'Mara Lenk',
  factionId: FactionId = 'collective',
) {
  const user = newUser(name);
  await seedRecruit(user, clock.now(), { factionId });
  const caller = callerFor(user, clock.now);
  const me = await caller.character.me();
  return { user, caller, me, clock };
}

/**
 * The real arrival through the procedures (slice-2 tech design §14): a face, six answers (the
 * reference answers unless given), then the faction. Returns the join's result.
 */
export async function arrive(
  caller: ReturnType<typeof callerFor>,
  opts: {
    factionId?: FactionId;
    answers?: Array<{ questionId: string; answerId: string }>;
    avatarId?: string;
  } = {},
) {
  await caller.arrival.start({ avatarId: opts.avatarId ?? 'avatar.woman-30s' });
  for (const a of opts.answers ?? getContent().origin.reference) await caller.arrival.answer(a);
  return caller.arrival.join({ factionId: opts.factionId ?? 'collective' });
}

/** The arrival over HTTP with a session cookie (tRPC POSTs), for the HTTP tests. */
export async function arriveOverHttp(
  app: {
    inject: (o: {
      method: 'POST';
      url: string;
      headers: Record<string, string>;
      payload: unknown;
    }) => Promise<{ statusCode: number; body: string }>;
  },
  cookie: string,
  factionId: FactionId = 'collective',
): Promise<void> {
  const post = async (path: string, payload: unknown) => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/trpc/${path}`,
      headers: { cookie, 'content-type': 'application/json' },
      payload,
    });
    if (res.statusCode !== 200) throw new Error(`${path}: ${res.statusCode} ${res.body}`);
  };
  await post('arrival.start', { avatarId: 'avatar.man-30s' });
  for (const a of getContent().origin.reference) await post('arrival.answer', a);
  await post('arrival.join', { factionId });
}
