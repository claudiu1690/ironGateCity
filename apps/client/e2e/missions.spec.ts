import { devices, expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, openLocation, signUp } from './helpers';

/** Review 4 #19: the second player's phone (the project's device). */
const devicesPhone = devices['Pixel 7'];

/**
 * Slice 5's missions and the street (tech design §15.1 `missions.spec.ts`; screens §2, §4–§7), on a
 * phone: the first mission (the ticket, the briefing, the confirm, the result, *Again*), a run-in paid
 * off, a fight lost and the infirmary, Hot and caught and the cells, a run-in left past its window and
 * resolved by luck, and the Me tab's Heat, record and strike-off. Every roll is forced through the
 * street hooks (§8.5).
 */

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const street = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/street', { data }).then((r) => expect(r.ok()).toBe(true));
const resultModal = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
const mission = (page: Page, id: string) => page.locator(`[data-mission="${id}"]`);

// Review 5 (tech design §7.5, ADR 0080): the poster's and the duplicator's Agility ways are night
// ways, so these flows play at night (the seam's test mode) and the suite's day is restored after.
test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/test/night', { data: { mode: 'night' } })).ok()).toBe(true);
});
test.afterEach(async ({ request }) => {
  await request.post('/api/test/night', { data: { mode: 'day' } });
});

test('missions: the first, Again, a run-in paid off, the infirmary, the cells, luck, the record', async ({
  page,
  browser,
}) => {
  test.setTimeout(300_000);
  await signUp(page, 'Mara Lenk');

  // 1. Level 6, then the Shipyard: the Missions kicker, the ticket's type, odds word and risk line.
  await lift(page, { level: 6, iron: 900, pc: 60 });
  await page.goto('/city/coalport');
  await mapAtRest(page);
  const yard = await openLocation(page, '7. The Shipyard');
  await expect(yard.getByTestId('missions')).toContainText('Missions');
  const launch = mission(page, 'coalport.shipyard.launch');
  await launch.scrollIntoViewIfNeeded();
  await expect(launch.getByTestId('mission-name')).toHaveText('Speak at the launch');
  await expect(launch.getByTestId('mission-tags')).toContainText('Mission · Speech');
  await expect(launch.getByTestId('mission-tags')).toContainText(/Good odds|Fair odds|Long shot/);
  await expect(launch.getByTestId('risk-line')).toHaveText('Heat +0 · A little risk');

  // 2. *Choose a way*: the briefing, three rows, no digit anywhere before a choice.
  await street(page, { runIn: 'never', checkRoll: 1 });
  await launch.getByTestId('mission-choose').click();
  const briefing = page.getByTestId('briefing');
  await expect(briefing).toBeVisible();
  await expect(briefing.getByTestId('way-row')).toHaveCount(3);
  expect(await briefing.textContent()).not.toMatch(/\d/);
  // Layout (screens §10): the title, the text and the first two rows above the sticky button.
  const confirm = briefing.getByTestId('briefing-confirm');
  const second = (await briefing.getByTestId('way-row').nth(1).boundingBox())!;
  expect(second.y + second.height).toBeLessThanOrEqual((await confirm.boundingBox())!.y + 1);

  // 3. Select a row; the confirm says what it spends.
  await briefing.getByTestId('way-row').first().click();
  await expect(confirm).toHaveText(/ · 15 Energy$/);
  await confirm.click();

  // 4. The result: Success, the receipt, *Missions remember*. The ticket now reads *Again*.
  const result = resultModal(page);
  await expect(result.getByTestId('stamp')).toHaveText('Success');
  await expect(result.getByTestId('receipt')).toBeVisible();
  await expect(result.getByTestId('effect-remembered')).toHaveText('Missions remember: next time, one tap');
  await result.getByRole('button', { name: 'Continue' }).click();
  await expect(result).toHaveCount(0);
  await launch.scrollIntoViewIfNeeded();
  await expect(launch.getByTestId('mission-again')).toBeVisible();
  await expect(launch.getByTestId('mission-another')).toHaveText('Choose another way');
  await street(page, { runIn: 'never', checkRoll: 1 });
  await launch.getByTestId('mission-again').click();
  await expect(resultModal(page).getByTestId('stamp')).toHaveText('Success');
  await expect(resultModal(page).getByTestId('effect-remembered')).toHaveCount(0);
  await resultModal(page).getByRole('button', { name: 'Continue' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Close/ })
    .first()
    .click();
  await mapAtRest(page);

  // 5. Rank 3, then the Far Bank's posters: a run-in with the enforcer.
  await lift(page, { rank: 3 });
  await page.reload();
  await mapAtRest(page);
  await street(page, { runIn: 'next', opponentId: 'street-enforcer', choiceRoll: 1, checkRoll: 1 });
  await openLocation(page, '11. The Far Bank');
  const posters = mission(page, 'coalport.far-bank.posters');
  await posters.scrollIntoViewIfNeeded();
  await expect(posters.getByTestId('mission-tags')).toContainText('Mission · Against the Vanguard');
  await posters.getByTestId('mission-choose').click();
  await page.getByTestId('briefing').getByTestId('way-row').first().click();
  await page.getByTestId('briefing-confirm').click();

  // 6. The run-in: four rows, *Pay them off · 60 Iron*, *Leave it to luck*. Pay: the result with the
  // run-in block, then Heat.
  const runIn = page.getByTestId('run-in');
  await expect(runIn).toBeVisible();
  await expect(runIn.getByTestId('run-in-label')).toHaveText('A Vanguard street enforcer');
  for (const id of ['run-in-fight', 'run-in-run', 'run-in-talk', 'run-in-pay'])
    await expect(runIn.getByTestId(id)).toBeVisible();
  await expect(runIn.getByTestId('run-in-pay')).toContainText('Pay them off · 60 Iron');
  await expect(runIn.getByTestId('run-in-luck')).toHaveText('Leave it to luck');
  // It cannot be dismissed.
  await page.keyboard.press('Escape');
  await expect(runIn).toBeVisible();
  await runIn.getByTestId('run-in-pay').click();
  const paid = resultModal(page);
  await expect(paid.getByTestId('result-run-in')).toContainText('You paid him off.');
  await expect(paid.getByTestId('effect-heat')).toHaveText('Heat +6 → 6 · Cool');
  await paid.getByRole('button', { name: 'Continue' }).click();
  await expect(paid).toHaveCount(0);

  // 7. A fight lost: *Taken to the infirmary* → the matron, 20 minutes → *Discharge yourself*.
  await street(page, { runIn: 'next', opponentId: 'street-enforcer', choiceRoll: 100, checkRoll: 1 });
  await posters.scrollIntoViewIfNeeded();
  await posters.getByTestId('mission-again').click();
  await expect(page.getByTestId('run-in')).toBeVisible();
  await page.getByTestId('run-in-fight').click();
  const lost = resultModal(page);
  await expect(lost.getByTestId('stamp')).toHaveText('Taken to the infirmary');
  await expect(lost.getByTestId('result-sent-to')).toHaveText('To the infirmary');
  await lost.getByTestId('result-sent-to').click();
  await expect(page).toHaveURL(/\/held$/);
  await expect(page.getByTestId('held')).toHaveAttribute('data-kind', 'infirmary');
  await expect(page.getByTestId('held-minutes')).toHaveText('20 minutes');
  await expect(page.getByTestId('held-voice')).toContainText('says the matron');
  // Above the fold: the header, the matron, the sentence and the first button (screens §10).
  await expect(page.getByTestId('held-walk-out')).toBeInViewport();
  await page.getByTestId('held-discharge').click();
  const discharged = page.getByRole('dialog').filter({ has: page.getByTestId('political-continue') });
  await expect(discharged.getByTestId('stamp')).toHaveText('Discharged');
  await discharged.getByTestId('political-continue').click();
  // Review 4 (ADR 0076): a home city is one map; the landing names the place, no quarter.
  await expect(page).toHaveURL(/\/city\/coalport\?loc=coalport\.infirmary$/);
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'The Infirmary' })).toBeVisible();

  // 8. Heat 60, a forced caught: *Taken in* → the cells → *Pay bail* → *Released* → the police.
  await lift(page, { heat: 60 });
  await street(page, { runIn: 'never', checkRoll: 99, caught: 'always' });
  await page.goto('/city/coalport?loc=coalport.far-bank');
  await posters.scrollIntoViewIfNeeded();
  await posters.getByTestId('mission-again').click();
  const caught = resultModal(page);
  await expect(caught.getByTestId('stamp')).toHaveText('Taken in');
  // Review 4 #20 (answers §20.3): the arrest's mark and the orders off.
  await expect(caught.getByTestId('effect-record')).toHaveText('Your record: taken in · 1 mark · On file');
  await expect(caught.getByTestId('effect-orders-off')).toHaveText('Orders off until the day turns');
  await caught.getByTestId('result-sent-to').click();
  await expect(page).toHaveURL(/\/held$/);
  await expect(page.getByTestId('held')).toHaveAttribute('data-kind', 'cells');
  await expect(page.getByTestId('held-kicker')).toHaveText('The cells · Harbour Police');
  await expect(page.getByTestId('held-orders-off')).toHaveText("The branch has taken today's orders off the board.");
  await expect(page.getByTestId('held-bail')).toBeInViewport();
  // Review 4 #19 (answers §19): another player at the station reads *In the cells now*.
  const other = await browser.newContext({ ...devicesPhone });
  const visitor = await other.newPage();
  await signUp(visitor, 'Ivo Visitor');
  await lift(visitor, { level: 6 });
  await visitor.goto('/city/coalport?loc=coalport.harbour-police');
  const list = visitor.getByTestId('cells-now');
  await list.scrollIntoViewIfNeeded();
  await expect(list).toContainText('In the cells now');
  const row = list.getByTestId('cells-now-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Mara Lenk');
  await expect(row).toContainText(/out in \d+ min/);
  await expect(row.getByTestId('cells-now-you')).toHaveCount(0);
  await other.close();
  // The Map tab lands here while held.
  await page.getByRole('link', { name: 'Map' }).click();
  await expect(page).toHaveURL(/\/held$/);
  await page.getByTestId('held-bail').click();
  const released = page.getByRole('dialog').filter({ has: page.getByTestId('political-continue') });
  await expect(released.getByTestId('stamp')).toHaveText('Released');
  await expect(released.getByTestId('political-heat')).toContainText('→ 25');
  await expect(released.getByTestId('political-taken-in')).toHaveText('Your record: taken in · 1 mark · On file');
  await expect(released.getByTestId('political-orders-off')).toHaveText('Orders off until the day turns');
  await released.getByTestId('political-continue').click();
  await expect(page).toHaveURL(/\?loc=coalport\.harbour-police$/);
  // Out: the station's list is empty again, and the orders panel says the day's orders are off.
  await expect(page.getByTestId('cells-now-empty')).toHaveText('Nobody. The duty officer is reading.');
  await page.getByRole('dialog').getByRole('button', { name: /^Close/ }).click();
  await expect(page.getByTestId('orders-off').filter({ visible: true }).first()).toHaveText(
    'Orders off today · the branch heard about the cells',
  );

  // 9. A pending run-in left past its window: the next read leaves it to luck and the result waits.
  await street(page, { runIn: 'next', opponentId: 'street-enforcer', choiceRoll: 1, checkRoll: 1 });
  await page.goto('/city/coalport?loc=coalport.far-bank');
  await posters.scrollIntoViewIfNeeded();
  await posters.getByTestId('mission-again').click();
  await expect(page.getByTestId('run-in')).toBeVisible();
  expect((await page.request.post('/api/test/run-in', { data: { decideNow: true } })).ok()).toBe(true);
  await page.reload();
  const byLuck = resultModal(page);
  await expect(byLuck.getByTestId('run-in-did')).toContainText("You didn't answer, so luck chose to ");
  await byLuck.getByRole('button', { name: 'Continue' }).click();
  await expect(byLuck).toHaveCount(0);

  // 10. Me: Heat and *Your record · On file*; *Have a mark struck off* → *Struck off*.
  await page.goto('/me');
  await expect(page.getByTestId('me-heat')).toContainText('Noticed');
  await expect(page.getByTestId('me-record')).toContainText('On file');
  await page.getByTestId('me-strike').click();
  const struck = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
  await expect(struck.getByTestId('stamp')).toHaveText('Struck off');
  await expect(struck).toContainText('One mark fewer');
});

test('layout on a 375 × 667 phone (screens §10): the briefing, the run-in, the cells, the HUD', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 375, height: 667 });
  await signUp(page, 'Mara Lenk');
  await lift(page, { level: 6, rank: 3, iron: 900 });
  await page.goto('/city/coalport');
  await mapAtRest(page);
  const hudHeight = async () => (await page.getByRole('region', { name: 'Character' }).boundingBox())!.height;
  const before = await hudHeight();

  // The HUD with Heat and Health both showing is at most two lines taller (screens §2.1, §2.2).
  await lift(page, { heat: 30, health: 90 });
  await page.reload();
  await mapAtRest(page);
  expect((await hudHeight()) - before).toBeLessThanOrEqual(2 * 22);
  await expect(page.getByTestId('hud-heat-line')).toContainText('Heat 30 · Noticed');
  await expect(page.getByTestId('hud-health-value')).toContainText('90 / 125');

  // The briefing: the title, the text and the first two rows above the sticky button.
  await openLocation(page, '11. The Far Bank');
  const posters = mission(page, 'coalport.far-bank.posters');
  await posters.scrollIntoViewIfNeeded();
  await posters.getByTestId('mission-choose').click();
  const briefing = page.getByTestId('briefing');
  await expect(briefing).toBeVisible();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-testid=briefing]')].every((d) =>
      d.getAnimations().every((a) => a.playState !== 'running'),
    ),
  );
  const confirmTop = (await briefing.getByTestId('briefing-confirm').boundingBox())!.y;
  const rows = briefing.getByTestId('way-row');
  for (const i of [0, 1]) {
    const r = (await rows.nth(i).boundingBox())!;
    expect(r.y + r.height, `way ${i + 1} above the button`).toBeLessThanOrEqual(confirmTop + 1);
  }

  // The run-in: the portrait band, your line and the four rows above *Leave it to luck*; no scroll.
  await street(page, { runIn: 'next', opponentId: 'street-enforcer', choiceRoll: 1, checkRoll: 1 });
  await rows.first().click();
  await briefing.getByTestId('briefing-confirm').click();
  const runIn = page.getByTestId('run-in');
  await expect(runIn).toBeVisible();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-testid=run-in]')].every((d) =>
      d.getAnimations().every((a) => a.playState !== 'running'),
    ),
  );
  for (const id of [
    'run-in-label',
    'run-in-you',
    'run-in-fight',
    'run-in-run',
    'run-in-talk',
    'run-in-pay',
    'run-in-luck',
  ])
    await expect(runIn.getByTestId(id)).toBeInViewport({ ratio: 1 });
  expect(await runIn.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  await runIn.getByTestId('run-in-pay').click();
  await resultModal(page).getByRole('button', { name: 'Continue' }).click();

  // The cells: the header, the duty officer, the sentence and *Pay bail* above the fold.
  expect((await page.request.post('/api/test/held', { data: { send: 'cells' } })).ok()).toBe(true);
  await page.goto('/held');
  for (const id of ['held-minutes', 'held-voice', 'held-sentence', 'held-bail'])
    await expect(page.getByTestId(id)).toBeInViewport({ ratio: 1 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
