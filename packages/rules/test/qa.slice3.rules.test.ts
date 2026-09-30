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
  AGAINST_ALL,
  COUNCIL,
  MORALE,
  ORDINANCE_BOUNDS,
  applyDrift,
  applyPersuasion,
  boundaryWork,
  closeNominations,
  councilDay,
  countElection,
  createRng,
  cycleOf,
  divide,
  drawNpcSlate,
  moraleState,
  nextNominationsAfter,
  projectEnergy,
  projectEnergyThrough,
  stipendBoundaries,
  wardVote,
} from '../src';
import type { CountLine, OpinionShares } from '../src';

const GDD = readFileSync(fileURLToPath(new URL('../../../docs/GDD.md', import.meta.url)), 'utf8');
const section = (from: string, to: string) =>
  GDD.slice(GDD.indexOf(from), GDD.indexOf(to, GDD.indexOf(from)));
const S153 = section('### 15.3 City Councils', '### 15.4');
const S65 = section('### 6.5 Political Capital', '### 6.6');
const S1411 = section('### 14.11 Home cities', '### 14.12');

/** The five offsets as the GDD prints them: "Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4". */
const OFFSETS = Object.fromEntries(
  [...S153.matchAll(/(Irongate|Ashford|Coalport|Duskwall|Clearwater) (\d)/g)].map((m) => [
    m[1]!,
    Number(m[2]),
  ]),
);

describe('QA · the GDD numbers the rules use', () => {
  it('the offsets and the council constants read from §15.3, §6.5 and §14.11', () => {
    expect(OFFSETS).toEqual({ Irongate: 0, Ashford: 1, Coalport: 2, Duskwall: 3, Clearwater: 4 });
    expect(S153).toMatch(/five-day cycle/);
    expect(S153).toMatch(/Cycle days \*\*0–1: nominations\*\*/);
    expect(S153).toMatch(/\*\*2–4: polls open\*\*/);
    expect(S153).toMatch(/\*\*10 PC deposit\*\*/);
    expect(COUNCIL.cost.declare).toBe(10);
    expect(S153).toMatch(/Endorsements: Rank 2\+ residents, 10 PC/);
    expect(COUNCIL.cost.endorse).toBe(10);
    expect(S153).toMatch(/\*\*20 PC\*\*, one per councillor per term/);
    expect(COUNCIL.cost.propose).toBe(20);
    expect(S153).toMatch(/\*\*total = ward vote \+ 3 × endorsements \+ members' votes\*\*/);
    expect(COUNCIL.endorsementWeight).toBe(3);
    expect(S153).toMatch(/at most five endorsements count/);
    expect(COUNCIL.endorsementsCounted).toBe(5);
    expect(S153).toMatch(/÷ 5 \(rounded down\)/);
    expect(COUNCIL.wardDivisor).toBe(5);
    expect(S153).toMatch(/jitter of ±2/);
    expect(COUNCIL.npcJitter).toBe(2);
    expect(S153).toMatch(/fewer than three other eligible endorsers/);
    expect(COUNCIL.smallBranchBelow).toBe(3);
    expect(S153).toMatch(/\*\*passes with four or more of seven\*\*/);
    expect(COUNCIL.passVotes).toBe(4);
    expect(S153).toMatch(/up to \*\*three proposals\*\*/);
    expect(COUNCIL.maxProposals).toBe(3);
    expect(S65).toMatch(/Councillor \*\*10\/day and 20 FXP\/day\*\*/);
    expect(COUNCIL.stipend).toEqual({ pc: 10, fxp: 20 });
    expect(S1411).toMatch(/drift of 2 % of the distance to 70/);
    expect([MORALE.driftShare, MORALE.driftTarget]).toEqual([0.02, 70]);
    expect(S1411).toMatch(/\+0\.5 per ballot cast/);
    expect(S1411).toMatch(/\+2 when a player takes a council seat/);
    expect(S1411).toMatch(/−3 at any count in which no player voted/);
    expect([MORALE.ballot, MORALE.seat, MORALE.noVoterPenalty]).toEqual([0.5, 2, 3]);
    expect(S1411).toMatch(/\*\*\+10 % Faction XP on actions at home\*\*/);
    expect(MORALE.firedFxpShare).toBe(0.1);
    expect(S1411).toMatch(/\*\*80–100 %\*\* \| \*\*Fired up\*\*/);
    expect(S1411).toMatch(/\*\*50–59 %\*\* \| \*\*Unrest\*\*/);
    expect([MORALE.firedFrom, MORALE.unrestBelow]).toEqual([80, 60]);
  });

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
      'Ward Register': /every Success counts two/,
      'Ward Fund': /Iron from checked actions \+25 %; job pay −25 %/,
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
        expect(c.council.voting).toBe(d < c.council.divideDay);
        // The ordinance windows tile the timeline: one in force per city, never two, never a gap.
        const next = councilDay(d + 5, offset);
        expect(next.ordinanceWindow.fromDay).toBe(c.ordinanceWindow.toDay);
        const w = boundaryWork(d, offset);
        expect(w.count).toBe(c.cycleDay === 0);
        expect(w.close && w.divide).toBe(c.cycleDay === 2);
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

describe('QA · the count as a property (GDD §15.3)', () => {
  const rng = createRng('qa-slice3-count');
  const randomLines = (n: number): CountLine[] =>
    Array.from({ length: n }, (_, i) => {
      const npc = rng.int(0, 1) === 1;
      const successes = rng.int(0, 60) * 5 + rng.int(0, 4);
      return {
        key: npc ? `n:npc.${i}` : `p:${i}`,
        kind: npc ? 'npc' : 'player',
        name: `C${i}`,
        wardVote: npc ? rng.int(10, 46) : wardVote(successes),
        successes: npc ? rng.int(3, 9) * 25 : successes,
        endorsements: npc ? 0 : rng.int(0, 9),
        order: i,
      };
    });

  it('2,000 random ballots: totals, seven seats, the finishing order and every tie-break', () => {
    for (let t = 0; t < 2_000; t++) {
      const lines = randomLines(rng.int(7, 14));
      const votes = Object.fromEntries(lines.map((l) => [l.key, rng.int(0, 4)]));
      const r = countElection(lines, votes);
      expect(r.rows).toHaveLength(lines.length);
      expect(r.seated).toHaveLength(Math.min(7, lines.length));
      expect(r.rows.filter((x) => !x.seated)).toHaveLength(lines.length - 7);
      for (const row of r.rows) {
        expect(row.total).toBe(row.wardVote + 3 * Math.min(row.endorsements, 5) + (votes[row.key] ?? 0));
        expect(row.endorsementsCounted).toBe(Math.min(row.endorsements, 5));
      }
      for (let i = 1; i < r.rows.length; i++) {
        const a = r.rows[i - 1]!;
        const b = r.rows[i]!;
        const key = [
          a.total - b.total,
          a.votes - b.votes,
          a.endorsements - b.endorsements,
          a.successes - b.successes,
          b.order - a.order,
        ];
        const first = key.find((x) => x !== 0);
        expect(first, `rows ${i - 1}/${i}`).toBeGreaterThan(0);
        expect(a.place).toBe(i);
      }
      expect(r.npcSeats).toBe(r.seated.filter((x) => x.kind === 'npc').length);
      expect(r.topKey).toBe(r.rows[0]!.key);
      expect(r.lastSeatKey).toBe(r.seated.at(-1)!.key);
    }
  });

  it('NPC fill to nine, for 0 … 12 players standing and 500 jitter seeds: at least two lose every cycle', () => {
    const slate = [44, 38, 33, 29, 25, 22, 19, 17, 15].map((profile, i) => ({ npcId: `npc.${i}`, profile }));
    for (let seed = 0; seed < 500; seed++) {
      const drawn = drawNpcSlate(slate, createRng(`s${seed}`));
      drawn.forEach((d, i) => {
        expect(Math.abs(d.jitter)).toBeLessThanOrEqual(2);
        expect(d.wardVote).toBe(slate[i]!.profile + d.jitter);
      });
      for (let p = 0; p <= 12; p++) {
        const close = closeNominations({
          candidacies: Array.from({ length: p }, (_, i) => ({
            id: `c${i}`,
            filedAt: i,
            members: 2,
            branch: false,
            otherEndorsers: 5,
          })),
          npcSlate: drawn,
        });
        const names = close.standing.length + close.ballotNpcs.length;
        expect(names).toBe(Math.max(9, p));
        expect(close.ballotNpcs).toEqual(drawn.slice(0, Math.max(0, 9 - p)).map((d) => d.npcId));
        expect(names - COUNCIL.seats).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('the branch counts two only in a small branch; one member plus the branch stands anywhere', () => {
    for (let others = 0; others <= 6; others++)
      for (let members = 0; members <= 3; members++)
        for (const branch of [false, true]) {
          const close = closeNominations({
            candidacies: [{ id: 'x', filedAt: 0, members, branch, otherEndorsers: others }],
            npcSlate: [],
          });
          const want = members + (branch ? (others < 3 ? 2 : 1) : 0);
          expect(close.effective.x).toBe(want);
          expect(close.standing.includes('x')).toBe(want >= 2);
        }
  });
});

describe('QA · the division as a property (GDD §15.3, §15.10)', () => {
  it('5,000 random councils: at most one passes, with four or more; NPCs never vote Against all; Unrest abstains', () => {
    const rng = createRng('qa-slice3-divide');
    for (let t = 0; t < 5_000; t++) {
      const n = rng.int(1, 4);
      const items = Array.from({ length: n }, (_, i) => ({
        ordinanceId: `o${i}`,
        branch: i === 0,
        movedAt: i,
      }));
      const players = rng.int(0, 7);
      const unrest = rng.int(0, 4) === 0;
      const choices = [...items.map((x) => x.ordinanceId), AGAINST_ALL];
      const playerVotes = Array.from({ length: rng.int(0, players) }, () => ({
        choice: choices[rng.int(0, choices.length - 1)]!,
      }));
      const d = divide({ items, playerVotes, npcSeats: 7 - players, unrest });
      expect(d.npcChoice).not.toBe(AGAINST_ALL);
      if (unrest) expect(d.npcChoice).toBeNull();
      const total = (c: string) => {
        const x = d.tallies.find((y) => y.choice === c)!;
        return x.player + x.npc;
      };
      const reaching = items.filter((x) => total(x.ordinanceId) >= 4);
      expect(reaching.length).toBeLessThanOrEqual(1);
      expect(d.passed).toBe(reaching[0]?.ordinanceId ?? null);
      // The seven seats: every vote is counted once.
      const cast = d.tallies.reduce((a, x) => a + x.player + x.npc, 0);
      expect(cast).toBe(playerVotes.length + (d.npcChoice ? 7 - players : 0));
      // No player vote for any item → the NPCs follow the branch's motion (unless abstaining).
      if (!unrest && 7 - players > 0 && playerVotes.every((v) => v.choice === AGAINST_ALL))
        expect(d.npcChoice).toBe('o0');
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
