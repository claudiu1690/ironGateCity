import { expect, test } from '@playwright/test';
import { openLocation, signUp, toTheCity } from './helpers';

/** Slice 0's question, kept: does the whole pipe work, tap → database → modal? */
test('sign up → Canvass at the Mill Gate → result modal → HUD shows 90', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await signUp(page);
  await toTheCity(page);

  const hudEnergy = page.getByTestId('hud-energy');
  await expect(hudEnergy).toHaveText('100 / 100');
  const sheet = await openLocation(page, '1. Mill Gate');
  const ticket = sheet.getByTestId('ticket-coalport.mill-gate.canvass');
  // Review 1: the stat is named before the tap, and the welcome day adds First day +10 % (66 → 76).
  await expect(ticket.getByTestId('ticket-chance')).toHaveText('76 %');
  await expect(ticket.getByTestId('ticket-odds')).toHaveText('76 % · INT 12');

  // Tapping the percentage shows the ledger, in words.
  await ticket.getByRole('button', { name: /76 %/ }).click();
  await expect(ticket.getByText('INT 12, 4 above the 8 needed, 4 % a point')).toBeVisible();
  await expect(ticket.getByText('First day in Coalport')).toBeVisible();

  await sheet.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }).click();
  const modal = page.getByRole('dialog', { name: /./ }).filter({ has: page.getByTestId('stamp') });
  await expect(modal).toBeVisible();

  const stamp = modal.getByTestId('stamp');
  await expect(stamp).toHaveText(/^(Success|Partial)$/);
  const success = (await stamp.textContent()) === 'Success';
  const rows = modal.getByTestId('attempt-row');
  await expect(rows).toHaveCount(1);
  // Review 1 (§8.4): one plain sentence and the roll.
  await expect(rows.first().getByTestId('attempt-odds')).toHaveText(
    'Your INT 12 is 4 above the 8 this needs: 66 %, and +10 % for your first day in Coalport: 76 %.',
  );
  await expect(rows.first().getByTestId('attempt-roll')).toHaveText(/^Rolled \d{1,3}: (Success|Partial) \(/);
  await expect(modal.getByTestId('tile-experience')).toContainText(success ? '+45' : '+23');
  // +25 % FXP when the attempt advances one of today's Party orders (6 → +8, 3 → +4).
  await expect(modal.getByTestId('tile-faction-xp')).toContainText(success ? /\+(6|8)/ : /\+(3|4)/);
  await expect(modal.getByTestId('tile-iron')).toContainText(success ? '+20' : '+10');
  await expect(modal.getByTestId('tile-opinion')).toContainText(success ? '+0.05 %' : '+0.025 %');
  await expect(modal.getByTestId('effect-energy')).toHaveText('100 → 90');
  await expect(modal.getByRole('button', { name: 'Again ×3' })).toBeEnabled();

  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(modal).toBeHidden();
  await expect(hudEnergy).toHaveText('90 / 100');
  await expect(page.getByTestId('hud-iron')).toHaveText(success ? '20' : '10');

  // The spend is in the database, not just in the page.
  await page.reload();
  await expect(page.getByTestId('hud-energy')).toHaveText('90 / 100');
});

test('Again ×1 from the modal runs a second action with a new key; sign out and back in', async ({
  page,
}) => {
  const email = await signUp(page, 'Anton Weiss');
  await toTheCity(page);
  const sheet = await openLocation(page, '1. Mill Gate');
  await sheet.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }).click();
  const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
  await expect(modal.getByTestId('effect-energy')).toHaveText('100 → 90');
  await modal.getByRole('button', { name: 'Again ×1' }).click();
  await expect(modal.getByTestId('effect-energy')).toHaveText('90 → 80');
  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('hud-energy')).toHaveText('80 / 100');

  await page.goto('/me');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('hud-energy')).toHaveText('80 / 100');
});

test.describe('375 × 812 phone (QA fix round 1)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('all six pins on the first view; the ×3 modal keeps Again ×1 · Again ×3 · Continue on screen', async ({
    page,
  }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Join the campaign' })).toBeVisible();
    await signUp(page);
    await toTheCity(page);
    for (const pin of await page.getByTestId('hotspot').all()) await expect(pin).toBeInViewport({ ratio: 1 });
    const sheet = await openLocation(page, '6. The Anchor');
    await sheet.getByRole('button', { name: 'Talk the regulars round, three times, 30 Energy' }).click();
    const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
    await expect(modal.getByTestId('stamp')).toHaveText(/of 3$/);
    for (const name of [/Again ×1/, /Again ×3/, 'Continue'])
      await expect(modal.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
    await modal.getByRole('button', { name: 'Continue' }).click();
    await expect(modal).toBeHidden();
  });

  test('zoomed in, a pin reached with the keyboard is panned into view (WCAG 2.4.11)', async ({ page }) => {
    await signUp(page);
    await toTheCity(page);
    const anchor = page.getByRole('button', { name: '6. The Anchor' });
    await expect(anchor).toBeInViewport({ ratio: 1 });
    // Zoom in on the top right of the map until The Anchor (bottom left) is off-screen.
    await page.mouse.move(330, 300);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -200);
    await expect(anchor).not.toBeInViewport();
    await anchor.focus();
    await expect(anchor).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toContainText('The Anchor');
  });
});
