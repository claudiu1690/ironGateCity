/* eslint-disable @typescript-eslint/no-explicit-any -- the tests read untyped tRPC JSON (views of many shapes) */
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * QA of the voting rework, the capital (docs/qa/voting-rework-report.md): councillors of two parties
 * who name the same rule share one card (both crests); the councillor below the bloc's top seat reads
 * *your party's card is set*; the ballot at 390 × 844 with a councillor's card; the count: the rule is
 * the card with the most seats behind it (shared seats add up), three party rows per district with
 * *· shared*, no score column. Screenshots under docs/qa/voting-rework/, text under QA_VOTING_TEXT.
 */

test.describe.configure({ mode: 'serial' });

const OUT = process.env.QA_VOTING_SHOTS ?? join(process.cwd(), '..', '..', 'docs', 'qa', 'voting-rework');
const TEXT = process.env.QA_VOTING_TEXT ?? join(process.cwd(), 'test-results', 'qa-voting-text');
mkdirSync(OUT, { recursive: true });
mkdirSync(TEXT, { recursive: true });
const V = process.env.QA_CAPITAL_DISTINCT ? 'b' : '';
const PHONE = { width: 390, height: 844 };
const DESK = { width: 1440, height: 900 };

type Api = APIRequestContext;
const parse = async (r: Awaited<ReturnType<Api['get']>>) => {
  const raw = await r.text();
  const j = (() => {
    try {
      return JSON.parse(raw) as any;
    } catch {
      return {};
    }
  })();
  return j?.result
    ? { ok: true, data: j.result.data as any, raw, reason: null as string | null }
    : { ok: false, data: null as any, raw, reason: (j?.error?.data?.game?.reason ?? j?.error?.message ?? 'ERROR') as string };
};
const mutate = (api: Api, proc: string, data: object = {}) => api.post(`/api/trpc/${proc}`, { data }).then(parse);
const read = (api: Api, proc: string, input?: object) =>
  api.get(`/api/trpc/${proc}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`).then(parse);
const hook = async (api: Api, path: string, data: object = {}) => {
  const r = await api.post(`/api/test/${path}`, { data });
  expect(r.ok(), `${path}: ${await r.text()}`).toBe(true);
  return (await r.json()) as any;
};
const uuid = () => crypto.randomUUID();
const advanceTo = async (api: Api, cycleDay: number) => {
  await hook(api, 'clock', { advanceTo: { cityId: 'irongate', cycleDay } });
  await hook(api, 'city-day');
};

type Party = 'holm' | 'stahl' | 'grey';
async function memberContext(browser: Browser, party: Party, name: string, seed: object = {}): Promise<BrowserContext> {
  const baseURL = test.info().project.use.baseURL as string;
  const ctx = await browser.newContext({ baseURL, viewport: PHONE });
  const api = ctx.request;
  const email = `qac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  expect(
    (
      await api.post('/api/auth/sign-up/email', {
        data: { email, password: 'e2e-password-123', name },
        headers: { origin: baseURL },
      })
    ).ok(),
  ).toBe(true);
  const faces = (await read(api, 'arrival.faces')).data as Array<{ id: string }>;
  expect((await mutate(api, 'arrival.start', { avatarId: faces[3]!.id })).ok).toBe(true);
  for (const [questionId, answerId] of [
    ['origin.platform', party],
    ['origin.suitcase', 'books'],
    ['origin.lining', 'ward-book'],
  ] as const) {
    expect((await mutate(api, 'arrival.answer', { questionId, answerId })).ok).toBe(true);
  }
  expect((await mutate(api, 'arrival.join', {})).ok).toBe(true);
  if (Object.keys(seed).length > 0) await hook(api, 'character', seed);
  return ctx;
}

const texts: Record<string, string> = {};
const flush = () => writeFileSync(join(TEXT, `capital-texts${V}.json`), JSON.stringify(texts, null, 1));
const modalOf = (p: Page) => p.getByRole('dialog').filter({ has: p.getByTestId('stamp') });

async function shot(page: Page, url: string, name: string, sizes = [PHONE, DESK], full = false) {
  for (const s of sizes) {
    await page.setViewportSize(s);
    await page.goto(url);
    await page.waitForTimeout(1500);
    const key = `${name}${V}-${s.width === 390 ? 'm' : s.width === 1440 ? 'd' : s.width + 'x' + s.height}`;
    await page.screenshot({ path: join(OUT, `${key}.png`), fullPage: full });
    texts[key] = await page.evaluate(() => document.body.innerText);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) texts[`${key}-OVERFLOW`] = String(overflow);
  }
  flush();
}

let ilse: BrowserContext; // Collective, leads the bloc (top seat)
let jana: BrowserContext; // Collective, second seat
let kurt: BrowserContext; // Vanguard, names the same rule as Ilse: a shared card
let eva: BrowserContext; // Alliance, Rank 2 in Eastside
let districtOf = new Map<string, string>();

test('the capital, day 0: councillors of two parties name the same rule; the third reads the party card is set', async ({ browser }) => {
  test.setTimeout(300_000);
  ilse = await memberContext(browser, 'holm', 'Ilse Brandt');
  jana = await memberContext(browser, 'holm', 'Jana Varga');
  kurt = await memberContext(browser, 'stahl', 'Kurt Hofer');
  eva = await memberContext(browser, 'grey', 'Eva Moser');
  await advanceTo(ilse.request, 0);
  await hook(ilse.request, 'character', { level: 10, fxp: 500, cityId: 'irongate' });
  const hall = await read(ilse.request, 'council.hall', { cityId: 'irongate' });
  const byFaction = new Map<string, any[]>();
  for (const s of hall.data.seats as any[]) {
    if (s.kind === 'npc' && s.factionId && s.districtName) byFaction.set(s.factionId, [...(byFaction.get(s.factionId) ?? []), s]);
  }
  const city = await read(ilse.request, 'city.get', { cityId: 'irongate' });
  for (const d of city.data.districts as any[]) districtOf.set(d.name, d.id);
  const seatIn = async (c: BrowserContext, s: any) => {
    await hook(c.request, 'character', {
      level: 10,
      fxp: 500,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: districtOf.get(s.districtName) },
    });
    await hook(c.request, 'seat', { seat: s.seat });
  };
  const col = byFaction.get('collective')!;
  const van = byFaction.get('vanguard')!;
  await seatIn(ilse, col[0]);
  await seatIn(jana, col[1]);
  await seatIn(kurt, van[0]);
  // Eva (Alliance, Rank 2) lives in Eastside.
  await hook(eva.request, 'character', {
    level: 10,
    fxp: 500,
    cityId: 'irongate',
    residence: { cityId: 'irongate', districtId: districtOf.get('Eastside') },
  });
  const one = await read(ilse.request, 'council.ballot', { cityId: 'irongate' });
  const two = await read(jana.request, 'council.ballot', { cityId: 'irongate' });
  const ilseLeads = one.data.myRule.onBallot as boolean;
  texts['ilse-leads'] = String(ilseLeads);
  // Both name Street Fund: the leader's rule is the party's card; the Vanguard's councillor names the same.
  for (const [c, rule] of [
    [ilse, 'ord.street-fund'],
    [jana, 'ord.rest-day'],
    [kurt, process.env.QA_CAPITAL_DISTINCT ? 'ord.public-works' : 'ord.street-fund'],
  ] as const) {
    const r = await mutate(c.request, 'council.setRule', { ordinanceId: rule, idempotencyKey: uuid() });
    expect(r.ok, r.reason ?? '').toBe(true);
  }
  const b = await read(eva.request, 'council.ballot', { cityId: 'irongate' });
  texts['capital-provisional-cards'] = JSON.stringify(
    b.data.cards.map((c: any) => [c.name, c.whose.factionIds, c.whose.by, c.whose.via]),
  );
  // Cards on day 0: one per party, equal rules merged.
  const ids = new Set((b.data.cards as any[]).map((c) => c.ordinanceId));
  expect(ids.size).toBe(b.data.cards.length);
  flush();
});

test('the capital, day 2: the ballot (shared card, two crests), the card, the geometry at 390 × 844, one vote', async () => {
  test.setTimeout(300_000);
  await advanceTo(eva.request, 2);
  const pe = await eva.newPage();
  const b = await read(eva.request, 'council.ballot', { cityId: 'irongate' });
  texts['capital-set-cards'] = JSON.stringify(b.data.cards.map((c: any) => [c.name, c.whose.factionIds, c.whose.by, c.whose.via]));
  const shared = (b.data.cards as any[]).find((c) => c.whose.factionIds.length > 1);
  texts['capital-has-shared-card'] = String(!!shared);
  // The geometry first as the day's first screen (the Clarion strip up), then after the paper is read.
  await pe.setViewportSize(PHONE);
  await pe.goto('/council/ballot');
  await expect(pe.getByTestId('rule-card').first()).toBeVisible();
  await pe.waitForTimeout(1200);
  texts['capital-ballot-geometry-paper-unread-390x844'] = JSON.stringify(
    await pe.evaluate(() => ({
      strip: document.body.innerText.includes('IS IN'),
      bottoms: Array.from(document.querySelectorAll('[data-testid=rule-card]')).map((e) => Math.round(e.getBoundingClientRect().bottom * 10) / 10),
      barTop: Math.round(document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect().top * 10) / 10,
    })),
  );
  await pe.goto('/paper');
  await pe.waitForTimeout(1500);
  await shot(pe, '/council/ballot', '60-capital-ballot');
  // The geometry: every card above the sticky bar at 390 × 844?
  await pe.setViewportSize(PHONE);
  await pe.goto('/council/ballot');
  await expect(pe.getByTestId('rule-card').first()).toBeVisible();
  const g = await pe.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-testid=rule-card]')).map((e) => e.getBoundingClientRect());
    const bar = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
    const whose = Array.from(document.querySelectorAll('[data-testid=rule-card-whose]')).map((e) => e.getBoundingClientRect().height);
    return { bottoms: cards.map((r) => Math.round(r.bottom * 10) / 10), barTop: Math.round(bar.top * 10) / 10, whoseHeights: whose.map(Math.round) };
  });
  texts['capital-ballot-geometry-390x844'] = JSON.stringify(g);
  texts['capital-ballot-line'] = await pe.getByTestId('ballot-line').innerText();
  // The Election card on the district page and in the paper.
  await shot(pe, '/city/irongate/irongate.eastside', '61-capital-card', [PHONE, DESK]);
  await pe.setViewportSize(PHONE);
  await pe.goto('/paper');
  await pe.waitForTimeout(1200);
  texts['capital-card-row-vote'] = (await pe.getByTestId('polling-day').first().innerText({ timeout: 4000 }).catch(() => '(none)')).replace(/\n+/g, ' / ');
  // Vote on the phone.
  await pe.goto('/council/ballot');
  await pe.getByTestId('rule-card').nth(0).click();
  await pe.getByTestId('council-cta').getByRole('button').first().click();
  const m = modalOf(pe);
  await expect(m.getByTestId('stamp')).toBeVisible();
  await pe.waitForTimeout(600);
  await pe.screenshot({ path: join(OUT, `62-capital-vote-modal${V}-m.png`) });
  texts['capital-vote-modal'] = await m.innerText();
  await m.getByRole('button', { name: 'Continue' }).click();
  // A second try after the vote: the card reads *You voted for …*.
  await pe.goto('/paper');
  await pe.waitForTimeout(1000);
  texts['capital-card-row-voted'] = (await pe.getByTestId('polling-day').first().innerText({ timeout: 4000 }).catch(() => '(none)')).replace(/\n+/g, ' / ');
  // Other districts' voters: synthetic votes for the cards in Eastside and in another district.
  for (const d of ['irongate.eastside', 'irongate.garrison-hill']) {
    const cards = (await read(eva.request, 'council.ballot', { cityId: 'irongate' })).data.cards as any[];
    await hook(eva.request, 'rule-votes', { placeId: d, votes: { [cards[cards.length - 1].ordinanceId]: 3 } });
  }
  // The hall (the capital's party-card line) for Jana and Ilse.
  const pj = await jana.newPage();
  await shot(pj, '/council', '63-capital-hall-jana', [PHONE], true);
  const pi = await ilse.newPage();
  await shot(pi, '/council', '64-capital-hall-ilse', [PHONE], true);
  await shot(pj, '/city/irongate/' + districtOf.get('Eastside'), '65-capital-card-councillor-jana', [PHONE]);
  texts['jana-ballot'] = JSON.stringify((await read(jana.request, 'council.ballot', { cityId: 'irongate' })).data.myRule);
  texts['ilse-ballot'] = JSON.stringify((await read(ilse.request, 'council.ballot', { cityId: 'irongate' })).data.myRule);
  flush();
});

test('the capital, the count: seats add up behind the shared card; rows say shared; no score', async () => {
  test.setTimeout(300_000);
  await advanceTo(eva.request, 0);
  const cc = await read(eva.request, 'council.capitalCount');
  expect(cc.ok, cc.reason ?? '').toBe(true);
  texts['capital-count-rule'] = JSON.stringify({
    how: cc.data.rule?.how,
    cards: cc.data.rule?.cards?.map((c: any) => [c.name, c.whose?.factionIds, c.seats, c.won]),
  });
  const parties = (cc.data.districts as any[]).map((d: any) => [d.name, d.parties.map((p: any) => [p.factionId, p.votes, p.shared, p.seats])]);
  texts['capital-count-parties'] = JSON.stringify(parties);
  // The seats by card: sum the parties' seats over the districts; the winner must be the card with the most.
  const seatsBy: Record<string, number> = {};
  for (const d of cc.data.districts as any[]) for (const p of d.parties as any[]) seatsBy[p.factionId] = (seatsBy[p.factionId] ?? 0) + p.seats;
  texts['capital-seats-by-party'] = JSON.stringify(seatsBy);
  const cardSeats = (cc.data.rule.cards as any[]).map((c) => ({
    name: c.name,
    sum: (c.whose.factionIds as string[]).reduce((n, f) => n + (seatsBy[f] ?? 0), 0),
    reported: c.seats,
    won: c.won,
  }));
  texts['capital-card-seat-check'] = JSON.stringify(cardSeats);
  for (const c of cardSeats) expect(c.reported, `card ${c.name}: reported seats equal the sum of its parties' district seats`).toBe(c.sum);
  const top = Math.max(...cardSeats.map((c) => c.sum));
  expect(cardSeats.find((c) => c.won)!.sum, 'the winner has the most seats').toBe(top);
  expect(Object.values(seatsBy).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(10);
  const pe = await eva.newPage();
  await shot(pe, '/council/count', '66-capital-count', [PHONE, DESK], true);
  await shot(pe, '/paper', '67-capital-paper-count-morning', [PHONE]);
  await pe.setViewportSize(PHONE);
  await pe.goto('/paper');
  await pe.waitForTimeout(800);
  texts['capital-headlines'] = (await pe.getByTestId('headline').allInnerTexts()).map((t) => t.replace(/\n+/g, ' / ')).join('\n');
  await pe.goto('/city/irongate/irongate.eastside');
  await pe.waitForTimeout(1200);
  texts['capital-card-result'] = await pe.evaluate(() => document.body.innerText);
  flush();
});
