import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers';

/**
 * QA slice 3 (docs/qa/slice-3.md): the ballot on a phone. A double tap on a row and on the CTA
 * casts one ballot and shows one modal; the ballot is keyboard-reachable; no side scroll at 360 px
 * on the ballot and the count; and the screens' §10 rule (header and five rows above the CTA on a
 * 375 × 667 phone), which fails today (m4). Runs after the council project: it moves the clock.
 */
const advanceTo = async (page: Page, cycleDay: number) => {
  const res = await page.request.post('/api/test/clock', {
    data: { advanceTo: { cityId: 'coalport', cycleDay } },
  });
  expect(res.ok()).toBe(true);
};
const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
const sideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe.serial('QA slice 3: the ballot on a phone', () => {
  test('a double tap on a row and on the CTA casts one ballot, with one modal; no side scroll at 360', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await advanceTo(page, 2);
    await signUp(page, 'Double Tapper');
    expect((await page.request.post('/api/test/character', { data: { fxp: 400 } })).ok()).toBe(true);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/council/ballot');
    const rows = page.getByTestId('ballot-row');
    await expect(rows).toHaveCount(9);
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    await rows.nth(2).dblclick();
    const cta = page.getByRole('button', { name: /^Vote for / });
    await expect(cta).toBeEnabled();
    let dialogs = 0;
    page.on('response', (r) => {
      if (r.url().includes('council.vote')) dialogs += 1;
    });
    await cta.dblclick();
    await expect(modalOf(page).getByTestId('stamp')).toHaveText('Vote cast');
    await modalOf(page).getByRole('button', { name: 'Continue' }).click();
    await expect(modalOf(page)).toHaveCount(0);
    await expect(page.getByTestId('ballot-cast-line')).toBeVisible();
    expect(dialogs).toBe(1);
    await page.reload();
    await expect(page.getByTestId('ballot-cast-line')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Vote for / })).toHaveCount(0);
  });

  test('the ballot by keyboard alone: Tab to a row, Space, Tab to the CTA, Enter', async ({ page }) => {
    await signUp(page, 'Keyboard Voter');
    expect((await page.request.post('/api/test/character', { data: { fxp: 400 } })).ok()).toBe(true);
    await page.goto('/council/ballot');
    await expect(page.getByTestId('ballot-row').first()).toBeVisible();
    let onRow = false;
    for (let i = 0; i < 40 && !onRow; i++) {
      await page.keyboard.press('Tab');
      onRow = await page.evaluate(() => document.activeElement?.closest('[data-testid=ballot-row]') != null);
    }
    expect(onRow).toBe(true);
    await page.keyboard.press('Space');
    let onCta = false;
    for (let i = 0; i < 30 && !onCta; i++) {
      await page.keyboard.press('Tab');
      onCta = await page.evaluate(() => /^Vote for /.test(document.activeElement?.textContent ?? ''));
    }
    expect(onCta).toBe(true);
    await page.keyboard.press('Enter');
    await expect(modalOf(page).getByTestId('stamp')).toHaveText('Vote cast');
  });

  test.fail(
    'm4: on a 375 × 667 phone the ballot shows its header and at least five rows above the CTA (screens §10)',
    async ({ page }) => {
      await signUp(page, 'Short Screen');
      expect((await page.request.post('/api/test/character', { data: { fxp: 400 } })).ok()).toBe(true);
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/council/ballot');
      await expect(page.getByTestId('ballot-row').first()).toBeVisible();
      const above = await page.evaluate(() => {
        const cta = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect().top;
        return [...document.querySelectorAll('[data-testid=ballot-row]')].filter((r) => {
          const x = r.getBoundingClientRect();
          return x.top >= 0 && x.bottom <= cta;
        }).length;
      });
      expect(above).toBeGreaterThanOrEqual(5);
    },
  );

  test('the count at 360 px: six columns, the line in words, no side scroll', async ({ page }) => {
    await advanceTo(page, 0);
    await signUp(page, 'Count Reader');
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/council/count');
    await expect(page.getByTestId('count-row')).toHaveCount(9);
    // Review 3 (answers §6.3): how seats are decided, in words, never a formula.
    await expect(page.locator('main')).toContainText(
      "The seven with the most support took the seats: the town's own vote for each candidate",
    );
    await expect(page.locator('main')).not.toContainText('Support =');
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
  });
});
