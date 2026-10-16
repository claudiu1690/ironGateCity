/* eslint-disable @typescript-eslint/no-explicit-any -- the spec reads untyped tRPC JSON */
import { expect, test } from '@playwright/test';
import { closeModal, hook, memberContext, read, sweep, testMembers } from './nationKit';

/**
 * Slice 7 (tech design §15.1 `petition.spec.ts`), on a phone at 390 × 844: a petition to dissolve a
 * council. Built on Coalport's council (the residents of a home town: the e2e database is shared, and
 * Clearwater's residence is lane Y's), the same page and rule: on cycle day 1 a Rank 3 resident opens
 * it (**Open it · 10 Political Capital**), a second resident signs on the page, test members sign to
 * the needed count; the Election card carries the petition's line; the close dissolves the council
 * (*Dissolved* over the bar).
 */

test.describe.configure({ mode: 'serial' });

const advanceTo = async (api: any, cityId: string, cycleDay: number) => {
  await hook(api, 'clock', { advanceTo: { cityId, cycleDay } });
  await hook(api, 'city-day');
};

test('petition: open, sign, the card line, the close dissolves the council', async ({ browser }) => {
  test.setTimeout(420_000);
  const residence = { cityId: 'coalport', districtId: null };
  const a = await memberContext(browser, 'Ida Wenzel', { seed: { rank: 3, pc: 100, energy: 100, residence } });
  const b = await memberContext(browser, 'Karl Ostrow', { seed: { rank: 2, pc: 100, residence } });

  // Cycle day 1 in Coalport: the council's first three days.
  await advanceTo(a.api, 'coalport', 1);
  await a.page.goto('/council/petition');
  await expect(a.page.getByTestId('petition-page')).toHaveAttribute('data-state', /none|dissolved|fellShort/);
  await expect(a.page.getByTestId('petition-kicker')).toHaveText(/Coalport council · a petition/i);
  await a.page.getByTestId('petition-open').click();
  await closeModal(a.page);
  await expect(a.page.getByTestId('petition-page')).toHaveAttribute('data-state', 'open');
  await expect(a.page.getByTestId('signature-bar')).toHaveAttribute('data-count', '1');
  await sweep(a.page, 'the petition');

  // A second resident signs on the page; its button reads the price.
  await b.page.goto('/council/petition');
  await expect(b.page.getByTestId('petition-sign')).toHaveText('Sign · 10 Political Capital');
  await b.page.getByTestId('petition-sign').click();
  await closeModal(b.page);
  await expect(b.page.getByTestId('petition-signed')).toHaveText('Signed');

  // The Election card's petition line (the card layout: a wide screen's side column).
  await a.page.setViewportSize({ width: 1280, height: 800 });
  await a.page.goto('/city/coalport');
  await expect(a.page.getByTestId('election-petition').first()).toContainText(/A petition to dissolve the council: \d+ of \d+ names by/);
  await a.page.setViewportSize({ width: 390, height: 844 });

  // Test members (residents, Rank 2) sign to the needed count, with room for the close's recount.
  const p = (await read(a.api, 'petition.get')).data;
  const needed = p.open.needed as number;
  const signers = await testMembers(a.api, Math.ceil(needed * 1.4) + 2, { rank: 2, cityId: 'coalport' });
  const signed = await hook(a.api, 'petition', { sign: { as: signers, petitionId: p.open.id } });
  const ok = signed.results.filter((r: any) => r.ok).length;
  expect(ok, JSON.stringify(signed.results.find((r: any) => !r.ok) ?? {})).toBeGreaterThan(0);
  await a.page.goto('/council/petition');
  await expect(a.page.getByTestId('signature-bar')).toHaveAttribute('data-count', String(2 + ok));

  // The close (the second boundary after the opening): dissolved.
  await advanceTo(a.api, 'coalport', 3);
  await a.page.goto('/council/petition');
  const state = await a.page.getByTestId('petition-page').getAttribute('data-state');
  const last = (await read(a.api, 'petition.get')).data.last;
  expect(last, 'the petition has closed').toBeTruthy();
  expect(state).toBe(last.outcome === 'dissolved' ? 'dissolved' : 'fellShort');
  expect(last.outcome, `${last.count} of ${last.needed}`).toBe('dissolved');
  await expect(a.page.getByTestId('petition-stamp')).toContainText('Dissolved');
  await a.ctx.close();
  await b.ctx.close();
});
