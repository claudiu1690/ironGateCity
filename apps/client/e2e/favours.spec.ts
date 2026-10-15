import { expect, test } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { signUp } from './helpers';

/** Unique per run (a repeated run shares the server's database). */
const tag = () => Array.from({ length: 4 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');

/**
 * Slice 6 (tech design §15.1, `favours.spec.ts`): a mate's bail from the chat's *taken in* line, the
 * prisoner's release *on the branch's Iron*, a visit on the ward from the Members list, and the nudge
 * (*Ask to join*) landing in the mate's chat *for you*. Two real accounts (A and B, the Collective in
 * Coalport); B sends itself to the cells and the ward with slice 5's `/api/test/held`.
 */

const PHONE = { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const parse = async (r: Awaited<ReturnType<Page['request']['get']>>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = (await r.json().catch(() => ({}))) as any;
  return j?.result ? { ok: true as const, data: j.result.data } : { ok: false as const, reason: j?.error?.data?.game?.reason ?? 'ERROR', data: null };
};
const mutate = (page: Page, proc: string, data: object = {}) => page.request.post(`/api/trpc/${proc}`, { data }).then(parse);
const read = (page: Page, proc: string, input?: object) =>
  page.request.get(`/api/trpc/${proc}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`).then(parse);
const hook = async (page: Page, path: string, data: object = {}) => {
  const r = await page.request.post(`/api/test/${path}`, { data });
  expect(r.ok(), `${path}: ${await r.text()}`).toBe(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await r.json()) as any;
};

async function member(browser: Browser, name: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await signUp(page, name);
  return { ctx, page };
}

test.describe.configure({ mode: 'serial' });

let A_NAME = '';
let B_NAME = '';

test('bail from the chat line, out on the branch\'s Iron; a visit on the ward; Ask to join lands for you', async ({ browser }) => {
  test.setTimeout(240_000);
  // Unique per run (a repeated run shares the server's database, and names are unique).
  A_NAME = `Cara H${tag()}`;
  B_NAME = `Dora L${tag()}`;
  const a = await member(browser, A_NAME);
  const b = await member(browser, B_NAME);
  const bId = ((await read(b.page, 'character.me')) as { data: { id: string } }).data.id;
  await hook(a.page, 'character', { iron: 2_000, energy: 100 });

  // 1. B to the cells. A: the chat's *taken in* line with *Post bail*; the Members row in the failure colour.
  await hook(b.page, 'held', { send: 'cells' });
  const socket = a.page.waitForEvent('websocket', { timeout: 15_000 });
  await a.page.goto('/faction?tab=chat');
  await socket;
  const taken = a.page.getByTestId('chat-system').filter({ hasText: `${B_NAME} has been taken in at` });
  await expect(taken).toBeVisible();
  const bailButton = taken.getByTestId('chat-system-button');
  await expect(bailButton).toHaveText(/^Post bail · [\d,]+ Iron$/);

  await a.page.goto('/faction?tab=members');
  const bRow = a.page.getByTestId('member-row').filter({ hasText: `${B_NAME}` });
  await expect(bRow).toHaveAttribute('data-status', 'cells');
  await expect(bRow.getByTestId('member-status')).toHaveText(/^in the cells at .+ · out in \d+ min$/);
  await expect(bRow.getByTestId('member-status')).toHaveClass(/text-failure/);
  await expect(bRow.getByTestId('member-favour')).toHaveText(/^Post bail · [\d,]+ Iron$/);

  // From the chat line: the sheet, then the button; the payer's modal.
  await a.page.goto('/faction?tab=chat');
  await a.page.getByTestId('chat-system').filter({ hasText: `${B_NAME} has been taken in at` }).getByTestId('chat-system-button').click();
  const sheet = a.page.getByTestId('favour-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(`${B_NAME} is in the cells at`);
  await expect(sheet).toContainText('You get +10 Party XP.');
  await a.page.waitForTimeout(400);
  await a.page.screenshot({ path: '../../docs/qa/slice-6/bail-sheet-phone.png' });
  await sheet.getByTestId('favour-confirm').click();
  await expect(a.page.getByTestId('result-stamp').or(a.page.getByText('Bail posted', { exact: true })).first()).toBeVisible();
  await expect(a.page.getByRole('dialog')).toContainText(`${B_NAME} is out`);
  await expect(a.page.getByRole('dialog')).toContainText('+10 Party XP');
  await a.page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
  await expect(a.page.getByRole('dialog')).toHaveCount(0);
  // The chat's line has no button now (B is out); the bail line follows.
  await expect(
    a.page.getByTestId('chat-system').filter({ hasText: `${B_NAME} has been taken in at` }).getByTestId('chat-system-button'),
  ).toHaveCount(0);
  await expect(a.page.getByTestId('chat-system').filter({ hasText: `${A_NAME} posted ${B_NAME}'s bail` })).toBeVisible();
  // A second payer is refused: *Already out*.
  const again = await mutate(a.page, 'favours.postBail', { characterId: bId, idempotencyKey: crypto.randomUUID() });
  expect(again.ok).toBe(false);

  // 2. B reloads: released, *Out, on the branch's Iron*.
  await b.page.goto('/held');
  const release = b.page.getByRole('dialog');
  await expect(release).toContainText("Out, on the branch's Iron");
  await expect(release).toContainText(`posted by ${A_NAME}`);
  await release.getByRole('button', { name: 'Continue' }).click();
  await expect(b.page).toHaveURL(/\/city\//);

  // 3. B to the infirmary. A: *Visit · 3 Energy* on B's row → *Visited*; B's ward names A.
  await hook(b.page, 'held', { send: 'infirmary' });
  await b.page.goto('/held');
  const before = await b.page.getByTestId('held-minutes').innerText();
  await a.page.goto('/faction?tab=members');
  const ward = a.page.getByTestId('member-row').filter({ hasText: `${B_NAME}` });
  await expect(ward).toHaveAttribute('data-status', 'infirmary');
  await expect(ward.getByTestId('member-favour')).toHaveText('Visit · 3 Energy');
  await ward.getByTestId('member-favour').click();
  const visit = a.page.getByTestId('favour-sheet');
  await expect(visit).toHaveAttribute('data-kind', 'visit');
  await expect(visit).toContainText(`${B_NAME} is in the infirmary`);
  await visit.getByTestId('favour-confirm').click();
  await expect(a.page.getByRole('dialog')).toContainText('Grapes and the paper');
  await expect(a.page.getByRole('dialog')).toContainText(`${B_NAME}: Health +10, out five minutes sooner`);
  await a.page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
  await expect(ward.getByTestId('member-favour')).toHaveText('Visited');
  await expect(ward.getByTestId('member-favour')).toBeDisabled();
  // A again: refused, *You've visited this stay*.
  const twice = await mutate(a.page, 'favours.visit', { characterId: bId, idempotencyKey: crypto.randomUUID() });
  expect(twice.ok).toBe(false);
  expect(twice.reason).toBe('ALREADY_VISITED');
  await b.page.reload();
  await expect(b.page.getByTestId('held-visitors')).toHaveText(`Visitors: ${A_NAME}, Health +10 and five minutes off each`);
  await expect(b.page.getByTestId('held-minutes')).not.toHaveText(before);

  // B out again (discharged by the hook), the release closed.
  await hook(b.page, 'held', { releaseNow: true });
  await b.page.goto('/held');
  const out = b.page.getByRole('dialog');
  if (await out.isVisible().catch(() => false)) await out.getByRole('button', { name: 'Continue' }).click();

  // 4. A on the fixture as a hand; *Ask to join* on B's row; B's chat shows the line *for you* with Join.
  const board = (await read(a.page, 'events.board')) as { ok: boolean; data: { here: { events: Array<{ id: string; kind: string }> } } };
  expect(board.ok).toBe(true);
  const fixture = board.data.here.events.find((e) => e.kind === 'fixture')!;
  expect(fixture).toBeTruthy();
  const hand = await mutate(a.page, 'events.signUp', { eventId: fixture.id, slot: 'hand', idempotencyKey: crypto.randomUUID() });
  expect(hand.ok, JSON.stringify(hand)).toBe(true);
  await a.page.goto('/faction?tab=members');
  const ask = a.page.getByTestId('member-row').filter({ hasText: `${B_NAME}` }).getByTestId('member-ask');
  await expect(ask).toHaveText('Ask to join');
  await ask.click();
  await expect(ask).toHaveText('Asked');
  await expect(ask).toBeDisabled();

  const bSocket = b.page.waitForEvent('websocket', { timeout: 15_000 });
  await b.page.goto('/faction?tab=chat');
  await bSocket;
  const nudge = b.page.locator('[data-testid="chat-system"][data-kind="nudge"][data-for-you="true"]');
  await expect(nudge).toHaveAttribute('data-for-you', 'true');
  await expect(nudge).toContainText('for you');
  await expect(nudge).toContainText(`${A_NAME} asks ${B_NAME} for a pair of hands at the`);
  await expect(nudge.getByTestId('chat-system-button')).toHaveText('Join');

  await a.ctx.close();
  await b.ctx.close();
});

test('a released stay not yet seen shows its release modal on a deep link to /faction (QA m2)', async ({ browser }) => {
  test.setTimeout(120_000);
  const c = await member(browser, `Ema R${tag()}`);
  await hook(c.page, 'held', { send: 'cells' });
  await hook(c.page, 'held', { releaseNow: true });
  // A bookmark or a reload on the Faction tab, not `/`: the shell's gate shows the release.
  await c.page.goto('/faction?tab=events');
  const release = c.page.getByRole('dialog');
  await expect(release).toBeVisible();
  const go = release.getByRole('button', { name: 'Continue' });
  await expect(go).toBeVisible();
  expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await go.click();
  await expect(release).toBeHidden();
  // The player stays where they opened the game; the stay is closed.
  expect(new URL(c.page.url()).pathname).toBe('/faction');
  const me = (await read(c.page, 'character.me')) as { ok: boolean; data: { held: unknown } };
  expect(me.ok).toBe(true);
  expect(me.data.held).toBeNull();
  // A reload shows nothing again.
  await c.page.reload();
  await expect(c.page.getByTestId('call-rank-line').or(c.page.getByTestId('call-an-event')).first()).toBeVisible();
  await expect(c.page.getByRole('dialog')).toHaveCount(0);
  await c.ctx.close();
});
