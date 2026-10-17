import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { sheetSettled, signUp } from './helpers';
import { lifeSweep } from './nationKit';

/**
 * Slice 8 (tech design §15.1, T21, T23; screens §6, §7, §12): the Dossier and the exposé on a phone at
 * 390 × 844. Three entries on a rival name (hook) light the tab's dot; the name card's clock is full;
 * *Make a Case File* → *Bound*; *Take it to the paper* opens Herald House's sheet; the exposé's two
 * steps (the file and the angle, the editor's desk) with a forced Success → *Printed* with the
 * opinion and Legacy lines; the next morning the front page with the player's name, and another
 * player's paper carries the public line. A second file is sold at Central Station. Screenshots to
 * docs/qa/slice-8/.
 */

const SHOTS = '../../docs/qa/slice-8';
const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const hook = (page: Page, path: string, data: Record<string, unknown>) =>
  page.request.post(`/api/test/${path}`, { data }).then(async (r) => {
    expect(r.ok(), await r.text()).toBe(true);
    return r.json() as Promise<Record<string, unknown>>;
  });
const politicalModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });

const RIVAL = { id: 'npc.v.kessler', name: 'Ernst Kessler' };
const SECOND = { id: 'npc.v.vogel', name: 'Margarethe Vogel' };

async function newPlayer(browser: Browser, name: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await signUp(page, name);
  return page;
}

test('the Dossier: three entries, a Case File, the exposé printed, the front page; a file sold at the station', async ({
  page,
  browser,
}) => {
  test.setTimeout(300_000);
  await signUp(page, 'Klara Vesely');
  await lift(page, { level: 16, cityId: 'irongate', iron: 1_000 });

  // 1. Three entries on a rival name (hook): the tab's dot, then the Names chip's card with a full clock.
  await hook(page, 'dossier', {
    entries: [
      { subjectId: RIVAL.id, category: 'political' },
      { subjectId: RIVAL.id, category: 'criminal' },
      { subjectId: RIVAL.id, category: 'pattern' },
    ],
  });
  await page.goto('/me');
  await expect(page.getByTestId('tab-dot-dossier')).toBeVisible();
  await page.getByRole('link', { name: /^Dossier/ }).click();
  await expect(page).toHaveURL(/\/dossier$/);
  await expect(page.getByTestId('dossier-header')).toHaveText(/^3 of \d+ · 3 fresh · 0 stale · 0 Case Files$/);
  // Opening the tab clears its dot (`dossier.seen`).
  await expect(page.getByTestId('tab-dot-dossier')).toHaveCount(0);
  const card = page.locator(`[data-testid="name-card"][data-subject="${RIVAL.id}"]`);
  await expect(card).toContainText(RIVAL.name);
  await expect(card.getByTestId('clock')).toHaveAttribute('data-clock', 'fresh,fresh,fresh');
  await expect(card.getByTestId('name-count')).toHaveText('3 entries · 3 toward a Case File');
  await expect(card.getByTestId('entry-row')).toHaveCount(2);
  await card.getByTestId('name-more').click();
  await expect(card.getByTestId('entry-row')).toHaveCount(3);
  // Above the fold (screens §16): the header, the chips and the first card's button; it never wraps.
  const make = card.getByTestId('make-case-file');
  await expect(make).toBeInViewport();
  expect((await make.boundingBox())!.height).toBeLessThan(56);
  // Plain words and no percentages (screens intro).
  const text = (await page.getByTestId('dossier-page').textContent()) ?? '';
  expect(text).not.toMatch(/\b(inventory|slot|tier|NPC)\b|%/);
  for (const b of await page.getByTestId('dossier-page').getByRole('button').all())
    expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${SHOTS}/dossier.png` });
  await lifeSweep(page, 'dossier');

  // 2. *Make a Case File* → *Bound*, with the slots line.
  await make.click();
  const bound = politicalModal(page);
  await expect(bound.getByTestId('stamp')).toHaveText('Bound');
  await expect(bound.getByRole('heading', { name: `A Case File on ${RIVAL.name}` })).toBeVisible();
  await expect(bound.getByTestId('political-dossier')).toHaveText(/^Dossier \d+ of \d+$/);
  await bound.getByRole('button', { name: 'Continue' }).click();

  // 3. The Case Files chip: the kinds, the three uses; *Take it to the paper* opens Herald House.
  await page.getByTestId('dossier-chip-files').click();
  await expect(page).toHaveURL(/tab=files/);
  const file = page.getByTestId('case-file').first();
  await expect(file).toContainText(RIVAL.name);
  await expect(file.getByTestId('case-file-kinds')).toContainText('Political');
  await expect(file.getByTestId('case-file-print')).toBeEnabled();
  await file.getByTestId('case-file-print').click();
  await expect(page).toHaveURL(/\/city\/irongate\/irongate\.old-town\?loc=irongate\.herald-house/);
  await sheetSettled(page);
  const sheet = page.locator('[role=dialog][data-layout]');
  const ticket = sheet.getByTestId('expose-ticket');
  await ticket.scrollIntoViewIfNeeded();
  await expect(ticket).toContainText('Exposé · one a day');
  await ticket.getByTestId('expose-open').click();

  // 4. Step 1: the file as a radio row and the two angles (above the fold); one tap commits both.
  await expect(page).toHaveURL(/\/dossier\/expose\?loc=irongate\.herald-house/);
  const story = page.getByTestId('expose-screen');
  await expect(story).toHaveAttribute('data-step', '1');
  await expect(page.getByTestId('expose-kicker')).toHaveText('Exposé · Herald House · step 1 of 3');
  await expect(story.getByTestId('expose-file').first()).toContainText(RIVAL.name);
  await expect(story.getByTestId('expose-angle')).toHaveCount(2);
  await expect(story.locator('[data-angle="headline"]')).toBeInViewport();
  await page.screenshot({ path: `${SHOTS}/expose-step1.png` });
  await lifeSweep(page, 'expose-step1');
  await story.locator('[data-angle="plain"]').click();

  // 5. Step 2 (resumable: a reload keeps the file and the angle): three ways with odds words; the CTA.
  await expect(story).toHaveAttribute('data-step', '2');
  await page.reload();
  await expect(page.getByTestId('expose-screen')).toHaveAttribute('data-step', '2');
  const ways = page.getByTestId('expose-way');
  await expect(ways).toHaveCount(3);
  // The odds as a word (the server's band), never a figure.
  for (const w of await ways.all()) expect(((await w.textContent()) ?? '').length).toBeGreaterThan(8);
  expect((await page.getByTestId('expose-screen').textContent()) ?? '').not.toContain('%');
  await expect(page.getByTestId('expose-cta')).toBeDisabled();
  await page.locator('[data-way="write"]').click();
  await expect(page.getByTestId('expose-cta')).toHaveText('Take it to the editor · 20 Energy');
  await page.screenshot({ path: `${SHOTS}/expose-step2.png` });
  await lifeSweep(page, 'expose-step2');
  await hook(page, 'street', { rolls: [1] });
  await page.getByTestId('expose-cta').click();

  // 6. *Printed*: the opinion swing, Legacy +2, the file spent, the name in tomorrow's paper.
  const result = page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
  await expect(result.getByTestId('stamp')).toHaveText('Printed');
  const lines = result.getByTestId('effect-expose');
  await expect(lines.first()).toBeAttached();
  const all = (await lines.allTextContents()).join(' | ');
  expect(all).toMatch(/Opinion in [A-Z][a-z]+: Vanguard −1\.0/);
  expect(all).toContain('Legacy +2');
  expect(all).toContain('Case File spent');
  expect(all).toContain(`${RIVAL.name} is in tomorrow's paper`);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  await page.screenshot({ path: `${SHOTS}/expose-printed.png` });
  await lifeSweep(page, 'expose-printed');
  await result.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/city\/irongate\/irongate\.old-town\?loc=irongate\.herald-house/);

  // 7. A second file, sold at Central Station: *Sell · 200 Iron* → the confirm → *Sold*.
  await hook(page, 'dossier', { file: SECOND.id });
  await page.goto('/dossier?tab=files');
  const second = page.locator('[data-testid="case-file"]').filter({ hasText: SECOND.name });
  await expect(second).toBeVisible();
  await second.getByTestId('case-file-sell').click();
  await expect(page).toHaveURL(/loc=irongate\.central-station/);
  await sheetSettled(page);
  const station = page.locator('[role=dialog][data-layout]').getByTestId('station-card');
  await station.scrollIntoViewIfNeeded();
  await expect(station).toContainText('The man by the left-luggage');
  await station.getByTestId('station-sell-open').click();
  const row = page.locator('[data-testid="station-row"][data-kind="file"]').filter({ hasText: SECOND.name });
  await expect(row.getByTestId('station-row-sell')).toHaveText('Sell · 200 Iron');
  await row.getByTestId('station-row-sell').click();
  await expect(row.getByTestId('station-confirm')).toContainText(`Sell Case File · ${SECOND.name} for 200 Iron?`);
  await row.getByTestId('station-confirm-sell').click();
  const sold = politicalModal(page);
  await expect(sold.getByTestId('stamp')).toHaveText('Sold');
  await expect(sold.getByRole('heading', { name: 'A word by the left-luggage' })).toBeVisible();
  await sold.getByRole('button', { name: 'Continue' }).click();

  // 8. The next morning: the front page with the player's name; the name card is *in the paper*.
  await page.request.post('/api/test/clock', { data: { advanceMs: 24 * 3_600_000 } });
  await page.request.post('/api/test/city-day', { data: {} });
  await page.goto('/paper');
  const front = page.getByTestId('expose-front');
  await expect(front).toContainText(`${RIVAL.name} EXPOSED`);
  await expect(front).toContainText('By Klara Vesely');
  await page.screenshot({ path: `${SHOTS}/expose-front-page.png` });
  await lifeSweep(page, 'expose-front-page');
  await hook(page, 'dossier', { entries: [{ subjectId: RIVAL.id, category: 'political' }] });
  await page.goto('/dossier');
  await expect(page.locator(`[data-testid="name-card"][data-subject="${RIVAL.id}"]`).getByTestId('name-burned')).toContainText(
    /^in the paper [A-Z][a-z]+day · nothing new for 14 days$/,
  );

  // 9. Another player's paper the same morning: the public exposé line, In Print.
  const other = await newPlayer(browser, 'Pavel Hruby');
  await other.goto('/paper');
  await expect(other.getByTestId('public-expose')).toContainText(`${RIVAL.name} EXPOSED`);
  await expect(other.getByTestId('public-expose')).toContainText('By Klara Vesely');
  await other.context().close();
});
