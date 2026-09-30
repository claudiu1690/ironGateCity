import { FIRST_DAY } from './constants';
import { dayKey } from './day';
import type { DayKey } from './day';
import type { CheckBonus } from './types';

/**
 * Review 1 (GDD §8.4, §13.7; Appendix C #18 closed): the welcome day is the City Day of creation,
 * and the next one too when the character was created at or after 22:00 UTC.
 */
export function isWelcomeDay(createdAt: number, today: DayKey): boolean {
  const first = dayKey(createdAt);
  if (today === first) return true;
  return today === first + 1 && new Date(createdAt).getUTCHours() >= FIRST_DAY.lateFromHourUtc;
}

/** The *First day in {city}* row: +10 % on every checked action in the home city on the welcome day. */
export function firstDayBonus(cityName: string): CheckBonus {
  return { id: 'first-day', label: `First day in ${cityName}`, value: FIRST_DAY.chancePct };
}
