import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, signUp } from './helpers';

/**
 * Review 6 (Notion Design Review 3, docs/review/2026-10-15-review-6.md): the three small fixes.
 * 1. The nation map on a short screen held sideways: every city pin and its label can be dragged fully
 *    into view, clear of the map's own controls.
 * 2. Inside a city, *What's here* and the *City | Nation* switch never overlap, with a visible gap.
 * 3. The journey's trail is a dotted line with rounded bends, and the pin rides the same path.
 *
 * `R6_SHOTS=before|after` saves the screenshots under docs/review/review-6/ (the build notes' pictures).
 */
const SHOTS = process.env.R6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `../../docs/review/review-6/${SHOTS}-${name}.png` });
};
const map = (page: Page) => page.getByTestId('city-map');

type Rect = { left: number; top: number; right: number; bottom: number };
type PinState = { full: boolean; clear: boolean; shown: number; pin: Rect; map: Rect };

/** A pin (its mark and label): fully inside the map box and the window, and clear of the map's overlays. */
async function pinState(page: Page, name: string): Promise<PinState> {
  return page.evaluate((name) => {
    const r0 = (r: DOMRect) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    const m = document.querySelector('[data-testid=city-map]')!.getBoundingClientRect();
    const el = [...document.querySelectorAll('[data-testid=hotspot]')].find((e) =>
      (e.getAttribute('aria-label') ?? '').startsWith(name),
    )!;
    const r = el.getBoundingClientRect();
    const box = {
      left: Math.max(m.left, 0),
      top: Math.max(m.top, 0),
      right: Math.min(m.right, window.innerWidth),
      bottom: Math.min(m.bottom, window.innerHeight),
    };
    const full = r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
    const overlays = [...document.querySelectorAll<HTMLElement>('[data-map-overlay]')]
      .map((o) => o.getBoundingClientRect())
      .filter((o) => o.width > 0 && o.height > 0);
    const clear = !overlays.some((o) => r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top);
    const ix = Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left));
    const iy = Math.max(0, Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top));
    return { full, clear, shown: (ix * iy) / (r.width * r.height), pin: r0(r), map: r0(m) };
  }, name);
}

/** A drag of the map by (dx, dy) in strokes from its middle that stay inside it. */
async function drag(page: Page, dx: number, dy: number) {
  const b = (await map(page).boundingBox())!;
  const sx = b.x + b.width / 2;
  const sy = b.y + b.height / 2;
  const mx = b.width / 2 - 12;
  const my = b.height / 2 - 12;
  for (let i = 0; i < 6 && (Math.abs(dx) > 1 || Math.abs(dy) > 1); i++) {
    const ex = Math.max(-mx, Math.min(mx, dx));
    const ey = Math.max(-my, Math.min(my, dy));
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + ex / 2, sy + ey / 2, { steps: 4 });
    await page.mouse.move(sx + ex, sy + ey, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(60);
    dx -= ex;
    dy -= ey;
  }
  await page.waitForTimeout(80);
}

/**
 * Drag so as to bring the pin's middle to the map's middle, then to each point of a 3 × 3 grid over
 * it, until the pin and its label are fully in view and clear. Returns the best state reached.
 */
async function bringIntoView(page: Page, name: string): Promise<PinState> {
  let best = await pinState(page, name);
  if (best.full && best.clear) return best;
  const targets: Array<[number, number]> = [[0.5, 0.5]];
  for (const fy of [0.2, 0.5, 0.8]) for (const fx of [0.2, 0.5, 0.8]) targets.push([fx, fy]);
  for (const [fx, fy] of targets) {
    const s = await pinState(page, name);
    const m = s.map;
    const cx = (s.pin.left + s.pin.right) / 2;
    const cy = (s.pin.top + s.pin.bottom) / 2;
    await drag(page, m.left + (m.right - m.left) * fx - cx, m.top + (m.bottom - m.top) * fy - cy);
    const now = await pinState(page, name);
    if (process.env.R6_DEBUG)
      console.log(`[dbg] ${name} target ${fx},${fy} view=${await map(page).getAttribute('data-view')} limits=${await map(page).getAttribute('data-zoom-limits')} pin=${JSON.stringify(now.pin)} map=${JSON.stringify(now.map)}`);
    if (now.shown > best.shown || (now.full && now.clear)) best = now;
    if (now.full && now.clear) return now;
  }
  return best;
}

const CITIES = ['Irongate', 'Ashford', 'Duskwall', 'Coalport', 'Clearwater'];

test.describe('review 6 #1: the nation map on a short screen held sideways', () => {
  for (const vp of [
    { width: 667, height: 375 },
    { width: 568, height: 320 },
    { width: 844, height: 390 },
    { width: 932, height: 430 },
    // Upright: unchanged, and every city still a drag away.
    { width: 375, height: 667 },
    { width: 390, height: 844 },
  ]) {
    test(`every city pin and its label can be brought fully into view at ${vp.width} × ${vp.height}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(vp);
      await signUp(page, 'Rhea Lind');
      expect((await page.request.post('/api/test/character', { data: { level: 10 } })).ok()).toBe(true);
      await page.goto('/nation');
      await expect(map(page)).toHaveAttribute('data-fit', 'cover');
      await mapAtRest(page);
      await page.waitForTimeout(400);
      const at = `${vp.width}×${vp.height}`;
      if (vp.width === 667) await shot(page, 'nation-667x375-at-rest');
      const misses: string[] = [];
      for (const name of CITIES) {
        const s = await bringIntoView(page, name);
        console.log(`[r6] ${at} ${name}: full=${s.full} clear=${s.clear} shown=${s.shown.toFixed(2)}`);
        if (vp.width === 667 && (name === 'Ashford' || name === 'Clearwater')) await shot(page, `nation-667x375-${name.toLowerCase()}`);
        if (!(s.full && s.clear)) misses.push(name);
      }
      expect(misses, at).toEqual([]);
    });
  }
});

/** The *What's here* button and the *City | Nation* switch, as shown at this size. */
async function buttonsGap(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element | undefined | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    };
    const places = vis([...document.querySelectorAll('[data-testid=places-button]')].find((e) => vis(e)));
    const sw = vis([...document.querySelectorAll('[data-testid=map-switch]')].find((e) => vis(e)));
    if (!places || !sw) return null;
    const gx = Math.max(sw.left - places.right, places.left - sw.right);
    const gy = Math.max(sw.top - places.bottom, places.top - sw.bottom);
    return {
      gap: Math.max(gx, gy),
      heights: [places.height, sw.height],
      inWindow: [places, sw].every((r) => r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight),
    };
  });
}

test("review 6 #2: inside a city, What's here and the City | Nation switch never overlap", async ({ page }) => {
  test.setTimeout(180_000);
  await signUp(page, 'Ivo Brandt');
  expect((await page.request.post('/api/test/character', { data: { level: 10 } })).ok()).toBe(true);
  const sizes = [
    { width: 667, height: 375 },
    { width: 568, height: 320 },
    { width: 844, height: 390 },
    { width: 932, height: 430 },
    { width: 812, height: 375 },
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 640, height: 900 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];
  for (const vp of sizes) {
    await page.setViewportSize(vp);
    await page.goto('/city/coalport');
    await mapAtRest(page);
    const at = `${vp.width}×${vp.height}`;
    if (vp.width === 667) await shot(page, 'city-667x375-buttons');
    const g = await buttonsGap(page);
    console.log(`[r6] ${at} buttons: ${JSON.stringify(g)}`);
    expect(g, at).not.toBeNull();
    expect(g!.gap, at).toBeGreaterThanOrEqual(6);
    expect(Math.min(...g!.heights), at).toBeGreaterThanOrEqual(44);
    expect(g!.inWindow, at).toBe(true);
  }
});

test('review 6 #3: the journey trail is dotted with rounded bends, and the pin rides it', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 667, height: 375 });
  await signUp(page, 'Oskar Veil');
  expect((await page.request.post('/api/test/character', { data: { level: 10, fxp: 500, iron: 600 } })).ok()).toBe(true);
  // Coalport → Ashford runs through the capital: two legs, the most bends.
  await page.goto('/nation?city=ashford');
  const board = page.getByTestId('city-sheet').getByTestId('city-board');
  await expect(board).toBeVisible();
  await board.click();
  await expect(page).toHaveURL(/\/journey$/);
  await expect(page.getByTestId('map-path')).toHaveCount(2);
  await expect(page.getByTestId('travel-pin-mark')).toBeVisible();
  // Some way along, so the pin is between the ends.
  const res = await page.request.post('/api/test/clock', { data: { advanceMs: 7 * 60_000 } });
  expect(res.ok()).toBe(true);
  await page.reload();
  await expect(page.getByTestId('travel-pin-mark')).toBeVisible();
  // The card may open at its moment: put it out of the way for the picture.
  const sheet = page.getByRole('dialog').filter({ has: page.getByTestId('journey-card') });
  if (await sheet.isVisible().catch(() => false)) await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await shot(page, 'journey-667x375-trail');

  const trail = await page.evaluate(() => {
    const paths = [...document.querySelectorAll<SVGPathElement>('[data-testid=map-path]')];
    const pin = document.querySelector<HTMLElement>('[data-testid=travel-pin]')!;
    const px = Number(pin.dataset.mapX);
    const py = Number(pin.dataset.mapY);
    let nearest = Infinity;
    let sharpest = 0;
    for (const p of paths) {
      const len = p.getTotalLength();
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 1500; i++) {
        const q = p.getPointAtLength((len * i) / 1500);
        pts.push([q.x, q.y]);
        nearest = Math.min(nearest, Math.hypot(q.x - px, q.y - py));
      }
      // The sharpest turn between the path's own vertices (its `d`).
      const v = (p.getAttribute('d') ?? '')
        .replace(/^M/, '')
        .split('L')
        .map((s) => s.trim().split(/\s+/).map(Number) as [number, number]);
      for (let i = 1; i < v.length - 1; i++) {
        const a = Math.atan2(v[i]![1] - v[i - 1]![1], v[i]![0] - v[i - 1]![0]);
        const b = Math.atan2(v[i + 1]![1] - v[i]![1], v[i + 1]![0] - v[i]![0]);
        let d = Math.abs(b - a);
        if (d > Math.PI) d = 2 * Math.PI - d;
        sharpest = Math.max(sharpest, (d * 180) / Math.PI);
      }
    }
    const s = getComputedStyle(paths[0]!);
    return {
      nearest,
      sharpest,
      dash: s.strokeDasharray,
      cap: s.strokeLinecap,
      vertices: (paths[0]!.getAttribute('d') ?? '').split('L').length,
    };
  });
  console.log(`[r6] trail: ${JSON.stringify(trail)}`);
  // Round dots: a dash of (about) nothing and a gap, drawn with round caps.
  expect(trail.cap).toBe('round');
  expect(trail.dash).not.toBe('none');
  const dash = trail.dash.split(/[ ,]+/).map((x) => parseFloat(x));
  expect(dash[0]!).toBeLessThan(dash[1]!);
  // Rounded bends: no corner sharper than 20° between the drawn vertices.
  expect(trail.sharpest).toBeLessThan(20);
  // The pin on the line (fractions of the picture; 0.002 is about 18 px of the 9,216 px art).
  expect(trail.nearest).toBeLessThan(0.002);
});
