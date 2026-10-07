/**
 * QA (slice 2): rules edge cases not covered elsewhere. Tier-3 bands at the clamp extremes for a
 * chapter (§8.4, §17.1), chapter rewards with a partial Rested share (§6.3: proportional, halves
 * up, never on FXP), chapter status at the seven-day boundary with an unmet requirement, the
 * origin resolver's independence from answer order, and the bounds of worn CHA (§8.2, §8.5).
 */
import { describe, expect, it } from 'vitest';
import {
  AMBITION,
  buildNewCharacter,
  chapterRewards,
  chapterStatus,
  computeCheck,
  equippedItems,
  grantItem,
  outcomeForRoll,
  rankForFxp,
  resolveChapterCheck,
  resolveOrigin,
  wornCha,
} from '../src';
import type { AmbitionState, ChapterRules, ItemSpec, OriginSpec } from '../src';
import { fixedRng } from './helpers';

const DAY = 20_725;
const T0 = DAY * 86_400_000 + 9 * 3_600_000;
const CH: ChapterRules = {
  n: 1,
  playable: true,
  choices: [{ id: 'x', flag: 'x' }],
  approaches: [
    { id: 'int', stats: ['int'] },
    { id: 'chaint', stats: ['cha', 'int'] },
  ],
  difficulty: 8,
  energy: 10,
  rewards: {
    success: { xp: 150, fxp: 40, iron: 100 },
    partial: { xp: 75, fxp: 20, iron: 50 },
    failure: { xp: 25, fxp: 0, iron: 0 },
  },
};

describe('§8.4 tier-3 bands for a chapter (Success / Partial / Failure)', () => {
  it('at the 5 % floor: 1–5 Success, 6–25 Partial, 26–100 Failure', () => {
    for (let roll = 1; roll <= 100; roll++) {
      const want = roll <= 5 ? 'success' : roll <= 25 ? 'partial' : 'failure';
      expect(outcomeForRoll(roll, 5, 3), `roll ${roll}`).toBe(want);
    }
  });
  it('at the 95 % ceiling: 96–100 are Partial, never a Failure', () => {
    for (let roll = 96; roll <= 100; roll++) expect(outcomeForRoll(roll, 95, 3)).toBe('partial');
  });
  it('a chapter check clamps like any check: INT 30 vs 8 is 95 %; INT 5 vs a later chapter’s 30 is 5 %', () => {
    const at = (int: number, difficulty = 8) =>
      resolveChapterCheck(
        {
          spec: { ...CH, difficulty },
          approachId: 'int',
          values: { str: 5, int, agi: 5, cha: 2 },
          energy: { value: 100, rested: 0, updatedAt: T0 },
          now: T0,
        },
        fixedRng([50]),
      );
    const hi = at(30);
    const lo = at(5, 30);
    expect(hi.ok && hi.resolution.attempt.check.chance).toBe(95);
    expect(lo.ok && lo.resolution.attempt.check.chance).toBe(5);
    // Roll 50 at 5 %: beyond the Partial window, so a Failure: the chapter still pays 25 XP.
    expect(lo.ok && [lo.resolution.outcome, lo.resolution.rewards.xp.total]).toEqual(['failure', 25]);
  });
});

describe('§17.1 chapter rewards with Rested (§6.3: in proportion, halves up, never on FXP)', () => {
  it.each([
    [0, [150, 40, 100], [75, 20, 50], [25, 0, 0]],
    // 3 of 10 Energy covered → +15 %: 22.5 → 23, 15; 11.25 → 11, 7.5 → 8; 3.75 → 4.
    [3, [173, 40, 115], [86, 20, 58], [29, 0, 0]],
    // 5 of 10 → +25 %: 37.5 → 38, 25; 18.75 → 19, 12.5 → 13; 6.25 → 6.
    [5, [188, 40, 125], [94, 20, 63], [31, 0, 0]],
    [10, [225, 40, 150], [113, 20, 75], [38, 0, 0]],
  ])('Rested covering %i of 10 Energy', (rested, s, p, f) => {
    for (const [outcome, want] of [
      ['success', s],
      ['partial', p],
      ['failure', f],
    ] as const) {
      const r = chapterRewards(CH.rewards[outcome], rested, 10);
      expect([r.xp.total, r.fxp.total, r.iron.total], `${outcome}`).toEqual(want);
      expect(r.fxp.bonus).toBe(0);
      expect(r.opinion).toBe(0);
    }
  });
});

describe('§17.1 chapter status at the seven-day boundary', () => {
  const done: AmbitionState = {
    id: 'finish-his-work',
    chapter: 2,
    step: 'choose',
    choiceId: null,
    flags: ['x'],
    history: [{ chapter: 1, day: DAY, choiceId: 'x', approachId: 'int', outcome: 'partial', logId: 'l' }],
  };
  const ch2 = { ...CH, n: 2, requires: { level: 6 } };
  it('day +6 waits for the day; day +7 at Level 5 still waits, naming the requirement; Level 6 is ready', () => {
    expect(chapterStatus(done, ch2, { rank: 1, level: 9 }, DAY + 6)).toEqual({
      kind: 'waiting',
      readyFrom: DAY + AMBITION.daysBetweenChapters,
      needs: { level: 6 },
    });
    expect(chapterStatus(done, ch2, { rank: 1, level: 5 }, DAY + 7)).toMatchObject({
      kind: 'waiting',
      needs: { level: 6 },
    });
    expect(chapterStatus(done, ch2, { rank: 1, level: 6 }, DAY + 7)).toEqual({ kind: 'ready' });
    // Months later, still ready: being away costs opportunity, never the chapter (rule 4).
    expect(chapterStatus(done, ch2, { rank: 1, level: 6 }, DAY + 200)).toEqual({ kind: 'ready' });
  });
  it('a teaser (no story) is "none" even at its check step or with every requirement met', () => {
    const teaser = { ...ch2, playable: false };
    expect(chapterStatus(done, teaser, { rank: 7, level: 60 }, DAY + 30)).toEqual({ kind: 'none' });
    expect(chapterStatus({ ...done, step: 'check' }, teaser, { rank: 7, level: 60 }, DAY + 30)).toEqual({
      kind: 'none',
    });
    expect(chapterStatus(done, undefined, { rank: 7, level: 60 }, DAY + 30)).toEqual({ kind: 'none' });
  });
});

describe('the origin resolver and the kit (review 4: §7.1, §8.2, §8.5, §21.4)', () => {
  const spec: OriginSpec = {
    questions: [
      {
        id: 'q1',
        answers: [
          { id: 'a', effects: [{ kind: 'faction', factionId: 'alliance', person: 'grey' }] },
          { id: 'b', effects: [{ kind: 'faction', factionId: 'vanguard', person: 'stahl' }] },
        ],
      },
      {
        id: 'q2',
        answers: [
          {
            id: 'a',
            effects: [
              { kind: 'stat', stat: 'int', value: 6 },
              { kind: 'stat', stat: 'str', value: 1 },
            ],
          },
        ],
      },
      {
        id: 'q3',
        answers: [
          {
            id: 'a',
            effects: [
              { kind: 'ambition', ambitionId: 'finish-his-work' },
              { kind: 'wear', itemId: 'coat' },
            ],
          },
        ],
      },
    ],
  };
  const factions = [
    { id: 'alliance' as const, startingBonus: { int: 3 }, kit: { outfit: 'outfit', card: 'card' } },
    { id: 'vanguard' as const, startingBonus: { str: 3 }, kit: { outfit: 'outfit', card: 'card' } },
  ];
  const items: Record<string, ItemSpec> = {
    outfit: { id: 'outfit', slot: 'clothing', cha: 2, keepsake: false },
    card: { id: 'card', slot: 'document', cha: 0, keepsake: true },
    coat: { id: 'coat', slot: 'clothing', cha: 5, keepsake: false },
  };
  const inOrder = [
    { questionId: 'q1', answerId: 'a' },
    { questionId: 'q2', answerId: 'a' },
    { questionId: 'q3', answerId: 'a' },
  ];

  it('does not depend on the order the answers are listed in, and takes the party from beat 1', () => {
    const a = resolveOrigin({ origin: spec, answers: inOrder, factions });
    const b = resolveOrigin({ origin: spec, answers: [...inOrder].reverse(), factions });
    expect(a).toEqual(b);
    expect(a.ok && a.outcome).toMatchObject({
      factionId: 'alliance',
      stats: { str: 6, int: 14, agi: 5, chaBase: 0 },
      iron: 0,
      fxp: 0,
      ambitionId: 'finish-his-work',
    });
    const v = resolveOrigin({ origin: spec, answers: [{ questionId: 'q1', answerId: 'b' }, ...inOrder.slice(1)], factions });
    expect(v.ok && v.outcome.factionId).toBe('vanguard');
    expect(v.ok && v.outcome.stats).toEqual({ str: 9, int: 11, agi: 5, chaBase: 0 });
  });

  it('a party the content names but the rules were not given is NO_FACTION', () => {
    expect(resolveOrigin({ origin: spec, answers: inOrder, factions: factions.slice(1) })).toMatchObject({
      ok: false,
      reason: 'NO_FACTION',
    });
  });

  it('his coat is worn (CHA 5), the outfit kept; the new character is Rank 1 with no FXP', () => {
    const r = resolveOrigin({ origin: spec, answers: inOrder, factions });
    if (!r.ok) throw new Error(r.reason);
    let n = 0;
    const doc = buildNewCharacter({
      userId: 'u',
      name: 'Q',
      avatarId: null,
      factionId: r.outcome.factionId,
      homeCityId: 'ashford',
      outcome: r.outcome,
      answers: [],
      now: T0,
      uid: () => `u${++n}`,
    });
    // Three instances with distinct uids; the coat and the card are worn, the outfit kept.
    expect(new Set(doc.inventory.map((e) => e.uid)).size).toBe(3);
    expect(doc.equipment).toEqual({ clothing: 'u3', document: 'u2' });
    const worn = equippedItems(doc.inventory, doc.equipment, (id) => items[id]);
    expect(wornCha(doc.stats.chaBase, worn)).toBe(5);
    expect(doc.rank).toBe(rankForFxp(0));
    expect(doc.rank).toBe(1);
    // An ordinary item can be granted again; a keepsake (the party card) never twice.
    expect(
      grantItem(doc.inventory, items.card!, { uid: 'x', day: DAY, source: 'chapter' }).granted,
    ).toBe(false);
    expect(
      grantItem(doc.inventory, items.outfit!, { uid: 'y', day: DAY, source: 'chapter' }).inventory,
    ).toHaveLength(4);
  });

  it('a two-stat CHA check averages worn CHA (8.5 → 52 %, 9 → 54 %), as the coat odds in economy §13.1', () => {
    expect(
      computeCheck({ stats: ['cha', 'int'], values: { str: 0, int: 12, agi: 0, cha: 5 }, difficulty: 8 })
        .chance,
    ).toBe(52);
    expect(
      computeCheck({ stats: ['cha', 'int'], values: { str: 0, int: 12, agi: 0, cha: 6 }, difficulty: 8 })
        .chance,
    ).toBe(54);
    expect(
      computeCheck({ stats: ['cha', 'int'], values: { str: 0, int: 12, agi: 0, cha: 2 }, difficulty: 8 })
        .chance,
    ).toBe(46);
  });
});
