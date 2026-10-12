/**
 * QA (slice 4): the battleground maths re-derived from the GDD text, as properties over many cases
 * rather than the design's worked examples (which the developer's tests pin). GDD §14.2 (drift),
 * §14.4 (close race, comeback), §14.5 (heroes), §14.6 (Issues), §14.10 (travel), §14.11 (residence,
 * the room), §15.3 (the capital's count and its council).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BATTLEGROUND,
  DISTRICT,
  HERO,
  ISSUES,
  RESIDENCE,
  ROOM,
  TRAVEL,
  applyBaselineDrift,
  controller,
  councilDay,
  createRng,
  dhondt,
  districtScores,
  districtState,
  drawIssues,
  drawJourneyCard,
  fare,
  groundswellPct,
  heroes,
  isBattleground,
  levelBracket,
  moveWindows,
  pointsFor,
  resolveIssue,
  roomPrice,
  scoreboardLine,
  turnoutWeight,
} from '../src';
import type { FactionId, OpinionShares, Rng } from '../src';

const GDD = readFileSync(fileURLToPath(new URL('../../../docs/GDD.md', import.meta.url)), 'utf8');
const section = (from: string, to: string) => GDD.slice(GDD.indexOf(from), GDD.indexOf(to, GDD.indexOf(from)));
const F: FactionId[] = ['vanguard', 'collective', 'alliance'];

/** Random shares to the thousandth summing to exactly 100 (Neutral at least `minNeutral`). */
function randomShares(rng: Rng, minNeutral = 5): OpinionShares {
  const k = [rng.int(0, 60_000), rng.int(0, 60_000), rng.int(0, 60_000)];
  const total = k[0]! + k[1]! + k[2]!;
  const room = 100_000 - minNeutral * 1_000;
  const scale = total > room ? room / total : 1;
  const [v, c, a] = k.map((x) => Math.floor(x * scale));
  return { vanguard: v! / 1000, collective: c! / 1000, alliance: a! / 1000, neutral: (100_000 - v! - c! - a!) / 1000 };
}

describe('QA · the GDD numbers the slice-4 rules use', () => {
  it('§14.10: third class 20 Iron, from Level 10; tickets halved never below 5; one trip in three', () => {
    const s = section('### 14.10', '### 14.11');
    expect(s).toContain('| **Third class** | 20 IM |');
    expect(s).toContain('The nation map opens at **Level 10**');
    expect(s).toContain('never below 5');
    expect(s).toContain('afterwards one in three');
    expect(TRAVEL).toMatchObject({ level: 10, fare: 20, fareFloor: 5, cardOneIn: 3 });
    for (const [to, min] of [
      ['Ashford', 12],
      ['Coalport', 12],
      ['Duskwall', 15],
      ['Clearwater', 25],
    ] as const)
      expect(s).toMatch(new RegExp(`\\| ${to} \\| ${min} min \\|`));
  });

  it('§14.11: Rank 2, 500 Iron both ways, seven days between moves; the room 100 Iron, 7 days, Rested cap +50', () => {
    const s = section('### 14.11', '### 14.12');
    expect(s).toContain('**Rank 2+**, 500 Iron, seven days between moves');
    expect(s).toContain('100 Iron for 7 City Days, Rested cap +50');
    expect(RESIDENCE).toEqual({ rank: 2, cost: 500, cooldownDays: 7 });
    expect(ROOM).toMatchObject({ cost: 100, days: 7, restedBonus: 50 });
  });

  it('§14.2, §14.4: drift 1 % of the distance; a close race within 10; +25 % swing and Party XP, +5 chance; comeback +5 a day to +30, 14 boundaries', () => {
    expect(section('### 14.2', '### 14.3')).toContain('**1 % of its distance to the baseline per day**');
    const s = section('### 14.4', '### 14.5');
    expect(s).toContain('within **10 points**');
    expect(s).toContain('**+25 % opinion swing, +25 % Faction XP**');
    expect(s).toContain('**+5 % chance**');
    expect(s).toContain('**+5 % opinion swing per day there, stacking to +30 %**');
    expect(s).toContain('**14 boundaries**');
    expect(DISTRICT).toMatchObject({
      driftShare: 0.01,
      battlegroundWithin: 10,
      controlAbove: 50,
      groundswellPerDay: 5,
      groundswellMax: 30,
      groundswellDays: 14,
    });
    expect(BATTLEGROUND).toMatchObject({ swingPct: 25, fxpShare: 0.25, chancePct: 5 });
  });

  it('§14.5, §14.6: heroes at +0.5, 25 PC, brackets 1–15 / 16–30 / 31+; Issues +50 %, +3, the top five 4 PC, 7 days', () => {
    const h = section('### 14.5', '### 14.6');
    expect(h).toContain('**provided it is at least +0.5 points**');
    expect(h).toContain('(1–15, 16–30, 31+)');
    expect(h).toContain('**25 PC**');
    expect(HERO).toMatchObject({ minSwing: 0.5, pc: 25 });
    const s = section('### 14.6', '### 14.7');
    expect(s).toContain('**+50 % opinion swing**');
    expect(s).toContain('**+3 opinion**');
    expect(s).toContain('**top five contributors by momentum get 4 PC each**');
    expect(s).toContain('for **7 City Days**');
    expect(ISSUES).toMatchObject({ perCity: 2, swingPct: 50, ownerSwing: 3, topFive: 5, topPc: 4, effectDays: 7 });
  });

});

describe('QA · the capital count as a property (GDD §15.3)', () => {
  it('w is five points a ballot to 50 at ten, never more', () => {
    for (let b = 0; b <= 40; b++) expect(turnoutWeight(b)).toBe(Math.min(50, 5 * b));
  });

  it('5,000 random districts: the three scores add to 100; each is w × ballot share + (100 − w) × opinion share', () => {
    const rng = createRng('qa-scores');
    for (let n = 0; n < 5_000; n++) {
      const opinion = randomShares(rng);
      if (F.every((f) => opinion[f] === 0)) continue;
      const ballotsByFaction = Object.fromEntries(F.map((f) => [f, rng.int(0, 7)])) as Record<FactionId, number>;
      const rows = districtScores({ ballotsByFaction, opinion });
      const total = F.reduce((s, f) => s + ballotsByFaction[f], 0);
      const w = turnoutWeight(total);
      const sumOpinion = F.reduce((s, f) => s + opinion[f], 0);
      for (const r of rows) {
        const bs = total > 0 ? ballotsByFaction[r.factionId] / total : 0;
        expect(r.score).toBeCloseTo(w * bs + (100 - w) * (opinion[r.factionId] / sumOpinion), 9);
      }
      // With no ballot the ballot half is empty and opinion carries all 100.
      expect(rows.reduce((s, r) => s + r.score, 0)).toBeCloseTo(100, 9);
    }
  });

  it("5,000 random D'Hondt counts for two seats: the leader takes both only with more than twice the runner-up", () => {
    const rng = createRng('qa-dhondt');
    for (let n = 0; n < 5_000; n++) {
      const opinion = randomShares(rng);
      if (F.every((f) => opinion[f] === 0)) continue;
      const ballotsByFaction = Object.fromEntries(F.map((f) => [f, rng.int(0, 12)])) as Record<FactionId, number>;
      const rows = districtScores({ ballotsByFaction, opinion });
      const sorted = [...rows].sort((a, b) => b.score - a.score);
      const [lead, second] = [sorted[0]!, sorted[1]!];
      if (Math.abs(lead.score - second.score) < 1e-6 || Math.abs(lead.score / 2 - second.score) < 1e-6) continue;
      const { seats } = dhondt(rows, 2, F);
      expect(seats[0]).toBe(lead.factionId);
      expect(seats[1]).toBe(lead.score / 2 > second.score ? lead.factionId : second.factionId);
    }
  });

});

describe('QA · the district meter as a property (GDD §14.2–§14.4)', () => {
  it('5,000 random drifts: the sum stays 100.000; no faction overshoots its baseline; Neutral never under 5', () => {
    const rng = createRng('qa-drift');
    for (let n = 0; n < 5_000; n++) {
      const s = randomShares(rng);
      const base = randomShares(rng, 30);
      const { shares, moves } = applyBaselineDrift(s, base);
      const sumK = Math.round((shares.vanguard + shares.collective + shares.alliance + shares.neutral) * 1000);
      expect(sumK).toBe(100_000);
      expect(shares.neutral).toBeGreaterThanOrEqual(Math.min(5, s.neutral) - 1e-9);
      for (const f of F) {
        const before = s[f] - base[f];
        const after = shares[f] - base[f];
        expect(Math.abs(after)).toBeLessThanOrEqual(Math.abs(before) + 1e-9);
        if (before !== 0 && Math.abs(after) > 1e-9) expect(Math.sign(after)).toBe(Math.sign(before));
        // Falling factions always move their full 1 % (rounded to the thousandth).
        if (before > 0) expect(Math.round((moves[f] ?? 0) * 1000) + 0).toBe(-Math.round(before * 1000 * 0.01 + 1e-9) + 0);
      }
    }
  });

  it('edges: a close race at exactly 10 apart, not at 10.001; control above 50, not at 50', () => {
    expect(isBattleground({ vanguard: 30, collective: 20, alliance: 10, neutral: 40 })).toBe(true);
    expect(isBattleground({ vanguard: 30.001, collective: 20, alliance: 10, neutral: 39.999 })).toBe(false);
    expect(controller({ vanguard: 50, collective: 20, alliance: 10, neutral: 20 })).toBeNull();
    expect(controller({ vanguard: 50.001, collective: 20, alliance: 10, neutral: 19.999 })).toBe('vanguard');
  });

  it('a 60-day random walk ×300: a comeback starts exactly when control is lost, +5 a day to +30, ends on retaking or at 14', () => {
    const rng = createRng('qa-groundswell');
    for (let n = 0; n < 300; n++) {
      let prev: Parameters<typeof districtState>[0] = { controlledBy: null, groundswell: null };
      let s: OpinionShares = { vanguard: 52, collective: 20, alliance: 10, neutral: 18 };
      for (let d = 1; d <= 60; d++) {
        const f = F[rng.int(0, 2)]!;
        const step = rng.int(-3_000, 3_000) / 1000;
        const next = Math.min(80, Math.max(0, s[f] + step));
        const neutral = s.neutral - (next - s[f]);
        if (neutral >= 5) s = { ...s, [f]: next, neutral };
        const st = districtState(prev, s, d);
        if (prev.controlledBy !== null && st.controlledBy !== prev.controlledBy) {
          expect(st.started).toBe(prev.controlledBy);
          expect(st.groundswell).toEqual({ factionId: prev.controlledBy, fromDay: d, untilDay: d + 14 });
        }
        if (st.groundswell) {
          expect(d).toBeLessThan(st.groundswell.untilDay);
          expect(st.controlledBy).not.toBe(st.groundswell.factionId);
          const pct = groundswellPct(st.groundswell, d);
          expect(pct).toBe(Math.min(30, 5 * (d - st.groundswell.fromDay + 1)));
        }
        prev = { controlledBy: st.controlledBy, groundswell: st.groundswell };
      }
    }
  });
});

describe('QA · Issues as a property (GDD §14.6)', () => {
  const capital = [
    ['issue.tram-fares', 'sm'],
    ['issue.press-raids', 'ot'],
    ['issue.evictions', 'e'],
    ['issue.ministry-cuts', 'gq'],
    ['issue.hill-curfew', 'gh'],
    ['issue.bread-queues', 'sm'],
    ['issue.quays-strike', 'e'],
    ['issue.opera-gala', 'gq'],
    ['issue.fever', 'ot'],
    ['issue.census', 'gh'],
    ['issue.exchange', 'sm'],
    ['issue.coal', 'e'],
    ['issue.lights', 'ot'],
  ].map(([id, districtId]) => ({ id: id!, districtId: districtId! }));

  it('10,000 Monday draws in the capital: two, never last week’s, from two districts', () => {
    const rng = createRng('qa-draw');
    let last: string[] = [];
    for (let n = 0; n < 10_000; n++) {
      const picks = drawIssues({ eligible: capital, lastWeek: last, distinctDistricts: true, rng });
      expect(picks).toHaveLength(2);
      expect(picks.map((p) => p.order)).toEqual([1, 2]);
      expect(picks[0]!.districtId).not.toBe(picks[1]!.districtId);
      for (const p of picks) expect(last).not.toContain(p.id);
      last = picks.map((p) => p.id);
    }
  });

  it('points: Success the content Energy, Partial half rounded up, failure nothing (10 → 10 / 5; 3 → 2; 12 → 12 / 6)', () => {
    expect([pointsFor(10, 'success'), pointsFor(10, 'partial'), pointsFor(10, 'failure')]).toEqual([10, 5, 0]);
    expect([pointsFor(3, 'success'), pointsFor(3, 'partial')]).toEqual([3, 2]);
    expect([pointsFor(12, 'success'), pointsFor(12, 'partial')]).toEqual([12, 6]);
  });

  it('5,000 random resolutions: the most points own; a tie the higher share; still tied nobody; no points lapse', () => {
    const rng = createRng('qa-resolve');
    for (let n = 0; n < 5_000; n++) {
      const momentum = Object.fromEntries(F.map((f) => [f, rng.int(0, 3) * 5])) as Record<FactionId, number>;
      const shares = randomShares(rng);
      if (rng.int(0, 3) === 0) shares.collective = shares.vanguard;
      const r = resolveIssue({ momentum, shares });
      const best = Math.max(...F.map((f) => momentum[f]));
      if (best === 0) {
        expect(r).toEqual({ ownerId: null, by: null, lapsed: true });
        continue;
      }
      const leaders = F.filter((f) => momentum[f] === best);
      if (leaders.length === 1) expect(r).toEqual({ ownerId: leaders[0], by: 'points', lapsed: false });
      else {
        const top = Math.max(...leaders.map((f) => shares[f]));
        const byShare = leaders.filter((f) => shares[f] === top);
        expect(r).toEqual(
          byShare.length === 1
            ? { ownerId: byShare[0], by: 'share', lapsed: false }
            : { ownerId: null, by: null, lapsed: false },
        );
      }
    }
  });
});

describe('QA · travel and residence as properties (GDD §14.10–§14.11)', () => {
  const half = (id: string, kind: 'ticketPct' | 'roomPct') => ({
    id,
    name: id,
    kind: 'ordinance' as const,
    effects: [{ kind, value: -50 }],
  });
  const mods = (...sources: ReturnType<typeof half>[]) =>
    ({ sources, firedUp: false, place: { battleground: false, groundswell: null, issues: [] } }) as never;

  it('the ticket: 20; one half 10; two halves 5; three never below 5. The room: 100; Evictions 50', () => {
    expect(fare().total).toBe(20);
    expect(fare(mods(half('a', 'ticketPct'))).total).toBe(10);
    expect(fare(mods(half('a', 'ticketPct'), half('b', 'ticketPct'))).total).toBe(5);
    expect(fare(mods(half('a', 'ticketPct'), half('b', 'ticketPct'), half('c', 'ticketPct'))).total).toBe(5);
    expect(roomPrice().total).toBe(100);
    expect(roomPrice(mods(half('issue.evictions', 'roomPct'))).total).toBe(50);
  });

  it('2,000 characters × 40 journeys: the passenger first; a card one trip in three (±2 %); every round of seven without a repeat', () => {
    const deck = ['jev.passenger', 'jev.leaflets', 'jev.parcel', 'jev.cards', 'jev.reporter', 'jev.signal', 'jev.boy'];
    let cards = 0;
    let later = 0;
    for (let ch = 0; ch < 2_000; ch++) {
      let seen: string[] = [];
      const drawn: string[] = [];
      for (let j = 0; j < 40; j++) {
        const r = drawJourneyCard({ first: j === 0, seen, deck, firstId: 'jev.passenger', rng: createRng(`${ch}:${j}`) });
        if (j === 0) expect(r.eventId).toBe('jev.passenger');
        else {
          later++;
          if (r.eventId) cards++;
        }
        if (r.eventId) drawn.push(r.eventId);
        seen = r.seen;
      }
      for (let i = 0; i < drawn.length; i += 7) {
        const round = drawn.slice(i, i + 7);
        expect(new Set(round).size).toBe(round.length);
      }
    }
    expect(Math.abs(cards / later - 1 / 3)).toBeLessThan(0.02);
  });

  it('the windows for every city offset and every day of 40: vote from the next day-2 after today, stand from the next day 0, move in 7', () => {
    for (const offset of [0, 1, 2, 3, 4]) {
      for (let today = 20_730; today < 20_770; today++) {
        const w = moveWindows(today, offset);
        let vote = today + 1;
        while (councilDay(vote, offset).cycleDay !== 2) vote++;
        let stand = today + 1;
        while (councilDay(stand, offset).cycleDay !== 0) stand++;
        expect(w).toEqual({ votesFromDay: vote, standsFromDay: stand, canMoveFromDay: today + 7 });
        // A resident registered on cycle days 0–1 votes in this cycle's polls (resident when they opened).
        const cd = councilDay(today, offset).cycleDay;
        expect(w.votesFromDay === councilDay(today, offset).election.pollsFrom).toBe(cd <= 1);
      }
    }
  });
});

describe('QA · the scoreboard and heroes (GDD §14.5)', () => {
  it('brackets at their edges; a hero only at +0.5 or more; ties to the earlier', () => {
    expect([1, 15, 16, 30, 31, 60].map(levelBracket)).toEqual([1, 1, 2, 2, 3, 3]);
    const row = (id: string, amount: number, lastAt: number, level: number) => ({ characterId: id, amount, lastAt, level });
    expect(heroes([row('a', 499, 1, 10)])).toEqual([]);
    expect(heroes([row('a', 500, 1, 10)])).toEqual([{ bracket: 1, characterId: 'a', amount: 500 }]);
    expect(heroes([row('a', 900, 5, 10), row('b', 900, 3, 12), row('c', 2_000, 1, 31)])).toEqual([
      { bracket: 1, characterId: 'b', amount: 900 },
      { bracket: 3, characterId: 'c', amount: 2_000 },
    ]);
    expect(scoreboardLine({ amount: 300, lastAt: 9 }, [{ amount: 300, lastAt: 9 }, { amount: 300, lastAt: 4 }, { amount: 50, lastAt: 1 }])).toEqual({
      swing: 0.3,
      rank: 2,
      of: 3,
    });
    expect(scoreboardLine(null, [{ amount: 300, lastAt: 9 }])).toBeNull();
  });
});
