import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, openLocation, signUp } from './helpers';
import { lifeSweep } from './nationKit';

/**
 * Slice 8 (tech design §24.11, T32; screens §18.4–§18.5): the bar and the dining room, on a phone at
 * 390 × 844. A plate at the Anchor (*Fed*, Health +15), the next mission's *Well fed · +10 % XP*
 * line, a round and *In good spirits · +10 % XP · 2 left*, the Me tab's buff line, the meal running
 * out on the clock, and the Pier Hotel's dining room at Charisma 9 and 10. Moves the shared clock.
 */

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const street = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/street', { data }).then((r) => expect(r.ok()).toBe(true));
const buffs = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/buffs', { data }).then((r) => expect(r.ok()).toBe(true));
const resultModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
const SHOTS = '../../docs/qa/slice-8';

async function anchor(page: Page) {
  await page.goto('/city/coalport');
  await mapAtRest(page);
  const sheet = await openLocation(page, '6. The Anchor');
  const card = sheet.getByTestId('bar-card');
  await card.scrollIntoViewIfNeeded();
  return card;
}

/** A forced Success at the Shipyard (no run-in): its result modal. */
async function mission(page: Page, again: boolean) {
  await page.goto('/city/coalport');
  await mapAtRest(page);
  await openLocation(page, '7. The Shipyard');
  const launch = page.locator('[data-mission="coalport.shipyard.launch"]');
  await launch.scrollIntoViewIfNeeded();
  await street(page, { runIn: 'never', checkRoll: 1 });
  if (again) await launch.getByTestId('mission-again').click();
  else {
    await launch.getByTestId('mission-choose').click();
    await page.getByTestId('briefing').getByTestId('way-row').first().click();
    await page.getByTestId('briefing-confirm').click();
  }
  const r = resultModal(page);
  await expect(r.getByTestId('stamp')).toHaveText('Success');
  return r;
}

test('the bar: a plate, a round, the receipts, the Me tab, the clock, the dining room', async ({ page }) => {
  test.setTimeout(300_000);
  await signUp(page, 'Hanne Roth');
  await lift(page, { level: 6, iron: 3_000, health: 100 });

  // 1. The Anchor's card: a round and a plate, their prices; 44 px buttons.
  const card = await anchor(page);
  await expect(card).toContainText('The bar · The Anchor');
  await expect(card.getByTestId('bar-round-row')).toContainText('Buy a round');
  await expect(card.getByTestId('bar-round-row')).toContainText('30 Iron · 2 Energy');
  await expect(card.getByTestId('bar-plate-row')).toContainText('A plate of something');
  for (const b of await card.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await card.textContent()).not.toMatch(/\bbuff\b|stimulant/i);
  // Below Rank 3 the back room is not on the sheet at all (screens §4).
  await expect(page.getByRole('dialog').locator('[data-shop="backRoom"]')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/bar-card.png` });
  await lifeSweep(page, 'bar-card');

  // 2. *A plate of something*: *Fed*, Health +15 (the real gain), Well fed until a time.
  await card.getByTestId('bar-plate').click();
  const fed = resultModal(page);
  await expect(fed.getByTestId('stamp')).toHaveText('Fed');
  await expect(fed).toContainText('A plate of something hot');
  await expect(fed).toContainText('Health +15');
  await expect(fed).toContainText(/Well fed until \d\d:\d\d/);
  await expect(fed.getByTestId('political-health')).toHaveCount(0);
  await fed.getByRole('button', { name: 'Continue' }).click();
  await expect(card.getByTestId('bar-plate-row').getByTestId('bar-state')).toHaveText(/^Well fed until \d\d:\d\d$/);

  // 3. A mission's receipt carries *Well fed · +10 % XP* as a line of its own.
  const first = await mission(page, false);
  await expect(first.getByTestId('receipt-buff')).toHaveText(['Well fed · +10 % XP']);
  await first.getByRole('button', { name: 'Continue' }).click();

  // 4. *Buy a round*: *Your round*; the next mission reads *In good spirits · +10 % XP · 2 left*.
  const bar = await anchor(page);
  await bar.getByTestId('bar-round').click();
  const round = resultModal(page);
  await expect(round.getByTestId('stamp')).toHaveText('Your round');
  await expect(round).toContainText('In good spirits · your next 3 missions');
  await round.getByRole('button', { name: 'Continue' }).click();
  const second = await mission(page, true);
  await expect(second.getByTestId('receipt-buff')).toHaveText(['Well fed · +10 % XP', 'In good spirits · +10 % XP · 2 left']);
  await second.getByRole('button', { name: 'Continue' }).click();

  // 5. The Me tab: one line under the stats block.
  await page.goto('/me');
  await expect(page.getByTestId('me-buffs')).toHaveText(/^Well fed until \d\d:\d\d · In good spirits, 2 missions$/);

  // 6. Five minutes left (the hook), the clock moved six: the meal's line is gone; the round's stays.
  await buffs(page, { wellFed: { tier: 'plate', minutesLeft: 5 } });
  expect((await page.request.post('/api/test/clock', { data: { advanceMs: 6 * 60_000 } })).ok()).toBe(true);
  await page.reload();
  await expect(page.getByTestId('me-buffs')).toHaveText('In good spirits, 2 missions');

  // 7. The Pier Hotel's dining room: Charisma 9 is not dressed; 10 dines.
  await lift(page, { cityId: 'clearwater', cha: 4 });
  await page.goto('/city/clearwater?loc=clearwater.pier-hotel');
  const dining = page.getByRole('dialog').getByTestId('dining-card');
  await dining.scrollIntoViewIfNeeded();
  await expect(dining).toContainText('The dining room · The Pier Hotel');
  await expect(dining).toHaveAttribute('data-state', 'notDressed');
  await expect(dining.getByTestId('bar-state')).toHaveText('Not dressed for the dining room · needs Charisma 10');
  await lift(page, { cha: 5 });
  await page.reload();
  await dining.scrollIntoViewIfNeeded();
  await dining.getByTestId('dining-dinner').click();
  const dinner = resultModal(page);
  await expect(dinner.getByTestId('stamp')).toHaveText('Fed');
  await expect(dinner).toContainText('Dinner at The Pier Hotel');
  await expect(dinner).toContainText(/Well fed, properly, until \d\d:\d\d/);
  await dinner.getByRole('button', { name: 'Continue' }).click();
  await expect(dining.getByTestId('bar-state')).toHaveText(/^Well fed until \d\d:\d\d$/);
});
