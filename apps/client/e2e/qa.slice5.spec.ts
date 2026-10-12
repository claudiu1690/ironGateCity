import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { arrive, mapAtRest, signUp, signUpOnly, unclearPins } from './helpers';
import type { FactionKey } from './helpers';

/**
 * QA slice 5 (docs/qa/slice-5-report.md): the new screens on the smallest phone and sideways (44 px
 * targets, no sideways scroll), the run-in card on 375 × 667, the longest briefing, a double tap on each
 * paying control spending once, the run-in by keyboard, Escape on the briefing spending nothing, no odds
 * maths on the ticket, the briefing and the run-in, the overview's names at Level 6, the capital's
 * overview (slice-4 M1), and the bugs QA found (m1–m9, fixed in the fix round: plain tests now). Every
 * roll is forced through the street hooks; nothing here depends on the day of the week.
 */

const lift = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/character', { data }).then((r) => expect(r.ok()).toBe(true));
const street = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/street', { data }).then((r) => expect(r.ok()).toBe(true));
const held = (page: Page, data: Record<string, unknown>) =>
  page.request.post('/api/test/held', { data }).then((r) => expect(r.ok()).toBe(true));
const dev = (page: Page, action: string, target?: string) =>
  page.request
    .post(`/api/test/dev/${action}`, { data: target === undefined ? {} : { target } })
    .then((r) => expect(r.ok()).toBe(true));
const resultModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByTestId('result-buttons') });
const politicalModal = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('political-continue') });
const mission = (page: Page, id: string) => page.locator(`[data-mission="${id}"]`);
/** QA fixes §2: four lines, five with a two-line title (the count less the title's second line). */
const count = (lines: number, title: number) => lines - Math.max(0, title - 1);

/** The character as the server reads it now (Iron, PC, the record). */
async function me(page: Page): Promise<{ iron: number; pc: number; record: { marks: number } | null }> {
  const r = await page.request.get('/api/trpc/character.me');
  const j = (await r.json()) as { result: { data: { json?: unknown } & Record<string, unknown> } };
  return (j.result.data.json ?? j.result.data) as never;
}
const energy = async (page: Page): Promise<number> =>
  ((await (await page.request.get('/api/test/dev/status')).json()) as { character: { energy: number } }).character
    .energy;

async function signUpAs(page: Page, faction: FactionKey, name: string) {
  await signUpOnly(page, name);
  await arrive(page, { faction });
}

/** A place's sheet by its `?loc=`, eased in. */
async function placeSheet(page: Page, url: string): Promise<Locator> {
  await page.goto(url);
  const sheet = page.locator('[role=dialog][data-layout]');
  await expect(sheet).toBeVisible();
  await waitAnimations(page, '[role=dialog][data-layout]');
  return sheet;
}
async function waitAnimations(page: Page, selector: string) {
  await page.waitForFunction(
    (sel) =>
      [...document.querySelectorAll(sel)].every((d) =>
        d.getAnimations({ subtree: true }).every((a) => a.playState !== 'running'),
      ),
    selector,
  );
}

/** Visible controls under 44 px either way inside a root (the dev panel's own button aside). */
async function smallTargets(page: Page, root: string): Promise<string[]> {
  return page.evaluate((rootSel) => {
    const out: string[] = [];
    for (const r of document.querySelectorAll(rootSel))
      for (const el of r.querySelectorAll('button, a[href], [role=button], [role=radio], input:not([type=hidden])')) {
        if (el.closest('[aria-hidden=true]') || el.getAttribute('data-testid') === 'dev-toggle') continue;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none') continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (el.tagName === 'INPUT' && (b.width <= 1 || b.height <= 1)) continue;
        if (b.width < 43.5 || b.height < 43.5)
          out.push(`${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)} ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
    return out;
  }, root);
}
const sideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** Every line of a text with a digit next to an odds word, or a chance / roll / difficulty word. */
function oddsMaths(text: string): string[] {
  return text
    .split('\n')
    .filter(
      (line) =>
        /\b(chance|chances|roll|rolled|difficulty)\b/i.test(line) ||
        /\d\s?%/.test(line.replace(/[+−-]?\d+\s?% (Party XP|Iron)/g, '').replace(/opinion \+\d+ %/g, '')),
    );
}

const harbour = '/city/coalport';
const farBank = `${harbour}?loc=coalport.far-bank`;
const POSTERS = 'coalport.far-bank.posters';

/** From the Far Bank's sheet to the run-in card (the enforcer; forced rolls). */
async function toRunIn(page: Page, choiceRoll = 1) {
  await placeSheet(page, farBank);
  await street(page, { runIn: 'next', opponentId: 'street-enforcer', choiceRoll, checkRoll: 1 });
  const t = mission(page, POSTERS);
  await t.scrollIntoViewIfNeeded();
  const again = t.getByTestId('mission-again');
  if (await again.count()) await again.click();
  else {
    await t.getByTestId('mission-choose').click();
    await page.getByTestId('briefing').getByTestId('way-row').first().click();
    await page.getByTestId('briefing-confirm').click();
  }
  const runIn = page.getByTestId('run-in');
  await expect(runIn).toBeVisible();
  await waitAnimations(page, '[data-testid=run-in]');
  return runIn;
}

// Review 5 (tech design §7.5, ADR 0080): the poster's and the duplicator's Agility ways are night
// ways, so these flows play at night (the seam's test mode) and the suite's day is restored after.
test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/test/night', { data: { mode: 'night' } })).ok()).toBe(true);
});
test.afterEach(async ({ request }) => {
  await request.post('/api/test/night', { data: { mode: 'day' } });
});

test.describe('the new screens on a small phone and sideways: 44 px targets, no sideways scroll', () => {
  for (const size of [
    { width: 360, height: 640 },
    { width: 812, height: 375 },
  ]) {
    test(`${size.width} × ${size.height}: the quarter, a sheet with missions, the briefing, the run-in, the result, the cells, the ward`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.setViewportSize(size);
      await signUp(page, 'Small Targets');
      await lift(page, { level: 6, rank: 3, iron: 2000, pc: 60 });
      const found: Record<string, string[]> = {};
      const check = async (name: string, root: string) => {
        found[name] = await smallTargets(page, root);
        expect(await sideScroll(page), `${name}: sideways scroll`).toBeLessThanOrEqual(0);
      };

      await page.goto(harbour);
      await mapAtRest(page);
      await check('quarter', 'body');
      await placeSheet(page, farBank);
      await check('sheet', '[role=dialog][data-layout]');
      const t = mission(page, POSTERS);
      await t.scrollIntoViewIfNeeded();
      await t.getByTestId('mission-choose').click();
      await expect(page.getByTestId('briefing')).toBeVisible();
      await waitAnimations(page, '[data-testid=briefing]');
      await check('briefing', '[data-testid=briefing]');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('briefing')).toHaveCount(0);

      const runIn = await toRunIn(page);
      await check('run-in', '[data-testid=run-in]');
      await runIn.getByTestId('run-in-pay').click();
      await expect(resultModal(page)).toBeVisible();
      await check('result', '[role=dialog]');
      await resultModal(page).getByRole('button', { name: 'Continue' }).click();

      await held(page, { send: 'cells' });
      await page.goto('/held');
      await expect(page.getByTestId('held')).toHaveAttribute('data-kind', 'cells');
      await check('cells', '[data-testid=held]');
      await held(page, { releaseNow: true });
      await page.reload();
      await politicalModal(page).getByTestId('political-continue').click();
      await held(page, { send: 'infirmary' });
      await page.goto('/held');
      await expect(page.getByTestId('held')).toHaveAttribute('data-kind', 'infirmary');
      await check('ward', '[data-testid=held]');

      expect(found).toEqual({ quarter: [], sheet: [], briefing: [], 'run-in': [], result: [], cells: [], ward: [] });
    });
  }

  // Was a bug (QA slice 5, fixed in the fix round): the Me tab's *Heat* label is a 31 px wide tap target (packages/ui Street.tsx RiskRows).
  test('the Me tab: Health, Heat and record rows and the strike-off are 44 px targets (360 × 640)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await signUp(page, 'Me Targets');
    await lift(page, { level: 6, pc: 60, heat: 32, health: 90 });
    await dev(page, 'record', '2');
    await page.goto('/me');
    await expect(page.getByTestId('me-strike')).toBeVisible();
    expect(await smallTargets(page, '[data-testid=me-risk]')).toEqual([]);
  });
});

test.describe('layout on a 375 × 667 phone (screens §10)', () => {
  test('the run-in card: the portrait band, your line, four rows and *Leave it to luck* on screen, no scroll', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 667 });
    await signUp(page, 'Card Fit');
    await lift(page, { level: 6, rank: 3, iron: 900 });
    const runIn = await toRunIn(page);
    for (const id of ['run-in-kicker', 'run-in-label', 'run-in-you', 'run-in-fight', 'run-in-run', 'run-in-talk', 'run-in-pay', 'run-in-luck'])
      await expect(runIn.getByTestId(id), id).toBeInViewport({ ratio: 1 });
    expect(await runIn.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  });

  // Was a bug (QA slice 5, fixed in the fix round): the longest briefings (Ashford's wharf, 342 characters; Irongate's Station
  // Buffet, 362) put the second way under the sticky button on 375 × 667 (11 and 18 px).
  test('the longest briefing keeps its title, text and first two ways above the sticky button', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 667 });
    await signUpAs(page, 'alliance', 'Long Brief');
    await lift(page, { level: 6, iron: 900 });
    await placeSheet(page, '/city/ashford?loc=ashford.wharf');
    const t = mission(page, 'ashford.wharf.watch');
    await t.scrollIntoViewIfNeeded();
    await t.getByTestId('mission-choose').click();
    const briefing = page.getByTestId('briefing');
    await expect(briefing).toBeVisible();
    await waitAnimations(page, '[data-testid=briefing]');
    const top = (await briefing.getByTestId('briefing-confirm').boundingBox())!.y;
    const second = (await briefing.getByTestId('way-row').nth(1).boundingBox())!;
    expect(second.y + second.height).toBeLessThanOrEqual(top + 1);
  });

  // QA slice 5 m3 (fixed in the fix round): a mission ticket ran to five to seven lines at 360 px. QA
  // fixes §2: the title, the type and odds, a chips line only when there are chips, the risk line:
  // four lines, five with a two-line title.
  test('a mission ticket is at most four lines (title, tags, chips, risk line) on 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await signUp(page, 'Four Lines');
    await lift(page, { level: 6, rank: 3 });
    await placeSheet(page, `${harbour}?loc=coalport.customs-house`);
    const t = mission(page, 'coalport.customs-house.watch');
    await t.scrollIntoViewIfNeeded();
    const { lines, title } = await t.evaluate((el) => {
      const count = (id: string) => {
        const e = el.querySelector(`[data-testid=${id}]`);
        return e ? Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)) : 0;
      };
      return {
        title: count('mission-name'),
        lines: ['mission-name', 'mission-tags', 'mission-chips', 'risk-line'].reduce((n, id) => n + count(id), 0),
      };
    });
    expect(count(lines, title)).toBeLessThanOrEqual(4);
    // The type and the odds, one line (its 14 px line and 6 px of padding).
    expect(await t.getByTestId('mission-tags').evaluate((e) => e.getBoundingClientRect().height)).toBeLessThanOrEqual(21);
  });

  // Was a bug (QA slice 5 m7, fixed in the fix round): on a phone under 700 px tall the rival plate hides
  // *Your work here draws from the Vanguard's morale…* (city.tsx), which screens §8.3 puts on the plate.
  test('rival ground on 375 × 667: the plate shows what the work draws from; the rule chip keeps its row', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signUp(page, 'Short Plate');
    await lift(page, { level: 10, rank: 3 });
    await dev(page, 'goto', 'duskwall');
    await page.goto('/city/duskwall');
    await mapAtRest(page);
    await expect(page.getByTestId('plate-rival').filter({ visible: true })).toBeVisible();
    // Review 5 (answers §10.2): the push bar is that line now; the goal folds into its note.
    await expect(page.getByTestId('plate-pressure').filter({ visible: true })).toContainText(/ of 2( points| ·)/);
    await expect(page.getByTestId('plate-goal').filter({ visible: true })).toHaveCount(0);
    // The voting rework (design §8.10 Q3): the *Home city · …* row's text folds here, and the rule chip
    // stays at its right. The folded row keeps one caps line's height (the 44 px chip's negative margins),
    // so it neither collapses nor grows, and the rows under the name do not move.
    const chip = page.getByTestId('plate-rule-chip').filter({ visible: true });
    await expect(chip).toBeVisible();
    await expect(page.getByTestId('city-plate')).toBeHidden();
    const row = await chip.evaluate((el) => {
      const r = el.parentElement!;
      const text = r.querySelector('[data-testid=city-plate]')!;
      return { h: r.getBoundingClientRect().height, line: parseFloat(getComputedStyle(text).lineHeight) };
    });
    expect(Math.abs(row.h - row.line), `the folded row ${row.h} px, a caps line ${row.line} px`).toBeLessThanOrEqual(1);
  });
});

test.describe('a double tap spends once (tech design §12.4)', () => {
  test('the confirm, Again, an encounter row, Pay bail and the strike-off', async ({ page }) => {
    test.setTimeout(240_000);
    await signUp(page, 'Dot Twice');
    await lift(page, { level: 6, rank: 3, iron: 2000, pc: 100, energy: 100 });

    // The briefing's confirm: one start, 10 Energy.
    await placeSheet(page, farBank);
    await street(page, { runIn: 'never', checkRoll: 1 });
    const t = mission(page, POSTERS);
    await t.scrollIntoViewIfNeeded();
    await t.getByTestId('mission-choose').click();
    await page.getByTestId('briefing').getByTestId('way-row').first().click();
    let e0 = await energy(page);
    await page.getByTestId('briefing-confirm').dblclick();
    await expect(resultModal(page)).toBeVisible();
    await expect.poll(() => energy(page)).toBe(e0 - 10);
    await resultModal(page).getByRole('button', { name: 'Continue' }).click();

    // *Again*: one start.
    await street(page, { runIn: 'never', checkRoll: 1 });
    await t.scrollIntoViewIfNeeded();
    e0 = await energy(page);
    await t.getByTestId('mission-again').dblclick();
    await expect(resultModal(page)).toBeVisible();
    await expect.poll(() => energy(page)).toBe(e0 - 10);
    await resultModal(page).getByRole('button', { name: 'Continue' }).click();

    // An encounter row (Pay them off · 60 Iron): one payment. The mission's Success pays +40 Iron.
    const runIn = await toRunIn(page);
    const i0 = (await me(page)).iron;
    await runIn.getByTestId('run-in-pay').dblclick();
    const paid = resultModal(page);
    await expect(paid.getByTestId('run-in-did')).toContainText('You paid him off.');
    // Review 5 (answers §17.2 item 5): the receipt's Iron is the net line (the reward and the 60
    // paid off, whose parts wait in *Details*).
    const ironRow = paid.getByTestId('reward-iron');
    const ironNet = (await ironRow.count())
      ? Number((await ironRow.getByTestId('reward-value').innerText()).replace('−', '-'))
      : 0;
    await expect(paid.getByTestId('detail-iron')).toContainText('paid off −60');
    await expect.poll(async () => (await me(page)).iron).toBe(i0 + ironNet);
    await paid.getByRole('button', { name: 'Continue' }).click();

    // *Pay bail*: one bail.
    await held(page, { send: 'cells' });
    await page.goto('/held');
    const bailText = await page.getByTestId('held-bail').innerText();
    const bail = Number(bailText.replace(/\D/g, ''));
    const b0 = (await me(page)).iron;
    await page.getByTestId('held-bail').dblclick();
    await expect(politicalModal(page).getByTestId('stamp')).toHaveText('Released');
    await expect.poll(async () => (await me(page)).iron).toBe(b0 - bail);
    await politicalModal(page).getByTestId('political-continue').click();

    // *Have a mark struck off · 30 Political Capital*: one mark, 30 PC.
    await dev(page, 'record', '2');
    await page.goto('/me');
    const p0 = await me(page);
    await page.getByTestId('me-strike').dblclick();
    await expect(page.getByRole('dialog').getByTestId('stamp')).toHaveText('Struck off');
    await expect.poll(async () => (await me(page)).pc).toBe(p0.pc - 30);
    expect((await me(page)).record?.marks).toBe((p0.record?.marks ?? 0) - 1);
  });
});

test.describe('by keyboard (screens §4.2, §5)', () => {
  test('the run-in: focus starts on a row, Tab reaches every row and *Leave it to luck* and stays in the card; Escape does not close it', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signUp(page, 'Kit Rows');
    await lift(page, { level: 6, rank: 3, iron: 900 });
    const runIn = await toRunIn(page);
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const id = await page.evaluate(() => {
        const a = document.activeElement;
        return a?.closest('[data-testid=run-in]') ? (a.getAttribute('data-testid') ?? a.tagName) : 'OUTSIDE';
      });
      seen.add(id);
      await page.keyboard.press('Tab');
    }
    expect([...seen].sort()).toEqual(['run-in-fight', 'run-in-luck', 'run-in-pay', 'run-in-run', 'run-in-talk']);
    await page.keyboard.press('Escape');
    await expect(runIn).toBeVisible();
    await runIn.getByTestId('run-in-luck').focus();
    await page.keyboard.press('Enter');
    await expect(resultModal(page).getByTestId('run-in-did')).toContainText(/^Luck chose to /);
  });

  test('the briefing: Tab reaches the ways, Space selects, Escape closes it with nothing spent', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signUp(page, 'Kit Brief');
    await lift(page, { level: 6, rank: 3 });
    await placeSheet(page, farBank);
    const choose = mission(page, POSTERS).getByTestId('mission-choose');
    let reached = false;
    for (let i = 0; i < 80 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await choose.evaluate((e) => e === document.activeElement);
    }
    expect(reached).toBe(true);
    await page.keyboard.press('Enter');
    const briefing = page.getByTestId('briefing');
    await expect(briefing).toBeVisible();
    const ways: string[] = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const w = await page.evaluate(() => document.activeElement?.getAttribute('data-way') ?? null);
      if (w) ways.push(w);
    }
    expect(new Set(ways).size).toBe(await briefing.getByTestId('way-row').count());
    await briefing.getByTestId('way-row').first().focus();
    await page.keyboard.press('Space');
    await expect(briefing.getByTestId('briefing-confirm')).toHaveText(/ · 10 Energy$/i);
    const e0 = await energy(page);
    await page.keyboard.press('Escape');
    await expect(briefing).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(await energy(page)).toBe(e0);
    await expect(page.locator('[role=dialog][data-layout]')).toBeVisible();
  });

  // Was a bug (QA slice 5, fixed in the fix round): after Escape the focus is on <body>, not back on the ticket's *Choose a way*.
  test('the briefing: Escape gives focus back to the ticket', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signUp(page, 'Kit Focus');
    await lift(page, { level: 6, rank: 3 });
    await placeSheet(page, farBank);
    const choose = mission(page, POSTERS).getByTestId('mission-choose');
    await choose.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('briefing')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('briefing')).toHaveCount(0);
    await expect(choose).toBeFocused();
  });
});

test.describe('in plain words (GDD §1.5, screens §1)', () => {
  test('no odds maths on the ticket, the briefing or the run-in', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 667 });
    await signUp(page, 'Plain Odds');
    await lift(page, { level: 6, rank: 3, iron: 900 });
    const sheet = await placeSheet(page, farBank);
    const ticket = await mission(page, POSTERS).innerText();
    expect(oddsMaths(ticket), ticket).toEqual([]);
    expect(await mission(page, POSTERS).getByTestId('mission-tags').innerText()).toMatch(/Good odds|Fair odds|Long shot|Sure thing|Slim/i);
    await mission(page, POSTERS).getByTestId('mission-choose').click();
    const briefing = await page.getByTestId('briefing').innerText();
    expect(briefing).not.toMatch(/\d/);
    expect(oddsMaths(briefing)).toEqual([]);
    await page.keyboard.press('Escape');
    expect(await sheet.isVisible()).toBe(true);
    const runIn = await toRunIn(page);
    const text = await runIn.innerText();
    expect(oddsMaths(text), text).toEqual([]);
    for (const id of ['run-in-fight', 'run-in-run', 'run-in-talk'])
      expect(await runIn.getByTestId(id).getByTestId('run-in-line').innerText()).not.toMatch(/\d/);
  });

  // Was a bug (QA slice 5, fixed in the fix round): the place sheet's kicker prints the content kind: *9 · Hospital* and *10 · Jail*
  // (copy.ts KIND_LABELS), words screens §1 bans.
  test('the Infirmary and Harbour Police sheets say neither *hospital* nor *jail*', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signUp(page, 'Plain Kind');
    await lift(page, { level: 6 });
    for (const loc of ['coalport.infirmary', 'coalport.harbour-police']) {
      const sheet = await placeSheet(page, `${harbour}?loc=${loc}`);
      expect(await sheet.innerText()).not.toMatch(/\b(hospital|jail)\b/i);
    }
  });

  // Was a bug (QA slice 5, fixed in the fix round): released at Heat 0 (a police loss on a legal mission), the modal says *Heat is
  // down to 25* while the knock-on reads *Heat 0 → 25*.
  test('a release from the cells never says Heat went down when it went up', async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page, 'Heat Up');
    await lift(page, { level: 6, iron: 900, heat: 0 });
    await held(page, { send: 'cells' });
    await page.goto('/held');
    await page.getByTestId('held-bail').click();
    const m = politicalModal(page);
    await expect(m.getByTestId('political-heat')).toContainText('0 → 25');
    expect(await m.innerText()).not.toMatch(/down to 25/);
  });

  // Was a bug (QA slice 5, fixed in the fix round): the run-in result's reason line has no training place (*Your Agility is low for
  // this.* without *Raise it at Harbour Quays.*): RunInGate's ResultModal gets no `trainingPlaces`.
  test('a failed run says where Agility trains', async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page, 'Run Fail');
    await lift(page, { level: 6, rank: 3, iron: 900 });
    const runIn = await toRunIn(page, 100);
    await runIn.getByTestId('run-in-run').click();
    await expect(resultModal(page).getByTestId('run-in-reason')).toContainText('Raise it at');
  });

  // Was a bug (QA slice 5, fixed in the fix round): a first offence worth three marks (a sabotage) prints the *ON FILE · One mark…*
  // card under *3 marks · Repeat offender*.
  test('the first record card matches the marks given', async ({ page }) => {
    test.setTimeout(150_000);
    await signUp(page, 'Three Marks');
    await lift(page, { level: 10, rank: 3, iron: 2000, heat: 60 });
    await dev(page, 'goto', 'duskwall');
    await placeSheet(page, '/city/duskwall?loc=duskwall.beacon-house');
    await street(page, { runIn: 'never', checkRoll: 99, caught: 'always' });
    const spike = mission(page, 'duskwall.beacon-house.spike');
    await spike.scrollIntoViewIfNeeded();
    await spike.getByTestId('mission-choose').click();
    await page.getByTestId('briefing').getByTestId('way-row').first().click();
    await page.getByTestId('briefing-confirm').click();
    const r = resultModal(page);
    await expect(r.getByTestId('effect-record')).toContainText('3 marks');
    expect(await r.innerText()).not.toMatch(/ON FILE · One mark/i);
  });
});

test.describe('the overviews at rest', () => {
  async function names(page: Page) {
    const labels = page.locator('[data-testid=hotspot][data-pin=name]');
    const overlaps = await labels.evaluateAll((els) => {
      const o: string[] = [];
      for (let i = 0; i < els.length; i++)
        for (let j = i + 1; j < els.length; j++) {
          const a = els[i]!.getBoundingClientRect();
          const b = els[j]!.getBoundingClientRect();
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
            o.push(`${els[i]!.textContent} × ${els[j]!.textContent}`);
        }
      return o;
    });
    return { count: await labels.count(), overlaps, unclear: await unclearPins(page) };
  }

  for (const [faction, city] of [
    ['collective', 'coalport'],
    ['alliance', 'ashford'],
  ] as const) {
    // Review 4 (ADR 0076): a home city has no overview; its one map at Level 6 has every pin (open and
    // greyed) apart, the overview route lands on it, and no quarter name is drawn.
    test(`Level 6 ${city}: one map, every pin apart, at 360 × 640 and 667 × 375`, async ({ page }) => {
      test.setTimeout(120_000);
      await signUpAs(page, faction, 'Over View');
      await lift(page, { level: 6 });
      for (const size of [
        { width: 360, height: 640 },
        { width: 667, height: 375 },
      ]) {
        await page.setViewportSize(size);
        await page.goto(`/city/${city}/overview`);
        await expect(page).toHaveURL(new RegExp(`/city/${city}$`));
        await mapAtRest(page);
        const n = await names(page);
        expect(n.count, `${size.width}`).toBe(0);
        const pins = page.locator('[data-testid=hotspot],[data-testid=locked-pin]');
        const overlaps = await pins.evaluateAll((els) => {
          const c = els.map((e) => {
            const r = e.getBoundingClientRect();
            return { l: e.getAttribute('aria-label'), x: r.left + 22, y: r.top + r.height / 2 };
          });
          const o: string[] = [];
          for (let i = 0; i < c.length; i++)
            for (let j = i + 1; j < c.length; j++)
              if (Math.hypot(c[i]!.x - c[j]!.x, c[i]!.y - c[j]!.y) < 44) o.push(`${c[i]!.l} × ${c[j]!.l}`);
          return o;
        });
        expect(overlaps, `${size.width}`).toEqual([]);
        expect(await sideScroll(page)).toBeLessThanOrEqual(0);
      }
    });
  }

  test('regression (slice-4 M1): the capital overview at 1440 × 900 shows five clear district names', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signUp(page, 'Capital Rest');
    await lift(page, { level: 10, fxp: 500, cityId: 'irongate' });
    await page.goto('/city/irongate');
    await mapAtRest(page);
    await expect(page.getByTestId('hotspot')).toHaveCount(5);
    expect(await unclearPins(page)).toEqual([]);
  });
});
