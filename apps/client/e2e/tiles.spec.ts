import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, openPlace, signUp, toTheCity } from './helpers';

/**
 * Maps v3 (docs/design/maps-v3-integration.md §7): the map drawn from Deep Zoom tiles. The e2e build
 * sets VITE_TILES_ORIGIN=/e2e-tiles, which nothing serves, so every other spec runs the stills
 * (the fallback). Here the tiles are routed to one small fixture tile.
 */

const TILE = fileURLToPath(new URL('./fixtures/tile.webp', import.meta.url));
const levelOf = (url: string) => Number(/webp_files\/(\d+)\//.exec(url)?.[1] ?? -1);

/** Serve every tile from the fixture; returns the tile URLs requested so far. */
async function serveTiles(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await page.route('**/e2e-tiles/**', async (route) => {
    seen.push(route.request().url());
    await route.fulfill({ path: TILE, contentType: 'image/webp' });
  });
  return seen;
}

/** Tile images that have loaded. */
const loadedTiles = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLImageElement>('img[data-tile]')].filter(
        (i) => i.complete && i.naturalWidth > 0,
      ).length,
  );

/** The highest tile level drawn, and the tiles still loading. */
const tileState = (page: Page) =>
  page.evaluate(() => ({
    top: Math.max(
      ...[...document.querySelectorAll<HTMLImageElement>('img[data-tile]')].map((i) =>
        Number(i.dataset.tile!.split('/')[0]),
      ),
    ),
    pending: [...document.querySelectorAll<HTMLElement>('[data-testid=tile-layer]')].reduce(
      (n, l) => n + Number(l.dataset.pending ?? 0),
      0,
    ),
  }));

/** Marks the pin buttons, so a later check can tell they are the same nodes (never remounted). */
const markPins = (page: Page) =>
  page.evaluate(() =>
    document
      .querySelectorAll('[data-testid=hotspot]')
      .forEach((el, i) => el.setAttribute('data-mark', `p${i}`)),
  );
const marked = (page: Page) => page.locator('[data-testid=hotspot][data-mark]');

/** The art (the layer, or where it is letterboxed the blurred copy) covers the map box: no black. */
const artCoversMap = (page: Page) =>
  page.evaluate(() => {
    const r = (el: Element | null) => el?.getBoundingClientRect() ?? null;
    const b = r(document.querySelector('[data-testid=city-map]'))!;
    // Review 3: a phone's plate and orders panel run edge to edge and are opaque; the art may stop
    // short under them, so what must be covered is the box between them.
    const box = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    for (const el of document.querySelectorAll<HTMLElement>('[data-map-opaque]')) {
      const o = el.getBoundingClientRect();
      if (o.width === 0 || o.left > box.left + 1 || o.right < box.right - 1) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      if (o.top <= box.top + 1 && o.bottom > box.top) box.top = o.bottom;
      else if (o.bottom >= box.bottom - 1 && o.top < box.bottom) box.bottom = o.top;
    }
    const fit = document.querySelector<HTMLElement>('[data-testid=city-map]')!.dataset.fit;
    const backdrop = document.querySelector('[data-testid=map-backdrop]');
    const over =
      fit === 'cover'
        ? r(document.querySelector('[data-testid=map-layer]'))
        : backdrop?.querySelector('img')
          ? r(backdrop)
          : null;
    return (
      !!over &&
      over.left <= box.left + 1 &&
      over.top <= box.top + 1 &&
      over.right >= box.right - 1 &&
      over.bottom >= box.bottom - 1
    );
  });

test.describe('the map from tiles', () => {
  test('tiles draw the map; a pin zooms in, fetching a closer level, with the same pin buttons', async ({
    page,
  }) => {
    const seen = await serveTiles(page);
    await signUp(page);
    await toTheCity(page);
    const map = page.getByTestId('city-map');
    await expect(map).toHaveAttribute('data-art', 'tiles');
    await expect.poll(() => loadedTiles(page)).toBeGreaterThan(1);
    expect(await page.getByTestId('map-layer').locator('picture').count()).toBe(0);
    // The levels drawn at rest (the welcome landing's zoom, before, also fetched closer tiles; they
    // stay drawn until the at-rest detail, fetched once the view has held for 150 ms, is in).
    await page.waitForTimeout(400);
    await expect.poll(() => tileState(page)).toMatchObject({ pending: 0 });
    const rest = await tileState(page);
    const before = seen.length;
    await markPins(page);
    await page.getByRole('button', { name: '3. Union Hall' }).click();
    await expect(map).toHaveAttribute('data-zoomed', 'true');
    await expect(map).toHaveAttribute('data-moving', 'false');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(async () => (await tileState(page)).top).toBeGreaterThan(rest.top);
    expect(seen.slice(before).some((u) => levelOf(u) > rest.top)).toBe(true);
    await expect(marked(page)).toHaveCount(6);
    await expect(map).toHaveAttribute('data-art', 'tiles');
  });

  test('tiles that are not there: the stills within 2 s, never black', async ({ page }) => {
    await page.route('**/e2e-tiles/**', (route) => route.fulfill({ status: 404, body: '' }));
    await signUp(page);
    await page.getByRole('button', { name: 'To the city' }).click();
    const map = page.getByTestId('city-map');
    await expect(map).toHaveAttribute('data-art', 'still', { timeout: 2_000 });
    await expect(page.getByTestId('map-layer').locator('picture img')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible(); // the welcome landing still zooms into pin 1
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Close/ })
      .click();
    await mapAtRest(page);
    await expect.poll(() => artCoversMap(page)).toBe(true);
  });

  // Review 3: zoomed into a place on a phone held upright the map was blurry. The detail level now
  // matches the art's on-screen pixels (DPR capped at 2) as it does sideways, and once the zoom has
  // landed the layer drops `will-change` so the browser paints it again at its new scale.
  for (const phone of [
    { width: 390, height: 844, dpr: 3 },
    { width: 360, height: 640, dpr: 2 },
  ]) {
    test.describe(`upright ${phone.width} × ${phone.height} at DPR ${phone.dpr}`, () => {
      test.use({ viewport: { width: phone.width, height: phone.height }, deviceScaleFactor: phone.dpr });

      test('a zoom into a place draws the level its on-screen pixels need', async ({ page }) => {
        await serveTiles(page);
        await signUp(page);
        await toTheCity(page);
        const map = page.getByTestId('city-map');
        await expect(map).toHaveAttribute('data-art', 'tiles');
        await openPlace(page, '3. Union Hall');
        await expect(map).toHaveAttribute('data-zoomed', 'true');
        await expect(map).toHaveAttribute('data-moving', 'false');
        await expect(page.getByRole('dialog')).toContainText('Union Hall');
        // The level the zoomed view needs: the art's width on screen in device pixels (DPR capped
        // at 2); the 8,640 px pyramid halves per level from level 14.
        const need = await page.evaluate(() => {
          const scale = Number(
            document.querySelector<HTMLElement>('[data-testid=city-map]')!.dataset.view!.split(',')[2],
          );
          const layerW = parseFloat(
            document.querySelector<HTMLElement>('[data-testid=map-layer]')!.style.width,
          );
          const px = Math.round(layerW * scale * Math.min(2, window.devicePixelRatio));
          let level = 0;
          while (level < 14 && Math.ceil(8640 / 2 ** (14 - level)) < px) level++;
          return level;
        });
        await expect.poll(() => tileState(page)).toEqual({ top: need, pending: 0 });
        // Landed: the layer is no longer held as a moving layer at its old raster scale.
        await expect(page.getByTestId('map-layer')).toHaveCSS('will-change', 'auto');
      });
    });
  }

  test.describe('a phone held sideways', () => {
    test.use({ viewport: { width: 812, height: 375 } });

    test('812 × 375: a tap zooms into a pin and the side panel opens', async ({ page }) => {
      await serveTiles(page);
      await signUp(page);
      await toTheCity(page);
      const map = page.getByTestId('city-map');
      await expect(map).toHaveAttribute('data-art', 'tiles');
      await page.getByRole('button', { name: '5. Harbour Quays' }).click();
      await expect(map).toHaveAttribute('data-zoomed', 'true');
      await expect(map).toHaveAttribute('data-moving', 'false');
      const panel = page.locator('[role=dialog][data-layout=side]');
      await expect(panel).toBeVisible();
      await expect(panel).toContainText('Harbour Quays');
      await expect(page.locator('[data-testid="hotspot"][aria-label="5. Harbour Quays"]')).toBeInViewport();
    });
  });

  test('at night the night tiles show; flipped back to day, one tile layer is left', async ({ page }) => {
    test.setTimeout(90_000);
    // The shared test clock to 21:00 UTC (it only moves forward; this spec runs last of the phone's).
    const { now } = (await (
      await page.request.post('/api/test/clock', { data: { advanceMs: 0 } })
    ).json()) as {
      now: number;
    };
    const DAY = 86_400_000;
    const at21 = Math.floor(now / DAY) * DAY + 21 * 3_600_000;
    const to = at21 > now ? at21 : at21 + DAY;
    expect((await page.request.post('/api/test/clock', { data: { advanceMs: to - now } })).ok()).toBe(true);

    await serveTiles(page);
    await signUp(page);
    await toTheCity(page);
    const night = page.getByTestId('map-night');
    await expect(night).toHaveCSS('opacity', '1');
    await expect(night.getByTestId('tile-layer')).toHaveCount(1);
    await expect(page.getByTestId('tile-layer')).toHaveCount(1); // a landing at night loads night only
    const nightSrc = await night.locator('img[data-tile]').first().getAttribute('src');
    expect(nightSrc).toContain('/e2e-tiles/map.coalport.night/');

    // To 07:00 the next morning; the city is fetched again when the page comes back into view.
    expect((await page.request.post('/api/test/clock', { data: { advanceMs: 10 * 3_600_000 } })).ok()).toBe(
      true,
    );
    await page.waitForTimeout(10_500); // the city query goes stale after 10 s
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
    await expect(night).toHaveCSS('opacity', '0');
    await expect(page.getByTestId('tile-layer')).toHaveCount(1);
    await expect(night.getByTestId('tile-layer')).toHaveCount(0);
    const daySrc = await page.getByTestId('tile-layer').locator('img[data-tile]').first().getAttribute('src');
    expect(daySrc).toContain('/e2e-tiles/map.coalport.day/');
  });
});
