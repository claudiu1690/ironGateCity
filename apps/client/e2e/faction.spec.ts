import { expect, test } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { signUp } from './helpers';

/** Unique per run (a repeated run shares the server's database). */
const tag = () => Array.from({ length: 4 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');

/**
 * Slice 6 (tech design §15.1, `faction.spec.ts`): chat between two browsers (live over the socket
 * through `vite preview`'s proxy), mute and report, the Members list and the public profile, the
 * faction scoreboard, Me's *Chat* switch, and the desktop's chat column. Two real accounts (A and B,
 * the Collective in Coalport) in two browser contexts; test members fill the list (`/api/test/members`)
 * and speak (`/api/test/chat`).
 */

const PHONE = { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const parse = async (r: Awaited<ReturnType<Page['request']['get']>>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = (await r.json().catch(() => ({}))) as any;
  return j?.result ? { ok: true as const, data: j.result.data } : { ok: false as const, reason: j?.error?.data?.game?.reason ?? 'ERROR' };
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

async function member(browser: Browser, name: string, options: object = PHONE): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(options);
  const page = await ctx.newPage();
  await signUp(page, name);
  return { ctx, page };
}

/** Open the Faction tab at a part; for Chat, wait until the socket is up and the lines are read. */
async function openFaction(page: Page, tab: 'chat' | 'members' | 'scoreboard' | 'events') {
  const socket = tab === 'chat' ? page.waitForEvent('websocket', { timeout: 15_000 }) : null;
  await page.goto(`/faction?tab=${tab}`);
  await expect(page.getByTestId('faction-page')).toBeVisible();
  if (socket) {
    const ws = await socket;
    expect(ws.url()).toContain('/api/socket.io');
    await expect(page.getByTestId('chat-panel')).toBeVisible();
    // The history is in (empty or not) before anyone speaks.
    await expect(page.getByTestId('chat-header')).toContainText('here');
  }
}

test.describe.configure({ mode: 'serial' });

let A_NAME = '';
let B_NAME = '';
let RALLY = '';

test('chat live between two browsers, the limit line, report and mute; Members, the profile, the scoreboard; hiding chat', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  // Unique per run (a repeated run shares the server's database, and names are unique).
  RALLY = `who's on the rally tonight ${Math.random().toString(36).slice(2, 6)}`;
  A_NAME = `Anna V${tag()}`;
  B_NAME = `Bela R${tag()}`;
  const a = await member(browser, A_NAME);
  const b = await member(browser, B_NAME);
  const aMe = (await read(a.page, 'character.me')) as { ok: true; data: { id: string; name: string } };
  const aId = aMe.data.id;

  // B moves opinion once (a canvass at the Mill Gate, the roll forced to succeed), for the scoreboard.
  await hook(b.page, 'street', { rolls: [1] });
  const moved = await mutate(b.page, 'action.perform', {
    actionId: 'coalport.mill-gate.canvass',
    locationId: 'coalport.mill-gate',
    idempotencyKey: crypto.randomUUID(),
    times: 1,
  });
  expect(moved.ok, JSON.stringify(moved)).toBe(true);
  // Three test members of the party, so the list has a page to sort.
  await hook(a.page, 'members', { n: 3 });

  // 1. A and B on Chat; A speaks; B sees it live, without a reload, within two seconds.
  await openFaction(b.page, 'chat');
  await openFaction(a.page, 'chat');
  await a.page.getByTestId('chat-input').fill(RALLY);
  await a.page.getByTestId('chat-send').click();
  await expect(a.page.getByTestId('chat-line').filter({ hasText: RALLY })).toBeVisible();
  await expect(b.page.getByTestId('chat-line').filter({ hasText: RALLY })).toBeVisible({ timeout: 2_000 });
  // A second line inside three seconds: the limit line under the composer.
  await a.page.getByTestId('chat-input').fill('and the canvass after');
  await a.page.getByTestId('chat-send').click();
  await expect(a.page.getByTestId('chat-limit')).toHaveText('One message every three seconds');
  await expect(a.page.getByTestId('chat-input')).toHaveValue('and the canvass after');

  // 2. B reports A's line (a long press on a phone shows *Report*), once.
  const line = b.page.getByTestId('chat-line').filter({ hasText: RALLY });
  await line.dispatchEvent('contextmenu');
  await line.getByTestId('chat-report').click();
  await b.page.getByTestId('chat-report-confirm').click();
  await expect(line.getByTestId('chat-reported')).toHaveText('Reported');
  await expect(line.getByTestId('chat-report')).toHaveCount(0);
  // B mutes A from A's profile: A's lines collapse to *Muted · {A}*.
  await line.getByTestId('chat-name').click();
  const sheet = b.page.getByTestId('profile-sheet');
  await expect(sheet).toBeVisible();
  await sheet.getByTestId('profile-mute').click();
  await expect(sheet.getByTestId('profile-mute')).toHaveText('Unmute');
  await b.page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(b.page.getByTestId('chat-muted').first()).toHaveText(`Muted · ${A_NAME}`);
  await expect(b.page.getByTestId('chat-line').filter({ hasText: RALLY })).toHaveCount(0);
  // A tap shows the line once.
  await b.page.getByTestId('chat-muted').first().click();
  await expect(b.page.getByTestId('chat-line').filter({ hasText: RALLY })).toBeVisible();
  // Unmute again (the favours spec and later lines are A's).
  expect((await mutate(b.page, 'chat.mute', { characterId: aId, muted: false })).ok).toBe(true);

  // 3. Members: A here now in Coalport, among the first; the profile has nothing private.
  await b.page.goto('/faction?tab=members');
  const rows = b.page.getByTestId('member-row');
  await expect(rows.first()).toBeVisible();
  const aRow = rows.filter({ hasText: `${A_NAME}` });
  await expect(aRow.getByTestId('member-status')).toHaveText('here now · Coalport');
  const order = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-band')));
  const firstAway = order.findIndex((s) => s !== 'hereNow');
  const lastHere = order.lastIndexOf('hereNow');
  expect(firstAway === -1 || lastHere < firstAway, order.join(',')).toBe(true);
  // Search by name.
  await b.page.getByTestId('members-search').fill(A_NAME);
  await expect(rows).toHaveCount(1);
  await rows.first().getByRole('button').first().click();
  const profile = b.page.getByTestId('profile-sheet');
  await expect(profile).toBeVisible();
  await expect(profile).toContainText('Collective');
  await expect(profile).toContainText('Lives in Coalport');
  await expect(profile).toContainText('Member since');
  await expect(profile.getByTestId('profile-message')).toBeVisible();
  const words = (await profile.innerText()).toLowerCase();
  for (const w of ['record', 'heat', 'health', 'iron', 'str', 'agi', 'int ', 'charisma']) expect(words).not.toContain(w);
  await b.page.waitForTimeout(400);
  await b.page.screenshot({ path: '../../docs/qa/slice-6/members-profile-phone.png' });
  await b.page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(b.page.getByRole('dialog')).toHaveCount(0);
  await b.page.getByTestId('members-search').fill('');
  await expect(rows.nth(2)).toBeVisible();
  await b.page.screenshot({ path: '../../docs/qa/slice-6/members-phone.png' });

  // 4. Scoreboard: This week and All time, the city chips, B's own row highlighted.
  await b.page.goto('/faction?tab=scoreboard');
  const table = b.page.getByTestId('faction-scoreboard-table');
  await expect(table).toHaveAttribute('data-period', 'week');
  await expect(table.locator('[data-testid="faction-scoreboard-row"][data-you="true"]')).toContainText(`${B_NAME}`);
  await expect(b.page.getByTestId('scoreboard-city').first()).toHaveText('All cities');
  await expect(b.page.getByTestId('scoreboard-city').filter({ hasText: 'Coalport' })).toBeVisible();
  await b.page.screenshot({ path: '../../docs/qa/slice-6/scoreboard-phone.png' });
  await b.page.getByTestId('scoreboard-all').click();
  await expect(table).toHaveAttribute('data-period', 'all');
  await expect(table.locator('[data-testid="faction-scoreboard-row"][data-you="true"]')).toContainText(`${B_NAME}`);
  await b.page.getByTestId('scoreboard-city').filter({ hasText: 'Coalport' }).click();
  await expect(b.page.getByTestId('scoreboard-city').filter({ hasText: 'Coalport' })).toHaveAttribute('aria-pressed', 'true');

  // Chat on a phone, for the record.
  await openFaction(a.page, 'chat');
  await expect(a.page.getByTestId('chat-composer')).toBeInViewport();
  await a.page.screenshot({ path: '../../docs/qa/slice-6/chat-phone.png' });

  // 5. Me → hide chat: the Chat part says so and opens no socket; show it again.
  await b.page.goto('/me');
  await b.page.getByTestId('me-chat-toggle').click();
  await expect(b.page.getByTestId('me-chat')).toHaveText('Hidden');
  // Screens §2, §10 (phase C): with chat hidden there is no Chat chip; a link to it opens Events.
  await b.page.goto('/faction?tab=chat');
  await expect(b.page.getByTestId('faction-tab-chat')).toHaveCount(0);
  await expect(b.page.getByTestId('faction-events')).toBeVisible();
  await expect(b.page.getByTestId('chat-panel')).toHaveCount(0);

  // 6. Desktop (1440 × 900): Chat is a persistent column beside Events; hidden, it is gone.
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const d = await desk.newPage();
  d.on('pageerror', (e) => console.log('PAGEERROR', e.message, e.stack));
  await d.context().addCookies(await a.ctx.cookies());
  await d.goto('/faction?tab=events');
  await expect(d.getByTestId('faction-events')).toBeVisible();
  const column = d.getByRole('complementary', { name: 'Chat' });
  await expect(column.getByTestId('chat-panel')).toBeVisible();
  await expect(column.getByTestId('chat-line').filter({ hasText: RALLY })).toBeVisible();
  await d.screenshot({ path: '../../docs/qa/slice-6/chat-desktop.png' });
  // Enter sends on a desktop.
  await new Promise((r) => setTimeout(r, 3_100));
  await column.getByTestId('chat-input').fill('desk line');
  await column.getByTestId('chat-input').press('Enter');
  await expect(column.getByTestId('chat-line').filter({ hasText: 'desk line' })).toBeVisible();
  expect((await mutate(d, 'chat.setHidden', { hidden: true })).ok).toBe(true);
  await d.reload();
  await expect(d.getByTestId('faction-events')).toBeVisible();
  await expect(d.getByRole('complementary', { name: 'Chat' })).toHaveCount(0);
  expect((await mutate(d, 'chat.setHidden', { hidden: false })).ok).toBe(true);

  // A test member's line reaches the open chat live (the socket fans out any insert).
  const mates = (await read(a.page, 'faction.members', {})) as { ok: true; data: { rows: Array<{ characterId: string; name: string; you: boolean }> } };
  const mate = mates.data.rows.find((r) => !r.you && r.name !== `${B_NAME}`)!;
  await hook(a.page, 'chat', { as: mate.characterId, channel: 'city:collective:coalport', text: `count me in for the hands ${RALLY.slice(-4)}` });
  await expect(a.page.getByTestId('chat-line').filter({ hasText: `count me in for the hands ${RALLY.slice(-4)}` })).toBeVisible({ timeout: 2_000 });

  await desk.close();
  await a.ctx.close();
  await b.ctx.close();
});

test('the word filter: swearing masked with the dash, real-world hate refused and never posted, the game vocabulary untouched; a name refused (review 7 #2)', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const t4 = tag();
  const c = await member(browser, `Cora F${t4}`);
  const resetLimits = async () => {
    const r = await c.page.request.post('/api/test/dev/chatReset', { data: {} });
    expect(r.ok(), await r.text()).toBe(true);
  };
  await openFaction(c.page, 'chat');
  const input = c.page.getByTestId('chat-input');
  const send = c.page.getByTestId('chat-send');

  // Ordinary swearing: posted, masked as its first letter and the editor's dash.
  await input.fill(`you bastard ${t4}`);
  await send.click();
  await expect(c.page.getByTestId('chat-text').filter({ hasText: `you b— ${t4}` })).toBeVisible();
  await expect(c.page.getByTestId('chat-text').filter({ hasText: 'bastard' })).toHaveCount(0);
  await expect(input).toHaveValue('');

  // Real-world hate: refused; the composer keeps the draft and reads the refusal; nothing posted.
  await resetLimits();
  const lines = await c.page.getByTestId('chat-line').count();
  await input.fill(`sieg heil ${t4}`);
  await send.click();
  await expect(c.page.getByTestId('chat-limit')).toHaveText("That can't be said here.");
  await expect(input).toHaveValue(`sieg heil ${t4}`);
  await expect(c.page.getByTestId('chat-line')).toHaveCount(lines);
  const history = (await read(c.page, 'chat.history', { channel: 'city:collective:coalport' })) as {
    ok: true;
    data: { lines: Array<{ text?: string | null }> };
  };
  expect(history.data.lines.some((l) => (l.text ?? '').includes(t4) && /heil/i.test(l.text ?? ''))).toBe(false);
  // A refusal still counts toward the limits: an immediate retry is *too fast*.
  await send.click();
  await expect(c.page.getByTestId('chat-limit')).toHaveText('One message every three seconds');

  // The game's own vocabulary passes untouched.
  await resetLimits();
  const rally = `Rally at the Assembly Rooms tonight ${t4}`;
  await input.fill(rally);
  await send.click();
  await expect(c.page.getByTestId('chat-text').filter({ hasText: rally })).toHaveText(rally);

  // The editor's note behind the composer's label.
  await c.page.getByTestId('chat-editor-help').click();
  await expect(c.page.getByTestId('help-note')).toContainText("Swearing goes out with the editor's dash");
  await c.page.keyboard.press('Escape');
  await c.ctx.close();

  // A name: both tiers refuse it, under the field.
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto('/signup');
  await page.getByLabel('Your name').fill(`Bastard ${t4}`);
  await page.getByRole('group', { name: 'Your face' }).getByTestId('avatar-tile').nth(2).click();
  await page.getByLabel('Email').fill(`e2e-${Date.now()}-${t4}@example.test`);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText("That name can't be used here. Try another.")).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/signup$/);
  await ctx.close();
});
