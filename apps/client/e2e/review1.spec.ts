import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ANSWERS, arrive, signUpOnly } from './helpers';

/**
 * Review 1 (30 Sep 2026; `docs/review/2026-09-30-review-1.md`, answers in
 * `docs/design/review-1-answers.md`): a new Vanguard's first minutes on a phone. The welcome set by
 * best stat and the landing on its pin, First day +10 %, the stat named on the ticket, the plate's
 * first-time hint and the notes behind the labels, an order opening its pin with the ticket marked,
 * the committee on the best stat, the job as a wage, a signed order line, and the secretary's note
 * when all three are done.
 */
const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });

test.use({ viewport: { width: 375, height: 812 } });

test('a new Vanguard: best-stat welcome, notes, the wage, signed lines and the orders-complete note', async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Review 4 (GDD §8.5): the Vanguard tuning character (Stahl · tools): STR 14, so slot A is STR's.
  await signUpOnly(page, 'Otto Brandt', 1);
  await arrive(page, { faction: 'vanguard', answers: ANSWERS.reference });
  await expect(page.getByTestId('headline').first()).toContainText(
    "The League's letter waits at Beacon House; start there.",
  );
  const orders = page.getByTestId('orders').getByTestId('order');
  await expect(orders.nth(0)).toContainText('Talk to the customs men at the Fortress Gate');
  await expect(orders.nth(1)).toContainText("Get the stamp at Beacon House");
  await expect(orders.nth(2)).toContainText('Take a job at the Fortress Gate');

  // Review 4 (§7.5): the first landing opens the HQ with the favour highlighted.
  await page.getByRole('button', { name: 'To the city' }).click();
  await expect(page).toHaveURL(/\/city\/duskwall\?loc=duskwall\.beacon-house&act=duskwall\.beacon-house\.favour/);
  let sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Beacon House' })).toBeVisible();
  await expect(sheet.getByTestId('ticket-duskwall.beacon-house.favour')).toHaveAttribute('data-highlight', 'true');
  await sheet.getByRole('button', { name: /^Close/ }).click();
  // Slot A's pin: the ticket names its stat; First day +10 %.
  await page
    .getByTestId('order-pin')
    .filter({ visible: true })
    .filter({ hasText: 'Talk to the customs men at' })
    .click();
  sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Fortress Gate' })).toBeVisible();
  const gate = sheet.getByTestId('ticket-duskwall.garrison-gate.canvass');
  await expect(gate.getByTestId('ticket-odds')).toHaveText('Good odds · Strength');
  await expect(gate.getByTestId('ticket-tags')).toContainText('First day in Duskwall · better odds');
  // The job is a wage: no shift ticket; take it (free, no Energy) and Take a job is done.
  await expect(sheet.getByTestId('job-duskwall-stores-hand')).toContainText(
    /216 a day · paid (at|tomorrow) \d\d:\d\d/,
  );
  await sheet.getByRole('button', { name: 'Take the job' }).click();
  await expect(sheet.getByTestId('job-duskwall-stores-hand')).toContainText(
    'Taken · party order complete: +20 Party XP',
  );
  await expect(page.getByTestId('hud-energy')).toHaveText('100 / 100');
  await sheet.getByRole('button', { name: /^Close/ }).click();

  // The plate's first-time hint and the notes behind the labels (tap the label, no icons).
  await expect(page.getByTestId('plate-hint')).toHaveText(
    'Anything underlined can be tapped for what it means.',
  );
  await page.getByTestId('hud-help').click();
  let note = page.getByTestId('help-note');
  await expect(note).toContainText('Every action costs Energy.');
  // Review 4 #25: the Party XP note points at the ladder, and carries its button.
  await expect(note).toContainText('Ranks give rights: tap for the ladder.');
  await expect(note.getByRole('button', { name: 'See the ranks' })).toBeVisible();
  await note.getByRole('button', { name: 'Close' }).click();
  await page.getByTestId('standing-help').click();
  note = page.getByTestId('help-note');
  await expect(note).toContainText('How well Duskwall knows your face.');
  await note.getByRole('button', { name: 'Close' }).click();
  await page.getByTestId('plate-help').click();
  await expect(page.getByTestId('help-note')).toContainText('Who holds Duskwall');
  await page.getByTestId('help-note').getByRole('button', { name: 'Close' }).click();

  // An order opens its pin with the matching ticket marked (answers §3).
  await page
    .getByTestId('order-pin')
    .filter({ visible: true })
    .filter({ hasText: 'Talk to the customs men at' })
    .click();
  sheet = page.getByRole('dialog');
  await expect(sheet.getByTestId('ticket-duskwall.garrison-gate.canvass')).toHaveAttribute(
    'data-highlight',
    'true',
  );
  // Two canvasses: the second completes the order, a signed line from Stahl ("One remains").
  await sheet
    .getByRole('button', { name: 'Talk to the customs men coming off shift, three times, 30 Energy' })
    .click();
  let modal = modalOf(page);
  // Review 2: no odds or roll in the rows; the outcome words only.
  await expect(modal.getByTestId('attempt-outcome').first()).toHaveText(/^(Success|Partial)$/);
  await expect(modal.getByTestId('attempt-row').first()).not.toContainText(/Rolled|\d+ %/);
  await expect(modal.getByTestId('effect-order-signed')).toHaveText(
    'Order carried out · +20 Party XP. One remains. — V.S.',
  );
  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('orders-complete')).toHaveCount(0);
  await sheet.getByRole('button', { name: /^Close/ }).click();

  // The favour (review 4, answers §2.6), a council session on the best stat: "your best, Strength".
  await page
    .getByTestId('order-pin')
    .filter({ visible: true })
    .filter({ hasText: "Get the stamp" })
    .click();
  sheet = page.getByRole('dialog');
  const committee = sheet.getByTestId('ticket-duskwall.beacon-house.favour');
  await expect(committee.getByTestId('ticket-odds')).toHaveText('Good odds · your best, Strength');
  await expect(committee).toHaveAttribute('data-highlight', 'true');
  await committee.getByRole('button', { name: /, once, 10 Energy$/ }).click();
  modal = modalOf(page);
  await expect(modal.getByTestId('effect-order-signed')).toHaveText(
    // Review 4 #6 (answers §6): the third line says what follows, in Stahl's voice.
    "Order carried out · +20 Party XP. That's all three; Stahl's note follows when you close this.",
  );
  await expect(modal.getByTestId('effect-all-orders')).toHaveText(
    'All orders carried out · +5 Political Capital',
  );
  await modal.getByRole('button', { name: 'Continue' }).click();

  // The secretary's note follows the result, waits across a reload, and goes with Carry on.
  const done = page.getByTestId('orders-complete');
  await expect(done).toContainText('Orders carried out');
  await expect(done).toContainText('Three of three, Otto Brandt.');
  await expect(done.getByTestId('tile-pc')).toHaveText(/\+5/);
  await expect(done.getByTestId('tile-orders-fxp')).toHaveText(/\+60/);
  await page.reload();
  await expect(page.getByTestId('orders-complete')).toBeVisible();
  await page.getByTestId('orders-complete').getByRole('button', { name: 'Carry on' }).click();
  await expect(page.getByTestId('orders-complete')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('hud-energy')).toBeVisible();
  await expect(page.getByTestId('orders-complete')).toHaveCount(0);
  await expect(page.getByTestId('hud-pc')).toHaveText('5');
});
