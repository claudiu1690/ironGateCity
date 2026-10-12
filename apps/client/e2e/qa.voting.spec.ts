/* eslint-disable @typescript-eslint/no-explicit-any -- the tests read untyped tRPC JSON (views of many shapes) */
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Browser, BrowserContext } from '@playwright/test';

/**
 * QA of the voting rework (docs/qa/voting-rework-report.md): the edge cases the rework's own specs do
 * not reach. Serial, on the shared clock, last in the chain (like `voting`).
 *
 * API block: a double tap and a concurrent burst on stand / back / vote / setRule (one effect, one
 * charge), the windows (the vote outside days 2–4, standing outside days 0–1, the rule outside the
 * term's first two days), the refusals (rank, Known, Political Capital, self, twice), the seat maths
 * (local support + 3 × at most five backers), a three-way tie going to card 1, the rule's five days
 * counted down, and Unrest's fallback.
 */

test.describe.configure({ mode: 'serial' });

interface Res<T = any> {
  ok: boolean;
  data: T;
  raw: string;
  reason: string | null;
  game: Record<string, any> | null;
}
type Api = APIRequestContext;

const parse = async (r: Awaited<ReturnType<Api['get']>>): Promise<Res> => {
  const raw = await r.text();
  const j = (() => {
    try {
      return JSON.parse(raw) as any;
    } catch {
      return {};
    }
  })();
  if (j?.result) return { ok: true, data: j.result.data, raw, reason: null, game: null };
  return {
    ok: false,
    data: null,
    raw,
    reason: j?.error?.data?.game?.reason ?? j?.error?.message ?? 'ERROR',
    game: j?.error?.data?.game ?? null,
  };
};
const mutate = (api: Api, proc: string, data: object = {}) =>
  api.post(`/api/trpc/${proc}`, { data }).then(parse);
const read = (api: Api, proc: string, input?: object) =>
  api.get(`/api/trpc/${proc}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`).then(parse);
const hook = async (api: Api, path: string, data: object = {}) => {
  const r = await api.post(`/api/test/${path}`, { data });
  expect(r.ok(), `${path}: ${await r.text()}`).toBe(true);
  return (await r.json()) as any;
};
const uuid = () => crypto.randomUUID();
const advanceTo = async (api: Api, cityId: string, cycleDay: number) => {
  await hook(api, 'clock', { advanceTo: { cityId, cycleDay } });
  await hook(api, 'city-day');
};

type Party = 'holm' | 'stahl' | 'grey';
async function memberContext(
  browser: Browser,
  party: Party,
  name: string,
  seed: object = {},
  viewport = { width: 1440, height: 900 },
): Promise<BrowserContext> {
  const baseURL = test.info().project.use.baseURL as string;
  const ctx = await browser.newContext({ baseURL, viewport });
  const api = ctx.request;
  const email = `qav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const su = await api.post('/api/auth/sign-up/email', {
    data: { email, password: 'e2e-password-123', name },
    headers: { origin: baseURL },
  });
  expect(su.ok(), 'sign-up').toBe(true);
  const faces = (await read(api, 'arrival.faces')).data as Array<{ id: string }>;
  expect((await mutate(api, 'arrival.start', { avatarId: faces[3]!.id })).ok).toBe(true);
  for (const [questionId, answerId] of [
    ['origin.platform', party],
    ['origin.suitcase', 'books'],
    ['origin.lining', 'ward-book'],
  ] as const) {
    const a = await mutate(api, 'arrival.answer', { questionId, answerId });
    expect(a.ok, `answer ${questionId}: ${a.reason}`).toBe(true);
  }
  expect((await mutate(api, 'arrival.join', {})).ok).toBe(true);
  if (Object.keys(seed).length > 0) await hook(api, 'character', seed);
  return ctx;
}
const member = async (browser: Browser, party: Party, name: string, seed: object = {}) =>
  (await memberContext(browser, party, name, seed)).request;

const ids = (cards: Array<{ ordinanceId: string }>) => cards.map((c) => c.ordinanceId);
const NAMES = ['Aenne', 'Bruno', 'Clemens', 'Dora', 'Emil', 'Frieda', 'Gustav', 'Hanna'];

let stander: Api; // Collective, Rank 3, Known, 45 PC: stands in Coalport on day 0.
let candidacyId = '';
let cards: string[] = [];
let backerApis: Api[] = [];

// ---------------------------------------------------------------------------------------------
// Standing: the refusals, a double tap, a burst.
// ---------------------------------------------------------------------------------------------

test('stand: the refusals name the reason (rank, Known, Political Capital) and day 2 is closed', async ({ browser }) => {
  stander = await member(browser, 'holm', 'Sieglinde Stand', {});
  await advanceTo(stander, 'coalport', 0);
  const rookie = await member(browser, 'holm', 'Rudi Rookie');
  expect((await mutate(rookie, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: uuid() })).reason).toBe(
    'RANK_TOO_LOW',
  );
  const r2 = await member(browser, 'holm', 'Rita Zwei', { fxp: 400, successes: 40 });
  expect((await mutate(r2, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: uuid() })).reason).toBe(
    'RANK_TOO_LOW',
  );
  const unknown = await member(browser, 'holm', 'Udo Unknown', { fxp: 2000, successes: 5, pc: 45 });
  const nk = await mutate(unknown, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: uuid() });
  expect(nk.reason).toBe('NOT_KNOWN');
  const poor = await member(browser, 'holm', 'Pia Poor', { fxp: 2000, successes: 40, pc: 9 });
  const np = await mutate(poor, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: uuid() });
  expect(np.reason).toBe('NOT_ENOUGH_PC');
  const exact = await member(browser, 'holm', 'Egon Exact', { fxp: 2000, successes: 40, pc: 10 });
  const ok = await mutate(exact, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: uuid() });
  expect(ok.ok, ok.reason ?? '').toBe(true);
  expect(ok.data.knockOns.pc).toEqual({ before: 10, after: 0 });
});

test('stand: a double tap and a burst of five keys make one candidacy and one 10 PC charge', async () => {
  await hook(stander, 'character', { fxp: 2000, successes: 30, pc: 45 });
  const key = uuid();
  const keys = [key, key, uuid(), uuid(), uuid(), uuid()];
  const burst = await Promise.all(
    keys.map((k) => mutate(stander, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: k })),
  );
  const oks = burst.filter((r) => r.ok);
  expect(oks.length, JSON.stringify(burst.map((r) => r.reason))).toBeGreaterThanOrEqual(1);
  expect(new Set(oks.map((r) => r.raw)).size, 'whoever wins, it is one effect').toBe(1);
  for (const r of burst.filter((x) => !x.ok)) expect(['ALREADY_FILED', 'VERSION_CONFLICT', 'CONFLICT']).toContain(r.reason);
  const winnerKey = keys[burst.findIndex((r) => r.ok)]!;
  const me = await read(stander, 'character.me');
  expect(me.data.pc, 'one 10 PC charge').toBe(35);
  const e = await read(stander, 'council.election');
  candidacyId = e.data.candidacy.candidacyId;
  expect(candidacyId).toMatch(/^[0-9a-f]{24}$/);
  // A replay of the first key returns the stored modal, byte for byte.
  const replay = await mutate(stander, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: winnerKey });
  expect(replay.raw).toBe(oks[0]!.raw);
  expect((await read(stander, 'character.me')).data.pc).toBe(35);
  // A different rule under a new key does not stand again, and charges nothing.
  const again = await mutate(stander, 'council.declare', { ordinanceId: 'ord.rest-day', idempotencyKey: uuid() });
  expect(again.reason).toBe('ALREADY_FILED');
  expect((await read(stander, 'character.me')).data.pc).toBe(35);
});

// ---------------------------------------------------------------------------------------------
// Backing: self, twice, a rank, a burst, six backers (five count).
// ---------------------------------------------------------------------------------------------

test('back: self, rank 1, twice and a burst; six backers are public but only five count (+15)', async ({ browser }) => {
  // The candidate cannot back themself.
  const self = await mutate(stander, 'council.endorse', { candidacyId, idempotencyKey: uuid() });
  expect(self.reason).toBe('CANNOT_ENDORSE_SELF');
  const rookie = await member(browser, 'holm', 'Ralf Rookie', { pc: 30 });
  expect((await mutate(rookie, 'council.endorse', { candidacyId, idempotencyKey: uuid() })).reason).toBe('RANK_TOO_LOW');
  // Six Rank 2 members with 10 PC each back; the first one taps twice (two keys) at once.
  backerApis = [];
  for (let i = 0; i < 6; i++) backerApis.push(await member(browser, 'holm', `${NAMES[i]} Backer`, { fxp: 400, pc: 10 }));
  const first = backerApis[0]!;
  const twice = await Promise.all([
    mutate(first, 'council.endorse', { candidacyId, idempotencyKey: uuid() }),
    mutate(first, 'council.endorse', { candidacyId, idempotencyKey: uuid() }),
  ]);
  expect(twice.filter((r) => r.ok)).toHaveLength(1);
  expect(['ALREADY_ENDORSED', 'VERSION_CONFLICT', 'CONFLICT']).toContain(twice.find((r) => !r.ok)!.reason);
  expect((await read(first, 'character.me')).data.pc, 'charged once').toBe(0);
  // Not enough Political Capital.
  const broke = await member(browser, 'holm', 'Berta Broke', { fxp: 400, pc: 9 });
  expect((await mutate(broke, 'council.endorse', { candidacyId, idempotencyKey: uuid() })).reason).toBe('NOT_ENOUGH_PC');
  // The other five, all at once.
  const rest = await Promise.all(
    backerApis.slice(1).map((a) => mutate(a, 'council.endorse', { candidacyId, idempotencyKey: uuid() })),
  );
  for (const r of rest) expect(r.ok, r.reason ?? '').toBe(true);
  expect(rest.map((r) => r.data.knockOns.backers.n).sort()).toEqual([2, 3, 4, 5, 6]);
  // The slate says six backers; the sixth does not count.
  const e = await read(stander, 'council.election');
  expect(e.data.candidacy.backers.n).toBe(6);
});

// ---------------------------------------------------------------------------------------------
// A councillor's rule: a burst, unknown, and not a councillor.
// ---------------------------------------------------------------------------------------------

test('setRule: unknown rule, not a councillor, a burst of keys ends on one rule, no charge', async ({ browser }) => {
  expect((await mutate(stander, 'council.setRule', { ordinanceId: 'ord.rest-day', idempotencyKey: uuid() })).reason).toBe(
    'NOT_COUNCILLOR',
  );
  const clara = await member(browser, 'holm', 'Clara Rule', { fxp: 2000, successes: 30, pc: 50 });
  await hook(clara, 'seat');
  expect((await mutate(clara, 'council.setRule', { ordinanceId: 'ord.nothing', idempotencyKey: uuid() })).reason).toBe(
    'UNKNOWN_ORDINANCE',
  );
  const rules = ['ord.rest-day', 'ord.street-register', 'ord.public-meetings', 'ord.open-doors', 'ord.rest-day'];
  const burst = await Promise.all(
    rules.map((o) => mutate(clara, 'council.setRule', { ordinanceId: o, idempotencyKey: uuid() })),
  );
  for (const r of burst) expect(r.ok, r.reason ?? '').toBe(true);
  // Whatever the order, the stored rule is one of the five and the Political Capital is untouched.
  const b = await read(clara, 'council.ballot');
  expect(rules).toContain(b.data.myRule.ordinanceId);
  expect((await read(clara, 'character.me')).data.pc).toBe(50);
  const same = await mutate(clara, 'council.setRule', { ordinanceId: b.data.myRule.ordinanceId, idempotencyKey: uuid() });
  expect(same.ok, 'the same rule again is a renewal').toBe(true);
});

// ---------------------------------------------------------------------------------------------
// The windows: days 0–1 closed to the vote, day 2 closed to standing, day 2 closed to setRule.
// ---------------------------------------------------------------------------------------------

test('windows: no vote on days 0–1 (NOT_POLLING); on day 2 no standing, no rule change', async ({ browser }) => {
  const voter = await member(browser, 'holm', 'Vera Voter', { fxp: 400 });
  const b0 = await read(voter, 'council.ballot');
  expect(b0.data.status).toBe('provisional');
  expect(b0.data.canVote).toBe(false);
  const v0 = await mutate(voter, 'council.vote', { ordinanceId: b0.data.cards[0].ordinanceId, idempotencyKey: uuid() });
  expect(v0.reason).toBe('NOT_POLLING');
  await advanceTo(voter, 'coalport', 1);
  const v1 = await mutate(voter, 'council.vote', { ordinanceId: b0.data.cards[0].ordinanceId, idempotencyKey: uuid() });
  expect(v1.reason).toBe('NOT_POLLING');
  // A backing is open on day 1 as on day 0.
  await advanceTo(voter, 'coalport', 2);
  const late = await member(browser, 'holm', 'Lars Late', { fxp: 2000, successes: 40, pc: 45 });
  const d2 = await mutate(late, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: uuid() });
  expect(d2.reason).toBe('NOT_NOMINATIONS');
  const set = await mutate(stander, 'council.setRule', { ordinanceId: 'ord.rest-day', idempotencyKey: uuid() });
  expect(['NOT_COUNCILLOR', 'RULE_WINDOW_CLOSED']).toContain(set.reason);
  const b = await read(voter, 'council.ballot');
  expect(b.data.status).toBe('set');
  expect(b.data.canVote).toBe(true);
  cards = ids(b.data.cards);
  expect(new Set(cards).size).toBe(3);
});

// ---------------------------------------------------------------------------------------------
// The vote: a double tap, a burst, a three-way tie.
// ---------------------------------------------------------------------------------------------

test('vote: a burst of six keys over three cards is one vote; the same key twice is one body', async ({ browser }) => {
  const v1 = await member(browser, 'holm', 'Viktor Eins', { fxp: 400 });
  const burst = await Promise.all(
    cards.flatMap((c) => [0, 1].map(() => mutate(v1, 'council.vote', { ordinanceId: c, idempotencyKey: uuid() }))),
  );
  expect(burst.filter((r) => r.ok), JSON.stringify(burst.map((r) => r.reason))).toHaveLength(1);
  for (const r of burst.filter((x) => !x.ok)) expect(['ALREADY_VOTED', 'VERSION_CONFLICT', 'CONFLICT']).toContain(r.reason);
  const chosen = burst.find((r) => r.ok)!.data.view.ballot.myVote.ordinanceId as string;
  // The morale moved once (+0.5), whatever the burst.
  expect(burst.filter((r) => r.ok && r.data.knockOns.morale)).toHaveLength(1);
  const key = uuid();
  const v2 = await member(browser, 'holm', 'Vroni Zwei', { fxp: 400 });
  const same = await Promise.all([0, 1, 2].map(() => mutate(v2, 'council.vote', { ordinanceId: cards[2]!, idempotencyKey: key })));
  expect(same.every((r) => r.ok)).toBe(true);
  expect(new Set(same.map((r) => r.raw)).size).toBe(1);
  // A third voter votes on day 4 (the last day), for a third card: a three-way tie, card 1 or the earlier.
  await advanceTo(v1, 'coalport', 4);
  const v3 = await member(browser, 'holm', 'Valentin Drei', { fxp: 400 });
  const rest = cards.filter((c) => c !== chosen && c !== cards[2]);
  const last = await mutate(v3, 'council.vote', { ordinanceId: rest[0] ?? cards[0]!, idempotencyKey: uuid() });
  expect(last.ok, last.reason ?? '').toBe(true);
  // Backing is still open on day 4 (until the count); the stander keeps six backers.
  const lateBack = await member(browser, 'holm', 'Gerda Spaet', { fxp: 400, pc: 10 });
  const lb = await mutate(lateBack, 'council.endorse', { candidacyId, idempotencyKey: uuid() });
  expect(lb.ok, lb.reason ?? '').toBe(true);
  expect(lb.data.knockOns.backers.n).toBe(7);
});

test('the count: seats = local support + 3 × at most five backers; a three-way tie goes to card 1; five days', async () => {
  await advanceTo(stander, 'coalport', 0);
  const count = await read(stander, 'council.count');
  expect(count.ok, count.reason ?? '').toBe(true);
  const row = count.data.council.find((r: any) => r.you);
  expect(row, 'the stander is on the result').toBeTruthy();
  // Seven member backers: only five count.
  expect(row.wardVote).toBe(Math.floor(30 / 5));
  expect(row.total).toBe(row.wardVote + 3 * 5);
  expect(row.backers).toBe(7);
  expect(count.data.rule.how).toBe('tie');
  expect(count.data.rule.cards[0].ordinanceId, 'the first card takes a tie').toBe(cards[0]);
  expect(count.data.rule.turnout.voters).toBe(3);
  // The rule runs five days: 5 on the count morning, then 4, 3, 2, 1.
  const left: number[] = [];
  for (let d = 0; d <= 4; d++) {
    if (d > 0) await advanceTo(stander, 'coalport', d);
    const c = await read(stander, 'city.get', { cityId: 'coalport' });
    left.push(c.data.election.inForce.daysLeft);
    expect(c.data.election.inForce.ordinanceId).toBe(cards[0]);
  }
  expect(left).toEqual([5, 4, 3, 2, 1]);
  // After the window the vote of that cycle has been counted and a new rule is in force.
  await advanceTo(stander, 'coalport', 0);
  const c2 = await read(stander, 'city.get', { cityId: 'coalport' });
  expect(c2.data.election.inForce.daysLeft).toBe(5);
  expect(c2.data.election.inForce.how).toBe('fallback');
});

// ---------------------------------------------------------------------------------------------
// Unrest: the party's card is off; with no votes card 1 of the councillors' runs.
// ---------------------------------------------------------------------------------------------

test("Unrest: no votes → the first councillor card runs, and the count says it was Unrest's", async ({ browser }) => {
  const kurt = await member(browser, 'stahl', 'Kurt Unrest', { fxp: 400 });
  const rival = await member(browser, 'grey', 'Ida Rival', { fxp: 400 });
  await advanceTo(kurt, 'duskwall', 1);
  await hook(rival, 'unrest', { cityId: 'duskwall', share: 55 });
  await advanceTo(kurt, 'duskwall', 2);
  const b = await read(kurt, 'council.ballot');
  expect(b.data.cards).toHaveLength(3);
  expect(b.data.cards.some((c: any) => c.whose.kind === 'party')).toBe(false);
  const card1 = b.data.cards[0];
  await advanceTo(kurt, 'duskwall', 0);
  const count = await read(kurt, 'council.count');
  expect(count.data.rule.how).toBe('fallback');
  expect(count.data.rule.cards[0].ordinanceId).toBe(card1.ordinanceId);
  const city = await read(kurt, 'city.get', { cityId: 'duskwall' });
  expect(city.data.election.inForce.how).toBe('fallback');
  expect(city.data.election.inForce.daysLeft).toBe(5);
  test.info().annotations.push({ type: 'unrest-fallback-card', description: JSON.stringify(city.data.election.result) });
  test.info().annotations.push({ type: 'unrest-fallback-in-force', description: JSON.stringify(city.data.election.inForce) });
});
