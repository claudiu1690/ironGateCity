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

/**
 * Review 2: the map back at its fitted view, the zoom out finished. Review 3: and the place's sheet
 * gone (it slides out with the zoom, so it is still in the page for its 300 ms).
 */
export async function mapAtRest(page: Page): Promise<void> {
  const map = page.getByTestId('city-map');
  await expect(map).toHaveAttribute('data-zoomed', 'false');
  await expect(map).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('[role=dialog][data-layout]')).toHaveCount(0);
}

/** Review 3: the open place's sheet has finished easing in (measure it only then). */
export async function sheetSettled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const d = document.querySelector('[role=dialog][data-layout]');
    return !!d && d.getAnimations().every((a) => a.playState !== 'running');
  });
}

/**
 * Open a location's sheet by tapping its numbered hotspot (review 3: or, where the covered map has it
 * off screen or under an overlay, its row in the Places list).
 */
export async function openLocation(page: Page, label: string) {
  await openPlace(page, label);
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await sheetSettled(page);
  return sheet;
}

/** Every hotspot whose centre is not the topmost element there (covered, or off the map). */
export async function unclearPins(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const map = document.querySelector('[data-testid=city-map]')!.getBoundingClientRect();
    return [...document.querySelectorAll('[data-testid=hotspot]')].flatMap((el) => {
      const r = el.getBoundingClientRect();
      const x = r.left + Math.min(22, r.width / 2);
      const y = r.top + r.height / 2;
      const onMap = x >= map.left && x <= map.right && y >= map.top && y <= map.bottom;
      const top = onMap ? document.elementFromPoint(x, y) : null;
      return top && (top === el || el.contains(top)) ? [] : [el.getAttribute('aria-label') ?? '?'];
    });
  });
}

/**
 * Review 3: the map at rest covers the screen, so a pin may start off it or under an overlay; a drag
 * brings it in. For each pin not clear at rest, drag the map so as to bring the pin to the middle of
 * the map, then if need be to each point of a 3 × 3 grid over it (the drag stops at the map's limits),
 * checking after each drag whether the pin is clear. Returns the pins no drag brings clear.
 */
export async function pinsOutOfReach(page: Page): Promise<string[]> {
  const out: string[] = [];
  /** A drag by (dx, dy) as strokes from the map's middle that stay inside the map (and the screen). */
  const drag = async (
    map: { x: number; y: number; width: number; height: number },
    dx: number,
    dy: number,
  ) => {
    const sx = map.x + map.width / 2;
    const sy = map.y + map.height / 2;
    const mx = map.width / 2 - 12;
    const my = map.height / 2 - 12;
    for (let i = 0; i < 6 && (Math.abs(dx) > 1 || Math.abs(dy) > 1); i++) {
      const ex = Math.max(-mx, Math.min(mx, dx));
      const ey = Math.max(-my, Math.min(my, dy));
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.mouse.move(sx + ex / 2, sy + ey / 2, { steps: 4 });
      await page.mouse.move(sx + ex, sy + ey, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(60);
      dx -= ex;
      dy -= ey;
    }
    await page.waitForTimeout(60);
  };
  for (const label of await unclearPins(page)) {
    const map = (await page.getByTestId('city-map').boundingBox())!;
    const pinAt = async () => {
      const b = (await page.locator(`[data-testid="hotspot"][aria-label="${label}"]`).boundingBox())!;
      return { x: b.x + 22, y: b.y + b.height / 2 };
    };
    // Try to bring the pin to the middle of the map, then to each of a 3 × 3 grid of points in it.
    const targets: Array<[number, number]> = [[0.5, 0.5]];
    for (const fy of [0.15, 0.5, 0.85]) for (const fx of [0.1, 0.5, 0.9]) targets.push([fx, fy]);
    let clear = false;
    for (const [fx, fy] of targets) {
      const p = await pinAt();
      await drag(map, map.x + map.width * fx - p.x, map.y + map.height * fy - p.y);
      if (!(await unclearPins(page)).includes(label)) {
        clear = true;
        break;
      }
    }
    if (!clear) out.push(label);
  }
  return out;
}

/**
 * Open a place's sheet as a player would: tap its pin when it is clear, otherwise through the Places
 * list (review 3), which does exactly what the pin does.
 */
export async function openPlace(page: Page, label: string) {
  if ((await unclearPins(page)).includes(label)) {
    await page.getByTestId('places-button').filter({ visible: true }).click();
    await page
      .getByRole('dialog', { name: /^Places in / })
      .getByRole('button', { name: new RegExp(`^${escape(label)}`) })
      .click();
  } else {
    await page.locator(`[data-testid="hotspot"][aria-label="${label}"]`).click();
  }
}
