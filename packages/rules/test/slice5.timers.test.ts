/**
 * Slice 5, T1 (docs/tech/slice-5.md §6.2–§6.4, §6.13): Heat, Health and the record.
 */
import { describe, expect, it } from 'vitest';
import {
  addHeat,
  barredByRecord,
  coolRate,
  createRng,
  dayStart,
  healthAt,
  healthFullAt,
  healthMax,
  healthNow,
  heatEta,
  heatState,
  heatStepMs,
  liveMarks,
  marksFor,
  projectHealth,
  projectHeat,
  recordArrest,
  recordLevel,
  recordView,
  setHeat,
  strikeOldest,
} from '../src';
import type { DayKey, Mark } from '../src';

const H = 3_600_000;
const MIN = 60_000;
const DAY0: DayKey = 20_730;
const T0 = dayStart(DAY0) + 9 * H;
const normal = () => 5;

describe('Heat (§6.2)', () => {
  it('the four states at their edges', () => {
    expect([0, 24, 25, 49, 50, 74, 75, 100].map(heatState)).toEqual([
      'cool',
      'cool',
      'noticed',
      'noticed',
      'hot',
      'hot',
      'wanted',
      'wanted',
    ]);
  });

  it('cools 5 an hour: 32 → 24 after 96 minutes, 100 → 0 in 20 hours, never below 0', () => {
    expect(projectHeat({ value: 32, at: T0 }, T0 + 96 * MIN, normal).value).toBe(24);
    expect(projectHeat({ value: 32, at: T0 }, T0 + 95 * MIN, normal).value).toBe(25);
    expect(projectHeat({ value: 100, at: T0 }, T0 + 20 * H - 1, normal).value).toBe(1);
    expect(projectHeat({ value: 100, at: T0 }, T0 + 20 * H, normal)).toEqual({ value: 0, at: T0 + 20 * H });
    expect(projectHeat({ value: 10, at: T0 }, T0 + 40 * H, normal)).toEqual({ value: 0, at: T0 + 40 * H });
  });

  it('keeps the part-point already cooled: `at` is the moment of the last whole point', () => {
    // 5 an hour: a point every 12 minutes.
    const p = projectHeat({ value: 30, at: T0 }, T0 + 30 * MIN, normal);
    expect(p).toEqual({ value: 28, at: T0 + 24 * MIN });
    expect(projectHeat(p, T0 + 36 * MIN, normal).value).toBe(27);
  });

  it('the Customs Strike cools at 7.5 an hour; a strike day then a normal day, piecewise exact', () => {
    expect(coolRate([50])).toBe(7.5);
    expect(coolRate([])).toBe(5);
    expect(coolRate([50, 50])).toBe(11.25);
    const start = dayStart(DAY0) + 20 * H; // 4 hours of the strike day are left
    const rateOn = (d: DayKey) => (d === DAY0 ? 7.5 : 5);
    // 4 h × 7.5 = 30, then 2 h × 5 = 10: 60 → 20.
    expect(projectHeat({ value: 60, at: start }, start + 6 * H, rateOn).value).toBe(20);
    // A point straddling midnight: 3 h 56 min at 7.5 = 29.5, then 6 min at 5 = 0.5 → exactly 30.
    expect(projectHeat({ value: 60, at: start + 4 * MIN }, start + 4 * H + 6 * MIN, rateOn).value).toBe(30);
    expect(projectHeat({ value: 60, at: start + 4 * MIN }, start + 4 * H + 6 * MIN - 1, rateOn).value).toBe(31);
  });

  it('no part-point is lost across 1,000 random writes', () => {
    const rng = createRng('heat-writes');
    for (const rateOn of [normal, (d: DayKey) => (d % 2 === 0 ? 7.5 : 5)]) {
      const start: { value: number; at: number } = { value: 100, at: T0 };
      const end = T0 + 19 * H + 17 * MIN + 3_333;
      let t = start;
      let now = T0;
      for (let i = 0; i < 1_000; i++) {
        now += rng.int(1, Math.floor((end - T0) / 1_000));
        t = projectHeat(t, Math.min(now, end), rateOn);
      }
      const chained = projectHeat(t, end, rateOn).value;
      const direct = projectHeat(start, end, rateOn).value;
      expect(chained).toBe(direct);
    }
  });

  it('addHeat clamps at 100 and at 0; a gain while at 0 starts from now', () => {
    const r = addHeat({ value: 95, at: T0 }, T0, normal, 12);
    expect(r).toMatchObject({ before: 95, after: 100, stateBefore: 'wanted', stateAfter: 'wanted' });
    const fromZero = addHeat({ value: 0, at: T0 - 5 * H }, T0, normal, 8);
    expect(fromZero.timer).toEqual({ value: 8, at: T0 });
    const cooled = addHeat({ value: 5, at: T0 }, T0 + H, normal, -10);
    expect(cooled.timer).toEqual({ value: 0, at: T0 + H });
    // The state is read after the gain (design §6.2): 20 + 8 is Noticed.
    expect(addHeat({ value: 20, at: T0 }, T0, normal, 8)).toMatchObject({ stateAfter: 'noticed', after: 28 });
    // A gain keeps the part-point already cooled.
    const mid = addHeat({ value: 30, at: T0 }, T0 + 30 * MIN, normal, 6);
    expect(mid.timer).toEqual({ value: 34, at: T0 + 24 * MIN });
  });

  it('setHeat: 25 at the release', () => {
    expect(setHeat(25, T0)).toEqual({ value: 25, at: T0 });
  });

  it('heatEta: when Heat drops under 25 (Cool by) or to 0; null when already under', () => {
    expect(heatEta({ value: 32, at: T0 }, T0, normal, 25)).toBe(T0 + 96 * MIN);
    expect(heatEta({ value: 32, at: T0 }, T0, normal, 1)).toBe(T0 + 32 * 12 * MIN);
    expect(heatEta({ value: 24, at: T0 }, T0, normal, 25)).toBeNull();
    expect(heatEta({ value: 0, at: T0 }, T0, normal, 1)).toBeNull();
    // From a part-point already cooled.
    expect(heatEta({ value: 26, at: T0 }, T0 + 6 * MIN, normal, 25)).toBe(T0 + 24 * MIN);
    expect(heatStepMs(5)).toBe(12 * MIN);
    expect(heatStepMs(7.5)).toBe(8 * MIN);
  });
});

describe('Health (§6.3)', () => {
  it('max at Levels 1, 6 and 10 (the design pins 125 and 145: +5 for every Level after the first)', () => {
    expect([1, 6, 10].map(healthMax)).toEqual([100, 125, 145]);
  });

  it('+10 per whole 10 minutes; `at` by whole ticks', () => {
    const t = healthAt(96, 6, T0);
    expect(t).toEqual({ damage: 29, at: T0 });
    expect(healthNow(t, T0 + 9 * MIN, 6)).toBe(96);
    expect(healthNow(t, T0 + 10 * MIN, 6)).toBe(106);
    expect(projectHealth(t, T0 + 25 * MIN)).toEqual({ damage: 9, at: T0 + 20 * MIN });
    expect(healthNow(t, T0 + 30 * MIN, 6)).toBe(125);
    expect(healthFullAt(t, T0)).toBe(T0 + 30 * MIN);
    expect(healthFullAt({ damage: 0, at: T0 }, T0)).toBeNull();
  });

  it('a level-up at full stays full (damage 0)', () => {
    const t = { damage: 0, at: T0 };
    expect(healthNow(t, T0, 6)).toBe(125);
    expect(healthNow(t, T0, 7)).toBe(130);
    expect(healthNow(healthAt(125, 6, T0), T0, 7)).toBe(130);
  });

  it('admission at 30; the 20-minute stay ends at 50', () => {
    const t = healthAt(30, 6, T0);
    expect(healthNow(t, T0, 6)).toBe(30);
    expect(healthNow(t, T0 + 20 * MIN, 6)).toBe(50);
  });
});

const mark = (day: DayKey, kind: Mark['kind'] = 'minor'): Mark => ({ day, kind, logId: null });

describe('the record (§6.4)', () => {
  it('the levels at 0, 1, 2, 3, 5, 6', () => {
    expect([0, 1, 2, 3, 5, 6, 9].map(recordLevel)).toEqual([
      'clean',
      'onFile',
      'onFile',
      'repeat',
      'repeat',
      'notorious',
      'notorious',
    ]);
  });

  it('minor marks fade 14 days after the last mark of any kind', () => {
    const marks = [mark(1), mark(3)];
    expect(liveMarks(marks, 16)).toHaveLength(2);
    expect(liveMarks(marks, 17)).toHaveLength(0);
    // A theft mark on day 10 keeps the day-1 minor marks until day 24.
    const withTheft = [mark(1), mark(10, 'moderate'), mark(10, 'moderate')];
    expect(liveMarks(withTheft, 23)).toHaveLength(3);
    expect(liveMarks(withTheft, 24)).toEqual([mark(10, 'moderate'), mark(10, 'moderate')]);
    // Serious marks never fade in slice 5.
    expect(liveMarks([mark(1, 'serious')], 400)).toHaveLength(1);
  });

  it('the view: level, fade day, the penalties and the bars', () => {
    expect(recordView([], 5)).toMatchObject({ level: 'clean', marks: 0, fadesOn: null, ironPct: 0, repeatBonus: 0 });
    expect(recordView([mark(2), mark(4)], 5)).toMatchObject({
      level: 'onFile',
      marks: 2,
      fadesOn: 18,
      fading: 2,
      ironPct: -10,
      repeatBonus: 0,
    });
    expect(recordView([mark(4), mark(4, 'serious'), mark(4, 'serious')], 5)).toMatchObject({
      level: 'repeat',
      ironPct: -20,
      repeatBonus: 5,
      bailNotorious: false,
    });
    const six = Array.from({ length: 6 }, () => mark(4, 'serious'));
    expect(recordView(six, 5)).toMatchObject({
      level: 'notorious',
      ironPct: -30,
      repeatBonus: 5,
      bailNotorious: true,
      barred: true,
      fadesOn: null,
    });
  });

  it('marks by type, and the escalation within seven City Days', () => {
    const base = { arrested: false, arrests: [], today: 10, logId: 'L' };
    expect(marksFor({ ...base, type: 'vandalism' }).add).toEqual([{ day: 10, kind: 'minor', logId: 'L' }]);
    expect(marksFor({ ...base, type: 'theft' }).add.map((m) => m.kind)).toEqual(['moderate', 'moderate']);
    expect(marksFor({ ...base, type: 'sabotage' }).add).toHaveLength(3);
    expect(marksFor({ ...base, type: 'speech' }).add).toEqual([]);
    expect(marksFor({ ...base, type: 'surveillance', arrested: true, arrests: [9] }).add).toEqual([]);
    expect(marksFor({ ...base, type: null, arrested: true, arrests: [9] })).toEqual({ add: [], escalated: false });
    // Day 0 and day 6 escalate; day 0 and day 7 do not; a name taken (no arrest) never escalates.
    const six = marksFor({ type: 'vandalism', arrested: true, arrests: [0], today: 6, logId: null });
    expect(six.escalated).toBe(true);
    expect(six.add).toEqual(Array.from({ length: 3 }, () => ({ day: 6, kind: 'serious', logId: null })));
    expect(marksFor({ type: 'vandalism', arrested: true, arrests: [0], today: 7, logId: null }).escalated).toBe(false);
    expect(marksFor({ type: 'vandalism', arrested: false, arrests: [5], today: 6, logId: null }).escalated).toBe(false);
    expect(recordArrest([1, 2, 3], 4)).toEqual([2, 3, 4]);
  });

  it('the oldest live mark is struck first; nothing to strike is null', () => {
    const marks = [mark(5, 'serious'), mark(2, 'moderate'), mark(3)];
    const r = strikeOldest(marks, 6)!;
    expect(r.struck).toEqual(mark(2, 'moderate'));
    expect(r.marks).toEqual([mark(5, 'serious'), mark(3)]);
    expect(strikeOldest([mark(1)], 20)).toBeNull();
    expect(strikeOldest([], 1)).toBeNull();
  });

  it('Notorious bars courts, universities and every Alliance HQ (members included)', () => {
    expect(barredByRecord('notorious', { kind: 'court' })).toBe(true);
    expect(barredByRecord('notorious', { kind: 'university' })).toBe(true);
    expect(barredByRecord('notorious', { kind: 'faction-hq', factionId: 'alliance' })).toBe(true);
    expect(barredByRecord('notorious', { kind: 'faction-hq', factionId: 'vanguard' })).toBe(false);
    expect(barredByRecord('notorious', { kind: 'market' })).toBe(false);
    expect(barredByRecord('repeat', { kind: 'court' })).toBe(false);
  });
});
