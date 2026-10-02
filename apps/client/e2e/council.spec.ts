import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers';

/**
 * Slice 3's core loop (tech design §14.2), on a phone, on the shared test clock (so it runs in its
 * own project, last): declare → the branch's endorsement through the day's orders → the ballot →
 * the count, lazily → the front page with ELECTED → the chamber → the ordinance changing a number.
 */
const advanceTo = async (page: Page, cycleDay: number) => {
  const res = await page.request.post('/api/test/clock', {
    data: { advanceTo: { cityId: 'coalport', cycleDay } },
  });
  expect(res.ok()).toBe(true);
};
const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
const noSideScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
};

/** The day's three orders through their pins; "Take a job" first, so the last one has a modal. */
async function doTheOrders(page: Page): Promise<void> {
  let lastModal = false;
  for (let guard = 0; guard < 30; guard++) {
    await page.request.post('/api/test/character', { data: { energy: 100 } });
    await page.goto('/city/coalport');
    const pins = page.getByTestId('order-pin').filter({ visible: true });
    await expect(page.getByTestId('orders').filter({ visible: true }).first()).toBeVisible();
    if ((await pins.count()) === 0) break;
    const job = pins.filter({ hasText: 'Take a job' });
    const pin = (await job.count()) > 0 ? job.first() : pins.first();
    const isJob = (await job.count()) > 0;
    await pin.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    if (isJob) {
      await sheet.getByRole('button', { name: 'Take the job' }).first().click();
      await expect(sheet.getByText(/Taken/)).toBeVisible();
      lastModal = false;
      continue;
    }
    const ticket = sheet
      .locator('[data-testid^="ticket-"]')
      .filter({ has: page.getByTestId('ticket-tags').filter({ hasText: /Party order \d/ }) })
      .first();
    // ×1 on a checked ticket; the one button of a training ticket.
    await ticket
      .getByRole('button', { name: /Energy$/ })
      .first()
      .click();
    const modal = modalOf(page);
    await expect(modal).toBeVisible();
    lastModal = (await modal.getByTestId('effect-branch').count()) > 0;
    const third = (await modal.getByTestId('effect-all-orders').count()) > 0;
    await modal.getByRole('button', { name: 'Continue' }).click();
    // Review 1 (GDD §13.7): the third order's modal is followed by the secretary's note.
    if (third) {
      const note = page.getByTestId('orders-complete');
      await expect(note).toContainText('All three done');
      await expect(note.getByTestId('tile-pc')).toHaveText(/\+5/);
      await note.getByRole('button', { name: 'Carry on' }).click();
      await expect(note).toBeHidden();
    }
  }
  expect(lastModal).toBe(true);
}

test('the first vote and the first seat: declare → endorsed → ballot → count → ELECTED → ordinance → in play', async ({
  page,
}) => {
  test.setTimeout(240_000);
  // 1. Coalport, nominations open; a new Collective member.
  await advanceTo(page, 0);
  await signUp(page, 'Mara Lenk');

  // 2. Lifted to Rank 3, One of Us in Coalport, 45 PC.
  const lift = await page.request.post('/api/test/character', {
    data: { fxp: 2000, successes: 200, pc: 45 },
  });
  expect(lift.ok()).toBe(true);
  await page.goto('/paper');
  const row = page.getByTestId('polling-day-row');
  // Review 2 (screens §2.1): the Election row; an eligible player's tap goes to stand.
  // On the count morning after an earlier cycle (the shared test clock), the last result leads the
  // row and its tap is the result; the city screen's card also offers Stand. Otherwise the call.
  await expect(row).toHaveAttribute('data-state', /^(candidates|result)$/);
  if ((await row.getAttribute('data-state')) === 'candidates') {
    await expect(row).toContainText('Candidates are putting their names in');
    await row.click();
  } else {
    await page.goto('/city/coalport');
    await page
      .getByTestId('election-card')
      .filter({ visible: true })
      .or(page.getByTestId('polling-day').filter({ visible: true }))
      .first()
      .click();
    await expect(page).toHaveURL(/\/council\/count$/);
    await page.goto('/council/slate');
  }

  // 3. Who's standing: three ticks, stand, the "You're standing" modal with its Next line.
  await expect(page).toHaveURL(/\/council\/slate$/);
  const card = page.getByTestId('declare-card');
  await expect(card).toContainText('✓ Rank 3, Organiser');
  await expect(card).toContainText('✓ Known in Coalport (200 wins)');
  await expect(card).toContainText('2 backers by');
  await card.getByRole('button', { name: 'Stand · 10 Political Capital' }).click();
  await expect(modalOf(page).getByTestId('stamp')).toHaveText("You're standing");
  await expect(modalOf(page)).toContainText('Your name is on the list');
  await expect(modalOf(page).getByTestId('political-next')).toHaveText(
    /^Next: find backers\. Voting opens \w+day\.$/,
  );
  await expect(modalOf(page).getByTestId('political-pc')).toHaveText('−10 Political Capital · 35 left');
  await modalOf(page).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('candidacy-endorsements')).toHaveText("You're standing · backers 0 of 2");
  // Review 2 (answers §4.6.2): the city screen's Election card says so too, without a reload.
  await page.goto('/city/coalport');
  await expect(
    page.getByTestId('polling-day-row').or(page.getByTestId('election-card')).first(),
  ).toContainText("You're standing · backers 0 of 2");
  await page.goto('/council/slate');
  await expect(page.getByTestId('candidacy-card')).toContainText('The branch will make up the number');

  // 4. The day's orders: the third one's modal says the branch endorses; the HQ card reads 2 / 2.
  await doTheOrders(page);
  await page.goto('/city/coalport?loc=coalport.union-hall');
  const hq = page.getByRole('dialog').getByTestId('election-card');
  await expect(hq.getByTestId('election-line1')).toHaveText("You're standing · backers 2 of 2");
  await expect(hq).toContainText('All orders carried out · the branch backs you');

  // 5. The polls (the worker's job, run by the hook): the ballot, one tap, secret.
  await advanceTo(page, 2);
  expect((await page.request.post('/api/test/city-day')).ok()).toBe(true);
  await page.goto('/');
  await expect(page).toHaveURL(/\/paper$/);
  await expect(page.getByTestId('polling-day-row')).toContainText("You're a candidate · voting is open");
  await page.getByTestId('polling-day-row').click();
  await expect(page).toHaveURL(/\/council\/ballot$/);
  await expect(page.getByTestId('tab-dot-paper')).toBeVisible();
  await page.setViewportSize({ width: 360, height: 640 });
  const rows = page.getByTestId('ballot-row');
  await expect(rows).toHaveCount(9);
  await expect(rows.first()).toContainText('Mara Lenk');
  // Review 3 (GDD §15.10): a local's row says what it is, in words.
  await expect(page.getByText('Local candidate ·', { exact: false })).toHaveCount(8);
  await expect(page.getByTestId('players-standing')).toBeVisible();
  await expect(page.getByTestId('local-candidates-line')).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/total/i);
  await noSideScroll(page);
  await rows.first().click();
  await page.getByRole('button', { name: 'Vote for Mara Lenk' }).click();
  await expect(modalOf(page).getByTestId('stamp')).toHaveText('Vote cast');
  await expect(modalOf(page).getByTestId('political-next')).toHaveText(
    /^Next: the result, \w+day morning\.$/,
  );
  await expect(modalOf(page).getByTestId('political-morale')).toContainText(/^Coalport morale \+0\.5 → /);
  await modalOf(page).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('ballot-cast-line')).toContainText('Vote cast · the result is in');
  // Review 2 (answers §4.6.1): the city screen's card reads the vote at once.
  await page.goto('/city/coalport');
  await expect(
    page.getByTestId('polling-day-row').or(page.getByTestId('election-card')).first(),
  ).toContainText('You voted for Mara Lenk');

  // 6. The count, lazily (no hook): the front page is hers.
  await advanceTo(page, 0);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/paper$/);
  const front = page.getByTestId('front-page');
  await expect(front.getByRole('heading', { name: 'Mara Lenk Tops the Poll in Coalport' })).toBeVisible();
  const stamp = front.getByTestId('stamp');
  await expect(stamp).toHaveText('ELECTED');
  await expect(stamp).toHaveClass(/animate-stamp/);
  await expect(front.getByTestId('front-page-caption')).toHaveText(
    'Mara Lenk, Organiser, elected to Coalport Council',
  );
  const mine = front.getByTestId('count-row').filter({ hasText: 'you' }).first();
  await expect(mine).toContainText('your vote');
  await expect(stamp).toBeInViewport();
  await expect(page.getByRole('button', { name: 'To the council' })).toBeInViewport();
  await page.reload();
  await expect(page.getByTestId('front-page').getByTestId('stamp')).not.toHaveClass(/animate-stamp/);

  // 7. The chamber: the seats, the branch's motion; propose Open Doors, vote for it.
  await page.getByRole('button', { name: 'To the council' }).click();
  await expect(page).toHaveURL(/\/council$/);
  await expect(page.getByTestId('council-header')).toContainText('Local seats 6 / 7');
  // Review 1: the Collective's branch motion is the Long Service Order (was Shift Hours).
  await expect(page.getByTestId('order-paper')).toContainText('Long Service Order');
  await expect(page.getByTestId('order-paper')).toContainText("the party's proposal");
  await page.getByRole('button', { name: 'Put forward a rule · 20 Political Capital' }).click();
  await page
    .getByTestId('ordinance-menu')
    .getByRole('radio', { name: /Open Doors/ })
    .click();
  await expect(modalOf(page).getByTestId('stamp')).toHaveText('Put forward');
  await modalOf(page).getByRole('button', { name: 'Continue' }).click();
  await page
    .getByTestId('order-paper')
    .getByRole('radio', { name: /Open Doors/ })
    .click();
  await page.getByRole('button', { name: 'Vote for Open Doors' }).click();
  await expect(modalOf(page).getByTestId('stamp')).toHaveText('Voted');
  await modalOf(page).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('council-voted-line')).toContainText('Vote recorded');

  // 8. The division: Open Doors in force, and a number changes in play.
  await advanceTo(page, 2);
  await page.goto('/city/coalport');
  await expect(page.getByTestId('city-ordinance')).toHaveText('Council rule: Open Doors · 5 days left');
  await page.goto('/city/coalport?loc=coalport.mill-gate');
  const ticket = page.getByTestId('ticket-coalport.mill-gate.canvass');
  // Review 2: the rule's effect on the odds in words (the server's breakdown still carries +4).
  await expect(ticket.getByTestId('ticket-tags')).toContainText('Open Doors · better odds');
  await expect(ticket.getByTestId('ticket-chance')).toHaveText('Good odds');
  await ticket.getByRole('button', { name: /, once, / }).click();
  const modal = modalOf(page);
  await expect(modal.getByText('Open Doors · better odds')).toBeVisible();
  await modal.getByRole('button', { name: 'Continue' }).click();
  await page.goto('/paper');
  await expect(page.getByTestId('headline').filter({ hasText: 'Council Passes Open Doors' })).toHaveCount(1);
});
