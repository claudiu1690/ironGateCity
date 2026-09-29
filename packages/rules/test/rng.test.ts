import { describe, expect, it } from 'vitest';
import { createRng } from '../src';

describe('createRng', () => {
  it('is deterministic: the same seed gives the same sequence', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-1');
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(a.seed).toBe('seed-1');
  });

  it('gives different sequences for different seeds', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-2');
    expect(Array.from({ length: 5 }, () => a.roll100())).not.toEqual(
      Array.from({ length: 5 }, () => b.roll100()),
    );
  });

  it('next() stays in [0, 1)', () => {
    const rng = createRng('range');
    for (let i = 0; i < 10_000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('roll100() is roughly uniform over 1..100 across 10k rolls', () => {
    const rng = createRng('uniformity');
    const counts = new Array<number>(101).fill(0);
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const r = rng.roll100();
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(100);
      counts[r]!++;
    }
    // Every face appears; no face is wildly off its expected 100.
    for (let face = 1; face <= 100; face++) {
      expect(counts[face]).toBeGreaterThan(50);
      expect(counts[face]).toBeLessThan(160);
    }
    // Chi-square with 99 degrees of freedom: 99.9th percentile is about 148.
    const expected = n / 100;
    const chi2 = counts.slice(1).reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(148);
  });

  it('int() is inclusive on both ends and rejects bad ranges', () => {
    const rng = createRng('ints');
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) seen.add(rng.int(3, 5));
    expect([...seen].sort()).toEqual([3, 4, 5]);
    expect(rng.int(7, 7)).toBe(7);
    expect(() => rng.int(5, 3)).toThrow(RangeError);
    expect(() => rng.int(0.5, 3)).toThrow(RangeError);
  });
});
