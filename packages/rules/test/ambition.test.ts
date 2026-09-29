import { describe, expect, it } from 'vitest';
import {
  AMBITION,
  chapterRewards,
  chapterStatus,
  chooseInChapter,
  completeChapter,
  createRng,
  resolveChapterCheck,
} from '../src';
import type { AmbitionState, ChapterRules } from '../src';
import { fixedRng } from './helpers';

const DAY = 20_725;
const T0 = DAY * 86_400_000 + 9 * 3_600_000;

/** Finish His Work chapter 1 (onboarding §3.2) and a playable chapter 2 for the spacing tests. */
const CH1: ChapterRules = {
  n: 1,
  playable: true,
  choices: [
    { id: 'show', flag: 'showedBook' },
    { id: 'keep', flag: 'keptBook' },
  ],
  approaches: [
    { id: 'knock', stats: ['cha', 'int'] },
    { id: 'sort', stats: ['int'] },
  ],
  difficulty: 8,
  energy: 10,
  rewards: {
    success: { xp: 150, fxp: 40, iron: 100 },
    partial: { xp: 75, fxp: 20, iron: 50 },
    failure: { xp: 25, fxp: 0, iron: 0 },
  },
};
const CH2: ChapterRules = { ...CH1, n: 2, requires: { rank: 2 } };

const fresh: AmbitionState = {
  id: 'finish-his-work',
  chapter: 1,
  step: 'choose',
  choiceId: null,
  flags: [],
  history: [],
};
const reference = { str: 10, int: 12, agi: 5, cha: 2 };
const energy = (value: number, rested = 0) => ({ value, rested, updatedAt: T0 });

describe('chapterStatus (§17.1)', () => {
  it('chapter 1 is ready on arrival; mid-way at its check; none without playable content', () => {
    expect(chapterStatus(fresh, CH1, { rank: 1, level: 1 }, DAY)).toEqual({ kind: 'ready' });
    expect(chapterStatus({ ...fresh, step: 'check' }, CH1, { rank: 1, level: 1 }, DAY)).toEqual({
      kind: 'midway',
    });
    expect(chapterStatus(fresh, undefined, { rank: 1, level: 1 }, DAY)).toEqual({ kind: 'none' });
    expect(chapterStatus(fresh, { ...CH2, playable: false }, { rank: 2, level: 1 }, DAY)).toEqual({
      kind: 'none',
    });
  });

  it('a later chapter waits seven City Days and its requirement', () => {
    const done = completeChapter(
      { ...fresh, step: 'check', choiceId: 'keep' },
      {
        approachId: 'sort',
        outcome: 'success',
        day: DAY,
        logId: 'log1',
      },
    );
    expect(AMBITION.daysBetweenChapters).toBe(7);
    expect(chapterStatus(done, CH2, { rank: 2, level: 1 }, DAY + 6)).toEqual({
      kind: 'waiting',
      readyFrom: DAY + 7,
      needs: { rank: 2 },
    });
    expect(chapterStatus(done, CH2, { rank: 2, level: 1 }, DAY + 7)).toEqual({ kind: 'ready' });
    expect(chapterStatus(done, CH2, { rank: 1, level: 9 }, DAY + 30)).toMatchObject({ kind: 'waiting' });
  });
});

describe('chooseInChapter', () => {
  it('is set-once and idempotent; the flag is remembered', () => {
    const r = chooseInChapter(fresh, CH1, 1, 'show');
    expect(r).toMatchObject({
      ok: true,
      changed: true,
      state: { step: 'check', choiceId: 'show', flags: ['showedBook'] },
    });
    if (!r.ok) throw new Error('unreachable');
    const again = chooseInChapter(r.state, CH1, 1, 'keep');
    expect(again).toEqual({ ok: true, changed: false, state: r.state });
  });

  it('refuses another chapter or an unknown choice', () => {
    expect(chooseInChapter(fresh, CH2, 2, 'show')).toEqual({ ok: false, reason: 'CHAPTER_NOT_READY' });
    expect(chooseInChapter(fresh, CH1, 1, 'burn')).toEqual({ ok: false, reason: 'UNKNOWN_CHOICE' });
  });
});

describe('resolveChapterCheck (§8.4, §17.1)', () => {
  const check = (approachId: string, values = reference, rolls = [50], e = energy(100)) =>
    resolveChapterCheck({ spec: CH1, approachId, values, energy: e, now: T0 }, fixedRng(rolls));

  it('shows the odds: INT 12 = 66 %, CHA+INT (2, 12) 46 %, (5, 12) 52 %, (6, 12) 54 %', () => {
    const chance = (approachId: string, c: number) => {
      const r = check(approachId, { ...reference, cha: c });
      if (!r.ok) throw new Error('refused');
      return r.resolution.attempt.check.chance;
    };
    expect(chance('sort', 2)).toBe(66);
    expect([chance('knock', 2), chance('knock', 5), chance('knock', 6)]).toEqual([46, 52, 54]);
  });

  it('bands rolls 66 / 67 / 86 / 87 as Success / Partial / Partial / Failure', () => {
    const outcomes = [66, 67, 86, 87].map((roll) => {
      const r = check('sort', reference, [roll]);
      if (!r.ok) throw new Error('refused');
      return r.resolution.outcome;
    });
    expect(outcomes).toEqual(['success', 'partial', 'partial', 'failure']);
  });

  it('pays 150/40/100, 75/20/50, 25/0/0 and a Rested bonus on XP and Iron only', () => {
    const totals = (o: 'success' | 'partial' | 'failure', rested = 0) => {
      const r = chapterRewards(CH1.rewards[o], rested, 10);
      return [r.xp.total, r.fxp.total, r.iron.total, r.opinion];
    };
    expect(totals('success')).toEqual([150, 40, 100, 0]);
    expect(totals('partial')).toEqual([75, 20, 50, 0]);
    expect(totals('failure')).toEqual([25, 0, 0, 0]);
    const s = chapterRewards(CH1.rewards.success, 10, 10);
    expect([s.xp.bonus, s.iron.bonus, s.fxp.bonus]).toEqual([75, 50, 0]);
    const f = chapterRewards(CH1.rewards.failure, 10, 10);
    expect([f.xp.bonus, f.iron.bonus]).toEqual([13, 0]);
    const half = chapterRewards(CH1.rewards.success, 5, 10);
    expect(half.xp.bonus).toBe(38); // 150 × 0.25 = 37.5, halves up
  });

  it('spends 10 Energy with Rested per point, refuses at 9, and refuses an unknown approach', () => {
    const r = check('sort', reference, [10], energy(100, 30));
    if (!r.ok) throw new Error('refused');
    expect(r.resolution.energy).toMatchObject({ cost: 10, restedUsed: 10, after: { value: 90, rested: 20 } });
    expect(r.resolution.rewards.xp).toEqual({ base: 150, bonus: 75, total: 225 });
    expect(check('sort', reference, [10], energy(9))).toMatchObject({
      ok: false,
      reason: 'NOT_ENOUGH_ENERGY',
      cost: 10,
    });
    expect(check('bribe')).toEqual({ ok: false, reason: 'UNKNOWN_APPROACH' });
  });

  it('replays from its seed', () => {
    const run = () =>
      resolveChapterCheck(
        { spec: CH1, approachId: 'knock', values: reference, energy: energy(50), now: T0 },
        createRng('seed-1'),
      );
    expect(run()).toEqual(run());
  });
});

describe('completeChapter', () => {
  it('records the chapter, moves to the next at step 1 and keeps the flags', () => {
    const at = { ...fresh, step: 'check' as const, choiceId: 'show', flags: ['showedBook'] };
    expect(completeChapter(at, { approachId: 'knock', outcome: 'failure', day: DAY, logId: 'l1' })).toEqual({
      id: 'finish-his-work',
      chapter: 2,
      step: 'choose',
      choiceId: null,
      flags: ['showedBook'],
      history: [
        { chapter: 1, day: DAY, choiceId: 'show', approachId: 'knock', outcome: 'failure', logId: 'l1' },
      ],
    });
  });
});
