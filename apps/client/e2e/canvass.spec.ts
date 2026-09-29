import { expect, test } from '@playwright/test';

/** Slice 0's question: does the whole pipe work, tap → database → modal? */
test('sign up → Canvass at the Mill Gate → result modal → HUD shows 90', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', { name: 'Sign up' }).click();

  await page.getByLabel('Your name').fill('Mara Lenk');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign up' }).click();

  // The auto-created character lands in its home city.
  await expect(page).toHaveURL(/\/city\/coalport$/);
  await expect(page.getByRole('heading', { name: 'Coalport' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mill Gate' })).toBeVisible();
  await expect(page.getByTestId('ticket-chance')).toHaveText('66 %');
  const hudEnergy = page.getByTestId('hud-energy');
  await expect(hudEnergy).toHaveText('100 / 100');

  // Tapping the percentage shows the breakdown.
  await page.getByRole('button', { name: /66 %/ }).click();
  await expect(page.getByText('INT 12 vs difficulty 8 (×4)')).toBeVisible();

  // One tap: the server decides, the modal shows the full breakdown.
  await page.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const stamp = dialog.getByTestId('stamp');
  await expect(stamp).toHaveText(/^(Success|Partial)$/);
  const success = (await stamp.textContent()) === 'Success';

  const rows = dialog.getByTestId('attempt-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(/Rolled \d{1,3} against 66 % · INT 12 vs 8/);
  await expect(rows.first().getByRole('img', { name: /^Chance 66 %, rolled \d{1,3}$/ })).toBeVisible();

  await expect(dialog.getByTestId('tile-experience')).toContainText(success ? '+45' : '+23');
  await expect(dialog.getByTestId('tile-faction-xp')).toContainText(success ? '+6' : '+3');
  await expect(dialog.getByTestId('tile-iron')).toContainText(success ? '+20' : '+10');
  await expect(dialog.getByTestId('tile-opinion')).toContainText(success ? '+0.05 %' : '+0.025 %');
  await expect(dialog.getByTestId('effect-energy')).toHaveText('100 → 90');
  await expect(dialog.getByRole('button', { name: 'Again ×3' })).toBeDisabled();

  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog).toBeHidden();
  await expect(hudEnergy).toHaveText('90 / 100');
  await expect(page.getByTestId('hud-iron')).toHaveText(success ? '20' : '10');

  // The spend is in the database, not just in the page.
  await page.reload();
  await expect(page.getByTestId('hud-energy')).toHaveText('90 / 100');
});

test('Again ×1 from the modal runs a second action with a new key', async ({ page }) => {
  const email = `e2e-again-${Date.now()}@example.test`;
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Anton Weiss');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/city\/coalport$/);

  await page.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('effect-energy')).toHaveText('100 → 90');
  await dialog.getByRole('button', { name: 'Again ×1' }).click();
  await expect(dialog.getByTestId('effect-energy')).toHaveText('90 → 80');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('hud-energy')).toHaveText('80 / 100');

  // Signing out and back in finds the same character.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('hud-energy')).toHaveText('80 / 100');
});
