import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Sign up a fresh test account; the first screen is the Morning Paper (§3.3). */
export async function signUp(page: Page, name = 'Mara Lenk'): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto('/signup');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/paper$/);
  return email;
}

/** From the paper to the city map. */
export async function toTheCity(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'To the city' }).click();
  await expect(page).toHaveURL(/\/city\/coalport/);
}

/** Open a location's sheet by tapping its numbered hotspot. */
export async function openLocation(page: Page, label: string) {
  await page.getByRole('button', { name: label }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  return sheet;
}
