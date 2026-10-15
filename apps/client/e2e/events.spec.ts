import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { signUp } from './helpers';

/**
 * Slice 6 (tech design §15.1 `events.spec.ts`), on a phone at 390 × 844: a Collective at Rank 3 (A)
 * calls a rally from the Faction tab; a second Collective at Rank 2 (B, another browser) signs up as
 * the Organiser, withdraws and signs up again; the last hour commits B; the event starts (hooks: all
 * rolls succeed) and both read their result modal; a fresh Rank 1 (C) joins the branch's event as a
 * hand, and the boundary's city day brings C its result. The screenshots for QA go to
 * docs/qa/slice-6/.
 */

// Run from apps/client (as every Playwright run here is).
const shot = async (page: Page, name: string) => {
  // The sheets and modals rise in (review 3): let them settle first.
  await page.waitForTimeout(700);
  await page.screenshot({ path: `../../docs/qa/slice-6/${name}.png` });
};

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const hook = async (page: Page, path: string, data: Record<string, unknown>) => {
  const r = await page.request.post(path, { data });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
};

async function member(browser: Browser, name: string, rank: number): Promise<Page> {
  const ctx = await browser.newContext({
    ...test.info().project.use,
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  await signUp(page, name);
  await lift(page, { rank, energy: 100 });
  return page;
}

/**
 * Tech §12.5, screens §1: no player-facing string on a slice-6 screen says *co-op, NPC, resolve,
 * roster, schedule, WebSocket, presence, ledger, directive*, a roll, or a percentage for odds.
 */
const SLICE6_TERMS =
  /(?<![.\-_\w])(?:co-op|NPC|resolve\w*|roster|schedule\w*|WebSocket|presence|ledger|directive|roll(?:s|ed)?\b)/i;
const ODDS_NUMBER = /\d\s?%\s*(?:chance|odds)|(?:chance|odds)[^.\n]{0,12}\d\s?%/i;
async function sweep(page: Page, where: string): Promise<void> {
  const text = await page.locator('body').innerText();
  expect(text.match(SLICE6_TERMS)?.[0] ?? null, `${where}: a system word`).toBeNull();
  expect(ODDS_NUMBER.test(text), `${where}: odds as a number`).toBe(false);
}

/** No digit in an odds word, never a percentage (screens §1, review 2). */
const ODDS = /^(Good odds|Fair odds|Long shot) · [A-Za-z ,]+$/;

test.describe.configure({ mode: 'serial' });

test('events: call a rally, sign up, withdraw, commit, the result for both; a hand on the fixture', async ({
  browser,
}) => {
  test.setTimeout(420_000);

  // 1. A at Rank 3 and B at Rank 2, both Collective in Coalport, in two browsers.
  const a = await member(browser, 'Anna Kessel', 3);
  const b = await member(browser, 'Bruno Fehr', 2);

  // 2. A: Faction → Events (the first visit): the branch's event, then *Call an event*.
  await a.goto('/faction');
  await expect(a.getByTestId('faction-tab-events')).toHaveAttribute('aria-current', 'page');
  await expect(a.getByTestId('faction-plate-line')).toContainText('here now');
  await expect(a.locator('[data-testid=event-card][data-kind=fixture]').first()).toContainText(
    /called by .+ · the branch's event/,
  );
  await sweep(a, 'the board');
  await shot(a, 'faction-events');
  await a.getByTestId('call-an-event').click();
  const sheet = a.getByTestId('call-sheet');
  await expect(sheet).toHaveAttribute('data-step', '1');
  await sheet.locator('[data-testid=call-option][data-type-id="event.rally"]').click();
  await expect(sheet).toHaveAttribute('data-step', '2');
  await sheet.getByTestId('time-chip-3').click();
  await sheet.locator('[data-testid=role-row][data-role-id=speaker]').click();
  await expect(sheet.getByTestId('call-it')).toHaveText('Call it · Speaker · 15 Energy');
  await sweep(a, 'the call sheet');
  await shot(a, 'call-sheet');
  await sheet.getByTestId('call-it').click();
  const called = a.getByRole('dialog').filter({ hasText: 'Called' });
  // The start in the player's clock: *at 19:40*, or *tomorrow 00:51* for a call after 21:00 (the
  // three-hour chip crosses midnight), so the line does not depend on the time of day of the run.
  await expect(called).toContainText(/The branch has a rally (at|tomorrow) \d\d:\d\d/);
  await called.getByTestId('political-continue').click();
  await expect(a).toHaveURL(/\/faction\/events\/[0-9a-f]{24}/);
  const eventId = a.url().match(/events\/([0-9a-f]{24})/)![1]!;
  await expect(a.getByTestId('event-page')).toHaveAttribute('data-state', 'open');
  // Back on the board: one at a time.
  await a.goto('/faction?tab=events');
  await expect(a.getByTestId('call-guard-line')).toHaveText(/^One at a time: the branch's rally at \d\d:\d\d is still open$/);

  // 3. B: the rally on the board (1 of 4 roles); the Organiser's odds as words; sign up.
  await b.goto('/faction?tab=events');
  const rally = b.locator(`[data-testid=event-card][data-event-id="${eventId}"]`);
  await expect(rally.getByTestId('event-card-line')).toContainText('1 of 4 roles');
  await rally.getByTestId('event-card-open').click();
  await expect(b).toHaveURL(new RegExp(`/faction/events/${eventId}`));
  const organiser = b.locator('[data-testid=role-row][data-role-id=organiser]');
  await expect(organiser.getByTestId('role-odds')).toHaveText(ODDS);
  await expect(b.getByTestId('event-page')).not.toContainText('%');
  await organiser.click();
  await expect(b.getByTestId('event-signup')).toHaveText('Organiser · 10 Energy');
  await sweep(b, 'the event page');
  await shot(b, 'event-page');
  await b.getByTestId('event-signup').click();
  const signed = b.getByRole('dialog').filter({ hasText: 'Signed up' });
  await expect(signed).toContainText("You're the Organiser");
  await signed.getByTestId('political-continue').click();
  await expect(b.getByTestId('event-withdraw')).toHaveText('Withdraw · 10 Energy back');
  const energyBefore = await b.getByRole('region', { name: 'Character' }).textContent();
  await b.getByTestId('event-withdraw').click();
  await expect(b.getByTestId('event-withdrawn')).toContainText("You're no longer the Organiser");
  await expect(b.getByRole('region', { name: 'Character' })).not.toHaveText(energyBefore ?? '');
  await organiser.click();
  await b.getByTestId('event-signup').click();
  await b.getByRole('dialog').filter({ hasText: 'Signed up' }).getByTestId('political-continue').click();
  await expect(b.getByTestId('event-withdraw')).toBeVisible();

  // 4. Two and a half hours on: committed, no button. Then all rolls succeed and it starts now.
  await hook(a, '/api/test/clock', { advanceMs: 150 * 60_000 });
  await b.reload();
  await expect(b.getByTestId('event-committed')).toHaveText(/^Committed from \d\d:\d\d: the branch is counting on you$/);
  await expect(b.getByTestId('event-withdraw')).toHaveCount(0);
  await hook(a, '/api/test/events', { rolls: { eventId, byRole: 'success' } });
  await hook(a, '/api/test/events', { startNow: eventId });
  await a.goto('/faction?tab=events');
  const resultA = a.getByRole('dialog').filter({ has: a.getByTestId('event-result') });
  await expect(resultA).toBeVisible({ timeout: 15_000 });
  await expect(resultA.getByTestId('event-how')).toContainText('Anna Kessel');
  await expect(resultA.getByTestId('event-how')).toContainText('Bruno Fehr');
  await expect(resultA.getByTestId('event-summary')).toHaveText(/2 went to volunteers\.$/);
  await expect(resultA.getByTestId('receipt')).toBeVisible();
  await sweep(a, 'the event result');
  await shot(a, 'event-result');
  await resultA.getByTestId('event-continue').click();
  await expect(resultA).toBeHidden();
  await b.reload();
  const resultB = b.getByRole('dialog').filter({ has: b.getByTestId('event-result') });
  await expect(resultB).toBeVisible({ timeout: 15_000 });
  await expect(resultB.locator('[data-testid=event-role][data-you=true]')).toContainText('Organiser');
  await resultB.getByTestId('event-continue').click();
  await expect(b.getByTestId('event-page')).toHaveAttribute('data-state', 'resolved');
  await expect(b.getByTestId('event-see-result')).toBeVisible();

  // 5. C, a fresh Rank 1: the branch's event, *Join as a hand · 5 Energy*.
  const c = await member(browser, 'Clara Vos', 1);
  await c.goto('/faction?tab=events');
  const fx = c.locator('[data-testid=event-card][data-kind=fixture]').first();
  await expect(fx.getByTestId('event-card-join')).toHaveText('Join as a hand');
  await fx.getByTestId('event-card-join').click();
  await expect(c.getByTestId('event-signup')).toHaveText('Join as a hand · 5 Energy');
  await c.getByTestId('event-signup').click();
  const handModal = c.getByRole('dialog').filter({ hasText: 'Signed up' });
  await expect(handModal).toContainText("You're a pair of hands");
  await handModal.getByTestId('political-continue').click();
  await expect(c.getByTestId('hands-row')).toContainText('Clara Vos');

  // 6. The boundary and the city day: C's result modal for the branch's event.
  const now = (await hook(c, '/api/test/clock', { advanceMs: 0 })) as { now: number };
  const nextDay = Math.ceil((now.now + 1) / 86_400_000) * 86_400_000 + 60_000;
  await hook(c, '/api/test/clock', { advanceMs: nextDay - now.now });
  await hook(c, '/api/test/city-day', {});
  await c.goto('/faction?tab=events');
  const resultC = c.getByRole('dialog').filter({ has: c.getByTestId('event-result') });
  await expect(resultC).toBeVisible({ timeout: 15_000 });
  await expect(resultC.getByTestId('event-hands')).toContainText('Clara Vos');
  await resultC.getByTestId('event-continue').click();
  await expect(resultC).toBeHidden();
});
