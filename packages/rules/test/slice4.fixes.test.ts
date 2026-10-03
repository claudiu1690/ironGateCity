import { describe, expect, it } from 'vitest';
import { ROOM, TRAINING_VERB_ORDER, registerRefusal, roomTap, verbsPhrase } from '../src';

/**
 * The slice-4 fix round (docs/design/slice-4-fixes.md): a candidate on the ballot where they live
 * cannot move until the result (§1, QA M2); the room's renewal adds seven nights (§6, QA m5); the
 * training order's `{verbs}` (§2, QA m1).
 */

const base = {
  rank: 2,
  iron: 600,
  cost: 500,
  today: 20_740,
  canMoveFromDay: 0,
  here: 'irongate',
  target: { cityId: 'irongate', districtId: 'irongate.eastside' },
  residence: { cityId: 'coalport', districtId: null },
  homeCityId: 'coalport',
  capitalId: 'irongate',
  inTransit: false,
};

describe('ON_BALLOT (slice-4 fixes §1)', () => {
  it('after the cooldown and before the Iron: here → below rank → cooldown → on ballot → no Iron', () => {
    expect(registerRefusal({ ...base, onBallot: true })).toBe('ON_BALLOT');
    expect(registerRefusal({ ...base, onBallot: true, iron: 0 })).toBe('ON_BALLOT');
    expect(registerRefusal({ ...base, onBallot: true, canMoveFromDay: base.today + 1 })).toBe('MOVE_COOLDOWN');
    expect(registerRefusal({ ...base, onBallot: true, rank: 1 })).toBe('RANK_TOO_LOW');
    expect(
      registerRefusal({
        ...base,
        onBallot: true,
        residence: { cityId: 'irongate', districtId: 'irongate.eastside' },
      }),
    ).toBe('ALREADY_RESIDENT');
    expect(registerRefusal({ ...base, onBallot: false })).toBeNull();
  });
});

describe('the room (slice-4 fixes §6)', () => {
  const D = 20_740;

  it('no room, or one that has ended: seven nights from today', () => {
    expect(roomTap(null, D)).toEqual({ kind: 'take', fromDay: D, untilDay: D + 7 });
    expect(roomTap({ fromDay: D - 9, untilDay: D - 2 }, D)).toEqual({ kind: 'take', fromDay: D, untilDay: D + 7 });
    expect(roomTap({ fromDay: D - 7, untilDay: D }, D)).toEqual({ kind: 'take', fromDay: D, untilDay: D + 7 });
  });

  it('running with seven or fewer nights left: seven more at its end, never a restart', () => {
    expect(roomTap({ fromDay: D, untilDay: D + 7 }, D)).toEqual({ kind: 'renew', fromDay: D, untilDay: D + 14 });
    expect(roomTap({ fromDay: D - 5, untilDay: D + 2 }, D)).toEqual({
      kind: 'renew',
      fromDay: D - 5,
      untilDay: D + 9,
    });
  });

  it('more than seven nights left: paid ahead, renew from the day seven remain (at most fourteen paid)', () => {
    expect(roomTap({ fromDay: D, untilDay: D + 14 }, D)).toEqual({ kind: 'paidAhead', renewFromDay: D + 7 });
    expect(roomTap({ fromDay: D, untilDay: D + 8 }, D)).toEqual({ kind: 'paidAhead', renewFromDay: D + 1 });
    // Any day of any room: what a tap buys never leaves more than fourteen nights paid.
    for (let from = D - 10; from <= D; from++)
      for (let len = 1; len <= 14; len++) {
        const t = roomTap({ fromDay: from, untilDay: from + len }, D);
        if (t.kind !== 'paidAhead') expect(t.untilDay - D).toBeLessThanOrEqual(2 * ROOM.days);
      }
  });
});

describe('the training order’s {verbs} (slice-4 fixes §2)', () => {
  it('the fixed order, at most three, the first capitalised, joined "a, b or c"', () => {
    expect(TRAINING_VERB_ORDER).toEqual(['Study', 'Lift', 'Unload', 'Carry', 'Run']);
    // Coalport and Duskwall; Ashford; Irongate; a Vanguard member in Irongate (the gymnasium).
    expect(verbsPhrase(['Run', 'Lift', 'Study', 'Run'])).toBe('Study, lift or run');
    expect(verbsPhrase(['Unload', 'Study', 'Run'])).toBe('Study, unload or run');
    expect(verbsPhrase(['Study', 'Carry', 'Run', 'Run'])).toBe('Study, carry or run');
    expect(verbsPhrase(['Study', 'Carry', 'Run', 'Lift'])).toBe('Study, lift or carry');
    expect(verbsPhrase(['Run'])).toBe('Run');
    expect(verbsPhrase(['Run', 'Study'])).toBe('Study or run');
    expect(verbsPhrase([])).toBe('');
  });
});
