/**
 * Review 5, T1 (docs/tech/review-5.md §3.1, §3.4; ADR 0079, 0080): the six-hour game day (night the
 * last two hours of every six, 00:00 UTC a dawn) and the night on rival ground while acting (the
 * tier-1 base 25, a mission's +10 after its ×2, the police half the pool).
 */
import { describe, expect, it } from 'vitest';
import {
  GAME_DAY_HOURS,
  NIGHT_HOURS,
  RUN_IN,
  createRng,
  dayKey,
  dayStart,
  gameDayStart,
  isNight,
  missionRisk,
  nextDawn,
  nextDusk,
  nightKey,
  pickOpponent,
  resolveMission,
  runInChance,
} from '../src';
import type { HeatState, MissionInput, PlaceModifiers } from '../src';
import { NAMES, TEMPLATES } from './helpers';

const H = 3_600_000;
const M = 60_000;
const D = Date.UTC(2026, 9, 8);
const at = (h: number, m = 0) => D + h * H + m * M;

describe('the six-hour game day (§2.2, ADR 0079)', () => {
  it('six hours, two of them night', () => {
    expect([GAME_DAY_HOURS, NIGHT_HOURS]).toEqual([6, 2]);
  });

  it('the table: dusk inclusive, dawn exclusive', () => {
    const table: Array<[number, number, boolean]> = [
      [3, 59, false],
      [4, 0, true],
      [5, 59, true],
      [6, 0, false],
      [21, 59, false],
      [22, 0, true],
      [23, 59, true],
      [0, 0, false],
    ];
    for (const [h, m, night] of table) expect([h, m, isNight(at(h, m))]).toEqual([h, m, night]);
    expect(isNight(at(4) - 1)).toBe(false);
    expect(isNight(at(6) - 1)).toBe(true);
  });

  it('nextDusk: at 03:00 → 04:00, at 04:00 → 10:00, at 23:00 → 04:00 the next day', () => {
    expect(nextDusk(at(3))).toBe(at(4));
    expect(nextDusk(at(4))).toBe(at(10));
    expect(nextDusk(at(23))).toBe(at(28));
    expect(nextDusk(at(16) - 1)).toBe(at(16));
  });

  it('nextDawn: at 05:00 → 06:00, at 01:00 → 06:00, at 22:30 → 00:00', () => {
    expect(nextDawn(at(5))).toBe(at(6));
    expect(nextDawn(at(1))).toBe(at(6));
    expect(nextDawn(at(22, 30))).toBe(at(24));
    expect(nextDawn(at(6))).toBe(at(12));
  });

  it('gameDayStart and nightKey: one key per night, null by day', () => {
    expect(gameDayStart(at(17, 30))).toBe(at(12));
    expect(nightKey(at(15, 59))).toBeNull();
    const k = nightKey(at(16));
    expect(k).not.toBeNull();
    expect(nightKey(at(17, 59))).toBe(k);
    expect(nightKey(at(22))).toBe(k! + 1);
    expect(nightKey(at(28))).toBe(k! + 2);
  });

  it('over any real day the night totals 8 h in 4 windows (a sweep at one-minute steps)', () => {
    for (const start of [D, D + 37 * M, Date.UTC(2026, 11, 31, 13, 11)]) {
      let minutes = 0;
      let windows = 0;
      let was = isNight(start - M);
      for (let t = start; t < start + 24 * H; t += M) {
        const n = isNight(t);
        if (n) minutes++;
        if (n && !was) windows++;
        was = n;
      }
      expect(minutes).toBe(8 * 60);
      expect(windows).toBe(4);
    }
  });

  it('the City Day boundary is always a dawn; no night crosses a dayKey change', () => {
    expect(nextDawn(at(22, 30))).toBe(dayStart(dayKey(at(22, 30)) + 1));
    for (let t = D; t < D + 3 * 24 * H; t += 7 * M) {
      if (!isNight(t)) continue;
      expect(dayKey(nextDawn(t) - 1)).toBe(dayKey(t));
      expect(isNight(dayStart(dayKey(t) + 1))).toBe(false);
    }
  });

  it('nextDusk and nextDawn are strictly after now, and changes alternate', () => {
    for (let t = D; t < D + 24 * H; t += 13 * M) {
      expect(nextDusk(t)).toBeGreaterThan(t);
      expect(nextDawn(t)).toBeGreaterThan(t);
      const change = isNight(t) ? nextDawn(t) : nextDusk(t);
      expect(isNight(change)).toBe(!isNight(t));
      expect(isNight(change - 1)).toBe(isNight(t));
    }
  });
});

const noFlags = { watched: false, warned: false };
const tap = (over: Partial<Parameters<typeof runInChance>[0]> = {}) =>
  runInChance({ base: 0, tier: 1, rivalGround: true, heatState: 'cool', record: 'clean', flags: noFlags, ...over });

describe('the night on rival ground while acting (§14.12, ADR 0080)', () => {
  it('the constants', () => {
    expect([RUN_IN.rivalTier1, RUN_IN.rivalTier1Night, RUN_IN.rivalNightAdd]).toEqual([15, 25, 10]);
  });

  it('tier 1 on rival ground: 15 by day, 25 at night; Hot at night 25 + 15 = 40', () => {
    expect(tap()).toBe(15);
    expect(tap({ night: false })).toBe(15);
    expect(tap({ night: true })).toBe(25);
    expect(tap({ night: true, heatState: 'hot' })).toBe(40);
  });

  it('a mission at 20 on rival ground: 40 by day, 50 at night; Watched and Hot clamps to 90', () => {
    const mission = (night: boolean, heatState: HeatState = 'cool', watched = false) =>
      runInChance({
        base: 20,
        tier: 2,
        rivalGround: true,
        heatState,
        record: 'clean',
        flags: { watched, warned: false },
        night,
      });
    expect(mission(false)).toBe(40);
    expect(mission(true)).toBe(50);
    expect(
      runInChance({ base: 50, tier: 2, rivalGround: true, heatState: 'hot', record: 'clean', flags: { watched: true, warned: false }, night: true }),
    ).toBe(90);
    expect(mission(true, 'hot', true)).toBe(75);
  });

  it('at home night changes nothing: tier 1 is 0, a mission its base', () => {
    expect(tap({ rivalGround: false, night: true })).toBe(0);
    expect(runInChance({ base: 20, tier: 2, rivalGround: false, heatState: 'cool', record: 'clean', flags: noFlags, night: true })).toBe(20);
  });

  it('missionRisk: the ticket at night on rival ground reads the +10', () => {
    const r = (night?: boolean, rivalGround = true) =>
      missionRisk({ type: 'vandalism', way: {}, rivalGround, heat: 0, record: 'clean', flags: noFlags, ...(night === undefined ? {} : { night }) });
    expect(r().runInChance).toBe(r(false).runInChance);
    expect(r(true).runInChance).toBe(r(false).runInChance + 10);
    expect(r(true, false).runInChance).toBe(r(false, false).runInChance);
  });

  const pool = ['street-enforcer', 'party-thug', 'city-police'];
  const sideOf = (id: string) =>
    id === 'city-police' ? ('police' as const) : id === 'street-enforcer' ? ('vanguard' as const) : ('alliance' as const);
  const share = (over: { night?: boolean; rivalGround?: boolean }) => {
    let police = 0;
    for (let n = 0; n < 2_000; n++) {
      const id = pickOpponent({ pool, actor: 'collective', heatState: 'cool', sideOf, policeId: 'city-police', rng: createRng(`n${n}`), ...over });
      if (id === 'city-police') police++;
    }
    return police / 2_000;
  };

  it('pickOpponent at Cool: the police about half at night on rival ground; a third by day; as written at home', () => {
    expect(share({ night: true, rivalGround: true })).toBeGreaterThan(0.46);
    expect(share({ night: true, rivalGround: true })).toBeLessThan(0.54);
    expect(share({ night: false, rivalGround: true })).toBeCloseTo(1 / 3, 1);
    expect(share({ night: true, rivalGround: false })).toBeCloseTo(1 / 3, 1);
  });

  it('pickOpponent at home with no police in the pool: 0 % police at night', () => {
    let police = 0;
    for (let n = 0; n < 2_000; n++) {
      const id = pickOpponent({
        pool: ['street-enforcer', 'party-thug'],
        actor: 'collective',
        heatState: 'cool',
        sideOf,
        policeId: 'city-police',
        rng: createRng(`h${n}`),
        night: true,
        rivalGround: false,
      });
      if (id === 'city-police') police++;
    }
    expect(police).toBe(0);
  });

  it('resolveMission reads the night at the act: the run-in +10 on rival ground', () => {
    const T0 = Date.UTC(2026, 9, 3, 9);
    const rival: PlaceModifiers = {
      sources: [],
      firedUp: false,
      place: { battleground: false, groundswell: null, issues: [], rivalGround: { homeFactionId: 'vanguard', unrest: false, pressureLeft: 2 } },
    };
    const input = (night: boolean): MissionInput => ({
      mission: {
        id: 'duskwall.mountain-inn.posters',
        type: 'vandalism',
        energy: 10,
        difficulty: 12,
        locationId: 'duskwall.mountain-inn',
        cityId: 'duskwall',
        locationKind: 'inn',
        pool: ['street-enforcer', 'city-police'],
      },
      way: { id: 'str', stats: ['str'] },
      values: { str: 19, int: 12, agi: 5, cha: 5 },
      energy: { value: 100, rested: 0, updatedAt: T0 },
      now: T0,
      standing: { successes: 0, names: NAMES, cityName: 'Duskwall' },
      orders: { day: dayKey(T0), items: [], allDoneAt: null },
      orderTemplates: TEMPLATES,
      homeCityId: 'coalport',
      factionId: 'collective',
      target: 'vanguard',
      heat: { value: 0, at: T0 },
      rateOn: () => 5,
      record: 'clean',
      flags: noFlags,
      opponents: { sideOf: (id) => (id === 'city-police' ? 'police' : 'vanguard'), policeId: 'city-police' },
      modifiers: rival,
      night,
    });
    const day = resolveMission(input(false), createRng('s'));
    const night = resolveMission(input(true), createRng('s'));
    if (!day.ok || !night.ok) throw new Error('refused');
    expect(night.start.runIn.chance).toBe(day.start.runIn.chance + 10);
  });
});
