import { describe, expect, it } from 'vitest';
import {
  buildNewCharacter,
  dayKey,
  equippedItems,
  grantItem,
  originFaction,
  resolveOrigin,
  wornCha,
} from '../src';
import type { FactionId, ItemSpec, OriginAnswerRef, OriginEffect, OriginFaction, OriginSpec } from '../src';

/**
 * Review 4 (GDD §7.1, §8.5; docs/design/review-4-answers.md §2; ADR 0073): *The Last Train In* as a
 * rules spec. Beat 1 (the platform) carries the party, beat 2 (the suitcase) +6 and +1, beat 3 (the
 * lining) the Ambition and his coat. The content test checks the real data against the same numbers.
 */
const stat = (s: 'str' | 'int' | 'agi', value: number): OriginEffect => ({ kind: 'stat', stat: s, value });
const coat: OriginEffect = { kind: 'wear', itemId: 'outfit.fathers-coat' };
const ORIGIN: OriginSpec = {
  questions: [
    {
      id: 'origin.platform',
      answers: [
        { id: 'holm', effects: [{ kind: 'faction', factionId: 'collective', person: 'holm' }] },
        { id: 'stahl', effects: [{ kind: 'faction', factionId: 'vanguard', person: 'stahl' }] },
        { id: 'grey', effects: [{ kind: 'faction', factionId: 'alliance', person: 'grey' }] },
      ],
    },
    {
      id: 'origin.suitcase',
      answers: [
        { id: 'tools', effects: [stat('str', 6), stat('int', 1)] },
        { id: 'books', effects: [stat('int', 6), stat('str', 1)] },
        { id: 'light', effects: [stat('agi', 6), stat('str', 1)] },
      ],
    },
    {
      id: 'origin.lining',
      answers: [
        { id: 'ward-book', effects: [{ kind: 'ambition', ambitionId: 'finish-his-work' }, coat] },
        { id: 'letter', effects: [{ kind: 'ambition', ambitionId: 'clear-his-name' }, coat] },
        { id: 'marker', effects: [{ kind: 'ambition', ambitionId: 'settle-his-debts' }, coat] },
      ],
    },
  ],
};

const FACTIONS: OriginFaction[] = [
  { id: 'vanguard', startingBonus: { str: 3 }, kit: { outfit: 'outfit.work-jacket', card: 'doc.party-card' } },
  {
    id: 'collective',
    startingBonus: { str: 2, int: 1 },
    kit: { outfit: 'outfit.mill-coat', card: 'doc.party-card' },
  },
  { id: 'alliance', startingBonus: { int: 3 }, kit: { outfit: 'outfit.worn-overcoat', card: 'doc.party-card' } },
];
const KIT: Record<FactionId, string> = {
  vanguard: 'outfit.work-jacket',
  collective: 'outfit.mill-coat',
  alliance: 'outfit.worn-overcoat',
};
const HELPER: Record<FactionId, string> = { vanguard: 'stahl', collective: 'holm', alliance: 'grey' };

const ITEMS: Record<string, ItemSpec> = {
  'outfit.work-jacket': { id: 'outfit.work-jacket', slot: 'clothing', cha: 2, keepsake: false },
  'outfit.mill-coat': { id: 'outfit.mill-coat', slot: 'clothing', cha: 2, keepsake: false },
  'outfit.worn-overcoat': { id: 'outfit.worn-overcoat', slot: 'clothing', cha: 2, keepsake: false },
  'outfit.fathers-coat': { id: 'outfit.fathers-coat', slot: 'clothing', cha: 5, keepsake: false },
  'doc.party-card': { id: 'doc.party-card', slot: 'document', cha: 0, keepsake: true },
  'keep.ward-book': { id: 'keep.ward-book', slot: null, cha: 0, keepsake: true },
};

const answers = (helper: string, suitcase: string, lining: string): OriginAnswerRef[] => [
  { questionId: 'origin.platform', answerId: helper },
  { questionId: 'origin.suitcase', answerId: suitcase },
  { questionId: 'origin.lining', answerId: lining },
];
/** §8.5: helped Holm · books · his ward book. */
const REFERENCE = answers('holm', 'books', 'ward-book');

const T0 = Date.UTC(2026, 8, 29, 9);
let n = 0;
const uid = () => `uid-${++n}`;

function build(given: OriginAnswerRef[]) {
  const r = resolveOrigin({ origin: ORIGIN, answers: given, factions: FACTIONS });
  if (!r.ok) throw new Error(r.reason);
  const c = buildNewCharacter({
    userId: 'u',
    name: 'Mara',
    avatarId: 'avatar.woman-30s',
    factionId: r.outcome.factionId,
    homeCityId: 'home',
    outcome: r.outcome,
    answers: given,
    now: T0,
    uid,
  });
  const worn = wornCha(
    c.stats.chaBase,
    equippedItems(c.inventory, c.equipment, (id) => ITEMS[id]),
  );
  return { outcome: r.outcome, c, worn };
}
const sheet = (b: ReturnType<typeof build>) => [b.c.stats.str, b.c.stats.int, b.c.stats.agi, b.worn];

describe('resolveOrigin (GDD §7.1, §8.5; review 4)', () => {
  it('the reference recruit: helped Holm, books, his ward book → Collective STR 8 / INT 12 / AGI 5 / CHA 5', () => {
    const col = build(REFERENCE);
    expect(col.outcome.factionId).toBe('collective');
    expect(col.c.factionId).toBe('collective');
    expect(col.c.stats).toEqual({ str: 8, int: 12, agi: 5, chaBase: 0 });
    expect(col.worn).toBe(5);
    expect([col.c.iron, col.c.fxp, col.c.rank]).toEqual([0, 0, 1]);
    expect(col.outcome.ambitionId).toBe('finish-his-work');
  });

  it('the tuning characters: Vanguard tools 14 / 6 / 5, Alliance books 6 / 14 / 5, both CHA 5', () => {
    expect(sheet(build(answers('stahl', 'tools', 'ward-book')))).toEqual([14, 6, 5, 5]);
    expect(sheet(build(answers('grey', 'books', 'ward-book')))).toEqual([6, 14, 5, 5]);
  });

  it('light in any party is AGI 11 (the flattest build)', () => {
    for (const helper of ['holm', 'stahl', 'grey']) {
      expect(build(answers(helper, 'light', 'marker')).c.stats.agi).toBe(11);
    }
  });

  it('over all 27 answer sets: the party is beat 1’s, the best stat 11–14, CHA 5, no Iron, no FXP', () => {
    let checked = 0;
    for (const f of FACTIONS) {
      for (const suitcase of ['tools', 'books', 'light']) {
        for (const lining of ['ward-book', 'letter', 'marker']) {
          const b = build(answers(HELPER[f.id], suitcase, lining));
          expect(b.c.factionId).toBe(f.id);
          const best = Math.max(b.c.stats.str, b.c.stats.int, b.c.stats.agi);
          expect(best).toBeGreaterThanOrEqual(11);
          expect(best).toBeLessThanOrEqual(14);
          expect([b.worn, b.c.iron, b.c.fxp, b.c.stats.chaBase]).toEqual([5, 0, 0, 0]);
          // Five each plus the suitcase's seven plus the party's three.
          expect(b.c.stats.str + b.c.stats.int + b.c.stats.agi).toBe(15 + 7 + 3);
          expect(b.outcome.items[0]).toEqual({ itemId: KIT[f.id], equip: null, source: 'kit' });
          checked += 1;
        }
      }
    }
    expect(checked).toBe(27);
  });

  it('refuses an incomplete set, an unknown answer and a beat 1 with no faction', () => {
    expect(resolveOrigin({ origin: ORIGIN, answers: REFERENCE.slice(0, 2), factions: FACTIONS })).toEqual({
      ok: false,
      reason: 'ORIGIN_INCOMPLETE',
      answered: 2,
    });
    const bad = REFERENCE.map((a, i) => (i === 1 ? { ...a, answerId: 'z' } : a));
    expect(resolveOrigin({ origin: ORIGIN, answers: bad, factions: FACTIONS })).toMatchObject({
      ok: false,
      reason: 'UNKNOWN_ANSWER',
    });
    const noFaction: OriginSpec = {
      questions: [
        { id: 'origin.platform', answers: [{ id: 'holm', effects: [stat('str', 1)] }] },
        ...ORIGIN.questions.slice(1),
      ],
    };
    expect(resolveOrigin({ origin: noFaction, answers: REFERENCE, factions: FACTIONS })).toMatchObject({
      ok: false,
      reason: 'NO_FACTION',
    });
  });

  it('does not depend on the order the answers are listed in', () => {
    const a = resolveOrigin({ origin: ORIGIN, answers: REFERENCE, factions: FACTIONS });
    const b = resolveOrigin({ origin: ORIGIN, answers: [...REFERENCE].reverse(), factions: FACTIONS });
    expect(a).toEqual(b);
  });

  it('wears the coat in place of the outfit and keeps the outfit (§21.4)', () => {
    const { outcome, c } = build(answers('stahl', 'tools', 'letter'));
    expect(outcome.items).toEqual([
      { itemId: 'outfit.work-jacket', equip: null, source: 'kit' },
      { itemId: 'doc.party-card', equip: 'document', source: 'kit' },
      { itemId: 'outfit.fathers-coat', equip: 'clothing', source: 'origin' },
    ]);
    expect(c.inventory.find((e) => e.uid === c.equipment.clothing)?.itemId).toBe('outfit.fathers-coat');
  });
});

describe('originFaction (the story’s {helper} and {city}, the join’s party)', () => {
  it('is null before beat 1 and the party and person after it', () => {
    expect(originFaction(ORIGIN, [])).toBeNull();
    expect(originFaction(ORIGIN, REFERENCE.slice(0, 1))).toEqual({ factionId: 'collective', person: 'holm' });
    expect(originFaction(ORIGIN, answers('grey', 'light', 'marker'))).toEqual({
      factionId: 'alliance',
      person: 'grey',
    });
  });
});

describe('buildNewCharacter', () => {
  it('starts full, Level 1, unsettled, with chapter 1 waiting at its first step', () => {
    const { c } = build(REFERENCE);
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
  it('worn CHA is 5 for every new character (his coat; review 4: no CHA base)', () => {
    for (const lining of ['ward-book', 'letter', 'marker']) {
      expect(build(answers('holm', 'books', lining)).worn).toBe(5);
    }
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
