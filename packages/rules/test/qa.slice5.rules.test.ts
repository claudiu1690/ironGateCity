/**
 * QA (slice 5, "Risk"): the risk maths re-derived from the GDD and the design text, as properties
 * over many random cases against independent reference models, rather than the design's worked
 * examples (which the developer's slice5.* tests pin). GDD §6.1 (Health), §6.4 (Heat), §8.4 (the
 * ladder), §11.2–§11.4 (the caught check and the record), §14.2/§14.11/§14.12 (opinion against, the
 * cap, rival ground), §19.1–§19.2 (the infirmary, the cells), §20 (run-ins); design
 * docs/design/slice-5-risk.md §4.2, §6–§11 and §23 (Settled, which overrides earlier sections).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CAUGHT,
  CELLS,
  HEALTH,
  HEAT,
  MISSION_TYPES,
  RECORD,
  RIVAL_GROUND,
  RIVAL_ROW,
  RUN_IN,
  addHeat,
  addPressure,
  applyAgainst,
  bailFor,
  caughtChance,
  caughtCheck,
  computeCheck,
  createRng,
  dayKey,
  dayStart,
  finishMission,
  healthAt,
  healthFullAt,
  healthMax,
  healthNow,
  heatEta,
  heatState,
  liveMarks,
  luckChoice,
  marksFor,
  missionDifficulty,
  missionRisk,
  pickOpponent,
  pressureLostToday,
  projectHealth,
  projectHeat,
  quarterOpen,
  recordLevel,
  recordView,
  resolveMission,
  resolveRunIn,
  riskBand,
  rivalGroundOf,
  runInChance,
  runInChances,
  scaleOpponent,
  sentenceMinutes,
  strikeOldest,
  tier2Rewards,
} from '../src';
import type {
  FactionId,
  HeatTimer,
  Mark,
  MissionInput,
  MissionType,
  OpinionShares,
  OpponentSpec,
  RecordLevel,
  Rng,
} from '../src';
import { NAMES, TEMPLATES, fixedRng } from './helpers';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const GDD = read('../../../docs/GDD.md');
const DESIGN = read('../../../docs/design/slice-5-risk.md');
const section = (doc: string, from: string, to: string) => {
  const a = doc.indexOf(from);
  if (a < 0) throw new Error(`section ${from} not found`);
  return doc.slice(a, doc.indexOf(to, a + from.length));
};
const F: FactionId[] = ['vanguard', 'collective', 'alliance'];
const TYPES: MissionType[] = ['speech', 'surveillance', 'vandalism', 'disruption', 'sabotage', 'theft'];
const ILLEGAL: MissionType[] = ['vandalism', 'disruption', 'sabotage', 'theft'];
const LEVELS: RecordLevel[] = ['clean', 'onFile', 'repeat', 'notorious'];
const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 5, 12);

/** Random shares to the thousandth summing to exactly 100 (Neutral at least 5). */
function randomShares(rng: Rng): OpinionShares {
  const k = [rng.int(0, 60_000), rng.int(0, 60_000), rng.int(0, 60_000)];
  const total = k[0]! + k[1]! + k[2]!;
  const room = 95_000;
  const scale = total > room ? room / total : 1;
  const [v, c, a] = k.map((x) => Math.floor(x * scale));
  return { vanguard: v! / 1000, collective: c! / 1000, alliance: a! / 1000, neutral: (100_000 - v! - c! - a!) / 1000 };
}
const sumK = (s: OpinionShares) =>
  Math.round(s.vanguard * 1000) + Math.round(s.collective * 1000) + Math.round(s.alliance * 1000) + Math.round(s.neutral * 1000);

// ---------------------------------------------------------------------------------------------
describe('QA · the slice-5 numbers in rules equal the GDD text', () => {
  const heat = section(GDD, '### 6.4 Heat', '### 6.5');
  const caught = section(GDD, '### 11.2 Getting caught', '### 11.3');
  const jail = section(GDD, '### 19.2 Jail', '### 19.3');
  const hospital = section(GDD, '### 19.1 Hospital', '### 19.2');
  const combat = section(GDD, '## 20. Combat', '### 20.3');

  it('§6.4: the Heat each type adds on every outcome, the four states, 5 an hour, ×2 on rival ground', () => {
    const pinned = heat.slice(heat.indexOf('**Slice 5 (pinned'));
    for (const [type, n] of [
      ['surveillance', 5],
      ['vandalism', 6],
      ['disruption', 8],
      ['theft', 10],
      ['sabotage', 12],
    ] as const) {
      expect(pinned).toContain(`${type} +${n}`);
      expect(MISSION_TYPES[type].heat).toBe(n);
    }
    expect(MISSION_TYPES.speech.heat).toBe(0);
    expect(heat).toMatch(/\|\s*0–24\s*\|\s*\*\*Cool\*\*/);
    expect(heat).toMatch(/\|\s*25–49\s*\|\s*\*\*Noticed\*\*/);
    expect(heat).toMatch(/\|\s*50–74\s*\|\s*\*\*Hot\*\*/);
    expect(heat).toMatch(/\|\s*75–100\s*\|\s*\*\*Wanted\*\*/);
    expect(HEAT.states).toEqual({ noticed: 25, hot: 50, wanted: 75 });
    expect(pinned).toContain('cooling 5 an hour');
    expect(HEAT.coolPerHour).toBe(5);
    expect(pinned).toContain('×2 on rival ground');
    expect(RIVAL_GROUND.heatFactor).toBe(2);
    // Noticed +5, Hot +15 (and Wanted as Hot) on the run-in and the caught check.
    expect(pinned).toContain('*Noticed*: run-ins and the caught check +5 %');
    expect(pinned).toContain('*Hot*: +15 % each');
    expect(HEAT.bonus).toEqual({ cool: 0, noticed: 5, hot: 15, wanted: 15 });
  });

  it('§11.2: the caught bases and the marks by type; the 2–95 clamp; ÷2 for Heat and Agility', () => {
    const row = (label: string) => caught.split('\n').find((l) => l.startsWith(`| ${label}`))!;
    const nums = (label: string) => row(label).match(/(\d+) %\s*\|\s*(\d+)/)!.slice(1).map(Number);
    expect(nums('Disrupting a public meeting')).toEqual([MISSION_TYPES.disruption.caught, MISSION_TYPES.disruption.marks]);
    expect(nums('Vandalism')).toEqual([MISSION_TYPES.vandalism.caught, MISSION_TYPES.vandalism.marks]);
    expect(nums('Robbery or theft')).toEqual([MISSION_TYPES.theft.caught, MISSION_TYPES.theft.marks]);
    expect(nums('Arson or sabotage')).toEqual([MISSION_TYPES.sabotage.caught, MISSION_TYPES.sabotage.marks]);
    expect(caught).toContain('kept between 2 % and 95 %');
    expect([CAUGHT.min, CAUGHT.max, CAUGHT.heatDivisor, CAUGHT.agiDivisor]).toEqual([2, 95, 2, 2]);
    expect(caught).toContain('**Extended surveillance has no caught check and no mark**');
    expect(MISSION_TYPES.surveillance.caught).toBeNull();
    expect(MISSION_TYPES.surveillance.marks).toBe(0);
  });

  // Review 4 #20 (GDD §19.2, ADR 0078): the base is 20 minutes (was 10).
  it('§19.2: the sentence 20 + Heat ÷ 2, at most 60, ×1.5 on rival ground; bail 100 + 50 a mark, ×2, ×2, ×½', () => {
    expect(jail).toContain('**20 minutes** (review 4; was 10) + Heat ÷ 2 minutes as it stands at the arrest, at most 60; **×1.5 on rival ground**');
    expect(jail).toContain('**Bail = 100 Iron + 50 per mark on the record**');
    expect(jail).toContain('**×2 for a Notorious record, ×2 on rival ground, ×½ for Alliance members anywhere**');
    expect(jail).toContain('**Afterwards Heat is 25**');
    expect(CELLS).toMatchObject({ baseMinutes: 20, heatDivisor: 2, maxMinutes: 60, rivalFactor: 1.5 });
    expect(CELLS.bail).toMatchObject({ base: 100, perMark: 50, notoriousPct: 100, rivalPct: 100, legalAidPct: -50, roundTo: 10 });
    expect(HEAT.afterRelease).toBe(25);
  });

  it('§19.1: admission at 30, the stay 20 minutes, Walk out well 5 Energy · 100 Iron, Discharge 5 Energy at half', () => {
    expect(hospital).toContain('**Admission: Health to 30 at once; the stay 20 minutes**');
    expect(hospital).toContain('***Walk out well · 5 Energy · 100 Iron***');
    expect(hospital).toContain('***Discharge yourself · 5 Energy***');
    expect(HEALTH).toMatchObject({ admitted: 30, stayMinutes: 20, walkOut: { energy: 5, iron: 100 }, discharge: { energy: 5, share: 0.5 } });
  });

  it('§6.1: Health max is 125 at Level 6 and 145 at Level 10 (100 + 5 a Level after the first), +10 every ten minutes', () => {
    const health = section(GDD, '### 6.1', '### 6.2');
    expect(health).toContain('Max at Level 6 is 125, at Level 10 145');
    expect(health).toContain('+10 every ten minutes');
    expect([healthMax(1), healthMax(6), healthMax(10)]).toEqual([100, 125, 145]);
    for (let l = 1; l <= 60; l++) expect(healthMax(l)).toBe(100 + 5 * (l - 1));
  });

  it('§20.1: Fight 50 + 3 a point, Run AGI ÷ AGI × 60, Talk 50 + 4 a point, Pay 90; the scaling ×1.1 and +4', () => {
    expect(combat).toContain('**50 % + 3 % × (your power − their power)**, 5–95 %');
    expect(combat).toContain('**(your AGI ÷ their AGI) × 60 %**');
    expect(combat).toContain('**90 %** if they can be bribed');
    expect(combat).toContain('**+10 % per mission tier above tier 1**, and **+4 in a rival home city**');
    expect(RUN_IN).toMatchObject({ fight: { base: 50, perPower: 3 }, run: { factor: 60 }, talk: { base: 50, perPoint: 4 }, pay: { chance: 90 } });
    expect([RUN_IN.tier2PowerFactor, RUN_IN.rivalPowerAdd]).toEqual([1.1, 4]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · Heat cools lazily, piecewise by City Day at the residence city’s rate (§6.4, §23.1 #8)', () => {
  /** Reference: integrate the rate in milliseconds-exact rational arithmetic (points × 3.6e6 ms × 1/rate). */
  function reference(t: HeatTimer, now: number, rateOn: (d: number) => number): number {
    if (t.value <= 0 || now <= t.at) return Math.max(0, t.value);
    // cooled points × 3,600,000 = Σ (ms in segment × rate), compared as integers with rate × 2 (7.5 → 15).
    let tt = t.at;
    let cooled2 = 0; // in units of (ms × rate × 2)
    while (tt < now) {
      const end = Math.min(now, dayStart(dayKey(tt) + 1));
      cooled2 += (end - tt) * Math.round(rateOn(dayKey(tt)) * 2);
      tt = end;
    }
    const whole = Math.floor(cooled2 / (2 * H));
    return Math.max(0, t.value - whole);
  }

  it('equals an integral of the day rates (5 or 7.5 an hour) over 3,000 random cases, never below 0, never rising', () => {
    const rng = createRng('qa5-heat');
    for (let n = 0; n < 3_000; n++) {
      const strikeDays = new Set<number>();
      const d0 = dayKey(T0);
      for (let d = d0 - 2; d < d0 + 6; d++) if (rng.next() < 0.4) strikeDays.add(d);
      const rateOn = (d: number) => (strikeDays.has(d) ? 7.5 : 5);
      const t: HeatTimer = { value: rng.int(0, 100), at: T0 + rng.int(-86_400_000, 86_400_000) };
      const later = t.at + rng.int(0, 3 * 86_400_000);
      const p = projectHeat(t, later, rateOn);
      expect(p.value).toBe(reference(t, later, rateOn));
      expect(p.value).toBeGreaterThanOrEqual(0);
      const later2 = later + rng.int(0, 4 * H);
      expect(projectHeat(t, later2, rateOn).value).toBeLessThanOrEqual(p.value);
    }
  });

  it('no part-point is lost or invented by writes in between: projecting through 1–12 zero-gain writes equals one projection', () => {
    const rng = createRng('qa5-heat-writes');
    for (let n = 0; n < 1_000; n++) {
      const strike = rng.next() < 0.5;
      const rateOn = (d: number) => (strike && d % 2 === 0 ? 7.5 : 5);
      let t: HeatTimer = { value: rng.int(1, 100), at: T0 + rng.int(0, 86_400_000) };
      const start = t;
      let now = t.at;
      const writes = rng.int(1, 12);
      for (let w = 0; w < writes; w++) {
        now += rng.int(1, 3 * H);
        t = addHeat(t, now, rateOn, 0).timer;
      }
      expect(t.value).toBe(projectHeat(start, now, rateOn).value);
      // And one more step after the writes agrees too.
      const end = now + rng.int(0, 5 * H);
      expect(projectHeat(t, end, rateOn).value).toBe(projectHeat(start, end, rateOn).value);
    }
  });

  it('a gain clamps at 100 and a cooling card at 0; the state is read after the gain (20 + 8 → Noticed)', () => {
    const rate = () => 5;
    expect(addHeat({ value: 96, at: T0 }, T0, rate, 12).after).toBe(100);
    expect(addHeat({ value: 3, at: T0 }, T0, rate, -10).after).toBe(0);
    const x = addHeat({ value: 20, at: T0 }, T0, rate, 8);
    expect([x.stateBefore, x.stateAfter]).toEqual(['cool', 'noticed']);
    for (let h = 0; h <= 100; h++) {
      expect(heatState(h)).toBe(h >= 75 ? 'wanted' : h >= 50 ? 'hot' : h >= 25 ? 'noticed' : 'cool');
    }
  });

  it('heatEta(25) is the first moment Heat reads 24, across a Customs Strike day boundary', () => {
    const rng = createRng('qa5-eta');
    for (let n = 0; n < 500; n++) {
      const strike = dayKey(T0) + rng.int(-1, 1);
      const rateOn = (d: number) => (d === strike ? 7.5 : 5);
      const t: HeatTimer = { value: rng.int(25, 100), at: T0 + rng.int(-12 * H, 12 * H) };
      const eta = heatEta(t, t.at, rateOn, 25)!;
      expect(projectHeat(t, eta, rateOn).value).toBe(24);
      expect(projectHeat(t, eta - 1, rateOn).value).toBe(25);
    }
    expect(heatEta({ value: 24, at: T0 }, T0, () => 5, 25)).toBeNull();
  });

  it('100 → 0 in 20 hours at 5 an hour; under a Customs Strike (+50 %) in 13 h 20', () => {
    expect(projectHeat({ value: 100, at: T0 }, T0 + 20 * H - 1, () => 5).value).toBe(1);
    expect(projectHeat({ value: 100, at: T0 }, T0 + 20 * H, () => 5).value).toBe(0);
    expect(projectHeat({ value: 100, at: T0 }, T0 + (40 * H) / 3, () => 7.5).value).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · Health (§6.1, §19.1)', () => {
  it('+10 every whole ten minutes, composition-safe, full at healthFullAt (random 2,000)', () => {
    const rng = createRng('qa5-health');
    for (let n = 0; n < 2_000; n++) {
      const level = rng.int(1, 30);
      const max = healthMax(level);
      const value = rng.int(0, max);
      const t = healthAt(value, level, T0);
      const dt = rng.int(0, 6 * H);
      const expected = Math.min(max, value + 10 * Math.floor(dt / 600_000));
      expect(healthNow(t, T0 + dt, level)).toBe(expected);
      // Two steps equal one.
      const mid = rng.int(0, dt);
      expect(healthNow(projectHealth(t, T0 + mid), T0 + dt, level)).toBe(expected);
      const full = healthFullAt(t, T0);
      if (value >= max) expect(full).toBeNull();
      else {
        expect(healthNow(t, full!, level)).toBe(max);
        expect(healthNow(t, full! - 1, level)).toBeLessThan(max);
      }
    }
  });

  it('a level-up at full stays full (stored as damage)', () => {
    const t = healthAt(healthMax(6), 6, T0);
    expect(healthNow(t, T0, 7)).toBe(healthMax(7));
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · the record: fading, escalation, strike-off (§11.3–§11.4, design §7)', () => {
  const kinds = ['minor', 'moderate', 'serious'] as const;
  const randomMarks = (rng: Rng, n: number): Mark[] =>
    Array.from({ length: n }, () => ({ day: 20_700 + rng.int(0, 40), kind: kinds[rng.int(0, 2)]!, logId: null }));

  it('minor marks fade 14 City Days after the last mark of any kind; moderate and serious never (2,000 random records)', () => {
    const rng = createRng('qa5-record');
    for (let n = 0; n < 2_000; n++) {
      const marks = randomMarks(rng, rng.int(0, 8));
      const today = 20_700 + rng.int(0, 70);
      const live = liveMarks(marks, today);
      const latest = marks.length ? Math.max(...marks.map((m) => m.day)) : -Infinity;
      const expected = marks.filter((m) => m.kind !== 'minor' || today < latest + 14);
      expect(live.length).toBe(expected.length);
      const v = recordView(marks, today);
      expect(v.marks).toBe(expected.length);
      expect(v.level).toBe(expected.length >= 6 ? 'notorious' : expected.length >= 3 ? 'repeat' : expected.length >= 1 ? 'onFile' : 'clean');
      expect(v.ironPct).toBe({ clean: 0, onFile: -10, repeat: -20, notorious: -30 }[v.level]);
      expect(v.repeatBonus).toBe(v.level === 'repeat' || v.level === 'notorious' ? 5 : 0);
      expect(v.bailNotorious).toBe(v.level === 'notorious');
      if (expected.some((m) => m.kind === 'minor')) expect(v.fadesOn).toBe(latest + 14);
      else expect(v.fadesOn).toBeNull();
    }
  });

  it('a minor mark on day 0: on file on day 13, clean on day 14', () => {
    const m: Mark[] = [{ day: 100, kind: 'minor', logId: null }];
    expect(recordView(m, 113).level).toBe('onFile');
    expect(recordView(m, 114).level).toBe('clean');
  });

  it('an arrest with marks within seven City Days of another escalates to three serious marks (diff 0–6 yes, 7+ no)', () => {
    for (const type of ILLEGAL) {
      for (let diff = 0; diff <= 12; diff++) {
        const r = marksFor({ type, arrested: true, arrests: [500], today: 500 + diff, logId: 'x' });
        expect(r.escalated).toBe(diff < 7);
        expect(r.add.length).toBe(diff < 7 ? 3 : MISSION_TYPES[type].marks);
        expect(r.add.every((m) => m.kind === (diff < 7 ? 'serious' : MISSION_TYPES[type].markKind))).toBe(true);
      }
      // A name taken (no arrest) never escalates, whatever the arrests.
      expect(marksFor({ type, arrested: false, arrests: [500], today: 501, logId: 'x' }).escalated).toBe(false);
    }
    // Review 4 #20 (GDD §11.2, ADR 0078): an arrest always marks. A legal type or a tier-1 tap is one
    // minor mark, and within seven City Days of an earlier arrest three serious marks like any other.
    for (const type of ['speech', null] as const) {
      expect(marksFor({ type, arrested: true, arrests: [], today: 501, logId: 'x' }).add).toEqual([{ day: 501, kind: 'minor', logId: 'x' }]);
      const again = marksFor({ type, arrested: true, arrests: [500], today: 501, logId: 'x' });
      expect([again.escalated, again.add.length, again.add[0]!.kind]).toEqual([true, 3, 'serious']);
      // A name taken on legal work (no arrest) adds nothing.
      expect(marksFor({ type, arrested: false, arrests: [500], today: 501, logId: 'x' }).add).toEqual([]);
    }
  });

  it('strike-off takes the oldest live mark, prunes faded ones, and is null on a clean record (2,000 random)', () => {
    const rng = createRng('qa5-strike');
    for (let n = 0; n < 2_000; n++) {
      const marks = randomMarks(rng, rng.int(0, 8));
      const today = 20_700 + rng.int(0, 70);
      const live = liveMarks(marks, today);
      const s = strikeOldest(marks, today);
      if (live.length === 0) {
        expect(s).toBeNull();
        continue;
      }
      expect(s!.struck.day).toBe(Math.min(...live.map((m) => m.day)));
      expect(s!.marks.length).toBe(live.length - 1);
    }
  });

  it('the levels are named by marks: 0 Clean · 1–2 On file · 3–5 Repeat offender · 6+ Notorious', () => {
    expect([0, 1, 2, 3, 5, 6, 40].map(recordLevel)).toEqual(['clean', 'onFile', 'onFile', 'repeat', 'repeat', 'notorious', 'notorious']);
    expect(RECORD.strikePc).toBe(30);
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · the caught check (§11.2, design §7.1): Partial and Failure only', () => {
  const ref = (base: number, rival: boolean, heat: number, level: RecordLevel, agi: number) => {
    const raw =
      base * (rival ? 2 : 1) +
      Math.floor(heat / 2) +
      (heat >= 50 ? 15 : heat >= 25 ? 5 : 0) +
      (level === 'repeat' || level === 'notorious' ? 5 : 0) -
      Math.floor(agi / 2);
    return Math.min(95, Math.max(2, raw));
  };

  it('equals base (×2 rival) + ⌊Heat ÷ 2⌋ + state + 5 Repeat − ⌊AGI ÷ 2⌋, kept 2–95, over 5,000 random inputs', () => {
    const rng = createRng('qa5-caught');
    for (let n = 0; n < 5_000; n++) {
      const type = ILLEGAL[rng.int(0, 3)]!;
      const base = MISSION_TYPES[type].caught!;
      const rival = rng.next() < 0.3;
      const heat = rng.int(0, 100);
      const level = LEVELS[rng.int(0, 3)]!;
      const agi = rng.int(1, 120);
      expect(caughtChance({ base, rivalGround: rival, heatAfter: heat, record: level, agi })).toBe(ref(base, rival, heat, level, agi));
    }
  });

  it('never on a Success, a legal type, after a loss or a Run; Wanted + Failure arrests without a roll', () => {
    const rng = createRng('qa5-caught-gate');
    for (const type of TYPES) {
      for (const outcome of ['success', 'partial', 'failure'] as const) {
        for (const street of ['none', 'won', 'lost', 'ran', 'talked', 'paid'] as const) {
          for (const heat of [0, 30, 60, 80]) {
            const c = caughtCheck({ type, outcome, street, heatAfter: heat, record: 'clean', agi: 10, rivalGround: false, rng, force: 'always' });
            const should = MISSION_TYPES[type].caught !== null && outcome !== 'success' && street !== 'lost' && street !== 'ran';
            expect(c.checked).toBe(should);
            if (!should) continue;
            expect(c.caught).toBe(true);
            expect(c.arrest).toBe(heat >= 50);
            expect(c.withoutRoll).toBe(heat >= 75 && outcome === 'failure');
          }
        }
      }
    }
  });

  it('the roll lands at the chance: 40,000 Partials at Heat 30, AGI 10 on a disruption land 26 % ± 1', () => {
    const chance = caughtChance({ base: 10, rivalGround: false, heatAfter: 30, record: 'clean', agi: 10 });
    expect(chance).toBe(10 + 15 + 5 - 5);
    const rng = createRng('qa5-caught-rate');
    let hits = 0;
    const N = 40_000;
    for (let n = 0; n < N; n++) {
      if (caughtCheck({ type: 'disruption', outcome: 'partial', street: 'none', heatAfter: 30, record: 'clean', agi: 10, rivalGround: false, rng }).caught) hits++;
    }
    expect(Math.abs((hits / N) * 100 - chance)).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · run-ins (§20, design §10)', () => {
  const OPP: Record<string, OpponentSpec & { side: FactionId | 'police' }> = {
    'street-enforcer': { id: 'street-enforcer', side: 'vanguard', power: 22, agi: 10, wits: 10, payOff: 60 },
    'vanguard-doorman': { id: 'vanguard-doorman', side: 'vanguard', power: 35, agi: 9, wits: 12, payOff: 150 },
    'strike-picket': { id: 'strike-picket', side: 'collective', power: 25, agi: 12, wits: 11, payOff: 80 },
    'branch-inspector': { id: 'branch-inspector', side: 'collective', power: 17, agi: 11, wits: 16, payOff: null, fightPct: -10 },
    'party-thug': { id: 'party-thug', side: 'alliance', power: 19, agi: 10, wits: 10, payOff: 50 },
    'city-police': { id: 'city-police', side: 'police', power: 30, agi: 12, wits: 14, payOff: 300 },
  };

  it('the chance: tier 2 the base ×2 on rival ground, tier 1 15 flat on rival ground and 0 at home; + state, Repeat, flags; 0–90', () => {
    const rng = createRng('qa5-runin');
    for (let n = 0; n < 5_000; n++) {
      const tier = rng.next() < 0.5 ? 1 : 2;
      const base = [5, 10, 15, 25, 30][rng.int(0, 4)]!;
      const rival = rng.next() < 0.5;
      const heat = rng.int(0, 100);
      const record = LEVELS[rng.int(0, 3)]!;
      const flags = { watched: rng.next() < 0.3, warned: rng.next() < 0.3 };
      const got = runInChance({ base, tier: tier as 1 | 2, rivalGround: rival, heatState: heatState(heat), record, flags });
      let expected: number;
      if (tier === 1 && !rival) expected = 0;
      else {
        const b = tier === 2 ? base * (rival ? 2 : 1) : 15;
        const raw =
          b +
          (heat >= 50 ? 15 : heat >= 25 ? 5 : 0) +
          (record === 'repeat' || record === 'notorious' ? 5 : 0) +
          (flags.watched ? 10 : 0) -
          (flags.warned ? 10 : 0);
        expected = Math.min(90, Math.max(0, raw));
      }
      expect(got).toBe(expected);
    }
  });

  it('the four odds equal §20.1 for every opponent at tier 1 and 2, home and rival, over a grid of stats', () => {
    for (const o of Object.values(OPP)) {
      for (const tier of [1, 2] as const) {
        for (const rival of [false, true]) {
          const them = scaleOpponent(o, { tier, rivalGround: rival });
          expect(them.power).toBe(Math.round(o.power * (tier === 2 ? 1.1 : 1) + 1e-9) + (rival ? 4 : 0));
          for (const power of [5, 15, 22, 30, 45]) {
            for (const agi of [3, 5, 10, 20, 40]) {
              for (const cha of [5, 10, 16, 25]) {
                const c = runInChances({ power, agi, cha }, them);
                const clamp = (x: number) => Math.min(95, Math.max(5, Math.round(x + 1e-9)));
                expect(c.fight).toBe(clamp(50 + 3 * (power - them.power) + (o.fightPct ?? 0)));
                expect(c.run).toBe(clamp((agi / o.agi) * 60));
                expect(c.talk).toBe(clamp(50 + 4 * (cha - o.wits)));
                expect(c.pay).toBe(o.payOff === null ? null : 90);
                const l = luckChoice(c);
                expect(c[l]).toBe(Math.max(c.fight, c.run, c.talk));
              }
            }
          }
        }
      }
    }
  });

  it('the pool: never the actor’s side; the police half the time from Noticed; an empty pool is the police (20,000 seeds)', () => {
    const sideOf = (id: string) => OPP[id]!.side;
    const pool = ['street-enforcer', 'strike-picket', 'party-thug'];
    for (const actor of F) {
      for (const state of ['cool', 'noticed', 'hot', 'wanted'] as const) {
        const rng = createRng(`qa5-pool-${actor}-${state}`);
        let police = 0;
        const N = 20_000;
        for (let n = 0; n < N; n++) {
          const id = pickOpponent({ pool, actor, heatState: state, sideOf, policeId: 'city-police', rng });
          expect(sideOf(id)).not.toBe(actor);
          if (id === 'city-police') police++;
        }
        if (state === 'cool') expect(police).toBe(0);
        else expect(Math.abs(police / N - 0.5)).toBeLessThan(0.015);
      }
      expect(pickOpponent({ pool: ['street-enforcer'], actor: 'vanguard', heatState: 'cool', sideOf, policeId: 'city-police', rng: createRng('e') })).toBe('city-police');
    }
  });

  it('every way out of resolveRunIn keeps Health in 0..max, a win ≥ 1, a loss 0; Pay always takes the Iron (10,000 random)', () => {
    const rng = createRng('qa5-resolve');
    const ids = Object.keys(OPP);
    for (let n = 0; n < 10_000; n++) {
      const o = OPP[ids[rng.int(0, ids.length - 1)]!]!;
      const them = scaleOpponent(o, { tier: rng.next() < 0.5 ? 1 : 2, rivalGround: rng.next() < 0.3 });
      const chances = runInChances({ power: rng.int(5, 50), agi: rng.int(3, 40), cha: rng.int(5, 30) }, them);
      const max = healthMax(rng.int(1, 20));
      const before = rng.int(1, max);
      const choices = (['fight', 'run', 'talk', 'pay'] as const).filter((c) => c !== 'pay' || o.payOff !== null);
      const choice = choices[rng.int(0, choices.length - 1)]!;
      const r = resolveRunIn({ choice, chances, them, iron: 10_000, healthBefore: before, healthMax: max, armour: 4, rng: createRng(`r${n}`) });
      expect(r.healthAfter).toBeGreaterThanOrEqual(0);
      expect(r.healthAfter).toBeLessThanOrEqual(before);
      if (r.outcome === 'won') expect(r.healthAfter).toBeGreaterThanOrEqual(1);
      if (r.outcome === 'lost') expect(r.healthAfter).toBe(0);
      if (choice === 'pay') expect(r.ironPaid).toBe(o.payOff);
      else expect(r.ironPaid).toBe(0);
      expect(r.heatAdded).toBe(choice === 'pay' && r.outcome !== 'paid' ? 10 : 0);
      expect(r.xp).toBe(r.outcome === 'won' ? 20 : r.outcome === 'ran' || r.outcome === 'talked' ? 10 : 0);
      // One tap is the whole run-in: at most the chosen row and the fight it led to.
      expect(r.steps.length).toBeLessThanOrEqual(2);
      expect(r.steps[0]!.row).toBe(choice);
      if (r.steps.length === 2) expect(r.steps[1]!.row).toBe('fight');
      // A failed Run or Talk fights at −10; a failed Pay at the full odds.
      if (r.steps.length === 2) {
        const expected = choice === 'pay' ? chances.fight : Math.min(95, Math.max(5, chances.fight - 10));
        expect(r.steps[1]!.chance).toBe(expected);
      }
    }
  });

  it('a failed Run costs half a win’s damage and then the fight at −10 (fixed rolls)', () => {
    const them = scaleOpponent(OPP['street-enforcer']!, { tier: 2, rivalGround: false });
    const chances = runInChances({ power: 17, agi: 5, cha: 5 }, them);
    const r = resolveRunIn({ choice: 'run', chances, them, iron: 0, healthBefore: 125, healthMax: 125, armour: 4, rng: fixedRng([100, 1]), damageRng: createRng('d') });
    expect(r.outcome).toBe('won');
    expect(r.steps.map((s) => [s.row, s.ok])).toEqual([['run', false], ['fight', true]]);
    // Two damage draws: half a win's damage for the failed run, then a win's damage.
    expect(r.healthLoss).toBeGreaterThan(0);
  });

  it('nit n-fullStrength: after a failed Run the player is hurt before the fight, so “won at full strength” should not apply', () => {
    const them = scaleOpponent(OPP['street-enforcer']!, { tier: 2, rivalGround: false });
    const chances = runInChances({ power: 17, agi: 5, cha: 5 }, them);
    const r = resolveRunIn({ choice: 'run', chances, them, iron: 0, healthBefore: 125, healthMax: 125, armour: 4, rng: fixedRng([100, 1]), damageRng: createRng('d') });
    // Recorded, not failed: the design says "if you were at full Health" without saying when. The
    // build reads it before the run-in. See the report (n-list).
    expect(r.fullStrength).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · tier-2 rewards (design §4.2 table, parsed), Rested and Issue bonuses', () => {
  const table = section(DESIGN, 'Rewards per mission at these Energies', '### 4.3');
  const rows = table.split('\n').filter((l) => /^\| (Speech|Surveillance|Vandalism|Disruption|Sabotage|Theft) · \d+/.test(l));

  it('the six rows of the design’s table, to the unit, at Success / Partial / Failure', () => {
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
      const [name, energyS] = cells[0]!.split(' · ');
      const type = name!.toLowerCase() as MissionType;
      const energy = Number(energyS);
      expect(MISSION_TYPES[type].energy).toBe(energy);
      const triple = (cell: string) => (cell === '—' ? null : cell.replace(/\*/g, '').split('/').map((x) => Number(x.trim().split(' ')[0])));
      const [xp, fxp, iron, opinion] = [triple(cells[1]!), triple(cells[2]!), triple(cells[3]!), triple(cells[4]!)];
      (['success', 'partial', 'failure'] as const).forEach((outcome, i) => {
        const r = tier2Rewards({ type, energy, outcome, restedUsed: 0 });
        expect(r.xp.total).toBe(xp![i]);
        expect(r.fxp.total).toBe(fxp ? fxp[i] : 0);
        expect(r.iron.total).toBe(iron![i]);
        expect(r.opinion).toBeCloseTo(opinion ? (opinion[i] ?? 0) : 0, 6);
      });
    }
  });

  it('Rested: +50 % XP and Iron on the covered Energy, never on Party XP or opinion; on a Failure only the XP', () => {
    for (const type of TYPES) {
      const e = MISSION_TYPES[type].energy;
      for (const outcome of ['success', 'partial', 'failure'] as const) {
        const plain = tier2Rewards({ type, energy: e, outcome, restedUsed: 0 });
        const full = tier2Rewards({ type, energy: e, outcome, restedUsed: e });
        const half = tier2Rewards({ type, energy: e, outcome, restedUsed: Math.floor(e / 2) });
        expect(full.fxp.total).toBe(plain.fxp.total);
        expect(full.opinion).toBe(plain.opinion);
        const factor = outcome === 'success' ? 1 : outcome === 'partial' ? 0.5 : 0.2;
        expect(full.xp.total).toBe(plain.xp.total + Math.floor(5 * e * factor * 0.5 + 0.5 + 1e-9));
        expect(full.xp.total).toBeGreaterThan(plain.xp.total);
        expect(half.xp.total).toBeGreaterThanOrEqual(plain.xp.total);
        expect(half.xp.total).toBeLessThanOrEqual(full.xp.total);
        if (outcome === 'failure') expect(full.iron.total).toBe(0);
        else expect(full.iron.total).toBeGreaterThan(plain.iron.total);
      }
    }
  });

  it('an Issue tag (+50 % opinion) on a speech mission: 0.15 → 0.225; the illegal types are never tagged', () => {
    const tagged = tier2Rewards({ type: 'speech', energy: 15, outcome: 'success', restedUsed: 0, opinionFactors: [{ id: 'issue', label: 'Issue', pct: 50 }] });
    expect(tagged.opinion).toBeCloseTo(0.225, 6);
  });

  it('the record’s Iron penalty is on missions: −10 / −20 / −30 % of the base as a part of its own', () => {
    for (const pct of [-10, -20, -30]) {
      const r = tier2Rewards({ type: 'disruption', energy: 15, outcome: 'success', restedUsed: 0, recordIronPct: pct });
      expect(r.iron.total).toBe(60 + Math.round((60 * pct) / 100));
      expect(r.iron.parts).toContainEqual({ id: 'record', label: 'Your record', amount: Math.round((60 * pct) / 100) });
      const theft = tier2Rewards({ type: 'theft', energy: 15, outcome: 'success', restedUsed: 0, recordIronPct: pct });
      expect(theft.iron.total).toBe(120 + Math.round((120 * pct) / 100));
    }
  });

  it('the ladder: 14 / 16 / 18 / 20 by Level, +2 in the capital (§8.4)', () => {
    expect(([6, 8, 10, 12] as const).map((l) => missionDifficulty(l, 'home'))).toEqual([14, 16, 18, 20]);
    expect(([6, 8, 10, 12] as const).map((l) => missionDifficulty(l, 'battleground'))).toEqual([16, 18, 20, 22]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · rival ground (§14.12): +4 difficulty, ×2 Heat and run-ins, the caught base ×2', () => {
  it('the rival row equals four points of difficulty wherever the chance is not clamped (every stat 1–60, difficulty 8–22)', () => {
    for (let stat = 1; stat <= 60; stat++) {
      for (let d = 8; d <= 22; d++) {
        const rival = computeCheck({ stats: ['int'], values: { str: 1, int: stat, agi: 1, cha: 1 }, difficulty: d, bonuses: [RIVAL_ROW] });
        const harder = computeCheck({ stats: ['int'], values: { str: 1, int: stat, agi: 1, cha: 1 }, difficulty: d + 4 });
        expect(rival.chance).toBe(harder.chance);
      }
    }
  });

  it('missionRisk: Heat ×2, the run-in ×2 after the doubled gain; the band words at their edges', () => {
    for (const type of TYPES) {
      const home = missionRisk({ type, way: {}, rivalGround: false, heat: 0, record: 'clean', flags: { watched: false, warned: false } });
      const away = missionRisk({ type, way: {}, rivalGround: true, heat: 0, record: 'clean', flags: { watched: false, warned: false } });
      expect(away.heat).toBe(home.heat * 2);
      expect(away.runInChance).toBe(
        runInChance({ base: MISSION_TYPES[type].runIn, tier: 2, rivalGround: true, heatState: heatState(away.heat), record: 'clean', flags: { watched: false, warned: false } }),
      );
      expect(away.marks).toBe(MISSION_TYPES[type].marks);
    }
    // Design §11.3: a disruption on rival ground: Heat 16, a 60 % run-in, the caught check from 20 %.
    const d = missionRisk({ type: 'disruption', way: {}, rivalGround: true, heat: 0, record: 'clean', flags: { watched: false, warned: false } });
    expect([d.heat, d.runInChance]).toEqual([16, 60]);
    expect(caughtChance({ base: 10, rivalGround: true, heatAfter: 0, record: 'clean', agi: 0 })).toBe(20);
    expect([0, 1, 10, 11, 24, 25, 90].map(riskBand)).toEqual(['safe', 'littleRisk', 'littleRisk', 'risky', 'risky', 'dangerous', 'dangerous']);
  });

  it('the sentence ×1.5 at most 60 and bail ×2 on rival ground, for every Heat and record', () => {
    for (let heat = 0; heat <= 100; heat++) {
      expect(sentenceMinutes(heat, false)).toBe(Math.min(60, 20 + Math.floor(heat / 2)));
      expect(sentenceMinutes(heat, true)).toBe(Math.min(60, Math.floor((20 + Math.floor(heat / 2)) * 1.5)));
    }
    for (let marks = 0; marks <= 12; marks++) {
      for (const rival of [false, true]) {
        for (const alliance of [false, true]) {
          const notorious = marks >= 6;
          const raw = (100 + 50 * marks) * (notorious ? 2 : 1) * (rival ? 2 : 1) * (alliance ? 0.5 : 1);
          expect(bailFor({ marks, notorious, rivalGround: rival, alliance }).total).toBe(Math.round(raw / 10) * 10);
          const full = bailFor({ marks, notorious, rivalGround: rival, alliance, sources: [{ id: 'issue.cells-full', label: 'The Cells Are Full', pct: -50 }] });
          expect(full.total).toBe(Math.floor((raw * 0.5) / 10 + 0.5) * 10);
        }
      }
    }
  });

  it('quarters open by Level 1 / 6, the third is a teaser whatever the Level, a held place opens its quarter', () => {
    for (let level = 1; level <= 30; level++) {
      expect(quarterOpen({}, level).open).toBe(true);
      expect(quarterOpen({ opens: { level: 6 } }, level).open).toBe(level >= 6);
      expect(quarterOpen({ opens: { edition: 'later' } }, level).open).toBe(false);
      expect(quarterOpen({ opens: { level: 6 } }, level, true).open).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · opinion against, with the 2-point daily cap (§14.2, §14.11, design §11.2)', () => {
  it('5,000 random calls: the sum stays 100.000; taken ≤ swing, ≤ cap, ≤ target − floor; half (down) to the actor, the rest to Neutral', () => {
    const rng = createRng('qa5-against');
    for (let n = 0; n < 5_000; n++) {
      const s = randomShares(rng);
      const actor = F[rng.int(0, 2)]!;
      const target = F.filter((f) => f !== actor)[rng.int(0, 1)]!;
      const home = rng.next() < 0.5 ? target : undefined;
      const swing = rng.int(1, 600) / 1000;
      const cap = rng.next() < 0.5 ? rng.int(0, 2000) / 1000 : null;
      const r = applyAgainst(s, { actor, target, swing, ...(home ? { homeFactionId: home } : {}), cap });
      expect(sumK(r.shares)).toBe(100_000);
      const floor = home ? 50 : 0;
      const room = Math.max(0, Math.round(s[target] * 1000) - floor * 1000);
      const expectedK = Math.max(0, Math.min(Math.round(swing * 1000), room, cap === null ? Infinity : Math.round(cap * 1000)));
      expect(Math.round(r.taken * 1000)).toBe(expectedK);
      expect(Math.round(r.toActor * 1000)).toBe(Math.floor(expectedK / 2));
      expect(Math.round((r.toActor + r.toNeutral) * 1000)).toBe(expectedK);
      expect(Math.round(r.shares[target] * 1000)).toBe(Math.round(s[target] * 1000) - expectedK);
      if (home) expect(r.shares[target]).toBeGreaterThanOrEqual(Math.min(50, s[target]) - 1e-9);
    }
  });

  it('a day of visitors: the home faction loses at most 2.000 points to rivals in a day, exactly 2.000 when enough work is done; the next day starts fresh', () => {
    const rng = createRng('qa5-cap');
    for (let trial = 0; trial < 200; trial++) {
      let shares: OpinionShares = { vanguard: 70, collective: 10, alliance: 8, neutral: 12 };
      let pressure = null as ReturnType<typeof addPressure> | null;
      const today = 20_740;
      let lostK = 0;
      const taps = rng.int(1, 40);
      for (let t = 0; t < taps; t++) {
        const actor: FactionId = rng.next() < 0.5 ? 'collective' : 'alliance';
        const rival = rivalGroundOf({ homeFactionId: 'vanguard', actor, morale: 'steady', pressure, today })!;
        const swing = [0.05, 0.1, 0.2, 0.3, 0.4][rng.int(0, 4)]!;
        const r = applyAgainst(shares, { actor, target: 'vanguard', swing, homeFactionId: 'vanguard', cap: rival.pressureLeft });
        shares = r.shares;
        const k = Math.round(r.taken * 1000);
        lostK += k;
        pressure = addPressure(pressure, today, k);
      }
      expect(lostK).toBeLessThanOrEqual(2_000);
      expect(pressureLostToday(pressure, today)).toBe(lostK);
      expect(Math.round((70 - shares.vanguard) * 1000)).toBe(lostK);
      expect(sumK(shares)).toBe(100_000);
      const tomorrow = rivalGroundOf({ homeFactionId: 'vanguard', actor: 'alliance', morale: 'steady', pressure, today: today + 1 })!;
      expect(tomorrow.pressureLeft).toBe(2);
    }
  });

  it('the cap’s remainder: 1.97 lost, a 0.05 swing takes 0.03, then nothing', () => {
    const pressure = { day: 5, lost: 1_970, prev: null };
    const left = rivalGroundOf({ homeFactionId: 'vanguard', actor: 'alliance', morale: 'steady', pressure, today: 5 })!.pressureLeft;
    expect(left).toBeCloseTo(0.03, 6);
    const r = applyAgainst({ vanguard: 70, collective: 10, alliance: 8, neutral: 12 }, { actor: 'alliance', target: 'vanguard', swing: 0.05, homeFactionId: 'vanguard', cap: left });
    expect(r.taken).toBeCloseTo(0.03, 6);
    const after = rivalGroundOf({ homeFactionId: 'vanguard', actor: 'alliance', morale: 'steady', pressure: addPressure(pressure, 5, 30), today: 5 })!;
    expect(after.pressureLeft).toBe(0);
  });

  it('Party XP on rival ground is +50 %, +75 % in Unrest (§14.11)', () => {
    expect([RIVAL_GROUND.fxpShare, RIVAL_GROUND.fxpShareUnrest]).toEqual([0.5, 0.75]);
    expect(rivalGroundOf({ homeFactionId: 'vanguard', actor: 'alliance', morale: 'unrest', pressure: null, today: 1 })!.unrest).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('QA · a mission end to end in rules (resolveMission → finishMission)', () => {
  const sides: Record<string, FactionId | 'police'> = { 'street-enforcer': 'vanguard', 'city-police': 'police' };
  const base: MissionInput = {
    mission: { id: 'coalport.far-bank.posters', type: 'vandalism', energy: 10, difficulty: 14, locationId: 'coalport.far-bank', cityId: 'coalport', pool: ['street-enforcer', 'city-police'] },
    way: { id: 'agi', stats: ['agi'] },
    values: { str: 10, int: 25, agi: 19, cha: 5 },
    energy: { value: 100, rested: 0, updatedAt: T0 },
    now: T0,
    standing: { successes: 0, names: NAMES, cityName: 'Coalport' },
    orders: { day: dayKey(T0), items: [], allDoneAt: null },
    orderTemplates: TEMPLATES,
    homeCityId: 'coalport',
    factionId: 'collective',
    target: 'vanguard',
    heat: { value: 0, at: T0 },
    rateOn: () => 5,
    record: 'clean',
    flags: { watched: false, warned: false },
    opponents: { sideOf: (id) => sides[id]!, policeId: 'city-police' },
  };
  const start = (over: Partial<MissionInput>, seed = 'qa5') => {
    const r = resolveMission({ ...base, ...over }, createRng(seed));
    if (!r.ok) throw new Error('refused');
    return r.start;
  };

  it('Heat is paid on every outcome, the run-in is rolled on every outcome (deterministic per seed)', () => {
    for (const roll of [1, 50, 80, 100]) {
      const s = start({ force: { checkRoll: roll } });
      expect(s.heat.after).toBe(6);
      const again = start({ force: { checkRoll: roll } });
      expect(again.runIn).toEqual(s.runIn);
    }
  });

  it('Wanted + Failure + a successful Run is not an arrest (§23.6 #11); Wanted + Failure + a won fight is', () => {
    const s = start({ heat: { value: 80, at: T0 }, force: { checkRoll: 100 } });
    expect(s.attempt.outcome).toBe('failure');
    const fin = (outcome: 'ran' | 'won') => {
      const runIn = {
        choice: outcome === 'ran' ? 'run' : 'fight',
        steps: [],
        outcome,
        healthLoss: 0,
        healthAfter: 125,
        ironPaid: 0,
        heatAdded: 0,
        xp: outcome === 'won' ? 20 : 10,
        fullStrength: false,
        cause: null,
      } as const;
      const caught = caughtCheck({ type: 'vandalism', outcome: 'failure', street: outcome, heatAfter: s.heat.after, record: 'clean', agi: 19, rivalGround: false, rng: createRng('c') });
      return finishMission({ start: s, runIn: runIn as never, opponentSide: 'vanguard', caught, marks: [], arrests: [], agiQuarters: 0, health: { damage: 0, at: T0 }, level: 6, at: T0, today: dayKey(T0), rateOn: () => 5, logId: 'l', bail: { alliance: false, sources: [] } });
    };
    expect(fin('ran').sentTo).toBeNull();
    expect(fin('won').sentTo?.kind).toBe('cells');
    expect(fin('won').sentTo?.reason).toBe('wanted');
  });

  // Review 4 #20 (GDD §11.2, ADR 0078): an arrest always marks (one minor mark on a watch) and counts
  // for the escalation; the day's orders are off from it.
  it('a police loss on a surveillance mission: the cells, one minor mark, recorded for the escalation, orders off', () => {
    const s = start({ mission: { ...base.mission, id: 'coalport.customs-house.watch', type: 'surveillance', energy: 12, pool: ['city-police'] }, target: null });
    const lost = { choice: 'fight', steps: [], outcome: 'lost', healthLoss: 125, healthAfter: 0, ironPaid: 0, heatAdded: 0, xp: 0, fullStrength: false, cause: 'power' } as const;
    const f = finishMission({ start: s, runIn: lost as never, opponentSide: 'police', caught: null, marks: [], arrests: [], agiQuarters: 0, health: { damage: 0, at: T0 }, level: 6, at: T0, today: dayKey(T0), rateOn: () => 5, logId: 'l', bail: { alliance: false, sources: [] } });
    expect(f.sentTo?.kind).toBe('cells');
    expect(f.record.added).toEqual([{ day: dayKey(T0), kind: 'minor', logId: 'l' }]);
    expect(f.record.arrests).toEqual([dayKey(T0)]);
    expect(f.ordersOff).toBe(true);
    expect(f.orders.after.off).toEqual({ at: T0, reason: 'cells' });
    expect(f.health?.after).toBe(30);
    expect(f.stamp).toBe('takenIn');
    expect(f.rewards.xp.base).toBe(12); // Failure's small XP: 60 ÷ 5
  });

  it('Agility +¼ only on a paid Success of an Agility way; four make a point', () => {
    const s = start({ force: { checkRoll: 1 } });
    const fin = (q: number) => finishMission({ start: s, runIn: null, opponentSide: null, caught: null, marks: [], arrests: [], agiQuarters: q, health: { damage: 0, at: T0 }, level: 6, at: T0, today: dayKey(T0), rateOn: () => 5, logId: 'l', bail: { alliance: false, sources: [] } });
    expect(fin(0).agility).toEqual({ quarters: 1, gained: true, statUp: false });
    expect(fin(3).agility).toEqual({ quarters: 0, gained: true, statUp: true });
    const partial = start({ force: { checkRoll: 80 } });
    expect(partial.attempt.outcome).toBe('partial');
    const p = finishMission({ start: partial, runIn: null, opponentSide: null, caught: null, marks: [], arrests: [], agiQuarters: 2, health: { damage: 0, at: T0 }, level: 6, at: T0, today: dayKey(T0), rateOn: () => 5, logId: 'l', bail: { alliance: false, sources: [] } });
    expect(p.agility).toEqual({ quarters: 2, gained: false, statUp: false });
  });
});
