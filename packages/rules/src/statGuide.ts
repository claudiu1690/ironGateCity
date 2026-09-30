import type { CheckStatSpec, StatPointTarget } from './types';

/**
 * Review 1 (GDD §5.3, `review-1-answers.md` §7): how many of a city's checked actions use each stat
 * a level point can go to. A single-stat action counts for its stat, a two-stat action for both, a
 * best-stat action for none; `total` is every checked action there. `lead` is the most common stat
 * (ties: INT, STR, AGI).
 */
export function statUse(actions: ReadonlyArray<{ stats: CheckStatSpec }>): {
  total: number;
  counts: Record<StatPointTarget, number>;
  lead: StatPointTarget;
} {
  const counts: Record<StatPointTarget, number> = { str: 0, int: 0, agi: 0 };
  for (const a of actions) {
    for (const s of a.stats) if (s === 'str' || s === 'int' || s === 'agi') counts[s] += 1;
  }
  let lead: StatPointTarget = 'int';
  for (const s of ['str', 'agi'] as const) if (counts[s] > counts[lead]) lead = s;
  return { total: actions.length, counts, lead };
}
