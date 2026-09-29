import { expect, test } from '@playwright/test';
import { openLocation, signUp, toTheCity } from './helpers';

/**
 * The City Day, lazily (ADR 0005): take a job, work the shift, move the server clock a day with
 * the test hook (tech design §7.8), and the new paper credits half pay.
 */
test('take a job → shift → next day: the paper is due, half pay on the desk', async ({ page }) => {
  await signUp(page);
  await toTheCity(page);
  const sheet = await openLocation(page, '1. Mill Gate');

  await sheet.getByRole('button', { name: 'Take the job' }).click();
  await expect(sheet.getByTestId('job-factory-worker')).toContainText(/Taken · /);
  await expect(sheet.getByTestId('job-factory-worker')).toContainText(
    'Your job · streak 0 days · 2 sick days left',
  );

  await sheet.getByRole('button', { name: 'Work your shift at the mill, 4 Energy' }).click();
  const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
  await expect(modal.getByTestId('stamp')).toHaveText('Shift worked');
  await expect(modal.getByTestId('tile-iron')).toContainText('+112');
  await modal.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('hud-iron')).toHaveText('112');

  const res = await page.request.post('/api/test/clock', { data: { advanceMs: 24 * 3_600_000 } });
  expect(res.ok()).toBe(true);

  await page.goto('/');
  await expect(page).toHaveURL(/\/paper$/);
  const desk = page.getByTestId('desk');
  await expect(desk).toContainText('Salary, Factory worker (half pay)');
  await expect(desk).toContainText('+108 Iron');
  await expect(desk).toContainText('Work streak · sick days');
  await expect(desk).toContainText('1 day · 2 left');
  await expect(page.getByTestId('hud-iron')).toHaveText('220');
});
