import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers';

/**
 * QA slice 3 (docs/qa/slice-3.md), reworked for the rule vote (docs/tech/voting-rework.md §15.2): the
 * ballot on a phone. A double tap on a card and on the CTA casts one vote and shows one modal; no side
 * scroll at 360 px; the ballot by keyboard alone; a short phone keeps the third card's top edge above
 * the CTA; the result at 360 px (the cards, the council rows, a row's two numbers). Runs after the
 * council project: it moves the clock.
 */
const advanceTo = async (page: Page, cycleDay: number) => {
  const res = await page.request.post('/api/test/clock', {
    data: { advanceTo: { cityId: 'coalport', cycleDay } },
  });
  expect(res.ok()).toBe(true);
};
const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
const sideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const activist = (page: Page) => page.request.post('/api/test/character', { data: { fxp: 400 } });

test.describe.serial('QA slice 3: the rule ballot on a phone', () => {
  test('a double tap on a card and on the CTA casts one vote, with one modal; no side scroll at 360', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await advanceTo(page, 2);
    expect((await page.request.post('/api/test/city-day')).ok()).toBe(true);
    await signUp(page, 'Double Tapper');
    expect((await activist(page)).ok()).toBe(true);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/council/ballot');
    const cards = page.getByTestId('rule-card');
    await expect(cards).toHaveCount(3);
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    await cards.nth(2).dblclick();
    await expect(cards.nth(2)).toHaveAttribute('aria-checked', 'true');
    const cta = page.getByRole('button', { name: /^Vote for / });
    await expect(cta).toBeEnabled();
    let calls = 0;
    page.on('response', (r) => {
      if (r.url().includes('council.vote')) calls += 1;
    });
    await cta.dblclick();
    await expect(modalOf(page).getByTestId('stamp')).toHaveText('Vote cast');
    await modalOf(page).getByRole('button', { name: 'Continue' }).click();
    await expect(modalOf(page)).toHaveCount(0);
    await expect(page.getByTestId('ballot-cast-line')).toBeVisible();
    expect(calls).toBe(1);
    await page.reload();
    await expect(page.getByTestId('ballot-cast-line')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Vote for / })).toHaveCount(0);
    // The chosen card carries *your vote*; the others dim.
    await expect(cards.nth(2)).toContainText('your vote');
    await expect(cards.nth(0)).toHaveCSS('opacity', '0.5');
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
  });

  test('the ballot by keyboard alone: Tab into the cards, the arrows, Space, Tab to the CTA, Enter', async ({ page }) => {
    await signUp(page, 'Keyboard Voter');
    expect((await activist(page)).ok()).toBe(true);
    await page.goto('/council/ballot');
    await expect(page.getByTestId('rule-card').first()).toBeVisible();
    let onCard = false;
    for (let i = 0; i < 40 && !onCard; i++) {
      await page.keyboard.press('Tab');
      onCard = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'rule-card');
    }
    expect(onCard).toBe(true);
    // The arrow moves to the next card and picks it; Space keeps it picked.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    const picked = page.locator('[data-testid=rule-card][aria-checked=true]');
    await expect(picked).toHaveCount(1);
    await expect(picked).toBeFocused();
    let onCta = false;
    for (let i = 0; i < 30 && !onCta; i++) {
      await page.keyboard.press('Tab');
      onCta = await page.evaluate(() => /^Vote for /.test(document.activeElement?.textContent ?? ''));
    }
    expect(onCta).toBe(true);
    await page.keyboard.press('Enter');
    await expect(modalOf(page).getByTestId('stamp')).toHaveText('Vote cast');
  });

  test('a 375 × 667 phone: the header drops to its band and the third card shows above the CTA', async ({ page }) => {
    await signUp(page, 'Short Screen');
    expect((await activist(page)).ok()).toBe(true);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/council/ballot');
    await expect(page.getByTestId('rule-card')).toHaveCount(3);
    const m = await page.evaluate(() => {
      const header = document.querySelector('[data-testid=hall-header]')!.getBoundingClientRect();
      const cta = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
      const third = document.querySelectorAll('[data-testid=rule-card]')[2]!.getBoundingClientRect();
      return { header: header.height, third: third.top, cta: cta.top, ctaBottom: cta.bottom, h: window.innerHeight };
    });
    expect(m.header).toBeLessThanOrEqual(64);
    expect(m.third).toBeLessThan(m.cta);
    expect(m.ctaBottom).toBeLessThanOrEqual(m.h + 1);
  });

  test('the result at 360 px: the three cards, the council rows, a row’s two numbers, no side scroll', async ({
    page,
  }) => {
    await advanceTo(page, 0);
    await signUp(page, 'Count Reader');
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/council/count');
    await expect(page.getByTestId('count-header')).toHaveText(/^\d+ of \d+ members voted · final$/);
    const cards = page.getByTestId('rule-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('[data-testid=rule-card][data-won=true]')).toHaveCount(1);
    await expect(page.locator('[data-testid=rule-card][data-won=true]')).toContainText('Passed');
    await expect(page.locator('[data-testid=rule-card][data-won=true]')).toContainText(/runs until \w+day/);
    const rows = page.getByTestId('council-row');
    await expect(rows.first()).toBeVisible();
    await expect(page.locator('[data-testid=council-row][data-seated=true]')).toHaveCount(7);
    // Seats in words, never a formula (design §4.3).
    await expect(page.getByTestId('seats-sentence')).toHaveText(
      'Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest.',
    );
    await expect(page.locator('main')).not.toContainText(/Support =|total/i);
    await rows.first().getByRole('button').click();
    await expect(page.getByTestId('council-popover')).toHaveText(/^local support \d+ · backers \d+$/);
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
  });
});
