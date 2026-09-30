import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ANSWERS, answer, signUpOnly } from './helpers';

/**
 * Slice 2's question (tech design §14): does a brand-new player understand what to do in the first
 * ten minutes? Sign-up with a face → the origin (reloaded mid-way) → the street → the welcome
 * edition → the first pin's open sheet → one canvass → the modal. Once per faction, on every
 * project (phone, small phone, desktop), with the §12.3 layout checks and the first-session art
 * budget (ADR 0015: at most 1 MB of art on a phone).
 */
const CASES = [
  {
    faction: 'vanguard' as const,
    name: 'Iron Vanguard',
    city: 'duskwall',
    paper: 'The Duskwall Sentinel',
    welcome: 'Welcome to Duskwall',
    arrival: 'Kaspar Lind Arrives at Duskwall Station',
    secretary: '— V.S.',
    pin1: '1. Fortress Gate',
    canvass: 'Talk to the customs men coming off shift',
    // Review 1: STR 11 = INT 11 goes to the Vanguard's STR, the gate; review 2: odds as a word.
    odds: 'Good odds',
    order: 'Talk to the customs men at the Fortress Gate',
  },
  {
    faction: 'collective' as const,
    name: 'Red Collective',
    city: 'coalport',
    paper: 'The Coalport Clarion',
    welcome: 'Welcome to Coalport',
    arrival: 'Kaspar Lind Steps Off the Irongate Train',
    secretary: '— P.H.',
    pin1: '1. Mill Gate',
    canvass: 'Talk to the workers coming off shift',
    odds: 'Good odds',
    order: 'Talk to the workers at the Mill Gate',
  },
  {
    faction: 'alliance' as const,
    name: 'Civic Alliance',
    city: 'ashford',
    paper: 'The Ashford Gazette',
    welcome: 'Welcome to Ashford',
    arrival: 'Kaspar Lind Arrives on the Irongate Train',
    secretary: '— T.G.',
    pin1: '1. Gazette House',
    canvass: 'Talk to the printers coming off shift',
    odds: 'Good odds',
    order: 'Talk to the printers at Gazette House',
  },
];

/** No horizontal scroll at this width (§12.3). */
async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const c of CASES) {
  test(`arrival as the ${c.name}: sign-up → origin (reload mid-way) → street → welcome edition → first canvass`, async ({
    page,
  }, info) => {
    const phone = info.project.name !== 'desktop';
    let artBytes = 0;
    let counting = true;
    page.on('response', async (res) => {
      if (!counting || !new URL(res.url()).pathname.startsWith('/art/')) return;
      artBytes += (await res.body().catch(() => Buffer.alloc(0))).length;
    });

    await signUpOnly(page, 'Kaspar Lind', 2);
    await noSideScroll(page);

    // Step 1: the prompt and all three choices on the first screen, no numbers (§7.1, §12.3).
    const choices = page.getByTestId('story-choice');
    await expect(choices).toHaveCount(3);
    for (const ch of await choices.all()) await expect(ch).toBeInViewport();
    await expect(page.getByTestId('story-prompt')).toBeInViewport();
    await expect(page.getByTestId('story-waits')).toContainText('Close the game now and this waits for you');

    for (const text of ANSWERS.reference.slice(0, 3)) await answer(page, text);
    // Closing the tab keeps the place: the same question, with the echo of the talent.
    await page.reload();
    await expect(page.getByTestId('story-prompt')).toHaveText("“Take my coat. It's all I have left.”");
    await expect(page.getByTestId('story-echo')).toHaveText('You could fix anything.');
    for (const ch of await choices.all()) await expect(ch).toBeInViewport();
    await expect(page.locator('body')).not.toContainText(/\d{2,}/); // no numbers on an origin screen
    for (const text of ANSWERS.reference.slice(3)) await answer(page, text);

    // The street: the wish tag on the Collective's card (Justice); the confirm names the city.
    const card = page.getByRole('radio', { name: new RegExp(c.name) });
    await expect(page.getByTestId('wish-tag')).toHaveCount(1);
    await expect(page.getByRole('radio', { name: /Red Collective/ }).getByTestId('wish-tag')).toHaveText(
      'His wish · +50 Party XP',
    );
    await card.click();
    await expect(card.getByTestId('faction-facts')).toBeVisible();
    const join = page.getByTestId('join');
    await expect(join).toContainText(`Join the ${c.name} · take the train to`);
    await expect(join).toBeInViewport();
    await noSideScroll(page);
    await join.click();

    // The welcome edition.
    await expect(page).toHaveURL(/\/paper$/);
    await expect(page.getByRole('heading', { name: c.paper })).toBeVisible();
    await expect(page.getByTestId('headline')).toHaveCount(3);
    await expect(page.getByTestId('headline').nth(0)).toContainText(c.welcome);
    await expect(page.getByTestId('headline').nth(1)).toContainText(c.arrival);
    const orders = page.getByTestId('orders').getByTestId('order');
    await expect(orders).toHaveCount(3);
    for (const o of await orders.all()) await expect(o).toContainText(/0 \/ \d/);
    await expect(orders.last()).toContainText('Take a job');
    await expect(page.getByText(c.secretary)).toBeVisible();
    await expect(page.getByTestId('letters-row')).toContainText('Chapter 1 is ready · 10 Energy');
    await expect(page.getByTestId('desk')).toContainText('Wearing');
    await noSideScroll(page);

    // To the city: the first pin's sheet is open, pin 1 visible above it.
    await page.getByRole('button', { name: 'To the city' }).click();
    await expect(page).toHaveURL(new RegExp(`/city/${c.city}\\?loc=`));
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    // The open sheet hides the page from the accessibility tree (a modal): find the pin by its label.
    const pin1 = page.locator(`[data-testid="hotspot"][aria-label="${c.pin1}"]`);
    await expect(pin1).toBeInViewport({ ratio: 0.5 });
    if (phone) {
      // The pin's centre settles above the sheet (the map pans, and zooms if it must).
      await expect
        .poll(async () => {
          const pin = (await pin1.boundingBox())!;
          const top = (await sheet.boundingBox())!.y;
          return top - (pin.y + pin.height / 2);
        })
        .toBeGreaterThan(0);
    }
    const chanceTicket = sheet.locator('[data-testid^="ticket-"]').filter({ hasText: c.canvass }).first();
    await expect(chanceTicket.getByTestId('ticket-chance')).toHaveText(c.odds);
    await expect(chanceTicket).toContainText('Party order 0 / 2 · +25 % Party XP');
    await sheet.getByRole('button', { name: `${c.canvass}, once, 10 Energy` }).click();
    const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
    await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
    await expect(modal.getByTestId('effect-order')).toContainText(`1 / 2`);
    await expect(modal.getByText(c.order)).toBeVisible();
    counting = false;

    // ADR 0015: at most 1 MB of art on a phone from sign-up to the first result modal.
    info.annotations.push({ type: 'first-session art', description: `${Math.round(artBytes / 1024)} KB` });
    if (phone) expect(artBytes).toBeLessThanOrEqual(1024 * 1024);
  });
}
