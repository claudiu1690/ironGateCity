/**
 * QA (slices 0–1): the slice-1 core loop on a 375×812 phone and a 1440×900 desktop, the job and
 * training flows, out of Energy, the paper coming back after 3 hours, sign out and in, keyboard use,
 * and a few production-only checks (the auth origin check runs here because the server is built
 * with NODE_ENV=production). Known bugs are `test.fail` with the bug title from docs/qa/slices-0-1.md.
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { mapAtRest, signUp, toTheCity } from './helpers';

const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });

/** The map has measured itself and applied its first view (centred on pin 1). */
async function mapReady(page: Page) {
  await expect(page.getByTestId('hotspot')).toHaveCount(6);
  await mapAtRest(page);
  await expect(page.getByRole('button', { name: '1. Mill Gate' })).toBeInViewport();
}

/** Open a hotspot even when it starts off-screen on a phone (keyboard: focus + Enter). */
async function openAny(page: Page, label: string): Promise<Locator> {
  await expect(page.getByTestId('hotspot')).toHaveCount(6);
  const pin = page.getByRole('button', { name: label });
  await pin.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  return sheet;
}

/** The labels of pins not wholly inside a viewport of this size. */
async function offScreenPins(page: Page, vp: { width: number; height: number }): Promise<string[]> {
  const outside: string[] = [];
  for (const pin of await page.getByTestId('hotspot').all()) {
    const b = (await pin.boundingBox())!;
    if (b.x < 0 || b.y < 0 || b.x + b.width > vp.width || b.y + b.height > vp.height) {
      outside.push((await pin.getAttribute('aria-label')) ?? '?');
    }
  }
  return outside;
}

/** The map's view, "x,y,scale" (review 2: the map's own transform, on its box). */
async function transformOf(page: Page): Promise<string> {
  return (await page.getByTestId('city-map').getAttribute('data-view')) ?? '';
}

async function continueModal(page: Page) {
  const modal = modalOf(page);
  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(modal).toBeHidden();
}

/** Interactive elements smaller than 44 px in either dimension (inline text links excluded). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, [role="button"]',
    )) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden') continue;
      if (el.tagName === 'A' && s.display === 'inline') continue;
      if (Math.round(r.width) < 44 || Math.round(r.height) < 44) {
        out.push(
          `${(el.getAttribute('aria-label') ?? el.innerText).trim().replace(/\s+/g, ' ').slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`,
        );
      }
    }
    return out;
  });
}

test.describe('phone 375×812', () => {
  test.use({ viewport: PHONE });

  test('the 5-minute loop: paper → job → ×1 → Again ×3 → one modal each → Today → level-up point → Me → reload → sign out and in', async ({
    page,
  }) => {
    const email = await signUp(page, 'Ida Brandt');
    await expect(page.getByTestId('dateline')).toContainText(
      /^[A-Z][a-z]+day · \d{1,2} [A-Z][a-z]+ · Coalport$/,
    );
    await expect(page.getByTestId('dateline')).not.toContainText(/\d{4}/); // no year, ever (§3.3)
    await toTheCity(page);

    const sheet = await openAny(page, '1. Mill Gate');
    await sheet.getByRole('button', { name: 'Take the job' }).click();
    // Review 1 (GDD §9.1): a job is a wage: no shift, no Energy, paid at midnight.
    await expect(sheet.getByTestId('job-held')).toHaveText('Your job · seniority 0 days · +0 %');
    await expect(page.getByTestId('hud-energy')).toHaveText('100 / 100');

    // One tap = one modal (pillar 7): ×1, then Again ×3 from the modal itself.
    await sheet
      .getByRole('button', { name: 'Talk to the workers coming off shift, once, 10 Energy' })
      .click();
    const modal = modalOf(page);
    await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
    await expect(page.getByTestId('stamp')).toHaveCount(1); // one result modal, no second screen
    await modal.getByRole('button', { name: /Again ×3/ }).click();
    await expect(modal.getByTestId('stamp')).toHaveText(/^[0-3] of 3$/);
    await expect(modal.getByTestId('attempt-row')).toHaveCount(3);
    await expect(modal.getByTestId('effect-energy')).toHaveText('90 → 60');
    // Review 2 (GDD §8.4, §13.1a): every row is its outcome and XP; a non-Success row one plain
    // reason; no roll, chance or maths anywhere in the rows.
    for (const row of await modal.getByTestId('attempt-row').all()) {
      await expect(row.getByTestId('attempt-outcome')).toHaveText(/^(Success|Partial)$/);
      await expect(row).not.toContainText(/Rolled|\d+ %/);
      // A reason of its own under the row (a shared one prints once under the rows, below).
      for (const reason of await row.getByTestId('attempt-reason').all())
        await expect(reason).not.toHaveText(/\d/);
    }
    const outcomes = await modal
      .getByTestId('attempt-row')
      .evaluateAll((rs) => rs.map((r) => r.dataset.outcome));
    if (outcomes.some((o) => o !== 'success'))
      await expect(
        modal.getByTestId('attempt-reason').or(modal.getByTestId('attempts-reason')).first(),
      ).toBeVisible();
    // 135 XP or more crosses Level 2 (150) with the earlier 23–45: a stat point can be placed from the modal.
    const level = modal.getByTestId('effect-level');
    if (await level.isVisible()) {
      await level.getByRole('button', { name: /^INT \d+ → \d+$/ }).click();
      await expect(page.getByTestId('hud-points')).toHaveCount(0);
    }
    await continueModal(page);
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await expect(page.getByTestId('today-strip').first()).toContainText('40 Energy · 4 attempts');
    await expect(page.getByTestId('hud-energy')).toHaveText('60 / 100');

    // Me: rank, level, stats, job, standing, today, orders.
    await page.getByRole('link', { name: /^Me/ }).click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole('region', { name: 'Job' })).toContainText('Factory worker · 216 a day');
    await expect(page.getByRole('region', { name: 'Job' })).toContainText(
      'Your job · seniority 0 days · +0 %',
    );
    await expect(page.getByRole('region', { name: 'Job' })).toContainText(
      /216 a day · paid at midnight · \d\d:\d\d/,
    );
    // Review 1 (answers §8): the full Faction XP row.
    await expect(page.getByTestId('me-rank')).toContainText(
      /^Red Collective · Recruit · \d+ \/ 400 to Activist$/,
    );
    const meText = await page.locator('main').innerText();

    await page.reload();
    await expect(page.locator('main')).toContainText('Factory worker · 216 a day');
    expect(await page.locator('main').innerText()).toBe(meText);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/me');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('e2e-password-123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/city\/coalport$/);
    await expect(page.getByTestId('hud-energy')).toHaveText('60 / 100');
  });

  test('out of Energy: ×1 and ×3 disabled with "Needs … · ready at", the out-of-Energy card, nothing spent', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    const sheet = await openAny(page, '1. Mill Gate');
    // 100 → 10 with three ×3 canvasses.
    for (let i = 0; i < 3; i++) {
      await sheet
        .getByRole('button', { name: 'Talk to the workers coming off shift, three times, 30 Energy' })
        .click();
      await expect(modalOf(page).getByTestId('stamp')).toHaveText(/of 3$/);
      await continueModal(page);
    }
    const ticket = sheet.getByTestId('ticket-coalport.mill-gate.canvass');
    await expect(
      sheet.getByRole('button', { name: 'Talk to the workers coming off shift, three times, 30 Energy' }),
    ).toBeDisabled();
    await expect(ticket.getByTestId('ticket-hint')).toHaveText('×3 needs 30 Energy');
    await sheet
      .getByRole('button', { name: 'Talk to the workers coming off shift, once, 10 Energy' })
      .click();
    await expect(modalOf(page).getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
    await expect(modalOf(page).getByRole('button', { name: /Again ×1/ })).toBeDisabled();
    await expect(modalOf(page).getByTestId('again-hint')).toHaveText(
      /^Needs 10 Energy · ready at \d\d:\d\d$/,
    );
    await continueModal(page);
    await expect(
      sheet.getByRole('button', { name: 'Talk to the workers coming off shift, once, 10 Energy' }),
    ).toBeDisabled();
    await expect(ticket.getByTestId('ticket-hint')).toHaveText(/^Needs 10 Energy · ready at \d\d:\d\d$/);
    await expect(sheet.getByTestId('out-of-energy')).toContainText(/full at \d\d:\d\d/);
    await expect(page.getByTestId('hud-energy')).toHaveText('0 / 100');
  });

  test('switch jobs (review 1: free, seniority resets), train INT, and place a point from the HUD badge', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    let sheet = await openAny(page, '1. Mill Gate');
    await sheet.getByRole('button', { name: 'Take the job' }).click();
    await expect(sheet.getByTestId('job-held')).toBeVisible();
    await sheet.getByRole('button', { name: /^Close/ }).click();

    sheet = await openAny(page, '2. Market Row');
    await sheet.getByRole('button', { name: 'Switch · seniority resets' }).click();
    await expect(sheet.getByTestId('job-coalport-street-vendor')).toContainText(
      /Switched · seniority reset · paid at \d\d:\d\d/,
    );
    // Review 1: switching costs no Energy, and there is no shift to work.
    await expect(page.getByTestId('hud-energy')).toHaveText('100 / 100');
    await expect(sheet.getByTestId('ticket-coalport.market-row.stall')).toHaveCount(0);
    await sheet.getByRole('button', { name: /^Close/ }).click();

    sheet = await openAny(page, '3. Union Hall');
    const study = sheet.getByTestId('ticket-coalport.union-hall.reading-room');
    await expect(study).toContainText('Intelligence 12 → 13 · always works');
    // m4 (fix round 1): training is ×1 only (content §13.2): one button with the live cost, no ×3
    // (before, a "×3 · 138 Energy" button sat disabled for good on a 100-Energy bar).
    await expect(sheet.getByRole('button', { name: /Study in the reading room, three times/ })).toHaveCount(
      0,
    );
    await sheet.getByRole('button', { name: 'Study in the reading room, 44 Energy' }).click();
    const modal = modalOf(page);
    await expect(modal.getByTestId('stamp')).toHaveText('Trained');
    await expect(modal.getByTestId('tile-experience')).toContainText('+99');
    await expect(modal.getByRole('button', { name: /Again ×1/ })).toBeVisible();
    await expect(modal.getByRole('button', { name: /Again ×3/ })).toHaveCount(0);
    await continueModal(page);
    await expect(study).toContainText('Intelligence 13 → 14 · always works');
    await expect(study).toContainText('46');
    await sheet.getByRole('button', { name: /^Close/ }).click();

    // Level 2 is 150 XP: 99 from training + a canvass or two.
    sheet = await openAny(page, '1. Mill Gate');
    while ((await page.getByTestId('hud-points').count()) === 0) {
      await sheet
        .getByRole('button', { name: 'Talk to the workers coming off shift, once, 10 Energy' })
        .click();
      const m = modalOf(page);
      await expect(m.getByTestId('stamp')).toBeVisible();
      const later = m.getByRole('button', { name: 'Later' });
      if (await later.isVisible()) await later.click();
      await continueModal(page);
    }
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await page.getByTestId('hud-points').click();
    await page.getByRole('button', { name: 'STR 10 → 11' }).click();
    await expect(page.getByTestId('hud-points')).toHaveCount(0);
    await page.getByRole('link', { name: /^Me/ }).click();
    await expect(page.getByTestId('stat-str')).toHaveText('11');
    await expect(page.getByTestId('stat-int')).toHaveText('13');
  });

  test('keyboard only: open a location, act, read the modal, close it with Escape', async ({ page }) => {
    await signUp(page);
    await toTheCity(page);
    const sheet = await openAny(page, '6. The Anchor');
    const listen = sheet.getByRole('button', { name: 'Listen at the bar, once, 3 Energy' });
    await listen.focus();
    await page.keyboard.press('Enter');
    const modal = modalOf(page);
    await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
    // Focus is inside the modal (Radix focus trap), and Escape closes it back to the sheet.
    expect(await modal.evaluate((m) => m.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(sheet).toBeVisible();
  });

  // M2 (fixed in fix round 1): the first view fits every pin, clear of the plate and the orders panel.
  test('M2: every location pin is on screen at the first view of the map (3 of 6 were off-screen on a phone)', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    await mapReady(page);
    const outside = await offScreenPins(page, PHONE);
    test.info().annotations.push({ type: 'off-screen pins', description: outside.join(', ') });
    expect(outside).toEqual([]);
  });

  // M2 (fixed in fix round 1): focus pans a hidden pin into view.
  test('M2: focusing an off-screen pin with the keyboard brings it into view', async ({ page }) => {
    await signUp(page);
    await toTheCity(page);
    await mapReady(page);
    const pin = page.getByRole('button', { name: '6. The Anchor' });
    await pin.focus();
    await expect(pin).toBeInViewport();
  });

  // Slice 2 regression: closing a phone sheet reset the map by remounting it, which replaced every
  // pin button 10-20 ms after Close; a pin focused (or tapped) in that window was detached and the
  // Enter (or tap) was lost. The pins must survive a close.
  // Review 2 #8, #9 (a deliberate change from review 1 #7): a pin zooms the map into it, and closing
  // its sheet zooms back out to the fitted view, in place, with the same pin buttons.
  test('closing a sheet zooms back to the fitted view with the same pin buttons (no lost tap or Enter)', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    // Load the map with no sheet open: the fitted view.
    await page.goto('/city/coalport');
    await mapReady(page);
    const fitted = await transformOf(page);
    // Pin 5 sits low on the map, under where its sheet opens: the zoom puts it above the sheet.
    const sheet = await openAny(page, '5. Harbour Quays');
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'true');
    expect(await transformOf(page)).not.toBe(fitted);
    const pin5 = page.locator('[data-testid="hotspot"][aria-label="5. Harbour Quays"]');
    const top = (await sheet.boundingBox())!.y;
    const p5 = (await pin5.boundingBox())!;
    expect(p5.y + p5.height).toBeLessThanOrEqual(top);
    await page.evaluate(() => {
      (window as unknown as { __pins: Element[] }).__pins = [
        ...document.querySelectorAll('[data-testid=hotspot]'),
      ];
    });
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await expect(sheet).toBeHidden();
    // Past the 500 ms zoom: back at the fitted view, and no remount replaced the pins.
    await expect.poll(() => transformOf(page)).toBe(fitted);
    const detached = await page.evaluate(() =>
      (window as unknown as { __pins: Element[] }).__pins
        .filter((p) => !p.isConnected)
        .map((p) => p.getAttribute('aria-label')),
    );
    expect(detached).toEqual([]);
    // And a pin tapped at once still opens its sheet.
    await page.getByRole('button', { name: '5. Harbour Quays' }).click();
    await expect(page.getByRole('dialog')).toContainText('Harbour Quays');
  });

  // m3 (fixed in fix round 1): attempt rows and the HUD badge are 44 px tall.
  test('m3: touch targets are at least 44 px (HUD "point to place" badge and modal attempt rows were 32 px)', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    const sheet = await openAny(page, '1. Mill Gate');
    await sheet
      .getByRole('button', { name: 'Talk to the workers coming off shift, three times, 30 Energy' })
      .click();
    await expect(modalOf(page).getByTestId('stamp')).toBeVisible();
    const small = await smallTargets(page);
    test.info().annotations.push({ type: 'small targets', description: small.join(' | ') });
    expect(small).toEqual([]);
  });

  test('the ×3 result modal: how far a phone player scrolls to reach Again / Continue (measured, see the report)', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    const sheet = await openAny(page, '1. Mill Gate');
    await sheet
      .getByRole('button', { name: 'Talk to the workers coming off shift, three times, 30 Energy' })
      .click();
    const modal = modalOf(page);
    await expect(modal.getByTestId('stamp')).toBeVisible();
    const cont = modal.getByRole('button', { name: 'Continue' });
    const box = await cont.boundingBox();
    const height = await modal.evaluate((m) => m.scrollHeight);
    test.info().annotations.push({
      type: 'modal',
      description: `modal content ${height}px on a ${PHONE.height}px screen; Continue at y=${Math.round(box?.y ?? -1)}`,
    });
    await cont.scrollIntoViewIfNeeded();
    await cont.click();
    await expect(modal).toBeHidden();
  });
});

test.describe('desktop 1440×900', () => {
  test.use({ viewport: DESKTOP, isMobile: false, hasTouch: false });

  test('paper → map with the dock and ticker → centred panel → ×3 → modal → Continue', async ({ page }) => {
    await signUp(page);
    await expect(page.getByTestId('headline')).toHaveCount(3);
    await toTheCity(page);
    await expect(page.getByText('The Coalport Clarion').last()).toBeVisible(); // the ticker
    await expect(page.getByText(/Party order: .+ \(0 of \d\)/)).toBeVisible();
    const sheet = await openAny(page, '3. Union Hall');
    // Review 2 #2: a panel in the middle of the screen over the dimmed map, not a side sheet.
    const box = (await sheet.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - DESKTOP.width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y + box.height / 2 - DESKTOP.height / 2)).toBeLessThanOrEqual(2);
    await expect(page.getByTestId('location-backdrop')).toBeVisible();
    await sheet.getByRole('button', { name: 'Go to the branch meeting, three times, 30 Energy' }).click();
    const modal = modalOf(page);
    await expect(modal.getByTestId('stamp')).toHaveText(/^[0-3] of 3$/);
    await expect(modal.getByTestId('tile-opinion')).toHaveCount(1);
    await expect(modal.getByTestId('effect-opinion')).toHaveCount(0); // council moves no opinion
    await continueModal(page);
    await expect(page.getByTestId('hud-energy')).toHaveText('70 / 100');
  });

  // Review 2 #8, #9 (replaces review 1 #7): no free zoom; a pin zooms smoothly into it and its panel
  // opens; closing zooms back out. Review 3 (the user, 2 Oct 2026): at rest the map now drags within
  // the quarter (same scale), and closing a place comes back to where it was dragged.
  test('review 2 and 3: no free zoom; a drag at rest pans; a pin zooms in, then its panel opens; closing zooms back out', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    await page.goto('/city/coalport');
    await mapReady(page);
    const fitted = await transformOf(page);
    // No free zoom at rest.
    await page.mouse.move(700, 500);
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -200);
    await page.waitForTimeout(300);
    expect(await transformOf(page)).toBe(fitted);
    // A drag at rest pans the map, at the same scale (down: Coalport's picture just spans the width).
    await page.mouse.down();
    await page.mouse.move(700, 560, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const dragged = await transformOf(page);
    expect(dragged).not.toBe(fitted);
    expect(dragged.split(',')[2]).toBe(fitted.split(',')[2]);
    // A pin: the zoom plays first (no panel mid-zoom), then the centred panel opens.
    await page.getByRole('button', { name: '4. Foundry Row' }).click();
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'true');
    await expect(page.getByTestId('map-layer')).toHaveCSS('transition-duration', '0.5s');
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('Foundry Row');
    const zoomed = await transformOf(page);
    expect(Number(zoomed.split(',')[2])).toBeGreaterThan(Number(fitted.split(',')[2]));
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await expect(sheet).toBeHidden();
    await expect.poll(() => transformOf(page)).toBe(dragged);
  });

  test('review 2: with reduced motion the zoom is instant', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signUp(page);
    await toTheCity(page);
    await page.goto('/city/coalport');
    await mapReady(page);
    await page.getByRole('button', { name: '3. Union Hall' }).click();
    await expect(page.getByRole('dialog')).toContainText('Union Hall');
    await expect(page.getByTestId('map-layer')).toHaveCSS('transition-property', 'none');
  });

  // M2 (fixed in fix round 1).
  test('M2: pin 6 (The Anchor) is visible at the first view on a 1440×900 desktop', async ({ page }) => {
    await signUp(page);
    await toTheCity(page);
    await mapReady(page);
    const pin = page.getByRole('button', { name: '6. The Anchor' });
    const b = (await pin.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(DESKTOP.height - 30); // above the 30 px ticker line
  });
});

test.describe('lazy time through the real server (E2E_TEST_HOOKS clock)', () => {
  test('3 hours after the last action the paper is due again: `/` opens it and the map shows the banner', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    const sheet = await openAny(page, '1. Mill Gate');
    await sheet
      .getByRole('button', { name: 'Talk to the workers coming off shift, once, 10 Energy' })
      .click();
    await continueModal(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/city\/coalport$/);
    const res = await page.request.post('/api/test/clock', { data: { advanceMs: 3 * 3_600_000 } });
    expect(res.ok()).toBe(true);
    // On the map the paper does not yank the player: a one-line banner and a dot on the Paper tab.
    await page.goto('/city/coalport');
    await expect(page.getByTestId('paper-banner')).toBeVisible();
    await expect(page.getByTestId('paper-banner')).toHaveText('The Clarion is in'); // n3 (fix round 1)
    await expect(page.getByTestId('tab-dot-paper')).toHaveCount(1);
    await page.goto('/');
    await expect(page).toHaveURL(/\/paper$/);
    await expect(page.getByTestId('desk')).toContainText('Energy');
  });
});

test.describe('production-only security checks', () => {
  test('Better Auth refuses a cookie-carrying sign-in from a foreign Origin (CSRF), and accepts its own', async ({
    page,
  }) => {
    const email = await signUp(page);
    const cookies = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const body = { email, password: 'e2e-password-123' };
    const evil = await page.request.post('/api/auth/sign-in/email', {
      headers: { origin: 'https://evil.example', cookie: cookies },
      data: body,
    });
    expect(evil.status()).toBe(403);
    const own = await page.request.post('/api/auth/sign-in/email', {
      headers: { origin: new URL(page.url()).origin, cookie: cookies },
      data: body,
    });
    expect(own.status()).toBe(200);
  });

  test('the API sends no CORS headers to a foreign origin', async ({ page }) => {
    const res = await page.request.get('/api/trpc/health.ping', {
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers()['access-control-allow-origin']).toBeUndefined();
  });
});
