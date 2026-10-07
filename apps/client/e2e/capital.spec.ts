import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, signUp } from './helpers';

/**
 * Slice 4's capital (tech design §15.1 `capital.spec.ts`), on a phone and on the shared test clock
 * (its own project, last): a Rank 2 player in Irongate registers in Eastside (the sheet's lines, the
 * modal, the Election card *Registered*), votes when the district's polls open (names of three
 * parties), and reads the count lazily: five districts, theirs first, the parties' table and the
 * candidates', no sideways scroll at 360 px; then Monday's paper with the Issues.
 */

const advanceTo = async (page: Page, cycleDay: number) => {
  const res = await page.request.post('/api/test/clock', { data: { advanceTo: { cityId: 'irongate', cycleDay } } });
  expect(res.ok()).toBe(true);
};
const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
const noSideScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
};

test('the capital: register in Eastside → vote across three parties → the count → Monday’s Issues', async ({
  page,
}) => {
  test.setTimeout(240_000);
  // 1. The capital's count day; a Rank 2 Collective member standing in Irongate.
  await advanceTo(page, 0);
  await signUp(page, 'Mara Lenk');
  const lift = await page.request.post('/api/test/character', {
    data: { level: 10, fxp: 500, iron: 900, cityId: 'irongate' },
  });
  expect(lift.ok()).toBe(true);

  // 2. Eastside: where you live (a phone: the plate's corner), the card, the sheet, *Live here*.
  await page.goto('/city/irongate/irongate.eastside');
  await expect(page.getByTestId('district-name').filter({ visible: true })).toHaveText('Eastside');
  await expect(page.getByTestId('district-kicker').filter({ visible: true })).toHaveText(/visiting/i);
  await page.getByTestId('residence-row').filter({ visible: true }).click();
  const card = page.getByRole('dialog', { name: 'Where you live' });
  await expect(card.getByTestId('residence-line1')).toHaveText('You live in Coalport.');
  await expect(card.getByTestId('residence-line2')).toHaveText(
    'Live in Eastside instead: vote and stand here, and your orders come from here. A week between moves.',
  );
  await expect(card.getByTestId('residence-register')).toHaveText('Live here · 500 Iron');
  await card.getByTestId('residence-register').click();
  const sheet = page.getByRole('dialog', { name: 'Live in Eastside · 500 Iron' });
  await expect(sheet).toBeVisible();
  const lines = await sheet.getByTestId('register-lines').getByRole('listitem').allTextContents();
  expect(lines.length).toBeGreaterThanOrEqual(4);
  expect(lines.join(' ')).toContain('You vote and stand in Eastside from the next election that opens');
  expect(lines.join(' ')).toContain('Your job, reputation, Iron and rank are untouched.');
  await sheet.getByTestId('register-confirm').click();
  const registered = modalOf(page);
  await expect(registered.getByTestId('stamp')).toHaveText('Moved in');
  await expect(registered).toContainText('Eastside has a new voter');
  await expect(registered.getByTestId('political-iron')).toContainText('−500 Iron');
  await registered.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('district-kicker').filter({ visible: true })).toHaveText(/you live here/i);
  await expect(page.getByTestId('election-line1').filter({ visible: true }).first()).toHaveText('You live in Eastside');

  // 3. The district's polls open: Vote now, names of three parties, one tap.
  await advanceTo(page, 2);
  await page.goto('/city/irongate/irongate.eastside');
  await expect(page.getByTestId('election-line1').filter({ visible: true }).first()).toHaveText(
    'Voting is open in Eastside',
  );
  await page.goto('/council/ballot');
  await expect(page.getByTestId('ballot-line')).toContainText('Two seats · one vote');
  const rows = page.getByTestId('ballot-row');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(6);
  const parties = await rows.evaluateAll((els) =>
    [...new Set(els.map((e) => e.querySelector('[data-mark]')?.getAttribute('style') ?? ''))].filter(Boolean),
  );
  expect(parties.length).toBeGreaterThanOrEqual(3);
  await rows.first().click();
  await page.getByTestId('council-cta').getByRole('button').first().click();
  const voted = modalOf(page);
  await expect(voted).toBeVisible();
  await voted.getByRole('button', { name: 'Continue' }).click();

  // 4. The count, lazily: the capital's result, Eastside first, both tables, no sideways scroll at 360 px.
  await advanceTo(page, 0);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/council/count');
  await expect(page.getByTestId('capital-count-header')).toContainText('Ten seats ·');
  const chips = page.getByTestId('district-chip');
  await expect(chips).toHaveCount(5);
  await expect(chips.first()).toHaveText('Eastside');
  await expect(chips.first()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('party-row')).toHaveCount(3);
  expect(await page.getByTestId('capital-count-row').count()).toBeGreaterThanOrEqual(6);
  await expect(page.getByTestId('votes-cast')).toHaveText(/^\d+ votes? cast · votes count \d+ % of the score/);
  await noSideScroll(page);
  // The switcher keeps the district in the address.
  await chips.nth(2).click();
  await expect(page).toHaveURL(/\/council\/count\?d=irongate\./);
  await expect(chips.nth(2)).toHaveAttribute('aria-selected', 'true');
  await noSideScroll(page);

  // 5. Monday: the paper's Issues, new this week.
  const monday = await page.request.post('/api/test/clock', { data: { advanceTo: { weekday: 'monday' } } });
  expect(monday.ok()).toBe(true);
  await page.goto('/paper');
  const issues = page.getByTestId('issues-section');
  await expect(issues).toBeVisible();
  await expect(issues.getByTestId('issues-new')).toHaveText('New this week');
  expect(await issues.getByTestId('issue-row').count()).toBeGreaterThanOrEqual(2);
  await noSideScroll(page);
});

// Review 4 (answers §8.3, ADR 0076): inside a district the drag reaches its outline's bounding box;
// Station & Market runs to the picture's bottom-left corner, so (0.02, 0.98) can be brought on screen.
test("a district's drag reaches its whole outline: Station & Market's far corner", async ({ page }) => {
  test.setTimeout(120_000);
  await signUp(page, 'Corner Walker');
  expect((await page.request.post('/api/test/character', { data: { level: 10, cityId: 'irongate' } })).ok()).toBe(true);
  await page.goto('/city/irongate/irongate.station-market');
  await mapAtRest(page);
  const map = page.getByTestId('city-map');
  const box = (await map.boundingBox())!;
  // Drag right and up from the map's middle, several times (each stops at the limit).
  for (let i = 0; i < 6; i++) {
    const sx = box.x + box.width / 2;
    const sy = box.y + box.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 80, sy - 80, { steps: 4 });
    await page.mouse.move(sx + 160, sy - 160, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(60);
  }
  const layer = (await page.getByTestId('map-layer').boundingBox())!;
  const corner = { x: layer.x + 0.02 * layer.width, y: layer.y + 0.98 * layer.height };
  const bottomBand = await page
    .locator('[data-map-overlay=bottom]')
    .evaluate((e) => e.getBoundingClientRect().top)
    .catch(() => box.y + box.height);
  expect(corner.x).toBeGreaterThanOrEqual(box.x);
  expect(corner.x).toBeLessThanOrEqual(box.x + box.width);
  expect(corner.y).toBeGreaterThanOrEqual(box.y);
  expect(corner.y).toBeLessThanOrEqual(Math.min(box.y + box.height, bottomBand) + 1);
  // The picture's edge never shows: its left edge at most at the map's.
  expect(layer.x).toBeLessThanOrEqual(box.x + 1);
});
