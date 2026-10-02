import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, openLocation, signUp, toTheCity } from './helpers';

/**
 * Review 3 (docs/review/2026-10-02-review-3.md, docs/design/review-3-answers.md; GDD §8.5, §13.1,
 * §13.1a, §14.13, §15.3): free zoom on the city map between the covering scale and the finest tile
 * level, never black; opening a place is one movement (and a cross-fade with reduced motion); the
 * buttons that spend Energy say what they cost; the training button is the verb; the election screens
 * stand on the council's hall, with who's who in words.
 */

const TILE = fileURLToPath(new URL('./fixtures/tile.avif', import.meta.url));
const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });

/** Serve every tile from the fixture (the e2e build's tile origin serves nothing; tiles.spec.ts). */
async function serveTiles(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await page.route('**/e2e-tiles/**', async (route) => {
    seen.push(route.request().url());
    await route.fulfill({ path: TILE, contentType: 'image/avif' });
  });
  return seen;
}

const viewOf = async (page: Page) =>
  (await page.getByTestId('city-map').getAttribute('data-view'))!.split(',').map(Number) as [
    number,
    number,
    number,
  ];
const limitsOf = async (page: Page) =>
  (await page.getByTestId('city-map').getAttribute('data-zoom-limits'))!.split(',').map(Number) as [
    number,
    number,
    number,
  ];

/** The art layer covers the part of the map on show (between a phone's opaque plate and orders). */
const artCoversMap = (page: Page) =>
  page.evaluate(() => {
    const b = document.querySelector('[data-testid=city-map]')!.getBoundingClientRect();
    const box = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    for (const el of document.querySelectorAll<HTMLElement>('[data-map-opaque]')) {
      const o = el.getBoundingClientRect();
      if (o.width === 0 || o.left > box.left + 1 || o.right < box.right - 1) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      if (o.top <= box.top + 1 && o.bottom > box.top) box.top = o.bottom;
      else if (o.bottom >= box.bottom - 1 && o.top < box.bottom) box.bottom = o.top;
    }
    const l = document.querySelector('[data-testid=map-layer]')!.getBoundingClientRect();
    return (
      l.left <= box.left + 1 && l.top <= box.top + 1 && l.right >= box.right - 1 && l.bottom >= box.bottom - 1
    );
  });

/** Frames (of about 40) in which the art does not cover the map, while something moves. */
const framesPastTheArt = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let bad = 0;
        let n = 0;
        const tick = () => {
          const b = document.querySelector('[data-testid=city-map]')!.getBoundingClientRect();
          const top = Math.max(
            b.top,
            ...[...document.querySelectorAll<HTMLElement>('[data-map-opaque]')]
              .map((el) => el.getBoundingClientRect())
              .filter((o) => o.width > 0 && o.top <= b.top + 1)
              .map((o) => o.bottom),
          );
          const bottom = Math.min(
            b.bottom,
            ...[...document.querySelectorAll<HTMLElement>('[data-map-opaque]')]
              .map((el) => el.getBoundingClientRect())
              .filter((o) => o.width > 0 && o.bottom >= b.bottom - 1)
              .map((o) => o.top),
          );
          const l = document.querySelector('[data-testid=map-layer]')!.getBoundingClientRect();
          if (!(l.left <= b.left + 1 && l.top <= top + 1 && l.right >= b.right - 1 && l.bottom >= bottom - 1))
            bad++;
          if (++n < 40) requestAnimationFrame(tick);
          else resolve(bad);
        };
        requestAnimationFrame(tick);
      }),
  );

type SheetFrame = { t: number; y: number; o: number; map: number };

/**
 * The open place's sheet, frame by frame from the first frame it is in the page: its transform's y,
 * its opacity, and the map layer's scale. Installed before the page loads, so a deep link is sampled
 * from its first frame; `sample` starts again (before a tap or a close).
 */
/** No place open and nothing moving (the first landing's sheet has finished sliding out). */
async function settledAtRest(page: Page) {
  await expect(page.locator('[role=dialog][data-layout]')).toHaveCount(0);
  await mapAtRest(page);
}

async function installSampler(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __sample: () => void; __frames: SheetFrame[]; __done: boolean };
    w.__sample = () => {
      const out: SheetFrame[] = [];
      w.__frames = out;
      w.__done = false;
      let t0: number | null = null;
      const start = performance.now();
      const tick = () => {
        const now = performance.now();
        const d = document.querySelector<HTMLElement>('[role=dialog][data-layout]');
        if (d && t0 === null) t0 = now;
        if (d && t0 !== null) {
          const st = getComputedStyle(d);
          const layer = document.querySelector('[data-testid=map-layer]');
          const lt = layer ? getComputedStyle(layer).transform : 'none';
          out.push({
            t: now - t0,
            y: new DOMMatrix(st.transform === 'none' ? undefined : st.transform).m42,
            o: Number(st.opacity),
            map: new DOMMatrix(lt === 'none' ? undefined : lt).a,
          });
        }
        if (t0 !== null ? now - t0 < 700 : now - start < 8000) requestAnimationFrame(tick);
        else if (w.__frames === out) w.__done = true;
      };
      requestAnimationFrame(tick);
    };
    w.__sample();
  });
}
const sample = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sample: () => void }).__sample());
async function sheetFrames(page: Page): Promise<SheetFrame[]> {
  await page.waitForFunction(() => {
    const w = window as unknown as { __frames: SheetFrame[]; __done: boolean };
    return w.__done && w.__frames.length > 0;
  });
  return page.evaluate(() => (window as unknown as { __frames: SheetFrame[] }).__frames);
}

test.describe('free zoom on the city map (answers §1)', () => {
  test('a double tap, the wheel: never past the finest tile level, never out past the covering scale, never black', async ({
    page,
  }) => {
    const seen = await serveTiles(page);
    await signUp(page);
    await toTheCity(page);
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-art', 'tiles');
    const [min, max, fitted] = await limitsOf(page);
    expect(min).toBeLessThanOrEqual(fitted);
    expect(max).toBeGreaterThan(fitted);
    // Finest detail: the top level at one tile pixel per device pixel, the DPR capped at 2.
    const { layerW, dpr } = await page.evaluate(() => ({
      layerW: parseFloat(document.querySelector<HTMLElement>('[data-testid=map-layer]')!.style.width),
      dpr: window.devicePixelRatio,
    }));
    expect(layerW * max * Math.min(2, dpr)).toBeLessThanOrEqual(8640 + 1);
    expect(layerW * max * Math.min(2, dpr)).toBeGreaterThan(8640 * 0.99);

    const box = (await page.getByTestId('city-map').boundingBox())!;
    const mid = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // A double tap: twice the rest view, easing, the art over the map at every frame.
    const watching = framesPastTheArt(page);
    await page.touchscreen.tap(mid.x, mid.y);
    await page.touchscreen.tap(mid.x, mid.y);
    expect(await watching).toBe(0);
    await expect.poll(async () => (await viewOf(page))[2]).toBeCloseTo(Math.min(max, fitted * 2), 3);
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'false');

    // The wheel to the closest zoom: it stops at the limit, and the top level is drawn.
    await page.mouse.move(mid.x, mid.y);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await viewOf(page))[2]).toBeCloseTo(max, 3);
    await expect.poll(() => seen.some((u) => /avif_files\/14\//.test(u))).toBe(true);
    expect(await artCoversMap(page)).toBe(true);
    // Out as far as it goes: the covering scale, the art still over every pixel of the map.
    for (let i = 0; i < 25; i++) await page.mouse.wheel(0, 300);
    await expect.poll(async () => (await viewOf(page))[2]).toBeCloseTo(min, 3);
    expect(await artCoversMap(page)).toBe(true);
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-fit', 'cover');
  });

  test('the view is kept for the session; a place opens from it and closing returns to it', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    const box = (await page.getByTestId('city-map').boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-moving', 'false');
    const mine = await page.getByTestId('city-map').getAttribute('data-view');
    // Another tab and back: the same view.
    await page
      .getByRole('link', { name: /^Paper/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/paper$/);
    await page.goto('/city/coalport');
    await mapAtRest(page);
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-view', mine!);
    // A place from the Places list (the zoom may have taken its pin off screen), and back.
    await page.getByTestId('places-button').filter({ visible: true }).click();
    await page
      .getByRole('dialog', { name: /^Places in / })
      .getByRole('button', { name: /^3\. Union Hall/ })
      .click();
    const sheet = page.getByRole('dialog').filter({ hasText: 'Union Hall' });
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'true');
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await mapAtRest(page);
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-view', mine!);
  });
});

test.describe('opening a place is one movement (answers §2)', () => {
  test('the sheet slides up with the zoom, on one curve, and back down in reverse', async ({ page }) => {
    await installSampler(page);
    await signUp(page);
    await toTheCity(page);
    await settledAtRest(page);
    await sample(page);
    await page.locator('[data-testid="hotspot"][aria-label="3. Union Hall"]').click();
    const f = await sheetFrames(page);
    // The sheet is there from the first frames of the zoom (not after it) and moves over 250–350 ms.
    expect(f.length).toBeGreaterThan(5);
    const start = f[0]!;
    expect(start.y).toBeGreaterThan(100); // starts below, sliding up
    const moving = f.filter((x) => x.y > 0.5);
    const intermediate = moving.filter((x) => x.y < start.y - 1);
    expect(intermediate.length).toBeGreaterThanOrEqual(5); // a tween, not a pop
    const span = moving.at(-1)!.t - start.t;
    expect(span).toBeGreaterThan(200);
    expect(span).toBeLessThan(420);
    // The map zooms in the same frames.
    expect(intermediate.some((x) => x.map > f[0]!.map + 0.01)).toBe(true);
    expect(f.at(-1)!.y).toBe(0);
    // Its CSS animation: 300 ms.
    const anim = await page
      .locator('[role=dialog][data-layout]')
      .evaluate((el) => getComputedStyle(el).animationDuration + ' ' + getComputedStyle(el).animationName);
    expect(anim).toBe('0.3s place-sheet-in');
    // Closing: the sheet stays while it slides out, then goes.
    await sample(page);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Close/ })
      .click();
    const g = await sheetFrames(page);
    expect(g.filter((x) => x.y > 1).length).toBeGreaterThanOrEqual(4);
    await expect(page.locator('[role=dialog][data-layout]')).toHaveCount(0);
    await mapAtRest(page);
  });

  test('a deep link (?loc=) eases the sheet in with the zoom too', async ({ page }) => {
    await installSampler(page);
    await signUp(page);
    await toTheCity(page);
    await settledAtRest(page);
    await page.goto('/city/coalport?loc=coalport.quays');
    await expect(page.getByRole('dialog')).toContainText('Harbour Quays');
    const f = await sheetFrames(page);
    expect(f[0]!.y).toBeGreaterThan(100);
    expect(f.filter((x) => x.y > 1).length).toBeGreaterThanOrEqual(4);
    // The map zooms in the same frames as the sheet rises.
    expect(f.filter((x) => x.y > 1).some((x) => x.map > f[0]!.map + 0.01)).toBe(true);
    await expect(page.getByRole('dialog')).toContainText('Harbour Quays');
  });

  test('reduced motion: a 120 ms cross-fade, no movement', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installSampler(page);
    await signUp(page);
    await toTheCity(page);
    await settledAtRest(page);
    await sample(page);
    await page.locator('[data-testid="hotspot"][aria-label="3. Union Hall"]').click();
    const f = await sheetFrames(page);
    expect(f.every((x) => x.y === 0)).toBe(true); // never moves
    expect(f.some((x) => x.o < 1)).toBe(true); // it fades
    expect(f.filter((x) => x.o < 1).at(-1)!.t).toBeLessThan(200); // in about 120 ms
    const anim = await page
      .locator('[role=dialog][data-layout]')
      .evaluate((el) => getComputedStyle(el).animationDuration + ' ' + getComputedStyle(el).animationName);
    expect(anim).toBe('0.12s place-fade-in');
    await expect(page.getByTestId('map-layer')).toHaveCSS('transition-property', 'none');
  });
});

test.describe('buttons that say what they cost, the verb (answers §4–§5)', () => {
  test('the ticket reads Once and ×3 · 30 Energy; the training button is Study; no result button ends in a bare number', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    let sheet = await openLocation(page, '1. Mill Gate');
    const ticket = sheet.getByTestId('ticket-coalport.mill-gate.canvass');
    await expect(ticket.getByTestId('ticket-once')).toHaveText('Once');
    await expect(ticket.getByTestId('ticket-three')).toContainText('×3');
    await expect(ticket.getByTestId('ticket-three-cost')).toHaveText('30 Energy');
    await ticket.getByTestId('ticket-once').click();
    const modal = modalOf(page);
    await expect(modal.getByTestId('stamp')).toBeVisible();
    for (const b of await modal.getByTestId('result-buttons').getByRole('button').all()) {
      const text = ((await b.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      // Review 3 (answers §4.1): never a bare number; a cost is always "n Energy".
      if (/\d/.test(text)) expect(text, text).toMatch(/\d+ Energy$/);
    }
    await expect(modal.getByRole('button', { name: 'Once more · 10 Energy' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Three more · 30 Energy' })).toBeVisible();
    // The receipt: a canvass prints four lines.
    await expect(modal.getByTestId('receipt').getByRole('listitem')).toHaveCount(4);
    await modal.getByRole('button', { name: 'Continue' }).click();
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await mapAtRest(page);

    sheet = await openLocation(page, '3. Union Hall');
    await expect(sheet.getByTestId('ticket-verb')).toHaveText('Study');
    await expect(sheet).not.toContainText(/\bTrain\b/);
  });
});

test.describe('the election screens (answers §6)', () => {
  test("who's standing stands on the Town Hall, says who's who and how it works", async ({ page }) => {
    await signUp(page);
    await page.goto('/council/slate');
    const header = page.getByTestId('hall-header');
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute('data-art', /^map\.coalport\.(day|night)$/);
    await expect(page.getByTestId('hall-kicker')).toHaveText('Coalport Council · the Town Hall');
    await expect(header.locator('img')).toHaveJSProperty('complete', true);
    await expect(page.getByTestId('how-decided')).toHaveText(
      "Seven seats. The seven with the most support take them. Support is the town's own vote for a candidate (their reputation here), plus their backers, plus members' votes.",
    );
    // The list shows while names go in (the shared test clock decides the phase); during the vote it
    // is the ballot's, checked in council.spec.ts.
    if ((await page.getByTestId('players-standing').count()) > 0) {
      await expect(page.getByTestId('players-standing')).toHaveText('Players standing');
      await expect(page.getByTestId('local-candidates')).toHaveText('Local candidates');
      await expect(page.getByTestId('local-candidates-line')).toBeVisible();
      await expect(page.getByText(/^Local candidate · /).first()).toBeVisible();
    }
    await page.getByRole('button', { name: 'How elections work' }).click();
    await expect(page.getByTestId('help-note').getByTestId('note-line')).toHaveCount(5);
  });
});
