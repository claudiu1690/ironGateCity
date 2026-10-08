import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { mapAtRest, openLocation, signUp, toTheCard } from './helpers';

/**
 * Design Review 2 (docs/review/2026-10-08-review-5.md; answers in docs/design/review-5-answers.md),
 * the quick fixes: #6 Energy · Health · Heat · XP · Party XP in the top bar (a phone, a phone held
 * sideways, 1440 px); #4 one thin scroll bar, an ordinary result that never scrolls, and the level-up
 * as a line and *Place it*; #7 the journey card stays until a row is tapped (Escape and a tap on the
 * map under it do nothing, the tab bar still works and the Map tab comes back to it, the put-aside
 * row, and the arrival's Continue only after a row). REVIEW5_SHOTS=<dir> saves the screenshots.
 */

const SHOTS = process.env.REVIEW5_SHOTS;
// Headless Chromium hides scroll bars by default; #4 is about how they look.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });
const shot = async (target: Page | Locator, name: string) => {
  if (!SHOTS) return;
  // A part of the page (the top bar) without a focus ring left by an earlier tap.
  if ('page' in target) await target.page().evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await target.screenshot({ path: `${SHOTS}/${name}.png` });
};
const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const street = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/street', { data }).then((r) => expect(r.ok()).toBe(true));
const top = async (l: Locator) => (await l.filter({ visible: true }).first().boundingBox())!;
/** How far a box's content runs past it (a scroll bar shows above 0). */
const overflow = (l: Locator) => l.evaluate((el) => el.scrollHeight - el.clientHeight);
const settled = (page: Page) =>
  page.waitForFunction(() =>
    [...document.querySelectorAll('[role=dialog], [data-testid=card-dim]')].every((d) =>
      d.getAnimations().every((a) => a.playState !== 'running'),
    ),
  );

test('#6 the top bar: Energy, Health, Heat, XP, Party XP on a phone, held sideways and at 1440', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, 'Vera Holt');
  await lift(page, { heat: 30, health: 90 });
  await page.goto('/me');
  const hud = page.getByRole('region', { name: 'Character' });
  const health = page.getByTestId('hud-health');
  const heat = page.getByTestId('hud-heat-line');
  await expect(health).toBeVisible();
  await expect(heat).toBeVisible();

  // A phone: one column, from the top.
  const ys = [];
  for (const id of ['hud-energy', 'hud-health', 'hud-heat-line', 'hud-xp', 'hud-fxp'])
    ys.push((await top(page.getByTestId(id))).y);
  expect(ys, 'the lines in order down the bar').toEqual([...ys].sort((a, b) => a - b));
  expect(new Set(ys).size).toBe(5);
  await shot(hud, 'hud-phone-390');

  // Each label still opens its own note.
  for (const [id, title] of [
    ['hud-health', /^HEALTH/i],
    ['hud-heat-line', /^HEAT/i],
    ['hud-xp', /^EXPERIENCE/i],
  ] as const) {
    const b = await top(page.getByTestId(id));
    await page.mouse.click(b.x + 10, b.y + b.height / 2);
    await expect(page.getByTestId('help-note').first()).toContainText(title);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-note')).toHaveCount(0);
  }

  // Held sideways (unchanged): the gauges keep one row; Health and Heat ride in the name line.
  await page.setViewportSize({ width: 844, height: 390 });
  const vitals = page.getByTestId('hud-vitals-short');
  await expect(vitals).toBeVisible();
  await expect(health).toBeHidden();
  const side = await top(vitals);
  expect(side.y + side.height, 'the vitals line inside the bar').toBeLessThanOrEqual((await top(hud)).height + 1);
  await shot(hud, 'hud-sideways-844');

  // 1440: the first column Energy over Health over Heat; XP and Party XP the first row's others.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(health).toBeVisible();
  const e = await top(page.locator('[data-note="energy"]'));
  const h = await top(health);
  const t = await top(heat);
  const x = await top(page.locator('[data-note="xp"]'));
  const f = await top(page.locator('[data-note="fxp"]'));
  expect(Math.abs(h.x - e.x), 'Health in the Energy column').toBeLessThanOrEqual(1);
  expect(Math.abs(t.x - e.x), 'Heat in the Energy column').toBeLessThanOrEqual(1);
  expect(h.y, 'Health below Energy').toBeGreaterThan(e.y + e.height - 1);
  expect(t.y, 'Heat below Health').toBeGreaterThan(h.y + h.height - 1);
  expect(Math.abs(x.y - e.y), 'XP on the first row').toBeLessThanOrEqual(2);
  expect(Math.abs(f.y - e.y), 'Party XP on the first row').toBeLessThanOrEqual(2);
  expect(h.x + h.width, 'Health clear of the next column').toBeLessThanOrEqual(x.x);
  await shot(hud, 'hud-desktop-1440');
});

test('#4 results: only the middle scrolls; the level-up is a line and Place it; one thin bar', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 740 });
  await signUp(page, 'Ilse Brand');
  await lift(page, { level: 6, iron: 900, pc: 60 });
  await page.goto('/city/coalport');
  await mapAtRest(page);
  // By the attribute, not the role: a resize past 640 px remounts the place's sheet as a modal panel,
  // which hides the result from the accessibility tree. (No tap follows a resize with a modal open.)
  const result = page.locator('[role=dialog]').filter({ has: page.getByTestId('result-buttons') });
  const middle = result.getByTestId('result-middle');
  /** One tier-1 action at the Mill Gate; how far its result's middle runs past its box. */
  const ordinary = async (size: string) => {
    const sheet = await openLocation(page, '1. Mill Gate');
    await sheet.locator('[data-testid^="ticket-"]').first().getByRole('button', { name: /, once, / }).click();
    await expect(result.getByTestId('stamp')).toBeVisible();
    await settled(page);
    // Only the middle scrolls: the modal itself never does (the art and the buttons stay put). How far
    // the middle runs past its box is reported, not yet asserted: the answers' rule 1 (an ordinary
    // result fits 390 × 740 and any desktop) needs the result's parts compacted, which the answers
    // don't specify (an open design question).
    expect(await overflow(result), 'the modal itself never scrolls').toBeLessThanOrEqual(0);
    console.log(`an ordinary result at ${size} overflows by ${await overflow(middle)}px`);
    await shot(page, `result-ordinary-${size.replace(' × ', 'x')}`);
    await result.getByRole('button', { name: 'Continue' }).click();
    await expect(result).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: /^Close/ }).first().click();
    await mapAtRest(page);
  };
  await ordinary('390 × 740');
  await page.setViewportSize({ width: 1440, height: 900 });
  await mapAtRest(page);
  await ordinary('1440 × 900');

  // A mission with a level-up (one success from Level 7, 3,500 XP), at 1440 × 900.
  await lift(page, { xp: 3_499 });
  await page.reload();
  await mapAtRest(page);
  await street(page, { runIn: 'never', checkRoll: 1 });
  await openLocation(page, '7. The Shipyard');
  const launch = page.locator('[data-mission="coalport.shipyard.launch"]');
  await launch.scrollIntoViewIfNeeded();
  await launch.getByTestId('mission-choose').click();
  await page.getByTestId('briefing').getByTestId('way-row').first().click();
  await page.getByTestId('briefing-confirm').click();
  const level = result.getByTestId('effect-level');
  await expect(level).toHaveText(/^Level 7 · one point to placePlace it$/);
  await settled(page);
  // Not inline: the stat buttons are behind *Place it*.
  await expect(result.getByRole('button', { name: /^STR \d+ → \d+$/ })).toHaveCount(0);
  expect(await overflow(result), 'the modal itself never scrolls').toBeLessThanOrEqual(0);
  console.log(`the mission level-up at 1440 × 900 overflows by ${await overflow(middle)}px`);
  await shot(page, 'levelup-1440x900');
  // *Place it*: the picker as a sheet over the modal; placing closes it and the line names the stat.
  await level.getByRole('button', { name: 'Place it' }).click();
  const picker = page.getByRole('dialog', { name: 'Level 7 · one point to place' });
  await expect(picker).toBeVisible();
  await settled(page);
  await shot(page, 'levelup-place-it-sheet-1440');
  await picker.getByRole('button', { name: /^STR \d+ → \d+$/ }).click();
  await expect(picker).toHaveCount(0);
  await expect(level).toHaveText(/^Level 7 · Strength \d+ → \d+$/);

  // On a phone (measured only, as above).
  for (const [w, h] of [
    [390, 844],
    [390, 740],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await settled(page);
    expect(await overflow(result), 'the modal itself never scrolls').toBeLessThanOrEqual(0);
    console.log(`the mission level-up at ${w} × ${h} overflows by ${await overflow(middle)}px`);
    await shot(page, `levelup-${w}x${h}`);
  }

  // The scroll bar: a short window makes the middle scroll; its bar is the thin (6 px) one.
  await page.setViewportSize({ width: 1024, height: 520 });
  await settled(page);
  expect(await overflow(middle)).toBeGreaterThan(0);
  expect(await middle.evaluate((el) => (el as HTMLElement).offsetWidth - el.clientWidth), 'a 6 px bar').toBe(6);
  await middle.evaluate((el) => {
    el.scrollTop = 120;
  });
  await shot(page, 'scrollbar-result-1024x520');
  const box = (await middle.boundingBox())!;
  if (SHOTS)
    await page.screenshot({
      path: `${SHOTS}/scrollbar-closeup.png`,
      clip: { x: box.x + box.width - 90, y: box.y, width: 90, height: Math.min(box.height, 300) },
    });
});

test('#7 the journey card stays until a row is tapped', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, 'Otto Rainer');
  await lift(page, { level: 10, iron: 100 });
  await page.goto('/nation');
  await page.getByTestId('cities-button').filter({ visible: true }).click();
  await page.getByRole('dialog', { name: 'Cities of the republic' }).getByTestId('city-row').first().click();
  await page.getByTestId('city-sheet').getByTestId('city-board').click();
  await expect(page).toHaveURL(/\/journey$/);
  await toTheCard(page);
  const sheet = page.getByRole('dialog').filter({ has: page.getByTestId('journey-card') });
  await expect(sheet).toBeVisible();
  // No Close; Escape, and taps on the map under the dim and on the plate, leave it open on /journey.
  await expect(sheet.getByRole('button', { name: 'Close' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const map = (await page.getByTestId('city-map').boundingBox())!;
  await page.mouse.click(map.x + 20, map.y + 20);
  await page.mouse.click(map.x + map.width / 2, map.y + 10);
  const plate = (await page.getByTestId('journey-plate').boundingBox())!;
  await page.mouse.click(plate.x + plate.width / 2, plate.y + 20);
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/\/journey$/);
  await expect(sheet).toBeVisible();
  // The put-aside row is the card's foot.
  await expect(sheet.getByTestId('journey-set-aside')).toHaveText(/^Sleep through it\s*Nothing happens\.$/);
  await expect(sheet).not.toContainText('Ignore it');
  await settled(page);
  await shot(page, 'journey-card-after-outside-clicks-390');

  // The tab bar still works; the Map tab comes back to the card.
  await page.getByRole('link', { name: /^Paper/ }).first().click();
  await expect(page).toHaveURL(/\/paper$/);
  await page.getByRole('link', { name: /^Map/ }).first().click();
  await expect(page).toHaveURL(/\/journey$/);
  await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible();
  // Left by the browser (a typed address) and back: open again.
  await page.goto('/me');
  await page.goto('/journey');
  await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible();

  // 1440: a centred card over the dim; the same.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.mouse.click(1200, 450);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible();
  await settled(page);
  await shot(page, 'journey-card-after-outside-clicks-1440');

  // *Sleep through it*: the card's ignore text, no stamp; now it closes.
  const card = page.getByRole('dialog').getByTestId('journey-card');
  await card.getByTestId('journey-set-aside').click();
  await expect(card.getByTestId('journey-outcome')).toBeVisible();
  await expect(card.getByTestId('journey-outcome').getByTestId('stamp')).toHaveCount(0);
  await expect(card.getByTestId('journey-choice')).toHaveCount(0);
  await shot(page, 'journey-card-slept-through-1440');
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('#7 the arrival: Continue only after a row of an unanswered card', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, 'Otto Lamm');
  await lift(page, { level: 10, iron: 100 });
  await page.goto('/nation');
  await page.getByTestId('cities-button').filter({ visible: true }).click();
  await page.getByRole('dialog', { name: 'Cities of the republic' }).getByTestId('city-row').first().click();
  await page.getByTestId('city-sheet').getByTestId('city-board').click();
  await expect(page).toHaveURL(/\/journey$/);
  // The app "closed" through the card's moment: the card waits in the arrival modal.
  expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
  await page.reload();
  const arrival = page.getByRole('dialog').filter({ has: page.getByTestId('arrival-headline') });
  await expect(arrival.getByTestId('journey-card')).toBeVisible();
  await expect(arrival.getByTestId('arrival-continue')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  await expect(arrival).toBeVisible();
  await expect(page).toHaveURL(/\/journey$/);
  await shot(page, 'arrival-waiting-for-a-row-390');
  await arrival.getByTestId('journey-choice').first().click();
  await expect(arrival.getByTestId('journey-outcome')).toBeVisible();
  await arrival.getByTestId('arrival-continue').click();
  await expect(page).toHaveURL(/\/city\//);
});
