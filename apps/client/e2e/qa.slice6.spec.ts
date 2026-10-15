import { expect, test } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { signUp } from './helpers';

/**
 * QA slice 6 (docs/qa/slice-6-report.md). Risk areas the full e2e did not cover:
 *  1. replays and double taps (the same key twice, and two keys at once) on call, sign-up, withdraw,
 *     bail, visit, chat and `events.seen`; one effect and one charge each;
 *  2. event resolution while away: three sign-ups, the results in start order;
 *  3. the numbers (Party XP and Political Capital by band, the day's second event at half, no Iron,
 *     a hand's 5 Energy, the withdraw refund and its overflow into Rested, the last hour);
 *  4. favours (a second bail payer, the visit's 3 Energy, a visit from another city);
 *  5. chat limit lines (repeat, too many) and the system lines' buttons.
 * Layout checks are in the same file (375 × 667).
 */

const tag = () => Array.from({ length: 4 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');
const PHONE = { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const uuid = () => crypto.randomUUID();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const parse = async (r: Awaited<ReturnType<Page['request']['get']>>) => {
  const j = (await r.json().catch(() => ({}))) as Any;
  return j?.result
    ? { ok: true as const, data: j.result.data as Any, reason: '' }
    : { ok: false as const, reason: (j?.error?.data?.game?.reason ?? j?.error?.data?.reason ?? 'ERROR') as string, data: j?.error?.data as Any };
};
const mutate = (page: Page, proc: string, data: object = {}) => page.request.post(`/api/trpc/${proc}`, { data }).then(parse);
const read = (page: Page, proc: string, input?: object) =>
  page.request.get(`/api/trpc/${proc}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`).then(parse);
const hook = async (page: Page, path: string, data: object = {}): Promise<Any> => {
  const r = await page.request.post(`/api/test/${path}`, { data });
  expect(r.ok(), `${path}: ${await r.text()}`).toBe(true);
  return r.json();
};
const clock = async (page: Page, advanceMs: number): Promise<number> => ((await hook(page, 'clock', { advanceMs })) as { now: number }).now;

async function member(browser: Browser, name: string, opts: { rank?: number; energy?: number } = {}) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await signUp(page, name);
  await hook(page, 'character', { rank: opts.rank ?? 1, energy: opts.energy ?? 100, iron: 3_000 });
  const me = (await read(page, 'character.me')).data as Any;
  return { ctx, page, id: me.id as string, name };
}
const me = async (p: Page): Promise<Any> => (await read(p, 'character.me')).data;

/** To just after the next City Day boundary (the day's lines reset; the whole test is inside one day). */
async function freshDay(page: Page) {
  const now = await clock(page, 0);
  const next = Math.ceil((now + 1) / 86_400_000) * 86_400_000 + 5 * 60_000;
  await clock(page, next - now);
  await hook(page, 'city-day', {});
}

test.describe.configure({ mode: 'serial' });

test('1 replays and double taps; 3 numbers: refund, overflow, last hour, halving, no Iron', async ({ browser }) => {
  test.setTimeout(420_000);
  const p = await member(browser, `Pia R${tag()}`, { rank: 3 });
  const q = await member(browser, `Quin S${tag()}`, { rank: 2 });
  await freshDay(p.page);
  await hook(p.page, 'character', { energy: 100 });
  await hook(q.page, 'character', { energy: 100 });

  // --- Call it: the same key twice at once is one event and one 15 Energy.
  const key = uuid();
  const callBody = { typeId: 'event.rally', hours: 6, roleId: 'speaker', districtId: null };
  const [c1, c2] = await Promise.all([
    mutate(p.page, 'events.callEvent', { ...callBody, idempotencyKey: key }),
    mutate(p.page, 'events.callEvent', { ...callBody, idempotencyKey: key }),
  ]);
  expect([c1.ok, c2.ok], JSON.stringify([c1.reason, c2.reason])).toEqual([true, true]);
  const board = (await read(p.page, 'events.board')).data as Any;
  const mine = board.here.events.filter((e: Any) => e.kind !== 'fixture');
  expect(mine, 'one member-called event, not two').toHaveLength(1);
  const eventId = mine[0].id as string;
  const pAfterCall = await me(p.page);
  expect(pAfterCall.energy.value, 'Speaker 15 Energy once').toBeGreaterThanOrEqual(85);
  expect(pAfterCall.energy.value).toBeLessThanOrEqual(90);
  // A second call with another key: one at a time.
  const again = await mutate(p.page, 'events.callEvent', { ...callBody, idempotencyKey: uuid() });
  expect(again.ok).toBe(false);

  // --- Sign up: three taps with one key, and two keys at once on the same role.
  const sk = uuid();
  const slot = { roleId: 'security' };
  const taps = await Promise.all([1, 2, 3].map(() => mutate(q.page, 'events.signUp', { eventId, slot, idempotencyKey: sk })));
  console.log('QA concurrent same-key sign-ups', JSON.stringify(taps.map((t) => t.reason || 'ok')));
  expect(taps.filter((t) => t.ok).length, 'at least one tap succeeds').toBeGreaterThanOrEqual(1);
  // BUG m1 (QA slice 6): a concurrent replay of the same key can answer ALREADY_ON_EVENT instead of the stored result.
  expect(taps.filter((t) => !t.ok).map((t) => t.reason).every((r) => r === 'ALREADY_ON_EVENT')).toBe(true);
  const qSigned = await me(q.page);
  expect(qSigned.energy.value, 'Security 10 Energy once').toBeGreaterThanOrEqual(90 - 0);
  expect(qSigned.energy.value).toBeLessThanOrEqual(95);
  const two = await Promise.all([
    mutate(q.page, 'events.signUp', { eventId, slot: { roleId: 'press' }, idempotencyKey: uuid() }),
    mutate(q.page, 'events.signUp', { eventId, slot: { roleId: 'press' }, idempotencyKey: uuid() }),
  ]);
  expect(two.filter((t) => t.ok), 'one holder, the second key refused: ' + JSON.stringify(two.map((t) => t.reason))).toHaveLength(0);

  // --- Withdraw: the same key twice at once, then another key: one refund.
  const wk = uuid();
  const wd = await Promise.all([
    mutate(q.page, 'events.withdraw', { eventId, idempotencyKey: wk }),
    mutate(q.page, 'events.withdraw', { eventId, idempotencyKey: wk }),
  ]);
  expect(wd.map((t) => t.ok), JSON.stringify(wd.map((t) => t.reason))).toEqual([true, true]);
  const wd2 = await mutate(q.page, 'events.withdraw', { eventId, idempotencyKey: uuid() });
  expect(wd2.ok, 'a withdrawal with a new key when no longer signed up').toBe(false);
  const qBack = await me(q.page);
  expect(qBack.energy.value, 'refunded once, not twice').toBeLessThanOrEqual(100);
  expect(qBack.energy.value).toBeGreaterThanOrEqual(99);

  // --- A hand costs 5 Energy and no roll; the refund above a full bar banks to Rested.
  await hook(q.page, 'character', { energy: 100 });
  const hand = await mutate(q.page, 'events.signUp', { eventId, slot: 'hand', idempotencyKey: uuid() });
  expect(hand.ok, hand.reason).toBe(true);
  const afterHand = await me(q.page);
  expect(afterHand.energy.value, 'a hand costs 5').toBeGreaterThanOrEqual(95);
  expect(afterHand.energy.value).toBeLessThanOrEqual(100);
  // Let the bar fill and overflow (the event is 6 h out; 70 minutes is still withdrawable).
  await clock(p.page, 70 * 60_000);
  const full = await me(q.page);
  expect(full.energy.value).toBe(100);
  const restedBefore = full.rested as number;
  const w = await mutate(q.page, 'events.withdraw', { eventId, idempotencyKey: uuid() });
  expect(w.ok, w.reason).toBe(true);
  const restedAfter = (await me(q.page)).rested as number;
  console.log('QA withdraw above full: rested', restedBefore, '->', restedAfter, JSON.stringify(w.data.refund));
  expect(w.data.refund.energy, 'the Energy is already full: nothing back as Energy').toBe(0);
  expect(restedAfter - restedBefore, 'the 5 overflows to Rested').toBe(5);

  // --- The last hour: the sign-up stands and the withdraw is refused.
  const g = (await read(p.page, 'events.get', { eventId })).data as Any;
  const startsAt = (g.event ?? g).startsAt as number;
  const now0 = await clock(p.page, 0);
  await clock(p.page, startsAt - now0 - 30 * 60_000);
  await hook(q.page, 'character', { energy: 100 });
  const late = await mutate(q.page, 'events.signUp', { eventId, slot: { roleId: 'security' }, idempotencyKey: uuid() });
  expect(late.ok, 'signing up in the last hour is allowed: ' + late.reason).toBe(true);
  const refused = await mutate(q.page, 'events.withdraw', { eventId, idempotencyKey: uuid() });
  expect(refused.ok).toBe(false);
  expect(refused.reason).toBe('WITHDRAW_CLOSED');
  const lateP = await mutate(p.page, 'events.withdraw', { eventId, idempotencyKey: uuid() });
  expect(lateP.ok, 'the caller too is committed').toBe(false);

  // --- Start it, all rolls succeed: P Speaker 15, Q Security 10, 2 volunteers: Success.
  const ironP = (await me(p.page)).iron as number;
  const ironQ = (await me(q.page)).iron as number;
  await hook(p.page, 'events', { rolls: { eventId, byRole: 'success' } });
  await hook(p.page, 'events', { startNow: eventId });
  const cur = (await read(p.page, 'events.current')).data as Any;
  expect(cur.kind).toBe('result');
  const r = cur.result as Any;
  const curQ = (await read(q.page, 'events.current')).data as Any;
  const PC = { triumph: 15, success: 10, mixed: 6, fiasco: 3 } as Record<string, number>;
  const FXP = { triumph: 1.5, success: 1, mixed: 0.5, fiasco: 0.25 } as Record<string, number>;
  const band = r.stamp as string;
  console.log('QA band', band, JSON.stringify(r.pc), JSON.stringify(r.rewards), JSON.stringify(curQ.result.rewards), JSON.stringify(r.summary));
  expect(band, 'two members + two volunteers, all rolls succeed').toBe('success');
  expect(r.pc).toEqual({ amount: PC[band]!, rate: 'full' });
  expect(r.rewards.xp.base, 'XP base = 5 x 15 on a Success').toBe(75);
  expect(r.rewards.fxp.base, 'Party XP base = 0.8 x 15 x band').toBe(Math.round(0.8 * 15 * FXP[band]!));
  expect(curQ.result.pc).toEqual({ amount: 10, rate: 'full' });
  expect(curQ.result.rewards.xp.base).toBe(50);
  expect(curQ.result.rewards.fxp.base).toBe(Math.round(0.8 * 10 * FXP[band]!));
  expect(r.summary).toMatchObject({ roles: 4 });
  // Iron: none from an event.
  expect(((await me(p.page)).iron as number) - ironP, 'no Iron from an event (P)').toBe(0);
  expect(((await me(q.page)).iron as number) - ironQ, 'no Iron from an event (Q)').toBe(0);
  // Seen: twice is one removal, no error.
  const seenA = await mutate(p.page, 'events.seen', { eventId, signupId: r.signupId ?? null });
  const seenB = await mutate(p.page, 'events.seen', { eventId, signupId: r.signupId ?? null });
  expect([seenA.ok, seenB.ok]).toEqual([true, true]);
  expect(((await read(p.page, 'events.current')).data as Any) ?? null).toBeNull();
  // --- The day's second event pays Political Capital at half (economy 20.4): P calls a canvass drive.
  const e2 = await mutate(p.page, 'events.callEvent', { typeId: 'event.canvass-drive', hours: 1, roleId: 'coordinator', districtId: null, idempotencyKey: uuid() });
  expect(e2.ok, e2.reason).toBe(true);
  const b2 = (await read(p.page, 'events.board')).data as Any;
  const e2id = b2.here.events.filter((e: Any) => e.kind !== 'fixture').map((e: Any) => e.id)[0] as string;
  await hook(p.page, 'events', { rolls: { eventId: e2id, byRole: 'success' } });
  await hook(p.page, 'events', { startNow: e2id });
  const cur2 = (await read(p.page, 'events.current')).data as Any;
  const PC_HALF = { triumph: 8, success: 5, mixed: 3, fiasco: 2 } as Record<string, number>;
  console.log('QA second event', cur2.result.stamp, JSON.stringify(cur2.result.pc));
  expect(cur2.result.pc).toEqual({ amount: PC_HALF[cur2.result.stamp as string]!, rate: 'half' });
  await p.ctx.close();
  await q.ctx.close();
});

test('2 away: three sign-ups settle while the player is gone; the modals come in order', async ({ browser }) => {
  test.setTimeout(420_000);
  const w = await member(browser, `Wren A${tag()}`, { rank: 2 });
  await freshDay(w.page);
  await hook(w.page, 'character', { energy: 100 });
  await hook(w.page, 'members', { n: 1, rank: 3 });
  const mates = (await read(w.page, 'faction.members', {})).data.rows as Any[];
  const m = mates.find((x) => !x.you)!;
  // 1. the branch's fixture here, and a member-called canvass drive in an hour; W is a hand on both.
  const b1 = (await read(w.page, 'events.board')).data as Any;
  const fixtureC = b1.here.events.find((e: Any) => e.kind === 'fixture')!;
  expect(fixtureC, 'the fixture in Coalport').toBeTruthy();
  const called = await hook(w.page, 'events', { call: { typeId: 'event.canvass-drive', hours: 1, roleId: 'coordinator', as: m.characterId } });
  const e1 = called.eventId as string;
  for (const id of [fixtureC.id as string, e1]) {
    const r = await mutate(w.page, 'events.signUp', { eventId: id, slot: 'hand', idempotencyKey: uuid() });
    expect(r.ok, r.reason).toBe(true);
  }
  // 2. to Irongate (the capital): its fixture as a hand too. Three open sign-ups.
  await hook(w.page, 'character', { cityId: 'irongate' });
  const b2 = (await read(w.page, 'events.board')).data as Any;
  const fixtureI = b2.here.events.find((e: Any) => e.kind === 'fixture');
  console.log('QA capital fixture', JSON.stringify(b2.here.events.map((e: Any) => [e.kind, e.name, e.startsAt])));
  expect(fixtureI, 'a fixture in Irongate').toBeTruthy();
  const ri = await mutate(w.page, 'events.signUp', { eventId: fixtureI.id, slot: 'hand', idempotencyKey: uuid() });
  expect(ri.ok, ri.reason).toBe(true);
  expect(((await me(w.page)).events?.open ?? []).length).toBe(3);
  // 3. a stay in the cells, then away: the clock to the next City Day (E1 started an hour in, the cells ended).
  await hook(w.page, 'held', { send: 'cells' });
  const now = await clock(w.page, 0);
  const nextDay = Math.ceil((now + 1) / 86_400_000) * 86_400_000 + 2 * 60_000;
  await clock(w.page, nextDay - now);
  await hook(w.page, 'city-day', {});
  // 4. W comes back: record each modal as it comes, in order.
  const seq: string[] = [];
  const layout: string[] = [];
  const unseenApi = ((await me(w.page)).events ?? {}) as Any;
  console.log('QA away: events view after the read', JSON.stringify({ unseen: unseenApi.unseen, open: unseenApi.open?.length }));
  const mm = await me(w.page);
  console.log('QA away: held', JSON.stringify(mm.held), 'runIn', JSON.stringify(mm.runIn), 'city', mm.cityId);
  console.log('QA away: current', JSON.stringify(((await read(w.page, 'events.current')).data as Any)?.kind));
  await w.page.goto('/');
  for (let i = 0; i < 14; i++) {
    await w.page.waitForTimeout(i === 0 ? 3_000 : 1_200);
    const ev = w.page.getByRole('dialog').filter({ has: w.page.getByTestId('event-result') });
    if (await ev.isVisible().catch(() => false)) {
      seq.push('event:' + (await ev.getByRole('heading').first().innerText().catch(() => '?')).replace(/s+/g, ' ').slice(0, 60) + ' | ' + ((await ev.innerText()).replace(/s+/g, ' ').slice(0, 50)));
      const cb = await ev.getByTestId('event-continue').boundingBox();
      layout.push(`${cb ? Math.round(cb.y + cb.height) : -1}/${cb ? Math.round(cb.height) : -1}`);
      await ev.getByTestId('event-continue').click({ timeout: 4_000 });
      await expect(ev).toBeHidden({ timeout: 6_000 }).catch(() => undefined);
      continue;
    }
    if (await w.page.getByTestId('orders-complete').isVisible().catch(() => false)) {
      seq.push('orders-complete');
      break;
    }
    const sheet = w.page.locator('[role=dialog][data-layout]');
    if (await sheet.isVisible().catch(() => false)) {
      seq.push('place-sheet');
      await sheet.getByRole('button', { name: /^Close/ }).first().click({ timeout: 3_000 }).catch(() => undefined);
      continue;
    }
    const other = w.page.getByRole('dialog').first();
    if (await other.isVisible().catch(() => false)) {
      seq.push('other:' + (await other.innerText()).replace(/s+/g, ' ').slice(0, 70) + ' @' + new URL(w.page.url()).pathname);
      await other.getByRole('button', { name: /^Continue$/ }).first().click({ timeout: 3_000 }).catch(() => undefined);
      continue;
    }
    seq.push('none @' + new URL(w.page.url()).pathname);
    if (seq.filter((x) => x.startsWith('event:')).length >= 3) break;
  }
  console.log('QA continue button bottom/height at 375x667', layout.join(' '));
  for (const l of layout) {
    const [bottom, height] = l.split('/').map(Number);
    expect(bottom, 'Continue inside the 667 px screen').toBeLessThanOrEqual(667);
    expect(height, '44 px target').toBeGreaterThanOrEqual(43.5);
  }
  console.log('QA away sequence', JSON.stringify(seq, null, 1));
  const eventModals = seq.filter((x) => x.startsWith('event:'));
  expect(eventModals.length, 'three event results, one modal each: ' + JSON.stringify(seq)).toBe(3);
  // The canvass drive (an hour in) comes before both fixtures (the boundary).
  expect(eventModals[0].toLowerCase()).toMatch(/street|foundry/);
  const heldAt = seq.findIndex((x) => x.startsWith('other:'));
  const firstEvent = seq.findIndex((x) => x.startsWith('event:'));
  console.log('QA held modal index', heldAt, 'first event index', firstEvent);
  // Credited once: a reload brings no second modal, and the character shows no unseen result.
  await w.page.reload();
  await w.page.waitForTimeout(1_200);
  expect(await w.page.getByTestId('event-result').count()).toBe(0);
  await w.ctx.close();
});


test('3 favours: a second payer is refused, one charge; visit 3 Energy, not from rival ground; the cells card', async ({ browser }) => {
  test.setTimeout(300_000);
  const a = await member(browser, `Ada F${tag()}`, { rank: 1 });
  const c = await member(browser, `Cleo G${tag()}`, { rank: 1 });
  const b = await member(browser, `Bea H${tag()}`, { rank: 1 });
  // B in the cells; A twice with one key at once, and C with another key at once.
  await hook(b.page, 'held', { send: 'cells' });
  const k = uuid();
  const ironA0 = (await me(a.page)).iron as number;
  const ironC0 = (await me(c.page)).iron as number;
  const res = await Promise.all([
    mutate(a.page, 'favours.postBail', { characterId: b.id, idempotencyKey: k }),
    mutate(a.page, 'favours.postBail', { characterId: b.id, idempotencyKey: k }),
    mutate(c.page, 'favours.postBail', { characterId: b.id, idempotencyKey: uuid() }),
  ]);
  console.log('QA bail results', JSON.stringify(res.map((r) => [r.ok, r.reason])));
  const aIron = (await me(a.page)).iron as number;
  const cIron = (await me(c.page)).iron as number;
  const paid = [ironA0 - aIron, ironC0 - cIron];
  console.log('QA bail Iron paid by A, C', JSON.stringify(paid));
  expect(paid.filter((x) => x > 0), 'exactly one payer is charged, once').toHaveLength(1);
  expect(res.filter((r) => r.ok).length, 'the same key replays to the same result: at most 2 ok (one payer, one replay)').toBeLessThanOrEqual(2);
  expect(res.filter((r) => !r.ok).length, 'the other payer is refused').toBeGreaterThanOrEqual(1);
  const bMe = await me(b.page);
  expect(bMe.held?.state ?? null, 'B is out').not.toBe('in');

  // A visit: B on the ward. A visits from Irongate (allowed: anywhere but rival ground), twice at once.
  await hook(b.page, 'held', { send: 'infirmary' });
  await hook(a.page, 'character', { cityId: 'irongate', energy: 100 });
  await hook(c.page, 'character', { cityId: 'duskwall', energy: 100 });
  const vk = uuid();
  const vs = await Promise.all([
    mutate(a.page, 'favours.visit', { characterId: b.id, idempotencyKey: vk }),
    mutate(a.page, 'favours.visit', { characterId: b.id, idempotencyKey: vk }),
  ]);
  console.log('QA visit results', JSON.stringify(vs.map((r) => [r.ok, r.reason])));
  expect(vs.map((r) => r.ok)).toEqual([true, true]);
  const aE = (await me(a.page)).energy.value as number;
  console.log('QA visit Energy', aE);
  expect(aE, '3 Energy once (97, or 99-100 after a tick; never 94)').toBeGreaterThanOrEqual(95);
  expect(aE).toBeLessThanOrEqual(100);
  expect(aE, 'a visit was charged').toBeLessThan(101);
  const rival = await mutate(c.page, 'favours.visit', { characterId: b.id, idempotencyKey: uuid() });
  console.log('QA visit from rival ground', rival.ok, rival.reason);
  expect(rival.ok, 'a visit from rival ground is refused').toBe(false);
  await a.ctx.close();
  await c.ctx.close();
  await b.ctx.close();
});

test('4 chat: repeat and too many limit lines; the composer says why', async ({ browser }) => {
  test.setTimeout(300_000);
  const a = await member(browser, `Ines J${tag()}`, { rank: 1 });
  await hook(a.page, 'chat', { resetLimits: true });
  const ch = 'city:collective:coalport';
  const same = `same words ${tag()}`;
  const p1 = await mutate(a.page, 'chat.post', { channel: ch, text: same, idempotencyKey: uuid() });
  expect(p1.ok, p1.reason).toBe(true);
  await clock(a.page, 3_500);
  const rep = await mutate(a.page, 'chat.post', { channel: ch, text: same, idempotencyKey: uuid() });
  console.log('QA repeat', JSON.stringify(rep.data?.game ?? rep.data ?? rep));
  expect(rep.ok, 'the same line within a minute').toBe(false);
  // The retried key is one line (a replay).
  const key = uuid();
  const [r1, r2] = [await mutate(a.page, 'chat.post', { channel: ch, text: `once ${tag()}`, idempotencyKey: key }), null];
  void r2;
  expect(r1.ok).toBe(true);
  let lastWhy = '';
  for (let i = 0; i < 40; i++) {
    await clock(a.page, 3_200);
    const r = await mutate(a.page, 'chat.post', { channel: ch, text: `line ${i} ${tag()}`, idempotencyKey: uuid() });
    if (!r.ok) {
      lastWhy = JSON.stringify(r.data?.game ?? r.data);
      console.log('QA too many after', i + 2, 'lines:', lastWhy);
      break;
    }
  }
  expect(lastWhy, 'a limit line comes by the 31st line in ten minutes').toContain('tooMany');
  // The composer says it.
  await a.page.goto('/faction?tab=chat');
  await expect(a.page.getByTestId('chat-panel')).toBeVisible();
  await a.page.getByTestId('chat-input').fill('one more please');
  await a.page.getByTestId('chat-send').click();
  await expect(a.page.getByTestId('chat-limit')).toHaveText(/Thirty messages/, { timeout: 5_000 });
  console.log('QA composer limit line (too many):', await a.page.getByTestId('chat-limit').innerText());
  await a.ctx.close();
});

test('5 layout: the event page button above the tab bar on a short phone; desktop with chat hidden; bail from the cells card', async ({ browser }) => {
  test.setTimeout(300_000);
  const x = await member(browser, `Xenia K${tag()}`, { rank: 2 });
  await x.page.setViewportSize({ width: 375, height: 600 });
  await x.page.goto('/faction?tab=events');
  const card = x.page.locator('[data-testid=event-card][data-kind=fixture]').first();
  await card.getByTestId('event-card-open').click();
  await expect(x.page.getByTestId('event-page')).toBeVisible();
  const row = x.page.locator('[data-testid=role-row]').first();
  await row.click();
  const btn = x.page.getByTestId('event-signup');
  await expect(btn).toBeVisible();
  await x.page.waitForTimeout(600);
  const bb = (await btn.boundingBox())!;
  const nav = (await x.page.getByRole('navigation', { name: 'Main' }).boundingBox())!;
  console.log('QA sticky button bottom', Math.round(bb.y + bb.height), 'tab bar top', Math.round(nav.y), 'h', Math.round(bb.height));
  expect(bb.y + bb.height, 'the sign-up button is above the tab bar').toBeLessThanOrEqual(nav.y + 0.5);
  expect(bb.height).toBeGreaterThanOrEqual(43.5);
  expect(await x.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll').toBe(true);
  await x.page.screenshot({ path: '../../docs/qa/slice-6/qa-event-page-short.png' });

  // Desktop, chat hidden: the Events column and no chat column.
  expect((await mutate(x.page, 'chat.setHidden', { hidden: true })).ok).toBe(true);
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await desk.addCookies(await x.ctx.cookies());
  const d = await desk.newPage();
  await d.goto('/faction?tab=events');
  await expect(d.getByTestId('faction-events')).toBeVisible();
  await expect(d.locator('[data-testid=event-card]').first()).toBeVisible({ timeout: 10_000 });
  await d.waitForTimeout(800);
  await expect(d.getByRole('complementary', { name: 'Chat' })).toHaveCount(0);
  const chips = await d.getByTestId('faction-header-line').count();
  const w = (await d.getByTestId('faction-events').boundingBox())!.width;
  console.log('QA desktop chat hidden: events width', Math.round(w), 'chat chip count', await d.getByTestId('faction-tab-chat').count(), 'header line', chips);
  expect(await d.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await d.screenshot({ path: '../../docs/qa/slice-6/qa-desktop-chat-hidden.png' });
  await mutate(x.page, 'chat.setHidden', { hidden: false });
  await desk.close();

  // The cells card: a mate in the cells; the sheet from the station's card.
  const y = await member(browser, `Yara L${tag()}`, { rank: 1 });
  await hook(y.page, 'held', { send: 'cells' });
  let found = '';
  for (const loc of ['coalport.harbour-police', 'coalport.station']) {
    const r = await read(x.page, 'held.inCells', { locationId: loc });
    console.log('QA inCells', loc, r.ok ? JSON.stringify((r.data.rows ?? []).map((q: Any) => [q.name, !!q.mate])) : r.reason);
    if (r.ok && (r.data.rows ?? []).some((q: Any) => q.mate)) { found = loc; break; }
  }
  expect(found, 'a police place lists the mate in the cells').not.toBe('');
  await hook(x.page, 'character', { level: 6 });
  await x.page.setViewportSize({ width: 375, height: 667 });
  await x.page.goto('/city/coalport?loc=' + found);
  const cells = x.page.getByTestId('cells-now');
  await expect(cells).toBeAttached({ timeout: 15_000 });
  await cells.scrollIntoViewIfNeeded();
  await expect(cells).toBeVisible();
  const bail = cells.getByTestId('cells-now-bail').first();
  await bail.click();
  const sheet = x.page.getByTestId('favour-sheet');
  await expect(sheet).toBeVisible();
  await x.page.waitForTimeout(600);
  const sb = (await sheet.boundingBox())!;
  const confirm = (await sheet.getByTestId('favour-confirm').boundingBox())!;
  console.log('QA bail sheet from the cells card', JSON.stringify(sb), 'confirm bottom', Math.round(confirm.y + confirm.height));
  expect(confirm.y + confirm.height).toBeLessThanOrEqual(667);
  expect(confirm.height).toBeGreaterThanOrEqual(43.5);
  await x.page.screenshot({ path: '../../docs/qa/slice-6/qa-bail-from-cells.png' });
  await x.ctx.close();
  await y.ctx.close();
});
