import { describe, expect, it } from 'vitest';
import {
  boundaryWork,
  councilDay,
  councilKey,
  cycleOf,
  cycleOfKey,
  dayKey,
  electionKey,
  nextNominationsAfter,
  nextPollsFrom,
  weekday,
} from '../src';

const OFFSETS = { irongate: 0, ashford: 1, coalport: 2, duskwall: 3, clearwater: 4 } as const;
const D = (y: number, m: number, d: number) => dayKey(Date.UTC(y, m - 1, d));

describe('the council calendar (tech design §3.1)', () => {
  it('pins the Coalport example: election 4145 opens Thu 1 Oct, is counted into Tue 6 Oct', () => {
    expect(D(2026, 1, 1)).toBe(20454);
    expect(weekday(D(2026, 9, 29))).toBe(1); // Tuesday
    const thu = D(2026, 10, 1);
    expect(thu).toBe(20727);
    const c = councilDay(thu, OFFSETS.coalport);
    expect(c).toMatchObject({ cycle: 4145, cycleDay: 0, phase: 'nominations' });
    expect(c.election).toEqual({ cycle: 4145, nominationsFrom: 20727, pollsFrom: 20729, countDay: 20732 });
    expect(electionKey('coalport', c.cycle)).toBe('coalport:4145');
    for (const d of [D(2026, 10, 3), D(2026, 10, 4), D(2026, 10, 5)]) {
      expect(councilDay(d, OFFSETS.coalport)).toMatchObject({ cycle: 4145, phase: 'polling' });
    }
    const tue = D(2026, 10, 6);
    expect(tue).toBe(20732);
    const t = councilDay(tue, OFFSETS.coalport);
    expect(t).toMatchObject({ cycle: 4146, cycleDay: 0 });
    expect(t.council).toEqual({ cycle: 4146, fromDay: 20732, divideDay: 20734, toDay: 20737, voting: true });
    expect(councilKey('coalport', t.cycle)).toBe('coalport:4146');
    expect(councilDay(D(2026, 10, 7), OFFSETS.coalport).council.voting).toBe(true);
    const thu8 = councilDay(D(2026, 10, 8), OFFSETS.coalport);
    expect(thu8).toMatchObject({ cycleDay: 2 });
    expect(thu8.council.voting).toBe(false);
    expect(thu8.ordinanceWindow).toEqual({ fromDay: 20734, toDay: 20739 });
    expect(cycleOfKey('coalport:4146')).toBe(4146);
  });

  it('every offset over 30 days: phases 2 + 3, keys shared, windows at least a day', () => {
    for (const offset of Object.values(OFFSETS)) {
      for (let d = 20727; d < 20757; d++) {
        const c = councilDay(d, offset);
        const { start } = cycleOf(d, offset);
        expect(d - start).toBe(c.cycleDay);
        expect(c.phase).toBe(c.cycleDay <= 1 ? 'nominations' : 'polling');
        expect(c.election.cycle).toBe(c.council.cycle);
        expect(c.election.pollsFrom - c.election.nominationsFrom).toBeGreaterThanOrEqual(1);
        expect(c.election.countDay - c.election.pollsFrom).toBeGreaterThanOrEqual(1);
        expect(c.council.divideDay - c.council.fromDay).toBeGreaterThanOrEqual(1);
        expect(c.ordinanceWindow.toDay - c.ordinanceWindow.fromDay).toBe(5);
      }
    }
  });

  it('polls are open somewhere every day across the five offsets', () => {
    for (let d = 20727; d < 20757; d++) {
      const polling = Object.values(OFFSETS).filter((o) => councilDay(d, o).phase === 'polling');
      expect(polling.length).toBe(3);
    }
  });

  it('boundaryWork fires the count and the close/divide exactly once per cycle', () => {
    for (const offset of Object.values(OFFSETS)) {
      const counts: number[] = [];
      const closes: number[] = [];
      for (let d = 20727; d < 20757; d++) {
        const w = boundaryWork(d, offset);
        expect(w.close).toBe(w.divide);
        if (w.count) counts.push(cycleOf(d, offset).cycle);
        if (w.close) closes.push(cycleOf(d, offset).cycle);
      }
      expect(new Set(counts).size).toBe(counts.length);
      expect(new Set(closes).size).toBe(closes.length);
      expect(counts.length).toBe(6);
      expect(closes.length).toBe(6);
    }
  });

  it('the next nominations after today and the next polls day', () => {
    const o = OFFSETS.coalport;
    expect(nextNominationsAfter(20727, o)).toBe(20732);
    expect(nextNominationsAfter(20731, o)).toBe(20732);
    expect(nextNominationsAfter(20732, o)).toBe(20737);
    expect(nextPollsFrom(20727, o)).toBe(20729);
    expect(nextPollsFrom(20729, o)).toBe(20729);
    expect(nextPollsFrom(20730, o)).toBe(20734);
  });
});
