import { expect, test } from '@playwright/test';
import { openLocation, signUp, toTheCity } from './helpers';

/** Slice 1's core loop: the paper, the map, a ×3, the Today tally, and the paper not shown again. */
test('paper → map → ×3 canvass → modal → Today strip → reload lands on the map', async ({ page }) => {
  await signUp(page);

  // The Coalport Clarion: 3 headlines incl. the welcome, 3 orders at 0 signed by Holm, the desk.
  await expect(page.getByRole('heading', { name: 'The Coalport Clarion' })).toBeVisible();
  await expect(page.getByTestId('headline')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Welcome to Coalport' })).toBeVisible();
  const orders = page.getByTestId('orders');
  await expect(orders.getByTestId('order')).toHaveCount(3);
  for (const o of await orders.getByTestId('order').all()) await expect(o).toContainText(/0 \/ \d/);
  await expect(page.getByText('— P.H.')).toBeVisible();
  await expect(page.getByTestId('desk')).toContainText('No job yet · take one at the Mill Gate');
  await expect(page.getByTestId('desk')).toContainText('150 XP to Level 2');

  await toTheCity(page);
  await expect(page.getByTestId('hotspot')).toHaveCount(6);
  const sheet = await openLocation(page, '1. Mill Gate');
  const ticket = sheet.getByTestId('ticket-coalport.mill-gate.canvass');
  await expect(ticket.getByTestId('ticket-chance')).toHaveText('Good odds'); // review 2: a word
  const x3 = sheet.getByRole('button', {
    name: 'Talk to the workers coming off shift, three times, 30 Energy',
  });
  await expect(x3).toBeEnabled();
  await x3.click();

  const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
  await expect(modal.getByTestId('stamp')).toHaveText(/^[0-3] of 3$/);
  await expect(modal.getByTestId('attempt-row')).toHaveCount(3);
  await expect(modal.getByTestId('effect-energy')).toHaveText('100 → 70');
  // The Coalport meter is shared by every spec in the run (one server): only its format is stable.
  await expect(modal.getByTestId('effect-opinion')).toHaveText(/^\d+\.\d → \d+\.\d %$/);
  const xp = ((await modal.getByTestId('tile-experience').textContent()) ?? '').match(/\+(\d+)/)?.[1];
  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(modal).toBeHidden();

  await sheet.getByRole('button', { name: /^Close/ }).click();
  const strip = page.getByTestId('today-strip').first();
  await expect(strip).toContainText('30 Energy · 3 attempts');
  await expect(strip).toContainText(`+${xp} XP`);
  await expect(page.getByTestId('hud-energy')).toHaveText('70 / 100');

  // The paper was read and there was an action since: `/` goes to the map.
  await page.goto('/');
  await expect(page).toHaveURL(/\/city\/coalport$/);
  await expect(page.getByTestId('hud-energy')).toHaveText('70 / 100');
});
