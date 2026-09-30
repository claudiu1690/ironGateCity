/**
 * QA (slices 0–1): the slice-1 core loop on a 375×812 phone and a 1440×900 desktop, the job and
 * training flows, out of Energy, the paper coming back after 3 hours, sign out and in, keyboard use,
 * and a few production-only checks (the auth origin check runs here because the server is built
 * with NODE_ENV=production). Known bugs are `test.fail` with the bug title from docs/qa/slices-0-1.md.
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { signUp, toTheCity } from './helpers';

const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });

/** The map has measured itself and applied its first view (centred on pin 1). */
async function mapReady(page: Page) {
  await expect(page.getByTestId('hotspot')).toHaveCount(6);
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

  test('the 5-minute loop: paper → job → shift → ×1 → Again ×3 → one modal each → Today → level-up point → Me → reload → sign out and in', async ({
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
    await expect(sheet.getByTestId('job-coalport-factory-worker')).toContainText(
      'Your job · streak 0 days · 2 sick days left',
    );
    // Slice 3: Coalport's branch motion, the Shift Hours Order, is in force: a shift is 3 Energy.
    await sheet.getByRole('button', { name: 'Work your shift at the mill, 3 Energy' }).click();
    await expect(modalOf(page).getByTestId('stamp')).toHaveText('Shift worked');
    await expect(modalOf(page).getByRole('button', { name: /Again/ })).toHaveCount(0); // a shift has Continue only
    await continueModal(page);
    await expect(sheet.getByTestId('ticket-coalport.mill-gate.shift')).toContainText(
      /Shift worked · next at \d\d:\d\d/,
    );

    // One tap = one modal (pillar 7): ×1, then Again ×3 from the modal itself.
    await sheet.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }).click();
    const modal = modalOf(page);
    await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
    await expect(page.getByTestId('stamp')).toHaveCount(1); // one result modal, no second screen
    await modal.getByRole('button', { name: /Again ×3/ }).click();
    await expect(modal.getByTestId('stamp')).toHaveText(/^[0-3] of 3$/);
    await expect(modal.getByTestId('attempt-row')).toHaveCount(3);
    await expect(modal.getByTestId('effect-energy')).toHaveText('87 → 57');
    // Every attempt row shows its roll against the chance (§13.1a: the maths is never hidden).
    for (const row of await modal.getByTestId('attempt-row').all())
      await expect(row).toContainText(/Rolled \d+ against \d+ %/);
    // 135 XP or more crosses Level 2 (150) with the earlier 23–45: a stat point can be placed from the modal.
    const level = modal.getByTestId('effect-level');
    if (await level.isVisible()) {
      await level.getByRole('button', { name: /^INT \d+ → \d+$/ }).click();
      await expect(page.getByTestId('hud-points')).toHaveCount(0);
    }
    await continueModal(page);
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await expect(page.getByTestId('today-strip').first()).toContainText('43 Energy · 4 attempts');
    await expect(page.getByTestId('today-strip').first()).toContainText('shift worked');
    await expect(page.getByTestId('hud-energy')).toHaveText('57 / 100');

    // Me: rank, level, stats, job, standing, today, orders.
    await page.getByRole('link', { name: /^Me/ }).click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole('region', { name: 'Job' })).toContainText('Factory worker · 216 a day');
    await expect(page.getByRole('region', { name: 'Job' })).toContainText(/Shift worked · next at \d\d:\d\d/);
    await expect(page.getByRole('region', { name: 'Rank' })).toContainText('Rank 1: Recruit');
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
    await expect(page.getByTestId('hud-energy')).toHaveText('57 / 100');
  });

  test('out of Energy: ×1 and ×3 disabled with "Needs … · ready at", the out-of-Energy card, nothing spent', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    const sheet = await openAny(page, '1. Mill Gate');
    // 100 → 10 with three ×3 canvasses.
    for (let i = 0; i < 3; i++) {
      await sheet.getByRole('button', { name: 'Canvass the shift change, three times, 30 Energy' }).click();
      await expect(modalOf(page).getByTestId('stamp')).toHaveText(/of 3$/);
      await continueModal(page);
    }
    const ticket = sheet.getByTestId('ticket-coalport.mill-gate.canvass');
    await expect(
      sheet.getByRole('button', { name: 'Canvass the shift change, three times, 30 Energy' }),
    ).toBeDisabled();
    await expect(ticket.getByTestId('ticket-hint')).toHaveText('×3 needs 30 Energy');
    await sheet.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }).click();
    await expect(modalOf(page).getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
    await expect(modalOf(page).getByRole('button', { name: /Again ×1/ })).toBeDisabled();
    await expect(modalOf(page).getByTestId('again-hint')).toHaveText(
      /^Needs 10 Energy · ready at \d\d:\d\d$/,
    );
    await continueModal(page);
    await expect(
      sheet.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }),
    ).toBeDisabled();
    await expect(ticket.getByTestId('ticket-hint')).toHaveText(/^Needs 10 Energy · ready at \d\d:\d\d$/);
    await expect(sheet.getByTestId('out-of-energy')).toContainText(/full at \d\d:\d\d/);
    await expect(page.getByTestId('hud-energy')).toHaveText('0 / 100');
  });

  test('switch jobs (2 Energy, streak resets, one shift per day), train INT, and place a point from the HUD badge', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    let sheet = await openAny(page, '1. Mill Gate');
    await sheet.getByRole('button', { name: 'Take the job' }).click();
    // Slice 3: Coalport's branch motion, the Shift Hours Order, is in force: a shift is 3 Energy.
    await sheet.getByRole('button', { name: 'Work your shift at the mill, 3 Energy' }).click();
    await continueModal(page);
    await sheet.getByRole('button', { name: /^Close/ }).click();

    sheet = await openAny(page, '2. Market Row');
    await sheet.getByRole('button', { name: 'Switch · 2 Energy · streak resets' }).click();
    await expect(sheet.getByTestId('job-coalport-street-vendor')).toContainText(
      /Switched · streak reset · first half pay at \d\d:\d\d/,
    );
    await expect(page.getByTestId('hud-energy')).toHaveText('95 / 100');
    await expect(sheet.getByRole('button', { name: 'Work the stall, 2 Energy' })).toBeDisabled();
    await expect(sheet.getByTestId('ticket-coalport.market-row.stall')).toContainText(
      /Shift worked · next at/,
    );
    await sheet.getByRole('button', { name: /^Close/ }).click();

    sheet = await openAny(page, '3. Union Hall');
    const study = sheet.getByTestId('ticket-coalport.union-hall.reading-room');
    await expect(study).toContainText('INT 12 → 13 · no roll');
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
    await expect(study).toContainText('INT 13 → 14 · no roll');
    await expect(study).toContainText('46');
    await sheet.getByRole('button', { name: /^Close/ }).click();

    // Level 2 is 150 XP: 99 from training + a canvass or two.
    sheet = await openAny(page, '1. Mill Gate');
    while ((await page.getByTestId('hud-points').count()) === 0) {
      await sheet.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }).click();
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
  // pin button 10–20 ms after Close; a pin focused (or tapped) in that window was detached and the
  // Enter (or tap) was lost. The pins must survive a close, and the first view must still come back.
  test('closing a sheet keeps the same pin buttons (no lost tap or Enter) and returns to the first view', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    // Load the map with no sheet open, so the transform it mounts with is the first view.
    await page.goto('/city/coalport');
    await mapReady(page);
    const transform = () =>
      page.locator('.react-transform-component').evaluate((el) => (el as HTMLElement).style.transform);
    const firstView = await transform();
    // Pin 5 sits low on the map, so its sheet pans (and zooms) the map to keep it clear.
    const sheet = await openAny(page, '5. Harbour Quays');
    await expect.poll(transform).not.toBe(firstView);
    await page.evaluate(() => {
      (window as unknown as { __pins: Element[] }).__pins = [
        ...document.querySelectorAll('[data-testid=hotspot]'),
      ];
    });
    await sheet.getByRole('button', { name: /^Close/ }).click();
    await expect(sheet).toBeHidden();
    // Back to exactly the first view; by then any remount would have replaced the pins.
    await expect.poll(transform).toBe(firstView);
    const detached = await page.evaluate(() =>
      (window as unknown as { __pins: Element[] }).__pins
        .filter((p) => !p.isConnected)
        .map((p) => p.getAttribute('aria-label')),
    );
    expect(detached).toEqual([]);
    expect(await offScreenPins(page, PHONE)).toEqual([]);
  });

  // m3 (fixed in fix round 1): attempt rows and the HUD badge are 44 px tall.
  test('m3: touch targets are at least 44 px (HUD "point to place" badge and modal attempt rows were 32 px)', async ({
    page,
  }) => {
    await signUp(page);
    await toTheCity(page);
    const sheet = await openAny(page, '1. Mill Gate');
    await sheet.getByRole('button', { name: 'Canvass the shift change, three times, 30 Energy' }).click();
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
    await sheet.getByRole('button', { name: 'Canvass the shift change, three times, 30 Energy' }).click();
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

  test('paper → map with the dock and ticker → side panel → ×3 → modal → Continue', async ({ page }) => {
    await signUp(page);
    await expect(page.getByTestId('headline')).toHaveCount(3);
    await toTheCity(page);
    await expect(page.getByText('The Coalport Clarion').last()).toBeVisible(); // the ticker
    await expect(page.getByText(/Party order: .+ \(0 of \d\)/)).toBeVisible();
    const sheet = await openAny(page, '3. Union Hall');
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBeGreaterThan(DESKTOP.width / 2); // a right-hand panel, not a bottom sheet
    await sheet
      .getByRole('button', { name: 'Sit in on the branch committee, three times, 30 Energy' })
      .click();
    const modal = modalOf(page);
    await expect(modal.getByTestId('stamp')).toHaveText(/^[0-3] of 3$/);
    await expect(modal.getByTestId('tile-opinion')).toHaveCount(1);
    await expect(modal.getByTestId('effect-opinion')).toHaveCount(0); // council moves no opinion
    await continueModal(page);
    await expect(page.getByTestId('hud-energy')).toHaveText('70 / 100');
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
    await sheet.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }).click();
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
