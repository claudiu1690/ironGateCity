import { cycleOf, dayKey, dayStart } from '@irongate/rules';
import type { CycleDay } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import {
  HOUR_MS,
  PAST_BOUNDARY_MS,
  formatUtc,
  nextDayAt,
  nextPhase,
  nextPhaseAt,
  phaseLabel,
  phaseOf,
} from '../src/dev/clock';

/** The dev panel's time-skip maths (README "Reviewing with the dev panel"): pure, no database. */

const COALPORT = 2;
/** Tuesday 29 September 2026, 09:00 UTC: Coalport cycle day 3 (the polls, day 2 of 3). */
const T = Date.UTC(2026, 8, 29, 9);
const D = dayKey(T);

describe('nextPhase: nominations → polls → the count', () => {
  it('from each day of a Coalport cycle', () => {
    const { start, cycleDay } = cycleOf(D, COALPORT);
    expect(cycleDay).toBe(3);
    const expected: Record<CycleDay, { phase: 'polls' | 'count'; day: number }> = {
      0: { phase: 'polls', day: start + 2 },
      1: { phase: 'polls', day: start + 2 },
      2: { phase: 'count', day: start + 5 },
      3: { phase: 'count', day: start + 5 },
      4: { phase: 'count', day: start + 5 },
    };
    for (let k = 0; k < 5; k++) {
      expect(nextPhase(start + k, COALPORT), `cycle day ${k}`).toEqual(expected[k as CycleDay]);
    }
  });

  it('in every city offset, lands strictly later on the phase it names, with no phase between', () => {
    for (let offset = 0; offset < 5; offset++) {
      for (let day = D - 10; day < D + 10; day++) {
        const n = nextPhase(day, offset);
        expect(n.day).toBeGreaterThan(day);
        expect(cycleOf(n.day, offset).cycleDay).toBe(n.phase === 'polls' ? 2 : 0);
        // Every day before the landing day is still the phase we started in.
        const polling = (d: number) => cycleOf(d, offset).cycleDay >= 2;
        for (let d = day + 1; d < n.day; d++) expect(polling(d)).toBe(polling(day));
        // Two skips from nominations are one whole cycle: the next nominations.
        const twice = nextPhase(n.day, offset);
        expect(twice.phase).toBe(n.phase === 'polls' ? 'count' : 'polls');
      }
    }
  });
});

describe('nextPhaseAt', () => {
  it('names the 00:00 UTC boundary and lands at 00:01', () => {
    const n = nextPhaseAt(T, COALPORT);
    expect(n.phase).toBe('count');
    expect(n.startsAt).toBe(Date.UTC(2026, 9, 1));
    expect(n.landAt).toBe(Date.UTC(2026, 9, 1, 0, 1));
    expect(n.landAt - n.startsAt).toBe(PAST_BOUNDARY_MS);
  });

  it('a second before the polls open still goes to the polls; at the opening it goes to the count', () => {
    // Coalport: day D+4 is cycle day 2 (the polls open at its 00:00).
    expect(cycleOf(D + 4, COALPORT).cycleDay).toBe(2);
    const justBefore = dayStart(D + 4) - 1_000;
    expect(nextPhaseAt(justBefore, COALPORT)).toMatchObject({ phase: 'polls', startsAt: dayStart(D + 4) });
    expect(nextPhaseAt(dayStart(D + 4), COALPORT)).toMatchObject({
      phase: 'count',
      startsAt: dayStart(D + 7),
    });
  });
});

describe('nextDayAt', () => {
  it('is 00:01 UTC on the next City Day, from any time of today', () => {
    for (const t of [dayStart(D), dayStart(D) + 30_000, T, dayStart(D + 1) - 1]) {
      expect(nextDayAt(t)).toBe(dayStart(D + 1) + PAST_BOUNDARY_MS);
    }
    expect(dayKey(nextDayAt(T))).toBe(D + 1);
    // Already at 00:01: the next day, never the same one.
    expect(nextDayAt(dayStart(D) + PAST_BOUNDARY_MS)).toBe(dayStart(D + 1) + PAST_BOUNDARY_MS);
  });

  it('+1 hour is an hour', () => {
    expect(HOUR_MS).toBe(3_600_000);
  });
});

describe('labels', () => {
  it('phaseOf and phaseLabel for each cycle day', () => {
    expect([0, 1, 2, 3, 4].map((d) => phaseOf(d as CycleDay))).toEqual([
      'count-day',
      'nominations',
      'polls',
      'polls',
      'polls',
    ]);
    expect(phaseLabel(0)).toBe('Count day · nominations open (day 1 of 2)');
    expect(phaseLabel(1)).toBe('Nominations (day 2 of 2, last day)');
    expect(phaseLabel(2)).toBe('Polls open (day 1 of 3)');
    expect(phaseLabel(4)).toBe('Polls open (day 3 of 3, last day)');
  });

  it('formatUtc', () => {
    expect(formatUtc(Date.UTC(2026, 9, 1, 0, 1))).toBe('Thursday 1 Oct 00:01 UTC');
    expect(formatUtc(T)).toBe('Tuesday 29 Sep 09:00 UTC');
  });
});
