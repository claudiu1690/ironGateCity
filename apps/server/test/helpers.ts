import { getContent } from '@irongate/content';
import {
  Award,
  Candidacy,
  Character,
  City,
  Contribution,
  District,
  Election,
  InfluenceLedger,
  IssueModel,
  OfficeTerm,
  OrderPaper,
  Vote,
  connectDb,
  disconnectDb,
  ensureIndexes,
  mongoose,
  seed,
} from '@irongate/db';
import { buildNewCharacter, dayKey, dayStart, resolveOrigin } from '@irongate/rules';
import type { ActionResult, FactionId } from '@irongate/rules';
import { Types } from 'mongoose';
import { withDbName } from '@irongate/db/testing';
import { inject } from 'vitest';
import type { Env } from '../src/env';
import type { Context, SessionUser } from '../src/trpc/context';
import { cityDayHooks } from '../src/services/cityDay';
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

type RouterCaller = ReturnType<typeof createCaller>;
type PerformInput = Parameters<RouterCaller['action']['perform']>[0];

/**
 * A caller for the tests. Slice 5: `action.perform` may answer a rival tap with a pending run-in
 * (`RunInPending`); every older test acts at home, where it never does, so `perform` is typed as the
 * slice 1–4 `ActionResult` and `performAny` keeps the procedure's full answer.
 */
export type TestCaller = Omit<RouterCaller, 'action'> & {
  action: {
    perform(input: PerformInput): Promise<ActionResult>;
    performAny(input: PerformInput): ReturnType<RouterCaller['action']['perform']>;
  };
};

export function callerFor(user: SessionUser | null, now: () => number = Date.now): TestCaller {
  const ctx: Context = { user, content: getContent(), now };
  const caller = createCaller(ctx);
  const perform = (input: PerformInput) => caller.action.perform(input);
  return new Proxy(caller, {
    get(target, prop, receiver) {
      if (prop === 'action') return { perform, performAny: perform };
      return Reflect.get(target, prop, receiver) as unknown;
    },
  }) as unknown as TestCaller;
}

/** `error.cause.toData()` of a refused call, with its tRPC code. */
export function gameData(err: unknown): { code: string; game: Record<string, unknown> | undefined } {
  const e = err as { code: string; cause?: { toData?: () => Record<string, unknown> } };
  return { code: e.code, game: e.cause?.toData?.() };
}

/**
 * Slice 3: tests in one file share a database but not a clock, so a test dated before the last
 * one would see a city whose day (ADR 0017) is already settled in its future: an election counted,
 * morale drifted. Time never runs back in the game; here the city's political state is reset when
 * it is ahead of `now`, so every test starts from a city bootstrapped at its own date.
 */
export async function rewindCityIfAhead(cityId: string, now: number): Promise<void> {
  const city = await City.findById(cityId).lean();
  if (!city?.world || city.world.settledDay <= dayKey(now)) return;
  await resetCity(cityId);
}

/**
 * Slice 4: the capital joins every city-day run (runCityDay). Test files jump hundreds of days
 * between tests, and a capital settled far behind would catch up boundary by boundary (each a
 * transaction), so a capital ahead of `now` or more than 30 days behind it starts again.
 */
export async function keepCapitalNear(now: number, cityId = 'irongate'): Promise<void> {
  const city = await City.findById(cityId).lean();
  const today = dayKey(now);
  if (!city?.world) return;
  if (city.world.settledDay > today || city.world.settledDay < today - 30) await resetCity(cityId);
}

/** A city with no political state: the baseline meter, no world (the next touch bootstraps it). */
export async function resetCity(cityId: string): Promise<void> {
  // Slice 4: a capital district's elections are "irongate.eastside:4146".
  const prefix = new RegExp(`^${cityId}[.:]`);
  await Promise.all([
    Election.deleteMany({ cityId }),
    Candidacy.deleteMany({ cityId }),
    Vote.deleteMany({ electionId: prefix }),
    OfficeTerm.deleteMany({ cityId }),
    OrderPaper.deleteMany({ cityId }),
    // Slice 4: the Issues, the ledger, the totals, the awards and the capital's districts.
    IssueModel.deleteMany({ cityId }),
    InfluenceLedger.deleteMany({ cityId }),
    Contribution.deleteMany({ cityId }),
    Award.deleteMany({ cityId }),
    District.deleteMany({ cityId }),
  ]);
  const districted = getContent().isDistricted(cityId);
  await City.updateOne(
    { _id: cityId },
    {
      ...(districted ? {} : { $set: { opinion: getContent().city(cityId)!.baselineOpinion } }),
      $unset: {
        world: 1,
        morale: 1,
        moraleLog: 1,
        council: 1,
        ordinance: 1,
        ordinanceHistory: 1,
        issues: 1,
        ...(districted ? { opinion: 1 } : {}),
      },
    },
  );
}

/**
 * Slice 3: bootstrapping a home city puts the branch's motion in force, and every council passes it
 * by default (ADR 0017; Coalport: the Long Service Order, review 1). Slice-1/2 tests that pin wage and
 * training numbers call this: the ordinance in force is cleared and, for the rest of the file, the
 * city's order papers carry no branch's motion, so the numbers stay those with no ordinance.
 */
export async function noOrdinance(cityId: string): Promise<void> {
  (cityDayHooks.noBranchMotion ??= new Set()).add(cityId);
  await City.updateOne({ _id: cityId }, { $set: { ordinance: null, ordinanceHistory: [] } });
}

/**
 * Slice-2 tech design §14: the reference recruit (the origin's reference answers, through the same
 * rules the join uses), inserted as if settled "yesterday", so the next touch settles today with the
 * rotation's orders and slice-1 numbers hold: Iron 0 and FXP 0 unless overridden (the origin's 150
 * Iron and 50 FXP are a slice-2 one-off), no first edition.
 *
 * Review 1: a character settled yesterday arrived yesterday, so by default the recruit arrived at
 * noon on the day before `now` (not on its welcome day: no welcome set, no *First day* row, GDD
 * §8.4, §13.7). Pass `arrivedAt: now` for a recruit on its welcome day.
 */
export async function seedRecruit(
  user: SessionUser,
  now: number,
  overrides: {
    factionId?: FactionId;
    iron?: number;
    fxp?: number;
    avatarId?: string | null;
    arrivedAt?: number;
    stats?: Partial<{ str: number; int: number; agi: number }>;
  } = {},
) {
  const content = getContent();
  const factionId = overrides.factionId ?? 'collective';
  const faction = content.faction(factionId);
  await rewindCityIfAhead(faction.homeCityId, now);
  await keepCapitalNear(now);
  const answers = originAnswers(factionId);
  const r = resolveOrigin({ origin: content.originSpec, answers, factions: content.factions });
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
  const arrived = new Date(overrides.arrivedAt ?? dayStart(dayKey(now) - 1) + 12 * 3_600_000);
  await Character.create({
    ...doc,
    stats: { ...doc.stats, ...overrides.stats },
    iron: overrides.iron ?? 0,
    fxp: overrides.fxp ?? 0,
    energy: { value: doc.energy.value, updatedAt: at },
    origin: { ...doc.origin, arrivedAt: arrived },
    day: { settled: dayKey(now) - 1 },
    createdAt: arrived,
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

/** The platform's row for each party (review 4, ADR 0073: whom you help is your party). */
export const HELPS: Record<FactionId, string> = { vanguard: 'stahl', collective: 'holm', alliance: 'grey' };

/**
 * Review 4 (GDD §8.5): the reference recruit and the tuning characters. Beat 1 helps the party's
 * secretary; the kitbag is *books*, *tools* for the Vanguard; the post the unit's list. Collective
 * 8 / 12 / 5, Vanguard 14 / 6 / 5, Alliance 6 / 14 / 5, all CHA 5 (his coat).
 */
export function originAnswers(factionId: FactionId = 'collective'): Array<{ questionId: string; answerId: string }> {
  return getContent().origin.reference.map((a) =>
    a.questionId === 'origin.platform'
      ? { ...a, answerId: HELPS[factionId] }
      : a.questionId === 'origin.suitcase' && factionId === 'vanguard'
        ? { ...a, answerId: 'tools' }
        : { ...a },
  );
}

/**
 * The real arrival through the procedures (slice-2 tech design §14; review 4): a face, the three
 * answers (the reference answers, beat 1 helping `factionId`'s secretary, unless given), then the
 * join. Returns the join's result.
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
  for (const a of opts.answers ?? originAnswers(opts.factionId)) await caller.arrival.answer(a);
  return caller.arrival.join({});
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
  for (const a of originAnswers(factionId)) await post('arrival.answer', a);
  await post('arrival.join', {});
}

/**
 * Slice 4: slice 1–3 tests that pin opinion, reward and ticket numbers in the home cities predate
 * the Issues of the Week (+50 % opinion when tagged, an effect for the week). For the rest of the
 * file the cities draw none, and any already drawn are cleared.
 */
export async function noIssues(...cityIds: string[]): Promise<void> {
  const ids = cityIds.length > 0 ? cityIds : ['coalport', 'duskwall', 'ashford'];
  for (const id of ids) (cityDayHooks.noIssues ??= new Set()).add(id);
  await IssueModel.deleteMany({ cityId: { $in: ids } });
  await City.updateMany(
    { _id: { $in: ids }, issues: { $exists: true } },
    { $set: { 'issues.live': [], 'issues.effects': [] } },
  );
}
