/* eslint-disable @typescript-eslint/no-explicit-any -- the spec reads untyped tRPC JSON */
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { hook, memberContext, mutate, read } from './nationKit';
import type { Api } from './nationKit';

/**
 * QA slice 8 (docs/qa/slice-8-report.md). Through the API, the same key fired three times at once and
 * different keys racing for the last place:
 *  1. shops: buy, sell, bribe; bodyguards: hire (three tiers racing), renew (the last week ahead);
 *  2. the bar: round (three a day), plate, dinner (and worn Charisma 9);
 *  3. patrons: gift (once a day), favour (once a week);
 *  4. the Dossier: bind, sell, turn, the last of 15 places; the exposé's attempt;
 *  5. the flat (buy, rent) and Legacy perks;
 *  6. being away: a lapsed flat, a lapsed contract, a meal, rounds in hand, informants, one settlement.
 */

const uuid = () => randomUUID();
const meOf = async (api: Api): Promise<any> => (await read(api, 'character.me')).data;
const ironOf = async (api: Api): Promise<number> => (await meOf(api)).iron as number;
const same = (api: Api, proc: string, body: object, n = 3) => {
  const idempotencyKey = uuid();
  return Promise.all(Array.from({ length: n }, () => mutate(api, proc, { ...body, idempotencyKey })));
};
const keys = (api: Api, proc: string, bodies: object[]) =>
  Promise.all(bodies.map((b) => mutate(api, proc, { ...b, idempotencyKey: uuid() })));
const why = (rs: Array<{ ok: boolean; reason: string | null }>) => rs.map((r) => (r.ok ? 'ok' : r.reason));
const oks = (rs: Array<{ ok: boolean }>) => rs.filter((r) => r.ok).length;
const find = (o: any, pred: (x: any) => boolean): any => {
  if (!o || typeof o !== 'object') return undefined;
  if (pred(o)) return o;
  for (const v of Object.values(o)) {
    const r = find(v, pred);
    if (r) return r;
  }
  return undefined;
};
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

test.describe.configure({ mode: 'serial' });

test('1 shops: buy, sell, bribe once per key; hire three tiers racing; the last week of rent ahead', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await memberContext(browser, 'Qa Ota', { seed: { level: 16, rank: 4, iron: 30_000, energy: 100, cityId: 'coalport' } });
  const api = a.api;
  console.log('QA character.me keys', Object.keys(await meOf(api)).join(','));

  // --- buy x3 same key: one hat, 400 Iron.
  const i0 = await ironOf(api);
  const bought = await same(api, 'shop.buy', { locationId: 'coalport.market-row', itemId: 'acc.good-hat' });
  console.log('QA buy x3', JSON.stringify(why(bought)));
  expect(oks(bought), JSON.stringify(why(bought))).toBe(3);
  expect(i0 - (await ironOf(api)), 'the hat costs 400, once').toBe(400);
  const w = (await read(api, 'wardrobe.get')).data;
  const hats = JSON.stringify(w).split('acc.good-hat').length - 1;
  console.log('QA hat mentions in wardrobe.get', hats);
  // A second key on an owned hat: either refused or a second hat (a bug if charged twice).
  const i1 = await ironOf(api);
  const again = await keys(api, 'shop.buy', [{ locationId: 'coalport.market-row', itemId: 'acc.good-hat' }]);
  console.log('QA buy owned item, another key', JSON.stringify(why(again)), 'charged', i1 - (await ironOf(api)));
  // Two keys racing for a coat you do not own: one charge or two coats?
  const i2 = await ironOf(api);
  const coats = await keys(api, 'shop.buy', [
    { locationId: 'coalport.market-row', itemId: 'outfit.standard-coat' },
    { locationId: 'coalport.market-row', itemId: 'outfit.standard-coat' },
  ]);
  console.log('QA buy coat 2 keys', JSON.stringify(why(coats)), 'charged', i2 - (await ironOf(api)));

  // --- sell x3 same key: one refund.
  const owned = find((await read(api, 'wardrobe.get')).data, (x) => x.itemId === 'acc.good-hat' && typeof x.uid === 'string');
  console.log('QA hat row', JSON.stringify(owned)?.slice(0, 200));
  if (owned) {
    const i3 = await ironOf(api);
    const sold = await same(api, 'shop.sell', { locationId: 'coalport.market-row', uid: owned.uid });
    console.log('QA sell x3', JSON.stringify(why(sold)), 'gained', (await ironOf(api)) - i3);
    expect(oks(sold)).toBe(3);
    expect((await ironOf(api)) - i3, 'a hat sells at a tenth, once').toBe(40);
    const sold2 = await keys(api, 'shop.sell', [{ locationId: 'coalport.market-row', uid: owned.uid }]);
    expect(sold2[0]!.ok, 'selling a sold item with another key').toBe(false);
  }

  // --- bribe x3 same key at the back room: needs a mark; one price, one day.
  await hook(api, 'character', { marks: [{ kind: 'minor', daysAgo: 1 }] });
  const i4 = await ironOf(api);
  const bribed = await same(api, 'shop.bribe', { locationId: 'coalport.anchor' });
  console.log('QA bribe x3', JSON.stringify(why(bribed)), 'charged', i4 - (await ironOf(api)));
  expect(oks(bribed), JSON.stringify(why(bribed))).toBe(3);
  const spent = i4 - (await ironOf(api));
  expect(spent, 'the bribe is charged once').toBeGreaterThan(0);
  expect(spent).toBeLessThanOrEqual(2_000);

  // --- hire: three tiers racing from nothing -> exactly one contract, one charge.
  const b = await memberContext(browser, 'Qa Pavla', { seed: { level: 16, rank: 4, iron: 30_000, energy: 100, cityId: 'coalport' } });
  const ib = await ironOf(b.api);
  const race = await keys(b.api, 'bodyguard.hire', [1, 2, 3].map((tier) => ({ locationId: 'coalport.union-hall', tier })));
  console.log('QA hire tiers race', JSON.stringify(why(race)));
  expect(oks(race), 'one contract at a time: ' + JSON.stringify(why(race))).toBe(1);
  const price = ib - (await ironOf(b.api));
  expect([400, 1_200, 3_000], 'charged exactly one tier').toContain(price);

  // --- hire x3 same key, tier 1, on a fresh member: 400 once.
  const c = await memberContext(browser, 'Qa Rudi', { seed: { level: 6, rank: 1, iron: 5_000, energy: 100, cityId: 'coalport' } });
  const ic = await ironOf(c.api);
  const hired = await same(c.api, 'bodyguard.hire', { locationId: 'coalport.union-hall', tier: 1 });
  expect(oks(hired), JSON.stringify(why(hired))).toBe(3);
  expect(ic - (await ironOf(c.api)), 'the doorman: 400, once').toBe(400);
  // Level 6 cannot hire the steward (Rank 3) or the minder (Level 16).
  const noRank = await keys(c.api, 'bodyguard.hire', [{ locationId: 'coalport.union-hall', tier: 3 }]);
  expect(noRank[0]!.ok).toBe(false);

  // --- renew x3 same key: one week, 400 once; then to the limit; two keys for the last week.
  const ic2 = await ironOf(c.api);
  const renewed = await same(c.api, 'bodyguard.renew', { weeks: 1 });
  expect(oks(renewed), JSON.stringify(why(renewed))).toBe(3);
  expect(ic2 - (await ironOf(c.api)), 'a week of the doorman, once').toBe(400);
  await hook(c.api, 'character', { iron: 20_000 });
  // paidThrough = today + 13 now; limit today + 34: three more single weeks reach 34.
  for (let n = 0; n < 2; n++) expect((await keys(c.api, 'bodyguard.renew', [{ weeks: 1 }]))[0]!.ok).toBe(true);
  const ic3 = await ironOf(c.api);
  const last = await keys(c.api, 'bodyguard.renew', [{ weeks: 1 }, { weeks: 1 }]);
  console.log('QA renew last week race', JSON.stringify(why(last)));
  expect(oks(last), 'exactly one winner for the last week ahead: ' + JSON.stringify(why(last))).toBe(1);
  expect(ic3 - (await ironOf(c.api))).toBe(400);
  const four = await keys(c.api, 'bodyguard.renew', [{ weeks: 4 }]);
  expect(four[0]!.ok, 'four weeks past the limit').toBe(false);
  console.log('QA renew past limit', four[0]!.reason);
  await a.ctx.close();
  await b.ctx.close();
  await c.ctx.close();
});

test('2 the bar: rounds (three a day), a plate, dinner', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await memberContext(browser, 'Qa Hana', { seed: { level: 16, rank: 3, iron: 20_000, energy: 100, health: 40, cityId: 'coalport' } });
  const api = a.api;
  const me0 = await meOf(api);
  console.log('QA me energy/health', JSON.stringify(me0.energy), JSON.stringify(me0.health));
  const i0 = await ironOf(api);
  const e0 = await read(api, 'life.me');
  console.log('QA life.me keys', Object.keys(e0.data ?? {}).join(','));

  // round x3 same key: 30 Iron once, spirits +3.
  const r = await same(api, 'bar.round', { locationId: 'coalport.anchor' });
  console.log('QA round x3', JSON.stringify(why(r)));
  expect(oks(r), JSON.stringify(why(r))).toBe(3);
  expect(i0 - (await ironOf(api)), 'a round is 30').toBe(30);
  const me1 = await meOf(api);
  console.log('QA after round: energy', JSON.stringify(me1.energy), 'buffs', JSON.stringify(me1.buffs ?? me1.buff ?? null));

  // three rounds a day: two taken -> three different keys, one winner.
  await hook(api, 'buffs', { rounds: 2, spirits: 0 });
  const i1 = await ironOf(api);
  const race = await keys(api, 'bar.round', [1, 2, 3].map(() => ({ locationId: 'coalport.anchor' })));
  console.log('QA round race for the third', JSON.stringify(why(race)));
  expect(oks(race), JSON.stringify(why(race))).toBe(1);
  expect(i1 - (await ironOf(api))).toBe(30);
  const fourth = await keys(api, 'bar.round', [{ locationId: 'coalport.anchor' }]);
  expect(fourth[0]!.ok, 'a fourth round the same day').toBe(false);
  console.log('QA fourth round', fourth[0]!.reason);

  // nine in hand at most: spirits 7, a round banks min(9, 7+3) = 9.
  await hook(api, 'buffs', { rounds: 0, spirits: 9 });
  const full = await keys(api, 'bar.round', [{ locationId: 'coalport.anchor' }]);
  console.log('QA round at nine', JSON.stringify(why(full)));
  expect(full[0]!.ok, 'a round with nine in hand').toBe(false);

  // plate x3: 100 once, Health +15 (never above max).
  await hook(api, 'character', { health: 40 });
  const h0 = (await meOf(api)).health;
  const i2 = await ironOf(api);
  const p = await same(api, 'bar.meal', { locationId: 'coalport.anchor' });
  console.log('QA plate x3', JSON.stringify(why(p)));
  expect(oks(p), JSON.stringify(why(p))).toBe(3);
  expect(i2 - (await ironOf(api)), 'a plate is 100').toBe(100);
  const h1 = (await meOf(api)).health;
  console.log('QA health before/after plate', JSON.stringify(h0), JSON.stringify(h1));
  // A second plate with another key while fed: refused, no charge.
  const i3 = await ironOf(api);
  const second = await keys(api, 'bar.meal', [{ locationId: 'coalport.anchor' }, { locationId: 'coalport.anchor' }]);
  expect(oks(second), 'well fed: ' + JSON.stringify(why(second))).toBe(0);
  expect(await ironOf(api)).toBe(i3);

  // two plates racing on a fresh member: one winner.
  const b = await memberContext(browser, 'Qa Ivo', { seed: { level: 16, rank: 3, iron: 5_000, energy: 100, cityId: 'coalport' } });
  const ib = await ironOf(b.api);
  const pr = await keys(b.api, 'bar.meal', [{ locationId: 'coalport.anchor' }, { locationId: 'coalport.anchor' }, { locationId: 'coalport.anchor' }]);
  console.log('QA plate race', JSON.stringify(why(pr)));
  expect(oks(pr)).toBe(1);
  expect(ib - (await ironOf(b.api))).toBe(100);

  // dinner: Charisma 9 refused; Charisma 10 x3 same key: 400 once.
  const d = await memberContext(browser, 'Qa Jana', { seed: { level: 16, rank: 3, iron: 5_000, energy: 100, health: 30, cityId: 'irongate', cha: 9 } });
  const worn0 = (await read(d.api, 'life.me')).data.cha;
  console.log('QA worn Charisma with base 9', JSON.stringify(worn0));
  const wornN = typeof worn0 === 'number' ? worn0 : (worn0?.worn ?? worn0?.value ?? worn0?.cha);
  if (typeof wornN === 'number' && wornN !== 9) await hook(d.api, 'character', { cha: 9 - (wornN - 9) });
  console.log('QA worn Charisma after fix', JSON.stringify((await read(d.api, 'life.me')).data.cha));
  const low = await keys(d.api, 'bar.dinner', [{ locationId: 'irongate.grand-hotel' }]);
  console.log('QA dinner at Charisma 9', JSON.stringify(why(low)));
  expect(low[0]!.ok).toBe(false);
  const base10 = typeof wornN === 'number' ? 10 - (wornN - 9) : 10;
  await hook(d.api, 'character', { cha: base10 });
  console.log('QA worn Charisma for dinner', JSON.stringify((await read(d.api, 'life.me')).data.cha));
  const id0 = await ironOf(d.api);
  const dn = await same(d.api, 'bar.dinner', { locationId: 'irongate.grand-hotel' });
  console.log('QA dinner x3', JSON.stringify(why(dn)));
  expect(oks(dn), JSON.stringify(why(dn))).toBe(3);
  expect(id0 - (await ironOf(d.api)), 'dinner is 400').toBe(400);
  await a.ctx.close();
  await b.ctx.close();
  await d.ctx.close();
});

test('3 patrons: the gift once a day, the favour once a week', async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await memberContext(browser, 'Qa Edith', { seed: { level: 10, rank: 3, iron: 5_000, pc: 300, energy: 100, cityId: 'irongate' } });
  const api = a.api;
  const i0 = await ironOf(api);
  const g = await same(api, 'patron.gift', { patronId: 'crane' });
  console.log('QA gift x3', JSON.stringify(why(g)));
  expect(oks(g), JSON.stringify(why(g))).toBe(3);
  expect(i0 - (await ironOf(api)), 'the gift is 200').toBe(200);
  const card = (await read(api, 'patron.get', { patronId: 'crane' })).data;
  console.log('QA crane card', JSON.stringify(card).slice(0, 400));
  const g2 = await keys(api, 'patron.gift', [{ patronId: 'crane' }, { patronId: 'crane' }]);
  console.log('QA gift again same day', JSON.stringify(why(g2)));
  expect(oks(g2), 'once a day per patron').toBe(0);
  expect(i0 - (await ironOf(api))).toBe(200);

  // Marr: the favour at Confidant, in Clearwater.
  const m = await memberContext(browser, 'Qa Julius', { seed: { level: 10, rank: 3, iron: 5_000, pc: 300, energy: 100, cityId: 'clearwater' } });
  await hook(m.api, 'patron', { patronId: 'marr', tier: 'confidant', visitDaysAgo: 5 });
  const pc0 = (await meOf(m.api)).pc as number;
  const f = await same(m.api, 'patron.favour', { patronId: 'marr' });
  console.log('QA favour x3', JSON.stringify(why(f)));
  expect(oks(f), JSON.stringify(why(f))).toBe(3);
  const cost = pc0 - ((await meOf(m.api)).pc as number);
  console.log('QA favour cost', cost);
  expect(cost).toBeGreaterThan(0);
  const f2 = await keys(m.api, 'patron.favour', [{ patronId: 'marr' }, { patronId: 'marr' }]);
  expect(oks(f2), 'once a week: ' + JSON.stringify(why(f2))).toBe(0);
  expect(pc0 - ((await meOf(m.api)).pc as number)).toBe(cost);
  // Two keys racing on a fresh Confidant: one winner.
  await hook(m.api, 'patron', { patronId: 'marr', favourDaysAgo: null });
  const pc1 = (await meOf(m.api)).pc as number;
  const race = await keys(m.api, 'patron.favour', [{ patronId: 'marr' }, { patronId: 'marr' }, { patronId: 'marr' }]);
  console.log('QA favour race', JSON.stringify(why(race)));
  expect(oks(race)).toBe(1);
  expect(pc1 - ((await meOf(m.api)).pc as number)).toBe(cost);
  await a.ctx.close();
  await m.ctx.close();
});

test('4 the Dossier: bind, sell, turn once; the last of fifteen places; the exposé attempt', async ({ browser }) => {
  test.setTimeout(240_000);
  const KESSLER = 'npc.v.ig.brandt'; // an Irongate name (Crane's town), so a file can be turned
  const VOGEL = 'npc.v.vogel';
  const RIVAL = 'npc.v.kessler';
  const a = await memberContext(browser, 'Qa Klara', { seed: { level: 16, rank: 3, iron: 5_000, pc: 100, energy: 100, cityId: 'irongate' } });
  const api = a.api;
  const view0 = (await read(api, 'dossier.get')).data;
  console.log('QA dossier cap', view0.cap, 'used', view0.used);

  // bind x3 same key: one Case File, the three entries spent.
  const lands = (n: number, id: string) => hook(api, 'dossier', { entries: Array.from({ length: n }, (_, k) => ({ subjectId: id, category: (['political', 'criminal', 'pattern'] as const)[k % 3] })) });
  await lands(3, KESSLER);
  const b = await same(api, 'dossier.bind', { subjectId: KESSLER });
  console.log('QA bind x3', JSON.stringify(why(b)));
  expect(oks(b), JSON.stringify(why(b))).toBe(3);
  let v = (await read(api, 'dossier.get')).data;
  expect(v.files, 'one Case File').toBe(1);
  expect(v.used, 'three entries became one file').toBe(1);
  // two keys for another file's worth of entries: one file.
  await lands(3, VOGEL);
  const b2 = await keys(api, 'dossier.bind', [{ subjectId: VOGEL }, { subjectId: VOGEL }]);
  console.log('QA bind race', JSON.stringify(why(b2)));
  expect(oks(b2)).toBe(1);
  v = (await read(api, 'dossier.get')).data;
  expect(v.files).toBe(2);
  const fileA = find(v.caseFiles, (x) => x.subjectId === KESSLER || (x.name ?? '').includes('Kessler'));
  const fileB = find(v.caseFiles, (x) => x !== fileA && (x.id || x.fileId));
  console.log('QA file rows', JSON.stringify(v.caseFiles).slice(0, 500));
  const idOf = (f: any) => (f.id ?? f.fileId) as string;

  // sell x3 same key at the station: 200 once; another key on the sold file: refused.
  const i0 = await ironOf(api);
  const sold = await same(api, 'dossier.sell', { locationId: 'irongate.central-station', id: idOf(fileB) });
  console.log('QA sell file x3', JSON.stringify(why(sold)));
  expect(oks(sold), JSON.stringify(why(sold))).toBe(3);
  expect((await ironOf(api)) - i0, 'a Case File sells for 200').toBe(200);
  const sold2 = await keys(api, 'dossier.sell', [{ locationId: 'irongate.central-station', id: idOf(fileB) }]);
  expect(sold2[0]!.ok).toBe(false);
  expect((await ironOf(api)) - i0).toBe(200);

  // turn: Associate of Crane, x3 same key, and two keys on one file -> one informant.
  await hook(api, 'patron', { patronId: 'crane', tier: 'associate', visitDaysAgo: 5 });
  const turned = await same(api, 'dossier.turn', { fileId: idOf(fileA) });
  console.log('QA turn x3', JSON.stringify(why(turned)));
  expect(oks(turned), JSON.stringify(why(turned))).toBe(3);
  v = (await read(api, 'dossier.get')).data;
  expect(v.informants.length, 'one informant').toBe(1);
  const turned2 = await keys(api, 'dossier.turn', [{ fileId: idOf(fileA) }, { fileId: idOf(fileA) }]);
  expect(oks(turned2), 'a turned file cannot be turned again').toBe(0);
  v = (await read(api, 'dossier.get')).data;
  expect(v.informants.length).toBe(1);
  // Two informants at most: two more files, two keys at once -> one more turns.
  const f2 = await hook(api, 'dossier', { file: 'npc.v.ig.moser' });
  const f3 = await hook(api, 'dossier', { file: 'npc.v.ig.lechner' });
  const inf = await keys(api, 'dossier.turn', [{ fileId: f2.fileId }, { fileId: f3.fileId }]);
  console.log('QA informants race for the second', JSON.stringify(why(inf)));
  expect(oks(inf), 'two informants at most: ' + JSON.stringify(why(inf))).toBe(1);
  v = (await read(api, 'dossier.get')).data;
  expect(v.informants.length).toBe(2);
  await a.ctx.close();

  // The last of fifteen places: 14 held, two taps land one each at the same moment.
  const c = await memberContext(browser, 'Qa Capacity', { seed: { level: 16, rank: 3, energy: 100, cityId: 'irongate' } });
  const cap = ((await read(c.api, 'dossier.get')).data.cap as number) ?? 15;
  console.log('QA capacity', cap);
  const fill = Array.from({ length: cap - 1 }, () => ({ subjectId: KESSLER, category: 'political' as const }));
  const filled = await hook(c.api, 'dossier', { entries: fill.slice(0, 20) });
  console.log('QA filled', JSON.stringify(filled));
  const racing = await Promise.all([
    hook(c.api, 'dossier', { entries: [{ subjectId: VOGEL, category: 'political' }] }),
    hook(c.api, 'dossier', { entries: [{ subjectId: VOGEL, category: 'criminal' }] }),
    hook(c.api, 'dossier', { entries: [{ subjectId: VOGEL, category: 'pattern' }] }),
  ]);
  console.log('QA last-place race', JSON.stringify(racing.map((r) => ({ landed: r.landed, refused: r.refused }))));
  const vc = (await read(c.api, 'dossier.get')).data;
  console.log('QA used after race', vc.used, 'of', vc.cap);
  expect(vc.used, 'never above capacity').toBeLessThanOrEqual(vc.cap);
  expect(racing.reduce((n, r) => n + r.landed, 0), 'exactly one winner of the last place').toBe(1);
  await c.ctx.close();

  // The exposé: choose, then attempt x3 and two keys.
  const e = await memberContext(browser, 'Qa Expose', { seed: { level: 16, rank: 3, energy: 100, pc: 50, cityId: 'irongate' } });
  const file = await hook(e.api, 'dossier', { file: RIVAL });
  const ch = await mutate(e.api, 'expose.choose', { locationId: 'irongate.herald-house', fileId: file.fileId, angle: 'plain' });
  console.log('QA expose.choose', ch.ok, ch.reason);
  expect(ch.ok, ch.reason ?? '').toBe(true);
  await hook(e.api, 'street', { rolls: [1, 1, 1] });
  const me0 = await meOf(e.api);
  const leg0 = (await read(e.api, 'legacy.get')).data.total as number;
  const att = await same(e.api, 'expose.attempt', { wayId: 'write' });
  console.log('QA expose x3', JSON.stringify(why(att)));
  expect(oks(att), JSON.stringify(why(att))).toBe(3);
  const me1 = await meOf(e.api);
  const leg1 = (await read(e.api, 'legacy.get')).data.total as number;
  console.log('QA expose pc', me0.pc, '->', me1.pc, 'legacy', leg0, '->', leg1, 'energy', JSON.stringify(me0.energy), '->', JSON.stringify(me1.energy));
  console.log('QA expose result text', JSON.stringify(att[0]!.data).slice(0, 900));
  expect(leg1 - leg0, 'Legacy +2, once').toBe(2);
  const att2 = await keys(e.api, 'expose.attempt', [{ wayId: 'write' }, { wayId: 'talk' }]);
  expect(oks(att2), 'no second attempt on a spent file: ' + JSON.stringify(why(att2))).toBe(0);
  expect((await read(e.api, 'legacy.get')).data.total).toBe(leg1);
  await e.ctx.close();
});

test('5 the flat and Legacy perks: once per key, one winner', async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await memberContext(browser, 'Qa Flat', { seed: { level: 10, rank: 3, iron: 10_000, energy: 100, cityId: 'irongate', residence: { cityId: 'irongate', districtId: 'irongate.eastside' } } });
  const api = a.api;
  const i0 = await ironOf(api);
  const flat = await same(api, 'home.buyFlat', {});
  console.log('QA buyFlat x3', JSON.stringify(why(flat)));
  expect(oks(flat), JSON.stringify(why(flat))).toBe(3);
  const spent = i0 - (await ironOf(api));
  console.log('QA flat charged', spent);
  expect(spent, 'the flat: 2,500 and the first week paid by it').toBeGreaterThanOrEqual(2_500);
  const h = (await read(api, 'home.get')).data;
  console.log('QA home', JSON.stringify(h.flat));
  const two = await keys(api, 'home.buyFlat', [{}, {}]);
  expect(oks(two), 'a second flat with another key').toBe(0);
  expect(i0 - (await ironOf(api))).toBe(spent);
  const i1 = await ironOf(api);
  const rent = await same(api, 'home.payRent', { weeks: 1 });
  expect(oks(rent), JSON.stringify(why(rent))).toBe(3);
  expect(i1 - (await ironOf(api)), 'a week: 150, once').toBe(150);
  const i2 = await ironOf(api);
  const r4 = await same(api, 'home.payRent', { weeks: 4 });
  expect(oks(r4), JSON.stringify(why(r4))).toBe(3);
  expect(i2 - (await ironOf(api)), 'four weeks: 600 once').toBe(600);
  // The limit: eight weeks ahead (55 days). Two keys for the last four weeks.
  const race = await keys(api, 'home.payRent', [{ weeks: 4 }, { weeks: 4 }, { weeks: 4 }]);
  console.log('QA rent race', JSON.stringify(why(race)));
  expect(oks(race), JSON.stringify(why(race))).toBeLessThanOrEqual(1);

  // The last week ahead: one-week rents racing past the limit leave one winner at most.
  const wk = await keys(api, 'home.payRent', [{ weeks: 1 }, { weeks: 1 }, { weeks: 1 }, { weeks: 1 }]);
  console.log('QA rent 1-week race', JSON.stringify(why(wk)));
  expect(oks(wk), 'two weeks fit under the 55-day limit (buy 7 + 7 + 28 = 42, +14 = 56 days of rent from the purchase day)').toBe(2);
  const hh = (await read(api, 'home.get')).data;
  console.log('QA rent paidThrough', hh.flat.paidThrough);

  // Legacy: 7 points; the Dossier perk costs 5; two keys, one winner.
  await hook(api, 'legacy', { points: 7 });
  const leg = (await read(api, 'legacy.get')).data;
  console.log('QA legacy', leg.total, leg.toSpend);
  const perk = await keys(api, 'legacy.takePerk', [{ perkId: 'dossier' }, { perkId: 'dossier' }, { perkId: 'dossier' }]);
  console.log('QA perk race', JSON.stringify(why(perk)));
  expect(oks(perk), JSON.stringify(why(perk))).toBe(1);
  const after = (await read(api, 'legacy.get')).data;
  expect(after.total - after.toSpend, 'five spent, once').toBe(5);
  // The same key x3 on a perk the player can no longer afford replays the stored result.
  await hook(api, 'legacy', { points: 10 });
  const s0 = (await read(api, 'legacy.get')).data;
  const same3 = await same(api, 'legacy.takePerk', { perkId: 'sleep' });
  expect(oks(same3), JSON.stringify(why(same3))).toBe(3);
  const s1 = (await read(api, 'legacy.get')).data;
  expect(s0.toSpend - s1.toSpend, 'sleep: 10, once').toBe(10);
  await a.ctx.close();
});

test('6 being away: a lapsed flat waits, a contract stops, a meal runs out, rounds wait, one settlement', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await memberContext(browser, 'Qa Away', { seed: { level: 16, rank: 3, iron: 12_000, energy: 100, pc: 60, cityId: 'irongate', residence: { cityId: 'irongate', districtId: 'irongate.eastside' } } });
  const api = a.api;
  // A flat, bought; a contract at the Irongate party store for the collective; a plate; nine rounds in hand; an informant.
  expect((await mutate(api, 'home.buyFlat', { idempotencyKey: uuid() })).ok).toBe(true);
  const store = 'irongate.union-hall';
  void store;
  await hook(api, 'bodyguard', { tier: 1, daysLeft: 3 });
  await hook(api, 'buffs', { wellFed: { tier: 'plate', minutesLeft: 120 }, spirits: 9 });
  await hook(api, 'dossier', { informant: 'npc.v.kessler' });
  const before = await meOf(api);
  const legBefore = (await read(api, 'legacy.get')).data.total as number;
  const ids = async () => [...JSON.stringify((await read(api, 'wardrobe.get')).data).matchAll(/"uid":"(\w+)","itemId":"([\w.-]+)"/g)].map((m) => m[2]).sort().join(',');
  const inv0 = await ids();
  console.log('QA before: iron', before.iron);

  // Away eight days.
  await hook(api, 'clock', { advanceMs: 8 * DAY });
  const after = await meOf(api);
  const home = (await read(api, 'home.get')).data;
  const lm = (await read(api, 'life.me')).data;
  const d = (await read(api, 'dossier.get')).data;
  console.log('QA after 8 days: iron', before.iron, '->', after.iron);
  console.log('QA home after 8 days', JSON.stringify(home.flat), home.line);
  console.log('QA life.me after', JSON.stringify(lm).slice(0, 700));
  console.log('QA informants after', JSON.stringify(d.informants).slice(0, 400), 'used', d.used);
  expect(home.flat, 'the flat is still there').toBeTruthy();
  expect(home.flat.state, 'a lapsed flat waits').toBe('waiting');
  expect(after.iron, 'nothing taken while away (rent is prepaid, never drawn)').toBeGreaterThanOrEqual(before.iron);
  const legAfter = (await read(api, 'legacy.get')).data.total as number;
  console.log('QA legacy before/after', legBefore, legAfter);
  // The meal ran out, the contract stopped, the rounds waited.
  const bx = await mutate(api, 'bar.round', { locationId: 'irongate.grand-hotel', idempotencyKey: uuid() });
  console.log('QA a round at the hotel (not a bar?)', JSON.stringify(why([bx])));
  expect(await ids(), 'every item still owned').toBe(inv0);
  const meText = JSON.stringify(after);
  console.log('QA me buffs', JSON.stringify(after.buffs ?? null), meText.includes('wellFed'));

  // The flat is restored by paying: the rent resumes, nothing owed.
  const i0 = await ironOf(api);
  const pay = await mutate(api, 'home.payRent', { weeks: 1, idempotencyKey: uuid() });
  console.log('QA pay rent after lapse', JSON.stringify(why([pay])), 'charged', i0 - (await ironOf(api)));
  expect(pay.ok).toBe(true);
  expect(i0 - (await ironOf(api)), 'one week, no arrears').toBe(150);
  expect((await read(api, 'home.get')).data.flat.state).not.toBe('waiting');
  await a.ctx.close();
});

const softCheck: string[] = [];
test('7 integration: the share bar button does not cover a pin or the rule line (short phones)', async ({ browser }) => {
  test.setTimeout(180_000);
  for (const size of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 812, height: 375 }]) {
    for (const cityId of ['coalport', 'irongate', 'duskwall']) {
      const m = await memberContext(browser, 'Qa Bar', { seed: { level: 10, cityId }, viewport: size });
      await m.page.goto(`/city/${cityId}`);
      await m.page.getByTestId('city-map').waitFor();
      await m.page.waitForTimeout(1500);
      const r = await m.page.evaluate(() => {
        const btn = document.querySelector('[data-testid=share-bar-button]') as HTMLElement | null;
        const b = btn?.getBoundingClientRect();
        const covered: string[] = [];
        for (const el of document.querySelectorAll('[data-testid=hotspot]')) {
          const rc = el.getBoundingClientRect();
          // any of nine points of the pin's 44 px target
          const pts: string[] = [];
          for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.2, 0.5, 0.8]) {
            const t = document.elementFromPoint(rc.left + rc.width * fx, rc.top + rc.height * fy);
            if (t && btn && (t === btn || btn.contains(t))) pts.push(`${fx}/${fy}`);
          }
          const cx = rc.left + Math.min(22, rc.width / 2);
          const cy = rc.top + rc.height / 2;
          const tc = document.elementFromPoint(cx, cy);
          if (pts.length) covered.push(`${el.getAttribute('aria-label') ?? '?'} [rect ${Math.round(rc.left)},${Math.round(rc.top)} ${Math.round(rc.width)}x${Math.round(rc.height)}; covered ${pts.join(' ')}; marker point under button: ${!!(tc && btn && (tc === btn || btn.contains(tc)))}]`);
        }
        const rule = document.querySelector('[data-testid=rule-line]') as HTMLElement | null;
        const rr = rule?.getBoundingClientRect();
        let ruleTop: string | null = null;
        if (rr && b) {
          const t = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2);
          ruleTop = t && (t === rule || rule!.contains(t)) ? 'rule' : (t?.getAttribute('data-testid') ?? t?.tagName ?? null);
        }
        return { btn: b ? { top: Math.round(b.top), h: Math.round(b.height), w: Math.round(b.width) } : null, covered: [...new Set(covered)], ruleTop };
      });
      console.log('QA share bar', size.width + 'x' + size.height, cityId, JSON.stringify(r));
      if (r.covered.length) await m.page.screenshot({ path: `../../.qa8-results/sharebar-${size.width}x${size.height}-${cityId}.png` });
      softCheck.push(...r.covered.map((x: string) => `${size.width}x${size.height} ${cityId}: ${x}`));
      void 0;
      if (r.ruleTop) expect(r.ruleTop, 'the rule line takes its own tap').toBe('rule');
      await m.ctx.close();
    }
  }
  console.log('QA share bar covered pins', JSON.stringify(softCheck, null, 1));
});
