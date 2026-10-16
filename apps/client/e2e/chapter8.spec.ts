import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { arrive, signUpOnly } from './helpers';

/**
 * Slice 8 (tech design §15.1, T14's chapters on screen, T21's knock-ons): *Who Sold the Homes*
 * (`clear-his-name`) on a phone at 390 × 844. Chapter 1 from the Letters; Level 6 (hook) and a week open
 * chapter 2, *The night caretaker*, whose result lands Brandauer's entry in the Dossier (the modal's
 * line, the tab's dot, the name card). Chapter 3 (*The archive*) has no story in content yet.
 */

const hook = (page: Page, path: string, data: Record<string, unknown>) =>
  page.request.post(`/api/test/${path}`, { data }).then(async (r) => {
    expect(r.ok(), await r.text()).toBe(true);
  });
const modal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });

/** A week on (AMBITION.daysBetweenChapters is 7): the next chapter's day. */
async function aWeekOn(page: Page) {
  await page.request.post('/api/test/clock', { data: { advanceMs: 7 * 24 * 3_600_000 } });
  await page.request.post('/api/test/city-day', { data: {} });
}

/** A chapter from its Letters row: the first choice (or row and confirm), the first approach, the CTA. */
async function playChapter(page: Page) {
  await page.goto('/paper');
  await page.getByTestId('letters-row').click();
  await expect(page).toHaveURL(/\/story\/ambition/);
  const choice = page.getByTestId('story-choice').first();
  const row = page.getByTestId('story-row').first();
  await expect(choice.or(row)).toBeVisible();
  if (await row.isVisible()) {
    await row.click();
    await page.getByTestId('story-confirm').click();
  } else await choice.click();
  const approach = page.getByTestId('story-approach').first();
  await expect(approach).toBeVisible();
  await approach.click();
  await page.getByTestId('story-cta').click();
  const result = modal(page);
  await expect(result.getByTestId('stamp')).toHaveText(/^(Success|Partial|Failure)$/);
  return result;
}

test('Who Sold the Homes: chapter 2 lands Brandauer in the Dossier', async ({ page }) => {
  test.setTimeout(240_000);
  await signUpOnly(page, 'Rosa Wendt');
  await arrive(page, { answers: ['books', 'letter'] });

  // Chapter 1 (slice 2's shape), then Level 6 and a week on: chapter 2 is ready.
  let result = await playChapter(page);
  await result.getByRole('button', { name: 'Continue' }).click();
  await hook(page, 'character', { level: 6 });
  await aWeekOn(page);

  // Chapter 2, *The night caretaker*: the entry on Brandauer is the modal's knock-on line.
  result = await playChapter(page);
  await expect(result.getByTestId('effect-dossier').first()).toBeAttached();
  const lines = await result.getByTestId('effect-dossier').allTextContents();
  expect(lines.join(' | ')).toMatch(/^Dossier: an entry on .*Brandauer.* · political · goes stale [A-Z][a-z]+day/);
  await result.getByRole('button', { name: 'Continue' }).click();

  // The Dossier tab's dot and the name card.
  await expect(page.getByTestId('tab-dot-dossier')).toBeVisible();
  await page.getByRole('link', { name: /^Dossier/ }).click();
  await expect(page.locator('[data-testid="name-card"][data-subject="npc.brandauer"]')).toBeVisible();

  // Chapter 3, *The archive* (needs a Case File), is a stub in content (no story yet): the Me tab
  // reads *Chapter 2 done* even with a file on him. Left for the designer (lane Q's Deviations).
  await page.goto('/me');
  await expect(page.getByTestId('me-ambition')).toHaveText('Chapter 2 done');
});
