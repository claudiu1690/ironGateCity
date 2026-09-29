import { describe, expect, it } from 'vitest';
import { createRng, resolveTier1Action } from '../src';
import type { Tier1ActionInput } from '../src';

const T0 = 1_790_000_000_000;

const input = (over: Partial<Tier1ActionInput> = {}): Tier1ActionInput => ({
  action: { energy: 10, stat: 'int', givesFxp: true, givesOpinion: true },
  cityRole: 'home',
  stats: { str: 10, int: 12, agi: 5, cha: 2 },
  energy: { value: 100, rested: 0, updatedAt: T0 },
  now: T0,
  times: 1,
  ...over,
});

describe('resolveTier1Action', () => {
  it('replays: same seed + same input ⇒ identical resolution', () => {
    const a = resolveTier1Action(input(), createRng('abc'));
    const b = resolveTier1Action(input(), createRng('abc'));
    expect(a).toEqual(b);
  });

  it('spends Energy, rolls once against the 66 % home canvass and pays by outcome', () => {
    const r = resolveTier1Action(input(), createRng('abc'));
    if (!r.ok) throw new Error('expected ok');
    const { resolution } = r;
    expect(resolution.seed).toBe('abc');
    expect(resolution.attempts).toHaveLength(1);
    const attempt = resolution.attempts[0]!;
    expect(attempt.index).toBe(1);
    expect(attempt.check.chance).toBe(66);
    expect(attempt.roll).toBe(createRng('abc').roll100());
    expect(resolution.outcome).toBe(attempt.roll <= 66 ? 'success' : 'partial');
    expect(resolution.energy.before.value).toBe(100);
    expect(resolution.energy.after).toEqual({ value: 90, rested: 0, updatedAt: T0 });
    expect(resolution.energy.cost).toBe(10);
    const xp = resolution.outcome === 'success' ? 45 : 23;
    expect(resolution.rewards.xp.total).toBe(xp);
  });

  it('produces both outcomes across seeds, and never a Failure', () => {
    const outcomes = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const r = resolveTier1Action(input(), createRng(`s${i}`));
      if (r.ok) outcomes.add(r.resolution.outcome);
    }
    expect(outcomes).toEqual(new Set(['success', 'partial']));
  });

  it('uses 10 in a battleground and passes bonuses through', () => {
    const r = resolveTier1Action(
      input({ cityRole: 'battleground', bonuses: [{ id: 'standing', label: 'Known', value: 6 }] }),
      createRng('x'),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.attempts[0]!.check.chance).toBe(50 + 4 * 2 + 6);
  });

  it('projects lazy Energy first and spends Rested with it', () => {
    // 90 Energy stored an hour ago: +30 → 100 with 20 overflowing into Rested.
    const r = resolveTier1Action(
      input({ energy: { value: 90, rested: 0, updatedAt: T0 - 60 * 60_000 } }),
      createRng('y'),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.energy.before).toMatchObject({ value: 100, rested: 20 });
    expect(r.resolution.energy.restedUsed).toBe(10);
    expect(r.resolution.energy.after).toEqual({ value: 90, rested: 10, updatedAt: T0 });
    expect(r.resolution.rewards.xp.bonus).toBeGreaterThan(0);
  });

  it('refuses without rolling when Energy is short', () => {
    const rng = createRng('z');
    const r = resolveTier1Action(input({ energy: { value: 4, rested: 0, updatedAt: T0 } }), rng);
    expect(r).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_ENERGY', shortBy: 6 });
    if (r.ok) throw new Error('expected refusal');
    expect(r.energy.nextTickAt).toBe(T0 + 10 * 60_000);
    // The RNG was not advanced: its first roll is still the one a fresh RNG gives.
    expect(rng.roll100()).toBe(createRng('z').roll100());
  });
});
