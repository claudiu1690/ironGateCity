/** Slice 4, T6 (tech design §6.10): the scoreboard, heroes, residence windows and refusals, the room. */
import { describe, expect, it } from 'vitest';
import {
  councilDay,
  heroes,
  levelBracket,
  moveWindows,
  registerRefusal,
  roomPrice,
  scoreboardLine,
  topByBracket,
} from '../src';
import type { ModifierSource, PlaceModifiers } from '../src';

describe('the scoreboard and heroes (design §11)', () => {
  it('brackets: 15/16, 30/31', () => {
    expect([1, 15, 16, 30, 31, 50].map(levelBracket)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('the line: rank among every contributor, ties by who reached it first', () => {
    const all = [
      { amount: 1300, lastAt: 5 },
      { amount: 900, lastAt: 1 },
      { amount: 900, lastAt: 3 },
      { amount: 50, lastAt: 9 },
    ];
    expect(scoreboardLine(all[2]!, all)).toEqual({ swing: 0.9, rank: 3, of: 4 });
    expect(scoreboardLine(all[1]!, all)).toEqual({ swing: 0.9, rank: 2, of: 4 });
    expect(scoreboardLine(all[0]!, all)).toEqual({ swing: 1.3, rank: 1, of: 4 });
    expect(scoreboardLine(null, all)).toBeNull();
    expect(scoreboardLine({ amount: 280, lastAt: 1 }, [{ amount: 280, lastAt: 1 }])).toEqual({
      swing: 0.28,
      rank: 1,
      of: 1,
    });
  });

  it('a hero per bracket only at +0.5 or more', () => {
    const rows = [
      { characterId: 'a', amount: 499, lastAt: 1, level: 10 },
      { characterId: 'b', amount: 600, lastAt: 2, level: 20 },
      { characterId: 'c', amount: 600, lastAt: 1, level: 25 },
      { characterId: 'd', amount: 2000, lastAt: 4, level: 40 },
    ];
    expect(heroes(rows)).toEqual([
      { bracket: 2, characterId: 'c', amount: 600 },
      { bracket: 3, characterId: 'd', amount: 2000 },
    ]);
    expect(heroes([{ characterId: 'e', amount: 500, lastAt: 1, level: 15 }])).toEqual([
      { bracket: 1, characterId: 'e', amount: 500 },
    ]);
    expect(topByBracket(rows, 1)).toEqual([
      { bracket: 1, rows: [rows[0]] },
      { bracket: 2, rows: [rows[2]] },
      { bracket: 3, rows: [rows[3]] },
    ]);
  });
});

describe('residence (design §7, ADR 0026)', () => {
  it('the windows on each cycle day: registered on day 0 or 1 votes this cycle, days 2–4 the next', () => {
    // Irongate, offset 0: Sun 4 Oct 2026 (20730) is cycle 4146's day 0.
    const offset = 0;
    for (let d = 20_730; d < 20_735; d++) {
      const { cycleDay, election } = councilDay(d, offset);
      const w = moveWindows(d, offset);
      const thisCycle = election.pollsFrom;
      expect([cycleDay, w.votesFromDay]).toEqual([cycleDay, cycleDay <= 1 ? thisCycle : thisCycle + 5]);
      expect(w.standsFromDay).toBe(20_735);
      expect(w.canMoveFromDay).toBe(d + 7);
    }
  });

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

  it('every refusal, in order', () => {
    expect(registerRefusal(base)).toBeNull();
    expect(registerRefusal({ ...base, inTransit: true, rank: 1 })).toBe('IN_TRANSIT');
    expect(registerRefusal({ ...base, target: { cityId: 'duskwall', districtId: null } })).toBe(
      'DESTINATION_LOCKED',
    );
    expect(registerRefusal({ ...base, here: 'coalport' })).toBe('NOT_IN_CITY');
    expect(registerRefusal({ ...base, rank: 1 })).toBe('RANK_TOO_LOW');
    expect(registerRefusal({ ...base, canMoveFromDay: 20_741 })).toBe('MOVE_COOLDOWN');
    expect(
      registerRefusal({ ...base, residence: { cityId: 'irongate', districtId: 'irongate.eastside' } }),
    ).toBe('ALREADY_RESIDENT');
    expect(registerRefusal({ ...base, iron: 499 })).toBe('NOT_ENOUGH_IRON');
    // Another district, and the way home.
    expect(
      registerRefusal({ ...base, residence: { cityId: 'irongate', districtId: 'irongate.old-town' } }),
    ).toBeNull();
    expect(
      registerRefusal({
        ...base,
        here: 'coalport',
        target: { cityId: 'coalport', districtId: null },
        residence: { cityId: 'irongate', districtId: 'irongate.eastside' },
      }),
    ).toBeNull();
  });

  it('the room: 100, Eviction Notices 50', () => {
    expect(roomPrice()).toEqual({ base: 100, lines: [], total: 100 });
    const evictions: ModifierSource = {
      id: 'issue.evictions',
      name: 'Eviction Notices in Eastside',
      kind: 'issue',
      effects: [{ kind: 'roomPct', value: -50 }],
    };
    const m: PlaceModifiers = { sources: [evictions], firedUp: false };
    expect(roomPrice(m)).toEqual({
      base: 100,
      lines: [{ id: 'issue.evictions', label: 'Eviction Notices in Eastside', pct: -50 }],
      total: 50,
    });
  });
});
