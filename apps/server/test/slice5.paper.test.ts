/**
 * Slice 5, T18 (tech design §8.4 the settlement v5, §11 the paper v5, §15 "Server — settlement and
 * paper" and "the read path"): each risk headline from its facts, the desk's live rows, the orders'
 * `{city}` and *Your orders are in Coalport today*, the faded marks pruned at the settlement, and a
 * night in the cells that returns a clean edition.
 */
import { Character, City, PaperEntry, Stay } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import { DECK_MAX, fillTemplate, fitDeck, ordersForDay } from '@irongate/rules';
import type { ActionResult, PaperView, RunInPending } from '@irongate/rules';
import { copy } from '@irongate/content/copy';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { capitalFacts } from '../src/services/capitalPaper';
import { releaseHeldNow, sendToHeld } from '../src/services/heldService';
import { politicalHeadlines } from '../src/services/politicsService';
import { streetHooks } from '../src/services/streetHooks';
import { setupDb, teardownDb, testClock } from './helpers';
import { traveller } from './slice4.helpers';
import { at, content, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const LAUNCH = { locationId: 'coalport.shipyard', missionId: 'coalport.shipyard.launch' };
const POSTERS = { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters' };
const CANVASS = { actionId: 'duskwall.quartermaster-market.canvass', locationId: 'duskwall.quartermaster-market' };
const POSTERS_NAME = "Tear down the Vanguard's posters on the fish quay";

beforeAll(async () => {
  await setupDb('slice5-paper-test');
  streetHooks.enabled = true;
});
afterAll(async () => {
  streetHooks.enabled = false;
  await teardownDb();
});

const oid = (id: string) => new Types.ObjectId(id);
const asResult = (r: unknown) => r as ActionResult;
type Clock = ReturnType<typeof testClock>;

/**
 * A member whose day DAY + 1 is settled (the morning the Level-6 *Harbour Opens* is printed), so the
 * edition of DAY + 2 carries only what happened on DAY + 1.
 */
async function settledMember(name: string, opts: Parameters<typeof member>[1] = {}) {
  const clock = testClock(at(DAY));
  const p = await member(clock, { name, ...opts });
  clock.set(at(DAY + 1));
  await p.caller.paper.today();
  return { clock, p };
}

/** The stored edition's template ids of a day. */
async function idsOn(id: string, day: number): Promise<string[]> {
  const e = await PaperEntry.findOne({ characterId: id, day }).lean();
  return (e?.headlines ?? []).map((h) => h.templateId);
}

const find = (paper: PaperView, text: string) => paper.headlines.find((h) => h.headline.includes(text));
const noPlaceholder = (paper: PaperView) =>
  paper.headlines.every((h) => !/\{[a-zA-Z]/.test(h.headline) && !/\{[a-zA-Z]/.test(h.deck ?? ''));

async function nextMorning(clock: Clock, p: { caller: { paper: { today: () => Promise<PaperView> } } }, day = DAY + 2) {
  clock.set(at(day));
  return p.caller.paper.today();
}

describe('the risk headlines, each from its facts (tech design §11.2)', () => {
  it('quarter-open: the morning after Level 6 (the Clarion); the Herald has none', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ada Harbour' });
    clock.set(at(DAY + 1));
    const paper = await p.caller.paper.today();
    expect(await idsOn(p.id, DAY + 1)).toContain('hl.quarter-open');
    expect(find(paper, 'The Harbour Opens to Ada Harbour')).toBeDefined();

    const district = content.districtsOf('irongate')[0]!.id;
    const q = await traveller(clock, {
      name: 'Bo Capital',
      level: 10,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: district },
    });
    clock.set(at(DAY + 2));
    await q.caller.paper.today();
    const ids = await idsOn(q.id, DAY + 2);
    expect((await PaperEntry.findOne({ characterId: q.id, day: DAY + 2 }).lean())!.cityId).toBe('irongate');
    expect(ids.some((x) => x.endsWith('quarter-open'))).toBe(false);
  });

  it('mission-first: the first mission yesterday, named', async () => {
    const { clock, p } = await settledMember('Cy First');
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    await p.caller.mission.start({ ...LAUNCH, wayId: 'cha-int', idempotencyKey: key() });
    const paper = await nextMorning(clock, p);
    expect(await idsOn(p.id, DAY + 2)).toContain('hl.mission-first');
    const h = find(paper, 'Takes On the Harder Work')!;
    expect(h.deck).toContain('A first mission yesterday: Speak at the launch.');
    expect(h.inPrint).toBeUndefined();

    // The second mission ever is not a first: nothing the morning after.
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    await p.caller.mission.start({ ...LAUNCH, wayId: 'cha-int', idempotencyKey: key() });
    await nextMorning(clock, p, DAY + 3);
    expect(await idsOn(p.id, DAY + 3)).not.toContain('hl.mission-first');
  });

  it('seen: Hot or Wanted at the settlement (In Print); Noticed is not', async () => {
    const { clock, p } = await settledMember('Di Hot');
    await setRisk(p.id, at(DAY + 2, 8), { heat: 70 }); // 65 at 09:00: Hot
    const paper = await nextMorning(clock, p);
    const h = find(paper, "Seen Where They Shouldn't Be")!;
    expect(h).toMatchObject({ inPrint: true });
    expect(h.headline).toBe("Di Hot Seen Where They Shouldn't Be");

    const q = await settledMember('Ed Noticed');
    await setRisk(q.p.id, at(DAY + 2, 8), { heat: 54 }); // 49 at 09:00: Noticed
    await nextMorning(q.clock, q.p);
    expect(await idsOn(q.p.id, DAY + 2)).not.toContain('hl.seen');
  });

  it('name-taken and record-up: a mark yesterday names its mission; the record rose to On File', async () => {
    const { clock, p } = await settledMember('Flo Marked', { rank: 3 });
    await City.updateOne({ _id: 'coalport' }, { $set: { opinion: { vanguard: 20, collective: 60, alliance: 10, neutral: 10 } } });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const s = asResult(await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() }));
    streetHooks.set(p.id, { runIn: 'never', checkRoll: s.attempts[0]!.check.chance + 1, caught: 'always' });
    const r = asResult(await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() }));
    expect(r.street!.record).toMatchObject({ after: 'onFile', marks: 1 });

    const paper = await nextMorning(clock, p);
    const ids = await idsOn(p.id, DAY + 2);
    expect(ids).toEqual(expect.arrayContaining(['hl.name-taken', 'hl.record-up']));
    expect(find(paper, "Police Take Flo Marked's Name")!.deck).toBe(
      `A mark on the record after ${POSTERS_NAME}. One mark fades in a fortnight if there's no second; the branch can have it struck off for 30 Political Capital.`,
    );
    const up = find(paper, 'with the Harbour Police')!;
    expect(up.headline).toBe('Flo Marked Is On File with the Harbour Police');
    expect(up.deck).toMatch(/^One mark\. Iron from missions is down by 10 % until they fade\./);
    expect(noPlaceholder(paper)).toBe(true);
  });

  it('the record rose only when its level did: a second mark at On file prints name-taken alone', async () => {
    const { clock, p } = await settledMember('Gil Second', { rank: 3 });
    await setRisk(p.id, clock.now(), { marks: [{ day: DAY - 2, kind: 'minor' }] });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const s = asResult(await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() }));
    streetHooks.set(p.id, { runIn: 'never', checkRoll: s.attempts[0]!.check.chance + 1, caught: 'always' });
    await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() });
    expect((await Character.findById(p.id).lean())!.record!.marks).toHaveLength(2);
    await nextMorning(clock, p);
    const ids = await idsOn(p.id, DAY + 2);
    expect(ids).toContain('hl.name-taken');
    expect(ids).not.toContain('hl.record-up');
  });

  it('infirmary: admitted yesterday, after a run-in with its opponent (In Print)', async () => {
    const { clock, p } = await settledMember('Hal Ward', { rank: 3 });
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'street-enforcer', checkRoll: 1, choiceRoll: 100 });
    const pending = (await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() })) as RunInPending;
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() });
    expect(r.stamp).toBe('carriedOff');
    const paper = await nextMorning(clock, p);
    expect(await idsOn(p.id, DAY + 2)).toContain('hl.infirmary');
    expect(find(paper, 'Carried into the Infirmary')).toMatchObject({
      headline: 'Hal Ward Carried into the Infirmary',
      deck: "After a run-in with a Vanguard street enforcer. Twenty minutes on the ward, the matron's opinion of politics, and out. The branch sent grapes.",
      inPrint: true,
    });
  });

  it('rival-trip: on rival ground yesterday; the visitor reads the home paper', async () => {
    const { clock, p } = await settledMember('Ivo Away', { level: 10, cityId: 'duskwall' });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    await p.caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 1 });
    expect((await Character.findById(p.id).lean())!.today.rivalCityId).toBe('duskwall');
    const paper = await nextMorning(clock, p);
    // Tech design §11.1: a visitor on rival ground reads the residence city's paper.
    expect(paper.paper.name).toBe(content.city('coalport')!.paper!.name);
    expect((await PaperEntry.findOne({ characterId: p.id, day: DAY + 2 }).lean())!.cityId).toBe('coalport');
    expect(find(paper, 'Ivo Away Spent Yesterday in Duskwall')).toBeDefined();
    // The new day's tally starts clean, slice 5's fields with it.
    expect((await Character.findById(p.id).lean())!.today).toMatchObject({ day: DAY + 2, missions: 0, rivalCityId: null });
  });

  it('deported: put on the train home yesterday (In Print); a stay with no act behind it prints the cells with the fallback', async () => {
    const { clock, p } = await settledMember('Jo Escort', { level: 10, cityId: 'duskwall' });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    await releaseHeldNow(oid(p.id), clock.now() + 60_000);
    clock.set(clock.now() + 60_000);
    await p.caller.character.me();
    const paper = await nextMorning(clock, p);
    const ids = await idsOn(p.id, DAY + 2);
    expect(ids).toContain('hl.deported');
    // Design §14 (4 Oct 2026): a dev stay has no act behind it, so the fallback fills.
    expect(ids).toContain('hl.cells');
    expect(find(paper, 'Minutes in the Cells')!.deck).toMatch(
      /^Taken in after a word with the police; no reason was given\. /,
    );
    expect(find(paper, 'Put on the Train Home from Duskwall')).toMatchObject({ inPrint: true });
    expect(find(paper, 'Put on the Train Home from Duskwall')!.deck).toContain('Duskwall is barred for a day');
    expect(noPlaceholder(paper)).toBe(true);
  });

  it('rival-pressure (live): the home city lost a point or more to rivals yesterday, from day or prev', async () => {
    const { clock, p } = await settledMember('Kit Home');
    clock.set(at(DAY + 2));
    await p.caller.paper.today();
    // The live residence lines as the paper reads them (other city lines may outrank it in the merge).
    const lines = async () => {
      const doc = (await Character.findById(p.id).lean<CharacterDoc>())!;
      const city = await City.findById('coalport').lean<CityDoc>();
      const res = await capitalFacts(content, doc, 'coalport', DAY + 2, { personal: true, district: true });
      return politicalHeadlines(content, doc, city, DAY + 2, { capital: res.facts, vars: res.vars, varsByKind: res.varsByKind });
    };
    await City.updateOne({ _id: 'coalport' }, { $set: { rivalPressure: { day: DAY + 1, lost: 1_300, prev: null } } });
    expect((await lines()).find((h) => h.templateId === 'hl.rival-pressure')).toMatchObject({
      group: 'city',
      headline: "Rival Callers on Coalport's Streets",
      deck: 'Morale down 1.3 yesterday to visitors from the other parties. The streets answer the door to whoever knocks; knock first.',
    });

    // A rival has pressed today already: yesterday's loss is `prev`.
    await City.updateOne(
      { _id: 'coalport' },
      { $set: { rivalPressure: { day: DAY + 2, lost: 200, prev: { day: DAY + 1, lost: 1_300 } } } },
    );
    expect((await lines()).some((h) => h.templateId === 'hl.rival-pressure')).toBe(true);

    // Under a point, or another day's: nothing.
    await City.updateOne({ _id: 'coalport' }, { $set: { rivalPressure: { day: DAY + 1, lost: 900, prev: null } } });
    expect((await lines()).some((h) => h.templateId === 'hl.rival-pressure')).toBe(false);
    await City.updateOne({ _id: 'coalport' }, { $set: { rivalPressure: { day: DAY, lost: 1_900, prev: null } } });
    expect((await lines()).some((h) => h.templateId === 'hl.rival-pressure')).toBe(false);
    await City.updateOne({ _id: 'coalport' }, { $set: { rivalPressure: null } });
  });
});

describe('a night in the cells (tech design §15, the read path)', () => {
  it('an absence across a night in the cells returns a clean edition: cells, not seen; nothing owned lost; Heat 25 then cooling', async () => {
    const { clock, p } = await settledMember('Lu Night', { rank: 3, iron: 500 });
    clock.set(at(DAY + 1, 22));
    await setRisk(p.id, clock.now(), { heat: 60 });
    const before = (await Character.findById(p.id).lean())!;
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    const r = asResult(await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() }));
    expect(r.stamp).toBe('takenIn');

    // Away all night; back at nine.
    const paper = await nextMorning(clock, p);
    const stay = (await Stay.findOne({ characterId: p.id }).lean())!;
    expect(stay).toMatchObject({ kind: 'cells', how: 'served', heatAfter: 25 });
    const ids = await idsOn(p.id, DAY + 2);
    expect(ids).toContain('hl.cells');
    expect(ids).not.toContain('hl.seen');
    const cells = find(paper, 'Minutes in the Cells')!;
    expect(cells).toMatchObject({ headline: `Lu Night Spent ${stay.minutes} Minutes in the Cells`, inPrint: true });
    expect(cells.deck!.startsWith(`Taken in after ${POSTERS_NAME}; the police took the name while Hot.`)).toBe(true);
    expect(cells.deck!.length).toBeLessThanOrEqual(DECK_MAX);
    expect(noPlaceholder(paper)).toBe(true);

    const me = await p.caller.character.me();
    expect(me.held).toMatchObject({ state: 'out' });
    expect(me.heat!.value).toBeLessThan(25); // 25 at the release, cooling since
    const after = (await Character.findById(p.id).lean())!;
    expect(after.iron).toBe(before.iron);
    expect(after.inventory).toEqual(before.inventory);
    expect(after.level).toBe(before.level);
    expect(paper.desk.held).toBeNull();
  });

  it('still in the cells at the settlement: the cells by its sentence, and the Heat the release sets (not seen)', async () => {
    const { clock, p } = await settledMember('Mo Late', { rank: 3 });
    clock.set(at(DAY + 1, 23) + 50 * 60_000);
    await setRisk(p.id, clock.now(), { heat: 80 });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() });
    const stay = (await Stay.findOne({ characterId: p.id }).lean())!;
    clock.set(at(DAY + 2, 0) + 10 * 60_000); // 00:10, the door opens later
    expect(stay.until.getTime()).toBeGreaterThan(clock.now());
    const paper = await p.caller.paper.today();
    const ids = await idsOn(p.id, DAY + 2);
    expect(ids).toContain('hl.cells');
    expect(ids).not.toContain('hl.seen');
    expect(find(paper, 'Minutes in the Cells')!.headline).toBe(`Mo Late Spent ${stay.minutes} Minutes in the Cells`);
    expect(paper.desk.held).toMatchObject({ kind: 'cells', placeName: 'Harbour Police' });
  });

  it('bailed out: the minutes are the ones spent', async () => {
    const { clock, p } = await settledMember('Ned Bail', { rank: 3, iron: 1_000 });
    await setRisk(p.id, clock.now(), { heat: 60 });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() });
    clock.advance(7 * 60_000);
    await p.caller.held.bail({ idempotencyKey: key() });
    const paper = await nextMorning(clock, p);
    expect(find(paper, 'Minutes in the Cells')!.headline).toBe('Ned Bail Spent 7 Minutes in the Cells');
  });
});

describe('the desk (tech design §11.3, screens §2.5)', () => {
  it('a clean member: no held line, no Where you are, no Heat, no record', async () => {
    const { p } = await settledMember('Ola Clean');
    const { desk } = await p.caller.paper.today();
    expect(desk).toMatchObject({ held: null, where: null, heat: null, record: null });
  });

  it('in the cells: the held line first (minutes and bail); Heat with Cool by; the record', async () => {
    const { clock, p } = await settledMember('Pia Desk');
    await setRisk(p.id, clock.now(), { heat: 60, marks: [{ day: DAY, kind: 'minor' }, { day: DAY, kind: 'minor' }] });
    await sendToHeld(content, oid(p.id), 'cells', clock.now());
    clock.advance(5 * 60_000);
    const { desk } = await p.caller.paper.today();
    const held = (await Character.findById(p.id).lean())!.held!;
    const left = Math.ceil((held.until.getTime() - clock.now()) / 60_000);
    // Review 4 (answers §4.2): `until` for *out in 24 min*, read in the player's clock.
    expect(desk.held).toEqual({
      kind: 'cells',
      placeName: 'Harbour Police',
      minutesLeft: left,
      until: held.until.getTime(),
      bail: held.bail!.total,
    });
    expect(desk.heat).toMatchObject({ state: 'hot' });
    expect(desk.heat!.value).toBeGreaterThan(50);
    expect(desk.heat!.coolsAt).toBeGreaterThan(clock.now());
    // Review 4 #20 (ADR 0078): the arrest adds its own mark: three, a Repeat offender.
    expect(desk.record).toEqual({ level: 'repeat', marks: 3 });
    expect(desk.where).toBeNull();
  });

  it('on the ward: the held line has no bail; Heat under 25 has no Cool by', async () => {
    const { clock, p } = await settledMember('Quin Ward');
    await setRisk(p.id, clock.now(), { heat: 12 });
    await sendToHeld(content, oid(p.id), 'infirmary', clock.now());
    const { desk } = await p.caller.paper.today();
    expect(desk.held).toMatchObject({ kind: 'infirmary', bail: null });
    expect(desk.heat).toEqual({ value: 12, state: 'cool', coolsAt: null });
  });

  it('on rival ground: Where you are; the orders say they are in Coalport today', async () => {
    const { p } = await settledMember('Ros Visit', { level: 10, cityId: 'duskwall' });
    const paper = await p.caller.paper.today();
    expect(paper.desk.where).toEqual({ rivalGround: { cityName: 'Duskwall' } });
    // Review 4 #13: `away` replaces `elsewhere`, with the day's count.
    expect(paper.orders.away).toEqual({ cityName: 'Coalport', done: expect.any(Number), of: 3 });

    const home = await settledMember('Sal Home');
    expect((await home.p.caller.paper.today()).orders.away).toBeNull();
  });
});

describe('the orders (design §12.2, §23.6 #5 and #8)', () => {
  it('the slot-B mission order from Level 6, its {city} resolved; not below Level 6', async () => {
    const templates = content.ordersOf('collective');
    let day = DAY;
    while (!ordersForDay(templates, day, 'home', 6).some((t) => t.id === 'dir.mission')) day++;
    const clock = testClock(at(day - 1));
    const p = await member(clock, { name: 'Tam Order' });
    const q = await member(clock, { name: 'Uli Young', level: 5 });
    clock.set(at(day));
    const paper = await p.caller.paper.today();
    const order = paper.orders.items.find((x) => x.id === 'dir.mission')!;
    expect(order.title).toBe('Take on a mission anywhere in Coalport');
    expect(paper.orders.items.every((x) => !x.title.includes('{') && !x.line.includes('{'))).toBe(true);
    const young = await q.caller.paper.today();
    expect(young.orders.items.some((x) => x.id === 'dir.mission')).toBe(false);
  });
});

describe('the settlement (tech design §8.4)', () => {
  it('prunes the marks that have faded; keeps the ones that have not', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Vic Faded' });
    await setRisk(p.id, clock.now(), {
      marks: [
        { day: DAY - 20, kind: 'minor' },
        { day: DAY - 20, kind: 'moderate' },
        { day: DAY - 15, kind: 'minor' },
      ],
    });
    const q = await member(clock, { name: 'Wyn Fresh' });
    await setRisk(q.id, clock.now(), { marks: [{ day: DAY - 5, kind: 'minor' }] });
    clock.set(at(DAY + 1));
    await p.caller.character.me();
    await q.caller.character.me();
    // Day DAY + 1 ≥ the latest mark (DAY − 15) + 14: the minor marks are gone, the moderate stays.
    expect((await Character.findById(p.id).lean())!.record!.marks).toEqual([
      { day: DAY - 20, kind: 'moderate', logId: null },
    ]);
    expect((await Character.findById(q.id).lean())!.record!.marks).toHaveLength(1);
  });

  it('every risk deck stays within 200 once filled with the longest mission title and how', () => {
    const titles = content.cities.flatMap((c) => c.locations.flatMap((l) => (l.missions ?? []).map((m) => m.name)));
    const longest = titles.reduce((a, b) => (b.length > a.length ? b : a), '');
    const how = Object.values(copy.risk.paper.how).reduce((a, b) => (b.length > a.length ? b : a), '');
    const vars = {
      name: 'Bartholomew Kowalczyk-Lindqvist',
      missionTitle: longest,
      how,
      minutes: '120',
      opponent: 'the doorman at Beacon House',
      recordLevel: 'a Repeat Offender',
      marks: '12',
      pct: '30',
      rivalCity: 'Coalport',
      lost: '2.0',
    };
    for (const t of content.headlines.filter((h) => /^hl\.(?:[av]\.|ig\.)?(cells|name-taken|mission-first)$/.test(h.id))) {
      const filled = fitDeck(fillTemplate(t.deck!, vars));
      expect(filled.length, t.id).toBeLessThanOrEqual(DECK_MAX);
      expect(filled.startsWith(fillTemplate(t.deck!, vars).split('. ')[0]!), t.id).toBe(true);
    }
  });
});

describe('fitDeck (rules)', () => {
  it('leaves a deck within the cap alone; drops whole sentences from the end; cuts one long sentence at a word', () => {
    expect(fitDeck('Short. Deck.')).toBe('Short. Deck.');
    expect(fitDeck('One two three. Four five six. Seven eight.', 30)).toBe('One two three. Four five six.');
    expect(fitDeck('One two three. Four five six.', 16)).toBe('One two three.');
    const cut = fitDeck('alpha beta gamma delta epsilon', 20);
    expect(cut).toBe('alpha beta gamma…');
    expect(cut.length).toBeLessThanOrEqual(20);
  });
});
