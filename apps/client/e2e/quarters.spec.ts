import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, sheetSettled, signUp } from './helpers';

/**
 * Slice 5's home quarters (tech design §15.1 `quarters.spec.ts`; screens §3): a Collective at Level 5
 * sees Coalport's overview with three outlines and their names, the Harbour's *Opens at Level 6* and the
 * Sidings' *Opens with a later edition*; the Harbour's teaser has no button; at Level 6 the Harbour
 * opens: the zoom, its five pins numbered 7–11, the quarter bar with the Sidings locked, held to its
 * frame; the bar back to the Mill; `?loc=` still opens the Mill with the Union Hall's sheet. Then the
 * overview and a quarter at the four other sizes, with no sideways scroll.
 */

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const visible = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const noSideScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
};
const names = (page: Page) => page.locator('[data-testid=hotspot][data-pin=name]');

test('the home overview and quarters: outlines, locks, the teaser, Level 6, the bar, ?loc=', async ({
  page,
}) => {
  test.setTimeout(180_000);
  // 1. A fresh Collective at Level 5.
  await signUp(page, 'Mara Lenk');
  await lift(page, { level: 5 });

  // 2. Coalport lands on the Mill (one quarter open: slice 4's map); the plate's name is the way to
  // the overview.
  await page.goto('/city/coalport');
  await mapAtRest(page);
  await expect(page.locator('[data-quarters]')).toHaveAttribute('data-quarter', 'coalport.mill');
  await expect(page.getByTestId('quarter-bar')).toHaveCount(0);
  await visible(page, 'plate-overview').click();
  await expect(page).toHaveURL(/\/city\/coalport\/overview$/);
  await mapAtRest(page);
  await expect(page.getByTestId('district-outline')).toHaveCount(3);
  await expect(names(page)).toHaveCount(3);
  await expect(names(page).filter({ hasText: 'The Mill' })).toHaveCount(1);
  await expect(names(page).filter({ hasText: 'The Harbour' })).toContainText('Opens at Level 6');
  await expect(names(page).filter({ hasText: 'The Sidings' })).toContainText('Opens with a later edition');
  // The Places pill reads *Quarters* and lists the three with their lock lines.
  await visible(page, 'places-button').click();
  const list = page.getByTestId('quarters-list');
  await expect(list.getByTestId('quarter-row')).toHaveCount(3);
  await expect(list.getByTestId('quarter-row-line').nth(1)).toHaveText('Opens at Level 6');
  await list.getByRole('button', { name: 'Close' }).click();

  // 3. Tap the Harbour: the teaser, with no button but Close.
  await names(page).filter({ hasText: 'The Harbour' }).click();
  const teaser = page.getByTestId('quarter-teaser');
  await expect(teaser).toBeVisible();
  await expect(teaser.getByTestId('teaser-kicker')).toHaveText('Quarter · opens at Level 6');
  await expect(teaser.getByTestId('teaser-level')).toHaveText('Level 6 opens it; you are Level 5.');
  await expect(teaser.getByRole('button')).toHaveText(['Close']);
  await teaser.getByRole('button', { name: 'Close' }).click();
  await expect(teaser).toHaveCount(0);

  // 4. Level 6 and reload: the Harbour is open.
  await lift(page, { level: 6 });
  await page.reload();
  await mapAtRest(page);
  await expect(names(page).filter({ hasText: 'The Harbour' })).not.toContainText('Opens at');

  // 5. Tap it: the zoom, five pins numbered 7–11, the quarter bar with the Sidings locked, held to the frame.
  await names(page).filter({ hasText: 'The Harbour' }).click();
  await expect(page).toHaveURL(/\/city\/coalport\/coalport\.harbour$/);
  await mapAtRest(page);
  const pins = page.locator('[data-testid=hotspot][data-pin=number]');
  await expect(pins).toHaveCount(5);
  const labels = await pins.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!.split('.')[0]));
  expect(labels.map(Number).sort((a, b) => a - b)).toEqual([7, 8, 9, 10, 11]);
  const bar = visible(page, 'quarter-bar');
  await expect(bar.getByTestId('quarter-chip')).toHaveText(['The Mill', 'The Harbour', 'The Sidings']);
  await expect(bar.getByTestId('quarter-chip').nth(1)).toHaveAttribute('aria-current', 'page');
  await expect(bar.getByTestId('quarter-chip').nth(2)).toHaveAttribute('data-locked', 'true');
  // A quarter's plate: its name, and *‹ Coalport* back to the overview.
  await expect(visible(page, 'plate-name')).toHaveText('The Harbour');
  await expect(visible(page, 'quarter-back')).toHaveText(/Coalport/);
  // Held to the frame: the quarter's edge is drawn and the picture outside it dimmed.
  await expect(page.getByTestId('district-edge')).toHaveCount(1);
  await bar.getByTestId('quarter-chip').nth(2).click();
  await expect(page.getByTestId('quarter-teaser')).toContainText('Quarter · a later edition');
  await page.getByTestId('quarter-teaser').getByRole('button', { name: 'Close' }).click();

  // 6. The bar to the Mill.
  await visible(page, 'quarter-bar').getByTestId('quarter-chip').first().click();
  await expect(page).toHaveURL(/\/city\/coalport\/coalport\.mill$/);
  await mapAtRest(page);
  await expect(page.locator('[data-testid=hotspot][data-pin=number]')).toHaveCount(6);

  // 7. `/city/coalport?loc=coalport.union-hall` still opens the Mill with the Union Hall's sheet.
  await page.goto('/city/coalport/coalport.harbour');
  await mapAtRest(page);
  await page.goto('/city/coalport?loc=coalport.union-hall');
  await expect(page.locator('[data-quarters]')).toHaveAttribute('data-quarter', 'coalport.mill');
  const sheet = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Union Hall' }) });
  await expect(sheet).toBeVisible();
  await sheetSettled(page);
});

test.describe('the overview and a quarter at the other sizes (screens §10)', () => {
  for (const size of [
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 812, height: 375 },
    { width: 1440, height: 900 },
  ])
    test(`${size.width} × ${size.height}: three names, the bar, no sideways scroll`, async ({ page }) => {
      test.setTimeout(120_000);
      await signUp(page, 'Mara Lenk');
      await lift(page, { level: 6 });
      await page.setViewportSize(size);
      await page.goto('/city/coalport/overview');
      await mapAtRest(page);
      await expect(page.getByTestId('district-outline')).toHaveCount(3);
      await expect(names(page)).toHaveCount(3);
      // The names never overlap (screens §10).
      const boxes = await names(page).evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect().toJSON()),
      );
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          expect(overlap, `names ${i} and ${j} overlap`).toBe(false);
        }
      await noSideScroll(page);
      await page.goto('/city/coalport/coalport.harbour');
      await mapAtRest(page);
      await expect(page.locator('[data-testid=hotspot][data-pin=number]')).toHaveCount(5);
      await expect(visible(page, 'quarter-bar').getByTestId('quarter-chip')).toHaveCount(3);
      for (const chip of await visible(page, 'quarter-bar').getByTestId('quarter-chip').all()) {
        const box = (await chip.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await noSideScroll(page);
    });
});
