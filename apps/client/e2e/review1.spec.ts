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
  // The reference answers: STR 11 = INT 11, so the tie goes to the Vanguard's STR (answers §2).
  await signUpOnly(page, 'Otto Brandt', 1);
  await arrive(page, { faction: 'vanguard', answers: ANSWERS.reference });
  await expect(page.getByTestId('headline').first()).toContainText('Spend it at the Fortress Gate first.');
  const orders = page.getByTestId('orders').getByTestId('order');
  await expect(orders.nth(0)).toContainText('Canvass the customs shift at the Fortress Gate');
  await expect(orders.nth(1)).toContainText('Sit in on the committee at Beacon House');
  await expect(orders.nth(2)).toContainText('Take a job at the Fortress Gate');

  // The first landing opens slot A's pin; the ticket names its stat; First day +10 % (62 → 72).
  await page.getByRole('button', { name: 'To the city' }).click();
  await expect(page).toHaveURL(/\/city\/duskwall\?loc=duskwall\.garrison-gate/);
  let sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Fortress Gate' })).toBeVisible();
  const gate = sheet.getByTestId('ticket-duskwall.garrison-gate.canvass');
  await expect(gate.getByTestId('ticket-odds')).toHaveText('72 % · STR 11');
  // The job is a wage: no shift ticket; take it (free, no Energy) and Take a job is done.
  await expect(sheet.getByTestId('job-duskwall-stores-hand')).toContainText('216 a day · paid at midnight');
  await sheet.getByRole('button', { name: 'Take the job' }).click();
  await expect(sheet.getByTestId('job-duskwall-stores-hand')).toContainText(
    'Taken · party order complete: +20 FXP',
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
  await expect(note).toContainText('the vote at Steward, a council candidacy at Bailiff');
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
    .filter({ hasText: 'Canvass the customs shift' })
    .click();
  sheet = page.getByRole('dialog');
  await expect(sheet.getByTestId('ticket-duskwall.garrison-gate.canvass')).toHaveAttribute(
    'data-highlight',
    'true',
  );
  // Two canvasses: the second completes the order, a signed line from Stahl ("One remains").
  await sheet.getByRole('button', { name: 'Canvass the customs shift, three times, 30 Energy' }).click();
  let modal = modalOf(page);
  await expect(modal.getByTestId('attempt-odds').first()).toHaveText(
    'Your STR 11 is 3 above the 8 this needs: 62 %, and +10 % for your first day in Duskwall: 72 %.',
  );
  await expect(modal.getByTestId('effect-order-signed')).toHaveText(
    'Order carried out · +20 FXP. One remains. — V.S.',
  );
  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('orders-complete')).toHaveCount(0);
  await sheet.getByRole('button', { name: /^Close/ }).click();

  // The committee checks the best stat (answers §2): "your best, STR 11".
  await page
    .getByTestId('order-pin')
    .filter({ visible: true })
    .filter({ hasText: 'Sit in on the committee' })
    .click();
  sheet = page.getByRole('dialog');
  const committee = sheet.getByTestId('ticket-duskwall.beacon-house.committee');
  await expect(committee.getByTestId('ticket-odds')).toHaveText('72 % · your best, STR 11');
  await expect(committee).toHaveAttribute('data-highlight', 'true');
  await committee.getByRole('button', { name: /, once, 10 Energy$/ }).click();
  modal = modalOf(page);
  await expect(modal.getByTestId('effect-order-signed')).toHaveText(
    "Order carried out · +20 FXP. That's all three: see the note.",
  );
  await expect(modal.getByTestId('effect-all-orders')).toHaveText('All orders carried out · +5 PC');
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
