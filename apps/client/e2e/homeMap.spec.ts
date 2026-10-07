import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, sheetSettled, signUp } from './helpers';

/**
 * Review 4 (answers §21, tech design §8.5, ADR 0076): a home city is one map. A Collective at Level 5
 * sees Coalport's open places numbered (the Mill's six and the Town Hall, 12) and its other places as
 * greyed pins with a lock: the Harbour's five *Opens at Level 6*, the Sidings' four *Opens with a
 * later edition*; no outlines, no quarter bar, no overview. A greyed pin opens a short sheet, no zoom.
 * The Places list is grouped by quarter. The old quarter routes land on the one map, `?loc` kept. At
 * Level 6 the Harbour's pins open. Then five sizes with no overlapping pins and no sideways scroll.
 */

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const visible = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const noSideScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
};
const open = (page: Page) => page.locator('[data-testid=hotspot][data-pin=number]');
const locked = (page: Page) => page.getByTestId('locked-pin');

test('one map: open pins, greyed pins and their sheet, the grouped list, the old routes, Level 6', async ({ page }) => {
  test.setTimeout(180_000);
  await signUp(page, 'Mara Lenk');
  await lift(page, { level: 5 });

  // 1. One map: seven open places (the Town Hall is 12), nine greyed; no outline, bar or overview.
  await page.goto('/city/coalport');
  await mapAtRest(page);
  await expect(page.locator('[data-home-map=one]')).toHaveCount(1);
  await expect(open(page)).toHaveCount(7);
  const numbers = await open(page).evaluateAll((els) => els.map((e) => Number(e.getAttribute('aria-label')!.split('.')[0])));
  expect(numbers.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 12]);
  await expect(locked(page)).toHaveCount(9);
  await expect(locked(page).filter({ has: page.getByTestId('lock-mark') })).toHaveCount(9);
  await expect(page.getByRole('button', { name: 'The Shipyard, opens at Level 6' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Coal Yards, opens with a later edition' })).toHaveCount(1);
  for (const id of ['district-outline', 'quarter-bar', 'tram-bar', 'plate-overview', 'quarter-back'])
    await expect(page.getByTestId(id)).toHaveCount(0);

  // 2. A greyed pin: its short sheet, no zoom, no `?loc`.
  await page.getByRole('button', { name: 'The Shipyard, opens at Level 6' }).click();
  const sheet = page.getByTestId('locked-pin-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('locked-kicker')).toHaveText('The Harbour · opens at Level 6');
  await expect(sheet.getByRole('heading', { name: 'The Shipyard' })).toBeVisible();
  await expect(sheet.getByTestId('locked-line')).toHaveText('Level 6 opens it; you are Level 5.');
  await expect(sheet.getByRole('button')).toHaveText(['Close']);
  await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'false');
  expect(page.url()).not.toContain('loc=');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toHaveCount(0);

  // 3. The Places list, grouped by quarter with the lock lines; the Town Hall closes the first group.
  await visible(page, 'places-button').click();
  const list = page.getByTestId('places');
  await expect(list.getByTestId('place-group-title')).toHaveText([
    'The Mill+',
    'The Harbour · opens at Level 6+',
    'The Sidings · a later edition+',
  ]);
  const mill = list.getByTestId('place-group').first().getByTestId('place-row');
  await expect(mill).toHaveCount(7);
  await expect(mill.last()).toHaveAttribute('aria-label', '12. Town Hall');
  const harbour = list.getByTestId('place-group').nth(1).getByTestId('place-row');
  await expect(harbour).toHaveCount(5);
  await expect(harbour.first()).toHaveAttribute('data-locked', 'true');
  await expect(harbour.first().getByTestId('place-locked')).toHaveText('Opens at Level 6');
  await list.getByTestId('place-group-title').nth(1).click();
  await expect(list.getByTestId('place-group-blurb')).toContainText('Where the basin opens to the sea');
  // A greyed row opens the pin's short sheet.
  await harbour.first().click();
  await expect(page.getByTestId('locked-pin-sheet')).toBeVisible();
  await page.getByTestId('locked-pin-sheet').getByRole('button', { name: 'Close' }).click();

  // 4. The Town Hall, open at Level 1 of its quarter: a pin like any other, its sheet.
  await page.getByRole('button', { name: '12. Town Hall' }).click();
  const hall = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Town Hall' }) });
  await expect(hall).toBeVisible();
  await sheetSettled(page);
  await expect(hall.getByTestId('ticket-coalport.town-hall.gallery')).toBeVisible();
  await expect(hall.getByTestId('hall-rule')).toBeVisible();
  await expect(hall.getByTestId('hall-seat')).toHaveCount(7);
  await expect(hall.getByTestId('hall-desk')).toHaveCount(0);

  // 5. The old routes land on the one map, `?loc` kept.
  await page.goto('/city/coalport/overview');
  await expect(page).toHaveURL(/\/city\/coalport$/);
  await page.goto('/city/coalport/coalport.harbour?loc=coalport.union-hall');
  await expect(page).toHaveURL(/\/city\/coalport\?loc=coalport\.union-hall$/);
  await expect(page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Union Hall' }) })).toBeVisible();

  // 6. Level 6: the Harbour opens (pins 7–11); only the four later places stay greyed.
  await lift(page, { level: 6 });
  await page.goto('/city/coalport');
  await mapAtRest(page);
  await expect(open(page)).toHaveCount(12);
  await expect(locked(page)).toHaveCount(4);
});

test.describe('one map at five sizes (tech design §8.5)', () => {
  for (const size of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 812, height: 375 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ])
    test(`${size.width} × ${size.height}: no two pins overlap, no sideways scroll`, async ({ page }) => {
      test.setTimeout(120_000);
      await signUp(page, 'Mara Lenk');
      await lift(page, { level: 5 });
      await page.setViewportSize(size);
      await page.goto('/city/coalport');
      await mapAtRest(page);
      await expect(open(page).or(locked(page))).toHaveCount(16);
      // Every two pins' 44 px targets are apart at rest (centres at least 44 px apart).
      const close = await page.evaluate(() => {
        const pins = [...document.querySelectorAll('[data-testid=hotspot],[data-testid=locked-pin]')].map((e) => {
          const r = e.getBoundingClientRect();
          // The disc's centre: 22 px in from the target's leading edge (a flipped label pin aside).
          return { l: e.getAttribute('aria-label'), x: r.left + 22, y: r.top + r.height / 2 };
        });
        const out: string[] = [];
        for (let i = 0; i < pins.length; i++)
          for (let j = i + 1; j < pins.length; j++)
            if (Math.hypot(pins[i]!.x - pins[j]!.x, pins[i]!.y - pins[j]!.y) < 44)
              out.push(`${pins[i]!.l} × ${pins[j]!.l}`);
        return out;
      });
      expect(close).toEqual([]);
      await noSideScroll(page);
    });
});
