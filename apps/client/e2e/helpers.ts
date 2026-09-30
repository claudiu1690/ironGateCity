import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** The origin's answers by button text, in order (docs/design/slice-2-onboarding.md §2). */
export const ANSWERS = {
  /** §2.4: library · watched · fix anything · refuse the coat · Finish His Work · Justice. */
  reference: [
    'Sat in the library till they threw me out.',
    'Watched from the corner, and learned.',
    'I could fix anything with my hands.',
    "No. I'll earn my own.",
    "…I'll finish what you started.",
    'Justice. The workers deserve better.',
  ],
  /**
   * The same, but taking the coat: the slice-1 specs keep their numbers (Iron starts at 0; the
   * INT and STR odds are the reference recruit's, 66 % INT at home).
   */
  slice1: [
    'Sat in the library till they threw me out.',
    'Watched from the corner, and learned.',
    'I could fix anything with my hands.',
    'Take it, and say nothing.',
    "…I'll finish what you started.",
    'Justice. The workers deserve better.',
  ],
};

const FACTION_NAMES = { vanguard: 'Iron Vanguard', collective: 'Red Collective', alliance: 'Civic Alliance' };
export type FactionKey = keyof typeof FACTION_NAMES;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tap one origin answer (its button also carries the hint line). */
export async function answer(page: Page, text: string): Promise<void> {
  const button = page.getByRole('button', { name: new RegExp(`^${escape(text)}`) });
  await button.click();
  await expect(button).toBeHidden();
}

/** Sign up with a face; lands on the arrival (slice 2, ADR 0011). */
export async function signUpOnly(page: Page, name = 'Mara Lenk', face = 3): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto('/signup');
  await page.getByLabel('Your name').fill(name);
  // The radio is visually hidden behind its portrait: tap the tile, as a player does.
  await page.getByRole('group', { name: 'Your face' }).getByTestId('avatar-tile').nth(face).click();
  await expect(page.getByRole('group', { name: 'Your face' }).getByRole('radio').nth(face)).toBeChecked();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/arrive$/);
  return email;
}

/** The six answers and the street: lands on the welcome edition. */
export async function arrive(
  page: Page,
  opts: { answers?: string[]; faction?: FactionKey } = {},
): Promise<void> {
  for (const text of opts.answers ?? ANSWERS.slice1) await answer(page, text);
  const name = FACTION_NAMES[opts.faction ?? 'collective'];
  await page.getByRole('radio', { name: new RegExp(name) }).click();
  await page.getByTestId('join').click();
  await expect(page).toHaveURL(/\/paper$/);
}

/**
 * Sign up a fresh test account and arrive (the Collective, the coat taken so the slice-1 numbers
 * hold); the first screen is the Morning Paper's welcome edition (§3.3).
 */
export async function signUp(page: Page, name = 'Mara Lenk'): Promise<string> {
  const email = await signUpOnly(page, name);
  await arrive(page);
  return email;
}

/**
 * From the paper to the city map. The first edition opens the first pin's sheet (§7.5); it is
 * closed here so the slice-1 specs start from the map as before.
 */
export async function toTheCity(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'To the city' }).click();
  await expect(page).toHaveURL(/\/city\/coalport/);
  if (/\?loc=/.test(page.url())) {
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Close/ })
      .click();
    await expect(page).toHaveURL(/\/city\/coalport$/);
  }
  await mapAtRest(page);
}

/** Review 2: the map back at its fitted view, the zoom out finished. */
export async function mapAtRest(page: Page): Promise<void> {
  const map = page.getByTestId('city-map');
  await expect(map).toHaveAttribute('data-zoomed', 'false');
  await expect(map).toHaveAttribute('data-moving', 'false');
}

/** Open a location's sheet by tapping its numbered hotspot. */
export async function openLocation(page: Page, label: string) {
  await page.getByRole('button', { name: label }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  return sheet;
}
