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
  // The dev panel's toggle (test builds only) sits at the right edge mid-screen, over this line's Report.
  await line.getByTestId('chat-report').dispatchEvent('click');
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

  // 15 Oct (the user): *Reich* is not blocked; the rest of the list stays.
  await resetLimits();
  const reich = `the Reich is over ${t4}`;
  await input.fill(reich);
  await send.click();
  await expect(c.page.getByTestId('chat-text').filter({ hasText: reich })).toHaveText(reich);

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

/** WCAG relative luminance contrast of two `rgb()`/`rgba()` colours (alpha ignored: both opaque here). */
function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

test('review 7 #1, the Branch Office: paper under the HUD, a three-cue tab, 3:1 dividers, the crest an SVG seal (390 × 844, 375 × 667, desktop)', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const a = await member(browser, `Lena B${tag()}`, { ...PHONE, viewport: { width: 390, height: 844 } });
  // Two lines in the branch's room for the screenshots.
  const made = (await hook(a.page, 'members', { n: 2 })) as { members: Array<{ characterId: string }> };
  const [m1, m2] = made.members;
  await hook(a.page, 'chat', { as: m1!.characterId, channel: 'city:collective:coalport', text: "who's on the rally tonight" });
  await hook(a.page, 'chat', { as: m2!.characterId, channel: 'city:collective:coalport', text: "I'll do the leaflets. Who has the tram money" });

  const DIR = '../../docs/design/faction-tab-redesign';
  for (const size of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
  ]) {
    const p = a.page;
    await p.setViewportSize(size);
    await openFaction(p, 'events');
    await expect(p.getByTestId('faction-plate-line')).toContainText('branch · ');
    await expect(p.getByTestId('faction-header-line')).toContainText('member');

    // The crest is the real SVG, its own shape (no round paper disc behind it).
    const crest = p.getByTestId('faction-crest');
    await expect(crest).toHaveAttribute('src', /\/art\/crest\.collective\.svg$/);
    const crestBox = await crest.evaluate((el) => {
      const img = el as HTMLImageElement;
      const cs = getComputedStyle(img);
      const parent = getComputedStyle(img.parentElement!);
      return { loaded: img.complete && img.naturalWidth > 0, w: img.getBoundingClientRect().width, radius: cs.borderRadius, parentRadius: parent.borderRadius };
    });
    expect(crestBox.loaded).toBe(true);
    expect(Math.round(crestBox.w)).toBe(64);
    expect(crestBox.radius).toBe('0px');
    expect(crestBox.parentRadius).toBe('0px');

    // No ink band under the HUD: the letterhead and the strip are paper; the plate is the only dark.
    const paper = 'rgb(239, 230, 210)';
    const bg = (id: string) => p.getByTestId(id).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await bg('faction-header')).toBe(paper);
    expect(await bg('faction-tabs')).toBe(paper);
    const plate = p.getByTestId('faction-plate');
    expect(Math.round((await plate.boundingBox())!.height)).toBe(128);
    await expect(plate.locator('img')).toHaveAttribute('src', /scene\.union-hq/);

    // The selected cell: aria-current, weight 600, the paper-card fill, a 3 px ink bar touching the
    // panel (its foot at the strip's foot), the faction's 2 px line above it.
    const on = p.getByTestId('faction-tab-events');
    await expect(on).toHaveAttribute('aria-current', 'page');
    const cell = await on.evaluate((el) => {
      const cs = getComputedStyle(el);
      const barEl = el.querySelector('[data-testid=faction-tab-bar]')!;
      const bar = barEl.getBoundingClientRect();
      const strip = el.parentElement!.getBoundingClientRect();
      return {
        weight: Number(cs.fontWeight),
        bg: cs.backgroundColor,
        color: cs.color,
        barH: bar.height,
        barBg: getComputedStyle(barEl).backgroundColor,
        barFoot: bar.bottom,
        stripFoot: strip.bottom,
        accent: !!el.querySelector('[data-testid=faction-tab-accent]'),
      };
    });
    expect(cell.weight).toBeGreaterThanOrEqual(600);
    expect(cell.bg).toBe('rgb(246, 240, 225)');
    expect(cell.barH).toBe(3);
    expect(contrast(cell.barBg, paper)).toBeGreaterThanOrEqual(14);
    expect(Math.abs(cell.barFoot - cell.stripFoot)).toBeLessThanOrEqual(0.5);
    expect(cell.accent).toBe(true);
    const off = await p.getByTestId('faction-tab-orders').evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        weight: Number(cs.fontWeight),
        color: cs.color,
        divider: cs.borderRightColor,
        dividerW: cs.borderRightWidth,
        rule: getComputedStyle(el.parentElement!).borderBottomColor,
      };
    });
    expect(off.weight).toBeLessThan(600);
    // Every divider at 3:1 or more against the paper; the labels at 4.5:1.
    const ratios = { divider: contrast(off.divider, paper), rule: contrast(off.rule, paper), label: contrast(off.color, paper), selected: contrast(cell.color, cell.bg) };
    console.log(`Branch Office ${size.width}x${size.height}`, JSON.stringify(Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, v.toFixed(2)]))));
    expect(off.dividerW).toBe('1px');
    expect(ratios.divider).toBeGreaterThanOrEqual(3);
    expect(ratios.rule).toBeGreaterThanOrEqual(3);
    expect(ratios.label).toBeGreaterThanOrEqual(4.5);
    // Every cell is a 44 px target; five fit without a scrolling row.
    for (const t of ['orders', 'events', 'members', 'scoreboard', 'chat']) {
      const b = (await p.getByTestId(`faction-tab-${t}`).boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // The plate's caps line: the worst (lightest) pixel under it, text hidden, against paper text.
    const line = p.getByTestId('faction-plate-line');
    await line.evaluate((el) => ((el as HTMLElement).style.color = 'transparent'));
    const png = (await line.screenshot()).toString('base64');
    await line.evaluate((el) => ((el as HTMLElement).style.color = ''));
    const worst = await p.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = img.width;
      cv.height = img.height;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const lin = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      let max = 0;
      for (let i = 0; i < d.length; i += 4) max = Math.max(max, 0.2126 * lin(d[i]!) + 0.7152 * lin(d[i + 1]!) + 0.0722 * lin(d[i + 2]!));
      const paperL = 0.2126 * lin(239) + 0.7152 * lin(230) + 0.0722 * lin(210);
      return (paperL + 0.05) / (max + 0.05);
    }, png);
    console.log(`Branch Office ${size.width}x${size.height} plate line, worst pixel`, worst.toFixed(2));
    expect(worst).toBeGreaterThanOrEqual(4.5);
    if (size.height === 844) await p.screenshot({ path: `${DIR}/built-events-390.png` });

    // Chat: the compact letterhead, the channels as paper chips, nothing ink between HUD and composer.
    await openFaction(p, 'chat');
    await expect(p.getByTestId('faction-header')).toHaveAttribute('data-compact', 'true');
    await expect(p.getByTestId('faction-plate')).toHaveCount(0);
    expect(Math.round((await p.getByTestId('faction-letterhead-compact').boundingBox())!.height)).toBe(52);
    const chips = p.getByTestId('chat-channel');
    expect(await chips.count()).toBe(3);
    for (let i = 0; i < 3; i++) {
      const c = await chips.nth(i).evaluate((el) => ({ sel: el.getAttribute('aria-selected'), bg: getComputedStyle(el).backgroundColor, h: el.getBoundingClientRect().height }));
      expect(c.h).toBeGreaterThanOrEqual(44);
      expect(c.bg).toBe(c.sel === 'true' ? 'rgb(21, 24, 26)' : 'rgba(0, 0, 0, 0)');
    }
    expect(await p.getByRole('tablist', { name: 'Chat' }).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await expect(p.getByTestId('chat-composer')).toBeInViewport();
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (size.height === 844) await p.screenshot({ path: `${DIR}/built-chat-390.png` });
  }

  // Desktop: the plate across the sheet, four 150 px cells left-aligned, *The room* over the column.
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await desk.addCookies(await a.ctx.cookies());
  const d = await desk.newPage();
  await d.goto('/faction?tab=events');
  await expect(d.getByTestId('faction-events')).toBeVisible();
  expect(Math.round((await d.getByTestId('faction-plate').boundingBox())!.height)).toBe(180);
  expect(Math.round((await d.getByTestId('faction-crest').boundingBox())!.width)).toBe(80);
  await expect(d.getByTestId('faction-tab-chat')).toHaveCount(0);
  const cells = d.getByTestId('faction-tabs').getByRole('button');
  expect(await cells.count()).toBe(4);
  const first = (await cells.nth(0).boundingBox())!;
  const strip = (await d.getByTestId('faction-tabs').boundingBox())!;
  expect(Math.round(first.width)).toBe(150);
  expect(Math.round(first.x)).toBe(Math.round(strip.x));
  const column = d.getByRole('complementary', { name: 'Chat' });
  await expect(column.getByTestId('chat-room-head')).toContainText('The room');
  expect(await column.getByTestId('chat-room-head').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(226, 214, 187)');
  await expect(column.getByTestId('chat-composer')).toBeInViewport();
  await d.waitForTimeout(500);
  await d.screenshot({ path: `${DIR}/built-desktop.png` });
  await desk.close();
  await a.ctx.close();
});
