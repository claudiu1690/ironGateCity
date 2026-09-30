import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { signUp, toTheCity } from './helpers';

/**
 * The dev time-skip panel (README "Reviewing with the dev panel"). It moves the shared test clock,
 * so it runs in its own project, last. The server has its test hooks on here (memory mode), so the
 * panel shows; its absence without the hooks is the server test `devPanel.test.ts`.
 */

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const boxOf = async (l: Locator): Promise<Box> => {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return b!;
};

const panelOf = (page: Page) => page.getByTestId('dev-panel');
async function openPanel(page: Page): Promise<Locator> {
  const panel = panelOf(page);
  if (!(await panel.isVisible())) await page.getByTestId('dev-toggle').click();
  await expect(panel).toBeVisible();
  return panel;
}
async function tap(page: Page, name: string, line: RegExp): Promise<void> {
  const panel = await openPanel(page);
  await panel.getByRole('button', { name, exact: true }).click();
  await expect(panel.getByTestId('dev-line')).toHaveText(line);
}
/** Skip phases until the home city is in the given phase (at most a cycle). */
async function skipTo(page: Page, phase: RegExp): Promise<void> {
  const panel = await openPanel(page);
  for (let i = 0; i < 3 && !phase.test((await panel.getByTestId('dev-phase').textContent()) ?? ''); i++) {
    await panel.getByRole('button', { name: 'Skip to next phase' }).click();
    await expect(panel.getByTestId('dev-line')).toHaveText(/^Now .* UTC/);
  }
  await expect(panel.getByTestId('dev-phase')).toHaveText(phase);
}

test('the dev panel: shown with the hooks, clear of the pins and the tab bar, and every button works', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signUp(page, 'Ida Brenner');
  await toTheCity(page);

  // 1. A small floating button, a 44 px target, clear of the tab bar and of every pin.
  const toggle = page.getByTestId('dev-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAccessibleName(/^Dev/);
  const t = await boxOf(toggle);
  expect(t.width).toBeGreaterThanOrEqual(44);
  expect(t.height).toBeGreaterThanOrEqual(44);
  expect(overlaps(t, await boxOf(page.getByRole('navigation', { name: 'Main' })))).toBe(false);
  const pins = page.getByTestId('hotspot');
  expect(await pins.count()).toBeGreaterThan(0);
  for (const pin of await pins.filter({ visible: true }).all())
    expect(overlaps(t, await boxOf(pin))).toBe(false);

  // 2. The sheet: clearly a dev tool, the shared-clock note, the time, the City Day, the phase.
  const panel = await openPanel(page);
  await expect(panel.getByRole('heading', { name: 'DEV · test clock' })).toBeVisible();
  await expect(panel).toContainText('shared by everyone on this local server');
  await expect(panel.getByTestId('dev-utc')).toHaveText(/^\w+day \d{1,2} \w{3} \d{2}:\d{2} UTC$/);
  await expect(panel.getByTestId('dev-local')).toHaveText(/\d{2}:\d{2}/);
  await expect(panel.getByTestId('dev-city-day')).toHaveText(/^\d+$/);
  await expect(panel.getByTestId('dev-phase')).toHaveText(
    /(Count day|Nominations|Polls open).* · cycle day \d$/,
  );
  await expect(panel.getByTestId('dev-next')).toContainText('UTC');
  await expect(panel.getByTestId('dev-morale')).toHaveText(/^(Fired up|Steady|Unrest) · \d+\.\d %$/);
  await expect(panel.getByTestId('dev-ordinance')).not.toBeEmpty();
  // It leaves the HUD and the tab bar visible, and the page never scrolls sideways.
  expect(overlaps(await boxOf(panel), await boxOf(page.getByRole('navigation', { name: 'Main' })))).toBe(
    false,
  );
  expect(overlaps(await boxOf(panel), await boxOf(page.getByRole('region', { name: 'Character' })))).toBe(
    false,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
  for (const b of await panel.getByRole('button').all()) {
    const bb = await boxOf(b);
    expect(bb.height).toBeGreaterThanOrEqual(44);
  }

  // 3. Boost me: Rank 3 in the HUD, PC at least 30; again: already boosted.
  await tap(page, 'Boost me', /^Boosted: .*Rank 1 → 3.*One of Us in Coalport.* · Energy 100$/);
  await expect(page.getByTestId('hud-rank')).toContainText('Organiser');
  await expect(page.getByTestId('hud-pc')).toHaveText(/^\d+/);
  expect(Number((await page.getByTestId('hud-pc').textContent())?.replace(/\D/g, ''))).toBeGreaterThanOrEqual(
    30,
  );
  await tap(page, 'Boost me', /^Already boosted · Energy 100$/);

  // 4. +1 hour moves the clock an hour.
  const before = await panel.getByTestId('dev-utc').textContent();
  await tap(page, '+1 hour', /^Now \w+day \d{1,2} \w{3} \d{2}:\d{2} UTC/);
  await expect(panel.getByTestId('dev-utc')).not.toHaveText(before ?? '');

  // 5. Skip to nominations: the paper offers to stand (Rank 3, Known, 10 PC).
  await skipTo(page, /^(Count day|Nominations)/);
  await page.getByTestId('dev-panel').getByRole('button', { name: 'Close' }).click();
  await page.goto('/paper');
  await expect(page.getByTestId('polling-day-row')).toContainText('Stand for the council · 10 PC');

  // 6. Skip to the polls: the ballot is open, the line says so, and the paper row follows.
  await openPanel(page);
  await panel.getByRole('button', { name: 'Skip to next phase' }).click();
  await expect(panel.getByTestId('dev-line')).toHaveText(/^Now \w+day .* UTC · polls open in Coalport/);
  await expect(panel.getByTestId('dev-phase')).toHaveText(/^Polls open \(day 1 of 3\)/);
  await expect(page.getByTestId('polling-day-row')).toContainText('Cast your ballot');

  // 7. Next day: 00:01 UTC, the next day's paper is in (the banner, or the paper itself).
  const day = Number(await panel.getByTestId('dev-city-day').textContent());
  await tap(page, 'Next day', /^Now \w+day \d{1,2} \w{3} 00:01 UTC · polls open \(day 2 of 3\) in Coalport/);
  await expect(panel.getByTestId('dev-city-day')).toHaveText(String(day + 1));
  await expect(panel.getByTestId('dev-utc')).toHaveText(/ 00:0\d UTC$/);

  // 8. Skip to the count: nominations open again; Refill Energy fills the bar.
  await tap(page, 'Skip to next phase', /the count is in · nominations open in Coalport/);
  await expect(panel.getByTestId('dev-phase')).toHaveText(/^Count day/);
  await tap(page, 'Refill Energy', /^Energy 100 \/ 100$/);
  await expect(page.getByTestId('hud-energy')).toContainText('100');

  // 9. Escape closes the sheet and gives focus back to the button.
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the dev panel on a desktop: the sheet sits clear of the dock', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, 'Otto Brenner');
  await toTheCity(page);
  const toggle = page.getByTestId('dev-toggle');
  const t = await boxOf(toggle);
  for (const pin of await page.getByTestId('hotspot').filter({ visible: true }).all())
    expect(overlaps(t, await boxOf(pin))).toBe(false);
  const panel = await openPanel(page);
  const dock = page.getByRole('navigation', { name: 'Main' });
  expect(overlaps(await boxOf(panel), await boxOf(dock))).toBe(false);
  expect(overlaps(t, await boxOf(dock))).toBe(false);
  await tap(page, '+1 hour', /^Now .* UTC/);
});
