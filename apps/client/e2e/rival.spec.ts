import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, openLocation, signUp } from './helpers';

/**
 * Slice 5's rival ground (tech design §15.1 `rival.spec.ts`; screens §8), on a phone: a Collective at
 * Level 10 boards for Duskwall from its nation card; the checkpoint's card waves them on; the arrival
 * warns once; the plate says *rival ground* and what the work draws from; a ticket has one button,
 * *Once*, and the rival tag; a tap there with a run-in left to luck; Hot and caught at Beacon House:
 * the cells with double bail; released, the train home; and Duskwall barred on the nation map.
 */

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const street = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/street', { data }).then((r) => expect(r.ok()).toBe(true));
const resultModal = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
const duskwallPin = (page: Page) => page.locator('[data-testid=hotspot][aria-label^="Duskwall"]');

test('rival ground: board → Papers, please → the plate → Once → the cells → the train home → barred', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await signUp(page, 'Mara Lenk');
  await lift(page, { level: 10, rank: 3, iron: 900 });

  // 1. Nation: Duskwall's card, *Rival ground · Home city of the Vanguard*, Board.
  await page.goto('/nation');
  await expect(duskwallPin(page)).toHaveAttribute('aria-label', /^Duskwall · rival ground · \d+ min$/);
  await duskwallPin(page).click();
  const card = page.getByTestId('city-card');
  await expect(card.getByTestId('city-rival')).toHaveText('Rival ground · Home city of the Vanguard');
  await expect(card.getByTestId('city-lock')).toContainText('Everything is harder here.');
  await expect(card.getByTestId('city-board')).toHaveText(/^Board · 20 Iron · \d+ min$/);
  await card.getByTestId('city-board').click();

  // 2. The journey: *Papers, please*; *Show your papers* has no odds word → *Waved on*. Arrive now.
  await expect(page).toHaveURL(/\/journey$/);
  const jcard = page.getByTestId('journey-card');
  await expect(jcard).toContainText('Papers, please');
  const show = jcard.getByTestId('journey-choice').filter({ hasText: 'Show your papers' });
  await expect(show.getByTestId('journey-choice-line')).toHaveText(
    /^your party card · it depends on your Heat and your record$/i,
  );
  await show.click();
  await expect(jcard.getByTestId('journey-outcome')).toContainText('Waved on');
  expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
  await page.reload();

  // 3. The arrival: *Duskwall · The Fortress · rival ground* and the warning. Continue.
  const arrival = page.getByRole('dialog').filter({ has: page.getByTestId('arrival-continue') });
  await expect(arrival).toContainText('Duskwall · The Fortress · rival ground');
  await expect(arrival.getByTestId('arrival-rival')).toHaveText(
    'Rival ground: Heat doubles here, every tap can bring a run-in, and nothing you own is at risk.',
  );
  await arrival.getByTestId('arrival-continue').click();
  await expect(page).toHaveURL(/\/city\/duskwall/);
  await mapAtRest(page);

  // 4. The plate, a ticket with only *Once* and the rival tag, the orders line.
  await expect(page.getByTestId('plate-rival').filter({ visible: true })).toHaveText(
    'Duskwall · rival ground',
  );
  await expect(page.getByTestId('plate-pressure').filter({ visible: true })).toContainText(
    "Your work here draws from the Vanguard's morale",
  );
  // Review 4 #13: away, the orders are one quiet line with the day's count.
  await expect(page.getByTestId('orders-away').filter({ visible: true }).first()).toHaveText(
    /^Your orders are in Coalport · \d of 3 done$/,
  );
  const gate = await openLocation(page, '1. Fortress Gate');
  const ticket = gate.locator('div[data-testid^="ticket-duskwall."]').first();
  await expect(ticket.getByTestId('ticket-once')).toBeVisible();
  await expect(ticket.getByTestId('ticket-three')).toHaveCount(0);
  // +75 % when Duskwall is in Unrest (the earlier projects' shared state can put it there).
  await expect(ticket.getByTestId('ticket-tags')).toContainText(/Rival ground · \+(50|75) % Party XP · worse odds/);

  // 5. *Once* with a run-in left to luck: the receipt's rival ground part and the opinion against.
  await street(page, { runIn: 'next', opponentId: 'street-enforcer', choiceRoll: 1, checkRoll: 1 });
  await ticket.getByTestId('ticket-once').click();
  await expect(page.getByTestId('run-in')).toBeVisible();
  await page.getByTestId('run-in-luck').click();
  const tap = resultModal(page);
  await expect(tap.getByTestId('run-in-did')).toContainText(/^Luck chose to /);
  await expect(tap.getByTestId('reward-fxp')).toContainText('rival ground +');
  await expect(tap.getByTestId('reward-opinion')).toContainText('Opinion against the Vanguard');
  await tap.getByRole('button', { name: 'Continue' }).click();
  await expect(tap).toHaveCount(0);
  await gate.getByRole('button', { name: /^Close/ }).click();
  await mapAtRest(page);

  // 6. Heat 60, then Beacon House: *Spike the duplicator*, caught → *Taken in* → the cells, bail double.
  await lift(page, { heat: 60 });
  await street(page, { runIn: 'never', checkRoll: 99, caught: 'always' });
  await openLocation(page, '3. Beacon House');
  const spike = page.locator('[data-mission="duskwall.beacon-house.spike"]');
  await spike.scrollIntoViewIfNeeded();
  await spike.getByTestId('mission-choose').click();
  await page.getByTestId('briefing').getByTestId('way-row').first().click();
  await page.getByTestId('briefing-confirm').click();
  const caught = resultModal(page);
  await expect(caught.getByTestId('stamp')).toHaveText('Taken in');
  await caught.getByTestId('result-sent-to').click();
  await expect(page).toHaveURL(/\/held$/);
  await expect(page.getByTestId('held-bail-double')).toHaveText('Bail is double on rival ground');
  await expect(page.getByTestId('held-voice')).toContainText('"Visiting, were we."');

  // 7. Release now (the hook): *Put on the train* → the journey with no card. Arrive now: Coalport.
  expect((await page.request.post('/api/test/held', { data: { releaseNow: true } })).ok()).toBe(true);
  await page.reload();
  const deported = page.getByRole('dialog').filter({ has: page.getByTestId('political-continue') });
  await expect(deported.getByTestId('stamp')).toHaveText('Put on the train');
  await expect(deported.getByTestId('political-barred')).toContainText('Barred from Duskwall until');
  await deported.getByTestId('political-continue').click();
  await expect(page).toHaveURL(/\/journey$/);
  await expect(page.getByTestId('journey-title')).toContainText('to Coalport');
  await expect(page.getByTestId('journey-card')).toHaveCount(0);
  expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
  await page.reload();
  await page.getByTestId('arrival-continue').click();
  await expect(page).toHaveURL(/\/city\/coalport/);

  // 8. Nation: Duskwall reads *Barred · until …*, no Board button.
  await page.goto('/nation');
  await duskwallPin(page).click();
  await expect(page.getByTestId('city-card').getByTestId('city-lock')).toHaveText(
    // Review 4 (§23 Q6): a boundary prints its time: *14:00*, *tomorrow 01:00*, *Saturday 01:00*.
    /^Barred · until (\d\d:\d\d|tomorrow \d\d:\d\d|\w+day \d\d:\d\d)$/,
  );
  await expect(page.getByTestId('city-card').getByTestId('city-board')).toHaveCount(0);
});
