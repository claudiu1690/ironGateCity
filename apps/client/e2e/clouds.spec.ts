import { expect, test } from '@playwright/test';
import { signUp, toTheCity, unclearPins } from './helpers';

/**
 * Map atmosphere (2 Oct 2026, tried on Coalport): clouds drift over the city map above the art and
 * under the pins. They never take a tap: a pin with a cloud right over it still opens its place.
 */

test('a pin under a cloud still opens its place', async ({ page }) => {
  await signUp(page, 'Cloud Watcher');
  await toTheCity(page);
  const clouds = page.getByTestId('map-clouds');
  await expect(clouds).toHaveAttribute('data-time', /day|night/);
  await expect(clouds).toHaveCSS('pointer-events', 'none');
  // The sprites come a moment after the map (its art first).
  const sprite = clouds.locator('[data-cloud]').first();
  await expect(sprite).toBeAttached();

  // A pin clear at rest, and the first cloud stopped right over its centre.
  const hidden = await unclearPins(page);
  const pins = page.getByTestId('hotspot');
  let label = '';
  for (const p of await pins.all()) {
    const l = (await p.getAttribute('aria-label'))!;
    if (!hidden.includes(l)) {
      label = l;
      break;
    }
  }
  expect(label).not.toBe('');
  const pin = page.locator(`[data-testid="hotspot"][aria-label="${label}"]`);
  const r = (await pin.boundingBox())!;
  const x = r.x + 22;
  const y = r.y + r.height / 2;
  await page.evaluate(
    ({ x, y }) => {
      const layer = document.querySelector<HTMLElement>('[data-testid=map-clouds]')!;
      const box = layer.getBoundingClientRect();
      const el = layer.querySelector<HTMLElement>('[data-cloud]')!;
      for (const a of el.getAnimations()) a.cancel();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      el.style.transform = `translate3d(${x - box.left - w / 2}px, ${y - box.top - h / 2}px, 0)`;
    },
    { x, y },
  );
  // The cloud is over the pin's centre, yet the pin is what the point hits.
  const over = await page.evaluate(
    ({ x, y }) => {
      const img = document.querySelector(
        '[data-testid=map-clouds] [data-cloud] img:not([data-cloud-shadow])',
      )!;
      const c = img.getBoundingClientRect();
      const top = document.elementFromPoint(x, y);
      return {
        covered: x > c.left && x < c.right && y > c.top && y < c.bottom,
        hitsPin: !!top?.closest('[data-testid=hotspot]'),
      };
    },
    { x, y },
  );
  expect(over).toEqual({ covered: true, hitsPin: true });

  // A real tap at that point opens the place.
  await page.mouse.click(x, y);
  await expect(page).toHaveURL(/\?loc=coalport\./);
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(label.replace(/^\d+\.\s*/, ''));
  // Zoomed into the place, the clouds fade so it stays clear.
  await expect(page.getByTestId('map-clouds-level')).toHaveCSS('opacity', '0.15');
});
