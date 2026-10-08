import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Review 4 (*The Last Train In*, GDD §7.1, ADR 0073): the answers to beats 2 and 3 by button text;
 * beat 1 (whom you help) is the party, picked by `arrive`'s `faction`. The reference recruit (GDD
 * §8.5): Holm · books · his ward book, STR 8 / INT 12 / AGI 5, his coat CHA 5, no Iron.
 */
export const ANSWERS = {
  reference: ['Books. His, and a few of mine.', 'His ward book.'],
  /** The slice-1 specs' numbers: INT 12 (66 % INT at home), as the reference. */
  slice1: ['Books. His, and a few of mine.', 'His ward book.'],
};
/** GDD §8.5: the Vanguard's tuning character carries tools (STR 14 / INT 6), the others books. */
const TOOLS = "Tools, mostly. I'm better with my hands than my mouth.";

export type FactionKey = 'vanguard' | 'collective' | 'alliance';
/** Beat 1's row for each party: the person you help (their ask's first words). */
export const PLATFORM_ROWS: Record<FactionKey, RegExp> = {
  collective: /Carry this parcel/,
  vanguard: /Take a bundle/,
  alliance: /Witness a signature/,
};

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
  // QA review 4 n7: a sign-up under load (password hashing, the session, the draft) can take longer
  // than the default 5 s; one slow sign-up used to fail its test and skip every later project.
  await expect(page).toHaveURL(/\/arrive$/, { timeout: 30_000 });
  return email;
}

/** Beat 1, the platform: select the party's row, then the confirm (*Help Holm · …*) commits it. */
export async function helpOnPlatform(page: Page, faction: FactionKey = 'collective'): Promise<void> {
  const row = page.getByRole('radio', { name: PLATFORM_ROWS[faction] });
  await row.click();
  await expect(row).toHaveAttribute('aria-checked', 'true');
  const confirm = page.getByTestId('story-confirm');
  await expect(confirm).toHaveText(/^Help /);
  await confirm.click();
  await expect(row).toBeHidden();
}

/** The three beats (the platform, the suitcase, the lining): lands on the welcome edition. */
export async function arrive(
  page: Page,
  opts: { answers?: string[]; faction?: FactionKey } = {},
): Promise<void> {
  await helpOnPlatform(page, opts.faction ?? 'collective');
  const given = opts.answers ?? ANSWERS.slice1;
  const tuning = opts.faction === 'vanguard' && (given === ANSWERS.reference || given === ANSWERS.slice1);
  for (const text of tuning ? [TOOLS, given[1]!] : given) await answer(page, text);
  await expect(page).toHaveURL(/\/paper$/);
}

/**
 * Sign up a fresh test account and arrive (the Collective, the reference recruit); the first screen
 * is the Morning Paper's welcome edition (§3.3).
 */
export async function signUp(page: Page, name = 'Mara Lenk'): Promise<string> {
  const email = await signUpOnly(page, name);
  await arrive(page);
  return email;
}

/**
 * From the paper to the city map. The first edition opens the HQ's sheet with the favour highlighted
 * (§7.5, review 4); it is closed here so the slice-1 specs start from the map as before.
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

/**
 * Review 4 (ADR 0075, tech design §6.6): the journey's card is shown from its moment, drawn at
 * boarding in 0.20–0.80 of the way. The shared test clock (the dev clock) is moved just past it and
 * the page reloaded: on return with an answerable card, its sheet is open.
 */
export async function toTheCard(page: Page): Promise<void> {
  const journey = page.getByTestId('journey');
  await expect(journey).toHaveAttribute('data-card-at', /^\d+$/);
  const cardAt = Number(await journey.getAttribute('data-card-at'));
  const res = await page.request.post('/api/test/clock', { data: { advanceMs: 0 } });
  const { now } = (await res.json()) as { now: number };
  if (cardAt > now) {
    const moved = await page.request.post('/api/test/clock', { data: { advanceMs: cardAt - now + 1_000 } });
    expect(moved.ok()).toBe(true);
  }
  await page.reload();
  await expect(page.getByRole('dialog').getByTestId('journey-card')).toBeVisible();
}

/**
 * Review 5 #7 (answers §7): the arrival's *Continue* is shown only once its card (when there is one
 * still to answer) has a row tapped. An unanswered card is put aside (*Sleep through it* / *Let it
 * pass*), then Continue. Returns the arrival modal.
 */
export async function arrivalContinue(page: Page) {
  const modal = page.getByRole('dialog').filter({ has: page.getByTestId('arrival-headline') });
  await expect(modal).toBeVisible();
  const aside = modal.getByTestId('journey-set-aside');
  if ((await aside.count()) > 0 && (await aside.isEnabled())) {
    await expect(modal.getByTestId('arrival-continue')).toHaveCount(0);
    await aside.click();
    await expect(modal.getByTestId('journey-outcome')).toBeVisible();
  }
  await modal.getByTestId('arrival-continue').click();
  return modal;
}
