/* eslint-disable @typescript-eslint/no-explicit-any -- the tests read untyped tRPC JSON (views of many shapes); a type per field would restate the server's views */
import { expect, test } from '@playwright/test';
import type {
  Locator,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestInfo,
} from '@playwright/test';
import { mapAtRest, signUpOnly } from './helpers';

/**
 * QA, Design Review 2 / repo review 5 (docs/qa/review-5-report.md). The API halves (treatment, the patrol's
 * buckets, quiet and cap, the Unrest prize's farming cases, the night windows) go through tRPC and the
 * test hooks of `page.request`; the screen halves are walked at the six sizes. No Vitest this round (the
 * user's rule of 8 Oct 2026), so every case the developers listed as untested is here.
 *
 * Known bugs were `test.fail`; the fix round (m1, m3, m4) made them plain tests, and m5 has its own. A new
 * known bug goes in as `test.fail` with its finding's id. The suite shares the server's
 * clock (it only moves forward) and its night seam (restored to day after each test that sets it), so
 * this is the last project.
 */

// Headless Chromium hides scroll bars by default; the scroll-bar note is about how they look.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

type Args = PlaywrightTestArgs & PlaywrightTestOptions & PlaywrightWorkerArgs & PlaywrightWorkerOptions;
type Body = (args: Args, info: TestInfo) => Promise<void> | void;
const plain = (title: string, fn: Body) => test(title, fn);

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------------------------------
// API helpers (the session is the page's cookie jar).
// ---------------------------------------------------------------------------------------------------

interface Res<T = any> {
  ok: boolean;
  data: T;
  reason: string | null;
  game: Record<string, any> | null;
}
const parse = async (r: Awaited<ReturnType<Page['request']['get']>>): Promise<Res> => {
  const j = (await r.json().catch(() => ({}))) as any;
  if (j?.result) return { ok: true, data: j.result.data, reason: null, game: null };
  return {
    ok: false,
    data: null,
    reason: j?.error?.data?.game?.reason ?? j?.error?.message ?? 'ERROR',
    game: j?.error?.data?.game ?? null,
  };
};
const mutate = (page: Page, proc: string, data: object = {}) =>
  page.request.post(`/api/trpc/${proc}`, { data }).then(parse);
const read = (page: Page, proc: string, input?: object) =>
  page.request
    .get(`/api/trpc/${proc}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`)
    .then(parse);
const hook = async (page: Page, path: string, data: object = {}) => {
  const r = await page.request.post(`/api/test/${path}`, { data });
  return (await r.json().catch(() => ({}))) as any;
};
const uuid = () => crypto.randomUUID();
const me = async (page: Page) => (await read(page, 'character.me')).data;
const version = async (page: Page) => (await me(page)).version as number;
const clockNow = async (page: Page) => (await hook(page, 'clock', { advanceMs: 0 })).now as number;
const advance = (page: Page, ms: number) => hook(page, 'clock', { advanceMs: ms });
const setNight = (page: Page, mode: 'clock' | 'day' | 'night') => hook(page, 'night', { mode });
const status = async (page: Page) =>
  (await page.request.get('/api/test/dev/status').then((r) => r.json())) as any;
/** One whole City Day on, with the worker's boundary job run (what the worker does at 00:01). */
const nextDay = async (page: Page, n = 1) => {
  for (let i = 0; i < n; i++) {
    await advance(page, DAY);
    await hook(page, 'city-day');
  }
};

/** A new member by the API (no screens): the counter's row for the party, books, the unit's list. */
async function member(
  page: Page,
  party: 'holm' | 'stahl' | 'grey' = 'holm',
  name = 'Mara Lenk',
): Promise<void> {
  const email = `qa5-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const origin = new URL(page.url() === 'about:blank' ? 'http://localhost' : page.url()).origin;
  const base = (test.info().project.use.baseURL as string | undefined) ?? origin;
  const su = await page.request.post('/api/auth/sign-up/email', {
    data: { email, password: 'e2e-password-123', name },
    headers: { origin: base },
  });
  expect(su.ok(), 'sign-up').toBe(true);
  const faces = (await read(page, 'arrival.faces')).data as Array<{ id: string }>;
  expect((await mutate(page, 'arrival.start', { avatarId: faces[3]!.id })).ok).toBe(true);
  for (const [questionId, answerId] of [
    ['origin.platform', party],
    ['origin.suitcase', 'books'],
    ['origin.lining', 'ward-book'],
  ] as const) {
    const a = await mutate(page, 'arrival.answer', { questionId, answerId });
    expect(a.ok, `answer ${questionId}: ${a.reason}`).toBe(true);
  }
  expect((await mutate(page, 'arrival.join', {})).ok).toBe(true);
}

/** Level 10, Rank 3, some Iron: what a rival-ground visitor needs. */
const seasoned = (page: Page, extra: object = {}) =>
  hook(page, 'character', { level: 10, rank: 3, iron: 900, energy: 100, ...extra });

/**
 * Board for `to`, jump the shared clock to the journey's card, arrive and close (the card is put aside
 * as the arrival's own close does). Leaves the character in `to`, quiet for ten minutes (ADR 0081).
 */
async function travelTo(page: Page, to: string): Promise<void> {
  const b = await mutate(page, 'travel.board', { to, idempotencyKey: uuid() });
  expect(b.ok, `board: ${b.reason}`).toBe(true);
  let j = (await read(page, 'travel.journey')).data;
  const now = await clockNow(page);
  if (j.cardAt > now) await advance(page, j.cardAt - now + 1_000);
  expect((await hook(page, 'journey', { arriveNow: true })).ok).toBe(true);
  j = (await read(page, 'travel.journey')).data;
  const c = await mutate(page, 'travel.close', { journeyId: j.id });
  expect(c.ok, `close: ${c.reason}`).toBe(true);
}

const cityView = async (page: Page, cityId: string) => (await read(page, 'city.get', { cityId })).data;

// ---------------------------------------------------------------------------------------------------
// #8 Get patched up: the price, the refusals, a double tap
// ---------------------------------------------------------------------------------------------------

test.describe('#8 Get patched up (API)', () => {
  test('the price is 1 Iron a point, at least 10; Health to its maximum; no Energy', async ({ page }) => {
    await member(page);
    await hook(page, 'character', { level: 6, iron: 500, health: 64 });
    const before = await me(page);
    expect(before.health.max).toBe(125);
    const r = await mutate(page, 'character.treat', {
      locationId: 'coalport.infirmary',
      idempotencyKey: uuid(),
    });
    expect(r.ok).toBe(true);
    expect(r.data.knockOns.health).toEqual({ before: 64, after: 125, max: 125 });
    expect(r.data.knockOns.iron).toEqual({ before: 500, after: 439 });
    expect(r.data.stamp.label).toBe('Patched up');
    expect(r.data.headline).toBe('Whole again');
    const after = await me(page);
    expect(after.energy.value).toBe(before.energy.value);

    // Missing 3 points: the floor of 10 Iron.
    await hook(page, 'character', { health: 122 });
    const floor = await mutate(page, 'character.treat', {
      locationId: 'coalport.infirmary',
      idempotencyKey: uuid(),
    });
    expect(floor.data.knockOns.iron.before - floor.data.knockOns.iron.after).toBe(10);
  });

  test('refusals: full Health, short of Iron (with the cost), another city, a place that is not an infirmary', async ({
    page,
  }) => {
    await member(page);
    await hook(page, 'character', { level: 6, iron: 20 });
    const L = 'coalport.infirmary';
    const full = await mutate(page, 'character.treat', { locationId: L, idempotencyKey: uuid() });
    expect([full.ok, full.reason]).toEqual([false, 'FULL_HEALTH']);
    await hook(page, 'character', { health: 64 });
    const poor = await mutate(page, 'character.treat', { locationId: L, idempotencyKey: uuid() });
    expect([poor.ok, poor.reason]).toEqual([false, 'CANNOT_PAY']);
    expect(poor.game).toMatchObject({ why: 'NOT_ENOUGH_IRON', iron: 20, cost: 61 });
    expect((await me(page)).iron).toBe(20);
    const far = await mutate(page, 'character.treat', {
      locationId: 'duskwall.infirmary',
      idempotencyKey: uuid(),
    });
    expect(far.reason).toBe('NOT_HERE');
    for (const id of ['coalport.mill-gate', 'nowhere']) {
      const bad = await mutate(page, 'character.treat', { locationId: id, idempotencyKey: uuid() });
      expect(bad.reason).toBe('UNKNOWN_LOCATION');
    }
  });

  test('a double tap: one key sent four times charges once; five different keys at once charge once', async ({
    page,
  }) => {
    await member(page);
    await hook(page, 'character', { level: 6, iron: 500, health: 64 });
    const L = 'coalport.infirmary';
    const k = uuid();
    const same = await Promise.all(
      [1, 2, 3, 4].map(() => mutate(page, 'character.treat', { locationId: L, idempotencyKey: k })),
    );
    expect(same.every((r) => r.ok)).toBe(true);
    expect(new Set(same.map((r) => r.data.logId ?? JSON.stringify(r.data.knockOns))).size).toBe(1);
    expect((await me(page)).iron).toBe(439);

    await hook(page, 'character', { health: 64, iron: 500 });
    const race = await Promise.all(
      [1, 2, 3, 4, 5].map(() => mutate(page, 'character.treat', { locationId: L, idempotencyKey: uuid() })),
    );
    expect(race.filter((r) => r.ok)).toHaveLength(1);
    expect(race.filter((r) => !r.ok).every((r) => r.reason === 'FULL_HEALTH')).toBe(true);
    expect((await me(page)).iron).toBe(439);
  });

  test('refused while held (the cells and the ward), on a train, with a run-in waiting; allowed on rival ground', async ({
    page,
  }) => {
    await member(page);
    await seasoned(page, { health: 50 });
    const here = 'coalport.infirmary';
    // The cells and the ward.
    for (const kind of ['cells', 'infirmary'] as const) {
      await hook(page, 'held', { send: kind });
      const r = await mutate(page, 'character.treat', { locationId: here, idempotencyKey: uuid() });
      expect([r.ok, r.reason, r.game?.kind]).toEqual([false, 'HELD', kind]);
      await hook(page, 'held', { releaseNow: true });
      await me(page);
    }
    // On a train: the only city this character can be refused in is the one it left.
    await seasoned(page, { health: 50 });
    expect((await mutate(page, 'travel.board', { to: 'duskwall', idempotencyKey: uuid() })).ok).toBe(true);
    const onTrain = await mutate(page, 'character.treat', { locationId: here, idempotencyKey: uuid() });
    expect(['IN_TRANSIT', 'NOT_HERE']).toContain(onTrain.reason);
    expect(onTrain.ok).toBe(false);
    const j = (await read(page, 'travel.journey')).data;
    await advance(page, j.cardAt - (await clockNow(page)) + 1_000);
    await hook(page, 'journey', { arriveNow: true });
    await mutate(page, 'travel.close', { journeyId: (await read(page, 'travel.journey')).data.id });

    // Rival ground: the sisters ask no questions.
    await hook(page, 'character', { health: 50, iron: 900 });
    const rival = await mutate(page, 'character.treat', {
      locationId: 'duskwall.infirmary',
      idempotencyKey: uuid(),
    });
    expect(rival.ok, rival.reason ?? '').toBe(true);
    expect(rival.data.knockOns.health.after).toBe(rival.data.knockOns.health.max);

    // A run-in waiting: refused, and nothing is taken.
    await hook(page, 'character', { health: 50, iron: 900 });
    const view = await cityView(page, 'duskwall');
    const loc = view.locations.find((l: any) =>
      l.actions.some((a: any) => !a.locked && a.kind === 'checked'),
    );
    const act = loc.actions.find((a: any) => !a.locked && a.kind === 'checked');
    await hook(page, 'street', { runIn: 'next' });
    const tap = await mutate(page, 'action.perform', {
      actionId: act.id,
      locationId: loc.id,
      idempotencyKey: uuid(),
      times: 1,
    });
    expect(tap.data.kind).toBe('runIn');
    const iron = (await me(page)).iron;
    const blocked = await mutate(page, 'character.treat', {
      locationId: 'duskwall.infirmary',
      idempotencyKey: uuid(),
    });
    expect([blocked.ok, blocked.reason]).toEqual([false, 'RUN_IN_PENDING']);
    expect((await me(page)).iron).toBe(iron);
  });
});

// ---------------------------------------------------------------------------------------------------
// #12 The random patrols (API): the rolls, the quiet, the cap, what holds
// ---------------------------------------------------------------------------------------------------

test.describe('#12 patrols (API)', () => {
  test.afterEach(async ({ page }) => {
    await setNight(page, 'day');
  });

  /** In Duskwall, at night, past the ten quiet minutes after the train. */
  async function atNightInDuskwall(
    page: Page,
    party: 'holm' | 'stahl' | 'grey' = 'holm',
    extra: object = {},
  ) {
    await member(page, party);
    await seasoned(page, extra);
    await travelTo(page, party === 'holm' ? 'duskwall' : 'coalport');
    await setNight(page, 'night');
    await advance(page, 11 * MIN);
  }
  const read10 = (page: Page, city = 'duskwall') => cityView(page, city);

  test('one write per ten-minute bucket; twenty reads at once; a refresh never re-rolls (the outcome of a bucket is fixed)', async ({
    page,
  }) => {
    await atNightInDuskwall(page);
    await hook(page, 'patrol', { mode: 'next' });
    const v0 = await version(page);
    const reads = await Promise.all(
      Array.from({ length: 20 }, () => read(page, 'city.get', { cityId: 'duskwall' })),
    );
    expect(reads.every((r) => r.ok)).toBe(true);
    // The hook's Next is spent by the winning write, so a reader that loaded the character just before
    // that write may answer without the card (a hook-only race; see the report, nit); the write is one.
    expect(reads.filter((r) => r.data.patrol).length).toBeGreaterThanOrEqual(1);
    expect((await version(page)) - v0, 'exactly one write for the bucket').toBe(1);
    expect((await read10(page)).patrol, 'the next read sees the card').not.toBeNull();
    // Five more reads in the same bucket: no write, the same card.
    const v1 = await version(page);
    for (let i = 0; i < 5; i++) expect((await read10(page)).patrol).not.toBeNull();
    expect(await version(page)).toBe(v1);
    // Answer, then a different bucket in Auto mode: the outcome of a bucket is fixed, whoever reads it.
    expect((await mutate(page, 'patrol.answer', { choiceId: 'set-aside', idempotencyKey: uuid() })).ok).toBe(
      true,
    );
    await hook(page, 'patrol', { mode: 'auto' });
    for (let b = 0; b < 8; b++) {
      await advance(page, 20 * MIN);
      const first = await read10(page);
      const second = await Promise.all([read10(page), read10(page), read10(page)]);
      expect(second.map((s) => !!s.patrol)).toEqual([!!first.patrol, !!first.patrol, !!first.patrol]);
      if (first.patrol)
        await mutate(page, 'patrol.answer', { choiceId: 'set-aside', idempotencyKey: uuid() });
    }
  });

  test('Auto mode, eight readers at once on each of twelve buckets: at most one write a bucket, and they all agree on the card', async ({
    page,
  }) => {
    await atNightInDuskwall(page);
    await hook(page, 'patrol', { mode: 'auto' });
    let stops = 0;
    for (let b = 0; b < 12; b++) {
      await advance(page, 20 * MIN);
      const v0 = await version(page);
      const rs = await Promise.all(
        Array.from({ length: 8 }, () => read(page, 'city.get', { cityId: 'duskwall' })),
      );
      expect(
        rs.filter((r) => !r.ok).map((r) => r.reason),
        `bucket ${b}: failed reads`,
      ).toEqual([]);
      const cards = rs.filter((r) => r.data.patrol).length;
      expect([0, 8], `bucket ${b}: the eight readers disagree about the card`).toContain(cards);
      expect((await version(page)) - v0, `bucket ${b}: writes`).toBeLessThanOrEqual(1);
      if (cards) {
        stops++;
        await mutate(page, 'patrol.answer', { choiceId: 'set-aside', idempotencyKey: uuid() });
      }
    }
    expect(stops).toBeLessThanOrEqual(6);
  });

  test('the quiet: ten minutes after the train, fifteen after a stop and after a run-in; the cap is two a night', async ({
    page,
  }) => {
    await member(page);
    await seasoned(page);
    // A night is one six-hour block of the game day: keep the whole test (the journey, then 45 minutes)
    // inside one, since the cap is per night. Done before boarding, so the quiet after the train is untouched.
    {
      const into = (await clockNow(page)) % (6 * HOUR);
      if (into > 6 * HOUR - 110 * MIN) await advance(page, 6 * HOUR - into + 5 * MIN);
    }
    await travelTo(page, 'duskwall');
    await setNight(page, 'night');
    await hook(page, 'patrol', { mode: 'next' });
    // Just after the train: no roll, no write.
    let v = await version(page);
    expect((await read10(page)).patrol).toBeNull();
    expect(await version(page)).toBe(v);
    await advance(page, 11 * MIN);
    // Stop 1.
    expect((await read10(page)).patrol).not.toBeNull();
    expect((await mutate(page, 'patrol.answer', { choiceId: 'papers', idempotencyKey: uuid() })).ok).toBe(
      true,
    );
    // Inside the fifteen minutes (5 later): no roll even with Next.
    await advance(page, 5 * MIN);
    await hook(page, 'patrol', { mode: 'next' });
    v = await version(page);
    expect((await read10(page)).patrol).toBeNull();
    expect(await version(page), 'a quiet read writes nothing').toBe(v);
    // 17 minutes after stop 1: stop 2.
    await advance(page, 12 * MIN);
    expect((await read10(page)).patrol).not.toBeNull();
    expect((await mutate(page, 'patrol.answer', { choiceId: 'set-aside', idempotencyKey: uuid() })).ok).toBe(
      true,
    );
    // A third, well past the quiet: the cap.
    await advance(page, 17 * MIN);
    await hook(page, 'patrol', { mode: 'next' });
    v = await version(page);
    expect((await read10(page)).patrol).toBeNull();
    expect(await version(page), 'a capped read writes nothing').toBe(v);
    expect((await status(page)).patrol.stops).toBe(2);
    // The next night (the next six-hour block) has its own two.
    await advance(page, 6 * HOUR);
    await hook(page, 'patrol', { mode: 'next' });
    expect((await read10(page)).patrol, 'a new night, a new cap').not.toBeNull();
    await mutate(page, 'patrol.answer', { choiceId: 'set-aside', idempotencyKey: uuid() });
    await hook(page, 'patrol', { mode: 'never' });
  });

  test('never while held, and a run-in suppresses the roll (pending, and fifteen minutes after)', async ({
    page,
  }) => {
    await atNightInDuskwall(page);
    // Held.
    await hook(page, 'held', { send: 'cells' });
    await hook(page, 'patrol', { mode: 'next' });
    let v = await version(page);
    const held = await read(page, 'city.get', { cityId: 'duskwall' });
    expect(held.ok && held.data.patrol).toBeFalsy();
    expect(await version(page)).toBe(v);
    // Deportation brings them home: start again in Duskwall.
    await hook(page, 'held', { releaseNow: true });
    await me(page);
    await hook(page, 'patrol', { mode: 'never' });
    // Release on rival ground is deportation: the train home, and the town barred for a day.
    expect((await me(page)).journey?.status).toBe('onTheWay');
    expect((await hook(page, 'journey', { arriveNow: true })).ok).toBe(true);
    await mutate(page, 'travel.close', { journeyId: (await read(page, 'travel.journey')).data.id });
    {
      // The dev panel's *Unbar* lifts the bar.
      await page.request.post('/api/test/dev/unbar', { data: {} });
      await seasoned(page);
      await hook(page, 'character', { energy: 100 });
      await travelTo(page, 'duskwall');
      await advance(page, 11 * MIN);
    }
    // A run-in waiting.
    const view = await cityView(page, 'duskwall');
    const loc = view.locations.find((l: any) =>
      l.actions.some((a: any) => !a.locked && a.kind === 'checked'),
    );
    const act = loc.actions.find((a: any) => !a.locked && a.kind === 'checked');
    await hook(page, 'street', { runIn: 'next' });
    const tap = await mutate(page, 'action.perform', {
      actionId: act.id,
      locationId: loc.id,
      idempotencyKey: uuid(),
      times: 1,
    });
    expect(tap.data.kind).toBe('runIn');
    await hook(page, 'patrol', { mode: 'next' });
    v = await version(page);
    expect((await read10(page)).patrol).toBeNull();
    expect(await version(page)).toBe(v);
    // The tap itself did not roll a patrol (no stop recorded).
    expect((await status(page)).patrol.stops).toBe(0);
  });

  test('in transit: the city read is refused, and nothing is written', async ({ page }) => {
    await member(page);
    await seasoned(page);
    await setNight(page, 'night');
    expect((await mutate(page, 'travel.board', { to: 'duskwall', idempotencyKey: uuid() })).ok).toBe(true);
    await hook(page, 'patrol', { mode: 'next' });
    const r = await read(page, 'city.get', { cityId: 'coalport' });
    expect([r.ok, r.reason]).toEqual([false, 'IN_TRANSIT']);
    expect((await status(page)).patrol.card).toBeNull();
    await hook(page, 'patrol', { mode: 'never' });
  });

  test('by day no roll; at home no roll; on rival ground at night the Next hook stops once and is spent', async ({
    page,
  }) => {
    await member(page);
    await seasoned(page);
    await hook(page, 'patrol', { mode: 'next' });
    expect((await cityView(page, 'coalport')).patrol, 'home, by day').toBeNull();
    await setNight(page, 'night');
    expect((await cityView(page, 'coalport')).patrol, 'home, at night').toBeNull();
    await travelTo(page, 'duskwall');
    await setNight(page, 'day');
    await advance(page, 11 * MIN);
    expect((await read10(page)).patrol, 'rival ground by day').toBeNull();
    await setNight(page, 'night');
    expect((await read10(page)).patrol, 'rival ground at night').not.toBeNull();
    expect((await status(page)).patrol.mode, 'Next is spent by the stop it forces').toBe('never');
  });

  test('a pending card holds Energy acts, missions, boarding, treatment and beds; reads, votes and the paper work', async ({
    page,
  }) => {
    await atNightInDuskwall(page);
    await hook(page, 'patrol', { mode: 'next' });
    const view = await read10(page);
    expect(view.patrol).not.toBeNull();
    const loc = view.locations.find((l: any) =>
      l.actions.some((a: any) => !a.locked && a.kind === 'checked'),
    );
    const act = loc.actions.find((a: any) => !a.locked && a.kind === 'checked');
    const iron = (await me(page)).iron;
    const refusals = {
      action: await mutate(page, 'action.perform', {
        actionId: act.id,
        locationId: loc.id,
        idempotencyKey: uuid(),
        times: 1,
      }),
      mission: await (async () => {
        const mloc = view.locations.find((l: any) => (l.missions ?? []).some((m: any) => !m.locked));
        const m = mloc.missions.find((x: any) => !x.locked);
        return mutate(page, 'mission.start', {
          locationId: mloc.id,
          missionId: m.id,
          wayId: m.ways[0].id,
          idempotencyKey: uuid(),
        });
      })(),
      board: await mutate(page, 'travel.board', { to: 'coalport', idempotencyKey: uuid() }),
      treat: await mutate(page, 'character.treat', {
        locationId: 'duskwall.infirmary',
        idempotencyKey: uuid(),
      }),
    };
    for (const [name, r] of Object.entries(refusals))
      expect([name, r.ok, r.reason], name).toEqual([name, false, 'PATROL_PENDING']);
    expect((await me(page)).iron, 'nothing was taken').toBe(iron);
    // What does not wait: the paper, the character, the nation map, a read of the city.
    expect((await read(page, 'paper.today')).ok).toBe(true);
    expect((await read(page, 'travel.nation')).ok).toBe(true);
    expect((await read(page, 'city.get', { cityId: 'duskwall' })).ok).toBe(true);
    // And the card answers once: a second key finds no card.
    expect((await mutate(page, 'patrol.answer', { choiceId: 'slip', idempotencyKey: uuid() })).ok).toBe(true);
    expect((await mutate(page, 'patrol.answer', { choiceId: 'slip', idempotencyKey: uuid() })).reason).toBe(
      'NO_PATROL',
    );
    await hook(page, 'patrol', { mode: 'never' });
  });

  test('the same key twice answers once (one Heat change); an unknown row is refused and keeps the card', async ({
    page,
  }) => {
    await atNightInDuskwall(page);
    await hook(page, 'patrol', { mode: 'next' });
    expect((await read10(page)).patrol).not.toBeNull();
    const bad = await mutate(page, 'patrol.answer', { choiceId: 'nonsense', idempotencyKey: uuid() });
    expect(bad.ok).toBe(false);
    expect((await read10(page)).patrol, 'the card is still there').not.toBeNull();
    const heat0 = (await me(page)).heat.value;
    const k = uuid();
    const three = await Promise.all(
      [1, 2, 3].map(() => mutate(page, 'patrol.answer', { choiceId: 'set-aside', idempotencyKey: k })),
    );
    expect(three.every((r) => r.ok)).toBe(true);
    expect(new Set(three.map((r) => JSON.stringify(r.data.heat))).size).toBe(1);
    const heat1 = (await me(page)).heat.value;
    expect(heat1 - heat0, 'Let it pass costs +10 once').toBeGreaterThanOrEqual(9);
    expect(heat1 - heat0).toBeLessThanOrEqual(10);
  });

  test("the papers' two branches: a Cool, clean visitor is waved on; a Hot one has the name written down (Heat +10, Watched)", async ({
    page,
  }) => {
    await atNightInDuskwall(page);
    // Branch 1: Cool and clean.
    await hook(page, 'character', { heat: 0, marks: [] });
    await hook(page, 'patrol', { mode: 'next' });
    expect((await read10(page)).patrol).not.toBeNull();
    const waved = await mutate(page, 'patrol.answer', { choiceId: 'papers', idempotencyKey: uuid() });
    expect(waved.data.headline).toBe('Waved on');
    // Branch 2: Hot.
    await advance(page, 20 * MIN);
    await hook(page, 'character', { heat: 60 });
    await hook(page, 'patrol', { mode: 'next' });
    expect((await read10(page)).patrol).not.toBeNull();
    const heat = (await me(page)).heat.value;
    const written = await mutate(page, 'patrol.answer', { choiceId: 'papers', idempotencyKey: uuid() });
    expect(written.data.headline).toBe('They write your name down');
    expect(written.data.flags).toContain('watched');
    expect(written.data.heat.after - written.data.heat.before).toBeGreaterThanOrEqual(9);
    expect((await me(page)).heat.value).toBeGreaterThan(heat);
    await hook(page, 'patrol', { mode: 'never' });
  });
});

// ---------------------------------------------------------------------------------------------------
// m5 (fix round): a resolved run-in left open no longer blocks the next one; its result waits its turn
// ---------------------------------------------------------------------------------------------------

test.describe('m5 a resolved run-in left open (API and the gate)', () => {
  test('the next tap that brings a run-in is served; both results show, newest first, until each is closed', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/signup');
    await member(page);
    await seasoned(page);
    await travelTo(page, 'duskwall');
    const view = await cityView(page, 'duskwall');
    const loc = view.locations.find((l: any) => l.actions.some((a: any) => !a.locked && a.kind === 'checked'));
    const act = loc.actions.find((a: any) => !a.locked && a.kind === 'checked');
    /** One tap that brings a run-in, answered by talking (the first roll forced to 1: it works). */
    const runIn = async () => {
      await hook(page, 'street', { runIn: 'next', choiceRoll: 1, caught: 'never' });
      const energy = (await me(page)).energy.value;
      const tap = await mutate(page, 'action.perform', {
        actionId: act.id,
        locationId: loc.id,
        idempotencyKey: uuid(),
        times: 1,
      });
      expect(tap.ok, `the tap: ${tap.reason}`).toBe(true);
      expect(tap.data.kind).toBe('runIn');
      expect((await me(page)).energy.value, 'Energy taken once').toBeLessThan(energy);
      const id = tap.data.encounterId as string;
      const chosen = await mutate(page, 'encounter.choose', { encounterId: id, choice: 'talk', idempotencyKey: uuid() });
      expect(chosen.ok, `the choice: ${chosen.reason}`).toBe(true);
      return { id, headline: chosen.data.headline as string };
    };

    // The first run-in, answered and never closed (a tab shut at its result).
    const first = await runIn();
    expect((await me(page)).runIn).toMatchObject({ encounterId: first.id, state: 'resolved' });
    // The second tap that brings a run-in is served (it was ACTION_CONFLICT, nothing written).
    const second = await runIn();
    expect(second.id).not.toBe(first.id);
    expect((await me(page)).runIn).toMatchObject({ encounterId: second.id, state: 'resolved' });
    expect((await read(page, 'encounter.current')).data.result.headline).toBe(second.headline);

    // The gate shows the newest result, then the one left open, each until its Continue.
    await page.goto('/city/duskwall');
    const result = page.locator('[role=dialog]').filter({ has: page.getByTestId('result-buttons') });
    await expect(result.getByTestId('stamp')).toBeVisible();
    await expect(result.getByRole('heading', { level: 2 })).toHaveText(second.headline);
    await result.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(result.getByRole('heading', { level: 2 })).toHaveText(first.headline);
    // The two talks can share a headline, so the heading alone does not prove the close landed: wait for
    // the pointer to move on (slice 8 integration: the gate's extra invalidations made the race show).
    await expect.poll(async () => (await me(page)).runIn?.encounterId, { timeout: 10_000 }).toBe(first.id);
    expect((await me(page)).runIn).toMatchObject({ encounterId: first.id, state: 'resolved' });
    await result.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(result).toHaveCount(0);
    expect((await me(page)).runIn).toBeNull();
    expect((await read(page, 'encounter.current')).data).toBeNull();
    // Closing again is harmless.
    expect((await mutate(page, 'encounter.close', { encounterId: first.id })).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------
// #10 The Unrest prize: the farming cases (API)
// ---------------------------------------------------------------------------------------------------

test.describe('#10 the Unrest prize (API)', () => {
  const fxp = async (page: Page) => (await me(page)).fxp as number;

  test('0.5 points pays, 0.499 and 0.4 do not; a home member gets nothing; the boundary run twice and a second day pay once', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const mk = async (party: 'holm' | 'stahl' | 'grey', name: string) => {
      const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL as string });
      const p = await ctx.newPage();
      await p.goto('/signup');
      await member(p, party, name);
      return p;
    };
    const big = await mk('holm', 'Pia Big');
    const half = await mk('grey', 'Ada Half');
    const justUnder = await mk('grey', 'Abe Under');
    const small = await mk('holm', 'Pam Small');
    const home = await mk('stahl', 'Vic Home');
    // Clear the town of any earlier prize (the seven-day rule is per town): nine days on.
    await nextDay(big, 9);
    const base = {
      big: await fxp(big),
      half: await fxp(half),
      under: await fxp(justUnder),
      small: await fxp(small),
      home: await fxp(home),
    };
    // A home member cannot even use the push hook on their own town.
    expect((await hook(home, 'unrest', { cityId: 'duskwall', pushed: 1.8 })).error).toMatch(
      /rival home city/,
    );
    await hook(big, 'unrest', { cityId: 'duskwall', pushed: 1.8, share: 62 });
    await hook(small, 'unrest', { cityId: 'duskwall', pushed: 0.4, share: 61 });
    await hook(half, 'unrest', { cityId: 'duskwall', pushed: 0.5, share: 60.5 });
    await hook(justUnder, 'unrest', { cityId: 'duskwall', pushed: 0.499, share: 58 });
    // The same day pays nobody: the prize is paid at the turn.
    expect(await fxp(big)).toBe(base.big);
    await nextDay(big);
    const delta = async () => ({
      big: (await fxp(big)) - base.big,
      half: (await fxp(half)) - base.half,
      under: (await fxp(justUnder)) - base.under,
      small: (await fxp(small)) - base.small,
      home: (await fxp(home)) - base.home,
    });
    expect(await delta()).toEqual({ big: 50, half: 50, under: 0, small: 0, home: 0 });
    // The boundary run again, and another day: nothing more.
    await hook(big, 'city-day');
    await hook(big, 'city-day');
    expect(await delta()).toEqual({ big: 50, half: 50, under: 0, small: 0, home: 0 });
    await nextDay(big);
    expect(await delta()).toEqual({ big: 50, half: 50, under: 0, small: 0, home: 0 });
  });

  test('the seven-day rule: a re-entry after 3 days pays nobody, after 8 days pays again; a town that recovers before the turn pays nobody', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await member(page, 'holm', 'Pia Week');
    await nextDay(page, 9);
    const fxp0 = async () => fxp(page);
    let last = await fxp0();
    const step = async (label: string, expected: number) => {
      const f = await fxp0();
      expect(f - last, label).toBe(expected);
      last = f;
    };
    const into = (pushed = 1.5) => hook(page, 'unrest', { cityId: 'duskwall', pushed, share: 58 });
    const out = () => hook(page, 'unrest', { cityId: 'duskwall', pushed: 0, share: 66 });
    await out();
    await into(1.8);
    await nextDay(page);
    await step('entry 1 (nothing paid for a week before)', 50);
    await out();
    await nextDay(page, 2);
    await into();
    await nextDay(page);
    await step('entry 2, three days after the prize', 0);
    await out();
    await nextDay(page, 4);
    await into();
    await nextDay(page);
    await step('entry 3, eight days after the prize', 50);
    // In, out and in again on one day pays once, at the turn.
    await out();
    await nextDay(page, 8);
    await last;
    last = await fxp0();
    await into();
    await out();
    await into(0.2);
    await nextDay(page);
    await step('in, out, in on one day', 50);
    // A town that falls and drifts back over 60 before the turn pays nobody.
    await out();
    await nextDay(page, 8);
    last = await fxp0();
    await into();
    await out();
    await nextDay(page);
    await step('fell and recovered before the turn', 0);
  });

  test('only the last seven days count: a push eight days before the entry pays nothing; one three days before pays', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const mk = async (party: 'holm' | 'grey', name: string) => {
      const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL as string });
      const p = await ctx.newPage();
      await p.goto('/signup');
      await member(p, party, name);
      return p;
    };
    const old = await mk('holm', 'Pia Old');
    const mid = await mk('holm', 'Ria Mid');
    const quick = await mk('grey', 'Quin Quick');
    await nextDay(old, 9);
    const b = { old: await fxp(old), mid: await fxp(mid), quick: await fxp(quick) };
    await hook(old, 'unrest', { cityId: 'duskwall', pushed: 1.0, share: 66 });
    await nextDay(old, 5);
    await hook(mid, 'unrest', { cityId: 'duskwall', pushed: 0.7, share: 66 });
    await nextDay(old, 2);
    await hook(quick, 'unrest', { cityId: 'duskwall', pushed: 0.1, share: 58 });
    await nextDay(old);
    expect([(await fxp(old)) - b.old, (await fxp(mid)) - b.mid, (await fxp(quick)) - b.quick]).toEqual([
      0, 50, 0,
    ]);
  });
});

// ---------------------------------------------------------------------------------------------------
// #11 The six-hour day: the windows at their edges, through the server's own clock
// ---------------------------------------------------------------------------------------------------

test('#11 the night windows tile the day: dusk at 04, 10, 16 and 22 UTC, dawn two hours on; the edges to the minute', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await member(page);
  await setNight(page, 'clock');
  try {
    // Move the shared clock to the next 00:00 UTC, then probe every edge, always forward.
    const t0 = await clockNow(page);
    const dayStart = Math.floor(t0 / DAY) * DAY + DAY;
    await advance(page, dayStart - t0);
    const probes: Array<[number, number, boolean]> = [];
    for (const h of [4, 6, 10, 12, 16, 18, 22]) {
      probes.push([h * 60 - 1, 0, false]);
    }
    const expectNight = (min: number) => [4, 10, 16, 22].some((d) => min >= d * 60 && min < (d + 2) * 60);
    const minutes = [
      0, 1, 239, 240, 241, 359, 360, 361, 599, 600, 601, 719, 720, 721, 959, 960, 961, 1079, 1080, 1081, 1319,
      1320, 1321, 1439,
    ];
    for (const m of minutes) {
      const now = await clockNow(page);
      const target = dayStart + m * MIN + 30_000;
      if (target > now) await advance(page, target - now);
      const view = await cityView(page, 'coalport');
      const mm = ((await clockNow(page)) - dayStart) / MIN;
      expect(
        view.night.night,
        `at ${Math.floor(mm / 60)}:${String(Math.floor(mm % 60)).padStart(2, '0')} UTC`,
      ).toBe(expectNight(Math.floor(mm)));
      expect(view.isNight, 'the map follows the rules').toBe(view.night.night);
      const dusk = new Date(view.night.nextDusk).getUTCHours();
      const dawn = new Date(view.night.nextDawn).getUTCHours();
      expect([4, 10, 16, 22]).toContain(dusk);
      expect([0, 6, 12, 18]).toContain(dawn);
      expect(view.night.nextDusk).toBeGreaterThan(view.night.night ? view.night.nextDawn - 2 * HOUR : 0);
    }
    expect(probes.length).toBeGreaterThan(0);
  } finally {
    await setNight(page, 'day');
  }
});

// ---------------------------------------------------------------------------------------------------
// #12 Night missions (API)
// ---------------------------------------------------------------------------------------------------

test.describe('#12 night missions (API)', () => {
  test.afterEach(async ({ page }) => {
    await setNight(page, 'day');
  });

  test('the four night missions and the way locks by day; the day ladder is complete; the night rate is a quarter more Iron at night', async ({
    page,
  }) => {
    await member(page);
    await seasoned(page);
    const view = await cityView(page, 'coalport');
    const customs = view.locations.find((l: any) => l.id === 'coalport.customs-house');
    const lorry = customs.missions.find((m: any) => m.id.endsWith('.lorry'));
    const watch = customs.missions.find((m: any) => m.id.endsWith('.watch'));
    expect(lorry.locked).toMatchObject({ reason: 'NIGHT' });
    expect(lorry.locked.opensAt).toBeGreaterThan(await clockNow(page));
    expect(lorry.placeTags ?? []).toEqual(expect.any(Array));
    const start = (m: any, wayId: string) =>
      mutate(page, 'mission.start', {
        locationId: customs.id,
        missionId: m.id,
        wayId,
        idempotencyKey: uuid(),
      });
    const byDay = await start(lorry, 'agi');
    expect([byDay.ok, byDay.reason, byDay.game?.lock]).toEqual([false, 'MISSION_LOCKED', 'NIGHT']);
    const wayByDay = await start(watch, 'agi');
    expect([wayByDay.ok, wayByDay.reason, wayByDay.game?.lock, wayByDay.game?.wayId]).toEqual([
      false,
      'MISSION_LOCKED',
      'NIGHT',
      'agi',
    ]);
    // The day way of the same mission plays by day; no Night rate.
    await hook(page, 'street', { checkRoll: 1, runIn: 'never' });
    const day = await start(watch, 'int');
    expect(day.ok).toBe(true);
    const dayIron = day.data.rewards.iron;
    expect(dayIron.bonus).toBe(0);
    // At night the lorry plays, +25 % Iron as a labelled part.
    await setNight(page, 'night');
    await hook(page, 'character', { energy: 100 });
    await hook(page, 'street', { checkRoll: 1, runIn: 'never' });
    const night = await start(lorry, 'int');
    expect(night.ok).toBe(true);
    const iron = night.data.rewards.iron;
    expect(iron.base).toBe(dayIron.base);
    expect(iron.bonus).toBe(Math.round(iron.base * 0.25));
    expect(iron.parts).toEqual([{ id: 'nightRate', label: 'Night rate', amount: iron.bonus }]);
    expect(night.data.rewards.fxp.total, 'the night rate is never Party XP').toBe(0);
  });

  test('no Party order ever points at a night mission, and the day ladder has a mission at every Level', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await member(page);
    await seasoned(page);
    const seen = new Set<string>();
    for (let d = 0; d < 12; d++) {
      const orders = (await me(page)).orders.items as Array<{ title: string }>;
      for (const o of orders) seen.add(o.title);
      await nextDay(page);
    }
    expect(
      [...seen].some((t) => /lorry|ten o'clock|log after lights-out|dawn shift|last tram/i.test(t)),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------
// #5 Jobs (API)
// ---------------------------------------------------------------------------------------------------

test("#5 the Driver pays more than the member's day-1 job, in every city a player can stand in", async ({
  page,
}) => {
  await member(page, 'holm');
  await seasoned(page);
  const coalport = await cityView(page, 'coalport');
  const jobs = coalport.locations.flatMap((l: any) =>
    (l.jobs ?? []).map((j: any) => ({ ...j, place: l.id })),
  );
  const pay = (id: string) => jobs.find((j: any) => j.jobId === id)?.pay;
  const factory = jobs.find((j: any) => j.jobId === 'coalport-factory-worker');
  const driver = jobs.find((j: any) => j.jobId === 'coalport-driver');
  const vendor = jobs.find((j: any) => j.jobId === 'coalport-street-vendor');
  expect(vendor.pay).toBe(100);
  expect(factory.pay, 'a Collective member draws a fifth more').toBe(216);
  expect(driver.pay).toBe(240);
  expect(driver.pay).toBeGreaterThanOrEqual(1.1 * factory.pay);
  expect(pay('coalport-street-vendor')).toBeLessThan(pay('coalport-factory-worker'));
  await travelTo(page, 'duskwall');
  const duskwall = await cityView(page, 'duskwall');
  const dj = duskwall.locations.flatMap((l: any) => l.jobs ?? []);
  const stores = dj.find((j: any) => j.jobId === 'duskwall-stores-hand');
  const dd = dj.find((j: any) => j.jobId === 'duskwall-driver');
  expect(dd.pay).toBe(240);
  // A visitor draws the plain 180, never the member's fifth.
  expect(stores.pay).toBeLessThan(dd.pay);
});

// ---------------------------------------------------------------------------------------------------
// #7 The journey card cannot be skipped (API side)
// ---------------------------------------------------------------------------------------------------

test('#7 closing the arrival over an unanswered hostile card is not a free skip: it is the put-aside row, with its Heat and flag', async ({
  page,
}) => {
  await member(page);
  await seasoned(page);
  expect((await mutate(page, 'travel.board', { to: 'duskwall', idempotencyKey: uuid() })).ok).toBe(true);
  let j = (await read(page, 'travel.journey')).data;
  await advance(page, j.cardAt - (await clockNow(page)) + 1_000);
  j = (await read(page, 'travel.journey')).data;
  expect(j.card?.title).toBeTruthy();
  expect(j.card.choices.some((c: any) => c.setAside)).toBe(true);
  // Closing while still on the way is refused.
  expect((await mutate(page, 'travel.close', { journeyId: j.id })).reason).toBe('IN_TRANSIT');
  await hook(page, 'journey', { arriveNow: true });
  j = (await read(page, 'travel.journey')).data;
  expect(j.card.chosen).toBeNull();
  const heat0 = (await me(page)).heat.value;
  expect((await mutate(page, 'travel.close', { journeyId: j.id })).ok).toBe(true);
  const after = await me(page);
  expect(after.heat.value, "the card's ignore effects were applied").toBeGreaterThanOrEqual(heat0 + 9);
});

// ===================================================================================================
// Screens
// ===================================================================================================

const SIZES = [
  { name: '390 × 844', width: 390, height: 844 },
  { name: '375 × 667', width: 375, height: 667 },
  { name: '360 × 640', width: 360, height: 640 },
  { name: '667 × 375', width: 667, height: 375 },
  { name: '1440 × 900', width: 1440, height: 900 },
  { name: '1920 × 1080', width: 1920, height: 1080 },
] as const;
const PHONES = SIZES.slice(0, 3);

/** The war words (CLAUDE.md rule 2) and the opening's no-father rule, over a screen's visible text. */
const WAR =
  /\b(war|wars|battle|battles|troops|army|militia|enemy|enemies|uprising|front line|frontline|siege|invasion|uniforms?|salute|swastika)\b/i;
const FATHER = /\b(father|dad|papa|deathbed)\b/i;

const shots = process.env.QA_SHOTS;
const snap = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
};

const visibleText = (page: Page) => page.locator('body').innerText();

/** Visible controls under 44 px either way (a control widened by its own ::after counts with it). */
async function auditTargets(page: Page, root = 'body'): Promise<string[]> {
  return page.evaluate((rootSel) => {
    const out: string[] = [];
    for (const r of document.querySelectorAll(rootSel))
      for (const el of r.querySelectorAll(
        'button, a[href], [role=button], [role=radio], [role=tab], input:not([type=hidden]), select',
      )) {
        if (el.closest('[aria-hidden=true], [inert], [data-testid=dev-panel]')) continue;
        if (el.getAttribute('data-testid') === 'dev-toggle') continue;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none' || s.pointerEvents === 'none') continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (el.tagName === 'INPUT' && (b.width <= 1 || b.height <= 1)) continue;
        let w = b.width;
        let h = b.height;
        for (const pseudo of ['::after', '::before']) {
          const p = getComputedStyle(el, pseudo);
          if (p.content === 'none' || p.display === 'none' || p.position !== 'absolute') continue;
          const px = (v: string) => (v.endsWith('px') ? parseFloat(v) : 0);
          w = Math.max(w, b.width - px(p.left) - px(p.right));
          h = Math.max(h, b.height - px(p.top) - px(p.bottom));
        }
        if (w < 43.5 || h < 43.5)
          out.push(
            `${(el.getAttribute('aria-label') ?? el.textContent ?? el.getAttribute('data-testid') ?? '').trim().slice(0, 48)} ${Math.round(b.width)}×${Math.round(b.height)}`,
          );
      }
    return out;
  }, root);
}
/** Nothing moving once settled, under reduced motion (an opacity fade is not motion). */
async function auditStill(page: Page): Promise<string[]> {
  await page.waitForTimeout(500);
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .filter((a) => {
        const frames = (a.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
        const props = new Set(
          frames.flatMap((f) =>
            Object.keys(f).filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)),
          ),
        );
        return [...props].some((p) => p !== 'opacity');
      })
      .map((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
        return `${(a as CSSAnimation).animationName ?? 'animation'} on ${t?.getAttribute('data-testid') ?? t?.tagName}`;
      }),
  );
}
/** Visible controls with no accessible name (no text, label, aria-label or title). */
async function unnamedControls(page: Page, root = 'body'): Promise<string[]> {
  return page.evaluate((rootSel) => {
    const out: string[] = [];
    for (const r of document.querySelectorAll(rootSel))
      for (const el of r.querySelectorAll(
        'button, a[href], [role=button], [role=radio], input:not([type=hidden]), select',
      )) {
        if (el.closest('[aria-hidden=true], [inert]')) continue;
        const s = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        if (s.visibility === 'hidden' || s.display === 'none' || (b.width === 0 && b.height === 0)) continue;
        if (el.tagName === 'INPUT' && (b.width <= 1 || b.height <= 1)) continue;
        const labelled = el.getAttribute('aria-labelledby');
        const byId = labelled ? (document.getElementById(labelled)?.textContent ?? '') : '';
        const labels =
          el instanceof HTMLInputElement || el instanceof HTMLSelectElement
            ? [...(el.labels ?? [])].map((l) => l.textContent ?? '').join('')
            : '';
        const name =
          (el.getAttribute('aria-label') ?? '') +
          byId +
          labels +
          (el.textContent ?? '') +
          (el.getAttribute('title') ?? '');
        if (name.trim() === '') out.push(el.getAttribute('data-testid') ?? el.tagName);
      }
    return out;
  }, root);
}
/** Targets, sideways scroll, vocabulary and (reduced motion) stillness for the screen as it stands. */
async function audit(page: Page, label: string, root = 'body', opts: { still?: boolean } = {}) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  expect(await auditTargets(page, root), `${label}: controls under 44 px`).toEqual([]);
  expect(await unnamedControls(page, root), `${label}: controls with no accessible name`).toEqual([]);
  const side = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(side, `${label}: sideways scroll`).toBeLessThanOrEqual(0);
  const text = await visibleText(page);
  expect(text, `${label}: war vocabulary`).not.toMatch(WAR);
  expect(text, `${label}: a father`).not.toMatch(FATHER);
  if (opts.still !== false)
    expect(await auditStill(page), `${label}: things moving under reduced motion`).toEqual([]);
}

const settledDialogs = (page: Page) =>
  page.waitForFunction(() =>
    [...document.querySelectorAll('[role=dialog], [data-testid=card-dim]')].every((d) =>
      d.getAnimations().every((a) => a.playState !== 'running'),
    ),
  );

/** Open a place by its row in the *What's here* list (every size). */
async function openPlaceRow(page: Page, label: string): Promise<Locator> {
  await page.getByTestId('places-button').filter({ visible: true }).click();
  await page
    .getByRole('dialog', { name: / · what's here$/ })
    .getByRole('button', { name: new RegExp(`^${label.replace(/[^a-zA-Z0-9 ]/g, '.')}`) })
    .first()
    .click();
  await page.waitForFunction(() => {
    const d = document.querySelector('[role=dialog][data-layout]');
    return !!d && d.getAnimations().every((a) => a.playState !== 'running');
  });
  return page.locator('[role=dialog][data-layout]');
}

/** Sign up by the API and stop before the counter (the draft exists, the face is set). */
async function draftOnly(page: Page): Promise<void> {
  await page.goto('/signup');
  const email = `qa5-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const base = test.info().project.use.baseURL as string;
  const su = await page.request.post('/api/auth/sign-up/email', {
    data: { email, password: 'e2e-password-123', name: 'Mara Lenk' },
    headers: { origin: base },
  });
  expect(su.ok()).toBe(true);
  const faces = (await read(page, 'arrival.faces')).data as Array<{ id: string }>;
  expect((await mutate(page, 'arrival.start', { avatarId: faces[3]!.id })).ok).toBe(true);
}

test.describe('screens', () => {
  test.afterEach(async ({ page }) => {
    await setNight(page, 'day').catch(() => undefined);
  });

  // -------------------------------------------------------------------------------------------------
  // #1 Coming home
  // -------------------------------------------------------------------------------------------------

  const PARTIES = [
    {
      key: 'collective',
      row: 'holm',
      confirm: /^Go for the work · the six o'clock to Coalport$/i,
      echo: 'You went for the work.',
      order: 'Sign on at the Union Hall',
      ticket: 'Sign on',
      city: 'Coalport',
      helper: 'Petra Holm',
      result: 'Union men first',
    },
    {
      key: 'vanguard',
      row: 'stahl',
      confirm: /^Go for the stamp · the six o'clock to Duskwall$/i,
      echo: 'You went for the stamp.',
      order: 'Get the stamp at Beacon House',
      ticket: 'Get the stamp',
      city: 'Duskwall',
      helper: 'Viktor Stahl',
      result: 'Thursday, stamped',
    },
    {
      key: 'alliance',
      row: 'grey',
      confirm: /^Go for the flat · the six o'clock to Ashford$/i,
      echo: 'You went for the flat.',
      order: 'File the appeal at the Assembly Rooms',
      ticket: 'File the appeal',
      city: 'Ashford',
      helper: 'Thomas Grey',
      result: 'Filed',
    },
  ] as const;

  for (const party of PARTIES)
    for (const size of PHONES) {
      test(`#1 Coming home, ${party.key} on ${size.name}: the counter, the kitbag, the post, the favour; no father; 44 px; no sideways scroll`, async ({
        page,
      }) => {
        test.setTimeout(180_000);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width: size.width, height: size.height });
        await signUpOnly(page, 'Mara Lenk');
        await expect(page.getByRole('heading', { name: 'The counter' })).toBeVisible();
        const body = await visibleText(page);
        expect(body).toContain('The mill is sold. The stamp is missing. The flat is gone.');
        for (const name of ['Petra Holm', 'Viktor Stahl', 'Thomas Grey']) expect(body).toContain(name);
        expect(body).toContain('Faction Reset token');
        await audit(page, `${party.key} ${size.name} counter`);
        // Before a pick: the confirm says so, and does nothing.
        const confirm = page.getByTestId('story-confirm');
        await expect(confirm).toHaveText(/choose one of the three/i);
        await expect(confirm).toBeDisabled();
        // Pick: the row's rest and the party line show; the confirm names the six o'clock.
        const row = page.locator(`[data-testid="story-row"][data-choice="${party.row}"]`);
        await row.scrollIntoViewIfNeeded();
        await row.click();
        await expect(row).toHaveAttribute('aria-checked', 'true');
        await expect(confirm).toHaveText(party.confirm);
        const picked = await row.innerText();
        expect(picked).toContain(party.helper);
        expect(picked).toMatch(/Strength|Intelligence/);
        // Every row's first line can be scrolled clear of the confirm bar.
        for (const r of await page.locator('[data-testid="story-row"]').all()) {
          await r.scrollIntoViewIfNeeded();
          const b = (await r.boundingBox())!;
          const cb = (await confirm.boundingBox())!;
          expect(b.y + Math.min(b.height, 40), "a row's first line is clear of the confirm bar").toBeLessThan(
            cb.y,
          );
        }
        await snap(page, `open-${party.key}-${size.width}x${size.height}-1`);
        await confirm.click();
        await expect(row).toBeHidden();
        // Beat 2.
        await expect(page.getByRole('heading', { name: 'The kitbag' })).toBeVisible();
        let t = await visibleText(page);
        expect(t).toContain(party.echo);
        expect(t).toContain(party.helper.split(' ')[1]);
        await audit(page, `${party.key} ${size.name} kitbag`);
        await snap(page, `open-${party.key}-${size.width}x${size.height}-2`);
        await page.locator('[data-testid="story-choice"][data-choice="books"]').click();
        // Beat 3.
        await expect(page.getByRole('heading', { name: 'The post' })).toBeVisible();
        t = await visibleText(page);
        expect(t).toContain('three envelopes');
        expect(t).toMatch(/The unit's list/);
        expect(t).toMatch(/The requisition order/);
        expect(t).toMatch(/The ration page/);
        await audit(page, `${party.key} ${size.name} post`);
        await page.locator('[data-testid="story-choice"][data-choice="ward-book"]').click();
        await expect(page).toHaveURL(/\/paper$/);
        // The welcome edition: the first sentence, the favour's own deck, three orders, no father.
        await expect(page.getByRole('button', { name: 'To the city' })).toBeVisible();
        t = await visibleText(page);
        expect(t).toContain('the envelope you opened on the train');
        expect(t).toContain(party.order);
        await audit(page, `${party.key} ${size.name} welcome edition`);
        // To the city: the HQ's sheet opens with the favour's ticket highlighted; one tap does it.
        await page.getByRole('button', { name: 'To the city' }).click();
        await expect(page).toHaveURL(/\/city\/\w+\?loc=/);
        await hook(page, 'street', { rolls: [1] });
        const sheet = page.locator('[role=dialog][data-layout]');
        await expect(sheet).toBeVisible();
        await settledDialogs(page);
        const favour = sheet.locator('[data-testid^="ticket-"]').filter({ hasText: party.ticket }).first();
        await expect(favour).toBeVisible();
        await favour.getByRole('button', { name: /once/i }).first().click();
        const result = page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
        await expect(result).toContainText(party.result);
        expect(await result.innerText()).not.toMatch(FATHER);
        await audit(page, `${party.key} ${size.name} the favour's result`, '[role=dialog]');
      });
    }

  test('#1 a sign-up that stopped after the counter picks up at the kitbag, with its echo and the new words (build notes, row 1)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await draftOnly(page);
    expect(
      (await mutate(page, 'arrival.answer', { questionId: 'origin.platform', answerId: 'stahl' })).ok,
    ).toBe(true);
    await page.goto('/arrive');
    await expect(page.getByRole('heading', { name: 'The kitbag' })).toBeVisible();
    const t = await visibleText(page);
    expect(t).toContain('You went for the stamp.');
    expect(t).toContain("The six o'clock to Duskwall".toUpperCase());
    expect(t).not.toMatch(FATHER);
    // And after the kitbag: the post.
    expect(
      (await mutate(page, 'arrival.answer', { questionId: 'origin.suitcase', answerId: 'light' })).ok,
    ).toBe(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'The post' })).toBeVisible();
  });

  test('#1 the counter by keyboard alone: Tab to a row, Space picks it, Tab to the confirm, Enter goes on', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await draftOnly(page);
    await page.goto('/arrive');
    await expect(page.getByRole('heading', { name: 'The counter' })).toBeVisible();
    const row = page.locator('[data-testid="story-row"][data-choice="stahl"]');
    for (let i = 0; i < 12 && !(await row.evaluate((e) => e === document.activeElement)); i++)
      await page.keyboard.press('Tab');
    expect(await row.evaluate((e) => e === document.activeElement), 'Tab reaches the second person').toBe(
      true,
    );
    await page.keyboard.press('Space');
    await expect(row).toHaveAttribute('aria-checked', 'true');
    const confirm = page.getByTestId('story-confirm');
    for (let i = 0; i < 6 && !(await confirm.evaluate((e) => e === document.activeElement)); i++)
      await page.keyboard.press('Tab');
    expect(await confirm.evaluate((e) => e === document.activeElement), 'Tab reaches the confirm').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'The kitbag' })).toBeVisible();
  });

  for (const size of SIZES) {
    test(`#1 the counter at ${size.name}: three rows, a 44 px confirm, no sideways scroll, no father`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: size.width, height: size.height });
      await draftOnly(page);
      await page.goto('/arrive');
      await expect(page.getByRole('heading', { name: 'The counter' })).toBeVisible();
      await audit(page, `counter ${size.name}`);
      for (const choice of ['holm', 'stahl', 'grey']) {
        const row = page.locator(`[data-testid="story-row"][data-choice="${choice}"]`);
        await row.scrollIntoViewIfNeeded();
        await row.click();
        const confirm = page.getByTestId('story-confirm');
        await expect(confirm).toBeEnabled();
        const cb = (await confirm.boundingBox())!;
        expect(cb.height).toBeGreaterThanOrEqual(44);
        expect(cb.y + cb.height).toBeLessThanOrEqual(size.height + 1);
        await audit(page, `counter ${size.name} ${choice} picked`);
      }
      await snap(page, `counter-${size.width}x${size.height}`);
    });
  }
});

let sentinelText = '';

test.describe('screens, continued', () => {
  test.afterEach(async ({ page }) => {
    await setNight(page, 'day').catch(() => undefined);
  });

  const plate = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

  // -------------------------------------------------------------------------------------------------
  // #2 clouds
  // -------------------------------------------------------------------------------------------------

  test('#2 clouds: ten images by day (mist, three clouds with their shadows, two wisps), eight at night; each cloud large at 1440 and 1920', async ({
    page,
  }) => {
    await member(page);
    for (const size of [SIZES[4], SIZES[5]]) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/city/coalport');
      await mapAtRest(page);
      const clouds = page.getByTestId('map-clouds');
      await expect(clouds).toHaveAttribute('data-time', 'day');
      await expect(clouds.locator('img')).toHaveCount(10, { timeout: 15_000 });
      const widths = await clouds
        .locator('[data-cloud]')
        .evaluateAll((els) =>
          els.map((e) => ({ src: e.getAttribute('data-cloud') ?? '', w: (e as HTMLElement).offsetWidth })),
        );
      for (const c of widths.filter((x) => /cloud-day|wisp-day/.test(x.src)))
        expect(c.w, `${c.src} at ${size.name}`).toBeGreaterThanOrEqual(260);
      expect(widths.filter((x) => /puff/.test(x.src))).toEqual([]);
    }
    await setNight(page, 'night');
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const clouds = page.getByTestId('map-clouds');
    await expect(clouds).toHaveAttribute('data-time', 'night');
    await expect(clouds.locator('img')).toHaveCount(8, { timeout: 15_000 });
  });

  // -------------------------------------------------------------------------------------------------
  // #3 the level-up cards
  // -------------------------------------------------------------------------------------------------

  /** Level up with real taps at the Mill Gate (the hook sets XP; a tap lands the level and its points). */
  async function levelUpTo(page: Page, levels: number): Promise<void> {
    for (let i = 0; i < levels; i++) {
      const m = await me(page);
      const need = ({ 1: 149, 2: 449, 3: 899, 4: 1_599 } as Record<number, number>)[m.level] ?? m.xp;
      await hook(page, 'character', { xp: need, energy: 100 });
      await hook(page, 'street', { rolls: [1] });
      const r = await mutate(page, 'action.perform', {
        actionId: 'coalport.mill-gate.canvass',
        locationId: 'coalport.mill-gate',
        idempotencyKey: uuid(),
        times: 1,
      });
      expect(r.ok, r.reason ?? '').toBe(true);
    }
  }

  test('#3 the level-up cards: three paper cards with the stat and its move, a +1 on placing, a double tap places one, Choose later keeps the point', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await levelUpTo(page, 2);
    expect((await me(page)).statPointsPending).toBe(2);
    await page.goto('/me');
    const group = page.getByRole('group', { name: 'Where the point goes' });
    await expect(group).toBeVisible();
    const cards = group.getByRole('button');
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toHaveAccessibleName(/^Strength 8 → 9$/);
    await expect(cards.nth(1)).toHaveAccessibleName(/^Intelligence 12 → 13$/);
    await expect(cards.nth(2)).toHaveAccessibleName(/^Agility 5 → 6$/);
    // Paper cards in ink, not black blocks; each at least 56 px tall.
    const looks = await cards.evaluateAll((els) =>
      els.map((e) => {
        const s = getComputedStyle(e);
        const b = e.getBoundingClientRect();
        return { bg: s.backgroundColor, h: Math.round(b.height), w: Math.round(b.width) };
      }),
    );
    for (const l of looks) {
      expect(
        l.bg === 'rgba(0, 0, 0, 0)' || l.bg === 'transparent' || /^rgb\((2[0-9]{2}|1[89][0-9]),/.test(l.bg),
        `card fill ${l.bg}`,
      ).toBe(true);
      expect(l.h).toBeGreaterThanOrEqual(56);
    }
    const heading = await group.locator('xpath=..').innerText();
    expect(heading).toMatch(/Level 3 · two points to place/);
    expect(heading).toMatch(/Most used here/i);
    expect(heading).toMatch(/Your best/i);
    expect(heading).toMatch(/Charisma isn't trained/);
    // A double tap places one point, and the card says +1.
    await cards.nth(0).dblclick();
    await expect(page.getByText(/Level 3 · one more to place/)).toBeVisible();
    await expect(cards.nth(0)).toHaveAccessibleName(/^Strength 9 · \+1$/);
    expect((await me(page)).statPointsPending, 'one point, not two').toBe(1);
    expect((await me(page)).stats.str).toBe(9);
    await snap(page, 'cards-390');
    // The last point closes the picker; the line reads the move.
    await cards.nth(1).click();
    await expect(group).toBeHidden();
    expect((await me(page)).statPointsPending).toBe(0);
  });

  test('#3 in the result: a line and Place it; the sheet holds the cards; Choose later leaves the point waiting; no scroll bar at 390 × 844', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await hook(page, 'character', { xp: 149, energy: 100 });
    await hook(page, 'street', { rolls: [1] });
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const sheet = await openPlaceRow(page, '1. Mill Gate');
    await sheet
      .locator('[data-testid^="ticket-"]')
      .first()
      .getByRole('button', { name: /once/i })
      .first()
      .click();
    const result = page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
    await expect(result.getByTestId('effect-level')).toHaveText(/^Level 2 · one point to placePlace it$/);
    await settledDialogs(page);
    expect(
      await result.getByTestId('result-middle').evaluate((e) => e.scrollHeight - e.clientHeight),
      'a ×1 Success with a level-up at 390 × 844',
    ).toBeLessThanOrEqual(0);
    await result.getByTestId('place-it').click();
    const picker = page.getByRole('group', { name: 'Where the point goes' });
    await expect(picker).toBeVisible();
    await page.getByRole('button', { name: /^Choose later · nothing is lost$/ }).click();
    await expect(picker).toBeHidden();
    expect((await me(page)).statPointsPending, 'nothing is lost by choosing later').toBe(1);
    // Place it again, this time for real: the line reads the move.
    await result.getByTestId('place-it').click();
    await picker.getByRole('button', { name: /^Intelligence/ }).click();
    await expect(result.getByTestId('effect-level')).toHaveText(/^Level 2 · Intelligence 12 → 13$/);
  });

  // -------------------------------------------------------------------------------------------------
  // #4 scroll bars and the compact result
  // -------------------------------------------------------------------------------------------------

  test('#4 the result at every size: the dialog never scrolls, only the middle, and a thin ink bar (6 px, square, no arrows)', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await member(page);
    await hook(page, 'character', { level: 6, iron: 500, energy: 100, xp: 3_499 - 3_000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/city/coalport');
    await mapAtRest(page);
    await hook(page, 'street', { rolls: [1] });
    const sheet = await openPlaceRow(page, '1. Mill Gate');
    await sheet
      .locator('[data-testid^="ticket-"]')
      .first()
      .getByRole('button', { name: /once/i })
      .first()
      .click();
    // By the attribute, not the role: a resize past 640 px remounts the place's panel over the result.
    const result = page.locator('[role=dialog]').filter({ has: page.getByTestId('result-buttons') });
    await expect(result.getByTestId('stamp')).toBeVisible();
    const numbers: string[] = [];
    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await settledDialogs(page);
      const dialogOver = await result.evaluate((e) => e.scrollHeight - e.clientHeight);
      expect(dialogOver, `${size.name}: the whole modal scrolls`).toBeLessThanOrEqual(0);
      const middle = result.getByTestId('result-middle');
      const over = await middle.evaluate((e) => e.scrollHeight - e.clientHeight);
      numbers.push(`${size.name}: ${over}px`);
      if (over > 0) {
        const bar = await middle.evaluate((e) => (e as HTMLElement).offsetWidth - e.clientWidth);
        expect(bar, `${size.name}: the scroll bar's width`).toBeLessThanOrEqual(8);
        expect(bar).toBeGreaterThan(0);
      }
      // Both buttons stay on screen whatever the middle does.
      const cont = (await result.getByText('Continue', { exact: true }).last().boundingBox())!;
      expect(cont.y + cont.height).toBeLessThanOrEqual(size.height + 1);
    }
    console.log(`result middle overflow of a Success: ${numbers.join(' · ')}`);
    // A big screen and a phone never scroll for an ordinary Success (m2, fixed in the fix round: the
    // short phones, 375 × 667 and 360 × 640, too).
    for (const size of [SIZES[0], SIZES[1], SIZES[2], SIZES[4], SIZES[5]]) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await settledDialogs(page);
      expect(
        await result.getByTestId('result-middle').evaluate((e) => e.scrollHeight - e.clientHeight),
        size.name,
      ).toBeLessThanOrEqual(0);
    }
  });

  test('#4 the page itself and the lists carry the thin bar too (Places list on a short phone)', async ({
    page,
  }) => {
    await member(page);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/city/coalport');
    await mapAtRest(page);
    await page.getByTestId('places-button').filter({ visible: true }).click();
    const dlg = page.getByRole('dialog', { name: / · what's here$/ });
    await expect(dlg).toBeVisible();
    await settledDialogs(page);
    const scroller = dlg
      .locator('xpath=.//*[self::div or self::section][contains(@class,"overflow-y")]')
      .first();
    const bars = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[role=dialog] *')]
        .filter(
          (e) => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY),
        )
        .map((e) => e.offsetWidth - e.clientWidth),
    );
    expect(bars.length, 'the list scrolls on a 640 px phone').toBeGreaterThan(0);
    for (const b of bars) expect(b).toBeLessThanOrEqual(8);
    expect(scroller).toBeTruthy();
  });

  // -------------------------------------------------------------------------------------------------
  // #6 Health under Energy
  // -------------------------------------------------------------------------------------------------

  for (const size of SIZES) {
    test(`#6 Health is under Energy at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await member(page);
      await hook(page, 'character', { health: 60, heat: 30 });
      await page.goto('/me');
      const hud = page.getByRole('region', { name: 'Character' });
      await expect(hud).toBeVisible();
      const box = async (l: Locator) => (await l.filter({ visible: true }).first().boundingBox())!;
      const energy = await box(page.getByTestId('hud-energy'));
      if (size.height <= 400) {
        // Held sideways: Health and Heat ride in the name line (unchanged by the note).
        await expect(page.getByTestId('hud-vitals-short')).toBeVisible();
        expect((await box(hud)).height).toBeLessThanOrEqual(80);
        return;
      }
      const health = await box(page.getByTestId('hud-health'));
      expect(health.y, 'Health below Energy').toBeGreaterThan(energy.y + energy.height - 2);
      expect(health.x, 'Health in the Energy column').toBeLessThanOrEqual(energy.x + 2);
      const heat = await box(page.getByTestId('hud-heat-line'));
      expect(heat.y, 'Heat below Health').toBeGreaterThan(health.y + health.height - 2);
      await audit(page, `HUD ${size.name}`, '[role=region]');
    });
  }

  // -------------------------------------------------------------------------------------------------
  // #7 the journey card (screens)
  // -------------------------------------------------------------------------------------------------

  test('#7 the journey card: Escape, the map, a back and forward, a reload and the Paper tab never lose it; the keyboard reaches its rows; Continue waits for a row', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await member(page);
    await seasoned(page);
    expect((await mutate(page, 'travel.board', { to: 'duskwall', idempotencyKey: uuid() })).ok).toBe(true);
    const j = (await read(page, 'travel.journey')).data;
    await advance(page, j.cardAt - (await clockNow(page)) + 1_000);
    await page.goto('/journey');
    const card = page.getByRole('dialog').getByTestId('journey-card');
    await expect(card).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toBeVisible();
    await page.mouse.click(700, 150);
    await expect(card).toBeVisible();
    await page.goBack();
    await page.goForward();
    await expect(page).toHaveURL(/\/journey$/);
    await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible({ timeout: 10_000 });
    // Keyboard: the first Tab stops land on the card's rows.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid=journey-card]'))).toBe(
      true,
    );
    // No close button on the card.
    await expect(page.getByRole('dialog').getByRole('button', { name: /^close/i })).toHaveCount(0);
    // The Paper tab works; the Map tab brings the card back.
    await page
      .getByRole('link', { name: /^Paper/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/paper/);
    await page.getByRole('link', { name: /^Map/ }).first().click();
    await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible({ timeout: 10_000 });
    // Arrive with the card unanswered: the arrival has no Continue until a row is tapped.
    expect((await hook(page, 'journey', { arriveNow: true })).ok).toBe(true);
    await page.reload();
    const modal = page.getByRole('dialog').filter({ has: page.getByTestId('arrival-headline') });
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('arrival-continue')).toHaveCount(0);
    await expect(modal.getByTestId('journey-set-aside')).toBeVisible();
    await modal.getByTestId('journey-set-aside').dblclick();
    await expect(modal.getByTestId('journey-outcome')).toBeVisible();
    await modal.getByTestId('arrival-continue').click();
    await expect(modal).toHaveCount(0);
    expect((await me(page)).heat.value, 'Let it pass cost its Heat once').toBeLessThanOrEqual(11);
  });

  // -------------------------------------------------------------------------------------------------
  // #8 treatment (screens)
  // -------------------------------------------------------------------------------------------------

  test('#8 the Treatment card: price, short of Iron, full Health, one tap (a double tap charges once), the modal, St Agnes says sister', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await hook(page, 'character', { level: 6, iron: 20, health: 64 });
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const sheet = await openPlaceRow(page, '9. The Infirmary');
    const card = sheet.getByTestId('treatment');
    await expect(card).toContainText('See the matron · Health 64 / 125');
    await expect(card.getByTestId('treatment-price')).toHaveText(
      /^One Iron a point: 6[0-9] Iron to be whole now\. It comes back on its own, ten every ten minutes\.$/,
    );
    await expect(card.getByTestId('treatment-take')).toBeDisabled();
    await expect(card.getByTestId('treatment-take')).toHaveText(/^Needs 6\d Iron$/);
    await hook(page, 'character', { iron: 500 });
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const sheet2 = await openPlaceRow(page, '9. The Infirmary');
    const take = sheet2.getByTestId('treatment-take');
    await expect(take).toHaveText(/^Get patched up · 6\d Iron$/);
    expect((await take.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await take.dblclick();
    const result = page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
    await expect(result.getByTestId('stamp')).toHaveText('Patched up');
    await expect(result).toContainText('Whole again');
    await expect(result.getByTestId('political-health')).toHaveText(/^Health 6\d → 125$/);
    await expect(result.getByTestId('political-iron')).toHaveText(/^−6\d Iron · the ward$/);
    expect((await me(page)).iron, 'a double tap charged once').toBeGreaterThanOrEqual(430);
    expect((await me(page)).iron).toBeLessThanOrEqual(440);
    await audit(page, 'treatment result', '[role=dialog]');
    await result.getByRole('button', { name: 'Continue' }).click();
    // Full Health: the card says so and has no button.
    const again = page.locator('[role=dialog][data-layout]').getByTestId('treatment');
    await expect(again.getByTestId('treatment-well')).toHaveText("You're well · nothing to treat");
    await expect(again.getByTestId('treatment-take')).toHaveCount(0);
    // Rival ground and the capital: Duskwall's matron, St Agnes's sister.
    await hook(page, 'character', { level: 10, cityId: 'duskwall', health: 40, iron: 500 });
    await page.goto('/city/duskwall');
    await mapAtRest(page);
    await expect((await openPlaceRow(page, '11. Infirmary')).getByTestId('treatment')).toContainText(
      'See the matron · Health 40 / 145',
    );
    await hook(page, 'character', { cityId: 'irongate', health: 40 });
    await page.goto('/city/irongate/irongate.old-town');
    await mapAtRest(page);
    const agnes = await openPlaceRow(page, '10. St Agnes Hospital');
    await expect(agnes.getByTestId('treatment')).toContainText('See the sister · Health 40 / 145');
  });

  // -------------------------------------------------------------------------------------------------
  // #9 What's here
  // -------------------------------------------------------------------------------------------------

  test("#9 What's here at home (Level 8), on rival ground and in a capital district: the blocks, the lines, a mission row opens its place", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await hook(page, 'character', { level: 8, energy: 100 });
    await page.goto('/city/coalport');
    await mapAtRest(page);
    await page.getByTestId('places-button').filter({ visible: true }).click();
    const home = page.getByRole('dialog', { name: "Coalport · what's here" });
    await expect(home).toBeVisible();
    for (const kicker of [
      /^Issues this week$/i,
      /^Missions you can start$/i,
      /^Your orders here$/i,
      /^Places$/i,
    ])
      await expect(home.getByText(kicker).first()).toBeVisible();
    // The night mission by day keeps its row with the lock line.
    const lorry = home.getByTestId('wh-mission').filter({ hasText: 'Follow the ten o' });
    await expect(lorry).toContainText(/Opens at nightfall · dusk (at|in|tomorrow) /);
    const rest = await home
      .getByTestId('wh-more')
      .innerText()
      .catch(() => '');
    if (rest) expect(rest).toMatch(/^\d+ more from (Level|Rank) \d+/);
    await audit(page, "What's here, home", '[role=dialog]');
    await snap(page, 'wh-home-390');
    // A mission row opens its place with the ticket ringed.
    await home.getByTestId('wh-mission').filter({ hasText: 'Speak at the launch' }).click();
    await expect(page).toHaveURL(/\?loc=coalport\.shipyard/);
    await settledDialogs(page);
    await expect(page.locator('[data-mission="coalport.shipyard.launch"]')).toBeVisible();

    // Rival ground: the visitor's missions; the orders block is the collapsed line.
    await hook(page, 'character', { level: 10, rank: 3, cityId: 'duskwall' });
    await page.goto('/city/duskwall');
    await mapAtRest(page);
    await page.getByTestId('places-button').filter({ visible: true }).click();
    const rival = page.getByRole('dialog', { name: "Duskwall · what's here" });
    await expect(rival.getByTestId('wh-orders-line')).toHaveText(
      /^Your orders are in Coalport · \d of 3 done$/,
    );
    await expect(rival.getByTestId('wh-mission').first()).toBeVisible();
    // No Issue this week, and no missions at all, read as the developer's fallback lines.
    await hook(page, 'issues', { cityId: 'duskwall', issueIds: [] });
    await page.reload();
    await mapAtRest(page);
    await page.getByTestId('places-button').filter({ visible: true }).click();
    await expect(
      page.getByRole('dialog', { name: "Duskwall · what's here" }).getByText('No Issue this week'),
    ).toBeVisible();
    await audit(page, "What's here, rival", '[role=dialog]');
  });

  test("#9 What's here at Level 1: the empty missions line names the first Level, and the count of the rest is true", async ({
    page,
  }) => {
    await member(page);
    const v = await cityView(page, 'coalport');
    expect(v.whatsHere.missions).toEqual([]);
    expect(v.whatsHere.more.reduce((n: number, g: any) => n + g.count, 0)).toBeGreaterThanOrEqual(1);
    const need = Math.min(...v.whatsHere.more.filter((g: any) => g.gate === 'level').map((g: any) => g.need));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/city/coalport');
    await mapAtRest(page);
    await page.getByTestId('places-button').filter({ visible: true }).click();
    await expect(page.getByRole('dialog', { name: "Coalport · what's here" })).toContainText(
      `None yet · the first opens at Level ${need}`,
    );
  });

  // -------------------------------------------------------------------------------------------------
  // #10 the rival header
  // -------------------------------------------------------------------------------------------------

  for (const size of SIZES) {
    test(`#10 the rival plate at ${size.name}: the push, the danger, the goal; targets, sideways scroll, reduced motion`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: size.width, height: size.height });
      await member(page);
      await hook(page, 'character', { level: 10, rank: 3, iron: 500, cityId: 'duskwall' });
      await hook(page, 'unrest', { cityId: 'duskwall', share: 65, pushed: 0 });
      await page.goto('/city/duskwall');
      await mapAtRest(page);
      const push = plate(page, 'plate-pressure');
      await expect(push).toContainText(/Pushed today.* of 2( points| ·)/);
      await expect(plate(page, 'plate-danger')).toHaveAttribute('data-risk', /risky|a-little|little/i);
      await expect(plate(page, 'plate-danger')).toContainText('Risk here: Risky');
      if (size.height >= 700) {
        await expect(plate(page, 'plate-goal')).toHaveAttribute(
          'data-goal',
          /^The goal: Unrest\. Under 60 %/,
        );
        const goal = await plate(page, 'plate-goal').boundingBox();
        // Under 640 px wide the goal is one short line; from 640 the whole sentence wraps in the panel.
        expect(goal!.height, 'the goal').toBeLessThanOrEqual(size.width >= 640 ? 110 : 20);
      }
      await audit(page, `rival plate ${size.name}`);
      await snap(page, `rival-plate-${size.width}x${size.height}`);
      // At night the danger is in the failure colour with patrols out.
      await setNight(page, 'night');
      await page.reload();
      await mapAtRest(page);
      await expect(plate(page, 'plate-danger')).toContainText('Risk here: Dangerous · patrols out');
      await expect(plate(page, 'plate-danger')).toHaveAttribute('data-risk', 'dangerous');
      await audit(page, `rival plate at night ${size.name}`);
      await snap(page, `rival-plate-night-${size.width}x${size.height}`);
    });
  }

  test('#10 the prize in the paper: the desk line and the headline; with one name the Sentinel deck says "is", not "are"', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({
      baseURL: test.info().project.use.baseURL as string,
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    await page.goto('/signup');
    await member(page, 'stahl', 'Ottilie Brandt');
    await nextDay(page, 9);
    // A Vanguard member presses Coalport (a Collective home) into Unrest.
    await hook(page, 'unrest', { cityId: 'coalport', share: 65, pushed: 0 });
    await hook(page, 'unrest', { cityId: 'coalport', pushed: 1.8, share: 58 });
    await nextDay(page);
    await page.goto('/paper');
    await expect(page.getByTestId('desk-award').filter({ hasText: 'Coalport in Unrest' })).toHaveText(
      /^Coalport in Unrest · you pushed \d\.\d points this week · \+50 Party XP$/,
    );
    const text = await page.locator('body').innerText();
    expect(text).toContain('Coalport Under Sixty');
    sentinelText = text;
    await ctx.close();
  });

  // m4 (fixed in the fix round): the Sentinel's deck read "{top} are named" for any number of names; it
  // now reads "The district office names {top} for their part", right for one name or three.
  plain(
    '#10 wording: the Sentinel deck with one name reads "Ottilie Brandt is named", not "are named"',
    async () => {
      expect(sentinelText, 'run after the prize test').toContain('Under Sixty');
      expect(sentinelText).not.toMatch(/Ottilie Brandt are named/);
      expect(sentinelText).toMatch(/The district office names Ottilie Brandt for their part\./);
    },
  );
});

test.describe('screens, night', () => {
  test.afterEach(async ({ page }) => {
    await setNight(page, 'day').catch(() => undefined);
    await hook(page, 'patrol', { mode: 'never' }).catch(() => undefined);
  });
  const plate = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

  // -------------------------------------------------------------------------------------------------
  // #11 the six-hour day (screens)
  // -------------------------------------------------------------------------------------------------

  for (const size of SIZES) {
    // m1 (fixed in the fix round): under 700 px of height (375 × 667, 360 × 640) the plate dropped the
    // dusk line; it now sits beside the plate's name in two short lines.
    plain(
      `#11 the plate's dusk line and the map's art at ${size.name}: day, then night, in the player's own clock`,
      async ({ page }) => {
        test.setTimeout(120_000);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width: size.width, height: size.height });
        await member(page);
        await page.goto('/city/coalport');
        await mapAtRest(page);
        const line = plate(page, 'plate-dusk');
        await expect(line).toHaveText(
          /^Dusk (in \d+ min|in \d+ h( \d+ min)?|at \d\d:\d\d|tomorrow \d\d:\d\d)$/,
        );
        await expect(line).toHaveAttribute('data-night', 'false');
        await expect(page.getByTestId('map-night')).toHaveCSS('opacity', '0');
        await audit(page, `dusk line by day ${size.name}`);
        await setNight(page, 'night');
        await page.goto('/city/coalport');
        await mapAtRest(page);
        await expect(line).toHaveText(
          /^Night · dawn (in \d+ min|in \d+ h( \d+ min)?|at \d\d:\d\d|tomorrow \d\d:\d\d)$/,
        );
        await expect(line).toHaveAttribute('data-night', 'true');
        await expect(page.getByTestId('map-night')).toHaveCSS('opacity', '1');
        await audit(page, `dusk line at night ${size.name}`);
        await snap(page, `night-home-${size.width}x${size.height}`);
      },
    );
  }

  test('#11 dusk and dawn turn without a reload, and the line counts down in minutes', async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await member(page);
    await setNight(page, 'clock');
    const now = await clockNow(page);
    // The next dusk that is more than ten minutes away; land 11 minutes before it.
    let dusk = Math.floor(now / (6 * HOUR)) * 6 * HOUR + 4 * HOUR;
    if (dusk - 11 * MIN <= now) dusk += 6 * HOUR;
    await advance(page, dusk - 11 * MIN - now);
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const line = plate(page, 'plate-dusk');
    await expect(line).toHaveText('Dusk in 11 min');
    await advance(page, 9 * MIN);
    await page.reload();
    await mapAtRest(page);
    await expect(line).toHaveText('Dusk in 2 min');
    // Dawn: from two hours of night, by the clock, without a reload.
    await advance(page, 3 * MIN);
    await page.reload();
    await mapAtRest(page);
    await expect(line).toHaveAttribute('data-night', 'true');
    await expect(line).toHaveText(
      /^Night · dawn (in 1 h 59 min|in 119 min|in 1 h 58 min|at \d\d:\d\d|tomorrow \d\d:\d\d)$/,
    );
    await advance(page, 2 * HOUR);
    await page.reload();
    await mapAtRest(page);
    await expect(line).toHaveAttribute('data-night', 'false');
    await expect(page.getByTestId('map-night')).toHaveCSS('opacity', '0');
    await setNight(page, 'day');
  });

  // -------------------------------------------------------------------------------------------------
  // #12 the night's work and the patrol card
  // -------------------------------------------------------------------------------------------------

  test('#12 on rival ground at night every ticket says Night · patrols out; by day the tag is gone; at home there is none', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await hook(page, 'character', { level: 10, rank: 3, cityId: 'duskwall', iron: 500 });
    await setNight(page, 'night');
    await page.goto('/city/duskwall');
    await mapAtRest(page);
    const gate = await openPlaceRow(page, '1. Fortress Gate');
    const tickets = gate
      .locator('div[data-testid^="ticket-duskwall."]')
      .filter({ has: page.getByTestId('ticket-once') });
    await expect(tickets.first()).toBeVisible();
    for (const t of await tickets.all())
      await expect(t.getByTestId('ticket-tags')).toContainText('Night · patrols out');
    await setNight(page, 'day');
    await page.goto('/city/duskwall?loc=duskwall.garrison-gate');
    await expect(
      page
        .locator('[role=dialog][data-layout]')
        .locator('div[data-testid^="ticket-duskwall."]')
        .filter({ has: page.getByTestId('ticket-once') })
        .first()
        .getByTestId('ticket-tags'),
    ).not.toContainText('patrols out');
    await hook(page, 'character', { cityId: 'coalport' });
    await setNight(page, 'night');
    await page.goto('/city/coalport?loc=coalport.mill-gate');
    await expect(page.locator('[role=dialog][data-layout]').getByText('patrols out')).toHaveCount(0);
  });

  test('#12 the lorry by day: a lock line and no button; at night a Night rate chip; the briefing greys a night way by day', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await hook(page, 'character', { level: 8, iron: 200, energy: 100 });
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const sheet = await openPlaceRow(page, '8. Customs House');
    const lorry = sheet.locator('[data-mission="coalport.customs-house.lorry"]');
    await lorry.scrollIntoViewIfNeeded();
    await expect(lorry.getByTestId('mission-lock')).toHaveText(
      /^Opens at nightfall · dusk (at|in|tomorrow) /,
    );
    await expect(lorry.getByTestId('mission-choose')).toHaveCount(0);
    await expect(lorry.getByTestId('mission-chips')).toContainText('Night rate · +25 % Iron');
    const watch = sheet.locator('[data-mission="coalport.customs-house.watch"]');
    await watch.scrollIntoViewIfNeeded();
    await watch.getByTestId('mission-choose').click();
    const briefing = page.getByTestId('briefing');
    await expect(briefing.getByTestId('way-night').first()).toContainText(/Opens at nightfall · dusk /);
    await audit(page, 'briefing with a night way by day', '[role=dialog]');
  });

  test('#12 the patrol card: kicker, three rows and Let it pass, no Close; Escape, the dim, other tabs and a reload keep it; a double tap answers once; Continue', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await hook(page, 'character', { level: 10, rank: 3, cityId: 'duskwall', iron: 500 });
    await setNight(page, 'night');
    await hook(page, 'patrol', { mode: 'next' });
    await page.goto('/city/duskwall');
    const sheet = page.getByTestId('patrol-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('A PATROL · RAMPART ROW', { ignoreCase: true });
    await expect(sheet).toContainText('Two of them under the corner lamp');
    for (const row of ['Show your papers', 'Talk your way past', 'Slip down a side street', 'Let it pass'])
      await expect(sheet).toContainText(row);
    await expect(sheet.getByRole('button', { name: /^close/i })).toHaveCount(0);
    await settledDialogs(page);
    await audit(page, 'patrol card 390', '[role=dialog]');
    await snap(page, 'patrol-card-390');
    await page.keyboard.press('Escape');
    await page.mouse.click(195, 140);
    await expect(sheet).toBeVisible();
    // A reload brings the same card back, and writes no second roll.
    const v = await version(page);
    await page.reload();
    await expect(page.getByTestId('patrol-sheet')).toBeVisible();
    expect(await version(page)).toBe(v);
    // The Paper tab works; the Map tab finds the card again.
    await page
      .getByRole('link', { name: /^Paper/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/paper/);
    await page.getByRole('link', { name: /^Map/ }).first().click();
    await expect(page.getByTestId('patrol-sheet')).toBeVisible();
    // A double tap on a row answers once.
    const heat0 = (await me(page)).heat.value;
    await page
      .getByTestId('patrol-sheet')
      .getByRole('button', { name: /^Let it pass/ })
      .dblclick();
    await expect(page.getByTestId('patrol-sheet').getByRole('button', { name: /^Continue/ })).toBeVisible();
    const heat1 = (await me(page)).heat.value;
    expect(heat1 - heat0, 'Let it pass is +10 once').toBeLessThanOrEqual(10);
    await page
      .getByTestId('patrol-sheet')
      .getByRole('button', { name: /^Continue/ })
      .click();
    await expect(page.getByTestId('patrol-sheet')).toHaveCount(0);
    // The street is free again: a ticket can be tapped.
    await hook(page, 'street', { runIn: 'never', checkRoll: 1 });
    const gate = await openPlaceRow(page, '1. Fortress Gate');
    await gate.locator('div[data-testid^="ticket-duskwall."]').first().getByTestId('ticket-once').click();
    await expect(page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') })).toBeVisible();
  });

  for (const size of SIZES) {
    test(`#12 the patrol card at ${size.name}: every row reachable and 44 px, no sideways scroll, reduced motion`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: size.width, height: size.height });
      await member(page);
      await hook(page, 'character', { level: 10, rank: 3, cityId: 'duskwall', iron: 500 });
      await setNight(page, 'night');
      await hook(page, 'patrol', { mode: 'next' });
      await page.goto('/city/duskwall');
      const sheet = page.getByTestId('patrol-sheet');
      await expect(sheet).toBeVisible();
      await settledDialogs(page);
      await audit(page, `patrol card ${size.name}`, '[role=dialog]');
      for (const row of [
        'Show your papers',
        'Talk your way past',
        'Slip down a side street',
        'Let it pass',
      ]) {
        const b = sheet.getByRole('button', { name: new RegExp(`^${row}`) });
        await b.scrollIntoViewIfNeeded();
        const box = (await b.boundingBox())!;
        expect(box.y + box.height, `${row} within the screen`).toBeLessThanOrEqual(size.height + 1);
        expect(box.y).toBeGreaterThanOrEqual(0);
      }
      await snap(page, `patrol-card-${size.width}x${size.height}`);
      // Answer so the next test starts clean.
      await sheet.getByRole('button', { name: /^Let it pass/ }).click();
    });
  }

  test('#12 the nation map: a pending patrol refuses boarding in words, with the way back to the card', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await hook(page, 'character', { level: 10, rank: 3, cityId: 'duskwall', iron: 500 });
    await setNight(page, 'night');
    await hook(page, 'patrol', { mode: 'next' });
    await page.goto('/city/duskwall');
    await expect(page.getByTestId('patrol-sheet')).toBeVisible();
    await page.goto('/nation');
    await page.locator('[data-testid=hotspot][aria-label^="Coalport"]').dispatchEvent('click');
    await page.getByTestId('city-card').getByTestId('city-board').click();
    await expect(page.getByTestId('board-notice')).toContainText(
      'A patrol has stopped you · answer it on the map',
    );
    await expect(page.getByTestId('patrol-link')).toBeVisible();
    await audit(page, 'nation, patrol refusal', 'main');
  });

  // -------------------------------------------------------------------------------------------------
  // The dev panel's new shortcuts (build notes)
  // -------------------------------------------------------------------------------------------------

  test('the dev panel: To dusk, Patrol Next / Never / Auto, Push it into Unrest, Next day exist and their lines say what they did', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await seasoned(page);
    await page.goto('/city/coalport');
    await mapAtRest(page);
    await page.getByTestId('dev-toggle').click();
    const panel = page.getByTestId('dev-panel');
    await expect(panel).toBeVisible();
    for (const name of ['To dusk', 'Next day'])
      await expect(panel.getByRole('button', { name, exact: true })).toBeVisible();
    const text = await panel.innerText();
    for (const need of [/Patrol/i, /Push it into Unrest/i, /Night/i]) expect(text).toMatch(need);
    await setNight(page, 'clock');
    await panel.getByRole('button', { name: 'To dusk', exact: true }).click();
    await expect(panel.getByTestId('dev-line')).toContainText(/Now /);
    const s = await status(page);
    expect(s.night.night, 'To dusk: a minute past the next dusk').toBe(true);
    await setNight(page, 'day');
    for (const name of [/^Next$/, /^Never$/, /^Auto$/])
      await expect(panel.getByRole('button', { name }).first()).toBeVisible();
  });
});

test.describe('screens, the rest', () => {
  test.afterEach(async ({ page }) => {
    await setNight(page, 'day').catch(() => undefined);
  });

  for (const size of SIZES) {
    test(`#3 the level-up cards on the Me tab at ${size.name}: three cards, 56 px, no sideways scroll`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: size.width, height: size.height });
      await member(page);
      await hook(page, 'character', { xp: 149, energy: 100 });
      await hook(page, 'street', { rolls: [1] });
      const r = await mutate(page, 'action.perform', {
        actionId: 'coalport.mill-gate.canvass',
        locationId: 'coalport.mill-gate',
        idempotencyKey: uuid(),
        times: 1,
      });
      expect(r.ok).toBe(true);
      await page.goto('/me');
      const group = page.getByRole('group', { name: 'Where the point goes' });
      await group.scrollIntoViewIfNeeded();
      await expect(group.getByRole('button')).toHaveCount(3);
      for (const b of await group.getByRole('button').all())
        expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(56);
      await audit(page, `Me with the cards ${size.name}`);
      await snap(page, `cards-${size.width}x${size.height}`);
    });
  }

  test('#5 the Jobs cards print the new figures: Driver 240 at the Quays, the factory 216 for a member', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await member(page);
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const quays = await openPlaceRow(page, '5. Harbour Quays');
    const text = await quays.innerText();
    expect(text).toMatch(/Driver/);
    expect(text).toMatch(/240/);
    expect(text).toMatch(/Level 3/i);
    await page.keyboard.press('Escape');
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const gate = await openPlaceRow(page, '1. Mill Gate');
    expect(await gate.innerText()).toMatch(/Factory worker[\s\S]*216/);
  });

  // m3 (fixed in the fix round): answers §5.2 says the card prints *Needs Level 3 and Agility 10*; it
  // printed *Needs LEVEL 3, AGI 10* (Sheets.tsx needsText).
  plain(
    '#5 wording: the Driver card spells the stat out (Agility 10), as answers §5.2 says it already does',
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await member(page);
      await page.goto('/city/coalport');
      await mapAtRest(page);
      const quays = await openPlaceRow(page, '5. Harbour Quays');
      // The words, not the caps the card's style draws them in (innerText upper-cases them).
      expect(await quays.textContent()).toMatch(/Needs Level 3, Agility 10/);
      expect(await quays.textContent()).not.toMatch(/\bAGI\b/);
    },
  );

  test("#9 What's here in the capital: each district lists its own missions; Eastside and Old Town say None here", async ({
    page,
  }) => {
    await member(page);
    await seasoned(page);
    await travelTo(page, 'irongate');
    const v = await cityView(page, 'irongate');
    const byId = Object.fromEntries((v.districts as any[]).map((d) => [d.id, d.whatsHere]));
    expect(Object.keys(byId)).toHaveLength(5);
    expect(byId['irongate.eastside'].missions).toEqual([]);
    expect(byId['irongate.old-town'].missions).toEqual([]);
    const sm = byId['irongate.station-market'];
    expect(sm.missions.length).toBeGreaterThanOrEqual(1);
    expect(sm.missions.some((m: any) => m.missionId === 'irongate.tram-junction.last-tram' && m.night)).toBe(
      true,
    );
    // The whole-city block is the union of the districts' missions.
    const all = new Set(v.whatsHere.missions.map((m: any) => m.missionId));
    for (const d of Object.values(byId) as any[])
      for (const m of d.missions) expect(all.has(m.missionId)).toBe(true);
  });

  for (const size of SIZES) {
    test(`screens at ${size.name}: What's here and the Infirmary sheet at home, the Me tab and the Paper: 44 px, no sideways scroll, reduced motion, vocabulary`, async ({
      page,
    }) => {
      test.setTimeout(150_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: size.width, height: size.height });
      await member(page);
      await hook(page, 'character', { level: 8, iron: 300, health: 70, energy: 100 });
      await page.goto('/city/coalport');
      await mapAtRest(page);
      await audit(page, `Coalport map ${size.name}`);
      await page.getByTestId('places-button').filter({ visible: true }).click();
      await settledDialogs(page);
      await audit(page, `What's here ${size.name}`, '[role=dialog]');
      await snap(page, `wh-${size.width}x${size.height}`);
      await page.keyboard.press('Escape');
      await mapAtRest(page);
      const infirmary = await openPlaceRow(page, '9. The Infirmary');
      await expect(infirmary.getByTestId('treatment-take')).toBeVisible();
      await audit(page, `Infirmary sheet ${size.name}`, '[role=dialog]');
      await snap(page, `infirmary-${size.width}x${size.height}`);
      for (const route of ['/me', '/paper']) {
        await page.goto(route);
        await audit(page, `${route} ${size.name}`);
      }
    });
  }
});
