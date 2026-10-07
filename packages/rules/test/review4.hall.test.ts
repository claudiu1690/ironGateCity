/**
 * Review 4 (docs/tech/review-4.md §8.2, §9.2; ADR 0076–0077): which places open (`placeOpen`), and the
 * councillor desk's *Next* line (`deskNext`).
 */
import { describe, expect, it } from 'vitest';
import { ALWAYS_OPEN_KINDS, councilDay, deskNext, placeOpen } from '../src';

describe('placeOpen', () => {
  const later = { opens: { edition: 'later' as const } };
  const six = { opens: { level: 6 as const } };

  it('a town-hall is open at Level 1 in a later-edition quarter', () => {
    expect(ALWAYS_OPEN_KINDS).toContain('town-hall');
    expect(placeOpen({ quarter: later, kind: 'town-hall', level: 1 })).toEqual({ open: true, lock: null });
    expect(placeOpen({ quarter: six, kind: 'town-hall', level: 1 })).toEqual({ open: true, lock: null });
  });

  it('any other kind there is locked with edition, whatever the Level', () => {
    expect(placeOpen({ quarter: later, kind: 'station', level: 30 })).toEqual({ open: false, lock: { kind: 'edition' } });
  });

  it('Level 6 opens the second quarter; below it the lock names the Level', () => {
    expect(placeOpen({ quarter: six, kind: 'docks', level: 5 })).toEqual({ open: false, lock: { kind: 'level', level: 6 } });
    expect(placeOpen({ quarter: six, kind: 'docks', level: 6 })).toEqual({ open: true, lock: null });
  });

  it('being held there opens it', () => {
    expect(placeOpen({ quarter: six, kind: 'jail', level: 1, heldHere: true })).toEqual({ open: true, lock: null });
  });

  it('a first quarter, or no quarter, is open', () => {
    expect(placeOpen({ quarter: {}, kind: 'bar', level: 1 }).open).toBe(true);
    expect(placeOpen({ quarter: null, kind: 'bar', level: 1 }).open).toBe(true);
  });
});

describe('deskNext', () => {
  const base = { divideAt: 1_000, nominationsFromDay: 105 };

  it('days 0–1, no vote yet: the council votes at the division', () => {
    for (const cycleDay of [0, 1] as const)
      expect(deskNext({ ...base, cycleDay, voting: true, voted: null, passed: null })).toEqual({ kind: 'votes', at: 1_000 });
  });

  it('days 0–1, voted: the vote is in', () => {
    expect(deskNext({ ...base, cycleDay: 1, voting: true, voted: 'Reading Room Grant', passed: null })).toEqual({
      kind: 'voted',
      ordinance: 'Reading Room Grant',
    });
  });

  it('days 2–4, passed: the rule runs until its last day; names go in again from the next cycle', () => {
    for (const cycleDay of [2, 3, 4] as const)
      expect(
        deskNext({ ...base, cycleDay, voting: false, voted: 'X', passed: { name: 'Rest Day Order', untilDay: 107 } }),
      ).toEqual({ kind: 'runs', ordinance: 'Rest Day Order', untilDay: 107, nominationsFromDay: 105 });
  });

  it('days 2–4, nothing passed: the council rose', () => {
    expect(deskNext({ ...base, cycleDay: 3, voting: false, voted: null, passed: null })).toEqual({
      kind: 'rose',
      nominationsFromDay: 105,
    });
  });

  it("the capital's offset: the cycle day comes from councilDay with offset 0, a home city's with its own", () => {
    const day = 4_147;
    const capital = councilDay(day, 0);
    const coalport = councilDay(day, 2);
    expect(capital.cycleDay).not.toBe(coalport.cycleDay);
    const next = (d: typeof capital) =>
      deskNext({
        cycleDay: d.cycleDay,
        voting: d.council.voting,
        divideAt: 0,
        voted: null,
        passed: null,
        nominationsFromDay: d.council.toDay,
      }).kind;
    expect(next(capital)).toBe(capital.council.voting ? 'votes' : 'rose');
    expect(next(coalport)).toBe(coalport.council.voting ? 'votes' : 'rose');
  });
});
