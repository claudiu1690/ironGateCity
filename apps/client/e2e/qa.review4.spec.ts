import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ANSWERS, platformRow, answer, arrive, signUpOnly } from './helpers';
import type { FactionKey } from './helpers';

/**
 * QA review 4 (client half; docs/review/review-4-build-notes.md, docs/design/review-4-answers.md,
 * docs/tech/review-4.md §18.3): the review-4 screens as a player meets them, beyond `review4.spec.ts`'s
 * Collective walk: the opening for the Vanguard and the Alliance, the journey on the nation map (the
 * card at its moment without a reload, the row, the return, *Follow your pin*, the side sheet, the
 * phone plate), Irongate's tiling, a home city as one map, the Town Hall, *Live here* and the bed, the
 * cells (the sentence, orders off, the station's list from a second account, Legal Aid, the release),
 * the HUD (Heat, Political Capital, the ladder, Health, the clock), the paper on a desk and the local
 * editions. The bugs it found (R4-QA-01–03, 05, 08–10) were expected failures until the QA fix round
 * fixed them; their tests are plain tests now. Last, the browser audit at six screen sizes.
 *
 * It moves the shared test clock (forward only), so it runs last (`qa-review4`, after `review4`).
 */


const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok(), 'character hook').toBe(true));
const dev = (page: Page, action: string, target?: string) =>
  page.request
    .post(`/api/test/dev/${action}`, { data: target === undefined ? {} : { target } })
    .then((r) => expect(r.ok(), `dev ${action}`).toBe(true));
const street = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/street', { data }).then((r) => expect(r.ok()).toBe(true));
const clockNow = async (page: Page): Promise<number> =>
  ((await (await page.request.post('/api/test/clock', { data: { advanceMs: 0 } })).json()) as { now: number })
    .now;
const advance = (page: Page, ms: number) =>
  page.request.post('/api/test/clock', { data: { advanceMs: Math.max(0, Math.round(ms)) } });
const resultModal = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
const stampModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
const politicalModal = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('political-continue') });
const placeSheet = (page: Page) => page.locator('[role=dialog][data-layout]');

async function newMember(page: Page, faction: FactionKey, name: string) {
  await signUpOnly(page, name);
  await arrive(page, { faction });
}

/** Visible controls under 44 px either way inside a root (the dev panel's own button aside). */
async function smallTargets(page: Page, root: string): Promise<string[]> {
  return page.evaluate((rootSel) => {
    const out: string[] = [];
    for (const r of document.querySelectorAll(rootSel))
      for (const el of r.querySelectorAll(
        'button, a[href], [role=button], [role=radio], input:not([type=hidden])',
      )) {
        if (el.closest('[aria-hidden=true]') || el.getAttribute('data-testid') === 'dev-toggle') continue;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none') continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (el.tagName === 'INPUT' && (b.width <= 1 || b.height <= 1)) continue;
        if (b.width < 43.5 || b.height < 43.5)
          out.push(
            `${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)} ${Math.round(b.width)}×${Math.round(b.height)}`,
          );
      }
    return out;
  }, root);
}
const sideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** The answers' system terms (GDD §1.5) and the war words (CLAUDE.md rule 2), as review4.spec.ts. */
const SYSTEM =
  /(?<![.\-_\w])(canvass\w*|leaflet\w*|propaganda|ordinance\w*|endorse\w*|FXP\b|PC\b|Local Standing|groundswell)/i;
const WAR =
  /\b(war|wars|battle|troops|army|militia|enemy|enemies|uprising|front line|frontline|siege|invasion|comrades?|uniforms?|salute)\b/i;
async function plainWords(page: Page, screen: string) {
  const text = await page.locator('body').innerText();
  expect(text.match(SYSTEM)?.[0] ?? null, `${screen}: system term`).toBeNull();
  expect(text.match(WAR)?.[0] ?? null, `${screen}: war word`).toBeNull();
  expect(/close the game/i.test(text), `${screen}: close the game`).toBe(false);
}

const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// ---------------------------------------------------------------------------------------------------
// #2 The opening (review 5: *Coming home*, answers §19), for the two parties review4.spec.ts does not walk.
// ---------------------------------------------------------------------------------------------------

const OPENING = {
  vanguard: {
    confirm: "Go for the stamp · the six o'clock to Duskwall",
    echo: 'You went for the stamp.',
    kicker: "The six o'clock to Duskwall · the compartment",
    suitcase: "Tools. I kept the workshop's kit when the workshop went.",
    echo3: 'You brought tools.',
    deck: /The League's letter waits at Beacon House; start there\./,
    orderB: 'Get the stamp at Beacon House',
    city: 'duskwall',
    landing: /\?loc=duskwall\.beacon-house&act=duskwall\.beacon-house\.favour$/,
    favour: 'duskwall.beacon-house.favour',
    once: 'Get the stamp, once, 10 Energy',
    bodies: [/^The clerk reads your papers/, /^The clerk wants a form the camp never issued/],
    sign: '— V.S.',
    stats: { str: 14, int: 6, agi: 5, cha: 5 },
  },
  alliance: {
    confirm: "Go for the flat · the six o'clock to Ashford",
    echo: 'You went for the flat.',
    kicker: "The six o'clock to Ashford · the compartment",
    suitcase: 'Books, from the camp library. They let us keep those.',
    echo3: 'You brought books.',
    deck: /The appeal wants your signature at the Assembly Rooms; start there\./,
    orderB: 'File the appeal at the Assembly Rooms',
    city: 'ashford',
    landing: /\?loc=ashford\.assembly-rooms&act=ashford\.assembly-rooms\.favour$/,
    favour: 'ashford.assembly-rooms.favour',
    once: 'File the appeal, once, 10 Energy',
    bodies: [/^Grey reads the order twice/, /^The order's second copy is in an office/],
    sign: '— T.G.',
    stats: { str: 6, int: 14, agi: 5, cha: 5 },
  },
} as const;

test.describe('#2 the opening for the Vanguard and the Alliance', () => {
  for (const faction of ['vanguard', 'alliance'] as const) {
    test(`${faction}: select then confirm, the echo, a reload mid-way resumes, the favour is the first result`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const o = OPENING[faction];
      await signUpOnly(page, `Qa ${faction}`, 7);
      // Beat 1: three people, each with a portrait; nothing is chosen until the confirm.
      const rows = page.getByRole('radio');
      await expect(rows).toHaveCount(3);
      await expect(page.getByTestId('story-screen').locator('img[src*="portrait.holm"]')).toHaveCount(1);
      await expect(page.getByTestId('story-screen').locator('img[src*="portrait.stahl"]')).toHaveCount(1);
      await expect(page.getByTestId('story-screen').locator('img[src*="portrait.grey"]')).toHaveCount(1);
      await expect(page.getByTestId('story-confirm')).toBeDisabled();
      await expect(page.getByTestId('story-confirm')).toHaveText(/Choose one of the three/i);
      const row = platformRow(page, faction);
      await row.click();
      await expect(page.getByTestId('story-confirm')).toHaveText(new RegExp(`^${o.confirm}$`, 'i'));
      // A selected row is not a party: a reload before the confirm is still the counter, nothing checked.
      await page.reload();
      await expect(page.getByRole('heading', { name: 'The counter' })).toBeVisible();
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
      await platformRow(page, faction).click();
      await page.getByTestId('story-confirm').click();
      // Beat 2, then a reload: it resumes at the kitbag with the echo.
      await expect(page.getByRole('heading', { name: 'The kitbag' })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { name: 'The kitbag' })).toBeVisible();
      await expect(page.getByTestId('story-echo')).toHaveText(o.echo);
      await expect(page.getByTestId('story-screen')).toContainText(new RegExp(o.kicker, 'i'));
      await plainWords(page, `${faction}: the kitbag`);
      await answer(page, o.suitcase);
      await expect(page.getByRole('heading', { name: 'The post' })).toBeVisible();
      await expect(page.getByTestId('story-echo')).toHaveText(o.echo3);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'The post' })).toBeVisible();
      await answer(page, ANSWERS.reference[1]!);

      // The welcome edition: the deck names the favour; the secretary signs the three orders.
      await expect(page).toHaveURL(/\/paper$/);
      await expect(page.getByTestId('headline').first()).toContainText(o.deck);
      const orders = page.getByTestId('orders');
      await expect(orders.getByTestId('order').nth(1)).toContainText(o.orderB);
      await expect(orders).toContainText(o.sign);
      await plainWords(page, `${faction}: the welcome edition`);

      // To the city: the HQ's sheet, the favour first and ringed; Once is the first result.
      await page.getByRole('button', { name: 'To the city' }).click();
      await expect(page).toHaveURL(o.landing);
      const sheet = placeSheet(page);
      const favour = sheet.getByTestId(`ticket-${o.favour}`);
      await expect(favour).toHaveAttribute('data-highlight', 'true');
      await expect(sheet.locator('[data-testid^="ticket-"]').first()).toHaveAttribute(
        'data-testid',
        `ticket-${o.favour}`,
      );
      await favour.getByRole('button', { name: o.once }).click();
      const modal = stampModal(page);
      await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
      const body = await modal.innerText();
      expect(
        o.bodies.some((re) => body.split('\n').some((line) => re.test(line))),
        'the favour body',
      ).toBe(true);
      await expect(modal.getByTestId('effect-order-signed')).toContainText(o.sign);
      await plainWords(page, `${faction}: the favour's result`);
      await modal.getByRole('button', { name: 'Continue' }).click();
      await expect(sheet.getByTestId(`ticket-${o.favour}`)).toHaveCount(0);

      // GDD §8.5: the tuning characters; slot B done.
      const me = (await (await page.request.get('/api/trpc/character.me')).json()) as {
        result: { data: { json?: { stats: Record<string, number> } } & { stats?: Record<string, number> } };
      };
      const stats = (me.result.data.json ?? me.result.data).stats!;
      expect(stats).toMatchObject(o.stats);
      await page.goto('/paper');
      await expect(page.getByTestId('orders').getByTestId('order').nth(1)).toContainText('1 / 1');
    });
  }

  test("R4-QA-10: Grey's welcome deck names the favour, not Grey's signature (answers §30.2; review 5 §19.5)", async ({
    page,
  }) => {
    // R4-QA-10: fixed in the QA fix round (was an expected failure).
    await newMember(page, 'alliance', 'Qa Witness');
    await expect(page.getByTestId('headline').first()).toContainText(
      'The appeal wants your signature at the Assembly Rooms; start there.',
    );
  });

  test('R4-QA-08: beat 2 does not tell of the helper dozing by the window (the compartment picture shows no one asleep)', async ({
    page,
  }) => {
    // Answers §30.3 (after the build): the picture (scene.train-compartment) is the empty compartment;
    // review 5's beat 2 (answers §19.3) has the helper ask, not doze.
    // R4-QA-08: fixed in the QA fix round (was an expected failure).
    await signUpOnly(page, 'Qa Compartment', 2);
    await platformRow(page, 'collective').click();
    await page.getByTestId('story-confirm').click();
    await expect(page.getByRole('heading', { name: 'The kitbag' })).toBeVisible();
    await expect(page.getByTestId('story-screen')).not.toContainText('dozes against the window');
    await expect(page.getByTestId('story-screen')).toContainText(
      "The six o'clock, the kitbag on the rack. Everything you own is in it, and it still isn't heavy. Holm asks what a person brings home from four years.",
    );
  });

  test('R4-QA-09: the compartment picture carries its alt text (answers §29.3, §30.3)', async ({ page }) => {
    // R4-QA-09: fixed in the QA fix round (was an expected failure).
    await signUpOnly(page, 'Qa Alt', 2);
    await platformRow(page, 'collective').click();
    await page.getByTestId('story-confirm').click();
    const art = page.getByTestId('story-screen').locator('img[src*="scene.train-compartment"]');
    await expect(art).toHaveCount(1);
    await expect(art).toHaveAttribute(
      'alt',
      'An empty third-class compartment at first light: wooden benches, a suitcase on the rack, a dark coat on one bench, a parcel on the other, fields at the window.',
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// #7 The journey on the nation map (answers §7; tech §6.5; deviations 77–83, 118).
// ---------------------------------------------------------------------------------------------------

async function boardToIrongate(page: Page, name: string) {
  await newMember(page, 'collective', name);
  await dev(page, 'level10');
  await lift(page, { iron: 1000 });
  await page.goto('/nation');
  await page.getByRole('button', { name: /^Irongate · \d+ min$/ }).click();
  await page.getByRole('button', { name: /^Board · 20 Iron · 12 min$/ }).click();
  await expect(page).toHaveURL(/\/journey$/);
  const journey = page.getByTestId('journey');
  await expect(journey).toHaveAttribute('data-card-at', /^\d+$/);
  await expect(page.getByTestId('travel-pin-label')).toHaveText(/^To Irongate · in \d+ min$/);
  return Number(await journey.getAttribute('data-card-at'));
}

/** The shared clock to a few seconds before the card's moment, then a reload (the client reads it). */
async function justBeforeTheCard(page: Page, cardAt: number, leadMs = 6_000) {
  const now = await clockNow(page);
  await advance(page, cardAt - now - leadMs);
  await page.reload();
  await expect(page.getByTestId('travel-pin-mark')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test.describe('#7 the journey on the nation map', () => {
  test('1440 × 900: the side sheet, the route, the card at its moment without a reload, the row, the return, Follow your pin, the arrival', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const cardAt = await boardToIrongate(page, 'Qa Rider');
    await expect(page.getByTestId('map-path')).toHaveCount(1);
    const plate = (await page.getByTestId('journey-plate').boundingBox())!;
    expect(Math.round(plate.width)).toBe(480);
    expect(plate.x).toBeLessThan(40);
    await expect(page.getByTestId('journey-plate')).toContainText(/arrives in \d+ min · \d\d:\d\d/);
    await expect(page.getByTestId('journey-plate')).toContainText(
      "You'll arrive either way, and Energy keeps refilling on the way.",
    );
    // The pin and its label are clear of the sheet (and of everything else).
    for (const id of ['travel-pin-mark', 'travel-pin-label']) {
      const box = (await page.getByTestId(id).boundingBox())!;
      expect(overlap(box, plate), `${id} under the side sheet`).toBe(false);
    }
    expect(await smallTargets(page, '[data-testid=journey-plate]')).toEqual([]);
    await plainWords(page, 'the journey');

    // Drag the map away: *Follow your pin* shows; it brings the pin back and goes. (Before the card:
    // review 5 #7, while the card waits the map under it is inert.)
    const map = (await page.getByTestId('city-map').boundingBox())!;
    const sx = map.x + map.width * 0.7;
    const sy = map.y + map.height * 0.6;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx - 200, sy - 150, { steps: 8 });
    await page.mouse.up();
    const follow = page.getByTestId('follow-pin');
    await expect(follow).toHaveText(/Follow your pin/i);
    expect((await follow.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await follow.click();
    await expect(follow).toBeHidden();
    // The view eases back: the pin ends on the map, clear of the side sheet.
    await expect
      .poll(async () => {
        const pin = (await page.getByTestId('travel-pin-mark').boundingBox())!;
        const inMap =
          pin.x > map.x && pin.y > map.y && pin.x < map.x + map.width && pin.y < map.y + map.height;
        return inMap && !overlap(pin, plate);
      })
      .toBe(true);

    // The card turns up by itself at its moment: no reload, the pin pulses, the sheet opens.
    await justBeforeTheCard(page, cardAt);
    const pulsed = page
      .waitForFunction(() => !!document.querySelector('.travel-pin-pulse'), null, { timeout: 20_000 })
      .then(() => true);
    const card = page.getByRole('dialog').getByTestId('journey-card');
    await expect(card).toBeVisible({ timeout: 20_000 });
    expect(await pulsed).toBe(true);
    await expect(page.getByRole('dialog')).toContainText('On the train to Irongate');
    expect(await smallTargets(page, '[role=dialog]')).toEqual([]);
    // Review 5 #7 (answers §7): it stays until a row is tapped: no Close, Escape and a tap on the map
    // under its dim leave it open (and the plate's row is not offered while it is open).
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.mouse.click(map.x + map.width * 0.85, map.y + map.height * 0.5);
    await expect(card).toBeVisible();
    await expect(page.getByTestId('journey-card-open')).toHaveCount(0);
    // The tab bar still works (a vote never waits for a card); the Map tab comes back to the card;
    // and after a reload.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Paper/ }).click();
    await expect(page).toHaveURL(/\/paper$/);
    await expect(page.getByTestId('edition-line')).toHaveText('· Irongate edition');
    await expect(page.getByTestId('dateline')).toContainText('Irongate');
    await page.getByRole('link', { name: /^Map/ }).first().click();
    await expect(page).toHaveURL(/\/journey$/);
    await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible();

    // The arrival with the card unanswered: it waits in the arrival modal, with its put-aside row;
    // Continue only after a row is tapped.
    expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
    await page.reload();
    const arrival = page.getByRole('dialog').filter({ has: page.getByTestId('arrival-headline') });
    await expect(arrival).toContainText('Arrived');
    await expect(arrival.getByTestId('journey-card')).toBeVisible();
    await expect(arrival.getByTestId('arrival-continue')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(arrival).toBeVisible();
    await arrival.getByTestId('journey-set-aside').click();
    await expect(arrival.getByTestId('journey-outcome')).toBeVisible();
    await expect(arrival.getByTestId('arrival-continue')).toBeVisible();
  });

  test('1920 × 1080: the pin and its label stay clear of the side sheet', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await boardToIrongate(page, 'Qa Wide Rider');
    const plate = (await page.getByTestId('journey-plate').boundingBox())!;
    expect(Math.round(plate.width)).toBe(480);
    for (const id of ['travel-pin-mark', 'travel-pin-label']) {
      const box = (await page.getByTestId(id).boundingBox())!;
      expect(overlap(box, plate), `${id} under the side sheet`).toBe(false);
    }
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
  });

  for (const size of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 667, height: 375 },
  ]) {
    test(`${size.width} × ${size.height}: the plate is above the map, the pin on the map, 44 px targets, no sideways scroll`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(size);
      const cardAt = await boardToIrongate(page, 'Qa Phone Rider');
      const plate = (await page.getByTestId('journey-plate').boundingBox())!;
      const map = (await page.getByTestId('city-map').boundingBox())!;
      for (const id of ['travel-pin-mark', 'travel-pin-label']) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(overlap(box, plate), `${id} under the plate`).toBe(false);
        expect(box.y, `${id} on the map`).toBeGreaterThanOrEqual(map.y);
        expect(box.y + box.height, `${id} on the map`).toBeLessThanOrEqual(map.y + map.height);
      }
      expect(await smallTargets(page, 'main')).toEqual([]);
      expect(await sideScroll(page)).toBeLessThanOrEqual(0);
      await justBeforeTheCard(page, cardAt, 3_000);
      await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible({ timeout: 15_000 });
      expect(await smallTargets(page, '[role=dialog]')).toEqual([]);
      expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    });
  }

  test('reduced motion: the card still opens and the pin does not animate', async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
      baseURL: test.info().project.use.baseURL,
    });
    const page = await context.newPage();
    const cardAt = await boardToIrongate(page, 'Qa Still Rider');
    await justBeforeTheCard(page, cardAt, 3_000);
    await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible({ timeout: 15_000 });
    const animating = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid=travel-pin] *')].some((e) =>
        e.getAnimations().some((a) => a.playState === 'running'),
      ),
    );
    expect(animating).toBe(false);
    await context.close();
  });

  test('R4-QA-05: when the card fires the pin pulses where the player can see it', async ({ page }) => {
    // Answers §7.2 "the pin pulsing once"; build notes #7 "the pin pulses and the card opens". The
    // card's sheet opens in the same moment and covers the pin (a centred dialog from 640 px, a bottom
    // sheet over the whole map on a phone), so the pulse is never seen.
    // R4-QA-05: fixed in the QA fix round (was an expected failure).
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const cardAt = await boardToIrongate(page, 'Qa Pulse Rider');
    await justBeforeTheCard(page, cardAt, 4_000);
    await page.waitForFunction(() => !!document.querySelector('.travel-pin-pulse'), null, {
      timeout: 20_000,
    });
    // The pin is `pointer-events: none` (taps go to the map), so `elementFromPoint` never returns it:
    // the check is that no dialog is drawn over its centre while it pulses.
    const covered = await page.evaluate(() => {
      const pin = document.querySelector('[data-testid=travel-pin-mark]')!.getBoundingClientRect();
      const x = pin.x + pin.width / 2;
      const y = pin.y + pin.height / 2;
      return [...document.querySelectorAll('[role=dialog]')].some((d) => {
        const b = d.getBoundingClientRect();
        return getComputedStyle(d).visibility !== 'hidden' && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
      });
    });
    expect(covered, 'the pulsing pin is covered').toBe(false);
    // Then the card opens.
    await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------------------------------
// #8 Irongate tiles the picture; #21 a home city is one map; #11 the Town Hall.
// ---------------------------------------------------------------------------------------------------

test.describe('#8, #21, #11: the maps and the halls', () => {
  test("#8 Irongate's overview: every point of the picture lies in a district", async ({ page }) => {
    await newMember(page, 'collective', 'Qa Surveyor');
    await dev(page, 'level10');
    await dev(page, 'irongate');
    await page.goto('/city/irongate/overview');
    const outlines = page.getByTestId('district-outline');
    await expect(outlines).toHaveCount(5);
    const gaps = await page.evaluate(() => {
      const polys = [...document.querySelectorAll('[data-testid=district-outline]')] as SVGGeometryElement[];
      const svg = polys[0]!.ownerSVGElement!;
      const vb = svg.viewBox.baseVal;
      const none: Array<[number, number]> = [];
      for (let i = 0; i <= 40; i++)
        for (let j = 0; j <= 40; j++) {
          const pt = svg.createSVGPoint();
          pt.x = vb.x + (vb.width * i) / 40;
          pt.y = vb.y + (vb.height * j) / 40;
          if (!polys.some((p) => p.isPointInFill(pt) || p.isPointInStroke(pt))) none.push([i / 40, j / 40]);
        }
      return none;
    });
    expect(gaps).toEqual([]);
    expect(await smallTargets(page, 'body')).toEqual([]);
    await plainWords(page, 'the capital overview');
  });

  test('#21 Duskwall is one map: no outlines, no bar, greyed pins with a lock, the Places list by quarter, the hall last in the open group', async ({
    page,
  }) => {
    await newMember(page, 'vanguard', 'Qa Duskwall');
    await page.goto('/city/duskwall');
    await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'false');
    await expect(page.getByTestId('district-outline')).toHaveCount(0);
    await expect(page.getByTestId('tram-bar')).toHaveCount(0);
    const locked = page.getByTestId('locked-pin');
    await expect(locked.first()).toBeAttached();
    expect(await locked.count()).toBeGreaterThanOrEqual(5);
    await expect(locked.first()).toHaveAttribute('aria-label', /, opens at Level 6$/);
    await expect(locked.first().getByTestId('lock-mark')).toHaveCount(1);
    // A tap on a locked pin: the short sheet, Level 6.
    await locked.first().evaluate((e) => (e as HTMLElement).click());
    const lockedSheet = page.getByTestId('locked-pin-sheet');
    await expect(lockedSheet).toContainText(/OPENS AT LEVEL 6/i);
    await expect(lockedSheet).toContainText('Level 6 opens it; you are Level 1.');
    await page.keyboard.press('Escape');
    await page.getByTestId('places-button').filter({ visible: true }).click();
    const places = page.getByRole('dialog', { name: / · what's here$/ });
    const groups = places.getByTestId('place-group');
    await expect(groups).toHaveCount(3);
    const firstRows = await groups.first().getByTestId('place-row').allInnerTexts();
    expect(firstRows.at(-1)).toMatch(/Town Hall/);
    await expect(groups.nth(1)).toContainText(/OPENS AT LEVEL 6/i);
    await expect(groups.nth(1)).toContainText('Opens at Level 6');
    expect(await smallTargets(page, '[role=dialog]')).toEqual([]);
    await plainWords(page, 'the Places list in Duskwall');
  });

  test('#11 the halls as a visitor: the rule in force in words, the council as rows, Irongate ten seats and no Election card', async ({
    page,
  }) => {
    await newMember(page, 'collective', 'Qa Gallery');
    await page.goto('/city/coalport?loc=coalport.town-hall');
    const hall = placeSheet(page);
    await expect(hall.getByRole('heading', { name: 'Town Hall' })).toBeVisible();
    await expect(hall.getByTestId('ticket-coalport.town-hall.gallery')).toContainText(
      'Sit in the public gallery',
    );
    await expect(hall.getByTestId('hall-desk')).toHaveCount(0);
    await expect(hall.getByTestId('hall-seat')).toHaveCount(7);
    await expect(hall.getByTestId('hall-seat').first()).toContainText(
      /Local candidate · townspeople run by the game|Player · /,
    );
    await expect(hall.getByTestId('hall-rule')).toBeVisible();
    expect(await smallTargets(page, '[role=dialog][data-layout]')).toEqual([]);
    await plainWords(page, 'the Town Hall');
    await dev(page, 'level10');
    await dev(page, 'irongate');
    await page.goto('/city/irongate/irongate.government-quarter?loc=irongate.city-hall');
    await expect(hall.getByRole('heading', { name: 'City Hall' })).toBeVisible();
    await expect(hall.getByTestId('hall-seat')).toHaveCount(10);
    await expect(hall.getByTestId('election-card')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------------
// #9 Live here and the bed.
// ---------------------------------------------------------------------------------------------------

test('#9 Live here in its states, and a bed at Tram Junction (100 Iron, then the running line)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await newMember(page, 'collective', 'Qa Lodger');
  await lift(page, { level: 10, iron: 1000 });
  await dev(page, 'irongate');
  const card = async () => {
    await page.goto('/city/irongate/irongate.eastside');
    await page.getByTestId('residence-corner').first().click();
    const c = page.getByRole('dialog').filter({ hasText: 'Where you live' }).last();
    await expect(c).toBeVisible();
    return c;
  };
  let c = await card();
  await expect(c).toContainText('You live in Coalport.');
  await expect(c).toContainText('Activists can live in the capital. 400 Party XP makes an Activist.');
  await lift(page, { fxp: 400, iron: 100 });
  c = await card();
  await expect(c).toContainText(
    'Live in Eastside instead: vote and stand here, and your orders come from here.',
  );
  await expect(c.getByRole('button', { name: /Needs 500 Iron/i })).toBeDisabled();
  await lift(page, { iron: 1000 });
  c = await card();
  await c.getByRole('button', { name: /^Live here · 500 Iron$/i }).click();
  await page.getByTestId('register-confirm').click();
  await expect(stampModal(page).getByTestId('stamp')).toHaveText('Moved in');
  await stampModal(page).getByRole('button', { name: 'Continue' }).click();
  c = await card();
  await expect(c).toContainText('You live in Eastside.');
  expect(await smallTargets(page, '[role=dialog]')).toEqual([]);
  await page.keyboard.press('Escape');

  await page.goto('/city/irongate/irongate.station-market?loc=irongate.tram-junction');
  const lodgings = page.getByTestId('lodgings');
  await expect(lodgings).toContainText('A bed on the tram line · 7 nights · 100 Iron');
  await expect(lodgings).toContainText('Rested banks higher while you have it: up to 250 instead of 200.');
  await expect(page.getByTestId('lodgings-take')).toHaveText(/^Take a bed · 100 Iron$/i);
  expect(await smallTargets(page, '[data-testid=lodgings]')).toEqual([]);
  await page.getByTestId('lodgings-take').click();
  await expect(stampModal(page).getByTestId('stamp')).toHaveText('Taken');
  await stampModal(page).getByRole('button', { name: 'Continue' }).click();
  // Seven nights ahead may read as a weekday or (a week or more in the player's clock, QA n5) a date.
  await expect(lodgings).toContainText(/Your bed until (\w+day|\d{1,2} \w+) · Rested banks to 250/);
  await expect(lodgings.getByRole('button', { name: /Seven more nights · 100 Iron/i })).toBeVisible();
});

// ---------------------------------------------------------------------------------------------------
// #16, #17, #19, #20 The cells.
// ---------------------------------------------------------------------------------------------------

test('#19–#20 the cells: 20 + Heat ÷ 2, orders off, the station list from a second account, the release lines', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  await newMember(page, 'collective', 'Qa Taken');
  await lift(page, { level: 6, rank: 3, iron: 1000 });
  await dev(page, 'heat', '60');
  // The caught check runs only on a Partial or a Failure (rules runIn.ts `caughtCheck`): force a Failure.
  await street(page, { runIn: 'never', caught: 'always', checkRoll: 100 });
  await page.goto('/city/coalport?loc=coalport.far-bank');
  const t = page.locator('[data-mission="coalport.far-bank.posters"]');
  await t.scrollIntoViewIfNeeded();
  await t.getByTestId('mission-choose').click();
  // Review 5 (ADR 0080): by day the Agility way is a night way; the first open way plays.
  await page.getByTestId('briefing').locator('[data-testid=way-row]:not([disabled])').first().click();
  await page.getByTestId('briefing-confirm').click();
  const result = resultModal(page);
  await expect(result).toContainText('Your record: taken in · 1 mark · On file');
  await expect(result).toContainText('Orders off until the day turns');
  const heatLine = (await result.innerText()).match(
    /Heat \+\d+ → (\d+) · \w+ · Cool (at \d\d:\d\d|tomorrow \d\d:\d\d|in \d+ min|\w+day( \d\d:\d\d)?)/,
  );
  expect(heatLine, 'the heat knock-on with Cool at').not.toBeNull();
  const heat = Number(heatLine![1]);
  await plainWords(page, 'taken in');
  await result.getByTestId('result-buttons').getByRole('button').first().click();
  await expect(page).toHaveURL(/\/held$/);
  const held = page.getByTestId('held');
  const minutes = Math.min(60, 20 + Math.floor(heat / 2));
  await expect(held).toContainText(new RegExp(`(?<!\\d)(${minutes - 1}|${minutes}) minutes`));
  await expect(held).toContainText("The branch has taken today's orders off the board.");
  await expect(held).toContainText(
    /The door opens (in \d+ min|at \d\d:\d\d) either way, and Energy keeps refilling in here\./,
  );
  await plainWords(page, 'the cells');
  expect(await smallTargets(page, '[data-testid=held]')).toEqual([]);

  // A second account, standing in Coalport, reads the station's list.
  const other = await browser.newContext({
    viewport: { width: 390, height: 844 },
    baseURL: test.info().project.use.baseURL,
  });
  const p2 = await other.newPage();
  await newMember(p2, 'alliance', 'Qa Onlooker');
  await lift(p2, { level: 10, rank: 3, iron: 1000 });
  await dev(p2, 'goto', 'coalport');
  await p2.goto('/city/coalport?loc=coalport.harbour-police');
  const list = p2.getByTestId('cells-now');
  await expect(list).toContainText(/In the cells now/i);
  await expect(list.getByTestId('cells-now-row').filter({ hasText: 'Qa Taken' })).toContainText(
    /out in \d+ min/,
  );
  // #17: the Alliance in the cells reads Legal Aid, and its note.
  await dev(p2, 'cells');
  await p2.goto('/held');
  const aid = p2.getByTestId('held-legal-aid');
  await expect(aid).toHaveText('Legal Aid · the Alliance pays half your bail');
  await aid.click();
  await expect(p2.getByTestId('help-note').first()).toContainText(
    'The Alliance runs a legal-aid desk in every town.',
  );
  await other.close();

  // Bail: the release modal's lines; the orders panel reads off.
  await page.goto('/held');
  await page.getByTestId('held-bail').click();
  const release = politicalModal(page);
  await expect(release).toContainText(/Heat \d+ → 25 · Noticed/);
  await expect(release).toContainText('Your record: taken in · 1 mark · On file');
  await expect(release).toContainText('Orders off until the day turns');
  await expect(release).toContainText('−150 Iron · bail');
  await release.getByTestId('political-continue').click();
  // Fix round: wait for Continue to land (it marks the release seen) before leaving, or the release
  // modal is shown again on the next page.
  await expect(release).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await page.goto('/city/coalport');
  await expect(page.getByTestId('orders-off').filter({ visible: true }).first()).toHaveText(
    'Orders off today · the branch heard about the cells',
  );
});

// ---------------------------------------------------------------------------------------------------
// #4, #12, #24, #25 The HUD.
// ---------------------------------------------------------------------------------------------------

async function tapLabel(page: Page, testId: string) {
  const box = (await page.getByTestId(testId).filter({ visible: true }).first().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('#4 #12 #24 #25 the HUD: Heat as its own line, each label its own note, the ladder, Health at full, the clock follows the dev clock', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await newMember(page, 'collective', 'Qa Gauges');
  await lift(page, { pc: 12, fxp: 1212 });
  await dev(page, 'heat', '60');
  await page.goto('/city/coalport');
  const heat = page.getByTestId('hud-heat-line');
  await expect(heat).toHaveText('Heat 60 · Hot');
  const style = await heat.evaluate((e) => {
    const word = [...e.querySelectorAll('*')].find((x) => x.textContent === 'Hot');
    return {
      size: getComputedStyle(e).fontSize,
      color: getComputedStyle(e).color,
      word: word && getComputedStyle(word).color,
    };
  });
  expect(style.size).toBe('13px');
  expect(style.word, 'the state word in its own colour').not.toBe(style.color);
  await expect(page.getByTestId('hud-health')).toContainText(/100 \/ 100/);
  await expect(page.getByTestId('hud-health')).toBeVisible();

  await tapLabel(page, 'hud-heat-line');
  await expect(page.getByTestId('help-note').first()).toContainText(/^HEAT · HOT/i);
  await expect(page.getByTestId('help-note').first()).toContainText(
    /Cool (at \d\d:\d\d|tomorrow \d\d:\d\d|in \d+ min|\w+day( \d\d:\d\d)?)\./,
  );
  await page.keyboard.press('Escape');
  await tapLabel(page, 'hud-pc');
  await expect(page.getByTestId('help-note').first()).toContainText(/^POLITICAL CAPITAL/i);
  await page.keyboard.press('Escape');
  await tapLabel(page, 'hud-fxp-rank');
  const ladder = page.getByTestId('rank-ladder');
  await expect(ladder.getByTestId('rank-row')).toHaveCount(7);
  await expect(ladder.getByTestId('rank-you')).toHaveCount(1);
  await expect(ladder).toContainText(/next · 788 more/i);
  expect(await smallTargets(page, '[data-testid=rank-ladder]')).toEqual([]);
  await page.keyboard.press('Escape');
  await page.goto('/me');
  await expect(page.locator('main')).toContainText('Red Collective · Activist · 1,212 / 2,000 to Organiser');
  await expect(page.locator('main')).toContainText(
    /60 · Hot · Cool (at \d\d:\d\d|tomorrow \d\d:\d\d|in \d+ min|\w+day( \d\d:\d\d)?)/,
  );

  // The clock shows the server's clock (the dev clock), and follows the dev panel's +1 hour.
  const hud = page.getByTestId('hud-clock-time');
  /** Minutes between the HUD's time and the server clock in the browser's zone (0 when it shows it). */
  const offBy = async () => {
    const shown = await hud.innerText();
    const at = await clockNow(page);
    const [h, m] = await page.evaluate((n) => [new Date(n).getHours(), new Date(n).getMinutes()], at);
    const [sh, sm] = shown.split(':').map(Number) as [number, number];
    const d = (((sh * 60 + sm - (h! * 60 + m!)) % 1440) + 1440) % 1440;
    return Math.min(d, 1440 - d);
  };
  await expect.poll(offBy, { timeout: 10_000 }).toBeLessThanOrEqual(1);
  const before = await hud.innerText();
  await page.getByTestId('dev-toggle').click();
  await page
    .getByTestId('dev-panel')
    .getByRole('button', { name: /\+1 hour/ })
    .click();
  await expect(page.getByTestId('dev-line')).toContainText('Now');
  await page.keyboard.press('Escape');
  await expect(hud).not.toHaveText(before);
  await expect.poll(offBy, { timeout: 10_000 }).toBeLessThanOrEqual(1);
});

test('R4-QA-03: held sideways, a tap on the Party XP label opens the ladder, not the clock', async ({
  page,
}) => {
  // Answers §25 / build notes #25: "Tap the Party XP label for the rank ladder". At 667 × 375 the
  // clock's 44 px target (HudClock, -my-[15px]) reaches over the label's middle and right.
  // R4-QA-03: fixed in the QA fix round (was an expected failure).
  await page.setViewportSize({ width: 667, height: 375 });
  await newMember(page, 'collective', 'Qa Sideways');
  await lift(page, { pc: 12, fxp: 1212 });
  await page.goto('/city/coalport');
  await tapLabel(page, 'hud-fxp-rank');
  await expect(page.getByTestId('rank-ladder')).toBeVisible();
});

// ---------------------------------------------------------------------------------------------------
// #5, #6 and the countdown style.
// ---------------------------------------------------------------------------------------------------

test('R4-QA-01: after placing the point the line reads "Level 2 · Strength 8 → 9" (answers §5)', async ({
  page,
}) => {
  // R4-QA-01: fixed in the QA fix round (was an expected failure).
  await newMember(page, 'collective', 'Qa Level');
  await lift(page, { xp: 145 });
  await page.goto('/city/coalport?loc=coalport.mill-gate');
  await placeSheet(page)
    .locator('[data-testid^="ticket-"]')
    .first()
    .getByRole('button', { name: /, once, / })
    .click();
  const modal = stampModal(page);
  const line = modal.getByTestId('effect-level');
  // Review 5 (answers §4.1): the line and *Place it*; the picker is a sheet over the modal.
  await expect(line).toContainText('Level 2 · one point to place');
  await line.getByRole('button', { name: 'Place it' }).click();
  await page.getByRole('dialog', { name: 'Level 2 · one point to place' }).getByRole('button', { name: 'Strength 8 → 9' }).click();
  await expect(line).not.toContainText('to place');
  await expect(line).toContainText('Level 2 · Strength 8 → 9');
});

test("R4-QA-02: the job orders' pay time is in the one countdown style (answers §4.2)", async ({ page }) => {
  // The Jobs card reads "paid tomorrow 03:00" (deviation 7); the three welcome orders' lines still
  // say "Paid at midnight", which is neither the style nor the day's turn in the player's clock.
  // R4-QA-02: fixed in the QA fix round (was an expected failure).
  await newMember(page, 'collective', 'Qa Wages');
  await expect(page.getByTestId('orders')).not.toContainText(/midnight/i);
  await expect(page.getByTestId('orders')).toContainText(/The first wage lands (tomorrow \d\d:\d\d|at \d\d:\d\d)\./);
  await expect(page.getByTestId('orders')).not.toContainText('{at}');
});

// ---------------------------------------------------------------------------------------------------
// #3 The paper on a desk; #23 local editions; #13 orders away.
// ---------------------------------------------------------------------------------------------------

test('#3 the paper on a desk at 1920 × 1080, unchanged at 959', async ({ page }) => {
  await newMember(page, 'collective', 'Qa Desk');
  await page.setViewportSize({ width: 1920, height: 1080 });
  const sheet = page.getByTestId('paper-sheet');
  await expect(sheet).toBeVisible();
  const s = await page.evaluate(() => {
    const e = document.querySelector('[data-testid=paper-sheet]')!;
    const d = document.querySelector('[data-testid=paper-desk]')!;
    const b = e.getBoundingClientRect();
    return {
      width: Math.round(b.width),
      centre: Math.round(b.x + b.width / 2),
      shadow: getComputedStyle(e).boxShadow,
      edge: getComputedStyle(e).borderTopWidth,
      desk: getComputedStyle(d).backgroundColor,
    };
  });
  expect(s.width).toBe(720);
  expect(Math.abs(s.centre - 960)).toBeLessThanOrEqual(2);
  expect(s.shadow).toContain('24px 48px');
  expect(s.edge).toBe('3px');
  expect(s.desk).toBe('rgb(28, 26, 23)');
  await page.setViewportSize({ width: 959, height: 800 });
  expect(await sheet.evaluate((e) => getComputedStyle(e).display)).toBe('contents');
  expect(await sideScroll(page)).toBeLessThanOrEqual(0);
});

test('#23 #13 rival ground: the Duskwall edition of your own paper, and the home orders one quiet 36 px line', async ({
  page,
}) => {
  await newMember(page, 'collective', 'Qa Abroad');
  await lift(page, { level: 10, rank: 3 });
  await dev(page, 'goto', 'duskwall');
  await page.goto('/city/duskwall');
  const away = page.getByTestId('orders-away').filter({ visible: true }).first();
  await expect(away).toHaveText(/^Your orders are in Coalport · \d of 3 done$/);
  expect(Math.round((await away.boundingBox())!.height)).toBe(36);
  expect(await away.evaluate((e) => !!e.closest('button, a, [role=button]'))).toBe(false);
  await page.goto('/paper');
  await expect(page.getByRole('heading', { name: 'The Coalport Clarion' })).toBeVisible();
  await expect(page.getByTestId('edition-line')).toHaveText('· Duskwall edition');
  await expect(page.getByTestId('dateline')).toContainText(/· Duskwall$/);
  await expect(page.getByTestId('local-election')).toHaveText(
    /^Duskwall elects its council: (names go in|voting) until /,
  );
  await expect(page.getByTestId('issue-row').first()).toContainText(/^DUSKWALL/i);
  await page.getByTestId('edition-line').click();
  await expect(page.getByTestId('help-note').first()).toContainText(
    'Your paper is the paper of where you live.',
  );
  await page.keyboard.press('Escape');
  await plainWords(page, 'the Duskwall edition');
  // At home: no edition line.
  await lift(page, { cityId: 'coalport' });
  await page.goto('/paper');
  await expect(page.getByTestId('dateline')).toContainText(/· Coalport$/);
  await expect(page.getByTestId('edition-line')).toHaveCount(0);
});

// ---------------------------------------------------------------------------------------------------
// The browser audit at six screen sizes (QA review 4 §2.5, §8; finished in the fix round): every
// review-4 screen walked at 390 × 844, 375 × 667, 360 × 640, 667 × 375 (sideways), 1440 × 900 and
// 1920 × 1080, under reduced motion. On each: no control under 44 px either way, no sideways scroll,
// nothing animating; on the maps, the pins and labels clear of the sheets.
// ---------------------------------------------------------------------------------------------------

const AUDIT_SIZES = [
  [390, 844],
  [375, 667],
  [360, 640],
  [667, 375],
  [1440, 900],
  [1920, 1080],
] as const;

const auditLift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok(), 'character hook').toBe(true));
const auditDev = (page: Page, action: string) =>
  page.request.post(`/api/test/dev/${action}`, { data: {} }).then((r) => expect(r.ok(), `dev ${action}`).toBe(true));
const auditClock = async (page: Page): Promise<number> =>
  ((await (await page.request.post('/api/test/clock', { data: { advanceMs: 0 } })).json()) as { now: number }).now;
const auditBox = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Visible, enabled controls under 44 px either way (the dev panel's own button aside). */
async function auditTargets(page: Page, root = 'body'): Promise<string[]> {
  return page.evaluate((rootSel) => {
    const out: string[] = [];
    for (const r of document.querySelectorAll(rootSel))
      for (const el of r.querySelectorAll('button, a[href], [role=button], [role=radio], [role=tab], input:not([type=hidden]), select')) {
        if (el.closest('[aria-hidden=true], [inert], [data-testid=dev-panel]')) continue;
        if (el.getAttribute('data-testid') === 'dev-toggle') continue;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none' || s.pointerEvents === 'none') continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        // A visually hidden radio behind its tile: the tile is the target.
        if (el.tagName === 'INPUT' && (b.width <= 1 || b.height <= 1)) continue;
        // A target widened by an absolutely placed ::after / ::before (`after:-inset-y-[16px]`): its box.
        let w = b.width;
        let h = b.height;
        for (const pseudo of ['::after', '::before']) {
          const p = getComputedStyle(el, pseudo);
          if (p.content === 'none' || p.display === 'none' || p.position !== 'absolute') continue;
          const px = (v: string) => (v.endsWith('px') ? parseFloat(v) : 0);
          w = Math.max(w, b.width - px(p.left) - px(p.right));
          h = Math.max(h, b.height - px(p.top) - px(p.bottom));
        }
        // Off-screen (scrolled away) is still measured: a control's size does not depend on scroll.
        if (w < 43.5 || h < 43.5)
          out.push(
            `${(el.getAttribute('aria-label') ?? el.textContent ?? el.getAttribute('data-testid') ?? '').trim().slice(0, 48)} ${Math.round(b.width)}×${Math.round(b.height)}`,
          );
      }
    return out;
  }, root);
}

/**
 * Nothing moving once the screen has settled (reduced motion): no running animation of anything but
 * opacity (a fade is not motion; the map's clouds fade in place, `reducedMotionOpacity`).
 */
async function auditStill(page: Page): Promise<string[]> {
  await page.waitForTimeout(400);
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .filter((a) => {
        const frames = (a.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
        const props = new Set(
          frames.flatMap((f) => Object.keys(f).filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k))),
        );
        return [...props].some((p) => p !== 'opacity');
      })
      .map((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
        return `${(a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'animation'} on ${t?.getAttribute('data-testid') ?? t?.className?.toString().slice(0, 40) ?? t?.tagName}`;
      }),
  );
}

async function auditScreen(page: Page, label: string, root = 'body') {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  expect(await auditTargets(page, root), `${label}: controls under 44 px`).toEqual([]);
  const side = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(side, `${label}: sideways scroll`).toBeLessThanOrEqual(0);
  expect(await auditStill(page), `${label}: animating under reduced motion`).toEqual([]);
}

/**
 * The place sheet's own pin, and its label, are not under the sheet (zoom-to-place) where the map stays
 * live beside it (phones, `data-layout="sheet"`). From 640 px wide the sheet is a modal panel over the
 * dimmed map by design (review 2 #2: the map no longer matters once a place is open).
 */
async function auditPinClear(page: Page, label: string) {
  const sheet = page.locator('[role=dialog][data-layout]');
  await expect(sheet).toBeVisible();
  if ((await sheet.getAttribute('data-layout')) === 'panel') return;
  await page.waitForTimeout(700);
  const s = (await sheet.boundingBox())!;
  const pin = page.locator('[data-testid=hotspot][aria-pressed=true], [data-testid=hotspot][aria-current]').first();
  if ((await pin.count()) === 0) return;
  const p = (await pin.boundingBox())!;
  expect(auditBox(p, s), `${label}: the place's pin under its sheet`).toBe(false);
}

for (const [w, h] of AUDIT_SIZES) {
  test(`audit ${w} × ${h}: targets, sideways scroll, labels clear of sheets, reduced motion`, async ({ browser }, info) => {
    test.setTimeout(240_000);
    const touch = w < 768 || h < 500;
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      reducedMotion: 'reduce',
      hasTouch: touch,
      isMobile: touch,
      baseURL: info.project.use.baseURL,
    });
    const page = await context.newPage();

    // Coming home (review 5, answers §19): the counter, the kitbag, the post.
    await signUpOnly(page, `Audit ${w}x${h}`);
    await expect(platformRow(page, 'collective')).toBeVisible();
    await auditScreen(page, 'beat 1, the counter');
    await platformRow(page, 'collective').click();
    await page.getByTestId('story-confirm').click();
    await expect(page.getByRole('heading', { name: 'The kitbag' })).toBeVisible();
    await auditScreen(page, 'beat 2, the compartment');
    await answer(page, ANSWERS.slice1[0]!);
    await expect(page.getByRole('heading', { name: 'The post' })).toBeVisible();
    await auditScreen(page, 'beat 3, the post');
    await answer(page, ANSWERS.slice1[1]!);
    await expect(page).toHaveURL(/\/paper$/);
    await auditScreen(page, 'the welcome edition');

    // A home city as one map, its HQ (the favour) and its Town Hall (answers §11, §21).
    await page.goto('/city/coalport');
    await expect(page.getByTestId('city-map')).toBeVisible();
    await auditScreen(page, 'Coalport');
    await page.goto('/city/coalport?loc=coalport.union-hall');
    await auditPinClear(page, 'the Union Hall');
    await auditScreen(page, 'the Union Hall sheet');
    await page.goto('/city/coalport?loc=coalport.town-hall');
    await auditPinClear(page, 'the Town Hall');
    await auditScreen(page, 'the Town Hall sheet');

    // The Me tab and the rank ladder (answers §25).
    await auditLift(page, { pc: 12, fxp: 1212 });
    await page.goto('/me');
    await expect(page.getByTestId('me-rank')).toBeVisible();
    await auditScreen(page, 'the Me tab');
    await page.getByTestId('me-rank-help').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await auditScreen(page, 'the rank note', '[role=dialog]');
    await page.keyboard.press('Escape');

    // The capital: the overview, a district, the lodgings, the City Hall (answers §8, §9, §11).
    await auditDev(page, 'level10');
    await auditLift(page, { iron: 1000 });
    await auditDev(page, 'irongate');
    await page.goto('/city/irongate/overview');
    await expect(page.getByTestId('district-outline').first()).toBeAttached();
    await auditScreen(page, 'the capital overview');
    await page.goto('/city/irongate/irongate.station-market?loc=irongate.tram-junction');
    await auditPinClear(page, 'Tram Junction');
    await auditScreen(page, 'Tram Junction and the Lodgings card');
    await page.goto('/city/irongate/irongate.government-quarter?loc=irongate.city-hall');
    await auditPinClear(page, 'the City Hall');
    await auditScreen(page, 'the City Hall sheet');

    // The journey on the nation map: the pin, its label and the plate; the card; the arrival (§7).
    await page.goto('/nation');
    await auditScreen(page, 'the nation map');
    await page.getByRole('button', { name: /^Coalport · home · \d+ min$/ }).click();
    await page.getByRole('button', { name: /^Board · \d+ Iron · \d+ min$/ }).click();
    await expect(page).toHaveURL(/\/journey$/);
    const journey = page.getByTestId('journey');
    await expect(journey).toHaveAttribute('data-card-at', /^\d+$/);
    await expect(page.getByTestId('travel-pin-label')).toHaveText(/^To Coalport · in \d+ min$/);
    const plate = (await page.getByTestId('journey-plate').boundingBox())!;
    for (const id of ['travel-pin-mark', 'travel-pin-label']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(auditBox(b, plate), `the journey: ${id} under the plate`).toBe(false);
    }
    await auditScreen(page, 'the journey');
    // The card at its moment (the first journey always carries one).
    const cardAt = Number(await journey.getAttribute('data-card-at'));
    await page.request.post('/api/test/clock', { data: { advanceMs: Math.max(0, cardAt - (await auditClock(page)) + 1_000) } });
    await page.reload();
    await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible({ timeout: 15_000 });
    await auditScreen(page, 'the card on the way', '[role=dialog]');
    await page.keyboard.press('Escape');
    // The arrival: *In Coalport* under the pin, and the modal.
    expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
    await page.reload();
    await expect(page.getByTestId('travel-pin-label')).toHaveText('In Coalport');
    await expect(page.getByRole('dialog')).toBeVisible();
    await auditScreen(page, 'the arrival', '[role=dialog]');
    await context.close();
  });
}
