import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { arrivalContinue, signUp } from './helpers';
import { sweep } from './nationKit';

/**
 * Slice 7 (tech design §15.1 `clearwater.spec.ts`; screens §2, §10), on a phone: the nation map's new
 * layer (the republic's bar and the law chips over a map that still covers the rest, at 375 × 667,
 * the pins' second line, the republic sheet, the city card's plate word); a Level 10 player boards for
 * the lake (*Board · 20 Iron · {n} min*), the journey on the nation map, the arrival on the one map with
 * the Casino selected, The Front's later pins, *Live here · 500 Iron*, a canvass at the fish quay with
 * its odds words, a mission at the Tram Depot, a bed in the Rows; the Courier the next morning for the
 * resident and a visitor's own paper's Clearwater edition (a second context); the count: seven seats in
 * the Casino's hall blocks and *Mayor: …* under them.
 */

const map = (page: Page) => page.getByTestId('city-map');
const stampModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
const SHOTS = '../../docs/qa/slice-7';

async function lift(page: Page, data: Record<string, number>) {
  expect((await page.request.post('/api/test/character', { data })).ok()).toBe(true);
}

/** Board for Clearwater from the nation map's card and arrive (the hook), then Continue. */
async function toTheLake(page: Page) {
  await page.goto('/nation?city=clearwater');
  const card = page.getByTestId('city-card');
  await expect(card).toHaveAttribute('data-city', 'clearwater');
  const board = page.getByTestId('city-board');
  await expect(board).toHaveText(/^Board · 20 Iron · \d+ min$/i);
  await board.click();
  await expect(page).toHaveURL(/\/journey$/);
  expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
  await page.reload();
  // The lake's first arrival (screens §10): *You're on the lake*; Continue lands on the Casino.
  await expect(page.getByTestId('arrival-headline')).toHaveText("You're on the lake");
  await arrivalContinue(page);
}

test.use({ viewport: { width: 390, height: 844 } });

test('the nation map: the bar and the law chips over a covering map at 375 × 667, the second lines, the sheet', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page, 'Vera Seidl');
  await lift(page, { level: 10, fxp: 500, iron: 600 });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/nation');
  await expect(map(page)).toHaveAttribute('data-fit', 'cover');
  const bar = page.getByTestId('nation-bar');
  const chips = page.getByTestId('law-chips');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Who holds the republic');
  await expect(bar).toContainText(/the (Vanguard|Collective|Alliance) leads/);
  // Slice 7 integration: at 375 × 667 (an upright phone 700 px tall or less) the law chips give way
  // to the map, as the city's rule line does, so review 6's every-pin check holds with the paper's
  // banner up; the bar (44 px) stays over the map, which fills what is left.
  await expect(chips).toBeHidden();
  const b = (await bar.boundingBox())!;
  let m = (await map(page).boundingBox())!;
  expect(Math.round(b.height)).toBe(44);
  expect(m.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
  let nav = (await page.getByRole('navigation').last().boundingBox())!;
  expect(m.y + m.height).toBeGreaterThanOrEqual(nav.y - 2);
  expect(m.height).toBeGreaterThan(300);
  // Screens §14 on a taller phone: the bar (44 px) and the chips (36 px), under the top bar, over the map.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chips.getByTestId('law-chip').first()).toHaveText(/No law in force · Parliament sits|· \d+ days?$/);
  const b2 = (await bar.boundingBox())!;
  const c = (await chips.boundingBox())!;
  m = (await map(page).boundingBox())!;
  expect(Math.round(c.height)).toBe(36);
  expect(c.y).toBeGreaterThanOrEqual(b2.y + b2.height - 1);
  expect(m.y).toBeGreaterThanOrEqual(c.y + c.height - 1);
  nav = (await page.getByRole('navigation').last().boundingBox())!;
  expect(m.y + m.height).toBeGreaterThanOrEqual(nav.y - 2);
  await page.setViewportSize({ width: 375, height: 667 });
  // The pins' second line: who holds each city (the capital and the lake are contested).
  const irongate = page.locator('[data-testid=hotspot][aria-label^="Irongate"]');
  await expect(irongate).toHaveAttribute('aria-label', /, (close race today|contested|held by the \w+)$/);
  // The bar opens the republic sheet: the five cities weighted, the capital first, the term line.
  await bar.click();
  const sheet = page.getByRole('dialog', { name: 'The republic' });
  await expect(sheet.getByTestId('republic-city')).toHaveCount(5);
  await expect(sheet.getByTestId('republic-city').first()).toHaveAttribute('data-city', 'irongate');
  await expect(sheet).toContainText('Five cities, weighted: Irongate 40, Clearwater 30');
  await expect(sheet.getByTestId('term-line')).toHaveText(
    /^(The republic votes from \w+ · \d+ days?|Names in until .+|The parties pick until .+|Voting open until .+|The result is in: to be confirmed tomorrow)$/,
  );
  await sheet.getByRole('button', { name: 'Close' }).click();
  // The city card's plate word.
  await page.goto('/nation?city=clearwater');
  await expect(page.getByTestId('city-word')).toHaveText(/^(Close race today|Contested|Held by the \w+)$/);
  // The paper's *From the capital* (the Clarion): the republic's line, live at read (the next
  // morning: the nation's first boundary writes the day's lines).
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await page.request.post('/api/test/clock', { data: { advanceMs: 24 * 3_600_000 } })).ok()).toBe(true);
  expect((await page.request.post('/api/test/city-day')).ok()).toBe(true);
  await page.goto('/paper');
  const national = page.getByTestId('paper-national');
  await expect(national).toContainText('From the capital');
  await expect(national.getByTestId('national-line').first()).toBeVisible();
  await national.scrollIntoViewIfNeeded();
  await sweep(page, 'paper republic');

  await page.screenshot({ path: `${SHOTS}/paper-republic-390x844.png` });
  await page.goto('/nation');
  await expect(map(page)).toHaveAttribute('data-moving', 'false');
  await sweep(page, 'nation map bar');

  await page.screenshot({ path: `${SHOTS}/nation-map-bar-390x844.png` });
});

test('Clearwater: board, the one map on the Casino, Live here, a canvass, a mission, the Courier, the count', async ({
  page,
  browser,
}) => {
  test.setTimeout(300_000);
  await signUp(page, 'Ilse Brandt');
  // Level 12 and Rank 3 (the Tram Depot's mission is for Organisers and above).
  await lift(page, { level: 12, fxp: 2000, iron: 2000 });

  // 1. Board on the nation map; the journey is the train to the lake; arrive on the Casino.
  await toTheLake(page);
  await expect(page).toHaveURL(/\/city\/clearwater\?loc=clearwater\.casino$/);
  const casino = page.getByRole('dialog');
  await expect(casino.getByRole('heading', { name: 'The Casino' })).toBeVisible();
  // The Casino's sheet carries the hall's blocks (the voting rework's, one card per party).
  await expect(casino.getByTestId('hall-council')).toBeVisible();
  await casino.getByRole('button', { name: /^Close/ }).first().click();
  await expect(map(page)).toHaveAttribute('data-zoomed', 'false');
  // One map: no districts; The Front's three places are the later pins.
  await expect(page).toHaveURL(/\/city\/clearwater$/);
  await expect(page.getByTestId('locked-pin')).toHaveCount(3);
  await sweep(page, 'clearwater');

  await page.screenshot({ path: `${SHOTS}/clearwater-390x844.png` });

  // 2. Live here · 500 Iron, from the residence card.
  await page.getByTestId('residence-row').filter({ visible: true }).first().click();
  const where = page.getByRole('dialog').filter({ hasText: 'Where you live' }).last();
  await where.getByRole('button', { name: /^Live here · 500 Iron$/i }).click();
  const confirm = page.getByTestId('register-confirm');
  await expect(page.getByRole('dialog').last()).toContainText('The Courier is your paper.');
  await confirm.click();
  await expect(stampModal(page).getByTestId('stamp')).toHaveText('Moved in');
  await stampModal(page).getByRole('button', { name: 'Continue' }).click();

  // 3. A canvass at the fish quay: difficulty 10 (a battleground), its odds in words, one tap.
  await page.goto('/city/clearwater?loc=clearwater.harbour');
  const harbour = page.getByRole('dialog');
  await expect(harbour.getByRole('heading', { name: 'The Harbour' })).toBeVisible();
  const quay = harbour.getByTestId('ticket-clearwater.harbour.fish-quay');
  await expect(quay.getByTestId('ticket-odds')).toHaveText(/^(Good odds|Fair odds|Long shot|Very likely|Unlikely)\b/);
  await expect(quay).not.toContainText('%');
  await quay.getByRole('button', { name: /once/i }).first().click();
  await expect(stampModal(page).getByTestId('stamp')).toBeVisible();
  await stampModal(page).getByRole('button', { name: /^Continue/ }).click();

  // 4. A mission at the Tram Depot: the briefing and one way.
  expect((await page.request.post('/api/test/street', { data: { runIn: 'never', checkRoll: 1 } })).ok()).toBe(true);
  await page.goto('/city/clearwater?loc=clearwater.tram-depot');
  const timetable = page.locator('[data-mission="clearwater.tram-depot.timetable"]');
  await timetable.scrollIntoViewIfNeeded();
  await expect(timetable.getByTestId('mission-tags')).toContainText('Mission');
  await expect(timetable.getByTestId('mission-choose')).toBeVisible();
  await timetable.getByTestId('mission-choose').click();
  const briefing = page.getByTestId('briefing');
  await briefing.getByTestId('way-row').first().click();
  await briefing.getByTestId('briefing-confirm').click();
  const result = page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
  await expect(result.getByTestId('stamp')).toBeVisible();
  await result.getByRole('button', { name: 'Continue' }).click();

  // 5. A bed in the Rows.
  await page.goto('/city/clearwater?loc=clearwater.rows');
  const lodgings = page.getByTestId('lodgings');
  await expect(lodgings).toContainText('A bed in the Rows · 7 nights · 100 Iron');

  // 6. A visitor reads their own paper's Clearwater edition (a second context, a Coalport member).
  const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const v = await visitor.newPage();
  await signUp(v, 'Otto Lenz');
  await lift(v, { level: 12, fxp: 500, iron: 600 });
  await toTheLake(v);
  await v.goto('/paper');
  await expect(v.getByRole('heading', { level: 1 }).first()).toContainText('The Coalport Clarion');
  await expect(v.getByTestId('edition-line')).toContainText('Clearwater');
  await sweep(v, "the visitor's Clearwater edition");
  await visitor.close();

  // 7. The next morning the resident's paper is the Courier.
  expect((await page.request.post('/api/test/clock', { data: { advanceMs: 24 * 3_600_000 } })).ok()).toBe(true);
  expect((await page.request.post('/api/test/city-day')).ok()).toBe(true);
  await page.goto('/paper');
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('The Clearwater Courier');
  await sweep(page, 'the Courier');

  // 8. The count (the council's cycle day 0): seven seats at the Casino and who holds the chair.
  expect(
    (await page.request.post('/api/test/clock', { data: { advanceTo: { cityId: 'clearwater', cycleDay: 0 } } })).ok(),
  ).toBe(true);
  expect((await page.request.post('/api/test/city-day')).ok()).toBe(true);
  await page.goto('/city/clearwater?loc=clearwater.casino');
  const hall = page.getByRole('dialog').getByTestId('hall-council');
  await expect(hall.getByTestId('hall-seat')).toHaveCount(7);
  await expect(page.getByRole('dialog').getByTestId('hall-governor')).toHaveText(/^Mayor: .+/);
  await sweep(page, 'the Casino at the count');
});
