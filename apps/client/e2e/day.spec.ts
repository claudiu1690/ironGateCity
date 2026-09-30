import { expect, test } from '@playwright/test';
import { openLocation, signUp, toTheCity } from './helpers';

/**
 * The City Day, lazily (ADR 0005): take a job, move the server clock a day with the test hook
 * (tech design §7.8), and the new paper credits the wage. Review 1 (GDD §9.1): a job is a wage,
 * paid in full at the boundary with seniority; there is no shift.
 */
test('take a job → next day: the paper is due, the wage and seniority on the desk', async ({ page }) => {
  await signUp(page);
  await toTheCity(page);
  const sheet = await openLocation(page, '1. Mill Gate');

  // No shift ticket any more; the Jobs card says how the job pays.
  await expect(sheet.getByTestId('ticket-coalport.mill-gate.shift')).toHaveCount(0);
  await expect(sheet.getByTestId('job-coalport-factory-worker')).toContainText(
    '216 a day · paid at midnight',
  );
  await sheet.getByRole('button', { name: 'Take the job' }).click();
  await expect(sheet.getByTestId('job-coalport-factory-worker')).toContainText(/Taken · /);
  await expect(sheet.getByTestId('job-held')).toHaveText('Your job · seniority 0 days · +0 %');
  await expect(page.getByTestId('hud-iron')).toHaveText('0');

  const res = await page.request.post('/api/test/clock', { data: { advanceMs: 24 * 3_600_000 } });
  expect(res.ok()).toBe(true);

  await page.goto('/');
  await expect(page).toHaveURL(/\/paper$/);
  // Coalport's branch motion, the Long Service Order, is in force from the city's bootstrap: one
  // boundary adds two days of seniority, so the first wage is 216 + 4 % (9) = 225.
  const desk = page.getByTestId('desk');
  await expect(desk.getByTestId('desk-paid')).toHaveText(
    'Paid: 225 Iron · Factory worker · seniority 2 days (+4 %)',
  );
  await expect(desk.getByTestId('desk-paid-lines')).toContainText('Seniority 2 days: +9');
  await expect(page.getByTestId('hud-iron')).toHaveText('225');
});
