import { describe, expect, it } from 'vitest';
import { buildNewCharacter, dayKey, equippedItems, grantItem, resolveOrigin, wornCha } from '../src';
import type { FactionId, ItemSpec, OriginEffect, OriginFaction, OriginSpec } from '../src';

/**
 * The origin of docs/design/slice-2-onboarding.md §2 as a rules spec (the content test checks the
 * real data against the same numbers).
 */
const stat = (s: 'str' | 'int' | 'agi', value: number): OriginEffect => ({ kind: 'stat', stat: s, value });
const cha = (value: number): OriginEffect => ({ kind: 'chaBase', value });
const q = (id: string, a: OriginEffect[], b: OriginEffect[], c: OriginEffect[]) => ({
  id,
  answers: [
    { id: 'a', effects: a },
    { id: 'b', effects: b },
    { id: 'c', effects: c },
  ],
});
const ORIGIN: OriginSpec = {
  questions: [
    q('origin.summer', [stat('agi', 3)], [stat('str', 3)], [stat('int', 3)]),
    q('origin.trouble', [stat('str', 2)], [cha(2)], [stat('int', 2)]),
    q('origin.talent', [stat('agi', 3)], [stat('str', 3), stat('int', 1)], [cha(1), stat('int', 3)]),
    q(
      'origin.coat',
      [{ kind: 'wear', itemId: 'outfit.fathers-coat' }],
      [{ kind: 'iron', value: 150 }],
      [{ kind: 'wear', itemId: 'outfit.fathers-coat-promised' }, cha(1)],
    ),
    q(
      'origin.promise',
      [{ kind: 'ambition', ambitionId: 'clear-his-name' }],
      [{ kind: 'ambition', ambitionId: 'settle-his-debts' }],
      [{ kind: 'ambition', ambitionId: 'finish-his-work' }],
    ),
    q(
      'origin.wish',
      [{ kind: 'wish', factionId: 'vanguard', fxp: 50 }],
      [{ kind: 'wish', factionId: 'collective', fxp: 50 }],
      [{ kind: 'wish', factionId: 'alliance', fxp: 50 }],
    ),
  ],
};

const FACTIONS: Record<FactionId, OriginFaction> = {
  vanguard: {
    id: 'vanguard',
    startingBonus: { str: 3 },
    kit: { outfit: 'outfit.work-jacket', card: 'doc.party-card' },
  },
  collective: {
    id: 'collective',
    startingBonus: { str: 2, int: 1 },
    kit: { outfit: 'outfit.mill-coat', card: 'doc.party-card' },
  },
  alliance: {
    id: 'alliance',
    startingBonus: { int: 3 },
    kit: { outfit: 'outfit.worn-overcoat', card: 'doc.party-card' },
  },
};

const ITEMS: Record<string, ItemSpec> = {
  'outfit.work-jacket': { id: 'outfit.work-jacket', slot: 'clothing', cha: 2, keepsake: false },
  'outfit.mill-coat': { id: 'outfit.mill-coat', slot: 'clothing', cha: 2, keepsake: false },
  'outfit.worn-overcoat': { id: 'outfit.worn-overcoat', slot: 'clothing', cha: 2, keepsake: false },
  'outfit.fathers-coat': { id: 'outfit.fathers-coat', slot: 'clothing', cha: 5, keepsake: false },
  'outfit.fathers-coat-promised': {
    id: 'outfit.fathers-coat-promised',
    slot: 'clothing',
    cha: 5,
    keepsake: true,
  },
  'doc.party-card': { id: 'doc.party-card', slot: 'document', cha: 0, keepsake: true },
  'keep.ward-book': { id: 'keep.ward-book', slot: null, cha: 0, keepsake: true },
};

/** library · watched · fix anything · refuse the coat · finish his work · justice (§2.4). */
const REFERENCE = [
  ['origin.summer', 'c'],
  ['origin.trouble', 'c'],
  ['origin.talent', 'b'],
  ['origin.coat', 'b'],
  ['origin.promise', 'c'],
  ['origin.wish', 'b'],
].map(([questionId, answerId]) => ({ questionId: questionId!, answerId: answerId! }));

const T0 = Date.UTC(2026, 8, 29, 9);
let n = 0;
const uid = () => `uid-${++n}`;

function build(answers: typeof REFERENCE, factionId: FactionId) {
  const r = resolveOrigin({ origin: ORIGIN, answers, faction: FACTIONS[factionId] });
  if (!r.ok) throw new Error(r.reason);
  const c = buildNewCharacter({
    userId: 'u',
    name: 'Mara',
    avatarId: 'avatar.woman-30s',
    factionId,
    homeCityId: 'home',
    outcome: r.outcome,
    answers,
    now: T0,
    uid,
  });
  const worn = wornCha(
    c.stats.chaBase,
    equippedItems(c.inventory, c.equipment, (id) => ITEMS[id]),
  );
  return { outcome: r.outcome, c, worn };
}

describe('resolveOrigin (GDD §7.2, §8.5)', () => {
  it('builds the three reference recruits exactly (onboarding §2.4)', () => {
    const col = build(REFERENCE, 'collective');
    expect(col.c.stats).toEqual({ str: 10, int: 12, agi: 5, chaBase: 0 });
    expect([col.worn, col.c.iron, col.c.fxp]).toEqual([2, 150, 50]);
    expect(col.outcome.ambitionId).toBe('finish-his-work');
    const van = build(REFERENCE, 'vanguard');
    expect([van.c.stats.str, van.c.stats.int, van.c.stats.agi, van.worn]).toEqual([11, 11, 5, 2]);
    expect(van.c.fxp).toBe(0); // the wish was Justice
    const all = build(REFERENCE, 'alliance');
    expect([all.c.stats.str, all.c.stats.int, all.c.stats.agi, all.worn]).toEqual([8, 14, 5, 2]);
  });

  it('holds its bounds over all 3⁶ answer sets × 3 factions (§20.1 Q13)', () => {
    const ids = ['a', 'b', 'c'];
    let checked = 0;
    let flattest = 99;
    for (let i = 0; i < 3 ** 6; i++) {
      const pick = ORIGIN.questions.map((qq, k) => ({
        questionId: qq.id,
        answerId: ids[Math.floor(i / 3 ** k) % 3]!,
      }));
      // The three memory answers (summer, trouble, talent): 8 or 9 points counting CHA base.
      const memory = pick
        .slice(0, 3)
        .map((p, k) => ORIGIN.questions[k]!.answers.find((a) => a.id === p.answerId)!);
      const pts = memory.flatMap((a) => a.effects).reduce((s, e) => s + ('value' in e ? e.value : 0), 0);
      expect(pts).toBeGreaterThanOrEqual(8);
      expect(pts).toBeLessThanOrEqual(9);
      for (const f of ['vanguard', 'collective', 'alliance'] as const) {
        const { outcome, c, worn } = build(pick, f);
        const { str, int, agi, chaBase } = c.stats;
        for (const v of [str, int, agi]) {
          expect(v).toBeGreaterThanOrEqual(5);
          expect(v).toBeLessThanOrEqual(16);
        }
        const bonus = FACTIONS[f].startingBonus;
        const fromOrigin = [
          str - 5 - (bonus.str ?? 0),
          int - 5 - (bonus.int ?? 0),
          agi - 5 - (bonus.agi ?? 0),
        ];
        expect(Math.max(...fromOrigin)).toBeLessThanOrEqual(8);
        const trained = fromOrigin.reduce((a, b) => a + b, 0);
        expect(trained).toBeGreaterThanOrEqual(6);
        expect(trained).toBeLessThanOrEqual(9);
        expect(chaBase).toBeGreaterThanOrEqual(0);
        expect(chaBase).toBeLessThanOrEqual(4);
        expect(worn).toBeGreaterThanOrEqual(2);
        expect(worn).toBeLessThanOrEqual(9);
        // The wish pays only its own faction.
        const wish = pick[5]!.answerId;
        expect(c.fxp).toBe({ a: 'vanguard', b: 'collective', c: 'alliance' }[wish] === f ? 50 : 0);
        expect(c.iron).toBe(pick[3]!.answerId === 'b' ? 150 : 0);
        expect(outcome.items[0]!.itemId).toBe(FACTIONS[f].kit.outfit);
        flattest = Math.min(flattest, Math.max(str, int, agi));
        checked += 1;
      }
    }
    expect(checked).toBe(3 ** 6 * 3);
    // Accepted by the designer (§13.3): the flattest build is 8 / 8 / 8.
    expect(flattest).toBe(8);
  });

  it('refuses an incomplete or unknown answer set', () => {
    const five = REFERENCE.slice(0, 5);
    expect(resolveOrigin({ origin: ORIGIN, answers: five, faction: FACTIONS.collective })).toEqual({
      ok: false,
      reason: 'ORIGIN_INCOMPLETE',
      answered: 5,
    });
    const bad = REFERENCE.map((a, i) => (i === 2 ? { ...a, answerId: 'z' } : a));
    expect(resolveOrigin({ origin: ORIGIN, answers: bad, faction: FACTIONS.collective })).toMatchObject({
      ok: false,
      reason: 'UNKNOWN_ANSWER',
    });
  });

  it('wears the coat in place of the outfit and keeps the outfit (§21.4)', () => {
    const coat = REFERENCE.map((a) => (a.questionId === 'origin.coat' ? { ...a, answerId: 'a' } : a));
    const { outcome, c, worn } = build(coat, 'vanguard');
    expect(outcome.items).toEqual([
      { itemId: 'outfit.work-jacket', equip: null, source: 'kit' },
      { itemId: 'doc.party-card', equip: 'document', source: 'kit' },
      { itemId: 'outfit.fathers-coat', equip: 'clothing', source: 'origin' },
    ]);
    expect(c.inventory.map((e) => e.itemId)).toEqual([
      'outfit.work-jacket',
      'doc.party-card',
      'outfit.fathers-coat',
    ]);
    expect(c.inventory.find((e) => e.uid === c.equipment.clothing)?.itemId).toBe('outfit.fathers-coat');
    expect([worn, c.iron]).toEqual([5, 0]);
  });
});

describe('buildNewCharacter', () => {
  it('starts full, Level 1, unsettled, with chapter 1 waiting at its first step', () => {
    const { c } = build(REFERENCE, 'collective');
    expect(c).toMatchObject({
      energy: { value: 100, updatedAt: T0 },
      rested: 0,
      xp: 0,
      level: 1,
      rank: 1,
      pc: 0,
      job: null,
      day: { settled: null },
      version: 0,
      cityId: 'home',
      avatarId: 'avatar.woman-30s',
      ambition: { id: 'finish-his-work', chapter: 1, step: 'choose', choiceId: null, flags: [], history: [] },
      origin: { answers: REFERENCE, arrivedAt: T0 },
    });
    expect(c.inventory.every((e) => e.day === dayKey(T0))).toBe(true);
    expect(new Set(c.inventory.map((e) => e.uid)).size).toBe(c.inventory.length);
  });
});

describe('items (ADR 0014)', () => {
  it('worn CHA is 2 / 5 / 6 for refused / accepted / promised with a CHA base of 0', () => {
    const coat = (answerId: string) =>
      REFERENCE.map((a) => (a.questionId === 'origin.coat' ? { ...a, answerId } : a));
    expect(build(coat('b'), 'collective').worn).toBe(2);
    expect(build(coat('a'), 'collective').worn).toBe(5);
    expect(build(coat('c'), 'collective').worn).toBe(6);
    // Talked them out (+2) and read people (+1) on top of the promised coat: 9.
    const most = REFERENCE.map((a) =>
      a.questionId === 'origin.coat'
        ? { ...a, answerId: 'c' }
        : a.questionId === 'origin.trouble'
          ? { ...a, answerId: 'b' }
          : a.questionId === 'origin.talent'
            ? { ...a, answerId: 'c' }
            : a,
    );
    expect(build(most, 'collective').worn).toBe(9);
  });

  it('never grants a keepsake twice, and grants ordinary items again', () => {
    const entry = { uid: 'x1', day: 1, source: 'chapter' as const };
    const first = grantItem([], ITEMS['keep.ward-book']!, entry);
    expect(first.granted).toBe(true);
    const second = grantItem(first.inventory, ITEMS['keep.ward-book']!, { ...entry, uid: 'x2' });
    expect(second).toEqual({ inventory: first.inventory, granted: false });
    const coat1 = grantItem([], ITEMS['outfit.mill-coat']!, entry);
    expect(
      grantItem(coat1.inventory, ITEMS['outfit.mill-coat']!, { ...entry, uid: 'x2' }).inventory,
    ).toHaveLength(2);
  });

  it('skips empty slots and dangling uids', () => {
    const inv = [{ uid: 'u1', itemId: 'outfit.mill-coat', day: 1, source: 'kit' as const }];
    expect(equippedItems(inv, { clothing: null, document: 'nope' }, (id) => ITEMS[id])).toEqual([]);
    expect(
      wornCha(
        3,
        equippedItems(inv, { clothing: 'u1', document: null }, (id) => ITEMS[id]),
      ),
    ).toBe(5);
  });
});
