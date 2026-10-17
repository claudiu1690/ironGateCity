import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers';
import { lifeSweep } from './nationKit';

/**
 * Slice 8 (tech design §15.1, T20 part, T23; screens §9.2, §10, §12): the flat and Legacy on the Me
 * tab, on a phone at 390 × 844. A Level 10 resident buys the flat in Coalport (*Yours*); the rent runs
 * out (hook) and the next morning the paper's desk reads *the rent is out* and the Me tab's line is in the failure colour; *Pay a week · 150* → *Paid*. Then Legacy 20
 * (hook) and a lasting perk → *Lasting*. Screenshots to docs/qa/slice-8/.
 */

const SHOTS = '../../docs/qa/slice-8';
const hook = (page: Page, path: string, data: Record<string, unknown>) =>
  page.request.post(`/api/test/${path}`, { data }).then(async (r) => {
    expect(r.ok(), await r.text()).toBe(true);
  });
const modal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });

async function openBlock(page: Page, id: string) {
  const block = page.getByTestId(id);
  await block.scrollIntoViewIfNeeded();
  if ((await block.getAttribute('data-open')) !== 'true') await block.getByTestId(`${id}-toggle`).click();
  await expect(block).toHaveAttribute('data-open', 'true');
  return block;
}

test('the flat: bought, lapsed and waiting, paid again; Legacy and a lasting perk', async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page, 'Hedda Lorenz');
  await hook(page, 'character', { level: 10, iron: 3_000 });

  // 1. *Where you sleep*: the rented room, the flat's offer → *Yours*.
  await page.goto('/me');
  let home = await openBlock(page, 'me-home');
  await expect(home.getByTestId('home-line')).toContainText('rented room');
  await expect(home.getByTestId('home-buy')).toHaveText('A flat in Coalport · 2,500 Iron');
  await home.getByTestId('home-buy').click();
  const yours = modal(page);
  await expect(yours.getByTestId('stamp')).toHaveText('Yours');
  await expect(yours.getByRole('heading', { name: 'A flat in Coalport' })).toBeVisible();
  await yours.getByRole('button', { name: 'Continue' }).click();
  await expect(home.getByTestId('home-paid')).toHaveText(/^a flat in Coalport · paid until [A-Z][a-z]+day$/);
  await expect(home.getByTestId('home-pay-week')).toHaveText('Pay a week · 150');
  await home.scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/me-home.png` });
  await lifeSweep(page, 'me-home');

  // 2. The rent runs out today (hook); the next morning the flat waits (nothing is taken).
  await hook(page, 'home', { paidThroughDay: 'today' });
  await page.request.post('/api/test/clock', { data: { advanceMs: 24 * 3_600_000 } });
  await page.request.post('/api/test/city-day', { data: {} });
  await page.goto('/paper');
  // *The Flat Waits* (priority 1, design §25 #5) takes a personal slot over this player's Level 10
  // lines (priority 2) on the same morning; the desk's row says it too.
  await expect(page.getByTestId('headline').filter({ hasText: 'The Flat Waits' })).toBeVisible();
  await expect(page.getByTestId('desk-sleep')).toHaveText('A flat in Coalport · the rent is out');
  await page.getByTestId('desk-life').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/paper-desk-life.png` });
  await lifeSweep(page, 'paper-desk-life');
  await page.goto('/me');
  home = await openBlock(page, 'me-home');
  await expect(home.getByTestId('home-waits')).toHaveText('Your flat waits · pay a week to sleep there');

  // 3. *Pay a week · 150* → *Paid*; the flat is paid again (no arrears).
  await home.getByTestId('home-pay-week').click();
  const paid = modal(page);
  await expect(paid.getByTestId('stamp')).toHaveText('Paid');
  await expect(paid.getByRole('heading', { name: /^Rent until [A-Z][a-z]+day$/ })).toBeVisible();
  await paid.getByRole('button', { name: 'Continue' }).click();
  await expect(home.getByTestId('home-paid')).toBeVisible();

  // 4. Legacy 20 (hook): the figure, the perks; *A better night's sleep* → *Lasting*.
  await hook(page, 'legacy', { points: 20 });
  await page.reload();
  const legacy = await openBlock(page, 'me-legacy');
  await expect(legacy.getByTestId('legacy-total')).toHaveText('20');
  await expect(legacy.getByTestId('legacy-to-spend')).toHaveText('20 to spend');
  const sleep = legacy.locator('[data-testid="perk-row"][data-perk="sleep"]');
  await expect(sleep).toContainText("A better night's sleep");
  await expect(sleep.getByTestId('perk-take')).toHaveText(/^Take it · \d+ Legacy$/);
  await legacy.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/me-legacy.png` });
  await lifeSweep(page, 'me-legacy');
  await sleep.getByTestId('perk-take').click();
  const lasting = modal(page);
  await expect(lasting.getByTestId('stamp')).toHaveText('Lasting');
  await expect(lasting.getByRole('heading', { name: "A better night's sleep" })).toBeVisible();
  await lasting.getByRole('button', { name: 'Continue' }).click();
  await expect(sleep.getByTestId('perk-taken')).toBeVisible();
});
