/* eslint-disable @typescript-eslint/no-explicit-any -- the specs read untyped tRPC JSON (views of many shapes) */
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Slice 7 phase C, lane X: what the nation's specs share (chair, nation, removal, petition). Members
 * are made by the API (sign-up, the arrival's three answers, the join), as the voting rework's specs
 * do, so a spec spends its time on the screens it checks; the clock moves by the term hooks.
 */

export type Api = APIRequestContext;
export interface Res<T = any> {
  ok: boolean;
  data: T;
  raw: string;
  reason: string | null;
}

const parse = async (r: Awaited<ReturnType<Api['get']>>): Promise<Res> => {
  const raw = await r.text();
  let j: any = {};
  try {
    j = JSON.parse(raw);
  } catch {
    j = {};
  }
  if (j?.result) return { ok: true, data: j.result.data, raw, reason: null };
  return { ok: false, data: null, raw, reason: j?.error?.data?.game?.reason ?? j?.error?.message ?? 'ERROR' };
};

export const mutate = (api: Api, proc: string, data: object = {}) => api.post(`/api/trpc/${proc}`, { data }).then(parse);
export const read = (api: Api, proc: string, input?: object) =>
  api.get(`/api/trpc/${proc}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`).then(parse);

export const hook = async (api: Api, path: string, data: object = {}): Promise<any> => {
  const r = await api.post(`/api/test/${path}`, { data });
  expect(r.ok(), `${path}: ${await r.text()}`).toBe(true);
  return r.json();
};

/** Move to the start (09:00) of a term day (the next one; `next`: the next term's) and run every day. */
export const termDay = (api: Api, day: number, next = false) => hook(api, 'term', { termDay: day, ...(next ? { next } : {}) });

export type Party = 'collective' | 'vanguard' | 'alliance';
const ROW: Record<Party, string> = { collective: 'holm', vanguard: 'stahl', alliance: 'grey' };

/** A new member by the API in a phone-sized context (its pages share the session). */
export async function memberContext(
  browser: Browser,
  name: string,
  opts: { party?: Party; seed?: object; viewport?: { width: number; height: number } } = {},
): Promise<{ ctx: BrowserContext; page: Page; api: Api }> {
  const baseURL = test.info().project.use.baseURL as string;
  const ctx = await browser.newContext({
    ...test.info().project.use,
    baseURL,
    viewport: opts.viewport ?? { width: 390, height: 844 },
  });
  const api = ctx.request;
  const email = `nation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const su = await api.post('/api/auth/sign-up/email', {
    data: { email, password: 'e2e-password-123', name },
    headers: { origin: baseURL },
  });
  expect(su.ok(), 'sign-up').toBe(true);
  const faces = (await read(api, 'arrival.faces')).data as Array<{ id: string }>;
  expect((await mutate(api, 'arrival.start', { avatarId: faces[3]!.id })).ok).toBe(true);
  for (const [questionId, answerId] of [
    ['origin.platform', ROW[opts.party ?? 'collective']],
    ['origin.suitcase', opts.party === 'vanguard' ? 'tools' : 'books'],
    ['origin.lining', 'ward-book'],
  ] as const) {
    const a = await mutate(api, 'arrival.answer', { questionId, answerId });
    expect(a.ok, `answer ${questionId}: ${a.reason}`).toBe(true);
  }
  expect((await mutate(api, 'arrival.join', {})).ok).toBe(true);
  if (opts.seed && Object.keys(opts.seed).length > 0) await hook(api, 'character', opts.seed);
  const page = await ctx.newPage();
  return { ctx, page, api };
}

/** Test members of the caller's party (eight at most per call): their ids. */
export async function testMembers(
  api: Api,
  n: number,
  opts: { rank?: number; level?: number; cityId?: string; pc?: number } = {},
): Promise<string[]> {
  const out: string[] = [];
  while (out.length < n) {
    const k = Math.min(8, n - out.length);
    const r = await hook(api, 'members', { n: k, pc: 200, ...opts });
    out.push(...(r.members as Array<{ characterId: string }>).map((m) => m.characterId));
  }
  return out;
}

/** The sheets and modals rise in (review 3): let them settle, then a 390 × 844 shot for QA. */
export async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `../../docs/qa/slice-7/${name}.png` });
}

/** Close the political modal (Continue). */
export async function closeModal(page: Page, text?: string | RegExp): Promise<void> {
  const dialog = text ? page.getByRole('dialog').filter({ hasText: text }) : page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/**
 * Screens §1, §12.4: no player-facing string on a nation screen says the system's words, a roll, or a
 * percentage for odds. (*The Front* is allowed.)
 */
const REFUSED = /\b(?:whip|Directive|recall|Legislature|National Control|no-confidence|Chancellor|NPC|stand-in|D'Hondt)\b/i;
export async function sweep(page: Page, where: string): Promise<void> {
  const text = await page.locator('body').innerText();
  expect(text.match(REFUSED)?.[0] ?? null, `${where}: a system word`).toBeNull();
}

/** The selected chip's three cues (review 7 #1): ink 600 text, the paper-card fill, the 3 px ink bar. */
export async function selectedChipCues(page: Page, testId: string): Promise<void> {
  const chip = page.getByTestId(testId);
  await expect(chip).toHaveAttribute('aria-current', 'page');
  await expect(chip.getByTestId('faction-tab-bar')).toBeVisible();
  const style = await chip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { weight: Number(s.fontWeight), bg: s.backgroundColor, color: s.color };
  });
  expect(style.weight).toBeGreaterThanOrEqual(600);
  expect(style.bg).not.toBe('rgba(0, 0, 0, 0)');
}
