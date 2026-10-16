/* eslint-disable @typescript-eslint/no-explicit-any -- the spec reads untyped tRPC JSON */
import { expect, test } from '@playwright/test';
import { closeModal, hook, memberContext, read, selectedChipCues, shot, sweep, termDay, testMembers } from './nationKit';

/**
 * Slice 7 (tech design §15.1 `chair.spec.ts`), on a phone at 390 × 844: a Rank 4 Collective with a
 * completed council term stands for Chair on term day 9 (no backers needed; a test member backs her);
 * on day 11 she votes (the secretary's row on the ballot) and test members vote for her; on day 14
 * she Chairs the Collective: the desk's Chair chip, three picks and the push, **Set the orders**; the
 * next day her own Orders read *Set by the Chair*. Then the vote on the Chair by petition (a Rank 3
 * member opens it, test members sign; review 5's Unrest hook only reaches a rival's home city, so the
 * automatic vote is not driven here): test members vote No and the secretary acts.
 */

test.describe.configure({ mode: 'serial' });

test('chair: stand, back, vote, the desk, the orders set; the vote on the Chair removes her', async ({ browser }) => {
  test.setTimeout(540_000);
  const a = await memberContext(browser, 'Anna Kessel', { seed: { rank: 4, pc: 300, energy: 100 } });
  await hook(a.api, 'office', { record: { characterId: 'me', council: 1 } });
  // Fourteen days in the party (the stand's tenure), then names in on term day 9.
  await hook(a.api, 'clock', { advanceMs: 15 * 86_400_000 });
  await termDay(a.api, 9);
  const members = await testMembers(a.api, 4, { rank: 3 });

  // 1. The Faction tab's sixth chip, Chair (Rank 4+), with the strip's three cues.
  await a.page.goto('/faction?tab=chair');
  await expect(a.page.getByTestId('faction-tab-chair')).toHaveText('Chair');
  await selectedChipCues(a.page, 'faction-tab-chair');
  await expect(a.page.getByTestId('chair-page')).toBeVisible();
  const card = a.page.getByTestId('chair-election-card');
  await expect(card.getByTestId('chair-card-line1')).toHaveText('Names in for Chair');
  await expect(card.getByTestId('chair-card-cta')).toHaveText('Stand for Chair · 25 Political Capital');
  await sweep(a.page, 'the Chair page');
  await card.getByTestId('chair-card-cta').click();
  await expect(a.page).toHaveURL(/\/faction\/election$/);
  await expect(a.page.getByTestId('chair-secretary')).toContainText('run by the game');
  await a.page.getByTestId('chair-stand').click();
  await closeModal(a.page);
  const row = a.page.getByTestId('chair-candidate').filter({ hasText: 'Anna Kessel' });
  await expect(row).toContainText('0 backers');
  const candidacyId = (await row.getAttribute('data-key'))!;
  expect(candidacyId).toMatch(/^[0-9a-f]{24}$/);
  const annaKey = ((await read(a.api, 'chairElection.get')).data.candidates as any[]).find((c) => c.you).key as string;

  // 2. A test member backs her (+3 support at the count; the row's backers are public).
  const backed = await hook(a.api, 'ballots', { chairBack: { as: [members[0]], candidacyId } });
  expect(backed.results[0].ok, JSON.stringify(backed)).toBe(true);
  await a.page.reload();
  await expect(a.page.getByTestId('chair-candidate').filter({ hasText: 'Anna Kessel' })).toContainText('1 backer');

  // 3. Day 11: the vote, the secretary's row on the ballot; her vote, then test members'.
  await termDay(a.api, 11);
  await a.page.goto('/faction/election/vote');
  await expect(a.page.locator('[data-testid=chair-vote-row][data-key="n:secretary"]')).toBeVisible();
  await a.page.locator(`[data-testid=chair-vote-row][data-key="${annaKey}"] button`).click();
  await expect(a.page.getByTestId('chair-vote')).toHaveText('Vote for Anna Kessel');
  await sweep(a.page, 'the Chair ballot');
  await a.page.getByTestId('chair-vote').click();
  await closeModal(a.page);
  const voted = await hook(a.api, 'ballots', { chair: { as: members.slice(1, 3), key: annaKey } });
  expect(voted.results.every((r: any) => r.ok), JSON.stringify(voted)).toBe(true);
  // Secret: the view carries no count before the count.
  const during = await read(a.api, 'chairElection.get');
  expect(during.raw).not.toMatch(/"votes":\s*\d/);

  // 4. Day 14: she Chairs the Collective; the result names her.
  await termDay(a.api, 14);
  await a.page.goto('/faction/election/result');
  await expect(a.page.getByTestId('chair-election-header')).toContainText('Anna Kessel is Chair');
  await expect(a.page.locator('[data-testid=chair-result-row][data-kind=secretary]')).toBeVisible();

  // 5. The desk: three picks, the push to an Irongate district at 25, Set the orders.
  await a.page.goto('/faction?tab=chair');
  await expect(a.page.getByTestId('chair-desk')).toBeVisible();
  await expect(a.page.getByTestId('desk-part-orders')).toHaveAttribute('aria-current', 'page');
  for (const slot of ['A', 'B', 'C'] as const) {
    await a.page.getByTestId(`order-picker-${slot}`).click();
    const menu = a.page.getByTestId(`order-menu-${slot}`);
    await menu.locator('[data-testid=order-option]:not([data-family=rotation])').first().click();
    await expect(menu).toHaveCount(0);
    await expect(a.page.getByTestId(`order-picker-${slot}`).getByTestId('order-picker-value')).not.toHaveText(
      "the secretary's rotation",
    );
  }
  // The layout check (screens §14): the strip, the kicker and two pickers above the fold, the sticky button.
  const fold = 844;
  expect((await a.page.getByTestId('order-picker-B').boundingBox())!.y + 56).toBeLessThan(fold);
  await expect(a.page.getByTestId('set-orders')).toBeInViewport();
  await shot(a.page, 'chair-desk');
  await a.page.getByTestId('push-toggle').check();
  await a.page.getByTestId('push-place').first().click();
  await a.page.getByTestId('push-target-25').click();
  await sweep(a.page, 'the desk');
  await a.page.getByTestId('set-orders').click();
  await closeModal(a.page);
  await expect(a.page.getByTestId('orders-set')).toContainText('Set · from tomorrow');

  // 6. Lines: nothing up yet, or one LineRow per bill with the three chips.
  await a.page.getByTestId('desk-part-lines').click();
  await expect(a.page.getByTestId('desk-lines')).toBeVisible();
  await expect(a.page.getByTestId('rule-row').first()).toBeVisible();

  // 7. The next day her own Orders read *Set by the Chair, Anna Kessel*.
  await termDay(a.api, 15);
  await a.page.goto('/faction?tab=orders');
  await expect(a.page.getByTestId('orders-set-by').first()).toHaveText('Set by the Chair, Anna Kessel');

  // 8. The vote on the Chair: day 19, a Rank 3 member opens the petition; test members sign.
  await termDay(a.api, 19);
  const b = await memberContext(browser, 'Bruno Fehr', { seed: { rank: 3, pc: 100 } });
  await b.page.goto('/faction/confidence');
  await expect(b.page.getByTestId('confidence-page')).toBeVisible();
  await b.page.getByTestId('confidence-open').click();
  await closeModal(b.page);
  const info = (await read(b.api, 'confidence.get')).data;
  const needed = info.petition.needed as number;
  // The close counts again with the new members among the active ones: sign well over a quarter.
  const signers = await testMembers(a.api, Math.ceil(needed * 1.4) + 3, { rank: 3 });
  await hook(a.api, 'petition', { chairSign: { as: signers } });
  // Day 21: the names are in; every member votes for two days.
  await termDay(a.api, 21);
  const vote = (await read(b.api, 'confidence.get')).data.vote;
  expect(vote, 'the vote on the Chair is open').toBeTruthy();
  await b.page.goto('/faction/confidence');
  await expect(b.page.getByTestId('confidence-ballot')).toContainText('Confidence in Anna Kessel');
  await b.page.locator('[data-testid=confidence-row][data-key=noConfidence] button').click();
  await sweep(b.page, 'the vote on the Chair');
  await b.page.getByTestId('confidence-cast').click();
  await closeModal(b.page);
  const no = await hook(a.api, 'ballots', { confidence: { as: [...members, ...signers].slice(0, 8), voteId: vote.voteId, choice: 'noConfidence' } });
  expect(no.results.filter((r: any) => r.ok).length).toBeGreaterThanOrEqual(3);
  // Day 23: removed; the secretary acts until the next election.
  await termDay(a.api, 23);
  const after = (await read(a.api, 'confidence.get')).data;
  expect(after.last?.removed, JSON.stringify(after.last)).toBe(true);
  await a.page.goto('/faction?tab=chair');
  await expect(a.page.getByTestId('chair-page')).toBeVisible();
  await expect(a.page.getByTestId('chair-holder')).toContainText('The secretary runs the branch');
  await b.ctx.close();
  await a.ctx.close();
});
