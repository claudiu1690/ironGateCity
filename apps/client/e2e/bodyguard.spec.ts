import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, openLocation, signUp } from './helpers';

/**
 * Slice 8 (tech design §24.11, T32; screens §18.1–§18.3): someone to walk with you, on a phone at
 * 390 × 844. A Level 6 member hires a doorman at the party store; the Me tab's *Walking with you*; a
 * forced mission run-in against the street enforcer with his row first, which works (*minded*: his
 * line, the mission paid); a police run-in with his row dimmed; his last day and the lapse (the hooks),
 * and the same man hired again. Rolls are forced through the street hooks; the contract through
 * `/api/test/bodyguard`.
 */

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const street = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/street', { data }).then((r) => expect(r.ok()).toBe(true));
const bodyguard = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/bodyguard', { data }).then((r) => expect(r.ok()).toBe(true));
const resultModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
const SHOTS = '../../docs/qa/slice-8';

async function unionHall(page: Page) {
  await page.goto('/city/coalport');
  await mapAtRest(page);
  const sheet = await openLocation(page, '3. Union Hall');
  const card = sheet.getByTestId('hire-card');
  await card.scrollIntoViewIfNeeded();
  return card;
}

test('someone to walk with you: hired, his row at a run-in, the police, the last day, back again', async ({ page }) => {
  test.setTimeout(300_000);
  await signUp(page, 'Karel Dvorak');
  await lift(page, { level: 6, iron: 2_000 });

  // 1. The party store's card: three rows, the doorman for hire, the minder from Level 16; the plain
  // words (design §24: never *bodyguard*, *guard*, *escort*, *muscle*).
  const card = await unionHall(page);
  await expect(card).toContainText('Someone to walk with you');
  await expect(card.getByTestId('hire-row-1').getByTestId('hire-title')).toHaveText('A doorman · 400 a week');
  await expect(card.getByTestId('hire-row-1').getByTestId('hire-odds')).toHaveText(
    /^Steps in first at a run-in · his strength: (Good odds|Fair odds|Long shot)$/,
  );
  await expect(card.getByTestId('hire-row-3')).toHaveAttribute('data-state', 'level');
  await expect(card.getByTestId('hire-row-3').getByTestId('hire-state')).toHaveText('From Level 16');
  expect(await card.textContent()).not.toMatch(/bodyguard|\bguard\b|escort|muscle/i);
  for (const b of await card.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${SHOTS}/hire-card.png` });

  // 2. *Hire · 400 Iron*: one tap, the *Hired* modal with his name; the row now runs.
  await card.getByTestId('hire-row-1').getByTestId('hire').click();
  const hired = resultModal(page);
  await expect(hired.getByTestId('stamp')).toHaveText('Hired');
  const headline = (await hired.getByRole('heading').first().textContent()) ?? '';
  const name = headline.replace(/ walks with you$/, '').trim();
  expect(name.length).toBeGreaterThan(1);
  await expect(hired).toContainText('−400 Iron');
  await expect(hired).toContainText(/until \w+day/);
  await hired.getByRole('button', { name: 'Continue' }).click();
  await expect(card.getByTestId('hire-row-1')).toHaveAttribute('data-state', 'running');
  await expect(card.getByTestId('hire-row-2')).toHaveAttribute('data-state', /withYou|rank/);

  // 3. The Me tab: *Walking with you · {Name}, a doorman · until {weekday}*.
  await page.goto('/me');
  await expect(page.getByTestId('me-minder-line')).toHaveText(new RegExp(`^${name}, a doorman · until \\w+day$`));

  // 4. A mission run-in against the street enforcer: his row first, his strength; he steps in.
  await page.goto('/city/coalport');
  await mapAtRest(page);
  await openLocation(page, '7. The Shipyard');
  const launch = page.locator('[data-mission="coalport.shipyard.launch"]');
  await launch.scrollIntoViewIfNeeded();
  await street(page, { runIn: 'next', opponentId: 'street-enforcer', choiceRoll: 1, checkRoll: 1 });
  await launch.getByTestId('mission-choose').click();
  await page.getByTestId('briefing').getByTestId('way-row').first().click();
  await page.getByTestId('briefing-confirm').click();
  const runIn = page.getByTestId('run-in');
  await expect(runIn).toBeVisible();
  const row = runIn.getByTestId('run-in-minder');
  await expect(row).toContainText(`${name} steps in`);
  await expect(row.getByTestId('run-in-line')).toHaveText(/^(Good odds|Fair odds|Long shot) · his strength$/);
  // His row is the first of the five.
  const rows = runIn.getByRole('group').getByRole('button');
  await expect(rows.first()).toHaveAttribute('data-testid', 'run-in-minder');
  await page.screenshot({ path: `${SHOTS}/run-in-minder.png` });
  await row.click();
  const minded = resultModal(page);
  const block = minded.getByTestId('result-run-in');
  await expect(block).toHaveAttribute('data-outcome', 'minded');
  await expect(block.getByTestId('run-in-did')).toContainText(name);
  await expect(block.getByTestId('run-in-health')).toHaveCount(0);
  await expect(minded.getByTestId('stamp')).toHaveText('Success');
  await minded.getByRole('button', { name: 'Continue' }).click();
  await expect(minded).toHaveCount(0);

  // 5. Against the police his row is there but dimmed: *Not against the police*.
  await street(page, { runIn: 'next', opponentId: 'city-police', choiceRoll: 1, checkRoll: 1 });
  await launch.scrollIntoViewIfNeeded();
  await launch.getByTestId('mission-again').click();
  await expect(runIn).toBeVisible();
  await expect(row).toHaveAttribute('data-blocked', 'police');
  await expect(row).toBeDisabled();
  await expect(row.getByTestId('run-in-line')).toHaveText('Not against the police');
  await runIn.getByTestId('run-in-fight').click();
  await resultModal(page).getByRole('button', { name: 'Continue' }).click();

  // 6. His last day (the hook): the Me tab says so.
  await bodyguard(page, { tier: 1, daysLeft: 0 });
  await page.goto('/me');
  await expect(page.getByTestId('me-minder-line')).toHaveText(new RegExp(`^${name}'s last day \\w+day$`));

  // 7. The week ran out (the hook): the row is gone; nothing else changes (Iron as it was).
  const iron = await page.request.get('/api/trpc/character.me').then((r) => r.json());
  await bodyguard(page, { lapse: true });
  await page.reload();
  await expect(page.getByTestId('me-minder-line')).toHaveText('Nobody · a doorman from the party store, 400 a week');
  const after = await page.request.get('/api/trpc/character.me').then((r) => r.json());
  expect(after.result.data.iron).toBe(iron.result.data.iron);

  // 8. The card hires him again: the same tier brings back the same man.
  const again = await unionHall(page);
  await again.getByTestId('hire-row-1').getByTestId('hire').click();
  await expect(resultModal(page).getByRole('heading').first()).toHaveText(`${name} walks with you`);
  await resultModal(page).getByRole('button', { name: 'Continue' }).click();
});
