/**
 * Review 4, T19 (docs/tech/review-4.md §6.2, ADR 0075): the journey on the nation map. The legs, the
 * pin's place at a moment, and the card's moment.
 */
import { describe, expect, it } from 'vitest';
import { CARD_AT, createRng, drawCardAt, journeyLegs, legSpans, trainAt } from '../src';
import type { Pt } from '../src';

const CAPITAL: Pt = [0.5, 0.5];
const routes = [
  { to: 'west', points: [CAPITAL, [0.4, 0.5], [0.3, 0.45], [0.1, 0.4]] as Pt[] },
  { to: 'east', points: [CAPITAL, [0.6, 0.5], [0.7, 0.6], [0.9, 0.6]] as Pt[] },
];
const minutes: Record<string, number> = { west: 12, east: 15 };
const minutesOf = (id: string) => minutes[id]!;
const near = (a: { x: number; y: number }, b: Pt) => {
  expect(a.x).toBeCloseTo(b[0], 9);
  expect(a.y).toBeCloseTo(b[1], 9);
};

describe('journeyLegs', () => {
  it('out of the capital: the leg as stored', () => {
    const legs = journeyLegs(routes, 'cap', 'west', 'cap', minutesOf);
    expect(legs).toHaveLength(1);
    expect(legs[0]!.points).toEqual(routes[0]!.points);
    expect(legs[0]!.minutes).toBe(12);
  });

  it('into the capital: the leg reversed', () => {
    const legs = journeyLegs(routes, 'east', 'cap', 'cap', minutesOf);
    expect(legs[0]!.points).toEqual([...routes[1]!.points].reverse());
    expect(legs[0]!.minutes).toBe(15);
  });

  it('outer to outer: the first leg reversed into the capital, then the second', () => {
    const legs = journeyLegs(routes, 'west', 'east', 'cap', minutesOf);
    expect(legs.map((l) => l.minutes)).toEqual([12, 15]);
    expect(legs[0]!.points.at(-1)).toEqual(CAPITAL);
    expect(legs[1]!.points[0]).toEqual(CAPITAL);
    expect(legs[0]!.points[0]).toEqual([0.1, 0.4]);
    expect(legs[1]!.points.at(-1)).toEqual([0.9, 0.6]);
  });

  it('nowhere to go: no legs; an unknown city throws', () => {
    expect(journeyLegs(routes, 'west', 'west', 'cap', minutesOf)).toEqual([]);
    expect(() => journeyLegs(routes, 'cap', 'north', 'cap', minutesOf)).toThrow(RangeError);
  });
});

describe('trainAt', () => {
  it('0 is the origin pin and 1 the destination pin', () => {
    for (const [from, to] of [
      ['cap', 'west'],
      ['east', 'cap'],
      ['west', 'east'],
    ] as const) {
      const legs = journeyLegs(routes, from, to, 'cap', minutesOf);
      near(trainAt(legs, 0), legs[0]!.points[0]!);
      near(trainAt(legs, 1), legs.at(-1)!.points.at(-1)!);
    }
  });

  it('progress outside 0–1 is clamped', () => {
    const legs = journeyLegs(routes, 'cap', 'east', 'cap', minutesOf);
    expect(trainAt(legs, -1)).toEqual(trainAt(legs, 0));
    expect(trainAt(legs, 2)).toEqual(trainAt(legs, 1));
  });

  it('moves monotonically along the arc', () => {
    const legs = journeyLegs(routes, 'west', 'east', 'cap', minutesOf);
    // Distance walked along the polylines, measured by projecting each position.
    const walked = (p: { x: number; y: number; leg: number }) => {
      let d = 0;
      for (let i = 0; i < p.leg; i++) {
        const pts = legs[i]!.points;
        for (let k = 0; k < pts.length - 1; k++)
          d += Math.hypot(pts[k + 1]![0] - pts[k]![0], pts[k + 1]![1] - pts[k]![1]);
      }
      const pts = legs[p.leg]!.points;
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k]!;
        const b = pts[k + 1]!;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const t = ((p.x - a[0]) * (b[0] - a[0]) + (p.y - a[1]) * (b[1] - a[1])) / (len * len);
        const onSeg = Math.hypot(a[0] + (b[0] - a[0]) * t - p.x, a[1] + (b[1] - a[1]) * t - p.y) < 1e-9;
        if (onSeg && t >= -1e-9 && t <= 1 + 1e-9) return d + t * len;
        d += len;
      }
      return d;
    };
    let last = -1;
    for (let i = 0; i <= 200; i++) {
      const w = walked(trainAt(legs, i / 200));
      expect(w).toBeGreaterThanOrEqual(last - 1e-9);
      last = w;
    }
  });

  it('two legs of 12 + 15 minutes reach the capital at 12/27 (§23.1 Q8: by minutes)', () => {
    const legs = journeyLegs(routes, 'west', 'east', 'cap', minutesOf);
    const at = trainAt(legs, 12 / 27);
    near(at, CAPITAL);
    expect(at.leg).toBe(0);
    expect(trainAt(legs, 12 / 27 + 0.001).leg).toBe(1);
    expect(legSpans(legs)).toEqual([
      { fromT: 0, toT: 12 / 27 },
      { fromT: 12 / 27, toT: 1 },
    ]);
  });

  it('within a leg the pin moves by length: halfway in time is halfway along', () => {
    const legs = [{ points: [[0, 0], [0.1, 0], [0.4, 0]] as Pt[], minutes: 10 }];
    near(trainAt(legs, 0.5), [0.2, 0]);
    expect(trainAt(legs, 0.5).angle).toBe(0);
    expect(trainAt([{ points: [[0, 0], [0, 0.4]] as Pt[], minutes: 5 }], 0.5).angle).toBe(90);
  });

  it('a reversed leg is the same path, walked the other way', () => {
    const out = journeyLegs(routes, 'cap', 'east', 'cap', minutesOf);
    const back = journeyLegs(routes, 'east', 'cap', 'cap', minutesOf);
    for (let i = 0; i <= 20; i++) {
      const a = trainAt(out, i / 20);
      const b = trainAt(back, 1 - i / 20);
      expect(a.x).toBeCloseTo(b.x, 9);
      expect(a.y).toBeCloseTo(b.y, 9);
    }
  });
});

describe('drawCardAt', () => {
  const boardedAt = Date.UTC(2026, 9, 7, 14, 10, 0);
  const arrivesAt = boardedAt + 12 * 60_000;
  const span = arrivesAt - boardedAt;

  it('over 10,000 seeds: every moment in [0.20, 0.80] of the window, whole seconds, the mean 0.50 ± 0.01', () => {
    let sum = 0;
    for (let i = 0; i < 10_000; i++) {
      const at = drawCardAt(createRng(`seed-${i}:cardAt`), boardedAt, arrivesAt);
      const f = (at - boardedAt) / span;
      expect(f).toBeGreaterThanOrEqual(CARD_AT.from);
      expect(f).toBeLessThanOrEqual(CARD_AT.to);
      expect(at % 1_000).toBe(0);
      sum += f;
    }
    expect(Math.abs(sum / 10_000 - 0.5)).toBeLessThanOrEqual(0.01);
  });

  it('one seed always gives the same moment', () => {
    const a = drawCardAt(createRng('abc:cardAt'), boardedAt, arrivesAt);
    expect(drawCardAt(createRng('abc:cardAt'), boardedAt, arrivesAt)).toBe(a);
  });
});
