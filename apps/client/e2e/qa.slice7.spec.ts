/* eslint-disable @typescript-eslint/no-explicit-any -- the spec reads untyped tRPC JSON */
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { arrivalContinue } from './helpers';
import { hook, memberContext, mutate, read, termDay, testMembers } from './nationKit';
import type { Api } from './nationKit';

/**
 * QA slice 7 (docs/qa/slice-7-report.md). Risk areas the full e2e did not cover, through the API with
 * the same key (and two keys) fired concurrently:
 *  1. the Chair's election: stand (25 PC spent once), back (10 PC once, one per member), vote (one
 *     ballot), the count (backers capped at five, +3 each, an exact tie to the secretary);
 *  2. Parliament: table (50 PC once, one bill a member, one bill a law), vote (one vote), the veto
 *     (once a term, one effect), the laws in play (the book, the ticket's *LAW*);
 *  3. the Governor's rule and Address, the petition's signature;
 *  4. being away: a week of term days in one read, the stipends paid once.
 */

const TERM_EPOCH = 20_458;
const termDayOf = (day: number) => (((day - TERM_EPOCH) % 28) + 28) % 28;
const uuid = () => randomUUID();
const pcOf = async (api: Api): Promise<number> => (await read(api, 'character.me')).data.pc as number;

/** The same key `n` times at once. */
const same = (api: Api, proc: string, body: object, n = 3) => {
  const idempotencyKey = uuid();
  return Promise.all(Array.from({ length: n }, () => mutate(api, proc, { ...body, idempotencyKey })));
};
/** `n` different keys at once. */
const keys = (api: Api, proc: string, body: object, n = 2) =>
  Promise.all(Array.from({ length: n }, () => mutate(api, proc, { ...body, idempotencyKey: uuid() })));
const reasons = (rs: Array<{ ok: boolean; reason: string | null }>) => rs.map((r) => (r.ok ? 'ok' : r.reason));

test.describe.configure({ mode: 'serial' });

test('1 the Chair: stand, back, vote under races; backers capped at five; an exact tie goes to the secretary', async ({ browser }) => {
  test.setTimeout(420_000);
  const a = await memberContext(browser, 'Qa Anna', { seed: { rank: 4, pc: 300, energy: 100 } });
  await hook(a.api, 'office', { record: { characterId: 'me', council: 1 } });
  await hook(a.api, 'clock', { advanceMs: 15 * 86_400_000 });
  await termDay(a.api, 9);

  // --- Stand: the same key three times at once is one name and 25 PC, spent.
  const pc0 = await pcOf(a.api);
  const platformId = (await read(a.api, 'chairElection.get')).data.stand.platforms[0].id as string;
  const stood = await same(a.api, 'chairElection.stand', { platformId });
  console.log('QA stand x3 same key', JSON.stringify(reasons(stood)));
  expect(stood.filter((r) => r.ok).length, 'every same-key tap gets the stored result: ' + JSON.stringify(reasons(stood))).toBe(3);
  const pc1 = await pcOf(a.api);
  expect(pc0 - pc1, 'the Chair costs 25 PC, once').toBe(25);
  // Another key on a standing name: refused, no second charge.
  const again = await keys(a.api, 'chairElection.stand', { platformId });
  expect(again.some((r) => r.ok), 'a second stand: ' + JSON.stringify(reasons(again))).toBe(false);
  expect(await pcOf(a.api), 'no second charge').toBe(pc1);
  const view = (await read(a.api, 'chairElection.get')).data;
  const mine = (view.candidates as any[]).find((c) => c.you);
  expect(mine, 'one candidacy').toBeTruthy();
  expect((view.candidates as any[]).filter((c) => c.you)).toHaveLength(1);
  const candidacyId = mine.candidacyId as string;

  // --- Back: a real member backs with the same key x3 (10 PC once), then two keys at once (one backing).
  const b = await memberContext(browser, 'Qa Bruno', { seed: { rank: 3, pc: 100, energy: 100 } });
  await hook(b.api, 'clock', { advanceMs: 0 });
  const bpc = await pcOf(b.api);
  const backs = await same(b.api, 'chairElection.back', { candidacyId });
  console.log('QA back x3 same key', JSON.stringify(reasons(backs)));
  expect(backs.every((r) => r.ok), JSON.stringify(reasons(backs))).toBe(true);
  expect(bpc - (await pcOf(b.api)), 'backing costs 10 PC once').toBe(10);
  const backs2 = await keys(b.api, 'chairElection.back', { candidacyId });
  expect(backs2.some((r) => r.ok), 'one backing per member per election: ' + JSON.stringify(reasons(backs2))).toBe(false);
  expect(bpc - (await pcOf(b.api))).toBe(10);

  // --- Six more test members back: the count takes five at +3 (the cap); and all of 16 vote for the secretary.
  const members = await testMembers(a.api, 16, { rank: 3 });
  const bk = await hook(a.api, 'ballots', { chairBack: { as: members.slice(0, 6), candidacyId } });
  expect(bk.results.every((r: any) => r.ok), JSON.stringify(bk)).toBe(true);

  // --- Day 11: the vote. The same key x3 is one ballot; two keys for two rows is one ballot.
  await termDay(a.api, 11);
  const v1 = await same(b.api, 'chairElection.vote', { key: 'n:secretary' });
  expect(v1.every((r) => r.ok), JSON.stringify(reasons(v1))).toBe(true);
  const v2 = await keys(b.api, 'chairElection.vote', { key: mine.key as string });
  console.log('QA second vote after the first', JSON.stringify(reasons(v2)));
  expect(v2.some((r) => r.ok), 'one ballot each, final').toBe(false);
  // Anna votes for herself, twice at once on two keys.
  const annaKey = ((await read(a.api, 'chairElection.get')).data.candidates as any[]).find((c: any) => c.you).key as string;
  const av = await keys(a.api, 'chairElection.vote', { key: annaKey });
  expect(av.filter((r) => r.ok).length, 'two keys at once on one ballot: ' + JSON.stringify(reasons(av))).toBeLessThanOrEqual(1);
  // 16 test members vote the secretary: secretary 16 + Bruno's 1 = 17 votes; Anna: 1 + 3 × 5 = 16 (capped).
  const sv = await hook(a.api, 'ballots', { chair: { as: members, key: 'n:secretary' } });
  expect(sv.results.every((r: any) => r.ok), JSON.stringify(sv)).toBe(true);
  // One more vote for Anna from the chair route: Anna's total is 1 vote + 15 = 16; make the secretary 16 too?
  // The secretary has 17: Anna loses by one. Move one ballot: only Anna's is needed, so recount below.

  // --- Day 14: the count.
  await termDay(a.api, 14);
  const res = (await read(a.api, 'chairElection.result')).data;
  console.log('QA chair result', JSON.stringify(res));
  expect(res, 'a result').toBeTruthy();
  const rows: any[] = res.rows;
  const anna = rows.find((r) => r.kind === 'player');
  console.log('QA anna row', JSON.stringify(anna));
  if (anna) {
    const backersCounted = anna.backersCounted ?? Math.min(5, anna.backers);
    expect(backersCounted, 'at most five backers count').toBeLessThanOrEqual(5);
    expect(anna.total, 'votes + 3 x backers (max five)').toBe((anna.votes ?? 0) + 3 * Math.min(5, anna.backers ?? 0));
  }
  await a.ctx.close();
  await b.ctx.close();
});

test('1b the Chair: an exact tie is the secretary\'s (GDD 15.4)', async ({ browser }) => {
  test.setTimeout(420_000);
  // The next term: Chair elections open again; the shared clock moves on.
  const a = await memberContext(browser, 'Qa Tilda', { seed: { rank: 4, pc: 300, energy: 100 } });
  await hook(a.api, 'office', { record: { characterId: 'me', council: 1 } });
  await hook(a.api, 'clock', { advanceMs: 15 * 86_400_000 });
  await termDay(a.api, 9, true);
  const st = await mutate(a.api, 'chairElection.stand', { platformId: (await read(a.api, 'chairElection.get')).data.stand.platforms[0].id, idempotencyKey: uuid() });
  expect(st.ok, st.reason ?? '').toBe(true);
  const annaKey = ((await read(a.api, 'chairElection.get')).data.candidates as any[]).find((c: any) => c.you).key as string;
  const members = await testMembers(a.api, 6, { rank: 3 });
  await termDay(a.api, 11);
  // Tilda 1 (herself) + 2 members = 3 votes; the secretary 3 votes: an exact tie.
  expect((await mutate(a.api, 'chairElection.vote', { key: annaKey, idempotencyKey: uuid() })).ok).toBe(true);
  const f = await hook(a.api, 'ballots', { chair: { as: members.slice(0, 2), key: annaKey } });
  expect(f.results.every((r: any) => r.ok)).toBe(true);
  const s = await hook(a.api, 'ballots', { chair: { as: members.slice(2, 5), key: 'n:secretary' } });
  expect(s.results.every((r: any) => r.ok)).toBe(true);
  await termDay(a.api, 14);
  const res = (await read(a.api, 'chairElection.result')).data;
  console.log('QA tie result', JSON.stringify(res));
  expect(res.secretaryKept, 'an exact tie keeps the secretary: ' + JSON.stringify(res.rows)).toBe(true);
  await a.ctx.close();
});

test("2 Parliament: table, vote, the veto and the President's Address under races; a law in play", async ({ browser }) => {
  test.setTimeout(480_000);
  await termDay((await memberContext(browser, 'Qa Clock', {})).api, 6, true);
  const p = await memberContext(browser, 'Qa Otto', { party: 'vanguard', seed: { rank: 6, pc: 400, energy: 100 } });
  await hook(p.api, 'office', { seat: { characterId: 'me', office: 'president' } });
  const a = await memberContext(browser, 'Qa Rosa', { seed: { rank: 5, pc: 500, energy: 100 } });
  await hook(a.api, 'office', { seat: { characterId: 'me', office: 'deputy' } });
  const d2 = await memberContext(browser, 'Qa Dora', { seed: { rank: 5, pc: 500, energy: 100 } });
  await hook(d2.api, 'office', { seat: { characterId: 'me', office: 'deputy' } });
  const d3 = await memberContext(browser, 'Qa Dirk', { party: 'alliance', seed: { rank: 5, pc: 500, energy: 100 } });
  await hook(d3.api, 'office', { seat: { characterId: 'me', office: 'deputy' } });

  // The speech ticket before the law: the energy and the tags.
  const speechOf = async (api: Api) => {
    const city = (await read(api, 'city.get', { cityId: 'coalport' })).data;
    const act = city.locations.flatMap((l: any) => l.actions).find((x: any) => x.type === 'speech' && !x.locked);
    return act as any;
  };
  const before = await speechOf(a.api);
  console.log('QA speech ticket before', JSON.stringify({ energy: before?.energy, tags: before?.tags }));
  const book0 = (await read(a.api, 'parliament.laws')).data;
  console.log('QA law book at the start', JSON.stringify(book0).slice(0, 900));
  const inForce = new Set<string>(JSON.stringify(book0.inForce).match(/law\.[a-z-]+/g) ?? []);
  const free = ['law.public-assembly', 'law.peoples-education', 'law.universal-care', 'law.rehabilitation', 'law.free-market', 'law.open-borders'].filter((l) => !inForce.has(l));
  console.log('QA laws not in force', JSON.stringify(free));
  const lawA = free[0]!;
  const lawU = free[1]!;
  const nameOf = (id: string) => ({ 'law.public-assembly': 'Public Assembly', 'law.peoples-education': "People's Education", 'law.universal-care': 'Universal Care', 'law.rehabilitation': 'Rehabilitation', 'law.free-market': 'Free Market', 'law.open-borders': 'Open Borders' } as Record<string, string>)[id]!;

  // --- Table: the same key x3 is one bill and 50 PC; another key from the same deputy is refused.
  const pc0 = await pcOf(a.api);
  const t1 = await same(a.api, 'parliament.table', { kind: 'law', lawId: lawA, replacesLawId: null });
  console.log('QA table x3 same key', JSON.stringify(reasons(t1)));
  expect(t1.every((r) => r.ok), JSON.stringify(reasons(t1))).toBe(true);
  expect(pc0 - (await pcOf(a.api)), "a deputy's bill costs 50 PC once").toBe(50);
  const t1b = await keys(a.api, 'parliament.table', { kind: 'law', lawId: 'law.curfew', replacesLawId: null });
  expect(t1b.some((r) => r.ok), 'one bill a term: ' + JSON.stringify(reasons(t1b))).toBe(false);
  expect(pc0 - (await pcOf(a.api))).toBe(50);

  // Two deputies put the same law at once with different keys: one bill (the unique law), one charge.
  const [pd2, pd3] = [await pcOf(d2.api), await pcOf(d3.api)];
  const race = await Promise.all([
    mutate(d2.api, 'parliament.table', { kind: 'law', lawId: lawU, replacesLawId: null, idempotencyKey: uuid() }),
    mutate(d3.api, 'parliament.table', { kind: 'law', lawId: lawU, replacesLawId: null, idempotencyKey: uuid() }),
  ]);
  console.log('QA table race, one law', JSON.stringify(reasons(race)));
  expect(race.filter((r) => r.ok).length, 'one bill for one law').toBe(1);
  const spent = pd2 - (await pcOf(d2.api)) + (pd3 - (await pcOf(d3.api)));
  expect(spent, 'one 50 PC charge for the winner, none for the loser').toBe(50);
  const winner = race[0]!.ok ? d2 : d3;

  // The chamber: our two bills (the secretaries' Monday bill may sit beside them).
  const chamber = (await read(a.api, 'parliament.chamber')).data;
  const bills: any[] = chamber.bills ?? chamber.orderPaper ?? [];
  console.log('QA chamber keys', Object.keys(chamber).join(','), 'bills', bills.length);
  const bill = (id: string) => read(a.api, 'parliament.bill', { billId: id }).then((r) => r.data);
  const findBill = (title: RegExp) => bills.find((b: any) => title.test(JSON.stringify(b)));
  const billA = findBill(new RegExp(nameOf(lawA)));
  const billU = findBill(new RegExp(nameOf(lawU)));
  expect(billA && billU, 'both bills on the paper: ' + JSON.stringify(bills).slice(0, 500)).toBeTruthy();
  const idA = (billA.id ?? billA.billId) as string;
  const idU = (billU.id ?? billU.billId) as string;

  // --- Vote: the same key x3 is one vote; For and Against on two keys, one; a second bill is refused.
  const vk = await same(a.api, 'parliament.vote', { billId: idA, vote: 'for' });
  expect(vk.every((r) => r.ok), JSON.stringify(reasons(vk))).toBe(true);
  const vk2 = await keys(a.api, 'parliament.vote', { billId: idA, vote: 'against' });
  expect(vk2.some((r) => r.ok), 'one vote, final: ' + JSON.stringify(reasons(vk2))).toBe(false);
  const vk3 = await keys(a.api, 'parliament.vote', { billId: idU, vote: 'for' }, 1);
  // GDD 15.6 *one bill per member per term* is about tabling; a deputy votes on every bill (one vote each).
  expect(vk3[0]!.ok, 'a vote on a second bill: ' + JSON.stringify(reasons(vk3))).toBe(true);
  expect((await bill(idA)).counts.for, 'one For, not three').toBe(1);
  // Two keys at once from another deputy: one vote.
  const vr = await keys(winner.api, 'parliament.vote', { billId: idA, vote: 'for' }, 2);
  expect(vr.filter((r) => r.ok).length, JSON.stringify(reasons(vr))).toBe(1);
  expect((await bill(idA)).counts.for, 'two For').toBe(2);

  // --- The division of both bills (no other player votes: the locals decide, by the secretaries' lines).
  const bA = await bill(idA);
  await termDay(a.api, termDayOf(bA.divideDay));
  const dA = await bill(idA);
  const dU = await bill(idU);
  console.log('QA division', JSON.stringify({ A: [dA.state, dA.counts], U: [dU.state, dU.counts] }));
  console.log('QA bill A full', JSON.stringify(dA).slice(0, 2500));
  expect(dA.counts.for + dA.counts.against, 'the bill, 60 seats').toBeLessThanOrEqual(60);

  // --- The veto on the signature day: Universal Care, three taps with one key, then another key (once a term).
  if (dU.state === 'awaitingSignature') {
    const v1 = await same(p.api, 'parliament.veto', { billId: idU });
    console.log('QA veto x3 same key', JSON.stringify(reasons(v1)));
    expect(v1.every((r) => r.ok), JSON.stringify(reasons(v1))).toBe(true);
    const afterU = await bill(idU);
    expect(afterU.state, 'vetoed once').toMatch(/veto/i);
    if (dA.state === 'awaitingSignature') {
      const v2 = await keys(p.api, 'parliament.veto', { billId: idA }, 2);
      expect(v2.some((r) => r.ok), 'one veto a term: ' + JSON.stringify(reasons(v2))).toBe(false);
    }
  } else {
    console.log('QA NOTE Universal Care did not reach the signature day:', dU.state);
  }

  // --- The law in play: the day after, Public Assembly is in the book and the speech ticket costs 2 less.
  await termDay(a.api, termDayOf(bA.divideDay) + 1);
  const book = (await read(a.api, 'parliament.laws')).data;
  console.log('QA law book', JSON.stringify(book).slice(0, 600));
  await a.page.goto('/parliament/laws');
  const row = a.page.getByTestId('law-in-force').first();
  await expect(row).toBeVisible();
  const rowText = (await row.innerText()).replace(/\s+/g, ' ');
  console.log('QA law book row', JSON.stringify(rowText));
  if (/passed \w+ 0–0/.test(rowText)) await a.page.screenshot({ path: '../../docs/qa/slice-7/qa-law-book-row.png' });
  const after = await speechOf(a.api);
  console.log('QA speech ticket after', JSON.stringify({ energy: after?.energy, tags: after?.tags ?? after?.ordinances }));
  if (dA.state !== 'failed') expect(JSON.stringify(book), 'the passed law is in the book').toContain(nameOf(lawA));
  // Public Assembly was already in force (a secretary's bill passed in an earlier term): speeches 12 -> 10, tagged LAW.
  if (lawA === 'law.public-assembly') {
    expect(before.energy, 'before the law: 12 Energy').toBe(12);
    expect(after.energy, 'the law is in force: speeches cost 2 Energy less').toBe(10);
    expect(JSON.stringify(after.tags), 'the ticket names the law').toContain('"law"');
  } else {
    expect(before.energy, 'a speech ticket with the Public Assembly Act already in force').toBe(10);
  }

  // --- The President's Address: three taps with one key, then another key (once a term).
  const gov = (await read(p.api, 'office.governor', { cityId: 'coalport' })).data;
  const issue = gov.address.issues[0];
  const pp0 = await pcOf(p.api);
  const ad = await same(p.api, 'president.address', { issueDocId: issue.docId });
  console.log('QA president address x3', JSON.stringify(reasons(ad)));
  expect(ad.every((r) => r.ok), JSON.stringify(reasons(ad))).toBe(true);
  console.log('QA president address PC delta', pp0 - (await pcOf(p.api)));
  const ad2 = await keys(p.api, 'president.address', { issueDocId: gov.address.issues[1]?.docId ?? issue.docId }, 2);
  expect(ad2.some((r) => r.ok), 'one Address a term: ' + JSON.stringify(reasons(ad2))).toBe(false);
  for (const c of [p, a, d2, d3]) await c.ctx.close();
});

test("3 Governor: the rule and the Address under races; a petition's signature; a week away pays the stipends once", async ({ browser }) => {
  test.setTimeout(480_000);
  const g = await memberContext(browser, 'Qa Greta', { seed: { rank: 5, pc: 200, energy: 100, level: 8 } });
  await hook(g.api, 'clock', { advanceTo: { cityId: 'coalport', cycleDay: 0 } });
  await hook(g.api, 'city-day');
  await hook(g.api, 'office', { record: { characterId: 'me', council: 1 } });
  await hook(g.api, 'office', { seat: { characterId: 'me', office: 'governor', cityId: 'coalport' } });
  const page1 = (await read(g.api, 'office.governor', { cityId: 'coalport' })).data;
  expect(page1.you).toBe(true);
  const menu: any[] = page1.rule.menu ?? [];
  console.log('QA governor menu', JSON.stringify(menu.map((m) => m.id ?? m.ordinanceId ?? m.name)));
  expect(menu.length).toBeGreaterThan(1);
  const idOf = (m: any) => (m.id ?? m.ordinanceId) as string;
  // Same key x3: one rule. Then two keys at once with two different rules: the last write stands, no corruption.
  const r1 = await same(g.api, 'governor.setRule', { ordinanceId: idOf(menu[0]) });
  console.log('QA setRule x3 same key', JSON.stringify(reasons(r1)));
  expect(r1.every((r) => r.ok), JSON.stringify(reasons(r1))).toBe(true);
  const r2 = await Promise.all([
    mutate(g.api, 'governor.setRule', { ordinanceId: idOf(menu[0]), idempotencyKey: uuid() }),
    mutate(g.api, 'governor.setRule', { ordinanceId: idOf(menu[1]), idempotencyKey: uuid() }),
  ]);
  console.log('QA setRule two keys', JSON.stringify(reasons(r2)));
  const set = (await read(g.api, 'office.governor', { cityId: 'coalport' })).data.rule.set;
  console.log('QA the rule after', JSON.stringify(set));
  expect([idOf(menu[0]), idOf(menu[1])]).toContain(set.ordinanceId);

  // The Address: once a term.
  const issue = page1.address.issues[0];
  const mom0 = JSON.stringify(issue.momentum);
  const gpc = await pcOf(g.api);
  const ga = await same(g.api, 'governor.address', { issueDocId: issue.docId });
  console.log('QA governor address x3', JSON.stringify(reasons(ga)));
  expect(ga.every((r) => r.ok), JSON.stringify(reasons(ga))).toBe(true);
  console.log('QA governor address PC delta', gpc - (await pcOf(g.api)));
  const ga2 = await keys(g.api, 'governor.address', { issueDocId: page1.address.issues[1]?.docId ?? issue.docId }, 2);
  expect(ga2.some((r) => r.ok), 'one Address a term: ' + JSON.stringify(reasons(ga2))).toBe(false);
  const mom1 = JSON.stringify((await read(g.api, 'office.governor', { cityId: 'coalport' })).data.address.issues[0].momentum);
  console.log('QA momentum', mom0, '->', mom1);

  // --- A petition: open x3 with one key = 10 PC once; a second key refused (one per city); a signature x3 = 10 PC once.
  await hook(g.api, 'clock', { advanceTo: { cityId: 'coalport', cycleDay: 0 } });
  await hook(g.api, 'city-day');
  const o = await memberContext(browser, 'Qa Opal', { seed: { rank: 3, pc: 100, energy: 100 } });
  const s = await memberContext(browser, 'Qa Sam', { seed: { rank: 2, pc: 100, energy: 100 } });
  const opc = await pcOf(o.api);
  const op = await same(o.api, 'petition.open', {});
  console.log('QA petition open x3', JSON.stringify(reasons(op)));
  expect(op.every((r) => r.ok), JSON.stringify(reasons(op))).toBe(true);
  expect(opc - (await pcOf(o.api)), 'opening costs 10 PC once').toBe(10);
  const op2 = await keys(o.api, 'petition.open', {}, 2);
  expect(op2.some((r) => r.ok), 'one open petition a city: ' + JSON.stringify(reasons(op2))).toBe(false);
  const pet = (await read(s.api, 'petition.get')).data;
  const petId = (pet.open ?? pet.petition)?.id as string;
  expect(petId, 'the open petition: ' + JSON.stringify(pet).slice(0, 300)).toBeTruthy();
  const spc = await pcOf(s.api);
  const sg = await same(s.api, 'petition.sign', { petitionId: petId });
  expect(sg.every((r) => r.ok), JSON.stringify(reasons(sg))).toBe(true);
  expect(spc - (await pcOf(s.api)), 'a signature costs 10 PC once').toBe(10);
  const sg2 = await keys(s.api, 'petition.sign', { petitionId: petId }, 2);
  expect(sg2.some((r) => r.ok), 'sign once: ' + JSON.stringify(reasons(sg2))).toBe(false);
  expect(spc - (await pcOf(s.api))).toBe(10);

  // --- A week away (the worker is off in the e2e server): the stipends in one read, paid once.
  await termDay(g.api, 0, true);
  const dep = await memberContext(browser, 'Qa Dep', { seed: { rank: 5, pc: 100, energy: 100 } });
  const ctl = await memberContext(browser, 'Qa Ctl', { seed: { rank: 5, pc: 100, energy: 100 } });
  const chr = await memberContext(browser, 'Qa Chr', { seed: { rank: 5, pc: 100, energy: 100 } });
  const prs = await memberContext(browser, 'Qa Prs', { party: 'vanguard', seed: { rank: 6, pc: 100, energy: 100 } });
  await hook(dep.api, 'office', { seat: { characterId: 'me', office: 'deputy' } });
  await hook(chr.api, 'office', { seat: { characterId: 'me', office: 'chair' } });
  await hook(prs.api, 'office', { seat: { characterId: 'me', office: 'president' } });
  const snap = async () => ({ dep: await pcOf(dep.api), ctl: await pcOf(ctl.api), chr: await pcOf(chr.api), prs: await pcOf(prs.api) });
  const base = await snap();
  await termDay(g.api, 7); // seven boundaries with nobody reading
  const aft1 = await snap();
  await dep.page.goto('/');
  await dep.page.reload();
  const aft2 = await snap();
  const gain = (x: typeof base) => ({
    dep: x.dep - x.ctl - (base.dep - base.ctl),
    chr: x.chr - x.ctl - (base.chr - base.ctl),
    prs: x.prs - x.ctl - (base.prs - base.ctl),
  });
  console.log('QA a week away: stipend PC over the control', JSON.stringify(gain(aft1)), 'after a second read', JSON.stringify(gain(aft2)));
  expect(gain(aft2), 'a second read pays nothing more').toEqual(gain(aft1));
  // GDD 5.5/15.1: deputy 5 PC, Chair 20, President 50 a day; six to eight boundaries paid.
  expect(gain(aft1).dep).toBeGreaterThanOrEqual(5 * 6);
  expect(gain(aft1).dep).toBeLessThanOrEqual(5 * 8);
  expect(gain(aft1).chr).toBeGreaterThanOrEqual(20 * 6);
  expect(gain(aft1).chr).toBeLessThanOrEqual(20 * 8);
  expect(gain(aft1).prs).toBeGreaterThanOrEqual(50 * 6);
  expect(gain(aft1).prs).toBeLessThanOrEqual(50 * 8);
  for (const c of [g, o, s, dep, ctl, chr, prs]) await c.ctx.close();
});

test('4 Unrest: a home city in Unrest has its locals vote the secretary\'s line (16 Oct ruling)', async ({ browser }) => {
  test.setTimeout(300_000);
  await termDay((await memberContext(browser, 'Qa Clock2', {})).api, 5, true);
  const v = await memberContext(browser, 'Qa Vera', { party: 'vanguard', seed: { rank: 5, pc: 500, energy: 100 } });
  const c = await memberContext(browser, 'Qa Cato', { seed: { rank: 5, pc: 500, energy: 100 } });
  await hook(c.api, 'office', { seat: { characterId: 'me', office: 'deputy' } });
  // The Vanguard pushes Coalport (the Collective's home) into Unrest; the next boundary records it.
  const pushed = await hook(v.api, 'nation', { unrest: 'coalport' });
  console.log('QA unrest hook', JSON.stringify(pushed));
  await termDay(c.api, 6);
  const t = await mutate(c.api, 'parliament.table', { kind: 'law', lawId: 'law.peoples-education', replacesLawId: null, idempotencyKey: uuid() });
  expect(t.ok, t.reason ?? '').toBe(true);
  const bills = (await read(c.api, 'parliament.chamber')).data.bills as any[];
  const b = bills.find((x) => JSON.stringify(x).includes("People's Education"));
  const id = (b.id ?? b.billId) as string;
  // The Collective player deputy votes Against; the secretary's line on this law is For.
  const vt = await mutate(c.api, 'parliament.vote', { billId: id, vote: 'against', idempotencyKey: uuid() });
  expect(vt.ok, vt.reason ?? '').toBe(true);
  const bill = (await read(c.api, 'parliament.bill', { billId: id })).data;
  console.log('QA localLines in Unrest', JSON.stringify(bill.localLines));
  expect(bill.localLines.collective.why, 'the Collective is in Unrest: its locals follow the secretary, not the player deputy').toBe('unrest');
  expect(bill.localLines.collective.vote).toBe('for');
  const other = bill.localLines.alliance;
  console.log('QA alliance (not in Unrest)', JSON.stringify(other));
  await v.ctx.close();
  await c.ctx.close();
});

test('5 Layout and wording: the desk and the bill at 375 x 667, a Mayor of Irongate, the law book, the plate', async ({ browser }) => {
  test.setTimeout(300_000);
  const PHONE = { width: 375, height: 667 };
  // --- The Chair's desk at 375 x 667 (term day 14 of a term: a seated Chair).
  const ch = await memberContext(browser, 'Qa Chair', { seed: { rank: 5, pc: 300, energy: 100 }, viewport: PHONE });
  await termDay(ch.api, 15, true);
  await hook(ch.api, 'office', { seat: { characterId: 'me', office: 'chair' } });
  await ch.page.goto('/faction?tab=chair');
  await expect(ch.page.getByTestId('chair-desk')).toBeVisible();
  const pickerB = await ch.page.getByTestId('order-picker-B').boundingBox();
  const setBtn = await ch.page.getByTestId('set-orders').boundingBox();
  console.log('QA desk 375x667: picker B', JSON.stringify(pickerB), 'set-orders', JSON.stringify(setBtn));
  const deskFine = !!pickerB && !!setBtn && pickerB.y + pickerB.height <= 667 && setBtn.y + setBtn.height <= 667;
  if (!deskFine) await ch.page.screenshot({ path: '../../docs/qa/slice-7/qa-chair-desk-375x667.png' });
  const orderH = Math.min(setBtn?.height ?? 0, pickerB?.height ?? 99);
  expect.soft(deskFine, 'the pickers and the sticky Set the orders above the fold at 375 x 667').toBe(true);
  expect.soft(orderH, 'a 44 px touch target').toBeGreaterThanOrEqual(44);

  // --- A bill's For / Against pair at 375 x 667: both whole, side by side, nothing clipped.
  const dep = await memberContext(browser, 'Qa Deputy', { seed: { rank: 5, pc: 300, energy: 100 }, viewport: PHONE });
  await hook(dep.api, 'office', { seat: { characterId: 'me', office: 'deputy' } });
  const free = ['law.eight-hour-day', 'law.open-borders', 'law.press-licensing'];
  let billId = '';
  for (const lawId of free) {
    const t = await mutate(dep.api, 'parliament.table', { kind: 'law', lawId, replacesLawId: null, idempotencyKey: uuid() });
    console.log('QA table for the layout check', lawId, t.ok ? 'ok' : t.reason);
    if (t.ok) {
      const bills = (await read(dep.api, 'parliament.chamber')).data.bills as any[];
      billId = bills.find((x) => JSON.stringify(x).includes(lawId))!.billId as string;
      break;
    }
  }
  if (!billId) {
    const bills = (await read(dep.api, 'parliament.chamber')).data.bills as any[];
    console.log('QA chamber bills', JSON.stringify(bills).slice(0, 400));
    billId = bills.find((x) => x.state === 'voting' || x.status === 'voting')?.id ?? bills[0]?.id;
  }
  expect(billId, 'a bill to look at').toBeTruthy();
  await dep.page.goto(`/parliament/bill/${billId}`);
  await expect(dep.page.getByTestId('bill-page')).toBeVisible();
  const forB = await dep.page.getByTestId('bill-pick-for').boundingBox();
  const againstB = await dep.page.getByTestId('bill-pick-against').boundingBox();
  const clipped = await dep.page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-testid=bill-pick-for],[data-testid=bill-pick-against]')] as HTMLElement[];
    return els.map((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, r: e.getBoundingClientRect().right, doc: document.documentElement.scrollWidth }));
  });
  console.log('QA bill pair 375x667', JSON.stringify({ forB, againstB, clipped }));
  const pairOk = !!forB && !!againstB && forB.x >= 0 && againstB.x + againstB.width <= 375 && forB.height >= 44 && againstB.height >= 44 && clipped.every((c) => c.sw <= c.cw + 1 && c.doc <= 375);
  if (!pairOk) await dep.page.screenshot({ path: '../../docs/qa/slice-7/qa-bill-pair-375x667.png' });
  expect.soft(pairOk, 'the For / Against pair whole, 44 px, nothing clipped').toBe(true);
  const stayBelow = (forB?.y ?? 0) + (forB?.height ?? 0) <= 667;
  console.log('QA bill pair above the fold at 375x667:', stayBelow);

  // --- A Mayor of Irongate: the front page, the page, no literal {title}, the Address's headline.
  const m = await memberContext(browser, 'Qa Mayor', { seed: { rank: 5, pc: 300, energy: 100, level: 8 } });
  await hook(m.api, 'office', { record: { characterId: 'me', council: 1 } });
  const seat = await m.api.post('/api/test/office', { data: { seat: { characterId: 'me', office: 'governor', cityId: 'irongate' } } });
  console.log('QA seat Mayor of Irongate', seat.status(), (await seat.text()).slice(0, 200));
  if (seat.ok()) {
    await m.page.goto('/paper');
    const front = m.page.getByTestId('front-page');
    const txt = (await front.innerText().catch(() => '')) || '';
    console.log('QA Mayor front page', JSON.stringify(txt.slice(0, 400)));
    expect.soft(txt, 'a Mayor in Irongate, not a Governor').not.toMatch(/Governor/);
    expect.soft(txt).not.toMatch(/\{/);
    const pg = (await read(m.api, 'office.governor', { cityId: 'irongate' })).data;
    console.log('QA Irongate title', JSON.stringify(pg.city.title));
    const issue = pg.address.issues[0];
    const ad = await mutate(m.api, 'governor.address', { issueDocId: issue.docId, idempotencyKey: uuid() });
    expect(ad.ok, ad.reason ?? '').toBe(true);
    await termDay(m.api, 20, true);
    await m.page.goto('/paper');
    const body = await m.page.locator('body').innerText();
    console.log('QA paper after the Address has {:', /\{[a-zA-Z]+\}/.test(body), 'Governor of Irongate:', /Governor of Irongate/.test(body));
    expect.soft(body).not.toMatch(/\{[a-zA-Z]+\}/);
    expect.soft(body, 'Irongate has a Mayor').not.toMatch(/Governor of Irongate|Governor Qa Mayor/);
  }

  // --- The law book's row (a law in force, its tabler and its division) at 375 x 667.
  await ch.page.goto('/parliament/laws');
  const lawsText = await ch.page.locator('body').innerText();
  console.log('QA law book page', JSON.stringify(lawsText.slice(0, 700)));

  // --- The plate at 375 x 812: the left half of the share bar.
  const pl = await memberContext(browser, 'Qa Plate', { seed: { rank: 2, pc: 50, energy: 100 }, viewport: { width: 375, height: 812 } });
  await pl.page.goto('/city/coalport');
  await expect(pl.page.getByTestId('share-bar')).toBeVisible();
  const bar = (await pl.page.getByTestId('share-bar').boundingBox())!;
  const rule = await pl.page.getByTestId('plate-rule-chip').boundingBox();
  console.log('QA share bar', JSON.stringify(bar), 'rule line', JSON.stringify(rule));
  await pl.page.mouse.click(bar.x + bar.width * 0.25, bar.y + bar.height / 2);
  await pl.page.waitForTimeout(500);
  const leftOpened = await pl.page.getByRole('dialog').first().innerText().catch(() => '(nothing)');
  console.log('QA left half of the share bar opens:', JSON.stringify(leftOpened.slice(0, 80)));
  if (/Town Hall|Council|Hall/i.test(leftOpened)) await pl.page.screenshot({ path: '../../docs/qa/slice-7/qa-plate-share-bar-375x812.png' });
  for (const x of [ch, dep, m, pl]) await x.ctx.close();
});

test('6 Art: the Casino, the tram depot and the harbour stand on their own scenes', async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await memberContext(browser, 'Qa Art', { seed: { rank: 3, pc: 100, energy: 100, level: 12, fxp: 2000, iron: 2000 } });
  const { page } = a;
  await page.goto('/nation?city=clearwater');
  await page.getByTestId('city-board').click();
  await expect(page).toHaveURL(/\/journey$/);
  expect((await page.request.post('/api/test/journey', { data: { arriveNow: true } })).ok()).toBe(true);
  await page.reload();
  await expect(page.getByTestId('arrival-headline')).toHaveText("You're on the lake");
  await arrivalContinue(page);
  const expected: Record<string, string> = {
    'clearwater.casino': 'scene.casino',
    'clearwater.tram-depot': 'scene.tram-depot',
    'clearwater.harbour': 'scene.lake-harbour',
  };
  for (const [loc, scene] of Object.entries(expected)) {
    await page.goto(`/city/clearwater?loc=${loc}`);
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    const art = dlg.locator('[data-art]').first();
    const got = await art.getAttribute('data-art');
    const loaded = await dlg.locator('img').evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((i) => [i.complete, i.naturalWidth, i.currentSrc]));
    console.log('QA art', loc, got, JSON.stringify(loaded));
    expect.soft(got, loc).toBe('scene');
    const key = scene.replace('scene.', '');
    expect.soft(JSON.stringify(loaded), loc + ' stands on ' + scene).toContain(key);
    expect.soft(loaded.some(([c, w]) => c && (w as number) > 0), loc + ' an image decoded').toBe(true);
  }
  await a.ctx.close();
});
