import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, signUp, toTheCity } from './helpers';

/**
 * Review 3 (the user, 2 Oct 2026): "a list of points of interest of the map, so the player doesn't
 * have to go look for them". The Places button opens every place in the city view in pin order; a row
 * does exactly what its pin does: the map zooms to it and its sheet opens, with `?loc=` set.
 */

async function openFromList(page: Page, row: RegExp) {
  await page.getByTestId('places-button').filter({ visible: true }).click();
  const list = page.getByRole('dialog', { name: 'Places in Coalport' });
  await expect(list).toBeVisible();
  const rows = list.getByTestId('place-row');
  await expect(rows).toHaveCount(6);
  // In pin order, each with its number and name.
  expect(
    await rows.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!.split(',')[0])),
  ).toEqual([
    '1. Mill Gate',
    '2. Market Row',
    '3. Union Hall',
    '4. Foundry Row',
    '5. Harbour Quays',
    '6. The Anchor',
  ]);
  // The welcome day's orders point at the Mill Gate and the Union Hall: their rows carry the tag.
  await expect(list.getByRole('button', { name: '1. Mill Gate, Party order' })).toBeVisible();
  await expect(list.getByRole('button', { name: '3. Union Hall, Party order' })).toBeVisible();
  await expect(list.getByRole('button', { name: '4. Foundry Row' })).toBeVisible();
  for (const r of await rows.all()) expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await list.getByRole('button', { name: row }).click();
  await expect(list).toBeHidden();
}

async function zoomedTo(page: Page, label: string, name: string) {
  const map = page.getByTestId('city-map');
  await expect(map).toHaveAttribute('data-zoomed', 'true');
  await expect(map).toHaveAttribute('data-moving', 'false');
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name })).toBeVisible();
  await expect(page.locator(`[data-testid="hotspot"][aria-label="${label}"]`)).toBeInViewport();
  await expect(page.locator(`[data-testid="hotspot"][aria-label="${label}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
}

test.describe('the Places list (review 3)', () => {
  test('a phone: the list is a bottom sheet; a row zooms to its pin and opens its sheet', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    await openFromList(page, /^4\. Foundry Row/);
    await expect(page).toHaveURL(/\/city\/coalport\?loc=coalport\.terraces$/);
    await zoomedTo(page, '4. Foundry Row', 'Foundry Row');
    // Closing the sheet comes back to the map at rest, with the Places button back.
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Close/ })
      .click();
    await mapAtRest(page);
    await expect(page.getByTestId('places-button').filter({ visible: true })).toBeVisible();
  });

  test('Escape closes the list and the focus goes back to the Places button', async ({ page }) => {
    await signUp(page);
    await toTheCity(page);
    const button = page.getByTestId('places-button').filter({ visible: true });
    await button.click();
    const list = page.getByRole('dialog', { name: 'Places in Coalport' });
    await expect(list).toBeVisible();
    // A bottom sheet on a phone: it runs to the screen's bottom edge, the full width.
    const b = (await list.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(b.x).toBeLessThanOrEqual(0.5);
    expect(b.width).toBeGreaterThanOrEqual(vp.width - 1);
    expect(b.y + b.height).toBeGreaterThanOrEqual(vp.height - 1);
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(button).toBeFocused();
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'false');
  });

  test.describe('a desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

    test('the list is a small panel at the right; a row opens its place', async ({ page }) => {
      await signUp(page);
      await toTheCity(page);
      const button = page.getByTestId('places-button').filter({ visible: true });
      await expect(button).toBeVisible();
      await button.click();
      const list = page.getByRole('dialog', { name: 'Places in Coalport' });
      const b = (await list.boundingBox())!;
      expect(b.width).toBeLessThanOrEqual(400);
      expect(b.x + b.width).toBeGreaterThan(1440 - 40);
      await list.getByRole('button', { name: /^5\. Harbour Quays/ }).click();
      await expect(page).toHaveURL(/\?loc=coalport\.quays$/);
      await zoomedTo(page, '5. Harbour Quays', 'Harbour Quays');
    });
  });
});
