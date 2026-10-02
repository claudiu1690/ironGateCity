import { expect, test } from '@playwright/test';
import { openLocation, signUp, toTheCity } from './helpers';

/** Slice 0's question, kept: does the whole pipe work, tap → database → modal? */
test('sign up → talk to voters at the Mill Gate → result modal → HUD shows 90', async ({ page }) => {
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
  // Review 2 (GDD §8.4): the odds as a word with the stat; the first day a tag in words.
  await expect(ticket.getByTestId('ticket-chance')).toHaveText('Good odds');
  await expect(ticket.getByTestId('ticket-odds')).toHaveText('Good odds · Intelligence');
  await expect(ticket.getByTestId('ticket-tags')).toContainText('First day in Coalport · better odds');

  // Tapping the odds opens the band's note: no number, no ledger.
  await ticket.getByRole('button', { name: /what the odds mean/ }).click();
  const note = page.getByTestId('help-note');
  await expect(note).toContainText('About three tries in four come off here. It uses your Intelligence.');
  await note.getByRole('button', { name: 'Close' }).click();

  await sheet.getByRole('button', { name: 'Talk to the workers coming off shift, once, 10 Energy' }).click();
  const modal = page.getByRole('dialog', { name: /./ }).filter({ has: page.getByTestId('stamp') });
  await expect(modal).toBeVisible();

  const stamp = modal.getByTestId('stamp');
  await expect(stamp).toHaveText(/^(Success|Partial)$/);
  const success = (await stamp.textContent()) === 'Success';
  const rows = modal.getByTestId('attempt-row');
  await expect(rows).toHaveCount(1);
  // Review 2 (§8.4): the outcome and its XP; a reason under a Partial; never the roll or the odds.
  await expect(rows.first().getByTestId('attempt-outcome')).toHaveText(/^(Success|Partial)$/);
  await expect(rows.first()).not.toContainText(/Rolled|\d+ %/);
  if (!success) await expect(rows.first().getByTestId('attempt-reason')).not.toHaveText(/\d/);
  // Review 3 (GDD §13.1a): the rewards as a receipt, one line each, the value at the right.
  await expect(modal.getByTestId('reward-xp').getByTestId('reward-value')).toHaveText(
    success ? '+45' : '+23',
  );
  // +25 % FXP when the attempt advances one of today's Party orders (6 → +8, 3 → +4).
  await expect(modal.getByTestId('reward-fxp').getByTestId('reward-value')).toHaveText(
    success ? /^\+(6|8)$/ : /^\+(3|4)$/,
  );
  await expect(modal.getByTestId('reward-iron').getByTestId('reward-value')).toHaveText(
    success ? '+20' : '+10',
  );
  await expect(modal.getByTestId('reward-opinion').getByTestId('reward-value')).toHaveText(
    success ? '+0.05 %' : '+0.025 %',
  );
  await expect(modal.getByTestId('effect-energy')).toHaveText('100 → 90');
  // Review 3 (GDD §13.1): the buttons say what they do and what they cost.
  await expect(modal.getByRole('button', { name: 'Three more · 30 Energy' })).toBeEnabled();

  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(modal).toBeHidden();
  await expect(hudEnergy).toHaveText('90 / 100');
  await expect(page.getByTestId('hud-iron')).toHaveText(success ? '20' : '10');

  // The spend is in the database, not just in the page.
  await page.reload();
  await expect(page.getByTestId('hud-energy')).toHaveText('90 / 100');
});

test('Once more from the modal runs a second action with a new key; sign out and back in', async ({
  page,
}) => {
  const email = await signUp(page, 'Anton Weiss');
  await toTheCity(page);
  const sheet = await openLocation(page, '1. Mill Gate');
  await sheet.getByRole('button', { name: 'Talk to the workers coming off shift, once, 10 Energy' }).click();
  const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
  await expect(modal.getByTestId('effect-energy')).toHaveText('100 → 90');
  await modal.getByRole('button', { name: 'Once more · 10 Energy' }).click();
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

  test('all six pins on the first view; the ×3 modal keeps Once more · Three more · Continue on screen', async ({
    page,
  }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Join the campaign' })).toBeVisible();
    await signUp(page);
    await toTheCity(page);
    for (const pin of await page.getByTestId('hotspot').all()) await expect(pin).toBeInViewport({ ratio: 1 });
    const sheet = await openLocation(page, '6. The Anchor');
    await sheet.getByRole('button', { name: 'Win over the regulars, three times, 30 Energy' }).click();
    const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
    await expect(modal.getByTestId('stamp')).toHaveText(/of 3$/);
    for (const name of ['Once more · 10 Energy', 'Three more · 30 Energy', 'Continue'])
      await expect(modal.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
    await modal.getByRole('button', { name: 'Continue' }).click();
    await expect(modal).toBeHidden();
  });

  // Review 2 #8, #9: Tab to a pin and Enter zooms into it and opens it. Review 3 (GDD §14.13): the
  // player may zoom the map at rest; the wheel zooms it, and a pin is still a Tab away.
  test('the wheel zooms the map at rest; Tab to a pin and Enter zooms in and opens it', async ({ page }) => {
    await signUp(page);
    await toTheCity(page);
    const anchor = page.getByRole('button', { name: '6. The Anchor' });
    await expect(anchor).toBeInViewport({ ratio: 1 });
    const map = page.getByTestId('city-map');
    const scale = async () => Number((await map.getAttribute('data-view'))!.split(',')[2]);
    const before = await scale();
    await page.mouse.move(200, 400);
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -200);
    await expect.poll(scale).toBeGreaterThan(before);
    await expect(map).toHaveAttribute('data-zoomed', 'false');
    await anchor.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'true');
    await expect(page.getByRole('dialog')).toContainText('The Anchor');
    await expect(anchor).toBeInViewport({ ratio: 1 });
  });
});
