import { STANDING } from './constants';
import type { CheckBonus, StandingView } from './types';

/** §13.4: the Local Standing level for a number of Successes in a city, and its check bonus. */
export function standingView(successes: number): StandingView {
  const t = STANDING.thresholds;
  let level = 0;
  while (level + 1 < t.length && successes >= t[level + 1]!) level++;
  return {
    level: level as StandingView['level'],
    successes,
    floor: t[level]!,
    next: level + 1 < t.length ? t[level + 1]! : null,
    bonus: level * STANDING.bonusPerLevel,
  };
}

/** The check bonus line ("Known in Coalport +6 %"), or null at Stranger. */
export function standingBonus(successes: number, label: string): CheckBonus | null {
  const v = standingView(successes);
  return v.bonus > 0 ? { id: 'standing', label, value: v.bonus } : null;
}
