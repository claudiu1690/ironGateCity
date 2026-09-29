import { describe, expect, it } from 'vitest';
import { DIRECTIVES, cityDayIndex, dayKey, dayStart, isNight, weekKey, weekday } from '../src';

const H = 3_600_000;

describe('day (ADR 0005, GDD §2.2)', () => {
  it('the boundary is 00:00 UTC', () => {
    const midnight = Date.UTC(2026, 8, 30);
    expect(dayKey(midnight - 1)).toBe(dayKey(midnight) - 1);
    expect(dayKey(Date.UTC(2026, 8, 29, 23, 59, 59, 999))).toBe(dayKey(Date.UTC(2026, 8, 29)));
    expect(dayStart(dayKey(midnight))).toBe(midnight);
  });

  it('epochDay is dayKey(2026-01-01)', () => {
    expect(DIRECTIVES.epochDay).toBe(dayKey(Date.UTC(2026, 0, 1)));
    expect(cityDayIndex(dayKey(Date.UTC(2026, 0, 3)))).toBe(2);
  });

  it('weeks start on Monday', () => {
    const sunday = dayKey(Date.UTC(2026, 9, 4)); // Sunday 4 October 2026
    const monday = dayKey(Date.UTC(2026, 9, 5));
    expect(weekday(sunday)).toBe(6);
    expect(weekday(monday)).toBe(0);
    expect(weekKey(monday)).toBe(weekKey(sunday) + 1);
    expect(weekKey(monday + 6)).toBe(weekKey(monday));
    expect(weekday(dayKey(Date.UTC(2026, 8, 29)))).toBe(1); // a Tuesday
  });

  it('night is 20:00–06:00 UTC', () => {
    const d = Date.UTC(2026, 8, 29);
    expect(isNight(d + 5 * H + 59 * 60_000)).toBe(true);
    expect(isNight(d + 6 * H)).toBe(false);
    expect(isNight(d + 19 * H + 59 * 60_000)).toBe(false);
    expect(isNight(d + 20 * H)).toBe(true);
    expect(isNight(d)).toBe(true);
  });
});
