import { describe, expect, it } from 'vitest';
import { ENERGY, RESTED, projectEnergy, spendEnergy } from '../src';

const MIN = 60_000;
const T0 = 1_790_000_000_000;

describe('projectEnergy', () => {
  it('adds nothing at 0 minutes', () => {
    const p = projectEnergy({ value: 40, rested: 0, updatedAt: T0 }, T0);
    expect(p).toEqual({
      value: 40,
      rested: 0,
      updatedAt: T0,
      max: 100,
      nextTickAt: T0 + 10 * MIN,
      fullAt: T0 + 12 * 10 * MIN,
    });
  });

  it('adds nothing before the first whole tick (1 min, 9.99 min)', () => {
    expect(projectEnergy({ value: 40, rested: 0, updatedAt: T0 }, T0 + MIN).value).toBe(40);
    expect(projectEnergy({ value: 40, rested: 0, updatedAt: T0 }, T0 + 10 * MIN - 1).value).toBe(40);
  });

  it('adds +5 per whole 10-minute tick and keeps the remainder (19.99 min → 1 tick, 20 min → 2)', () => {
    const at1999 = projectEnergy({ value: 40, rested: 0, updatedAt: T0 }, T0 + 20 * MIN - 600);
    expect(at1999.value).toBe(45);
    expect(at1999.updatedAt).toBe(T0 + 10 * MIN);
    expect(at1999.nextTickAt).toBe(T0 + 20 * MIN);

    const at20 = projectEnergy({ value: 40, rested: 0, updatedAt: T0 }, T0 + 20 * MIN);
    expect(at20.value).toBe(50);
    expect(at20.updatedAt).toBe(T0 + 20 * MIN);
    expect(at20.nextTickAt).toBe(T0 + 30 * MIN);
    expect(at20.fullAt).toBe(T0 + 20 * MIN + 10 * 10 * MIN);
  });

  it('is composable: projecting twice equals projecting once', () => {
    const s = { value: 12, rested: 3, updatedAt: T0 };
    const once = projectEnergy(s, T0 + 437 * MIN);
    const mid = projectEnergy(s, T0 + 123 * MIN);
    const twice = projectEnergy(mid, T0 + 437 * MIN);
    expect(twice).toEqual(once);
  });

  it('overflows only the part above max into Rested', () => {
    // 95 + 3 ticks (15) = 110 → 100 and 10 Rested.
    const p = projectEnergy({ value: 95, rested: 0, updatedAt: T0 }, T0 + 30 * MIN);
    expect(p.value).toBe(100);
    expect(p.rested).toBe(10);
    expect(p.nextTickAt).toBeNull();
    expect(p.fullAt).toBeNull();
  });

  it('sends every tick to Rested while full', () => {
    const p = projectEnergy({ value: 100, rested: 20, updatedAt: T0 }, T0 + 60 * MIN);
    expect(p.value).toBe(100);
    expect(p.rested).toBe(50);
    expect(p.updatedAt).toBe(T0 + 60 * MIN);
  });

  it('never takes Energy away when above max', () => {
    const p = projectEnergy({ value: 110, rested: 0, updatedAt: T0 }, T0 + 10 * MIN);
    expect(p.value).toBe(110);
    expect(p.rested).toBe(5);
  });

  it('caps Energy at max and Rested at its cap', () => {
    const p = projectEnergy({ value: 0, rested: 0, updatedAt: T0 }, T0 + 30 * 24 * 60 * MIN);
    expect(p.value).toBe(ENERGY.max);
    expect(p.rested).toBe(RESTED.cap);
  });

  it('honours a custom max (Premium 120)', () => {
    const p = projectEnergy({ value: 100, rested: 0, updatedAt: T0 }, T0 + 10 * MIN, 120);
    expect(p.value).toBe(105);
    expect(p.max).toBe(120);
    expect(p.fullAt).toBe(T0 + 10 * MIN + 3 * 10 * MIN);
  });

  it('is full from empty in 3h20 (§6.2)', () => {
    const p = projectEnergy({ value: 0, rested: 0, updatedAt: T0 }, T0);
    expect(p.fullAt! - T0).toBe(200 * MIN);
  });

  it('ignores a clock that runs backwards', () => {
    const p = projectEnergy({ value: 40, rested: 0, updatedAt: T0 }, T0 - 30 * MIN);
    expect(p.value).toBe(40);
    expect(p.updatedAt).toBe(T0);
  });

  it('rounds fullAt up to the tick that completes the bar', () => {
    const p = projectEnergy({ value: 97, rested: 0, updatedAt: T0 }, T0);
    expect(p.fullAt).toBe(T0 + 10 * MIN);
  });
});

describe('spendEnergy', () => {
  const at = (value: number, rested = 0) => projectEnergy({ value, rested, updatedAt: T0 }, T0);

  it('spends the exact cost', () => {
    const r = spendEnergy(at(10), 10);
    expect(r).toEqual({ ok: true, restedUsed: 0, state: { value: 0, rested: 0, updatedAt: T0 } });
  });

  it('refuses when Energy is short, saying by how much', () => {
    expect(spendEnergy(at(4), 10)).toEqual({ ok: false, reason: 'NOT_ENOUGH_ENERGY', shortBy: 6 });
  });

  it('uses one Rested per Energy point while Rested lasts', () => {
    const full = spendEnergy(at(100, 50), 10);
    expect(full).toMatchObject({ ok: true, restedUsed: 10, state: { value: 90, rested: 40 } });
    const partial = spendEnergy(at(100, 3), 10);
    expect(partial).toMatchObject({ ok: true, restedUsed: 3, state: { value: 90, rested: 0 } });
  });

  it('keeps the projection timestamp (the part-tick remainder survives a spend)', () => {
    const p = projectEnergy({ value: 50, rested: 0, updatedAt: T0 }, T0 + 15 * MIN);
    const r = spendEnergy(p, 10);
    expect(r.ok && r.state.updatedAt).toBe(T0 + 10 * MIN);
  });
});
