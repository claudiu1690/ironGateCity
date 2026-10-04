import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { pinsOutOfReach, sheetSettled, signUp, unclearPins } from './helpers';

/**
 * Slice 4's first trip (tech design §15.1 `travel.spec.ts`), on a phone: Level 10 by the hook → the
 * nation map covers the screen with Coalport and the capital at rest → the city card → Board → the
 * journey and its card → arrive (the hook) → the arrival with the ground sash → Station & Market,
 * Central Station open → a canvass in a close race → the tram → the user's district lock (3 Oct 2026):
 * the overview has no place pins, a district only its own, the view held inside it → Central
 * Station's trains → home.
 */

const map = (page: Page) => page.getByTestId('city-map');

async function atRest(page: Page) {
  await expect(map(page)).toHaveAttribute('data-moving', 'false');
  await expect(map(page)).toHaveAttribute('data-zoomed', 'false');
}

/** Where the centre of the map is on the picture (fractions), from the art layer's box. */
async function centreOnPicture(page: Page): Promise<{ x: number; y: number; scale: number; min: number }> {
  return page.evaluate(() => {
    const box = document.querySelector('[data-testid=city-map]')!;
    const b = box.getBoundingClientRect();
    const l = document.querySelector('[data-testid=map-layer]')!.getBoundingClientRect();
    const [, , scale] = box.getAttribute('data-view')!.split(',').map(Number);
    const [min] = box.getAttribute('data-zoom-limits')!.split(',').map(Number);
    return {
      x: (b.left + b.width / 2 - l.left) / l.width,
      y: (b.top + b.height / 2 - l.top) / l.height,
      scale: scale!,
      min: min!,
    };
  });
}

/** A long drag across the map, from its middle (it stops at its limits). */
async function dragBy(page: Page, dx: number, dy: number) {
  const b = (await map(page).boundingBox())!;
  const sx = b.x + b.width / 2;
  const sy = b.y + b.height / 2;
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + dx / 2, sy + dy / 2, { steps: 5 });
    await page.mouse.move(sx + dx, sy + dy, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(80);
  }
}

test('the first trip: nation → board → the journey card → arrival → the capital → home', async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page, 'Mara Lenk');
  // Level 10 and Rank 2 (the train is open), with Iron for the tickets.
  const lift = await page.request.post('/api/test/character', { data: { level: 10, fxp: 500, iron: 600 } });
  expect(lift.ok()).toBe(true);

  // 1. Map → Nation: the painted republic covers the screen, your city and the capital clear at rest.
  await page.goto('/city/coalport');
  await page.getByTestId('map-switch-nation').filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/nation$/);
  await expect(map(page)).toHaveAttribute('data-fit', 'cover');
  await atRest(page);
  const unclear = await unclearPins(page);
  expect(unclear).not.toContain('Coalport, you are here');
  expect(unclear).not.toContain('Irongate · 12 min');
  // Slice 5 (design §11.1): rival ground opens at Level 10, so Ashford is a destination, not muted.
  const ashford = page.locator('[data-testid=hotspot][aria-label^="Ashford"]');
  await expect(ashford).toHaveCount(1);
  await expect(ashford).not.toHaveClass(/opacity-60/);
  // The Cities list reaches every city.
  await page.getByTestId('cities-button').click();
  const cities = page.getByRole('dialog', { name: 'Cities of the republic' });
  await expect(cities.getByTestId('city-row')).toHaveCount(5);
  await cities.getByRole('button', { name: 'Close' }).click();

  // 2. The capital's card: Board · 20 Iron · 12 min, one tap.
  await page.locator('[data-testid=hotspot][aria-label="Irongate · 12 min"]').click();
  const card = page.getByTestId('city-sheet');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Capital · 5 districts');
  await expect(card.getByTestId('city-board')).toHaveText('Board · 20 Iron · 12 min');
  await card.getByTestId('city-board').click();

  // 3. The journey: its name, the progress, the sentence, the first card with odds words, no digits.
  await expect(page).toHaveURL(/\/journey$/);
  await expect(page.getByTestId('journey-title')).toHaveText(/^The \d\d:\d\d to Irongate$/);
  await expect(page.getByTestId('journey-sentence')).toContainText('You can close the game');
  const jcard = page.getByTestId('journey-card');
  await expect(jcard).toContainText('A talkative passenger');
  const lines = await jcard.getByTestId('journey-choice-line').allTextContents();
  expect(lines[0]).toMatch(/^(Good odds|Fair odds|Long shot) · /);
  for (const l of lines) expect(l).not.toMatch(/\d+ ?%/);
  // The header, the progress, the sentence, the card's title and first row above the fold (§12.4).
  await expect(jcard.getByTestId('journey-choice').first()).toBeInViewport();
  await jcard.getByTestId('journey-choice').first().click();
  await expect(jcard.getByTestId('journey-outcome')).toBeVisible();
  await expect(jcard.getByTestId('journey-choice')).toHaveCount(1);

  // 4. Arrive now (the hook): the arrival modal, the stamp, the ground sash, then Station & Market.
  const arrive = await page.request.post('/api/test/journey', { data: { arriveNow: true } });
  expect(arrive.ok()).toBe(true);
  await page.reload();
  const modal = page.getByRole('dialog').filter({ has: page.getByTestId('arrival-continue') });
  await expect(modal).toBeVisible();
  await expect(modal.getByTestId('stamp')).toHaveText('Arrived');
  await expect(modal.getByTestId('arrival-headline')).toHaveText("You're in the capital");
  await expect(modal.getByTestId('arrival-ticket')).toHaveText('−20 Iron · ticket');
  await expect(modal.getByTestId('ground-sash')).toBeVisible();
  // Station & Market is a close race at its baseline: Contested.
  await expect(modal.getByTestId('ground-sash')).toHaveAccessibleName('Whose ground this is: Contested');
  await modal.getByTestId('arrival-continue').click();
  await expect(page).toHaveURL(/\/city\/irongate\/irongate\.station-market\?loc=irongate\.central-station$/);

  // 5. Central Station open: its art with the sash, the close race on the political tickets, the trains.
  const sheet = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Central Station' }) });
  await expect(sheet).toBeVisible();
  await sheetSettled(page);
  await expect(sheet.locator('[data-art] [data-testid=ground-sash]')).toBeVisible();
  const talk = sheet.getByTestId('ticket-irongate.central-station.arrivals');
  await expect(talk.getByTestId('ticket-tags')).toContainText('Close race · +25 % Party XP · better odds');
  await expect(sheet.getByTestId('trains-card')).toContainText('Board the train to Coalport · 20 Iron · 12 min');

  // 6. Once on the arrivals hall: the receipt's opinion row in Station & Market with Close race +25 %.
  await talk.getByTestId('ticket-once').click();
  const result = page.getByRole('dialog').filter({ has: page.getByTestId('receipt') });
  await expect(result).toBeVisible();
  await expect(result.getByTestId('ground-sash')).toBeVisible();
  const opinion = result.getByTestId('reward-opinion');
  if ((await opinion.count()) > 0) {
    await expect(opinion.getByTestId('reward-label')).toHaveText('Opinion in Station & Market');
    await expect(opinion.getByTestId('reward-note')).toContainText('Close race +25 %');
  }
  await result.getByRole('button', { name: 'Continue' }).click();
  await expect(result).toBeHidden();
  await sheet.getByRole('button', { name: /^Close/ }).click();
  await atRest(page);

  // 7. The user's district lock: only Station & Market's pins; the view stays inside it.
  const pins = await page.getByTestId('hotspot').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(pins.sort()).toEqual(
    ['13. Market Square', '14. Tram Junction', '15. Central Station', '16. The Grand Hotel', '17. The Bombed Blocks', '18. The Station Buffet'].sort(),
  );
  await expect(page.getByTestId('district-mask')).toHaveCount(1);
  await dragBy(page, 300, 300);
  await dragBy(page, -600, -600);
  // Station & Market's frame (0.29–0.62 × 0.49–0.74) and its 10 % margin.
  let c = await centreOnPicture(page);
  expect(c.x).toBeGreaterThan(0.29 - 0.04);
  expect(c.x).toBeLessThan(0.62 + 0.04);
  expect(c.y).toBeGreaterThan(0.49 - 0.03);
  expect(c.y).toBeLessThan(0.74 + 0.03);
  // No zooming out past the district's own view.
  const b = (await map(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  c = await centreOnPicture(page);
  expect(c.scale).toBeGreaterThanOrEqual(c.min - 1e-3);

  // 8. The tram to Eastside: its pins only, not a close race.
  await page.getByTestId('tram-bar').filter({ visible: true }).getByRole('button', { name: 'Tram: Eastside' }).click();
  await expect(page).toHaveURL(/\/city\/irongate\/irongate\.eastside$/);
  await atRest(page);
  await expect(page.getByTestId('district-name').filter({ visible: true })).toHaveText('Eastside');
  await expect(page.getByTestId('district-state').filter({ visible: true })).not.toHaveText('Close race');
  const east = await page.getByTestId('hotspot').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(east).toHaveLength(6);
  expect(east.every((l) => /^(19|2[0-4])\. /.test(l!))).toBe(true);

  // 9. Back to the overview: the five districts' outlines and names, no place pins.
  await page.getByTestId('district-back').filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/city\/irongate$/);
  await atRest(page);
  await expect(page.getByTestId('district-outline')).toHaveCount(5);
  const names = await page.getByTestId('hotspot').evaluateAll((els) => els.map((e) => e.getAttribute('data-pin')));
  expect(names).toEqual(['name', 'name', 'name', 'name', 'name']);
  // The Districts list goes into a district too.
  await page.getByTestId('places-button').filter({ visible: true }).click();
  await page.getByRole('dialog', { name: 'Districts' }).getByTestId('district-row').filter({ hasText: 'Station & Market' }).click();
  await expect(page).toHaveURL(/\/city\/irongate\/irongate\.station-market$/);
  await atRest(page);

  // 10. Central Station's trains home: board, arrive, Continue → Coalport.
  await page.getByTestId('places-button').filter({ visible: true }).click();
  await page.getByRole('dialog', { name: /^Places in / }).getByRole('button', { name: /^15\. Central Station/ }).click();
  const station = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Central Station' }) });
  await expect(station).toBeVisible();
  // Slice 5: the Trains card also lists the rival homes (open at Level 10); home is Coalport.
  await station.getByTestId('trains-board').filter({ hasText: /to Coalport/ }).click();
  await expect(page).toHaveURL(/\/journey$/);
  await expect(page.getByTestId('journey-title')).toHaveText(/to Coalport$/);
  expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
  await page.reload();
  const home = page.getByRole('dialog').filter({ has: page.getByTestId('arrival-continue') });
  await expect(home.getByTestId('arrival-headline')).toHaveText('Home');
  await home.getByTestId('arrival-continue').click();
  await expect(page).toHaveURL(/\/city\/coalport$/);
});

test('the nation map covers the screen at every size, your city and the capital clear at rest', async ({ page }) => {
  test.setTimeout(120_000);
  await signUp(page, 'Ada Rook');
  expect((await page.request.post('/api/test/character', { data: { level: 10 } })).ok()).toBe(true);
  for (const size of [
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 812, height: 375 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/nation');
    await expect(map(page)).toHaveAttribute('data-fit', 'cover');
    await atRest(page);
    const unclear = await unclearPins(page);
    expect(unclear, `${size.width}×${size.height}`).not.toContain('Coalport, you are here');
    expect(unclear, `${size.width}×${size.height}`).not.toContain('Irongate · 12 min');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test("the capital's maps cover the screen; every district's pins are clear or a drag away (§12.4)", async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page, 'Ida Brook');
  expect(
    (await page.request.post('/api/test/character', { data: { level: 10, cityId: 'irongate' } })).ok(),
  ).toBe(true);
  const districts = [
    'irongate.government-quarter',
    'irongate.old-town',
    'irongate.station-market',
    'irongate.eastside',
    'irongate.garrison-hill',
  ];
  for (const size of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 812, height: 375 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    const at = `${size.width}×${size.height}`;
    await page.goto('/city/irongate');
    await atRest(page);
    await expect(map(page), at).toHaveAttribute('data-fit', 'cover');
    // The overview: five names, no place.
    expect(await page.getByTestId('hotspot').count(), at).toBe(5);
    for (const d of districts) {
      await page.goto(`/city/irongate/${d}`);
      await atRest(page);
      await expect(map(page), `${at} ${d}`).toHaveAttribute('data-fit', 'cover');
      expect(await pinsOutOfReach(page), `${at} ${d}`).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${at} ${d}`).toBeLessThanOrEqual(0);
    }
  }
});

test('the journey: its header, progress, sentence and the card’s first row above the fold on 375 × 667', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 667 });
  await signUp(page, 'Ola Ferm');
  expect((await page.request.post('/api/test/character', { data: { level: 10, iron: 100 } })).ok()).toBe(true);
  await page.goto('/nation');
  await page.getByTestId('cities-button').click();
  await page.getByRole('dialog', { name: 'Cities of the republic' }).getByTestId('city-row').first().click();
  await page.getByTestId('city-sheet').getByTestId('city-board').click();
  await expect(page).toHaveURL(/\/journey$/);
  for (const id of ['journey-title', 'journey-progress', 'journey-sentence']) await expect(page.getByTestId(id)).toBeInViewport();
  await expect(page.getByTestId('journey-card').getByRole('heading')).toBeInViewport();
  await expect(page.getByTestId('journey-choice').first()).toBeInViewport();
});
