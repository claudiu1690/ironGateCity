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
  // Review 2 #3: phones held sideways.
  { width: 812, height: 375 },
  { width: 667, height: 375 },
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
      // The welcome edition marked read first, so no "paper is in" banner takes the map's height.
      const marked = page.waitForResponse((r) => r.url().includes('paper.markRead'));
      await arrive(page, { faction, answers: ANSWERS.reference });
      await marked;
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
    // Review 2: the map zoomed into pin 1 behind the centred panel.
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'true');
    await expect(page.locator('[data-testid="hotspot"][aria-label="1. Gazette House"]')).toBeInViewport();
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await expect(page).toHaveURL(/\/city\/ashford$/);
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'false');
    expect(await coveredPins(page)).toEqual([]);
    // And a pin tapped at once opens (the lost-tap fix, c732d64, still holds).
    await page.locator('[data-testid="hotspot"][aria-label="2. Assembly Rooms"]').click();
    await expect(page.getByRole('dialog')).toContainText('Assembly Rooms');
  });
});

/**
 * Review 2 follow-up: no black past the art, ever. At every size, at rest and zoomed into each pin
 * of each home city, the map image covers the part of the screen the map owns: the whole map box,
 * less what the open location's bottom sheet (upright phone) or side panel (phone sideways) lies
 * over. Where the first view cannot cover the box with every pin clear (`data-fit="letterbox"`), the
 * blurred copy of the art fills it instead; those sizes are listed in the test's annotations.
 */

type Rect = { left: number; top: number; right: number; bottom: number };

/** The map box, the image layer, the blurred backdrop, and the part the open location leaves. */
async function mapRects(page: Page) {
  return page.evaluate(() => {
    const r = (el: Element | null): Rect | null => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    };
    const box = document.querySelector<HTMLElement>('[data-testid=city-map]')!;
    const owned = r(box)!;
    const panel = document.querySelector<HTMLElement>('[role=dialog][data-layout]');
    if (panel?.dataset.layout === 'sheet')
      owned.bottom = Math.min(owned.bottom, panel.getBoundingClientRect().top);
    if (panel?.dataset.layout === 'side')
      owned.left = Math.max(owned.left, panel.getBoundingClientRect().right);
    const backdrop = document.querySelector('[data-testid=map-backdrop]');
    return {
      fit: box.dataset.fit ?? '',
      box: r(box)!,
      owned,
      layer: r(document.querySelector('[data-testid=map-layer]')),
      backdrop: r(backdrop),
      backdropArt: !!backdrop?.querySelector('img'),
    };
  });
}

const covers = (outer: Rect | null, inner: Rect) =>
  !!outer &&
  outer.left <= inner.left + 1 &&
  outer.top <= inner.top + 1 &&
  outer.right >= inner.right - 1 &&
  outer.bottom >= inner.bottom - 1;

async function settled(page: Page, zoomed: boolean) {
  const map = page.getByTestId('city-map');
  await expect(map).toHaveAttribute('data-zoomed', zoomed ? 'true' : 'false');
  await expect(map).toHaveAttribute('data-moving', 'false');
  await expect(map).toHaveAttribute('data-fit', /^(cover|letterbox)$/);
}

test.describe('no black past the art (review 2 follow-up)', () => {
  test.use({ isMobile: false, hasTouch: false });

  for (const [faction, city] of [
    ['vanguard', 'duskwall'],
    ['collective', 'coalport'],
    ['alliance', 'ashford'],
  ] as const satisfies ReadonlyArray<readonly [FactionKey, string]>) {
    test(`${city}: the art covers the map at rest and zoomed into every pin, at every size`, async ({
      page,
    }) => {
      test.setTimeout(300_000);
      await page.setViewportSize(SIZES[1]!);
      await signUpOnly(page, 'Ilse Marr', 2);
      const marked = page.waitForResponse((r) => r.url().includes('paper.markRead'));
      await arrive(page, { faction, answers: ANSWERS.reference });
      await marked;
      // The zoom lands at once here; the frames between are checked below, with motion on.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/city/${city}`);
      const letterboxed: string[] = [];
      for (const size of SIZES) {
        const at = `${size.width}×${size.height}`;
        await page.setViewportSize(size);
        await page.reload();
        await expect(page.getByTestId('hotspot')).toHaveCount(6);
        await settled(page, false);
        const rest = await mapRects(page);
        if (rest.fit === 'cover') {
          expect(covers(rest.layer, rest.box), `${at} at rest: the art covers the map`).toBe(true);
        } else {
          letterboxed.push(at);
          // The margin is the blurred copy of the art, over the whole box: never plain black.
          expect(covers(rest.backdrop, rest.box), `${at} at rest: the blurred copy fills the map`).toBe(true);
          expect(rest.backdropArt, `${at}: the backdrop shows the art`).toBe(true);
        }
        const labels = await page
          .getByTestId('hotspot')
          .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
        for (const label of labels) {
          const pin = page.locator(`[data-testid="hotspot"][aria-label="${label}"]`);
          await pin.click();
          const sheet = page.getByRole('dialog');
          await expect(sheet).toBeVisible();
          await settled(page, true);
          const z = await mapRects(page);
          expect(covers(z.layer, z.owned), `${at} zoomed into ${label}: the art covers the map`).toBe(true);
          await expect(pin).toBeInViewport();
          await sheet.getByRole('button', { name: /^Close/ }).click();
          await expect(sheet).toBeHidden();
          await settled(page, false);
        }
      }
      test.info().annotations.push({ type: 'letterboxed', description: letterboxed.join(', ') || 'none' });
    });
  }

  // Maps v3: Ashford, whose first view covers a 1440 × 900 desktop. (Coalport's and Duskwall's
  // approved pins span about half and three quarters of the square picture's height, so there the
  // first view is letterboxed onto the blurred copy, checked above.)
  test('with motion on, the art covers the map at every frame of the zoom in and out (1440 × 900)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signUpOnly(page, 'Ilse Marr', 2);
    const marked = page.waitForResponse((r) => r.url().includes('paper.markRead'));
    await arrive(page, { faction: 'alliance', answers: ANSWERS.reference });
    await marked;
    await page.goto('/city/ashford');
    await settled(page, false);
    expect((await mapRects(page)).fit).toBe('cover');
    /** Frames (of the next 45) at which the image layer does not cover the map box. */
    const framesPastTheArt = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const box = document.querySelector('[data-testid=city-map]')!;
            const layer = document.querySelector('[data-testid=map-layer]')!;
            let bad = 0;
            let n = 0;
            const tick = () => {
              const b = box.getBoundingClientRect();
              const l = layer.getBoundingClientRect();
              const ok =
                l.left <= b.left + 1 &&
                l.top <= b.top + 1 &&
                l.right >= b.right - 1 &&
                l.bottom >= b.bottom - 1;
              if (!ok) bad++;
              if (++n < 45) requestAnimationFrame(tick);
              else resolve(bad);
            };
            requestAnimationFrame(tick);
          }),
      );
    // Ashford's pins nearest the view's edges: 6 (Weavers' Row, bottom left) and 3 (University Quad, top).
    for (const label of ["6. Weavers' Row", '3. University Quad']) {
      const watching = framesPastTheArt();
      await page.locator(`[data-testid="hotspot"][aria-label="${label}"]`).click();
      expect(await watching, `frames past the art zooming into ${label}`).toBe(0);
      await settled(page, true);
      const back = framesPastTheArt();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /^Close/ })
        .click();
      expect(await back, `frames past the art zooming out of ${label}`).toBe(0);
      await settled(page, false);
    }
  });
});
