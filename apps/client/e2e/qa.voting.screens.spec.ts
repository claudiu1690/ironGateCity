/* eslint-disable @typescript-eslint/no-explicit-any -- the tests read untyped tRPC JSON (views of many shapes) */
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * QA of the voting rework, the screens (docs/qa/voting-rework-report.md): a walk through every state of
 * the Election card, the ballot, the result, who's standing, the Town Hall and the paper at 390 × 844
 * and 1440 × 900, with screenshots under docs/qa/voting-rework/ and the screens' text under
 * QA_VOTING_TEXT (default: the test-results folder) for the wording check. Serial, on the shared clock.
 */

test.describe.configure({ mode: 'serial' });

const OUT = process.env.QA_VOTING_SHOTS ?? join(process.cwd(), '..', '..', 'docs', 'qa', 'voting-rework');
const TEXT = process.env.QA_VOTING_TEXT ?? join(process.cwd(), 'test-results', 'qa-voting-text');
mkdirSync(OUT, { recursive: true });
mkdirSync(TEXT, { recursive: true });

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
const advanceTo = async (api: Api, cityId: string, cycleDay: number) => {
  await hook(api, 'clock', { advanceTo: { cityId, cycleDay } });
  await hook(api, 'city-day');
};

type Party = 'holm' | 'stahl' | 'grey';
async function memberContext(browser: Browser, party: Party, name: string, seed: object = {}): Promise<BrowserContext> {
  const baseURL = test.info().project.use.baseURL as string;
  const ctx = await browser.newContext({ baseURL, viewport: PHONE });
  const api = ctx.request;
  const email = `qas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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

const texts: Record<string, string> = {};
const issues: string[] = [];
const flush = () => writeFileSync(join(TEXT, 'texts.json'), JSON.stringify(texts, null, 1));

/** Contrast (WCAG) of every visible text element in `root` below 4.5:1 (3:1 for large text). */
async function lowContrast(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const rgba = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
    };
    const out: string[] = [];
    const seen = new Set<string>();
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim();
      if (!own) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      let bg: number[] | null = null;
      let imageUnder = false;
      for (let e: Element | null = el; e && !bg; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.backgroundImage !== 'none') imageUnder = true;
        const c = rgba(s.backgroundColor);
        if (c.length >= 3 && (c[3] ?? 1) > 0.99) bg = c;
      }
      if (imageUnder) continue; // a painted backdrop: not a flat colour to measure
      const fg = rgba(cs.color);
      const L1 = lum(fg);
      const L2 = lum(bg ?? [255, 255, 255]);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      const key = `${own.slice(0, 40)}|${ratio.toFixed(2)}`;
      if (ratio < need && !seen.has(key)) {
        seen.add(key);
        out.push(`${ratio.toFixed(2)}:1 "${own.slice(0, 50)}" ${size}px`);
      }
    }
    return out;
  });
}

/** Visible interactive elements smaller than 44 px in either direction (WCAG 2.5.5 / the design rule). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('button, a[href], [role=radio], [role=button], input, select'))) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue;
      if (r.height < 43.5 || r.width < 43.5) {
        const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
        out.push(`${Math.round(r.width)}×${Math.round(r.height)} ${el.tagName.toLowerCase()} "${label}"`);
      }
    }
    return out;
  });
}

interface SnapOpts {
  sizes?: Array<{ w: number; h: number; tag: string }>;
  ready?: (p: Page) => Promise<void>;
  full?: boolean;
  after?: (p: Page, tag: string) => Promise<void>;
}
const BOTH = [
  { w: 390, h: 844, tag: 'm' },
  { w: 1440, h: 900, tag: 'd' },
];

/** Visit `url` at each size, wait, shoot, store the page's text and the usual audits. */
async function snap(page: Page, url: string, name: string, o: SnapOpts = {}) {
  for (const s of o.sizes ?? BOTH) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(url);
    if (o.ready) await o.ready(page);
    await page.waitForTimeout(1100);
    const key = `${name}-${s.tag}`;
    await page.screenshot({ path: join(OUT, `${key}.png`), fullPage: o.full ?? false });
    texts[key] = await page.evaluate(() => document.body.innerText);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) issues.push(`${key}: sideways scroll ${overflow}px`);
    const low = await lowContrast(page);
    if (low.length) issues.push(`${key}: low contrast ${low.slice(0, 6).join(' | ')}`);
    const small = await smallTargets(page);
    if (small.length) issues.push(`${key}: small targets ${small.slice(0, 8).join(' | ')}`);
    if (o.after) await o.after(page, key);
  }
  flush();
}

/** The card in whichever layout the size shows: the full card (from 640 px), the paper's row or the compact line. */
const card = (p: Page) =>
  p.locator('[data-testid=election-card],[data-testid=polling-day]').filter({ visible: true }).first();
const modalOf = (p: Page) => p.getByRole('dialog').filter({ has: p.getByTestId('stamp') });
const cardText = async (p: Page) => (await card(p).innerText({ timeout: 3000 }).catch(() => '(no card)')).replace(/\n+/g, ' / ');
/** The card on the city screen (compact on a phone, full on a desktop) and, on a phone, the paper's unfolded row. */
async function cardShots(page: Page, name: string, city = 'coalport') {
  await snap(page, `/city/${city}`, name, {
    ready: (q) => expect(card(q)).toBeVisible(),
    after: async (q, key) => {
      texts[`${key}-card`] = await cardText(q);
    },
  });
  await snap(page, '/paper', `${name}-paper`, {
    sizes: [{ w: 390, h: 844, tag: 'm' }],
    ready: (q) => expect(q.getByTestId('polling-day').first()).toBeVisible(),
    after: async (q, key) => {
      texts[`${key}-row`] = (await q.getByTestId('polling-day').first().innerText({ timeout: 3000 }).catch(() => '')).replace(/\n+/g, ' / ');
    },
  });
}

// People: a Recruit; an Activist who votes; an Organiser who stands; three councillors; a front-page winner.
let rookie: BrowserContext;
let voter: BrowserContext;
let stander: BrowserContext;
let cllrA: BrowserContext;
let cllrB: BrowserContext;
let cllrC: BrowserContext;
let backer1: BrowserContext;
let backer2: BrowserContext;
let pages: Record<string, Page> = {};

test('day 0: the Election card in each state, the stand card, standing, the councillors', async ({ browser }) => {
  test.setTimeout(540_000);
  rookie = await memberContext(browser, 'holm', 'Rudi Rookie');
  voter = await memberContext(browser, 'holm', 'Vera Voter', { fxp: 400 });
  stander = await memberContext(browser, 'holm', 'Sieglinde Stand', { fxp: 2000, successes: 200, pc: 45 });
  backer1 = await memberContext(browser, 'holm', 'Anton Backer', { fxp: 400, pc: 10 });
  backer2 = await memberContext(browser, 'holm', 'Berta Backer', { fxp: 400, pc: 10 });
  await advanceTo(rookie.request, 'coalport', 0);
  const mk = async (c: BrowserContext, k: string) => (pages[k] = await c.newPage());
  await mk(rookie, 'rookie');
  await mk(voter, 'voter');
  await mk(stander, 'stander');

  // 1. Below Rank 2: the card reads the rule, read-only.
  await cardShots(pages.rookie!, '01-card-belowrank', 'coalport');
  texts['card-belowrank'] = await cardText(pages.rookie!);
  // 2. Day 0, a voter: the rule that just started (the conversion's *carried over*, no count yet).
  await cardShots(pages.voter!, '02-card-result-voter', 'coalport');
  texts['card-result-voter'] = await cardText(pages.voter!);
  // 3. The ballot before it is set (days 0–1), read-only provisional cards.
  await snap(pages.voter!, '/council/ballot', '03-ballot-closed', { ready: (p) => expect(p.getByTestId('rule-card').first()).toBeVisible() });
  // 4. The Town Hall (voter), days 0–1.
  await snap(pages.voter!, '/council', '04-hall-voter-day0', { full: true, ready: (p) => expect(p.getByTestId('hall-rule')).toBeVisible() });
  // 5. The stander: the card with the stand button, the stand card, the hall's block.
  await cardShots(pages.stander!, '05-card-result-eligible', 'coalport');
  texts['card-result-eligible'] = await cardText(pages.stander!);
  await snap(pages.stander!, '/council/slate', '06-slate-standcard', { full: true, ready: (p) => expect(p.getByTestId('stand-card')).toBeVisible() });
  // 6. Stand with the default rule changed once; the modal; the standing card.
  const p = pages.stander!;
  await p.setViewportSize(PHONE);
  await p.goto('/council/slate');
  await expect(p.getByTestId('stand-card')).toBeVisible();
  texts['stand-rule-default'] = await p.getByTestId('stand-rule').innerText();
  await p.getByTestId('stand-change').click();
  const picker = p.getByRole('dialog');
  await expect(picker).toBeVisible();
  await p.waitForTimeout(600);
  await p.screenshot({ path: join(OUT, '07-stand-rule-picker-m.png') });
  texts['stand-picker'] = await picker.innerText();
  await picker.getByRole('radio', { name: /^Reading Room Grant/ }).click();
  await p.keyboard.press('Escape').catch(() => undefined);
  await p.waitForTimeout(400);
  texts['stand-rule-after-change'] = await p.getByTestId('stand-rule').innerText();
  await p.getByTestId('stand-button').click();
  const m = modalOf(p);
  await expect(m.getByTestId('stamp')).toBeVisible();
  await p.waitForTimeout(700);
  await p.screenshot({ path: join(OUT, '08-stand-modal-m.png') });
  texts['stand-modal'] = await m.innerText();
  await m.getByRole('button', { name: 'Continue' }).click();
  await cardShots(p, '09-card-standing', 'coalport');
  texts['card-standing'] = await cardText(p);
  await snap(p, '/council/slate', '10-slate-standing', { full: true, ready: (q) => expect(q.getByTestId('stand-standing')).toBeVisible() });
  // 7. A member backs her (the modal) and a second backs her on the slate.
  const e = await read(stander.request, 'council.election');
  const candidacyId = e.data.candidacy.candidacyId as string;
  await mutate(backer1.request, 'council.endorse', { candidacyId, idempotencyKey: uuid() });
  const pb = await backer2.newPage();
  await pb.setViewportSize(PHONE);
  await pb.goto('/council/slate');
  await expect(pb.getByTestId('slate-row').first()).toBeVisible();
  await snap(pb, '/council/slate', '11-slate-back', { full: true, ready: (q) => expect(q.getByTestId('slate-row').first()).toBeVisible() });
  const backBtn = pb.getByRole('button', { name: /^Back · 10 Political Capital/ }).first();
  await expect(backBtn).toBeVisible();
  await backBtn.click();
  const bm = modalOf(pb);
  await expect(bm.getByTestId('stamp')).toBeVisible();
  await pb.waitForTimeout(600);
  await pb.screenshot({ path: join(OUT, '12-back-modal-m.png') });
  texts['back-modal'] = await bm.innerText();
  await bm.getByRole('button', { name: 'Continue' }).click();
  flush();
});

test('day 0: three councillors: the council state, the change sheet, next in line', async ({ browser }) => {
  test.setTimeout(540_000);
  const a = await memberContext(browser, 'holm', 'Lotte Erste', { fxp: 2000, successes: 30 });
  const b = await memberContext(browser, 'holm', 'Jakob Zweite', { fxp: 2000, successes: 30 });
  const c = await memberContext(browser, 'holm', 'Grete Dritte', { fxp: 2000, successes: 30 });
  cllrA = a;
  cllrB = b;
  cllrC = c;
  const hall = await read(a.request, 'council.hall', { cityId: 'coalport' });
  const locals = (hall.data.seats as Array<{ seat: number; kind: string }>)
    .filter((x) => x.kind === 'npc')
    .map((x) => x.seat)
    .sort((x, y) => x - y)
    .slice(0, 3);
  const rules = ['ord.street-fund', 'ord.rest-day', 'ord.open-doors'];
  for (const [i, ctx] of [a, b, c].entries()) {
    await hook(ctx.request, 'seat', { seat: locals[i] });
    expect((await mutate(ctx.request, 'council.setRule', { ordinanceId: rules[i], idempotencyKey: uuid() })).ok).toBe(true);
  }
  const pa = await a.newPage();
  const pc = await c.newPage();
  pages.a = pa;
  pages.c = pc;
  await cardShots(pa, '13-card-councillor');
  texts['card-councillor'] = await cardText(pa);
  await cardShots(pc, '14-card-nextinline');
  texts['card-nextinline'] = await cardText(pc);
  await snap(pa, '/city/coalport?loc=coalport.town-hall', '15-hall-councillor-day0', { ready: (q) => expect(q.getByTestId('hall-rule')).toBeVisible() });
  await snap(pa, '/council', '16-hall-page-councillor', { full: true, ready: (q) => expect(q.getByTestId('hall-rule')).toBeVisible() });
  await snap(pc, '/council', '17-hall-page-nextinline', { full: true, ready: (q) => expect(q.getByTestId('hall-rule')).toBeVisible() });
  // The change sheet on a phone.
  await pa.setViewportSize(PHONE);
  await pa.goto('/council');
  await pa.getByTestId('hall-change').click();
  await expect(pa.getByRole('dialog', { name: 'Your rule · choose one' })).toBeVisible();
  await pa.waitForTimeout(600);
  await pa.screenshot({ path: join(OUT, '18-change-sheet-m.png') });
  texts['change-sheet'] = await pa.getByRole('dialog', { name: 'Your rule · choose one' }).innerText();
  await pa.keyboard.press('Escape');
  // Change to Public Works (two taps); the modal.
  await pa.getByTestId('hall-change').click();
  await pa.getByRole('dialog', { name: 'Your rule · choose one' }).getByRole('radio', { name: /^Public Works Order/ }).click();
  const m = modalOf(pa);
  await expect(m.getByTestId('stamp')).toHaveText('Changed');
  await pa.waitForTimeout(600);
  await pa.screenshot({ path: join(OUT, '19-changed-modal-m.png') });
  texts['changed-modal'] = await m.innerText();
  await m.getByRole('button', { name: 'Continue' }).click();
  flush();
});

test('day 2: the vote, on a phone and on a desktop; voted; the chip; who is standing during the vote', async ({ browser: browserRef }) => {
  test.setTimeout(540_000);
  await advanceTo(voter.request, 'coalport', 2);
  const pv = pages.voter!;
  // The card, the ballot page, the hall.
  await cardShots(pv, '20-card-vote', 'coalport');
  texts['card-vote'] = await cardText(pv);
  await snap(pv, '/council/ballot', '21-ballot', { ready: (q) => expect(q.getByTestId('rule-card').first()).toBeVisible() });
  // The geometry at 390 × 844: every card above the sticky bar.
  await pv.setViewportSize(PHONE);
  await pv.goto('/council/ballot');
  await expect(pv.getByTestId('rule-card').nth(2)).toBeVisible();
  const g = await pv.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-testid=rule-card]')).map((e) => e.getBoundingClientRect());
    const bar = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
    return { bottoms: cards.map((r) => Math.round(r.bottom * 10) / 10), barTop: Math.round(bar.top * 10) / 10, barH: Math.round(bar.height) };
  });
  texts['ballot-geometry-390x844'] = JSON.stringify(g);
  for (const [w, h] of [[375, 667], [360, 640]] as const) {
    await pv.setViewportSize({ width: w, height: h });
    await pv.goto('/council/ballot');
    await expect(pv.getByTestId('rule-card').nth(0)).toBeVisible();
    const gg = await pv.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid=rule-card]')).map((e) => e.getBoundingClientRect());
      const bar = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
      return { tops: cards.map((r) => Math.round(r.top)), bottoms: cards.map((r) => Math.round(r.bottom)), barTop: Math.round(bar.top) };
    });
    texts[`ballot-geometry-${w}x${h}`] = JSON.stringify(gg);
    await pv.screenshot({ path: join(OUT, `22-ballot-${w}x${h}.png`) });
  }
  await snap(pv, '/council', '23-hall-vote-block', { full: true, ready: (q) => expect(q.getByTestId('hall-next')).toBeVisible() });
  await snap(pv, '/council/slate', '24-slate-during-vote', { full: true, ready: (q) => expect(q.getByTestId('slate-row').first()).toBeVisible() });
  // Vote on the phone: a card, then Vote for …, the modal.
  await pv.setViewportSize(PHONE);
  await pv.goto('/council/ballot');
  const cardsEl = pv.getByTestId('rule-card');
  await cardsEl.nth(1).click();
  await pv.waitForTimeout(300);
  await pv.screenshot({ path: join(OUT, '25-ballot-selected-m.png') });
  texts['ballot-cta-selected'] = await pv.getByTestId('council-cta').innerText();
  await pv.getByTestId('council-cta').getByRole('button').first().click();
  const vm = modalOf(pv);
  await expect(vm.getByTestId('stamp')).toBeVisible();
  await pv.waitForTimeout(700);
  await pv.screenshot({ path: join(OUT, '26-vote-modal-m.png') });
  texts['vote-modal'] = await vm.innerText();
  await vm.getByRole('button', { name: 'Continue' }).click();
  await snap(pv, '/council/ballot', '27-ballot-voted', { ready: (q) => expect(q.getByTestId('rule-card-your-vote')).toBeVisible() });
  await cardShots(pv, '28-card-voted', 'coalport');
  texts['card-voted'] = await cardText(pv);
  // The desktop card is the ballot (a second voter, two taps).
  const v2 = await memberContext(browserRef, 'holm', 'Viktor Zwei', { fxp: 400 });
  const p2 = await v2.newPage();
  pages.v2 = p2;
  await p2.setViewportSize(DESK);
  await p2.goto('/city/coalport');
  await expect(card(p2).getByTestId('election-ballot')).toBeVisible();
  await p2.waitForTimeout(900);
  await p2.screenshot({ path: join(OUT, '29-desktop-card-is-ballot-d.png') });
  texts['desktop-card-ballot'] = await cardText(p2);
  const taps = { n: 0 };
  await card(p2).getByTestId('rule-card').nth(2).click();
  taps.n++;
  await card(p2).getByRole('button', { name: /^Vote for / }).click();
  taps.n++;
  await expect(modalOf(p2).getByTestId('stamp')).toBeVisible();
  texts['desktop-vote-taps'] = String(taps.n);
  await modalOf(p2).getByRole('button', { name: 'Continue' }).click();
  // Rank 1 and a councillor see the ballot without the vote? (the rookie reads it, a councillor votes).
  await snap(pages.rookie!, '/council/ballot', '30-ballot-rank1', { ready: (q) => expect(q.getByTestId('rule-card').first()).toBeVisible() });
  await cardShots(pages.a!, '31-card-councillor-day2', 'coalport');
  texts['card-councillor-day2'] = await cardText(pages.a!);
  await cardShots(pages.stander!, '32-card-candidate-day2', 'coalport');
  texts['card-candidate-day2'] = await cardText(pages.stander!);
  // The folded plate's chip at 375 × 667 (home plate), and the rival-ground / Me line.
  await snap(pv, '/city/coalport', '33-plate-chip-375x667', {
    sizes: [{ w: 375, h: 667, tag: 's' }],
    ready: (q) => expect(q.getByTestId('plate-rule-chip').filter({ visible: true })).toBeVisible(),
  });
  await snap(pv, '/me', '34-me-line', { ready: (q) => expect(q.getByTestId('me-rule')).toBeVisible() });
  flush();
});

test('the count morning: the front page, the result, the paper’s headlines, What now, the plate', async () => {
  test.setTimeout(540_000);
  // Two townspeople's votes for the second card: it wins 3 of 4 (the voter, +2 hook, and one for card 3).
  await hook(voter.request, 'rule-votes', { votes: { [(await read(voter.request, 'council.ballot')).data.cards[1].ordinanceId]: 2 } });
  await advanceTo(voter.request, 'coalport', 0);
  const pv = pages.voter!;
  const ps = pages.stander!;
  await snap(pv, '/paper', '40-paper-count-morning-voter', { full: true, ready: (q) => expect(q.getByTestId('headline').first()).toBeVisible() });
  await snap(ps, '/paper', '41-paper-count-morning-elected', { full: true, ready: (q) => expect(q.getByTestId('headline').first()).toBeVisible() });
  await snap(pv, '/council/count', '42-result', { full: true, ready: (q) => expect(q.getByTestId('rule-card').first()).toBeVisible() });
  await snap(ps, '/council', '43-hall-new-councillor', { full: true, ready: (q) => expect(q.getByTestId('hall-rule')).toBeVisible() });
  await cardShots(pv, '44-card-result-won', 'coalport');
  texts['card-result-won'] = await cardText(pv);
  await snap(pv, '/city/coalport', '45-plate-chip-375x667', { sizes: [{ w: 375, h: 667, tag: 's' }, { w: 360, h: 640, tag: 'xs' }], ready: (q) => expect(q.getByTestId('plate-rule-chip').filter({ visible: true })).toBeVisible() });
  // The headlines in print order, for the voter and the new councillor.
  for (const [k, p] of [['voter', pv], ['elected', ps]] as const) {
    await p.setViewportSize(PHONE);
    await p.goto('/paper');
    await expect(p.getByTestId('headline').first()).toBeVisible();
    texts[`headlines-${k}`] = (await p.getByTestId('headline').allInnerTexts()).map((t) => t.replace(/\n+/g, ' / ')).join('\n');
  }
  // The councillor's seat was won: ELECTED front page and the What now card.
  const hall = await read(ps.request, 'council.hall', { cityId: 'coalport' });
  texts['hall-whatnow'] = JSON.stringify(hall.data.whatNow ?? null);
  const res = await read(ps.request, 'council.count');
  texts['count-rows'] = JSON.stringify(res.data.council.map((r: any) => `${r.place} ${r.name} ward ${r.wardVote} backers ${r.backers} total ${r.total}${r.you ? ' YOU' : ''}`));
  texts['count-rule'] = JSON.stringify({ how: res.data.rule.how, cards: res.data.rule.cards.map((c: any) => [c.name, c.votes, c.won]) });
  flush();
});

test('Unrest and the fallback: the words on the card, the result and the paper', async ({ browser }) => {
  test.setTimeout(540_000);
  const kurt = await memberContext(browser, 'stahl', 'Kurt Unrest', { fxp: 400 });
  const rival = await memberContext(browser, 'grey', 'Ida Rival', { fxp: 400 });
  await advanceTo(kurt.request, 'duskwall', 1);
  await hook(rival.request, 'unrest', { cityId: 'duskwall', share: 55 });
  await advanceTo(kurt.request, 'duskwall', 2);
  const pk = await kurt.newPage();
  await snap(pk, '/council/ballot', '50-ballot-unrest', { ready: (q) => expect(q.getByTestId('rule-card').first()).toBeVisible() });
  await cardShots(pk, '51-card-vote-unrest', 'duskwall');
  texts['card-vote-unrest'] = await cardText(pk);
  await advanceTo(kurt.request, 'duskwall', 0);
  await cardShots(pk, '52-card-result-fallback-unrest', 'duskwall');
  texts['card-fallback-unrest'] = await cardText(pk);
  await snap(pk, '/council/count', '53-result-fallback-unrest', { full: true, ready: (q) => expect(q.getByTestId('rule-card').first()).toBeVisible() });
  await snap(pk, '/paper', '54-paper-fallback-unrest', { full: true, ready: (q) => expect(q.getByTestId('headline').first()).toBeVisible() });
  await pk.setViewportSize(PHONE);
  await pk.goto('/paper');
  texts['headlines-fallback-unrest'] = (await pk.getByTestId('headline').allInnerTexts()).map((t) => t.replace(/\n+/g, ' / ')).join('\n');
  await pk.goto('/council');
  texts['hall-fallback-unrest'] = await pk.getByTestId('hall-rule').innerText();
  flush();
});

test('the ballot at 390 × 844 for a voter who has not opened the paper yet (the Clarion strip is up)', async ({ browser }) => {
  test.setTimeout(240_000);
  const ida = await memberContext(browser, 'grey', 'Paula Paper', { fxp: 400 });
  await advanceTo(ida.request, 'ashford', 2);
  const p = await ida.newPage();
  await p.setViewportSize(PHONE);
  await p.goto('/council/ballot');
  await expect(p.getByTestId('rule-card').nth(2)).toBeVisible();
  await p.waitForTimeout(1200);
  const strip = await p.evaluate(() => document.body.innerText.includes('IS IN'));
  const g = await p.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-testid=rule-card]')).map((e) => e.getBoundingClientRect());
    const bar = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
    return { bottoms: cards.map((r) => Math.round(r.bottom * 10) / 10), barTop: Math.round(bar.top * 10) / 10 };
  });
  texts['ballot-geometry-unread-paper-390x844'] = JSON.stringify({ strip, ...g });
  await p.screenshot({ path: join(OUT, '70-ballot-paper-unread-m.png') });
  // The same voter after opening the paper.
  await p.goto('/paper');
  await p.waitForTimeout(1500);
  await p.goto('/council/ballot');
  await expect(p.getByTestId('rule-card').nth(2)).toBeVisible();
  await p.waitForTimeout(1200);
  const g2 = await p.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-testid=rule-card]')).map((e) => e.getBoundingClientRect());
    const bar = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
    return { strip: document.body.innerText.includes('IS IN'), bottoms: cards.map((r) => Math.round(r.bottom * 10) / 10), barTop: Math.round(bar.top * 10) / 10 };
  });
  texts['ballot-geometry-paper-read-390x844'] = JSON.stringify(g2);
  flush();
});

test('a tie, in words: the card, the result, the hall and both voters’ headlines (Ashford, 1 to 1)', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await memberContext(browser, 'grey', 'Tilda Eins', { fxp: 400 });
  const b = await memberContext(browser, 'grey', 'Tobias Zwei', { fxp: 400 });
  await advanceTo(a.request, 'ashford', 2);
  const cards = (await read(a.request, 'council.ballot')).data.cards as any[];
  const unrest = cards.every((c) => c.whose.kind !== 'party');
  texts['tie-setup'] = JSON.stringify({ unrest, cards: cards.map((c) => c.name) });
  expect((await mutate(a.request, 'council.vote', { ordinanceId: cards[0].ordinanceId, idempotencyKey: uuid() })).ok).toBe(true);
  expect((await mutate(b.request, 'council.vote', { ordinanceId: cards[1].ordinanceId, idempotencyKey: uuid() })).ok).toBe(true);
  await advanceTo(a.request, 'ashford', 0);
  const pa = await a.newPage();
  const pb = await b.newPage();
  for (const [k, p] of [['tie-a', pa], ['tie-b', pb]] as const) {
    await p.setViewportSize(PHONE);
    await p.goto('/paper');
    await expect(p.getByTestId('headline').first()).toBeVisible();
    await p.waitForTimeout(600);
    texts[`${k}-headlines`] = (await p.getByTestId('headline').allInnerTexts()).map((t) => t.replace(/\n+/g, ' / ')).join('\n');
    texts[`${k}-row`] = (await p.getByTestId('polling-day').first().innerText({ timeout: 3000 }).catch(() => '')).replace(/\n+/g, ' / ');
  }
  await pb.goto('/council');
  await expect(pb.getByTestId('hall-rule')).toBeVisible();
  texts['tie-hall'] = await pb.getByTestId('hall-rule').innerText();
  await pb.goto('/council/count');
  await expect(pb.getByTestId('rule-card').first()).toBeVisible();
  texts['tie-result'] = (await pb.getByTestId('rule-cards').innerText()).replace(/\n+/g, ' / ');
  flush();
});

test('the help notes: How the vote works (home and the capital), the Political Capital note', async ({ browser }) => {
  test.setTimeout(240_000);
  const h = await memberContext(browser, 'holm', 'Hanne Help', { fxp: 2000, successes: 40, pc: 30 });
  const p = await h.newPage();
  await p.setViewportSize(PHONE);
  await p.goto('/council/ballot');
  await expect(p.getByTestId('how-the-vote-works')).toBeVisible();
  await p.getByTestId('how-the-vote-works').click();
  const note = p.getByTestId('help-note');
  await expect(note).toBeVisible();
  texts['help-rule-home'] = (await note.innerText()).replace(/\n+/g, ' / ');
  await p.screenshot({ path: join(OUT, '80-help-how-the-vote-works-m.png') });
  await p.keyboard.press('Escape');
  // The Political Capital label in the HUD.
  const pc = p.getByText(/Political.?Capital/i).first();
  await pc.click({ timeout: 4000 }).catch(() => undefined);
  texts['help-pc-after-click'] = (await p.getByTestId('help-note').innerText({ timeout: 2000 }).catch(() => '(no note)')).replace(/\n+/g, ' / ');
  await p.keyboard.press('Escape');
  await p.goto('/me');
  const mepc = p.getByText(/Political Capital .*stand 10/i).first();
  texts['me-pc-line'] = (await mepc.innerText({ timeout: 3000 }).catch(() => '(none)'));
  flush();
});

test('audit: the issues the screens collected', () => {
  writeFileSync(join(TEXT, 'issues.txt'), issues.join('\n'));
  test.info().annotations.push({ type: 'issues', description: String(issues.length) });
});
