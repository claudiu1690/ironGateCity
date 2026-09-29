import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ANSWERS, arrive, signUpOnly } from './helpers';
import type { FactionKey } from './helpers';

/**
 * Slice-2 QA M2: every pin of every home city whole and tappable in the map's first view, at every
 * supported size: not under the plate with its orders list (a corner block from 640 px), the
 * desktop tab dock, or the phone's orders panel. Also after the first landing's sheet closes on a
 * desktop, when the plate unfolds again.
 */

const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 640, height: 900 },
  { width: 375, height: 812 },
  { width: 360, height: 640 },
];

/** Every hotspot whose centre is not the topmost element there (something covers it). */
async function coveredPins(page: Page): Promise<string[]> {
  await expect(page.getByTestId('hotspot')).toHaveCount(6);
  await page.waitForTimeout(600); // the first view is applied once the map has measured itself
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid=hotspot]')].flatMap((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + Math.min(22, r.width / 2), r.top + r.height / 2);
      return top && (top === el || el.contains(top)) ? [] : [el.getAttribute('aria-label') ?? '?'];
    }),
  );
}

test.describe('every pin clear at every size (QA M2)', () => {
  test.use({ isMobile: false, hasTouch: false });

  for (const [faction, city] of [
    ['vanguard', 'duskwall'],
    ['collective', 'coalport'],
    ['alliance', 'ashford'],
  ] as const satisfies ReadonlyArray<readonly [FactionKey, string]>) {
    test(`${city}: no pin under the plate, the orders or the dock, from 1920 × 1080 to 360 × 640`, async ({
      page,
    }) => {
      await page.setViewportSize(SIZES[1]!);
      await signUpOnly(page, 'Ilse Marr', 2);
      await arrive(page, { faction, answers: ANSWERS.reference });
      await page.goto(`/city/${city}`);
      for (const size of SIZES) {
        await page.setViewportSize(size);
        await page.reload();
        expect(await coveredPins(page), `${size.width}×${size.height}`).toEqual([]);
      }
    });
  }

  test('ashford at 1280 × 800: after the first landing, closing the sheet leaves every pin clear', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUpOnly(page, 'Ilse Marr', 3);
    await arrive(page, { faction: 'alliance', answers: ANSWERS.reference });
    await page.getByRole('button', { name: 'To the city' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('Gazette House');
    // With the sheet open the plate folds, so pin 1 stays in view beside it.
    await expect(page.locator('[data-testid="hotspot"][aria-label="1. Gazette House"]')).toBeInViewport();
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await expect(page).toHaveURL(/\/city\/ashford$/);
    expect(await coveredPins(page)).toEqual([]);
    // And a pin tapped at once opens (the lost-tap fix, c732d64, still holds).
    await page.locator('[data-testid="hotspot"][aria-label="2. Assembly Rooms"]').click();
    await expect(page.getByRole('dialog')).toContainText('Assembly Rooms');
  });
});
