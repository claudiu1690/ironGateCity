import { computeCheck, outcomeForRoll } from './check';
import { AMBITION, CHAPTER, RESTED } from './constants';
import type { DayKey } from './day';
import { projectEnergy, spendEnergy } from './energy';
import type { EnergyProjection, EnergyState } from './energy';
import { flatLine } from './rewards';
import type { Rng } from './rng';
import type {
  ActionAttempt,
  ChapterStatusKind,
  CheckBonus,
  CheckStats,
  Outcome,
  Rewards,
  Stats,
} from './types';

/**
 * Ambitions (GDD §17.1, ADR 0013). A chapter is choose → check → result; it never fails as a
 * chapter. The state is embedded on the character; everything here is pure.
 */
export interface AmbitionHistoryEntry {
  chapter: number;
  day: DayKey;
  choiceId: string | null;
  approachId: string;
  outcome: Outcome;
  logId: string;
}

export interface AmbitionState {
  id: string;
  /** The chapter in progress or next (1-based). */
  chapter: number;
  /** Where that chapter waits. */
  step: 'choose' | 'check';
  /** Step 1's answer for the current chapter. */
  choiceId: string | null;
  /** Accumulated across chapters; read by later chapters, never by rules. */
  flags: string[];
  history: AmbitionHistoryEntry[];
}

export interface ChapterReward {
  xp: number;
  fxp: number;
  iron: number;
}

/** What the rules need of one chapter (content builds it). A teaser chapter is not playable. */
export interface ChapterRules {
  n: number;
  requires?: { rank?: number; level?: number };
  playable: boolean;
  choices: Array<{ id: string; flag: string }>;
  approaches: Array<{ id: string; stats: CheckStats }>;
  difficulty: number;
  energy: number;
  rewards: Record<Outcome, ChapterReward>;
}

export type ChapterStatus =
  /** No playable chapter in content: the Letters row is absent. */
  | { kind: 'none' }
  | { kind: 'waiting'; readyFrom: DayKey; needs: { rank?: number; level?: number } | null }
  | { kind: 'ready' }
  /** Step 'check': the Letters row reads "waiting for you". */
  | { kind: 'midway' };

/** The view's kind (`ChapterStatusKind` in types.ts) must stay this union's kind. */
export const chapterStatusKind = (s: ChapterStatus): ChapterStatusKind => s.kind;

/**
 * §17.1: chapter 1 is ready on arrival; a later chapter is ready when seven City Days have passed
 * since the previous one and its requirement holds. A chapter at its check step is mid-way.
 */
export function chapterStatus(
  s: AmbitionState,
  spec: ChapterRules | undefined,
  c: { rank: number; level: number },
  today: DayKey,
): ChapterStatus {
  if (!spec || !spec.playable) return { kind: 'none' };
  if (s.step === 'check') return { kind: 'midway' };
  const last = s.history.at(-1);
  const readyFrom = last ? last.day + AMBITION.daysBetweenChapters : today;
  const req = spec.requires;
  const met =
    (req?.rank === undefined || c.rank >= req.rank) && (req?.level === undefined || c.level >= req.level);
  if (today >= readyFrom && met) return { kind: 'ready' };
  return { kind: 'waiting', readyFrom, needs: req ?? null };
}

export type ChooseResult =
  | { ok: true; state: AmbitionState; changed: boolean }
  | { ok: false; reason: 'CHAPTER_NOT_READY' | 'UNKNOWN_CHOICE' };

/**
 * Step 1, set-once (ADR 0013): 'choose' → 'check' with the choice's flag added. A second tap on the
 * same chapter once it is at its check returns the state unchanged (the first tap wins). Whether
 * the chapter is ready is `chapterStatus`'s call, made by the caller first.
 */
export function chooseInChapter(
  s: AmbitionState,
  spec: ChapterRules,
  n: number,
  choiceId: string,
): ChooseResult {
  if (s.chapter !== n || !spec.playable || spec.n !== n) return { ok: false, reason: 'CHAPTER_NOT_READY' };
  if (s.step === 'check') return { ok: true, state: s, changed: false };
  const choice = spec.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, reason: 'UNKNOWN_CHOICE' };
  return {
    ok: true,
    changed: true,
    state: {
      ...s,
      step: 'check',
      choiceId,
      flags: s.flags.includes(choice.flag) ? [...s.flags] : [...s.flags, choice.flag],
      history: [...s.history],
    },
  };
}

/**
 * §17.1: a chapter pays fixed amounts; Rested adds +50 % to XP and Iron in proportion to the Energy
 * it covered (§6.3), halves up; FXP never gets a Rested bonus; no opinion.
 */
export function chapterRewards(r: ChapterReward, restedUsed: number, energy: number): Rewards {
  const share = energy > 0 ? Math.min(1, restedUsed / energy) : 0;
  return {
    xp: flatLine(r.xp, RESTED.xpBonus * share),
    fxp: flatLine(r.fxp, 0),
    iron: flatLine(r.iron, RESTED.ironBonus * share),
    opinion: 0,
  };
}

export interface ChapterResolution {
  attempt: ActionAttempt;
  rewards: Rewards;
  outcome: Outcome;
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
}

export type ChapterCheckResult =
  | { ok: true; resolution: ChapterResolution }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; cost: number; energy: EnergyProjection }
  | { ok: false; reason: 'UNKNOWN_APPROACH' };

/**
 * Step 2 (§17.1, §8.4): spend the chapter's Energy (Rested per point), one check at the chapter's
 * difficulty with worn stats and no Standing bonus, one roll from the seed, the tier-3 bands, then
 * the fixed rewards. Same seed and input ⇒ the same result.
 */
export function resolveChapterCheck(
  i: {
    spec: ChapterRules;
    approachId: string;
    values: Stats;
    energy: EnergyState;
    now: number;
    bonuses?: CheckBonus[];
  },
  rng: Rng,
): ChapterCheckResult {
  const approach = i.spec.approaches.find((a) => a.id === i.approachId);
  if (!approach) return { ok: false, reason: 'UNKNOWN_APPROACH' };
  const before = projectEnergy(i.energy, i.now);
  const spent = spendEnergy(before, i.spec.energy);
  if (!spent.ok) return { ok: false, reason: 'NOT_ENOUGH_ENERGY', cost: i.spec.energy, energy: before };

  const check = computeCheck({
    stats: approach.stats,
    values: i.values,
    difficulty: i.spec.difficulty,
    bonuses: i.bonuses ?? [],
  });
  const roll = rng.roll100();
  const outcome = outcomeForRoll(roll, check.chance, CHAPTER.tier);
  return {
    ok: true,
    resolution: {
      attempt: { index: 1, check, roll, outcome },
      rewards: chapterRewards(i.spec.rewards[outcome], spent.restedUsed, i.spec.energy),
      outcome,
      energy: { before, after: spent.state, cost: i.spec.energy, restedUsed: spent.restedUsed },
    },
  };
}

/** The chapter completes on any outcome: history gets the record, the next chapter waits at step 1. */
export function completeChapter(
  s: AmbitionState,
  r: { approachId: string; outcome: Outcome; day: DayKey; logId: string },
): AmbitionState {
  return {
    ...s,
    chapter: s.chapter + 1,
    step: 'choose',
    choiceId: null,
    flags: [...s.flags],
    history: [
      ...s.history,
      {
        chapter: s.chapter,
        day: r.day,
        choiceId: s.choiceId,
        approachId: r.approachId,
        outcome: r.outcome,
        logId: r.logId,
      },
    ],
  };
}
