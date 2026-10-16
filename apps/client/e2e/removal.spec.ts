/* eslint-disable @typescript-eslint/no-explicit-any -- the spec reads untyped tRPC JSON */
import { expect, test } from '@playwright/test';
import { closeModal, hook, memberContext, read, sweep, termDay, testMembers } from './nationKit';

/**
 * Slice 7 (tech design §15.1 `removal.spec.ts`), on a phone at 390 × 844: a player President (hook)
 * and a player deputy of another party; the deputy puts **A vote to remove the President** to
 * Parliament from the catalogue sheet; sixteen test deputies vote For; at the division the bill's page
 * carries *Removed* (and the President's page the runner-up) or *Survived*, as the count says (the
 * locals follow the party lines, so the outcome is the chamber's; both stamps are checked against the
 * count). The veto's override run (36 of 40) is left to QA with lane 2's hooks.
 */

const TERM_EPOCH = 20_458;
const termDayOf = (day: number) => (((day - TERM_EPOCH) % 28) + 28) % 28;

test.describe.configure({ mode: 'serial' });

test('removal: a deputy tables a vote to remove the President; the division decides it', async ({ browser }) => {
  test.setTimeout(420_000);
  // Term day 6: a removal can be put up (not on days 0–4 or 24–27).
  const p = await memberContext(browser, 'Otto Lindqvist', { party: 'vanguard', seed: { rank: 6, pc: 100 } });
  await termDay(p.api, 6);
  await hook(p.api, 'office', { seat: { characterId: 'me', office: 'president' } });
  const d = await memberContext(browser, 'Rosa Hein', { seed: { rank: 5, pc: 200 } });
  await hook(d.api, 'office', { seat: { characterId: 'me', office: 'deputy' } });

  // The President's page names the holder.
  await p.page.goto('/office/president');
  await expect(p.page.getByTestId('president-header')).toContainText('Otto Lindqvist');
  await expect(p.page.getByTestId('president-page')).toHaveAttribute('data-you', 'true');

  // The deputy: the catalogue sheet's last row.
  await d.page.goto('/parliament');
  await d.page.getByTestId('table-a-law').click();
  await expect(d.page.getByTestId('table-sheet')).toBeVisible();
  await sweep(d.page, 'the catalogue');
  await d.page.getByTestId('table-removal').click();
  await closeModal(d.page);
  await expect(d.page).toHaveURL(/\/parliament\/bill\/[0-9a-f]{24}$/);
  const billId = d.page.url().match(/bill\/([0-9a-f]{24})/)![1]!;
  await expect(d.page.getByTestId('bill-page')).toHaveAttribute('data-kind', 'removal');
  await expect(d.page.getByTestId('what-it-does')).toContainText('Removes Otto Lindqvist;');
  await d.page.goto('/parliament');
  await expect(d.page.locator(`[data-testid=bill-row][data-bill-id="${billId}"] [data-testid=bill-tag]`)).toHaveText(
    'a vote to remove the President · needs 40',
  );

  // Sixteen test deputies of the deputy's party vote For (the chamber's votes are public).
  const deputies = await testMembers(d.api, 16, { rank: 5 });
  await hook(d.api, 'parliament', { deputies: { as: deputies } });
  const votes = await hook(d.api, 'parliament', { votes: { billId, as: deputies, vote: 'for' } });
  expect(votes.results.filter((r: any) => r.ok).length).toBe(16);
  await d.page.goto(`/parliament/bill/${billId}`);
  await expect(d.page.getByTestId('count-for')).toContainText('16');

  // The division.
  const bill = (await read(d.api, 'parliament.bill', { billId })).data;
  await termDay(d.api, termDayOf(bill.divideDay));
  const after = (await read(d.api, 'parliament.bill', { billId })).data;
  await d.page.goto(`/parliament/bill/${billId}`);
  if (after.counts.for >= 40) {
    expect(after.state).toBe('removed');
    await expect(d.page.getByTestId('nation-stamp')).toContainText('Removed');
    await p.page.goto('/office/president');
    await expect(p.page.getByTestId('president-header')).not.toContainText('Otto Lindqvist');
  } else {
    expect(after.state).toBe('survived');
    await expect(d.page.getByTestId('nation-stamp')).toContainText('Survived');
  }
  await p.ctx.close();
  await d.ctx.close();
});
