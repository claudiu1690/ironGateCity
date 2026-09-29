import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

/**
 * Ambition chapter 1 (GDD §17.1, slice-2 tech design §14): the Letters row → the choice → an
 * approach and the CTA → the modal with the keepsake and the hook → Continue → the keepsake on the
 * Me tab → after a reload the Letters row is gone.
 */
test('Letters → choose → approach → Walk his ward → keepsake and hook → Me → the row is gone', async ({
  page,
}) => {
  await signUp(page, 'Lotte Kern');
  const row = page.getByTestId('letters-row');
  await expect(row).toContainText("From your father's things");
  await expect(row).toContainText('His ward book');
  await row.click();
  await expect(page).toHaveURL(/\/story\/ambition/);

  const screen = page.getByTestId('story-screen');
  await expect(screen).toContainText('Ambition · Finish His Work · Chapter 1 of 12');
  await page.getByRole('button', { name: /^Show it to Secretary Holm/ }).click();

  // Step 2: two approaches with their odds; the CTA waits for one.
  const approaches = page.getByTestId('story-approach');
  await expect(approaches).toHaveCount(2);
  await expect(approaches.nth(0)).toContainText('52 %'); // CHA+INT with the coat: (5 + 12) / 2
  await expect(approaches.nth(1)).toContainText('66 %');
  const cta = page.getByTestId('story-cta');
  await expect(cta).toBeDisabled();
  await approaches.nth(1).click();
  await expect(cta).toBeEnabled();
  await expect(cta).toBeInViewport();
  await expect(page.getByTestId('story-echo')).toHaveText('Show it to Secretary Holm');

  // The check: one modal with the keepsake and the chapter-2 hook, Continue only.
  await cta.click();
  const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
  await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial|Failure)$/);
  await expect(modal.getByTestId('tile-keepsake')).toContainText('His ward book');
  await expect(modal.getByTestId('effect-item')).toHaveText('Keepsake: His ward book');
  await expect(modal.getByTestId('effect-hook')).toHaveText(
    /^Chapter 2, "Stand where he stood": from [A-Z][a-z]+day \d{1,2} [A-Z][a-z]+, at Rank 2$/,
  );
  await expect(modal.getByTestId('effect-energy')).toHaveText('100 → 90');
  await expect(modal.getByTestId('result-buttons').getByRole('button')).toHaveText(['Continue']);
  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/paper$/);

  await page.getByRole('link', { name: /^Me/ }).click();
  await expect(page.getByTestId('me-keepsakes')).toContainText('Keepsake: His ward book');
  await expect(page.getByTestId('me-party-card')).toContainText('Red Collective · Recruit · member since');
  await page.reload();
  await page.getByRole('link', { name: /^Paper/ }).click();
  await expect(page.getByTestId('desk')).toBeVisible();
  await expect(page.getByTestId('letters-row')).toHaveCount(0);

  // n13: the chapter screen now shows the hook instead of an empty chapter, and leads back.
  await page.goto('/story/ambition');
  await expect(page.getByRole('heading', { name: 'Stand where he stood' })).toBeVisible();
  await expect(page.getByTestId('chapter-waits')).toHaveText(
    /^From [A-Z][a-z]+day \d{1,2} [A-Z][a-z]+, at Rank 2$/,
  );
  await expect(page.getByTestId('story-choice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to the paper' }).click();
  await expect(page).toHaveURL(/\/paper$/);
});
