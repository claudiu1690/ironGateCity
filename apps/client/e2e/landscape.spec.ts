import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { ANSWERS, answer, signUpOnly } from './helpers';

/**
 * Review 2 #3: a phone held sideways (812 × 375, 667 × 375) is playable. The arrival, the paper,
 * the city (the map the full height beside the city column, no page scroll, a compact HUD, the tab
 * rail), a location in its side panel (scrolling inside), one action and its result modal (the
 * buttons on screen, the content scrolling inside) and a story screen.
 */

type Box = { x: number; y: number; width: number; height: number };
const inside = (b: Box, vp: { width: number; height: number }) =>
  b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= vp.width + 0.5 && b.y + b.height <= vp.height + 0.5;
const boxOf = async (l: Locator): Promise<Box> => (await l.boundingBox())!;

async function noSideScroll(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
}
/** Neither the page nor the shell's <main> scrolls. */
async function noPageScroll(page: Page) {
  const r = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      doc: document.documentElement.scrollHeight - window.innerHeight,
      main: main ? main.scrollHeight - main.clientHeight : 0,
    };
  });
  expect(r.doc).toBeLessThanOrEqual(0);
  expect(r.main).toBeLessThanOrEqual(0);
}
/** Every hotspot whose centre is not the topmost element there. */
async function coveredPins(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid=hotspot]')].flatMap((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + Math.min(22, r.width / 2), r.top + r.height / 2);
      return top && (top === el || el.contains(top)) ? [] : [el.getAttribute('aria-label') ?? '?'];
    }),
  );
}

for (const vp of [
  { width: 812, height: 375 },
  { width: 667, height: 375 },
]) {
  test.describe(`a phone held sideways, ${vp.width} × ${vp.height}`, () => {
    test.use({ viewport: vp });

    test('arrival → paper → map → a location → one action and its result → a story screen', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      // The arrival: every answer and the join button reachable, no sideways scroll.
      await signUpOnly(page, 'Anna Roth', 1);
      await noSideScroll(page);
      for (const text of ANSWERS.slice1) await answer(page, text);
      await page.getByRole('radio', { name: /Red Collective/ }).click();
      const join = page.getByTestId('join');
      await join.scrollIntoViewIfNeeded();
      await expect(join).toBeInViewport({ ratio: 1 });
      await noSideScroll(page);
      await join.click();

      // The paper: the headlines, and "To the city" on the first screen.
      await expect(page).toHaveURL(/\/paper$/);
      await expect(page.getByTestId('headline').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'To the city' })).toBeInViewport({ ratio: 1 });
      await noSideScroll(page);
      // The tab bar is a rail down the left; the HUD a compact band.
      const nav = await boxOf(page.getByRole('navigation', { name: 'Main' }));
      expect(nav.x).toBe(0);
      expect(nav.width).toBeLessThanOrEqual(72);
      expect(nav.height).toBeGreaterThanOrEqual(vp.height - 1);
      const hud = await boxOf(page.getByRole('region', { name: 'Character' }));
      expect(hud.height).toBeLessThanOrEqual(60);
      await expect(page.getByTestId('hud-energy')).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId('hud-fxp')).toBeInViewport({ ratio: 1 });

      // The city: the first landing zooms into pin 1 and opens it in the side panel.
      await page.getByRole('button', { name: 'To the city' }).click();
      await expect(page).toHaveURL(/\/city\/coalport\?loc=/);
      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute('data-layout', 'side');
      const p = await boxOf(panel);
      expect(inside(p, vp)).toBe(true);
      expect(p.y).toBeGreaterThanOrEqual(hud.y + hud.height - 1);
      const map = await boxOf(page.getByTestId('city-map'));
      const pin1 = await boxOf(page.locator('[data-testid="hotspot"][aria-label="1. Mill Gate"]'));
      // The pin sits in the map, clear of the panel.
      expect(pin1.x).toBeGreaterThanOrEqual(p.x + p.width);
      expect(pin1.x + pin1.width).toBeLessThanOrEqual(map.x + map.width);
      await noPageScroll(page);

      // One action: its result fits, the buttons on screen, the content scrolling inside.
      const ticket = panel.locator('[data-testid^="ticket-"]').first();
      await ticket.scrollIntoViewIfNeeded();
      await ticket
        .getByRole('button', { name: /, once, \d+ Energy$/ })
        .first()
        .click();
      const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
      await expect(modal.getByTestId('stamp')).toBeVisible();
      expect(inside(await boxOf(modal), vp)).toBe(true);
      await expect(modal.getByRole('button', { name: 'Continue' })).toBeInViewport({ ratio: 1 });
      await modal.getByRole('button', { name: 'Continue' }).click();
      await expect(modal).toBeHidden();
      await panel.getByRole('button', { name: /^Close/ }).click();
      await expect(panel).toBeHidden();

      // The map at rest: the full height beside the city column, every pin clear, no page scroll.
      await expect(page).toHaveURL(/\/city\/coalport$/);
      await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'false');
      await page.waitForTimeout(700);
      const side = await boxOf(page.getByTestId('city-side'));
      const atRest = await boxOf(page.getByTestId('city-map'));
      expect(atRest.height).toBeGreaterThanOrEqual(vp.height - hud.height - 2);
      expect(atRest.x).toBeGreaterThanOrEqual(side.x + side.width - 1);
      await expect(page.getByTestId('hotspot')).toHaveCount(6);
      for (const pin of await page.getByTestId('hotspot').all()) {
        const b = await boxOf(pin);
        expect(b.x).toBeGreaterThanOrEqual(atRest.x);
        expect(b.x + b.width).toBeLessThanOrEqual(atRest.x + atRest.width);
        expect(b.y).toBeGreaterThanOrEqual(atRest.y);
        expect(b.y + b.height).toBeLessThanOrEqual(atRest.y + atRest.height);
      }
      expect(await coveredPins(page)).toEqual([]);
      await noPageScroll(page);
      await noSideScroll(page);

      // A story screen: the chapter's choice and its call to action on the first screen.
      await page.goto('/paper');
      await page.getByTestId('letters-row').click();
      await expect(page).toHaveURL(/\/story\/ambition/);
      const choice = page.getByTestId('story-choice').first();
      await expect(choice).toBeVisible();
      await choice.scrollIntoViewIfNeeded();
      await expect(choice).toBeInViewport();
      await noSideScroll(page);
      await choice.click();
      await page.getByTestId('story-approach').first().click();
      const cta = page.getByTestId('story-cta');
      await expect(cta).toBeEnabled();
      await expect(cta).toBeInViewport({ ratio: 1 });
      await noSideScroll(page);
    });
  });
}
