import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers';

/**
 * Slice 7 (tech design §15.1 `governor.spec.ts`; screens §3, §4.1, §11), on a phone at 390 × 844: a
 * Collective member with a completed council term (the hook) seated as Coalport's Governor on the
 * council's first day → the front page (*ELECTED*, *{name}, elected Governor of Coalport*, *To the
 * office*); the Me tab's office card and the ladder; the office page → **Choose the rule** → *Public
 * Works Order* → *Card 1 on the town's ballot*; at the set the town's ballot carries it as card 1;
 * **Speak on {issue}** → *Spoken*; the city card's *Governor: {name}*; with no votes the count's
 * morning reads *Public Works Order*, never *Council Passes*.
 */

const SHOTS = '../../docs/qa/slice-7';
const stampModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });

async function post(page: Page, url: string, data: unknown) {
  const r = await page.request.post(url, { data });
  expect(r.ok(), `${url} ${await r.text()}`).toBe(true);
  return r;
}

test.use({ viewport: { width: 390, height: 844 } });

test("a Governor's week: the front page, the Me tab, the party's card, the Address, the count", async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page, 'Anna Roth');
  await post(page, '/api/test/character', { level: 8, fxp: 2000, iron: 600, pc: 60 });
  // The council's first day (the rule can be chosen on days 0–1), a completed council term, the chair.
  await post(page, '/api/test/clock', { advanceTo: { cityId: 'coalport', cycleDay: 0 } });
  await post(page, '/api/test/city-day', {});
  await post(page, '/api/test/office', { record: { characterId: 'me', council: 1 } });
  await post(page, '/api/test/office', { seat: { characterId: 'me', office: 'governor', cityId: 'coalport' } });

  // 1. The front page: the photograph, ELECTED, the caption naming the office, *To the office*.
  await page.goto('/paper');
  const front = page.getByTestId('front-page');
  await expect(front).toHaveAttribute('data-office', 'governor');
  await expect(front.getByTestId('front-page-caption')).toHaveText('Anna Roth, elected Governor of Coalport');
  await expect(front).toContainText('Anna Roth Is Governor of Coalport');

  // 2. The Me tab: the office card and the ladder (a council term ticked).
  await page.goto('/me');
  const card = page.getByTestId('office-card').filter({ hasText: 'Governor of Coalport' });
  await expect(card).toContainText(/term ends \w+ · 20 Political Capital and 30 Party XP a day/);
  const ladder = page.getByTestId('ladder-card');
  await expect(ladder.getByTestId('ladder-row')).toHaveCount(5);
  await expect(ladder.locator('[data-office=council]')).toHaveAttribute('data-done', 'true');
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/me-office-cards-390x844.png` });
  await card.click();
  await expect(page).toHaveURL(/\/office\/governor\/coalport$/);

  // 3. The office page: the header above the fold with the first power card; choose the rule.
  const header = page.getByTestId('governor-header');
  await expect(header).toContainText('Governor of Coalport');
  await expect(header).toContainText('Anna Roth');
  const choose = page.getByTestId('governor-choose');
  await expect(choose).toHaveText("Choose the rule");
  const cb = (await choose.boundingBox())!;
  expect(cb.y + cb.height).toBeLessThanOrEqual(844);
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('[data-testid=governor-header] img')].every((i) => (i as HTMLImageElement).complete),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => {});
  await page.screenshot({ path: `${SHOTS}/governor-page-390x844.png` });
  await choose.click();
  const picker = page.getByRole('dialog', { name: "The Governor's rule · at no cost" });
  await picker.getByTestId('ordinance-row').filter({ hasText: 'Public Works Order' }).click();
  await expect(stampModal(page).getByTestId('stamp')).toHaveText('Set');
  await expect(stampModal(page)).toContainText("Public Works Order is the party's card");
  await stampModal(page).getByRole('button', { name: /^Continue/ }).click();
  await expect(page.getByTestId('governor-rule-set')).toContainText('Public Works Order');
  await expect(page.getByTestId('governor-rule')).toContainText("Card 1 on the town's ballot");

  // 4. The Address: one tap on one of the town's two Issues → *Spoken*; then spent for the term.
  await page.getByTestId('governor-speak').first().click();
  await expect(stampModal(page).getByTestId('stamp')).toHaveText('Spoken');
  await stampModal(page).getByRole('button', { name: /^Continue/ }).click();
  await expect(page.getByTestId('address-spent')).toContainText('The Address is spent for the term');

  // 5. The city card on the nation map names the Governor.
  await post(page, '/api/test/character', { level: 10 });
  await page.goto('/nation?city=coalport');
  await expect(page.getByTestId('city-governor')).toHaveText('Governor: Anna Roth');

  // 6. At the set (day 2) the town's ballot carries the Governor's rule as card 1.
  await post(page, '/api/test/clock', { advanceTo: { cityId: 'coalport', cycleDay: 2 } });
  await post(page, '/api/test/city-day', {});
  await page.goto('/council/ballot');
  await expect(page.getByTestId('rule-card').first()).toContainText('Public Works Order');

  // 7. Nobody votes; the count's morning reads the rule that runs, never *Council Passes*.
  await post(page, '/api/test/clock', { advanceTo: { cityId: 'coalport', cycleDay: 0 } });
  await post(page, '/api/test/city-day', {});
  await page.goto('/paper');
  const headlines = page.getByTestId('headline');
  await expect(headlines.filter({ hasText: 'Public Works Order' }).first()).toBeVisible();
  await expect(headlines.filter({ hasText: /Council Passes/ })).toHaveCount(0);
});
