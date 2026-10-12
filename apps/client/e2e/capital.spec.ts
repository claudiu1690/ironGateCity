/* eslint-disable @typescript-eslint/no-explicit-any -- the tests read untyped tRPC JSON (views of many shapes) */
import { devices, expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mapAtRest, signUp } from './helpers';

/**
 * Slice 4's capital (tech design §15.1 `capital.spec.ts`), reworked for the rule vote (the voting
 * rework, tech design §9.8 and §15.2), on a phone and on the shared test clock (its own project, last):
 * a Rank 2 player in Irongate registers in Eastside (the sheet's lines, the modal, the Election card
 * *Registered*); when the district's vote opens the card asks *Which rule for Irongate next week?*;
 * the ballot is one card per party with its crest, in Eastside's order, and the vote carries no morale
 * line; the count, lazily: the plate line (the rule and its seats), the cards with seat bars, five
 * districts with theirs first, three party rows with *Votes and opinion together*, no score line, the
 * help's *More* line, no sideways scroll at 360 px; then Monday's paper with the Issues. A second test
 * seats two councillors of one party: the one who does not lead reads *your party's card is set* with
 * the name of the one who set it (design §8.6 Q4), on the Election card, in the hall and on *What now*.
 */

const advanceTo = async (page: Page, cycleDay: number) => {
  const res = await page.request.post('/api/test/clock', { data: { advanceTo: { cityId: 'irongate', cycleDay } } });
  expect(res.ok()).toBe(true);
};
const modalOf = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('stamp') });
const noSideScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
};
/** A tRPC query as the page's player. */
const read = async (page: Page, proc: string, input?: object): Promise<any> => {
  const r = await page.request.get(
    `/api/trpc/${proc}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`,
  );
  expect(r.ok(), `${proc}: ${await r.text()}`).toBe(true);
  return ((await r.json()) as any).result.data;
};
const hook = async (page: Page, path: string, data: object = {}) => {
  const r = await page.request.post(`/api/test/${path}`, { data });
  expect(r.ok(), `${path}: ${await r.text()}`).toBe(true);
  return (await r.json()) as any;
};

test('the capital: register in Eastside → vote on a rule, a card per party → the count → Monday’s Issues', async ({
  page,
}) => {
  test.setTimeout(240_000);
  // 1. The capital's count day; a Rank 2 Collective member standing in Irongate.
  await advanceTo(page, 0);
  await signUp(page, 'Mara Lenk');
  const lift = await page.request.post('/api/test/character', {
    data: { level: 10, fxp: 500, iron: 900, cityId: 'irongate' },
  });
  expect(lift.ok()).toBe(true);

  // 2. Eastside: where you live (a phone: the plate's corner), the card, the sheet, *Live here*.
  await page.goto('/city/irongate/irongate.eastside');
  await expect(page.getByTestId('district-name').filter({ visible: true })).toHaveText('Eastside');
  await expect(page.getByTestId('district-kicker').filter({ visible: true })).toHaveText(/visiting/i);
  await page.getByTestId('residence-row').filter({ visible: true }).click();
  const card = page.getByRole('dialog', { name: 'Where you live' });
  await expect(card.getByTestId('residence-line1')).toHaveText('You live in Coalport.');
  await expect(card.getByTestId('residence-line2')).toHaveText(
    'Live in Eastside instead: vote and stand here, and your orders come from here. A week between moves.',
  );
  await expect(card.getByTestId('residence-register')).toHaveText('Live here · 500 Iron');
  await card.getByTestId('residence-register').click();
  const sheet = page.getByRole('dialog', { name: 'Live in Eastside · 500 Iron' });
  await expect(sheet).toBeVisible();
  const lines = await sheet.getByTestId('register-lines').getByRole('listitem').allTextContents();
  expect(lines.length).toBeGreaterThanOrEqual(4);
  expect(lines.join(' ')).toContain('You vote and stand in Eastside from the next election that opens');
  expect(lines.join(' ')).toContain('Your job, reputation, Iron and rank are untouched.');
  await sheet.getByTestId('register-confirm').click();
  const registered = modalOf(page);
  await expect(registered.getByTestId('stamp')).toHaveText('Moved in');
  await expect(registered).toContainText('Eastside has a new voter');
  await expect(registered.getByTestId('political-iron')).toContainText('−500 Iron');
  await registered.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('district-kicker').filter({ visible: true })).toHaveText(/you live here/i);
  await expect(page.getByTestId('election-line1').filter({ visible: true }).first()).toHaveText('You live in Eastside');

  // 3. The district's vote opens: the card asks about Irongate; a card per party, in Eastside's order.
  await advanceTo(page, 2);
  await page.goto('/city/irongate/irongate.eastside');
  await expect(page.getByTestId('election-line1').filter({ visible: true }).first()).toHaveText(
    'Which rule for Irongate next week?',
  );
  await page.goto('/council/ballot');
  await expect(page.getByTestId('ballot-line')).toHaveText(
    'Each party puts up a rule. Votes and opinion in Eastside together decide: the party ahead takes the most seats, and its rule runs in every district.',
  );
  const cards = page.getByTestId('rule-card');
  await expect(cards.first()).toBeVisible();
  const n = await cards.count();
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThanOrEqual(3);
  // One card per party: three crests across the cards (a shared card carries two) on the whose lines.
  expect(await page.getByTestId('rule-card-whose').locator('svg').count()).toBe(3);
  for (let i = 0; i < n; i++) {
    await expect(page.getByTestId('rule-card-whose').nth(i)).toHaveText(/^the \w+'s (rule · .+|and the \w+'s rule)$/);
  }
  // Eastside's order: by the card's parties' opinion shares in the district, the leader's first.
  const ballot = await read(page, 'council.ballot');
  expect(ballot.capital).toBe(true);
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-ordinance')))).toEqual(
    ballot.cards.map((c: any) => c.ordinanceId),
  );
  const city = await read(page, 'city.get', { cityId: 'irongate' });
  const east = (city.districts as any[]).find((d) => d.id === 'irongate.eastside');
  const best = (ballot.cards as any[]).map((c) =>
    Math.max(...(c.whose.factionIds as string[]).map((f) => east.opinion[f] as number)),
  );
  for (let i = 1; i < best.length; i++) expect(best[i - 1]).toBeGreaterThanOrEqual(best[i]!);
  // One tap on a card, *Vote for …*; a capital vote moves no morale.
  await cards.first().click();
  const cta = page.getByTestId('council-cta').getByRole('button').first();
  await expect(cta).toHaveText(`Vote for ${ballot.cards[0].name}`);
  await cta.click();
  const voted = modalOf(page);
  await expect(voted.getByTestId('stamp')).toHaveText('Vote cast');
  await expect(voted.getByTestId('political-morale')).toHaveCount(0);
  await voted.getByRole('button', { name: 'Continue' }).click();

  // 4. The count, lazily: the rule and its seats, five districts (Eastside first), three party rows, no
  //    score line, the formula behind *More*, no sideways scroll at 360 px.
  await advanceTo(page, 0);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/council/count');
  await expect(page.getByTestId('capital-count-header')).toHaveText(
    /^.+ won · \d+ seats? of 10 behind it · local candidates \d+ of 10 · final$/,
  );
  const won = page.locator('[data-testid=rule-card][data-won=true]');
  await expect(won).toHaveCount(1);
  await expect(won).toContainText('Passed');
  await expect(won).toContainText(/seats? of 10/);
  await expect(won.getByTestId('rule-card-seats')).toBeVisible();
  expect(await won.getByTestId('rule-card-seat').count()).toBeGreaterThanOrEqual(1);
  const chips = page.getByTestId('district-chip');
  await expect(chips).toHaveCount(5);
  await expect(chips.first()).toHaveText('Eastside');
  await expect(chips.first()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('party-row')).toHaveCount(3);
  await expect(page.getByTestId('party-votes').first()).toHaveText(/^votes \d+( · shared)?$/);
  expect(await page.getByTestId('council-row').count()).toBeGreaterThanOrEqual(6);
  await expect(page.getByTestId('votes-and-opinion')).toHaveText('Votes and opinion together · final');
  await expect(page.getByTestId('votes-cast')).toHaveCount(0);
  await expect(page.getByText(/of the score/)).toHaveCount(0);
  await noSideScroll(page);
  await page.getByTestId('how-the-vote-works').click();
  const note = page.getByTestId('help-note');
  await expect(note).toContainText('Each party puts up its rule.');
  await expect(note.getByTestId('help-more-line')).toHaveCount(0);
  await note.getByTestId('help-more').click();
  await expect(note.getByTestId('help-more-line')).toContainText(
    'Until ten people have voted in a district, opinion carries most of the weight',
  );
  await page.keyboard.press('Escape');
  await expect(note).toBeHidden();
  // The switcher keeps the district in the address.
  await chips.nth(2).click();
  await expect(page).toHaveURL(/\/council\/count\?d=irongate\./);
  await expect(chips.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('party-row')).toHaveCount(3);
  await noSideScroll(page);

  // 5. Monday: the paper's Issues, new this week.
  const monday = await page.request.post('/api/test/clock', { data: { advanceTo: { weekday: 'monday' } } });
  expect(monday.ok()).toBe(true);
  await page.goto('/paper');
  const issues = page.getByTestId('issues-section');
  await expect(issues).toBeVisible();
  await expect(issues.getByTestId('issues-new')).toHaveText('New this week');
  expect(await issues.getByTestId('issue-row').count()).toBeGreaterThanOrEqual(2);
  await noSideScroll(page);
});

// The voting rework, phase 4 (design §8.6 Q4): in the capital a party has one card, chosen by its
// top-seated player councillor. Two players take two local seats of one party; the one who does not
// lead reads *your party's card is set* and the name of the one who chose it.
test("the capital's councillors: one card per party; the councillor below reads who set it", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  await advanceTo(page, 0);
  await hook(page, 'city-day');
  await signUp(page, 'Ilse Brandt');
  const baseURL = test.info().project.use.baseURL as string;
  const other = await browser.newContext({ ...devices['Pixel 7'], baseURL });
  const page2 = await other.newPage();
  await signUp(page2, 'Jana Varga');
  await hook(page, 'character', { level: 10, fxp: 500, cityId: 'irongate' });

  // The capital's sitting council: two local seats of one party (seat numbers are per district).
  const hall = await read(page, 'council.hall', { cityId: 'irongate' });
  const byFaction = new Map<string, any[]>();
  for (const s of hall.seats as any[]) {
    if (s.kind === 'npc' && s.factionId && s.districtName) byFaction.set(s.factionId, [...(byFaction.get(s.factionId) ?? []), s]);
  }
  const pair = [...byFaction.values()].find((x) => x.length >= 2);
  expect(pair, 'two local seats of one party').toBeTruthy();
  const cityView = await read(page, 'city.get', { cityId: 'irongate' });
  const districtOf = (name: string) => {
    const d = (cityView.districts as any[]).find((x) => x.name === name);
    expect(d, `the district ${name}`).toBeTruthy();
    return d.id as string;
  };
  const seatIn = async (p: Page, s: any) => {
    await hook(p, 'character', {
      level: 10,
      fxp: 500,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: districtOf(s.districtName) },
    });
    await hook(p, 'seat', { seat: s.seat });
  };
  await seatIn(page, pair![0]);
  await seatIn(page2, pair![1]);

  // Exactly one of the two leads the bloc; the other's card is the leader's.
  const one = await read(page, 'council.ballot', { cityId: 'irongate' });
  const two = await read(page2, 'council.ballot', { cityId: 'irongate' });
  expect([one.myRule.onBallot, two.myRule.onBallot].sort()).toEqual([false, true]);
  const [leader, follower, p] = one.myRule.onBallot ? ['Ilse Brandt', two, page2] : ['Jana Varga', one, page];
  expect(follower.myRule.capital).toMatchObject({ by: leader, leadsBloc: false });
  const rule = follower.myRule.capital.rule as string;
  const me = await read(p, 'character.me');
  const party = me.factionNames[follower.myRule.capital.factionId] as string;

  // The hall: *What now* and the *Next week's rule* block.
  await p.goto('/council');
  await expect(p.getByTestId('what-now')).toContainText(
    `Your party's card is set — Councillor ${leader} chose the ${party}'s card: ${rule}. The bloc's top seat chooses first.`,
  );
  await expect(p.getByTestId('hall-next-in-line')).toContainText(
    `Your party's card is set: Councillor ${leader} chose the ${party}'s card, ${rule}.`,
  );
  // The Election card on the district's page.
  await p.goto(`/city/irongate/${me.residence.districtId as string}`);
  await expect(p.getByTestId('election-line1').filter({ visible: true }).first()).toHaveText(
    "You're on the council · your party's card is set",
  );
  const line2 = p.getByTestId('election-line2').filter({ visible: true });
  if ((await line2.count()) > 0) {
    await expect(line2.first()).toHaveText(`Councillor ${leader} chose it: ${rule} · pay every morning`);
  }
  await other.close();
});

// Review 4 (answers §8.3, ADR 0076): inside a district the drag reaches its outline's bounding box;
// Station & Market runs to the picture's bottom-left corner, so (0.02, 0.98) can be brought on screen.
test("a district's drag reaches its whole outline: Station & Market's far corner", async ({ page }) => {
  test.setTimeout(120_000);
  await signUp(page, 'Corner Walker');
  expect((await page.request.post('/api/test/character', { data: { level: 10, cityId: 'irongate' } })).ok()).toBe(true);
  await page.goto('/city/irongate/irongate.station-market');
  await mapAtRest(page);
  const map = page.getByTestId('city-map');
  const box = (await map.boundingBox())!;
  // Drag right and up from the map's middle, several times (each stops at the limit).
  for (let i = 0; i < 6; i++) {
    const sx = box.x + box.width / 2;
    const sy = box.y + box.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 80, sy - 80, { steps: 4 });
    await page.mouse.move(sx + 160, sy - 160, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(60);
  }
  const layer = (await page.getByTestId('map-layer').boundingBox())!;
  const corner = { x: layer.x + 0.02 * layer.width, y: layer.y + 0.98 * layer.height };
  const bottomBand = await page
    .locator('[data-map-overlay=bottom]')
    .evaluate((e) => e.getBoundingClientRect().top)
    .catch(() => box.y + box.height);
  expect(corner.x).toBeGreaterThanOrEqual(box.x);
  expect(corner.x).toBeLessThanOrEqual(box.x + box.width);
  expect(corner.y).toBeGreaterThanOrEqual(box.y);
  expect(corner.y).toBeLessThanOrEqual(Math.min(box.y + box.height, bottomBand) + 1);
  // The picture's edge never shows: its left edge at most at the map's.
  expect(layer.x).toBeLessThanOrEqual(box.x + 1);
});
