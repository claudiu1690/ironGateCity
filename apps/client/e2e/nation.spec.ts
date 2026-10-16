/* eslint-disable @typescript-eslint/no-explicit-any -- the spec reads untyped tRPC JSON */
import { expect, test } from '@playwright/test';
import { closeModal, hook, memberContext, read, shot, sweep, termDay, testMembers } from './nationKit';

/**
 * Slice 7 (tech design §15.1 `nation.spec.ts`), the Parliament and election half, on a phone at
 * 390 × 844 on the test clock: term day 19, a Rank 6 Collective with a term in Parliament stands for
 * President with two pledges and a Rank 5 stands for Parliament; day 21 the party's pick (the figure's
 * row, run by the game); day 23 the three candidates, the vote and a backing; day 27 the result *To be
 * confirmed* with the `ScoreTable`; day 0 *Final*, the President's page and the chamber; the deputy
 * puts the Eight-Hour Day Act to Parliament, votes For, and after the division and the signature day
 * the law book shows it. (The nation map's half and the desk's wage line are lane Y's.)
 */

const TERM_EPOCH = 20_458;
const termDayOf = (day: number) => (((day - TERM_EPOCH) % 28) + 28) % 28;

test.describe.configure({ mode: 'serial' });

test('nation: stand, the pick, the vote, the result; a law put to Parliament becomes law', async ({ browser }) => {
  test.setTimeout(300_000);
  const a = await memberContext(browser, 'Nina Brandt', { seed: { rank: 6, pc: 600, energy: 100 } });
  // One record each: the record hook's rows are keyed by office and day, not by holder (lane 1's
  // hook; two characters recording the same office on one day share the rows).
  await hook(a.api, 'office', { record: { characterId: 'me', deputy: 1 } });
  const b = await memberContext(browser, 'Paul Marek', { seed: { rank: 5, pc: 400, energy: 100 } });
  await hook(b.api, 'office', { record: { characterId: 'me', council: 3 } });
  await hook(a.api, 'clock', { advanceMs: 15 * 86_400_000 });

  // 1. Day 19: names in. Nina stands for President with two pledges; Paul for Parliament.
  await termDay(a.api, 19);
  await a.page.goto('/election/national');
  await expect(a.page.getByTestId('national-page')).toHaveAttribute('data-status', 'names');
  await a.page.getByTestId('stand-president').click();
  const sheet = a.page.getByTestId('pledge-sheet');
  await sheet.locator('[data-law-id="law.eight-hour-day"]').click();
  await sheet.locator('[data-law-id="law.universal-care"]').click();
  await sheet.getByTestId('pledge-stand').click();
  await closeModal(a.page);
  await expect(a.page.getByTestId('standing-president')).toBeVisible();
  await b.page.goto('/election/national');
  await b.page.getByTestId('stand-list').click();
  await closeModal(b.page);
  await expect(b.page.getByTestId('list-panel')).toContainText('Paul Marek');
  await sweep(b.page, 'the list');

  // 2. Day 21: the party's pick, the figure's row run by the game; Nina chooses herself.
  await termDay(a.api, 21);
  await a.page.goto('/election/pick');
  await expect(a.page.getByTestId('pick-row').filter({ hasText: 'run by the game' })).toBeVisible();
  await a.page.getByTestId('pick-vote-now').click();
  await expect(a.page).toHaveURL(/\/election\/pick\/vote$/);
  await a.page.getByTestId('pick-row').filter({ hasText: 'Nina Brandt' }).locator('button').click();
  await expect(a.page.getByTestId('pick-choose')).toHaveText('Choose Nina Brandt');
  await a.page.getByTestId('pick-choose').click();
  await closeModal(a.page);
  const pick = (await read(a.api, 'nation.pick')).data;
  const ninaKey = pick.ballot.find((r: any) => r.name === 'Nina Brandt').key as string;
  const members = await testMembers(a.api, 3, { rank: 2 });
  await hook(a.api, 'ballots', { pick: { as: members, key: ninaKey } });

  // 3. Day 23: the three candidates; Nina's vote; Paul backs her; test members vote Collective.
  await termDay(a.api, 23);
  await a.page.goto('/election/national');
  await expect(a.page.getByTestId('national-row')).toHaveCount(3);
  await expect(a.page.locator('[data-testid=national-row][data-key=collective]')).toContainText('Nina Brandt');
  await a.page.getByTestId('national-vote-now').click();
  await a.page.locator('[data-testid=national-row][data-key=collective] button').first().click();
  await expect(a.page.getByTestId('national-vote')).toHaveText('Vote for Nina Brandt');
  await sweep(a.page, 'the national ballot');
  await shot(a.page, 'national-ballot');
  await a.page.getByTestId('national-vote').click();
  await closeModal(a.page);
  await expect(a.page.getByTestId('vote-cast')).toBeVisible();
  await b.page.goto('/election/national');
  await b.page.getByTestId('back-president').click();
  await closeModal(b.page);
  await hook(a.api, 'ballots', { nation: { as: members, factionId: 'collective' } });
  // Who holds the republic, for the count's boundary.
  await hook(a.api, 'nation', { control: { collective: 70, vanguard: 15, alliance: 15 } });

  // 4. Day 27: the result, to be confirmed; the ScoreTable's seven columns.
  await termDay(a.api, 27);
  await a.page.goto('/election/national/result');
  await expect(a.page.getByTestId('national-result')).toHaveAttribute('data-stamp', 'toBeConfirmed');
  await expect(a.page.getByTestId('nation-stamp')).toContainText('To be confirmed');
  await expect(a.page.getByTestId('score-row')).toHaveCount(3);
  await expect(a.page.locator('[data-testid=score-row][data-faction=collective]')).toContainText('President');

  // 5. Day 0: final; the President's page; the chamber.
  await termDay(a.api, 0);
  await a.page.reload();
  await expect(a.page.getByTestId('national-result')).toHaveAttribute('data-stamp', 'final');
  await a.page.goto('/office/president');
  await expect(a.page.getByTestId('president-header')).toContainText('Nina Brandt');
  await expect(a.page.getByTestId('pledge-row')).toHaveCount(2);
  await sweep(a.page, "the President's page");
  await shot(a.page, 'president');

  // 6. Paul, a deputy, puts a law to Parliament and votes For. (The secretaries' Monday bills may hold
  // the Eight-Hour Day Act already on day 0, so the spec takes the first law the sheet offers.)
  await b.page.goto('/parliament');
  await expect(b.page.getByTestId('parliament-page')).toBeVisible();
  await b.page.getByTestId('table-a-law').click();
  const offered = b.page.locator('[data-testid=catalogue-row] button:not([disabled])').first();
  const lawName = (await offered.locator('span').first().textContent())!.trim();
  await offered.click();
  await closeModal(b.page);
  await expect(b.page).toHaveURL(/\/parliament\/bill\/[0-9a-f]{24}$/);
  const billId = b.page.url().match(/bill\/([0-9a-f]{24})/)![1]!;
  await expect(b.page.getByTestId('bill-title')).toHaveText(lawName);
  await expect(b.page.getByTestId('bill-page')).toHaveAttribute('data-state', 'voting');
  await b.page.getByTestId('bill-pick-for').click();
  await expect(b.page.getByTestId('bill-vote')).toHaveText(`Vote For ${lawName}`);
  await sweep(b.page, 'the bill');
  await shot(b.page, 'bill');
  await b.page.getByTestId('bill-vote').click();
  await closeModal(b.page);
  await b.page.goto('/parliament');
  await expect(b.page.locator(`[data-testid=bill-row][data-bill-id="${billId}"]`)).toContainText('your vote: For');
  await sweep(b.page, 'the chamber');
  await shot(b.page, 'parliament');

  // 7. The division, then the signature day (the President's veto card), then the law in force.
  const bill = (await read(b.api, 'parliament.bill', { billId })).data;
  await termDay(a.api, termDayOf(bill.divideDay));
  const divided = (await read(a.api, 'parliament.bill', { billId })).data;
  const note = JSON.stringify({ state: divided.state, counts: divided.counts, division: divided.division });
  test.info().annotations.push({ type: 'division', description: note });
  console.log(`division: ${note}`);
  await a.page.goto(`/parliament/bill/${billId}`);
  expect(divided.state).not.toBe('voting');
  if (divided.state === 'failed') {
    // The chamber decided against it (the locals' lines): the page says so with its stamp.
    await expect(a.page.getByTestId('nation-stamp')).toContainText('Fell');
  } else {
    await expect(a.page.getByTestId('nation-stamp')).toContainText('Passed');
    if (divided.state === 'awaitingSignature') {
      await expect(a.page.getByTestId('veto-card')).toBeVisible();
      await termDay(a.api, termDayOf(bill.divideDay + 1));
    }
    await a.page.goto('/parliament/laws');
    await expect(a.page.getByTestId('law-in-force').filter({ hasText: lawName })).toBeVisible();
    await sweep(a.page, 'the law book');
  }
  await a.ctx.close();
  await b.ctx.close();
});
