/**
 * QA (slice 2, "Arrival"): the first ten minutes as a player meets them, beyond the developer's
 * arrival and chapter specs. A double tap on an origin answer; the Vanguard and Alliance reward
 * tiles' contrast; the chapter screens on a 360×640 phone; a keyboard-only arrival on a desktop;
 * resuming at the street and mid-chapter after a reload; the lost-tap regression on the first
 * landing's sheet; and a blank name at sign-up. Known bugs are `test.fail` with the bug id from
 * docs/qa/slice-2.md; when a bug is fixed its test turns red, as a reminder to drop the annotation.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ANSWERS, answer, arrive, signUpOnly } from './helpers';

const SMALL = { width: 360, height: 640 };
const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };
const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });

/** Welcome edition → "To the city" (the first pin's sheet opens) → ×1 on the first canvass. */
async function firstCanvass(page: Page) {
  await page.getByRole('button', { name: 'To the city' }).click();
  await expect(page).toHaveURL(/\?loc=/);
  const sheet = page.getByRole('dialog');
  await sheet
    .locator('[data-testid^="ticket-"]')
    .first()
    .getByRole('button', { name: /, once, 10 Energy$/ })
    .click();
  const modal = modalOf(page);
  await expect(modal.getByTestId('stamp')).toBeVisible();
  return modal;
}

/** WCAG contrast of an element's text against the nearest opaque background. */
async function contrastOf(page: Page, selector: string): Promise<number> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
      const lum = ([r, g, b]: number[]) => {
        const f = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
      };
      let bg: number[] | null = null;
      for (let e: Element | null = el; e && !bg; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor);
        if (c.length >= 3 && (c[3] ?? 1) > 0.99) bg = c;
      }
      const L1 = lum(rgb(getComputedStyle(el).color));
      const L2 = lum(bg ?? [255, 255, 255]);
      return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    });
}

test.describe('phone 375×812', () => {
  test.use({ viewport: PHONE });

  // M1 (major): a double tap on an origin answer answers the next question as well. The choices keep
  // their React keys (a, b, c) from one question to the next, so when the first tap's response is
  // back before the second tap (any connection faster than the tap gap), the second tap lands on the
  // next question's answer in the same place. Answers are final (§7.2), so the player loses a
  // question they never read. Expected: the second tap of a double tap does nothing.
  // Fixed in fix round 1: choices keyed by question, taps bound to the question they were rendered
  // for, and a new question's choices take taps only once it has settled on screen (500 ms).
  test('M1: a double tap on an origin answer does not also answer the next question', async ({ page }) => {
    await signUpOnly(page, 'Otto Brandt', 1);
    const first = page.getByTestId('story-choice').first();
    const box = (await first.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(200); // a relaxed double tap
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(800);
    // Still on the second question, with the first answer echoed.
    await expect(page.getByTestId('story-prompt')).toHaveText(
      '“And when the street kids got into trouble. What did you do?”',
    );
    await expect(page.getByTestId('story-echo')).toHaveText('You went fishing with him.');
  });

  // m1 (minor): the Faction XP and opinion tiles use the faction's colour for their numbers. The
  // Vanguard's gold (#c39a3a) on the card (#f6f0e1) is 2.31:1 and the Alliance's blue (#4b7394)
  // 4.42:1, at 22 px semibold (normal text: 4.5:1 needed). The Collective's red passes.
  // Fixed in fix round 1: text tokens --color-vanguard-text / --color-alliance-text (design §14.3).
  for (const [faction, name] of [
    ['vanguard', 'Iron Vanguard'],
    ['alliance', 'Civic Alliance'],
  ] as const) {
    test(`m1: the ${name}'s Faction XP tile in the result modal has 4.5:1 contrast`, async ({ page }) => {
      await signUpOnly(page, 'Otto Brandt', 1);
      await arrive(page, { faction, answers: ANSWERS.reference });
      const modal = await firstCanvass(page);
      await expect(modal.getByTestId('tile-faction-xp')).toBeVisible();
      const ratio = await contrastOf(page, '[data-testid="tile-faction-xp"] span:nth-child(2)');
      test.info().annotations.push({ type: 'contrast', description: `${name} ${ratio.toFixed(2)}:1` });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('resumes at the street and mid-chapter after a reload; the chapter echo is the choice', async ({
    page,
  }) => {
    await signUpOnly(page, 'Otto Brandt', 5);
    for (const text of ANSWERS.reference) await answer(page, text);
    await expect(page.getByTestId('join')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('radio', { name: /Red Collective/ }).getByTestId('wish-tag')).toBeVisible();
    await page.getByRole('radio', { name: /Iron Vanguard/ }).click();
    await page.getByTestId('join').click();
    await expect(page).toHaveURL(/\/paper$/);
    // The coat was refused, so the Vanguard's own outfit is worn (§21.4).
    await expect(page.getByTestId('desk')).toContainText('Work jacket and cap');
    await page.getByTestId('letters-row').click();
    await page.getByRole('button', { name: /^Keep it to yourself for now/ }).click();
    // Review 1 (answers §2.1): a third approach, Legwork, on the best stat.
    await expect(page.getByTestId('story-approach')).toHaveCount(3);
    await page.reload();
    await expect(page.getByTestId('story-approach')).toHaveCount(3);
    await expect(page.getByTestId('story-echo')).toHaveText('Keep it to yourself for now');
    // The Paper's Letters row now reads "waiting for you".
    await page.getByRole('link', { name: /^Paper/ }).click();
    await expect(page.getByTestId('letters-row')).toContainText(/waiting for you/i);
  });

  test('the first landing: closing the sheet and tapping another pin at once opens it (lost-tap regression)', async ({
    page,
  }) => {
    await signUpOnly(page, 'Otto Brandt', 0);
    await arrive(page, { faction: 'vanguard', answers: ANSWERS.reference });
    await page.getByRole('button', { name: 'To the city' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: /^Close/ }).click();
    const pin = page.locator('[data-testid="hotspot"][aria-label="3. Beacon House"]');
    await page.waitForTimeout(15);
    await pin.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1500 });
    await expect(page.getByRole('dialog')).toContainText('Beacon House');
  });

  // m3 (minor): a name of spaces passes the form (`required` accepts whitespace), the client trims it
  // to "" and Better Auth accepts it; the server then calls the character "Comrade" in every
  // faction's welcome edition. Expected: the form refuses a blank name.
  // Fixed in fix round 1: 2–40 characters once trimmed, on the form and the server (design §14.2).
  test('m3: sign-up refuses a name made of spaces', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Your name').fill('   ');
    await page.getByRole('group', { name: 'Your face' }).getByTestId('avatar-tile').nth(2).click();
    await page.getByLabel('Email').fill(`qa-blank-${Date.now()}@example.test`);
    await page.getByLabel('Password').fill('qa-password-123');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/signup$/);
  });
});

/** Every hotspot whose centre is not the topmost element (something covers it). */
async function coveredPins(page: Page): Promise<string[]> {
  await expect(page.getByTestId('hotspot')).toHaveCount(6);
  await page.waitForTimeout(800); // the first view is applied after the map measures itself
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid=hotspot]')].flatMap((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + Math.min(22, r.width / 2), r.top + r.height / 2);
      return top && (top === el || el.contains(top)) ? [] : [el.getAttribute('aria-label') ?? '?'];
    }),
  );
}

test.describe('phone 375×812, tabs', () => {
  test.use({ viewport: PHONE });

  // m4 (minor): the shell's <main> keeps its scrollTop across tab changes, so the Me tab opens
  // part-way down (the face, what is worn and the keepsakes are above the fold) after the paper was
  // scrolled. Expected: a tab opens at its top.
  // Fixed in fix round 1: the shell's <main> goes back to its top when the route's path changes.
  test('m4: the Me tab opens at its top after scrolling the paper', async ({ page }) => {
    await signUpOnly(page, 'Otto Brandt', 1);
    await arrive(page, { answers: ANSWERS.reference });
    await expect(page.getByTestId('desk')).toBeVisible();
    await page.evaluate(() => {
      const m = document.querySelector('main')!;
      m.scrollTop = m.scrollHeight;
    });
    await page.getByRole('link', { name: /^Me/ }).click();
    await expect(page.getByTestId('me-party-card')).toBeAttached();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.querySelector('main')!.scrollTop)).toBe(0);
  });
});

test.describe('desktop and tablet: every pin tappable with no sheet open', () => {
  test.use({ isMobile: false, hasTouch: false });

  // M2 (major): on screens from 640 px wide the city plate with its orders list (and the ticker) is
  // not kept clear when the map fits its pins. Ashford's pin 1, Gazette House (welcome order A and
  // the day-1 Copy clerk job), sits under the orders list at 768–1920 px; pin 2 too at 1024×768,
  // 1280×800 and 768×1024. (Seen by hand, not asserted here: with the "paper is in" banner showing,
  // Coalport's pin 6, The Anchor, sits under the ticker at 1280×800.)
  // Expected (slice-1 M2 fix, tech design §12.3): every pin whole and tappable in the first view.
  // Fixed in fix round 1: overlays narrower than the map (the plate, the desktop dock) are blocks the
  // first view keeps pins clear of, and the view is fitted again when the box or the plate changes.
  for (const [faction, city, vp] of [
    ['alliance', 'ashford', DESKTOP],
    ['alliance', 'ashford', { width: 768, height: 1024 }],
  ] as const) {
    test(`M2: ${city} at ${vp.width}×${vp.height}: no pin is under the plate, the orders list or the ticker`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await signUpOnly(page, 'Otto Brandt', 1);
      await arrive(page, { faction, answers: ANSWERS.reference });
      await page.goto(`/city/${city}`);
      const covered = await coveredPins(page);
      test.info().annotations.push({ type: 'covered pins', description: covered.join(', ') });
      expect(covered).toEqual([]);
    });
  }

  test('Duskwall at 1440×900 and every city at 360×640: all six pins tappable', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signUpOnly(page, 'Otto Brandt', 1);
    await arrive(page, { faction: 'vanguard', answers: ANSWERS.reference });
    await page.goto('/city/duskwall');
    expect(await coveredPins(page)).toEqual([]);
    await page.setViewportSize(SMALL);
    await page.reload();
    expect(await coveredPins(page)).toEqual([]);
  });
});

test.describe('small phone 360×640', () => {
  test.use({ viewport: SMALL });

  test('the chapter fits: both choices, then the three approaches and the CTA, then Continue, on the first screen', async ({
    page,
  }) => {
    await signUpOnly(page, 'Otto Brandt', 4);
    await arrive(page, { faction: 'alliance', answers: ANSWERS.reference });
    await page.getByTestId('letters-row').click();
    const choices = page.getByTestId('story-choice');
    await expect(choices).toHaveCount(2);
    for (const c of await choices.all()) await expect(c).toBeInViewport();
    await choices.first().click();
    const approaches = page.getByTestId('story-approach');
    await expect(approaches).toHaveCount(3); // review 1: Legwork
    await approaches.nth(1).click();
    const cta = page.getByTestId('story-cta');
    await expect(cta).toBeInViewport();
    await expect(cta).toContainText('Walk his ward');
    await expect(cta).toContainText('10');
    for (const a of await approaches.all()) await expect(a).toBeInViewport({ ratio: 0.9 });
    await cta.click();
    const modal = modalOf(page);
    await expect(modal.getByRole('button', { name: 'Continue' })).toBeInViewport();
    await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial|Failure)$/);
    await expect(modal).not.toContainText(/failed/i);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('desktop 1440×900, keyboard only', () => {
  test.use({ viewport: DESKTOP, isMobile: false, hasTouch: false });

  test('sign-up, the origin, the street and the join with the keyboard alone', async ({ page }) => {
    await page.goto('/signup');
    const focusIs = async (loc: ReturnType<Page['locator']>) =>
      loc.evaluate((el) => el === document.activeElement || el.contains(document.activeElement));
    const tabTo = async (loc: ReturnType<Page['locator']>, max = 25) => {
      for (let i = 0; i < max; i++) {
        if (await focusIs(loc)) return;
        await page.keyboard.press('Tab');
      }
      throw new Error('not reachable with Tab');
    };
    await tabTo(page.getByLabel('Your name'));
    await page.keyboard.type('Kit Harrow');
    // The faces are a radio group: Tab into it, arrows to move, Space to pick.
    await tabTo(page.getByRole('group', { name: 'Your face' }).getByRole('radio').first());
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(page.getByRole('group', { name: 'Your face' }).getByRole('radio').nth(1)).toBeChecked();
    await tabTo(page.getByLabel('Email'));
    await page.keyboard.type(`qa-kb-${Date.now()}@example.test`);
    await tabTo(page.getByLabel('Password'));
    await page.keyboard.type('qa-password-123');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/arrive$/);

    for (const text of ANSWERS.reference) {
      const btn = page.getByRole('button', {
        name: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      });
      await tabTo(btn);
      await page.keyboard.press('Enter');
      await expect(btn).toBeHidden();
    }
    const card = page.getByRole('radio', { name: /Civic Alliance/ });
    await tabTo(card);
    await page.keyboard.press('Space');
    await expect(card).toHaveAttribute('aria-checked', 'true');
    const join = page.getByTestId('join');
    await tabTo(join);
    await expect(join).toContainText('Join the Civic Alliance · take the train to Ashford');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/paper$/);
    await expect(page.getByRole('heading', { name: 'The Ashford Gazette' })).toBeVisible();
  });
});
