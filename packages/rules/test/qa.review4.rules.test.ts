/**
 * QA, review 4 (docs/qa/review-4-report.md): the review-4 rules against reference models written
 * from the GDD's words, over every case rather than examples. The sentence (GDD §19.2: 20 + Heat ÷ 2,
 * at most 60, ×1.5 on rival ground, at most 60), the arrest's own mark and the seven-day escalation
 * (§11.2), bail with the arrest's mark, the card's moment (§14.10: 0.20–0.80 of the journey), the pin
 * on a two-leg journey (continuous through the capital, time split by minutes), and the place rule
 * (`town-hall` always open).
 */
import { describe, expect, it } from 'vitest';
import {
  CELLS,
  MISSION_TYPES,
  RECORD,
  bailFor,
  closeOrders,
  createRng,
  drawCardAt,
  legSpans,
  marksFor,
  placeOpen,
  sentenceMinutes,
  trainAt,
} from '../src';
import type { MissionType, OrdersState, RouteLeg } from '../src';

describe('the sentence, every Heat (GDD §19.2, ADR 0078)', () => {
  const ref = (heat: number, rival: boolean) => Math.min(60, Math.floor((20 + Math.floor(heat / 2)) * (rival ? 1.5 : 1)));
  it('0–100 at home and on rival ground equals 20 + ⌊Heat ÷ 2⌋, ×1.5 on rival ground, at most 60', () => {
    expect([CELLS.baseMinutes, CELLS.maxMinutes, CELLS.rivalFactor]).toEqual([20, 60, 1.5]);
    for (let h = 0; h <= 100; h++) {
      expect(sentenceMinutes(h, false), `heat ${h}`).toBe(ref(h, false));
      expect(sentenceMinutes(h, true), `heat ${h} rival`).toBe(ref(h, true));
      expect(sentenceMinutes(h, false)).toBeGreaterThanOrEqual(20);
    }
  });
  it('the answers’ examples: Hot at 58 is 49 minutes, still 60 on rival ground (answers §20.1)', () => {
    expect(sentenceMinutes(58, false)).toBe(49);
    expect(sentenceMinutes(58, true)).toBe(60);
  });
});

describe('an arrest is always on the record (GDD §11.2, answers §20.1)', () => {
  const TYPES = Object.keys(MISSION_TYPES) as MissionType[];
  const DAY = 20_730;
  /** The reference: the type's marks; an arrest with none is one minor; an arrest within 0–6 days of any earlier arrest is three serious. */
  const ref = (type: MissionType | null, arrested: boolean, arrests: number[]) => {
    const spec = type ? MISSION_TYPES[type] : null;
    const carries = !!spec && spec.marks > 0 && spec.markKind !== null;
    if (!arrested) return carries ? { n: spec!.marks, kind: spec!.markKind } : { n: 0, kind: null };
    if (arrests.some((d) => DAY - d >= 0 && DAY - d <= 6)) return { n: 3, kind: 'serious' };
    return carries ? { n: spec!.marks, kind: spec!.markKind } : { n: 1, kind: 'minor' };
  };
  it('every type (and a tap), arrested or not, with an earlier arrest 0–12 days before or none', () => {
    expect([RECORD.arrestMarks, RECORD.escalatedMarks, RECORD.escalateWithinDays]).toEqual([1, 3, 7]);
    for (const type of [null, ...TYPES]) {
      for (const arrested of [false, true]) {
        for (const ago of [null, 0, 1, 3, 6, 7, 8, 12]) {
          const arrests = ago === null ? [] : [DAY - ago];
          const m = marksFor({ type, arrested, arrests, today: DAY, logId: null });
          const want = ref(type, arrested, arrests);
          const label = `${type} arrested=${arrested} ago=${ago}`;
          expect(m.add.length, label).toBe(want.n);
          if (want.n > 0) expect(new Set(m.add.map((x) => x.kind)), label).toEqual(new Set([want.kind]));
          if (arrested) expect(m.add.length, `${label}: an arrest is never markless`).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe('bail with the arrest’s own mark (economy §24.3, deviation 35)', () => {
  it('a first arrest on legal work: 150 Iron; 80 with Legal Aid; 300 on rival ground', () => {
    const one = (o: Partial<Parameters<typeof bailFor>[0]>) =>
      bailFor({ marks: 1, notorious: false, rivalGround: false, alliance: false, ...o }).total;
    expect(one({})).toBe(150);
    expect(one({ alliance: true })).toBe(80);
    expect(one({ rivalGround: true })).toBe(300);
  });
});

describe('the card’s moment (GDD §14.10, ADR 0075)', () => {
  it('journeys of 7 to 60 minutes, 2,000 seeds each: always inside [0.20, 0.80] of the journey', () => {
    for (const minutes of [7, 12, 15, 25, 27, 40, 60]) {
      const boardedAt = Date.UTC(2026, 9, 7, 14, 0, 13, 417);
      const arrivesAt = boardedAt + minutes * 60_000;
      for (let s = 0; s < 2_000; s++) {
        const at = drawCardAt(createRng(`qa-${minutes}-${s}:cardAt`), boardedAt, arrivesAt);
        const f = (at - boardedAt) / (arrivesAt - boardedAt);
        expect(f, `${minutes} min seed ${s}`).toBeGreaterThanOrEqual(0.2);
        expect(f, `${minutes} min seed ${s}`).toBeLessThanOrEqual(0.8);
      }
    }
  });
});

describe('the pin on the route (answers §7.1, §29 Q8)', () => {
  const capital: [number, number] = [0.5, 0.5];
  const legA: RouteLeg = { points: [[0.1, 0.9], [0.3, 0.7], capital], minutes: 12 };
  const legB: RouteLeg = { points: [capital, [0.7, 0.4], [0.9, 0.1]], minutes: 15 };
  it('a two-leg journey reaches the capital at 12 / 27 and never jumps (continuous at 1 / 10,000 steps)', () => {
    const legs = [legA, legB];
    const spans = legSpans(legs);
    expect(spans[0]!.toT).toBeCloseTo(12 / 27, 10);
    expect(spans[1]).toEqual({ fromT: spans[0]!.toT, toT: 1 });
    const at = trainAt(legs, 12 / 27);
    expect(at.x).toBeCloseTo(0.5, 12);
    expect(at.y).toBeCloseTo(0.5, 12);
    let prev = trainAt(legs, 0);
    expect([prev.x, prev.y]).toEqual([0.1, 0.9]);
    for (let i = 1; i <= 10_000; i++) {
      const p = trainAt(legs, i / 10_000);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y), `step ${i}`).toBeLessThan(0.001);
      prev = p;
    }
    expect(prev.x).toBeCloseTo(0.9, 12);
    expect(prev.y).toBeCloseTo(0.1, 12);
  });
});

describe('places open (answers §11.1, §21; ADR 0076–0077)', () => {
  it('a town hall is open at every Level in every kind of quarter; nothing else in a locked quarter is', () => {
    const quarters: Array<{ opens?: { level?: number; edition?: string } }> = [
      { opens: undefined },
      { opens: { level: 6 } },
      { opens: { level: 10 } },
      { opens: { edition: 'later' } },
    ];
    for (const q of quarters) {
      for (let level = 1; level <= 12; level++) {
        expect(placeOpen({ quarter: q as never, kind: 'town-hall', level }).open, JSON.stringify(q)).toBe(true);
        const other = placeOpen({ quarter: q as never, kind: 'bar', level }).open;
        const want = !q.opens ? true : q.opens.level !== undefined ? level >= q.opens.level : false;
        expect(other, `${JSON.stringify(q)} L${level}`).toBe(want);
      }
    }
  });
});

describe('orders off (answers §20.1)', () => {
  it('closing twice keeps the first moment and changes no item', () => {
    const o: OrdersState = {
      day: 20_730,
      items: [{ templateId: 'a', progress: 1, target: 2, doneAt: null }],
      allDoneAt: null,
    } as unknown as OrdersState;
    const once = closeOrders(o, 1_000);
    const twice = closeOrders(once, 2_000);
    expect(twice).toEqual(once);
    expect(twice.off).toEqual({ at: 1_000, reason: 'cells' });
    expect(twice.items).toEqual(o.items);
  });
});
