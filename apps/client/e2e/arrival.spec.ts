import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ANSWERS, PLATFORM_ROWS, answer, signUpOnly } from './helpers';

/**
 * Slice 2's question (tech design §14), review 4's *The Last Train In* (GDD §7.1, §7.5; ADR 0073):
 * does a brand-new player understand what to do in the first ten minutes? Sign-up with a face → the
 * platform (whom you help is your party: a row, then the confirm) → the suitcase (reloaded) → the
 * lining → the welcome edition → the HQ's open sheet with the favour highlighted → the favour → the
 * modal. Eight taps from sign-up to the first result. Once per party, on every project (phone, small
 * phone, desktop), with the §12.3 layout checks and the first-session art budget (ADR 0015: at most
 * 1 MB of art on a phone).
 */
const CASES = [
  {
    faction: 'vanguard' as const,
    helper: 'Stahl',
    city: 'duskwall',
    town: 'Duskwall',
    paper: 'The Duskwall Sentinel',
    welcome: 'Welcome to Duskwall',
    arrival: 'Kaspar Lind Arrives at Duskwall Station',
    secretary: '— V.S.',
    echo: "You took Stahl's bundle.",
    hq: /^\d+\. Beacon House$/,
    favour: 'Hand out the bundle',
    order: "Hand out Stahl's bundle at Beacon House",
  },
  {
    faction: 'collective' as const,
    helper: 'Holm',
    city: 'coalport',
    town: 'Coalport',
    paper: 'The Coalport Clarion',
    welcome: 'Welcome to Coalport',
    arrival: 'Kaspar Lind Steps Off the Irongate Train',
    secretary: '— P.H.',
    echo: "You carried Holm's parcel.",
    hq: /^\d+\. Union Hall$/,
    favour: 'Deliver the parcel',
    order: "Deliver Holm's parcel at the Union Hall",
  },
  {
    faction: 'alliance' as const,
    helper: 'Grey',
    city: 'ashford',
    town: 'Ashford',
    paper: 'The Ashford Gazette',
    welcome: 'Welcome to Ashford',
    arrival: 'Kaspar Lind Arrives on the Irongate Train',
    secretary: '— T.G.',
    echo: "You witnessed Grey's signature.",
    hq: /^\d+\. Assembly Rooms$/,
    favour: 'Witness the signature',
    order: 'Witness the signature at the Assembly Rooms',
  },
];

/** No horizontal scroll at this width (§12.3). */
async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const c of CASES) {
  test(`arrival helping ${c.helper}: sign-up → platform → suitcase (reload) → lining → welcome edition → the favour`, async ({
    page,
  }, info) => {
    const phone = info.project.name !== 'desktop';
    let artBytes = 0;
    let counting = true;
    let taps = 0;
    page.on('response', async (res) => {
      if (!counting || !new URL(res.url()).pathname.startsWith('/art/')) return;
      artBytes += (await res.body().catch(() => Buffer.alloc(0))).length;
    });

    await signUpOnly(page, 'Kaspar Lind', 2);
    taps += 2; // the face, and Sign up (the name is typed)
    await noSideScroll(page);

    // Beat 1, the platform: three rows (a portrait, the ask, two lines), the note, the confirm.
    await expect(page.getByRole('heading', { name: 'The platform' })).toBeVisible();
    const rows = page.getByRole('radio');
    await expect(rows).toHaveCount(3);
    await expect(page.getByTestId('story-note')).toHaveText(
      'Whoever you help, you go with. Permanent: a Faction Reset token is the only way back.',
    );
    const confirm = page.getByTestId('story-confirm');
    await expect(confirm).toBeDisabled();
    await expect(confirm).toBeInViewport();
    await expect(page.getByTestId('story-waits')).toContainText('This waits for you · Step 1 of 3');
    const row = page.getByRole('radio', { name: PLATFORM_ROWS[c.faction] });
    await row.scrollIntoViewIfNeeded();
    await row.click();
    taps += 1;
    await expect(confirm).toHaveText(`Help ${c.helper} · the six o'clock to ${c.town}`);
    await noSideScroll(page);
    await confirm.click();
    taps += 1;

    // Beat 2, the suitcase, on the train to the helper's town; closing the tab keeps the place.
    await expect(page.getByRole('heading', { name: 'The suitcase' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'The suitcase' })).toBeVisible();
    await expect(page.getByTestId('story-echo')).toHaveText(c.echo);
    await expect(page.getByText(`The six o'clock to ${c.town} · the compartment`)).toBeVisible();
    const choices = page.getByTestId('story-choice');
    await expect(choices).toHaveCount(3);
    for (const ch of await choices.all()) await expect(ch).toBeInViewport();
    // No number on beats 2 and 3 (§7.1): the text and the choices (the footer counts the steps).
    for (const ch of await choices.all()) await expect(ch).not.toContainText(/\d/);
    await expect(page.getByText(/dozes against the window/)).not.toContainText(/\d/);
    await answer(page, ANSWERS.reference[0]!);
    taps += 1;

    // Beat 3, the lining.
    await expect(page.getByRole('heading', { name: 'The lining' })).toBeVisible();
    await expect(page.getByTestId('story-echo')).toHaveText('You carry books.');
    await answer(page, ANSWERS.reference[1]!);
    taps += 1;

    // The welcome edition: the deck names the favour at the HQ.
    await expect(page).toHaveURL(/\/paper$/);
    await expect(page.getByRole('heading', { name: c.paper })).toBeVisible();
    await expect(page.getByTestId('headline')).toHaveCount(3);
    await expect(page.getByTestId('headline').nth(0)).toContainText(c.welcome);
    await expect(page.getByTestId('headline').nth(0)).toContainText('start there.');
    await expect(page.getByTestId('headline').nth(1)).toContainText(c.arrival);
    const orders = page.getByTestId('orders').getByTestId('order');
    await expect(orders).toHaveCount(3);
    for (const o of await orders.all()) await expect(o).toContainText(/0 \/ \d/);
    await expect(orders.nth(1)).toContainText(c.order);
    await expect(orders.last()).toContainText('Take a job');
    await expect(page.getByText(c.secretary)).toBeVisible();
    await expect(page.getByTestId('letters-row')).toContainText('Chapter 1 is ready · 10 Energy');
    await expect(page.getByTestId('desk')).toContainText("Your father's coat");
    await noSideScroll(page);

    // To the city: the HQ's sheet is open with the favour first and highlighted.
    await page.getByRole('button', { name: 'To the city' }).click();
    taps += 1;
    await expect(page).toHaveURL(new RegExp(`/city/${c.city}\\?loc=.+&act=`));
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    // The HQ's pin is on the map (the open sheet hides the page from the accessibility tree).
    const labels = await page
      .locator('[data-testid="hotspot"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
    expect(labels.some((l) => c.hq.test(l))).toBe(true);
    const favour = sheet.locator('[data-testid^="ticket-"][data-highlight="true"]');
    await expect(favour).toHaveCount(1);
    await expect(favour).toContainText(c.favour);
    await expect(favour.getByTestId('ticket-chance')).toHaveText('Good odds');
    await expect(favour).toContainText('Party order 0 / 1 · +25 % Party XP');
    // Once only: no ×3.
    await expect(sheet.getByRole('button', { name: new RegExp(`^${c.favour}, three times`) })).toHaveCount(0);
    await sheet.getByRole('button', { name: `${c.favour}, once, 10 Energy` }).click();
    taps += 1;
    const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
    await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
    await expect(modal.getByTestId('effect-order')).toContainText('1 / 1');
    await expect(modal.getByText(c.order)).toBeVisible();
    counting = false;
    // GDD §7.5: eight taps from sign-up to the first result.
    expect(taps).toBe(8);

    // ADR 0015: at most 1 MB of art on a phone from sign-up to the first result modal.
    info.annotations.push({ type: 'first-session art', description: `${Math.round(artBytes / 1024)} KB` });
    if (phone) expect(artBytes).toBeLessThanOrEqual(1024 * 1024);
  });
}
