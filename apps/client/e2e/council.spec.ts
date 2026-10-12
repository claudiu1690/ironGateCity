import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers';

/**
 * The council's core loop, reworked for the rule vote (docs/tech/voting-rework.md §15.2), on a phone,
 * on the shared test clock (so it runs in its own project): stand with a rule → the orders give the
 * branch's backing → the vote (three cards above the fold, one tap) → the count, lazily → ELECTED, the
 * three cards with PASSED, *What now* → the desk: your rule on the ballot, *Change ›* → the next vote →
 * the rule in force on the plate, the ticket and the result modal.
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

/** Every rule card and the CTA fully on screen, the cards above the sticky bar (tech design §9.3). */
async function cardsAboveTheFold(page: Page): Promise<void> {
  const r = await page.evaluate(() => {
    const cta = document.querySelector('[data-testid=council-cta]')!.getBoundingClientRect();
    const cards = [...document.querySelectorAll('[data-testid=rule-card]')].map((c) => c.getBoundingClientRect());
    return {
      n: cards.length,
      ok: cards.every((c) => c.top >= 0 && c.bottom <= cta.top + 1),
      ctaOnScreen: cta.top >= 0 && cta.bottom <= window.innerHeight + 1,
      scrolled: window.scrollY,
    };
  });
  expect(r.n).toBe(3);
  expect(r.ok, 'the three cards above the CTA').toBe(true);
  expect(r.ctaOnScreen, 'the CTA on screen').toBe(true);
}

test('the first vote and the first seat: stand with a rule → backed → the vote → the count → ELECTED → your rule → in play', async ({
  page,
}) => {
  test.setTimeout(240_000);
  // 1. Coalport, standing open; a new Collective member.
  await advanceTo(page, 0);
  await signUp(page, 'Mara Lenk');

  // 2. Lifted to Rank 3, One of Us in Coalport, 45 PC.
  const lift = await page.request.post('/api/test/character', {
    data: { fxp: 2000, successes: 200, pc: 45 },
  });
  expect(lift.ok()).toBe(true);
  await page.goto('/paper');
  // The *Council rule* row: the last result (or the carried-over rule) on days 0–1.
  const row = page.getByTestId('polling-day-row');
  await expect(row).toHaveAttribute('data-state', 'result');
  await expect(page.getByTestId('polling-day')).toContainText('Council rule');

  // 3. Who's standing: two ticks, the rule with *Change ›*, stand; no backers needed.
  await page.goto('/council/slate');
  const card = page.getByTestId('stand-card');
  await expect(card).toContainText('✓ Rank 3, Organiser');
  await expect(card).toContainText('✓ Known in Coalport (200 wins)');
  await expect(card).not.toContainText(/backers? before/);
  await expect(page.getByTestId('how-decided')).toHaveText(
    'Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest.',
  );
  await expect(card.getByTestId('stand-rule-name')).toHaveText('Long Service Order');
  await card.getByTestId('stand-change').click();
  const picker = page.getByRole('dialog', { name: 'Your rule · choose one' });
  await expect(picker.getByTestId('ordinance-row')).toHaveCount(11);
  await picker.getByRole('radio', { name: /^Reading Room Grant/ }).click();
  await expect(picker).toBeHidden();
  await expect(card.getByTestId('stand-rule-name')).toHaveText('Reading Room Grant');
  await card.getByRole('button', { name: 'Stand · 10 Political Capital' }).click();
  await expect(modalOf(page).getByTestId('stamp')).toHaveText("You're standing");
  await expect(modalOf(page)).toContainText('Your name is on the list');
  await expect(modalOf(page)).toContainText('Your rule: Reading Room Grant.');
  await expect(modalOf(page).getByTestId('political-next')).toHaveText(/^Next: the result, \w+day morning\.$/);
  await expect(modalOf(page).getByTestId('political-pc')).toHaveText('−10 Political Capital · 35 left');
  await modalOf(page).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('stand-standing')).toHaveText(
    "You're standing · your rule: Reading Room Grant · 0 backers",
  );
  // Review 2 (answers §4.6.2): the city screen's card says so too, without a reload.
  await page.goto('/city/coalport');
  await expect(page.getByTestId('polling-day-row').or(page.getByTestId('election-card')).first()).toContainText(
    "You're standing · your rule: Reading Room Grant",
  );

  // 4. The day's orders: the third one's modal says the branch backs her; the HQ card has 1 backer.
  await doTheOrders(page);
  await page.goto('/city/coalport?loc=coalport.union-hall');
  const hq = page.getByRole('dialog').getByTestId('election-card');
  await expect(hq.getByTestId('election-line1')).toHaveText("You're standing · your rule: Reading Room Grant");
  await expect(hq.getByTestId('election-line2')).toHaveText(/^Seats are counted \w+day morning · 1 backer$/);
  await expect(hq).toContainText('All orders carried out · the branch backs you');

  // 5. The vote (the set, run by the hook): three cards above the fold on a 390 × 844 phone, one tap.
  await advanceTo(page, 2);
  expect((await page.request.post('/api/test/city-day')).ok()).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/paper$/);
  await expect(page.getByTestId('polling-day-row')).toHaveAttribute('data-state', 'vote');
  await expect(page.getByTestId('polling-day-row')).toContainText('Which rule for Coalport next week?');
  await page.getByTestId('polling-day-row').click();
  await expect(page).toHaveURL(/\/council\/ballot$/);
  await expect(page.getByTestId('tab-dot-paper')).toBeVisible();
  const cards = page.getByTestId('rule-card');
  // Appendix A: the branch's card, then the seated locals' rules by seat.
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Long Service Order');
  await expect(cards.nth(0)).toContainText("the branch's rule");
  await expect(cards.nth(1)).toContainText('Public Works Order');
  await expect(cards.nth(2)).toContainText('Rally Permits');
  await expect(page.getByRole('button', { name: 'Choose a rule' })).toBeDisabled();
  await cardsAboveTheFold(page);
  await expect(page.locator('main')).not.toContainText(/total|none of these/i);
  await noSideScroll(page);
  await cards.nth(1).click();
  await expect(cards.nth(1)).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Vote for Public Works Order' }).click();
  await expect(modalOf(page).getByTestId('stamp')).toHaveText('Vote cast');
  await expect(modalOf(page)).toContainText('Public Works Order. Nobody can see who you chose.');
  await expect(modalOf(page).getByTestId('political-next')).toHaveText(/^Next: the result, \w+day morning\.$/);
  await expect(modalOf(page).getByTestId('political-morale')).toContainText(/^Coalport morale \+0\.5 → /);
  await modalOf(page).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('ballot-cast-line')).toContainText('Vote cast · the result is in');
  await expect(cards.nth(1)).toContainText('your vote');
  // Review 2 (answers §4.6.1): the city screen's card reads the vote at once.
  await page.goto('/city/coalport');
  await expect(page.getByTestId('polling-day-row').or(page.getByTestId('election-card')).first()).toContainText(
    'You voted for Public Works Order',
  );

  // 6. The count, lazily (no hook): the front page is hers, with the three cards and *What now*.
  await advanceTo(page, 0);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/paper$/);
  const front = page.getByTestId('front-page');
  await expect(front.getByRole('heading', { level: 2 })).toContainText('Mara Lenk');
  const stamp = front.getByTestId('stamp').filter({ hasText: 'ELECTED' });
  await expect(stamp).toHaveClass(/animate-stamp/);
  await expect(front.getByTestId('front-page-caption')).toHaveText('Mara Lenk, Organiser, elected to Coalport Council');
  await expect(stamp).toBeInViewport();
  const result = front.getByTestId('rule-card');
  await expect(result).toHaveCount(3);
  const won = front.locator('[data-testid=rule-card][data-won=true]');
  await expect(won).toHaveCount(1);
  await expect(won).toContainText('Public Works Order');
  await expect(won).toContainText('Passed');
  await expect(won).toContainText('your vote');
  await expect(won.getByTestId('rule-card-won').first()).toHaveText(/^won \w+day with 1 of 1 votes$/);
  await expect(won.getByTestId('rule-card-count')).toHaveText('1');
  const whatNow = page.getByTestId('what-now');
  await expect(whatNow).toContainText('What now · your five days');
  await expect(whatNow.getByRole('listitem')).toHaveCount(2);
  await expect(whatNow.getByRole('listitem').first()).toContainText('Your rule is on the ballot — Reading Room Grant.');
  await expect(whatNow.getByRole('listitem').nth(1)).toContainText('Draw your pay');
  await page.reload();
  await expect(page.getByTestId('front-page').getByTestId('stamp').filter({ hasText: 'ELECTED' })).not.toHaveClass(
    /animate-stamp/,
  );

  // 7. The desk at the Town Hall: *What now* once, the seats as rows, her rule on the ballot; Change ›
  // to Street Fund (one tap in the sheet, the *Changed* modal).
  await page.getByRole('button', { name: 'To your desk at the Town Hall' }).click();
  await expect(page).toHaveURL(/\/city\/coalport\?loc=coalport\.town-hall/);
  const hall = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Town Hall' }) });
  await expect(hall.getByTestId('what-now')).toBeVisible();
  await expect(hall.getByTestId('hall-seat')).toHaveCount(7);
  await expect(hall.getByTestId('hall-seat').filter({ hasText: 'Mara Lenk' })).toContainText(
    'Player · Organiser · rule: Reading Room Grant',
  );
  await expect(hall.getByTestId('hall-seat').filter({ hasText: 'Local candidate' })).toHaveCount(6);
  const next = hall.getByTestId('hall-next');
  const mine = next.locator('[data-testid=rule-card][data-ordinance="ord.reading-room"]');
  await expect(mine).toContainText('your rule');
  await expect(next.getByTestId('hall-ballot-set')).toHaveText(/^the ballot is set at /);
  await expect(next.getByTestId('hall-next-line')).toHaveText(/^Next: the town votes \w+day to \w+day; the result \w+day morning\.$/);
  await expect(next.getByTestId('hall-pay')).toBeVisible();
  await mine.getByTestId('hall-change').click();
  const sheet = page.getByRole('dialog', { name: 'Your rule · choose one' });
  // The branch's card is on the ballot: dimmed with the note, not disabled (design §8.1 Q10).
  await expect(sheet.getByRole('radio', { name: /^Long Service Order/ })).toContainText(
    'already on the ballot · yours would be skipped',
  );
  await expect(sheet.getByRole('radio', { name: /^Reading Room Grant/ })).not.toContainText('already on the ballot');
  await sheet.getByRole('radio', { name: /^Street Fund/ }).click();
  await expect(modalOf(page).getByTestId('stamp')).toHaveText('Changed');
  await expect(modalOf(page)).toContainText('Your rule is Street Fund');
  await expect(modalOf(page).getByTestId('political-next')).toHaveText(/^Next: the vote opens \w+day\.$/);
  await modalOf(page).getByRole('button', { name: 'Continue' }).click();
  await expect(next.locator('[data-testid=rule-card][data-ordinance="ord.street-fund"]')).toContainText('your rule');
  await expect(next.locator('[data-testid=rule-card][data-ordinance="ord.reading-room"]')).toHaveCount(0);
  // *What now* was shown once: the hall's next visit and `/council` (the same blocks) go without it.
  await page.goto('/city/coalport?loc=coalport.town-hall');
  await expect(hall.getByTestId('hall-next')).toBeVisible();
  await expect(hall.getByTestId('what-now')).toHaveCount(0);
  await page.goto('/council');
  await expect(page.getByTestId('council-header')).toContainText('Local seats 6 / 7');
  await expect(page.locator('[data-testid=rule-card][data-ordinance="ord.street-fund"]')).toContainText('your rule');
  await expect(page.getByTestId('what-now')).toHaveCount(0);

  // 8. The next vote, in the hall's block: Street Fund. The set morning's paper puts her card to the
  //    town (design §8.4 `hl.your-rule-on-ballot`) and opens the vote (`hl.vote-open`, day 2 only).
  await advanceTo(page, 2);
  expect((await page.request.post('/api/test/city-day')).ok()).toBe(true);
  await page.goto('/paper');
  await expect(page.getByTestId('headline').filter({ hasText: 'Councillor Mara Lenk Puts Street Fund to the Town' })).toContainText(
    /Actions pay a quarter more Iron, jobs a quarter less\. Voting opens today until .+\./,
  );
  await expect(page.getByTestId('headline').filter({ hasText: 'Coalport Votes on Its Rule' })).toHaveCount(1);
  await page.goto('/city/coalport?loc=coalport.town-hall');
  const vote = hall.getByTestId('hall-next');
  await expect(vote.getByTestId('rule-card')).toHaveCount(3);
  await vote.getByRole('radio', { name: /^Street Fund/ }).click();
  await vote.getByRole('button', { name: 'Vote for Street Fund' }).click();
  await expect(modalOf(page).getByTestId('stamp')).toHaveText('Vote cast');
  await modalOf(page).getByRole('button', { name: 'Continue' }).click();
  await expect(vote.locator('[data-testid=rule-card][data-ordinance="ord.street-fund"]')).toContainText('your vote');

  // 9. The count: Street Fund in force, and a number changes in play.
  await advanceTo(page, 0);
  // A phone taller than 700 px shows the plate's rule line (a shorter one folds it away, QA M2).
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/city/coalport');
  // Review 4 (answers §11.3): the plate's line says the effect, and a tap opens the Town Hall.
  await expect(page.getByTestId('city-ordinance')).toHaveText(
    'Council rule: Street Fund · actions pay a quarter more Iron, jobs a quarter less · 5 days left',
  );
  await page.getByTestId('city-ordinance').click();
  await expect(page).toHaveURL(/\?loc=coalport\.town-hall/);
  await expect(page.getByTestId('hall-rule-name')).toHaveText('Street Fund');
  await expect(page.getByTestId('hall-rule-line')).toHaveText('Actions pay a quarter more Iron, jobs a quarter less · 5 days left');
  await expect(page.getByTestId('hall-rule-how')).toHaveText(/^won \w+day with 1 of 1 votes$/);
  expect((await page.request.post('/api/test/character', { data: { energy: 100 } })).ok()).toBe(true);
  await page.goto('/city/coalport?loc=coalport.mill-gate');
  const ticket = page.getByTestId('ticket-coalport.mill-gate.canvass');
  await expect(ticket.getByTestId('ticket-tags')).toContainText('Street Fund · +25 % Iron');
  await ticket.getByRole('button', { name: /, once, / }).click();
  const modal = modalOf(page);
  // Review 5 (answers §17.2 item 4): the tags are one line; a tag cut from it waits in *Details*.
  const tag = modal.getByText('Street Fund · +25 % Iron');
  if (!(await tag.first().isVisible())) await modal.getByTestId('result-details').click();
  await expect(tag.first()).toBeVisible();
  await modal.getByRole('button', { name: 'Continue' }).click();
  // The count morning's headlines name the rule (design §8.4; §8.9.2 #1: the rule's leads the city slot).
  await page.goto('/paper');
  const heads = page.getByTestId('headline');
  await expect(heads.filter({ hasText: 'Street Fund Wins the Vote in Coalport' })).toContainText(
    /1 of 1 votes\. In force until .+: actions pay a quarter more Iron, jobs a quarter less\./,
  );
  await expect(heads.filter({ hasText: 'Your Vote Counted: Street Fund Wins' })).toHaveCount(1);
  const titles = await heads.allTextContents();
  const ruleAt = titles.findIndex((t) => t.includes('Street Fund Wins the Vote in Coalport'));
  const countAt = titles.findIndex((t) => t.includes('Coalport Result:'));
  if (countAt !== -1) expect(ruleAt).toBeLessThan(countAt);
});
