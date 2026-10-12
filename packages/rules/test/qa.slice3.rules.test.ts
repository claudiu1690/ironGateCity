/**
 * QA (slice 3): the council maths re-derived from the GDD text, as properties over many cases
 * rather than the design's worked examples (which the developer's tests pin). GDD §15.3 (the
 * calendar, the count, the division), §15.10 (NPC fill), §14.11 (morale), §6.5 (PC), ADR 0020
 * (the stipend), ADR 0021 (Rested never shrinks).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  COUNCIL,
  ORDINANCE_BOUNDS,
  applyDrift,
  applyPersuasion,
  boundaryWork,
  councilDay,
  createRng,
  cycleOf,
  moraleState,
  nextNominationsAfter,
  projectEnergy,
  projectEnergyThrough,
  stipendBoundaries,
} from '../src';
import type { OpinionShares } from '../src';

const GDD = readFileSync(fileURLToPath(new URL('../../../docs/GDD.md', import.meta.url)), 'utf8');
const section = (from: string, to: string) =>
  GDD.slice(GDD.indexOf(from), GDD.indexOf(to, GDD.indexOf(from)));
const S153 = section('### 15.3 City Councils', '### 15.4');

/** The five offsets as the GDD prints them: "Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4". */
const OFFSETS = Object.fromEntries(
  [...S153.matchAll(/(Irongate|Ashford|Coalport|Duskwall|Clearwater) (\d)/g)].map((m) => [
    m[1]!,
    Number(m[2]),
  ]),
);

describe('QA · the GDD numbers the rules use', () => {
  it('the ordinance bounds are the §15.3 table values', () => {
    const rows = {
      'Public Works Order': /Job pay \+10 %/,
      // Review 1: the Shift Hours Order is the Long Service Order (GDD §15.3).
      '**Long Service Order** (was *Shift Hours Order*; review 1)': /Seniority builds two days a day/,
      'Street Permits': /Propaganda opinion swing \+15 %/,
      'Rally Permits': /Speech actions −2 Energy/,
      'Reading Room Grant': /Training Energy −20 %/,
      'Rest Day Order': /Rested cap \+50/,
      'Open Doors': /Canvass actions \+4 % success chance/,
      // Review 2: the Ward Register and the Ward Fund are the Street Register and the Street Fund.
      '**Street Register** (was *Ward Register*; review 2)': /every Success counts two/,
      '**Street Fund** (was *Ward Fund*; review 2)': /Iron from checked actions \+25 %; job pay −25 %/,
      'Public Meetings Order': /Faction XP \+25 % on actions/,
    };
    for (const [name, re] of Object.entries(rows)) {
      const line = S153.split('\n').find((l) => l.startsWith(`| ${name} |`));
      expect(line, name).toMatch(re);
    }
    expect(ORDINANCE_BOUNDS).toMatchObject({
      jobPayPct: [-25, 10],
      seniorityDays: [1, 2],
      swingPct: [0, 15],
      energyDelta: [-2, 0],
      trainingEnergyPct: [-20, 0],
      restedCapDelta: [0, 50],
      chancePct: [0, 4],
      standingMultiplier: [1, 2],
      ironPct: [0, 25],
      fxpPct: [0, 25],
    });
  });
});

describe('QA · the calendar, every offset, 400 days', () => {
  const DAYS = Array.from({ length: 400 }, (_, i) => 20_700 + i);

  it.each(Object.entries(OFFSETS))(
    '%s (offset %i): 2 + 3 days, one count, one close, one division per cycle',
    (_, offset) => {
      for (const d of DAYS) {
        const c = councilDay(d, offset);
        // Every day is in exactly one phase of the open election, which is counted at the next day 0.
        expect(c.phase).toBe(c.cycleDay <= 1 ? 'nominations' : 'polling');
        expect(c.election.countDay).toBe(c.election.nominationsFrom + 5);
        expect(cycleOf(c.election.countDay, offset).cycleDay).toBe(0);
        // The council that sits today was elected at its fromDay's count and ends at the next.
        expect(c.council.toDay - c.council.fromDay).toBe(COUNCIL.termDays);
        const w = boundaryWork(d, offset);
        expect(w.count).toBe(c.cycleDay === 0);
        // `{weekday}` in the struck and withdraw texts: the next nominations day 0, strictly after today.
        const n = nextNominationsAfter(d, offset);
        expect(n).toBeGreaterThan(d);
        expect(cycleOf(n, offset).cycleDay).toBe(0);
        expect(n - d).toBeLessThanOrEqual(5);
      }
    },
  );

  it('the three home cities alone: polls are open in at least one of them every day (the 2–4 promise)', () => {
    for (const d of DAYS) {
      const open = [OFFSETS.Ashford!, OFFSETS.Coalport!, OFFSETS.Duskwall!].filter(
        (o) => councilDay(d, o).phase === 'polling',
      );
      expect(open.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('QA · morale as a property (GDD §14.11)', () => {
  const shares = (home: number): OpinionShares => ({
    vanguard: 9,
    collective: home,
    alliance: 6,
    neutral: 85 - home,
  });

  it('drift moves 2 % of the distance to 70, never past it, for every share from 50 to 95', () => {
    for (let s = 50; s <= 95; s += 0.125) {
      const r = applyDrift(shares(s), 'collective');
      const after = r.shares.collective;
      expect(Math.abs(after - (s + 0.02 * (70 - s)))).toBeLessThanOrEqual(0.0006);
      if (s < 70) expect(after).toBeLessThanOrEqual(70);
      if (s > 70) expect(after).toBeGreaterThanOrEqual(70);
      expect(r.shares.vanguard + r.shares.collective + r.shares.alliance + r.shares.neutral).toBeCloseTo(
        100,
        6,
      );
    }
  });

  it('a ballot crosses a threshold exactly at 80 and at 60 (no floating-point misses)', () => {
    expect(
      moraleState(
        applyPersuasion(shares(79.5), { factionId: 'collective', swing: 0.5, homeFactionId: 'collective' })
          .shares.collective,
      ),
    ).toBe('fired');
    expect(
      moraleState(
        applyPersuasion(shares(59.5), { factionId: 'collective', swing: 0.5, homeFactionId: 'collective' })
          .shares.collective,
      ),
    ).toBe('steady');
    let s = shares(59.9);
    s = applyPersuasion(s, { factionId: 'collective', swing: 0.1, homeFactionId: 'collective' }).shares;
    expect(moraleState(s.collective)).toBe('steady');
  });
});

describe('QA · the stipend never pays twice and never loses a boundary (ADR 0020)', () => {
  it('any sequence of settlements pays what one settlement over the whole span pays', () => {
    const rng = createRng('qa-stipend');
    for (let t = 0; t < 1_000; t++) {
      const from = 100 + rng.int(0, 10);
      const terms = [{ fromDay: from, toDay: from + 5 }];
      if (rng.int(0, 1)) terms.push({ fromDay: from + 10, toDay: from + 15 });
      const settles = [from - rng.int(0, 3)];
      while (settles.at(-1)! < from + 20) settles.push(settles.at(-1)! + rng.int(1, 6));
      let paid = 0;
      for (let i = 1; i < settles.length; i++) paid += stipendBoundaries(terms, settles[i - 1]!, settles[i]!);
      expect(paid).toBe(stipendBoundaries(terms, settles[0]!, settles.at(-1)!));
      expect(stipendBoundaries(terms, settles[0]!, settles.at(-1)!)).toBe(terms.length * 5);
    }
  });
});

describe('QA · Rested is never cut by a cap (ADR 0021 §5, GDD §15.3 Rest Day Order)', () => {
  it('projectEnergy and projectEnergyThrough never return less Rested than stored, whatever the caps', () => {
    const rng = createRng('qa-rested');
    const DAY = 86_400_000;
    for (let t = 0; t < 2_000; t++) {
      const t0 = 20_800 * DAY + rng.int(0, DAY - 1);
      const state = { value: rng.int(0, 100), rested: rng.int(0, 250), updatedAt: t0 };
      const until = t0 + rng.int(0, 9) * DAY + rng.int(0, DAY - 1);
      const caps = new Map<number, number>();
      const capOn = (d: number) => {
        if (!caps.has(d)) caps.set(d, rng.int(0, 1) ? 250 : 200);
        return caps.get(d)!;
      };
      const p = projectEnergyThrough(state, until, capOn);
      expect(p.rested).toBeGreaterThanOrEqual(state.rested);
      expect(p.rested).toBeLessThanOrEqual(Math.max(250, state.rested));
      const q = projectEnergy(state, until, 100, 200);
      expect(q.rested).toBeGreaterThanOrEqual(Math.min(state.rested, 250));
      expect(q.rested).toBeGreaterThanOrEqual(state.rested);
    }
  });
});
