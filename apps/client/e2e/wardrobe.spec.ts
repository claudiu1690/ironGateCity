import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, openLocation, signUp } from './helpers';
import { lifeSweep } from './nationKit';

/**
 * Slice 8 (tech design §15.1, T20; screens §2–§5): the Wardrobe and the shops on a phone at 390 × 844.
 * The Me tab's block (the chips, the four slot cards), a hat bought at the clothes stall, worn from the
 * slot chooser and kept as Town, the full wardrobe sheet, then sold back with the outfit's line, and
 * the party store's coat over its own card. Screenshots to docs/qa/slice-8/.
 */

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const resultModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
const SHOTS = '../../docs/qa/slice-8';

async function toMe(page: Page) {
  await page.goto('/me');
  await expect(page.getByTestId('wardrobe')).toBeVisible();
}

test('the Wardrobe: chips, slots, a hat bought, worn, kept, sold back', async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page, 'Ottla Brenner');
  await lift(page, { level: 6, iron: 2_000 });

  // 1. The Me tab: the kicker and Charisma, Town inverted, four slot cards; the Coat is never empty.
  await toMe(page);
  const block = page.getByTestId('wardrobe');
  await expect(block.getByTestId('wardrobe-cha')).toHaveText(/^Charisma \d+$/);
  await expect(block.getByTestId('outfit-town')).toHaveAttribute('aria-pressed', 'true');
  await expect(block.getByTestId('outfit-plain')).toHaveAttribute('aria-pressed', 'false');
  await expect(block.getByTestId('outfit-line')).toContainText('Town · Charisma');
  for (const s of ['clothing', 'accessory', 'document', 'utility']) await expect(block.getByTestId(`slot-${s}`)).toBeVisible();
  await expect(block.getByTestId('slot-clothing').getByTestId('slot-item')).toBeVisible();
  await expect(block.getByTestId('slot-accessory').getByTestId('slot-empty')).toHaveText('Nothing · tap to choose');
  // Plain words (screens intro): no inventory, slot, tier or CHA anywhere in the block.
  expect(await block.textContent()).not.toMatch(/\b(inventory|equipment|slot|tier|armour|CHA|loadout)\b/);
  // Every control is a 44 px target.
  for (const b of await block.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  // 2. One tap changes the set: Plain clothes inverted, the line follows; back to Town.
  await block.getByTestId('outfit-plain').click();
  await expect(block.getByTestId('outfit-plain')).toHaveAttribute('aria-pressed', 'true');
  await expect(block.getByTestId('outfit-line')).toContainText('Plain clothes · Charisma');
  await block.getByTestId('outfit-town').click();
  await expect(block.getByTestId('outfit-town')).toHaveAttribute('aria-pressed', 'true');
  await block.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/wardrobe.png` });
  await lifeSweep(page, 'wardrobe');

  // 3. The clothes stall at Market Row: the hat for 400 Iron, one tap, the *Bought* modal.
  await page.goto('/city/coalport');
  await mapAtRest(page);
  const sheet = await openLocation(page, '2. Market Row');
  const stall = sheet.locator('[data-testid="shop-card"][data-shop="clothesStall"]');
  await stall.scrollIntoViewIfNeeded();
  await expect(stall).toContainText('For sale · The clothes stall');
  const hat = stall.locator('[data-testid="shop-item"][data-item="acc.good-hat"]');
  await expect(hat.getByTestId('shop-buy')).toHaveText('Buy · 400 Iron');
  await expect(stall.getByTestId('shop-line')).toHaveText("The stall buys too: a coat you don't want, at a tenth");
  await page.screenshot({ path: `${SHOTS}/shop-card.png` });
  await lifeSweep(page, 'shop-card');
  await hat.getByTestId('shop-buy').click();
  const bought = resultModal(page);
  await expect(bought.getByTestId('stamp')).toHaveText('Bought');
  await expect(bought.getByTestId('political-life-0')).toHaveText('−400 Iron');
  await expect(bought).toContainText('Wear it now');
  // The generic Iron line gives way to the life line (nothing prints twice).
  await expect(bought.getByTestId('political-iron')).toHaveCount(0);
  await bought.getByRole('button', { name: 'Continue' }).click();
  await expect(hat.getByTestId('item-state')).toHaveText('Owned');

  // 4. The Me tab: *On you* opens the chooser; *Wear* with the Charisma delta; the sheet closes.
  await toMe(page);
  const cha0 = Number((await block.getByTestId('wardrobe-cha').textContent())!.replace(/\D/g, ''));
  await block.getByTestId('slot-accessory').click();
  const chooser = page.getByTestId('slot-chooser');
  await expect(chooser.getByTestId('chooser-wearing')).toHaveText('Nothing on');
  await expect(chooser.getByTestId('item-delta')).toHaveText(`Charisma ${cha0} → ${cha0 + 6}`);
  await chooser.getByTestId('item-wear').click();
  await expect(chooser).toHaveCount(0);
  await expect(block.getByTestId('slot-accessory').getByTestId('slot-item')).toHaveText('A good hat');
  await expect(block.getByTestId('wardrobe-cha')).toHaveText(`Charisma ${cha0 + 6}`);

  // 5. The worn set matches no saved outfit: no chip inverted, *Keep this as Town* saves it.
  await expect(block.getByTestId('outfit-town')).toHaveAttribute('aria-pressed', 'false');
  await block.getByTestId('outfit-keep').click();
  await expect(block.getByTestId('outfit-town')).toHaveAttribute('aria-pressed', 'true');
  await expect(block.getByTestId('outfit-keep')).toHaveCount(0);

  // 6. *Everything you own*: the groups, the hat worn, the sheet's foot.
  await block.getByTestId('wardrobe-all').click();
  const all = page.getByTestId('wardrobe-sheet');
  await expect(all.getByTestId('group-accessory').getByTestId('item-name')).toHaveText('A good hat');
  await expect(all.getByTestId('group-accessory').getByTestId('item-state')).toHaveText('Wearing');
  await expect(all.getByTestId('wardrobe-sellable')).toHaveText(/^Sells at a market: \d+ things$/);
  await page.keyboard.press('Escape');

  // 7. Selling a worn hat is refused (*Take it off first*); off, it sells for a tenth, out of Town.
  await page.goto('/city/coalport');
  await mapAtRest(page);
  await openLocation(page, '2. Market Row');
  await stall.getByTestId('shop-sell').click();
  const sell = page.getByTestId('sell-sheet');
  const row = sell.locator('[data-testid="sell-row"][data-item="acc.good-hat"]');
  await expect(row).toContainText('Take it off first');
  await page.keyboard.press('Escape');
  await toMe(page);
  await block.getByTestId('slot-accessory').click();
  await page.getByTestId('chooser-take-off').click();
  await expect(block.getByTestId('slot-accessory').getByTestId('slot-empty')).toBeVisible();
  await page.goto('/city/coalport');
  await mapAtRest(page);
  await openLocation(page, '2. Market Row');
  await stall.getByTestId('shop-sell').click();
  await row.getByTestId('sell-row-sell').click();
  await expect(row.getByTestId('sell-confirm')).toContainText('Sell A good hat for 40 Iron?');
  await expect(row.getByTestId('sell-confirm')).toContainText("It's in your Town outfit; selling takes it out.");
  await row.getByTestId('sell-confirm-sell').click();
  const sold = resultModal(page);
  await expect(sold.getByTestId('stamp')).toHaveText('Sold');
  await expect(sold).toContainText('+40 Iron');
  await expect(sold).toContainText('Taken out of your Town outfit');
  await sold.getByRole('button', { name: 'Continue' }).click();
});

test("the party store: the party's coat at Level 6, over the Jobs card", async ({ page }) => {
  test.setTimeout(180_000);
  await signUp(page, 'Ida Wenzel');
  await lift(page, { level: 6, iron: 1_500 });
  await page.goto('/city/coalport');
  await mapAtRest(page);
  const sheet = await openLocation(page, '3. Union Hall');
  const store = sheet.locator('[data-testid="shop-card"][data-shop="partyStore"]');
  await store.scrollIntoViewIfNeeded();
  await expect(store).toContainText('For sale · The party store');
  // The shop card sits above the Jobs card (screens §4).
  const jobs = sheet.getByRole('region', { name: 'Jobs' });
  if ((await jobs.count()) > 0) expect((await store.boundingBox())!.y).toBeLessThan((await jobs.boundingBox())!.y);
  const coat = store.locator('[data-testid="shop-item"][data-item="outfit.convenors-coat"]');
  await expect(coat.getByTestId('item-effect')).toContainText('Charisma 12');
  await coat.getByTestId('shop-buy').click();
  const bought = resultModal(page);
  await expect(bought.getByTestId('stamp')).toHaveText('Bought');
  await bought.getByRole('button', { name: 'Continue' }).click();
  // Worn from the Coat chooser: Charisma 12 on the slot's line.
  await page.goto('/me');
  await page.getByTestId('slot-clothing').click();
  const chooser = page.getByTestId('slot-chooser');
  await chooser.locator('[data-item="outfit.convenors-coat"]').getByTestId('item-wear').click();
  await expect(page.getByTestId('slot-clothing').getByTestId('slot-item')).toHaveText("Convenor's coat");
  // The Coat has no *Take it off* (a character is never coatless).
  await page.getByTestId('slot-clothing').click();
  await expect(page.getByTestId('chooser-take-off')).toHaveCount(0);
});
