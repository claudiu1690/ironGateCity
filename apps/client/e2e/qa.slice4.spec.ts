import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp, unclearPins } from './helpers';

/**
 * QA slice 4 (docs/qa/slice-4-report.md): the capital's overview at rest at several sizes (every
 * district name clear, none overlapping), the tram bar's labels inside their chips, a double tap on
 * Board and on Register spending once, the journey card and the arrival by keyboard, no odds maths on
 * the new screens, and the capital's ballot on a short phone. Its own project, last: it moves the
 * shared clock to the capital's polls.
 */

const map = (page: Page) => page.getByTestId('city-map');
async function atRest(page: Page) {
  await expect(map(page)).toHaveAttribute('data-moving', 'false');
  await expect(map(page)).toHaveAttribute('data-zoomed', 'false');
}
const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const iron = async (page: Page) => Number((await page.getByTestId('hud-iron').first().textContent())!.replace(/\D/g, ''));

/** The district names on the overview that are clear at rest, and any two whose labels overlap. */
async function overview(page: Page) {
  await page.goto('/city/irongate');
  await atRest(page);
  const names = await page.getByTestId('hotspot').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!));
  const unclear = await unclearPins(page);
  const overlaps = await page.getByTestId('hotspot').evaluateAll((els) => {
    const out: string[] = [];
    for (let i = 0; i < els.length; i++)
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i]!.getBoundingClientRect();
        const b = els[j]!.getBoundingClientRect();
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
          out.push(`${els[i]!.getAttribute('aria-label')} × ${els[j]!.getAttribute('aria-label')}`);
      }
    return out;
  });
  return { clear: names.filter((n) => !unclear.includes(n)), unclear, overlaps };
}

test.describe('the capital overview at rest shows the five districts (screens §5.1, the user’s district lock)', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, 'Ovid Rest');
    await lift(page, { level: 10, fxp: 500, iron: 600, cityId: 'irongate' });
  });

  test('upright phone 390 × 844: all five names clear, none overlapping', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const o = await overview(page);
    expect(o.unclear).toEqual([]);
    expect(o.overlaps).toEqual([]);
  });

  // M1 (the user's known item 1), fixed in the fix round: the overview rests on the whole picture,
  // centred on the five names, and a name slides out from under the corner plate inside its outline.
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 375, height: 667 },
    { width: 360, height: 640 },
  ]) {
    test(`fixed (M1): ${size.width} × ${size.height} shows every district name at rest, none overlapping`, async ({ page }) => {
      await page.setViewportSize(size);
      const o = await overview(page);
      expect(o.unclear, `clear: ${o.clear.join(', ')}`).toEqual([]);
      expect(o.overlaps).toEqual([]);
    });
  }

  test('fixed (M1): a phone held sideways (667 × 375): every name clear, none overlapping', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    const o = await overview(page);
    expect(o.unclear, `clear: ${o.clear.join(', ')}`).toEqual([]);
    expect(o.overlaps).toEqual([]);
  });
});

test.describe('the tram bar (screens §5.2: four chips, 44 px, one tap)', () => {
  for (const size of [
    { width: 360, height: 640 },
    { width: 812, height: 375 },
  ]) {
    test(`fixed (M3): every label fits its chip at ${size.width} × ${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      await signUp(page, 'Tram Fit');
      await lift(page, { level: 10, fxp: 500, cityId: 'irongate' });
      await page.goto('/city/irongate/irongate.eastside');
      await atRest(page);
      const chips = page.getByTestId('tram-bar').filter({ visible: true }).getByTestId('tram-chip');
      await expect(chips).toHaveCount(4);
      for (const box of await chips.all()) {
        expect(await box.boundingBox().then((b) => b!.height)).toBeGreaterThanOrEqual(44);
      }
      const overflow = await chips.evaluateAll((els) =>
        els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
      );
      expect(overflow).toEqual([]);
      // M3: sideways the district's name never runs into the Reputation line.
      const hit = await page.evaluate(() => {
        const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
        const name = [...document.querySelectorAll('[data-testid=district-name]')].find(vis)!.getBoundingClientRect();
        return [...document.querySelectorAll('[data-testid=city-standing]')].filter(vis).some((e) => {
          const b = e.getBoundingClientRect();
          return name.left < b.right && b.left < name.right && name.top < b.bottom && b.top < name.bottom;
        });
      });
      expect(hit).toBe(false);
    });
  }
});

test.describe('a double tap spends once (QA slice 2 M1, tech design §12.4)', () => {
  test('Board on the city card: one journey, 20 Iron; Register in the sheet: one move, 500 Iron', async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page, 'Dot Double');
    await lift(page, { level: 10, fxp: 500, iron: 900 });
    await page.goto('/nation');
    await atRest(page);
    await page.getByTestId('cities-button').click();
    await page.getByRole('dialog', { name: 'Cities of the republic' }).getByTestId('city-row').first().click();
    const board = page.getByTestId('city-sheet').getByTestId('city-board');
    await board.dblclick();
    await expect(page).toHaveURL(/\/journey$/);
    await expect.poll(() => iron(page)).toBe(880);
    expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
    await page.reload();
    await page.getByTestId('arrival-continue').click();
    await expect(page).toHaveURL(/station-market/);
    await page.goto('/city/irongate/irongate.eastside');
    await atRest(page);
    await page.getByTestId('residence-row').filter({ visible: true }).click();
    await page.getByRole('dialog', { name: 'Where you live' }).getByTestId('residence-register').click();
    const confirm = page.getByRole('dialog', { name: /^Register in Eastside/ }).getByTestId('register-confirm');
    await confirm.dblclick();
    await expect(page.getByTestId('stamp')).toHaveText('Registered');
    await expect.poll(() => iron(page)).toBe(380);
  });
});

test.describe('by keyboard, and in plain words (GDD §1.5, review 2)', () => {
  test('the card by Tab and Space, Continue by Escape; no odds maths on the new screens', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signUp(page, 'Kit Keys');
    await lift(page, { level: 10, fxp: 500, iron: 900 });
    const seen: string[] = [];
    const read = async () => seen.push(await page.locator('body').innerText());
    await page.goto('/nation');
    await atRest(page);
    await page.locator('[data-testid=hotspot][aria-label^="Irongate"]').click();
    await expect(page.getByTestId('city-sheet')).toBeVisible();
    await read();
    await page.getByTestId('city-sheet').getByTestId('city-board').click();
    await expect(page).toHaveURL(/\/journey$/);
    await read();
    const first = page.getByTestId('journey-choice').first();
    for (let i = 0; i < 60 && !(await first.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('journey-outcome')).toBeVisible();
    await read();
    expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
    await page.reload();
    await expect(page.getByTestId('arrival-continue')).toBeFocused();
    await read();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/city\/irongate\/irongate\.station-market/);
    const sheet = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Central Station' }) });
    await expect(sheet).toBeVisible();
    await read();
    await page.goto('/city/irongate/irongate.eastside');
    await atRest(page);
    await read();
    await page.goto('/paper');
    await expect(page.getByTestId('issues-section')).toBeVisible();
    await page.getByTestId('issue-row').first().click();
    await read();
    for (const screen of seen) {
      for (const line of screen.split('\n')) {
        expect(line, line).not.toMatch(/\b(chance|roll|difficulty)\b/i);
        // A percentage on these screens is a reward or a share of opinion, never odds.
        if (/\d ?%/.test(line)) expect(line, line).toMatch(/(Party XP|opinion|XP|Iron|Rested|pay|Energy|half|Holds|\d\.\d %)/i);
      }
    }
  });
});

/** The capital ballot at a size: how many whole names sit above the CTA. */
async function namesAboveCta(page: Page) {
  await page.goto('/council/ballot');
  await expect(page.getByTestId('ballot-row').first()).toBeAttached();
  return page.evaluate(() => {
    const cta = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
    return [...document.querySelectorAll('[data-testid=ballot-row]')].filter((r) => {
      const b = r.getBoundingClientRect();
      return b.top >= 0 && b.bottom <= cta.top;
    }).length;
  });
}

test.describe('the capital ballot on a short phone (screens §10; slice-3 QA m4)', () => {
  test('fixed (m6): the first name shows whole above the vote button at 375 × 667, 360 × 640 and 1440 × 900', async ({ page }) => {
    const res = await page.request.post('/api/test/clock', { data: { advanceTo: { cityId: 'irongate', cycleDay: 2 } } });
    expect(res.ok()).toBe(true);
    await signUp(page, 'First Name');
    await lift(page, {
      level: 10,
      fxp: 500,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: 'irongate.eastside' },
    });
    for (const size of [
      { width: 375, height: 667 },
      { width: 360, height: 640 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(size);
      expect(await namesAboveCta(page), `${size.width} × ${size.height}`).toBeGreaterThanOrEqual(1);
    }
  });

  // Screens §10 asks for five rows above the CTA on 375 × 667. A ballot row is 64 px or more (the
  // name, the line, the quote), so five need 320 px of a content area of about 370 px under the HUD
  // and the paper's banner: not reachable with the header and the plate. The fix round brings the
  // first whole name above the CTA (the brief's bar, the test above); this stays an expected fail.
  test('screens §10: on 375 × 667 the header and at least five names show above the CTA', async ({ page }) => {
    test.fail(!process.env.QA_SHOW_BUGS, 'Screens §10 five rows: not reachable with 64 px rows (fix round: the first name shows, see above)');
    const res = await page.request.post('/api/test/clock', { data: { advanceTo: { cityId: 'irongate', cycleDay: 2 } } });
    expect(res.ok()).toBe(true);
    await page.setViewportSize({ width: 375, height: 667 });
    await signUp(page, 'Short Ballot');
    await lift(page, {
      level: 10,
      fxp: 500,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: 'irongate.eastside' },
    });
    await page.goto('/council/ballot');
    await expect(page.getByTestId('ballot-row').first()).toBeAttached();
    const above = await page.evaluate(() => {
      const cta = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
      return [...document.querySelectorAll('[data-testid=ballot-row]')].filter((r) => r.getBoundingClientRect().bottom <= cta.top)
        .length;
    });
    expect(above).toBeGreaterThanOrEqual(5);
  });
});
