import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ANSWERS, PLATFORM_ROWS, answer, signUpOnly } from './helpers';

/**
 * Review 4 (tech design docs/tech/review-4.md §18.2–§18.3, T28): a walk through the notes a browser
 * can check from a new account, one step each, with the vocabulary sweep on every screen it passes
 * (GDD §1.5's plain words, CLAUDE.md rule 2's campaign vocabulary, #16: nothing invites the player to
 * close the game). The notes that need a journey, a council seat or the cells are walked in their own
 * specs, in the projects before this one:
 *
 * | Note | Spec |
 * |---|---|
 * | 7 the journey on the map, the card on the way; 23 a local edition | `travel.spec.ts`, `rival.spec.ts` |
 * | 8 Irongate's districts tile the picture | `capital.spec.ts` |
 * | 9 *Live here*, a bed at the Junction | `qa.slice4.spec.ts` |
 * | 10 *What now* and the desk; 11 the hall's rule line | `council.spec.ts` |
 * | 13 orders away; 19–20 the cells' list and costs | `rival.spec.ts`, `missions.spec.ts` |
 * | 6 the third order's line | `review1.spec.ts` |
 * | 22 orders that can be carried out | `qa.slice5.spec.ts` |
 * | 3 the paper on a desk at 1280 and 959 px | `landscape.spec.ts` (and 1440 here) |
 */

/** The answers' system terms (GDD §1.5, review 2 §1.13) and the war words (CLAUDE.md rule 2). */
const SYSTEM = /(?<![.\-_\w])(canvass\w*|leaflet\w*|propaganda|ordinance\w*|endorse\w*|FXP\b|PC\b|Local Standing|groundswell)/i;
const WAR =
  /\b(war|wars|battle|troops|army|militia|enemy|enemies|uprising|front line|frontline|siege|invasion|comrades?|uniforms?|salute)\b/i;

/** The words a player reads on this screen: none is a system term, a war word or *close the game*. */
async function plainWords(page: Page, screen: string) {
  const text = await page.locator('body').innerText();
  expect(text.match(SYSTEM)?.[0] ?? null, `${screen}: system term`).toBeNull();
  expect(text.match(WAR)?.[0] ?? null, `${screen}: war word`).toBeNull();
  expect(/close the game/i.test(text), `${screen}: close the game`).toBe(false);
}

test('review 4: the notes a new member meets, in order, in plain words', async ({ page }) => {
  test.setTimeout(150_000);

  // #1: the sign-up form offers eighteen faces.
  await page.goto('/signup');
  await expect(page.getByRole('group', { name: 'Your face' }).getByTestId('avatar-tile')).toHaveCount(18);
  await signUpOnly(page, 'Vera Kallas', 4);

  // #2: *The Last Train In*. The platform: three people; whom you help is your party.
  await expect(page.getByRole('heading', { name: 'The platform' })).toBeVisible();
  await plainWords(page, 'the platform');
  await page.getByRole('radio', { name: PLATFORM_ROWS.collective }).click();
  await page.getByTestId('story-confirm').click();
  await expect(page.getByRole('heading', { name: 'The suitcase' })).toBeVisible();
  await expect(page.getByTestId('story-echo')).toHaveText("You carried Holm's parcel.");
  await plainWords(page, 'the suitcase');
  await answer(page, ANSWERS.reference[0]!);
  await expect(page.getByRole('heading', { name: 'The lining' })).toBeVisible();
  await plainWords(page, 'the lining');
  await answer(page, ANSWERS.reference[1]!);

  // The welcome edition: the deck names the favour; Holm signs the orders.
  await expect(page).toHaveURL(/\/paper$/);
  await expect(page.getByTestId('headline').first()).toContainText("Holm's parcel wants delivering at the Union Hall");
  await expect(page.getByTestId('orders').getByTestId('order').nth(1)).toContainText("Deliver Holm's parcel");
  await plainWords(page, 'the welcome edition');
  // #4: the clock in the top bar.
  await expect(page.getByTestId('hud-clock')).toHaveText(/^\d\d:\d\d$/);

  // #3: from 960 px the paper is a 720 px sheet on a desk.
  await page.setViewportSize({ width: 1440, height: 900 });
  const sheetBox = (await page.getByTestId('paper-sheet').boundingBox())!;
  expect(sheetBox.width).toBeGreaterThan(700);
  expect(sheetBox.width).toBeLessThanOrEqual(740);
  await page.setViewportSize({ width: 412, height: 839 });

  // #25: the Party XP label opens the rank ladder, seven rows, yours marked.
  await page.getByTestId('hud-help').click();
  await page.getByTestId('help-note').getByRole('button', { name: 'See the ranks' }).click();
  const ladder = page.getByTestId('rank-ladder');
  await expect(ladder.getByTestId('rank-row')).toHaveCount(7);
  await expect(ladder.getByTestId('rank-you')).toHaveCount(1);
  await plainWords(page, 'the rank ladder');
  await page.keyboard.press('Escape');
  await expect(ladder).toBeHidden();

  // #2 (§7.5): the first landing is the Union Hall with the favour highlighted; it is the first result.
  await page.getByRole('button', { name: 'To the city' }).click();
  await expect(page).toHaveURL(/\?loc=coalport\.union-hall&act=coalport\.union-hall\.favour/);
  const sheet = page.getByRole('dialog');
  const favour = sheet.getByTestId('ticket-coalport.union-hall.favour');
  await expect(favour).toHaveAttribute('data-highlight', 'true');
  await plainWords(page, 'the Union Hall');
  await favour.getByRole('button', { name: 'Deliver the parcel, once, 10 Energy' }).click();
  const modal = page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
  await expect(modal.getByTestId('stamp')).toHaveText(/^(Success|Partial)$/);
  await expect(modal.getByTestId('effect-order-signed')).toContainText('— P.H.');
  await plainWords(page, 'the favour’s result');
  await modal.getByRole('button', { name: 'Continue' }).click();
  // Once only: the favour has left the sheet; the committee is still there.
  await expect(sheet.getByTestId('ticket-coalport.union-hall.favour')).toHaveCount(0);
  await expect(sheet.getByTestId('ticket-coalport.union-hall.committee')).toBeVisible();
  await sheet.getByRole('button', { name: /^Close/ }).click();

  // #21: Coalport is one map: no districts, greyed locked pins with their note; #11: a Town Hall pin.
  await expect(page.getByTestId('city-map')).toHaveAttribute('data-zoomed', 'false');
  await expect(page.getByTestId('locked-pin').first()).toBeAttached();
  const labels = await page
    .locator('[data-testid="hotspot"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
  expect(labels.some((l) => /Town Hall$/.test(l))).toBe(true);
  await plainWords(page, 'Coalport');
  // #18: Reputation said in plain words on the Places list, and #14: the Issue chip when one is drawn.
  await page.getByTestId('places-button').filter({ visible: true }).click();
  await expect(page.getByRole('dialog', { name: /^Places in / })).toBeVisible();
  await plainWords(page, 'the Places list');
});
