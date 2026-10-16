import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { sheetSettled, signUp } from './helpers';

/**
 * Slice 8 (tech design §15.1, T22, T23; screens §8, §12): a patron on a phone at 390 × 844. A Level
 * 10 player at Herald House: Edith Crane's card (*A letter comes the morning after next.*), *Gift ·
 * 200 Iron* → *Given* with *Favour 0 → 2*; two mornings later the paper's Letters carry her Request
 * and the card lists it; *Crane at 29* (hook) and a gift cross into Associate. The Me tab's Patrons
 * block shows her clock. Screenshots to docs/qa/slice-8/.
 */

const SHOTS = '../../docs/qa/slice-8';
const hook = (page: Page, path: string, data: Record<string, unknown>) =>
  page.request.post(`/api/test/${path}`, { data }).then(async (r) => {
    expect(r.ok(), await r.text()).toBe(true);
  });
const modal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
const HERALD = '/city/irongate/irongate.old-town?loc=irongate.herald-house';

async function nextMorning(page: Page) {
  await page.request.post('/api/test/clock', { data: { advanceMs: 24 * 3_600_000 } });
  await page.request.post('/api/test/city-day', { data: {} });
}

async function craneCard(page: Page) {
  await page.goto(HERALD);
  await sheetSettled(page);
  const card = page.locator('[role=dialog][data-layout]').locator('[data-testid="patron-card"][data-patron="crane"]');
  await card.scrollIntoViewIfNeeded();
  return card;
}

test('a patron: the card, a gift, the Letters, Associate', async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page, 'Ida Marek');
  await hook(page, 'character', { level: 10, cityId: 'irongate', iron: 1_000 });

  // 1. The card on Herald House's sheet: the kicker, the Favour line, the voice; the first visit.
  let card = await craneCard(page);
  await expect(card).toContainText('Patron · Edith Crane');
  await expect(card.getByTestId('patron-line')).toContainText('Favour 0');
  await expect(card.getByTestId('patron-first-visit')).toHaveText('A letter comes the morning after next.');
  await expect(card.getByTestId('patron-gift')).toHaveText('Gift · 200 Iron');
  for (const b of await card.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await card.textContent()) ?? '').not.toMatch(/\b(tier|NPC)\b|%/);
  await page.screenshot({ path: `${SHOTS}/patron-card.png` });

  // 2. *Gift · 200 Iron* → *Given*: Favour 0 → 2; the card reads *Given today*.
  await card.getByTestId('patron-gift').click();
  const given = modal(page);
  await expect(given.getByTestId('stamp')).toHaveText('Given');
  await expect(given.getByRole('heading', { name: 'A gift for Edith Crane' })).toBeVisible();
  await expect(given.getByTestId('political-favour')).toContainText('0 → 2');
  await given.getByRole('button', { name: 'Continue' }).click();
  await expect(card.getByTestId('patron-given')).toHaveText('Given today');

  // 3. Two mornings later: her Request in the paper's Letters, and on her card with its progress.
  await nextMorning(page);
  await nextMorning(page);
  await page.goto('/paper');
  const letter = page.locator('[data-testid="letter-life"][data-kind="request"]').first();
  await expect(letter).toContainText('From Edith Crane');
  await letter.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/paper-letters.png` });
  card = await craneCard(page);
  await expect(card.getByTestId('request-row').first().getByTestId('request-progress')).toHaveText(/^0 of \d+$/);

  // 4. *Crane at 29* (hook) and a gift: Associate.
  await hook(page, 'patron', { patronId: 'crane', favour: 29 });
  card = await craneCard(page);
  await card.getByTestId('patron-gift').click();
  const crossed = modal(page);
  await expect(crossed.getByTestId('political-favour')).toContainText('29 → 31');
  await crossed.getByRole('button', { name: 'Continue' }).click();
  await expect(card.getByTestId('patron-line')).toContainText('Associate · Favour 31');

  // 5. The Me tab's Patrons block: her clock, the open Request under it.
  await page.goto('/me');
  const block = page.getByTestId('me-patrons');
  await block.scrollIntoViewIfNeeded();
  await expect(block.getByTestId('me-patrons-line')).toContainText('Crane');
  await block.getByTestId('me-patrons-toggle').click();
  await expect(block.locator('[data-testid="patron-clock"][data-patron="crane"]')).toBeVisible();
});
