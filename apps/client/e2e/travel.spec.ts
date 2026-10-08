import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { arrivalContinue, pinsOutOfReach, sheetSettled, signUp, toTheCard, unclearPins } from './helpers';

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

  // 3. The journey on the nation map (review 4, answers §7): its name, the progress, the sentence,
  // the route and your pin on it; no card until its moment. The dev clock past the moment: the
  // card's sheet is open on return, with odds words and no digits.
  await expect(page).toHaveURL(/\/journey$/);
  await expect(page.getByTestId('journey-title')).toHaveText(/^The \d\d:\d\d to Irongate$/);
  await expect(page.getByTestId('journey-sentence')).toContainText("You'll arrive either way");
  await expect(page.getByTestId('map-path')).toHaveCount(1);
  await expect(page.getByTestId('travel-pin-label')).toHaveText(/^To Irongate · in \d+ min$/);
  await expect(page.getByTestId('journey-card')).toHaveCount(0);
  const pinAt = async () => Number(await page.getByTestId('travel-pin').getAttribute('data-map-x'));
  const startX = await pinAt();
  await toTheCard(page);
  // Coalport is west of the capital: the pin has moved east along the line.
  await expect.poll(pinAt).toBeGreaterThan(startX);
  const jcard = page.getByRole('dialog').getByTestId('journey-card');
  await expect(jcard).toContainText('A talkative passenger');
  const lines = await jcard.getByTestId('journey-choice-line').allTextContents();
  expect(lines[0]).toMatch(/^(Good odds|Fair odds|Long shot) · /);
  for (const l of lines) expect(l).not.toMatch(/\d+ ?%/);
  // The header, the progress, the sentence, the card's title and first row above the fold (§12.4).
  await expect(jcard.getByTestId('journey-choice').first()).toBeInViewport();
  await jcard.getByTestId('journey-choice').first().click();
  await expect(jcard.getByTestId('journey-outcome')).toBeVisible();
  await expect(jcard.getByTestId('journey-choice')).toHaveCount(1);
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

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
    // Review 5 (answers §17.2 item 5): the factors in *Details*.
    await expect(result.getByTestId('detail-opinion')).toContainText('Close race +25 %');
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
  // Review 4 (answers §8.3, ADR 0076): the drag stops at Station & Market's outline's bounding box
  // (0–0.605 × 0.37–1), wider than its frame (0.29–0.62 × 0.49–0.74).
  let c = await centreOnPicture(page);
  expect(c.x).toBeGreaterThanOrEqual(0);
  expect(c.x).toBeLessThanOrEqual(0.605 + 0.005);
  expect(c.y).toBeGreaterThanOrEqual(0.37 - 0.005);
  expect(c.y).toBeLessThanOrEqual(1);
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
  const home = page.getByRole('dialog').filter({ has: page.getByTestId('arrival-headline') });
  await expect(home.getByTestId('arrival-headline')).toHaveText('Home');
  // Review 5 #7: a card drawn on this trip (one in three) is put aside first.
  await arrivalContinue(page);
  // Review 4 (answers §21.3): a train into a home city selects the Town Hall's pin (its sheet opens).
  await expect(page).toHaveURL(/\/city\/coalport\?loc=coalport\.town-hall$/);
  await expect(page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Town Hall' }) })).toBeVisible();
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
  // Review 4 (answers §7.3): the map under the plate, with your pin on the line.
  await expect(page.getByTestId('travel-pin-mark')).toBeInViewport();
  // The card is a sheet over the map at its moment (the dev clock moved past it).
  await toTheCard(page);
  await expect(page.getByTestId('journey-card').getByRole('heading')).toBeInViewport();
  await expect(page.getByTestId('journey-choice').first()).toBeInViewport();
});

test('review 4 (answers §7): the journey on the nation map at 1440 × 900 and 390 × 844', async ({ page }) => {
  test.setTimeout(180_000);
  await signUp(page, 'Ines Lorr');
  expect((await page.request.post('/api/test/character', { data: { level: 10, fxp: 500, iron: 600 } })).ok()).toBe(true);
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const at = `${size.width}×${size.height}`;
    await page.setViewportSize(size);
    await page.goto('/nation');
    await page.getByTestId('cities-button').filter({ visible: true }).click();
    const list = page.getByRole('dialog', { name: 'Cities of the republic' });
    // Coalport → Irongate, then back: whichever city the player is in, the other one.
    await list.getByTestId('city-row').filter({ hasText: size.width > 1000 ? 'Irongate' : 'Coalport' }).click();
    await page.getByTestId('city-sheet').getByTestId('city-board').click();
    await expect(page, at).toHaveURL(/\/journey$/);
    // The plate: a 480 px side sheet over the map from 1024 px; on top of the map on a phone.
    const plate = page.getByTestId('journey-plate');
    const pb = (await plate.boundingBox())!;
    const mb = (await page.getByTestId('city-map').boundingBox())!;
    if (size.width > 1000) {
      expect(Math.round(pb.width), at).toBe(480);
      expect(pb.x, at).toBeLessThan(mb.x + 20);
    } else {
      expect(pb.y + pb.height, at).toBeLessThanOrEqual(mb.y + 1);
    }
    // The route traced, the two ends drawn and the other cities muted, your pin on the line.
    await expect(page.getByTestId('map-path'), at).toHaveCount(1);
    await expect(page.locator('[data-testid=hotspot][data-marks=muted]'), at).toHaveCount(3);
    await expect(page.getByTestId('travel-pin-mark'), at).toBeInViewport();
    await expect(page.getByRole('img', { name: /^Your pin: to (Irongate|Coalport), arriving in \d+ min$/ }), at).toHaveCount(1);
    // Nothing says a card is coming; at its moment its sheet opens, and closed, the plate's row
    // opens it again. (The first journey always draws one; the second, one in three.)
    await expect(page.getByTestId('journey-card'), at).toHaveCount(0);
    // Review 5 #7 (answers §7): it stays until a row is tapped (no Close, Escape does nothing); the
    // put-aside row answers it, and then it closes.
    if ((await page.getByTestId('journey').getAttribute('data-card-at')) !== null) {
      await toTheCard(page);
      const sheet = page.getByRole('dialog');
      await expect(sheet.getByRole('button', { name: 'Close' }), at).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(sheet.getByTestId('journey-card'), at).toBeVisible();
      await sheet.getByTestId('journey-set-aside').click();
      await expect(sheet.getByTestId('journey-outcome'), at).toBeVisible();
      await sheet.getByRole('button', { name: 'Close' }).click();
      await expect(page.getByRole('dialog'), at).toHaveCount(0);
    } else expect(size.width, 'the first journey draws a card').toBeLessThan(1000);
    // A drag away shows *Follow your pin*; it brings the map back to rest.
    const map = page.getByTestId('city-map');
    await expect(map, at).toHaveAttribute('data-moving', 'false');
    await page.waitForTimeout(400);
    const rest = await map.getAttribute('data-view');
    if (size.width > 1000) {
      // A zoom step is a move too (at rest the map may have nowhere to drag; with the stills the
      // fitted view may already be the closest zoom).
      const zin = page.getByTestId('map-zoom-in');
      await ((await zin.isEnabled()) ? zin : page.getByTestId('map-zoom-out')).click();
    } else {
      const b = (await map.boundingBox())!;
      await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width * 0.6 + 100, b.y + b.height * 0.5 + 60, { steps: 8 });
      await page.mouse.up();
    }
    await page.getByTestId('follow-pin').click();
    await expect(page.getByTestId('follow-pin'), at).toHaveCount(0);
    await expect(map, at).toHaveAttribute('data-moving', 'false');
    await expect.poll(() => map.getAttribute('data-view'), { message: at }).toBe(rest);
    // Arrive (the hook) and Continue.
    expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
    await page.reload();
    await arrivalContinue(page);
    await expect(page, at).toHaveURL(/\/city\//);
  }
});
