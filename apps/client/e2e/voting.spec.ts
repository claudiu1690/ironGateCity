/* eslint-disable @typescript-eslint/no-explicit-any -- the tests read untyped tRPC JSON (views of many shapes) */
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Browser } from '@playwright/test';

/**
 * The voting rework (docs/tech/voting-rework.md §15.2): the town votes on a rule. Phase 2's **API**
 * block, through tRPC and the test hooks: stand without backers; a councillor's rule (days 0–1, then
 * `RULE_WINDOW_CLOSED`); the set; the vote (`NOT_ON_BALLOT`, a key replayed byte for byte, a second key
 * `ALREADY_VOTED`, Rank 1 refused); secrecy on the wire during the vote; backing on day 3 counted at the
 * count; a 2–2 tie to the earlier card; no votes → card 1 (the fallback); most votes wins (3–1); Unrest
 * takes the party's card off. The screens' cases join in phases 3–5. One serial project, last in the
 * chain: it moves the shared clock by cycles.
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
/** To the next 09:00 of a cycle day in a city, then the worker's boundary job. */
const advanceTo = async (api: Api, cityId: string, cycleDay: number) => {
  await hook(api, 'clock', { advanceTo: { cityId, cycleDay } });
  await hook(api, 'city-day');
};

/** A new member by the API: the counter's row for the party, books, the unit's list. */
async function member(
  browser: Browser,
  party: 'holm' | 'stahl' | 'grey',
  name: string,
  seed: object = {},
): Promise<Api> {
  const baseURL = test.info().project.use.baseURL as string;
  const ctx = await browser.newContext({ baseURL });
  const api = ctx.request;
  const email = `vote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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
  return api;
}

const ids = (cards: Array<{ ordinanceId: string }>) => cards.map((c) => c.ordinanceId);

let mara: Api; // Collective, Rank 3: stands in Coalport, votes there.
let otto: Api; // Collective, Rank 2: backs Mara on day 3.
let clara: Api; // Collective, Rank 3: seated, sets her rule.
let candidacyId = '';
let coalportCards: string[] = [];

test('stand: Rank 3 and Known, 10 Political Capital spent, a rule, no backers needed', async ({ browser }) => {
  mara = await member(browser, 'holm', 'Mara Lenk', {});
  await advanceTo(mara, 'coalport', 0);
  await hook(mara, 'character', { fxp: 2000, successes: 30, pc: 45 });
  const e = await read(mara, 'council.election');
  expect(e.ok, e.reason ?? '').toBe(true);
  expect(e.data.stand.canStand).toBe(true);
  expect(e.data.stand.requirements.map((r: any) => r.id)).toEqual(['rank', 'known']);
  expect(e.data.stand.menu[0].ordinanceId).toBe(e.data.stand.defaultRule);

  const bogus = await mutate(mara, 'council.declare', { ordinanceId: 'ord.nothing', idempotencyKey: uuid() });
  expect(bogus.reason).toBe('UNKNOWN_ORDINANCE');
  const stood = await mutate(mara, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: uuid() });
  expect(stood.ok, stood.reason ?? '').toBe(true);
  expect(stood.data.act).toBe('declare');
  expect(stood.data.knockOns.pc).toEqual({ before: 45, after: 35 });
  const cand = stood.data.view.election.candidacy;
  expect(cand.rule.ordinanceId).toBe('ord.street-fund');
  expect(cand.backers.n).toBe(0);
  candidacyId = cand.candidacyId;
  const again = await mutate(mara, 'council.declare', { ordinanceId: 'ord.street-fund', idempotencyKey: uuid() });
  expect(again.reason).toBe('ALREADY_FILED');
});

test("a councillor's rule: free on days 0–1, replayed by its key; NOT_COUNCILLOR otherwise", async ({ browser }) => {
  clara = await member(browser, 'holm', 'Clara Holm', { fxp: 2000, successes: 30 });
  const refused = await mutate(clara, 'council.setRule', { ordinanceId: 'ord.reading-room', idempotencyKey: uuid() });
  expect(refused.reason).toBe('NOT_COUNCILLOR');
  await hook(clara, 'seat');
  const key = uuid();
  const set = await mutate(clara, 'council.setRule', { ordinanceId: 'ord.reading-room', idempotencyKey: key });
  expect(set.ok, set.reason ?? '').toBe(true);
  expect(set.data.act).toBe('setRule');
  expect(set.data.view.kind).toBe('hall');
  expect(set.data.view.hall.councillor.rule.ordinanceId).toBe('ord.reading-room');
  const replay = await mutate(clara, 'council.setRule', { ordinanceId: 'ord.reading-room', idempotencyKey: key });
  expect(replay.raw).toBe(set.raw);
  const b = await read(clara, 'council.ballot');
  expect(b.data.status).toBe('provisional');
  expect(b.data.myRule).toMatchObject({ ordinanceId: 'ord.reading-room', onBallot: true });
  expect(b.data.myRule.changeUntil).toBe(b.data.setAt);
});

test('the set and the vote: NOT_ON_BALLOT, one key twice, a second key ALREADY_VOTED, Rank 1 refused', async ({
  browser,
}) => {
  await advanceTo(mara, 'coalport', 2);
  const closed = await mutate(clara, 'council.setRule', { ordinanceId: 'ord.rest-day', idempotencyKey: uuid() });
  expect(closed.reason).toBe('RULE_WINDOW_CLOSED');
  expect(typeof closed.game?.opensAt).toBe('number');

  const b = await read(mara, 'council.ballot');
  expect(b.data.status).toBe('set');
  expect(b.data.cards).toHaveLength(3);
  expect(b.data.canVote).toBe(true);
  coalportCards = ids(b.data.cards);
  expect(new Set(coalportCards).size).toBe(3);
  expect(coalportCards).toContain('ord.reading-room');
  expect(b.data.cards[0].whose.kind).toBe('party');

  const notOn = ['ord.tram-subsidy', 'ord.open-doors', 'ord.rest-day'].find((x) => !coalportCards.includes(x))!;
  const refused = await mutate(mara, 'council.vote', { ordinanceId: notOn, idempotencyKey: uuid() });
  expect(refused.reason).toBe('NOT_ON_BALLOT');

  const key = uuid();
  const v = await mutate(mara, 'council.vote', { ordinanceId: coalportCards[1], idempotencyKey: key });
  expect(v.ok, v.reason ?? '').toBe(true);
  expect(v.data.act).toBe('ballot');
  expect(v.data.view.kind).toBe('ballot');
  expect(v.data.view.ballot.myVote.ordinanceId).toBe(coalportCards[1]);
  const replay = await mutate(mara, 'council.vote', { ordinanceId: coalportCards[1], idempotencyKey: key });
  expect(replay.raw).toBe(v.raw);
  const twice = await mutate(mara, 'council.vote', { ordinanceId: coalportCards[2], idempotencyKey: uuid() });
  expect(twice.reason).toBe('ALREADY_VOTED');
  expect(twice.game?.ordinanceId).toBe(coalportCards[1]);

  const rookie = await member(browser, 'holm', 'Rudi Neu');
  const rank1 = await mutate(rookie, 'council.vote', { ordinanceId: coalportCards[0], idempotencyKey: uuid() });
  expect(rank1.reason).toBe('RANK_TOO_LOW');
});

test('secrecy on the wire during the vote: no tally, no count, nobody else’s choice', async ({ browser }) => {
  otto = await member(browser, 'holm', 'Otto Brandt', { fxp: 400, pc: 20 });
  for (const api of [mara, otto]) {
    for (const [proc, input] of [
      ['council.ballot', undefined],
      ['council.hall', { cityId: 'coalport' }],
      ['paper.today', undefined],
      ['city.get', { cityId: 'coalport' }],
    ] as const) {
      const r = await read(api, proc, input);
      expect(r.ok, `${proc}: ${r.reason}`).toBe(true);
      expect(r.raw, proc).not.toContain('"tallies"');
      expect(r.raw, proc).not.toMatch(/"ballots":/);
    }
  }
  const ob = await read(otto, 'council.ballot');
  expect(ob.data.myVote).toBeNull();
  expect(ob.data.cards.some((c: any) => c.yourVote)).toBe(false);
});

test('backing on day 3 counts +3 at the count; a 2–2 tie between cards 2 and 3 goes to card 2', async () => {
  await advanceTo(mara, 'coalport', 3);
  const backed = await mutate(otto, 'council.endorse', { candidacyId, idempotencyKey: uuid() });
  expect(backed.ok, backed.reason ?? '').toBe(true);
  expect(backed.data.knockOns.backers).toMatchObject({ name: 'Mara Lenk', n: 1 });
  // Mara's vote is card 2's first; one more for card 2 and two for card 3: level at two.
  await hook(mara, 'rule-votes', { votes: { [coalportCards[1]!]: 1, [coalportCards[2]!]: 2 } });

  await advanceTo(mara, 'coalport', 0);
  const count = await read(mara, 'council.count');
  expect(count.ok, count.reason ?? '').toBe(true);
  expect(count.data.rule.how).toBe('tie');
  expect(count.data.rule.cards[0]).toMatchObject({ ordinanceId: coalportCards[1], won: true, votes: 2 });
  expect(count.data.rule.cards.find((c: any) => c.ordinanceId === coalportCards[2]).votes).toBe(2);
  const row = count.data.council.find((r: any) => r.you);
  expect(row.backers).toBe(1);
  expect(row.total).toBe(row.wardVote + 3);
  const me = await read(mara, 'city.get', { cityId: 'coalport' });
  expect(me.data.election.inForce).toMatchObject({ ordinanceId: coalportCards[1], how: 'tie', daysLeft: 5 });
});

test('no votes: card 1 runs from the count for five days (the fallback)', async ({ browser }) => {
  const ida = await member(browser, 'grey', 'Ida Grau', { fxp: 400 });
  await advanceTo(ida, 'ashford', 0);
  await advanceTo(ida, 'ashford', 2);
  const b = await read(ida, 'council.ballot');
  expect(b.data.status).toBe('set');
  const card1 = b.data.cards[0].ordinanceId as string;
  await advanceTo(ida, 'ashford', 0);
  const count = await read(ida, 'council.count');
  expect(count.data.rule.how).toBe('fallback');
  expect(count.data.rule.cards[0]).toMatchObject({ ordinanceId: card1, won: true, votes: 0 });
  const city = await read(ida, 'city.get', { cityId: 'ashford' });
  expect(city.data.election.inForce).toMatchObject({ ordinanceId: card1, how: 'fallback', daysLeft: 5 });
});

test('most votes wins: three for card 3 and one for card 1', async ({ browser }) => {
  const kurt = await member(browser, 'stahl', 'Kurt Stahl', { fxp: 400 });
  await advanceTo(kurt, 'duskwall', 0);
  await advanceTo(kurt, 'duskwall', 2);
  const b = await read(kurt, 'council.ballot');
  const cards = ids(b.data.cards);
  await hook(kurt, 'rule-votes', { votes: { [cards[2]!]: 3, [cards[0]!]: 1 } });
  await advanceTo(kurt, 'duskwall', 0);
  const count = await read(kurt, 'council.count');
  expect(count.data.rule.how).toBe('votes');
  expect(count.data.rule.cards[0]).toMatchObject({ ordinanceId: cards[2], won: true, votes: 3 });
  expect(count.data.rule.turnout.voters).toBe(4);
  const city = await read(kurt, 'city.get', { cityId: 'duskwall' });
  expect(city.data.election.inForce).toMatchObject({ ordinanceId: cards[2], how: 'votes', votes: 3 });
});

test("Unrest: the party's card comes off the ballot at the set (three councillors' cards)", async () => {
  await advanceTo(mara, 'duskwall', 1);
  await hook(mara, 'unrest', { cityId: 'duskwall', share: 55 });
  await advanceTo(mara, 'duskwall', 2);
  const b = await read(mara, 'council.ballot', { cityId: 'duskwall' });
  expect(b.ok, b.reason ?? '').toBe(true);
  expect(b.data.status).toBe('set');
  expect(b.data.cards).toHaveLength(3);
  expect(b.data.cards.some((c: any) => c.whose.kind === 'party')).toBe(false);
  expect(b.data.canVote).toBe(false);
  expect(b.data.reason).toBe('NOT_RESIDENT');
});
