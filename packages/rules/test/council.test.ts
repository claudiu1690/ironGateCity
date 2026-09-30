import { describe, expect, it } from 'vitest';
import {
  AGAINST_ALL,
  closeNominations,
  countElection,
  createRng,
  divide,
  drawNpcSlate,
  effectiveEndorsements,
  isSmallBranch,
  marginToSeat,
  npcsStanding,
  stipendBoundaries,
  wardVote,
} from '../src';
import type { CountLine, NpcSlateEntry } from '../src';

/** The Collective's slate (design §5.2), profile order. */
const SLATE = [44, 38, 33, 29, 25, 22, 19, 17, 15].map((profile, i) => ({ npcId: `npc.c.${i}`, profile }));

const npcLines = (slate: NpcSlateEntry[], firstOrder: number, n = 9): CountLine[] =>
  slate.slice(0, n).map((s, i) => ({
    key: `n:${s.npcId}`,
    kind: 'npc',
    name: s.npcId,
    wardVote: s.wardVote,
    successes: s.profile * 5,
    endorsements: 0,
    order: firstOrder + i,
  }));

const player = (
  id: string,
  ward: number,
  endorsements: number,
  order = 0,
  successes = ward * 5,
): CountLine => ({
  key: `p:${id}`,
  kind: 'player',
  name: id,
  wardVote: ward,
  successes,
  endorsements,
  order,
});

const withJitter = (jitters: number[]): NpcSlateEntry[] =>
  SLATE.map((s, i) => ({ ...s, jitter: jitters[i]!, wardVote: s.profile + jitters[i]! }));

describe('the ward vote and the slate', () => {
  it('Successes ÷ 5, rounded down', () => {
    expect(wardVote(29)).toBe(5);
    expect(wardVote(30)).toBe(6);
    expect(wardVote(200)).toBe(40);
    expect(wardVote(0)).toBe(0);
  });

  it('jitter is always −2…+2, deterministic per seed, and every value is reached', () => {
    const seen = new Set<number>();
    for (let s = 0; s < 1_000; s++) {
      const a = drawNpcSlate(SLATE, createRng(`seed-${s}`));
      const b = drawNpcSlate(SLATE, createRng(`seed-${s}`));
      expect(a).toEqual(b);
      for (const e of a) {
        expect(e.jitter).toBeGreaterThanOrEqual(-2);
        expect(e.jitter).toBeLessThanOrEqual(2);
        expect(e.wardVote).toBe(e.profile + e.jitter);
        seen.add(e.jitter);
      }
    }
    expect([...seen].sort()).toEqual([-1, -2, 0, 1, 2]);
  });

  it('NPCs fill the slate to nine', () => {
    expect([0, 1, 5, 9, 10, 12].map(npcsStanding)).toEqual([9, 8, 4, 0, 0, 0]);
  });

  it('effective endorsements: members, the branch, the small-branch double', () => {
    expect(effectiveEndorsements({ members: 1, branch: false, smallBranch: false })).toBe(1);
    expect(effectiveEndorsements({ members: 0, branch: true, smallBranch: false })).toBe(1);
    expect(effectiveEndorsements({ members: 0, branch: true, smallBranch: true })).toBe(2);
    expect(effectiveEndorsements({ members: 1, branch: true, smallBranch: true })).toBe(3);
    expect(isSmallBranch(2)).toBe(true);
    expect(isSmallBranch(3)).toBe(false);
  });

  it('the close: struck at 1, standing at 2, filing order, NPCs from the top to nine', () => {
    const r = closeNominations({
      candidacies: [
        { id: 'b', filedAt: 20, members: 2, branch: false, otherEndorsers: 5 },
        { id: 'a', filedAt: 10, members: 0, branch: true, otherEndorsers: 1 },
        { id: 'c', filedAt: 5, members: 1, branch: false, otherEndorsers: 5 },
        { id: 'd', filedAt: 1, members: 0, branch: true, otherEndorsers: 3 },
      ],
      npcSlate: SLATE,
    });
    expect(r.standing).toEqual(['a', 'b']);
    expect(r.struck).toEqual(['c', 'd']);
    expect(r.effective).toEqual({ a: 2, b: 2, c: 1, d: 1 });
    expect(r.smallBranch).toMatchObject({ a: true, b: false });
    expect(r.ballotNpcs).toEqual(SLATE.slice(0, 7).map((s) => s.npcId));
  });
});

describe('the count (design §4.2 worked examples)', () => {
  const allJitters = function* () {
    for (const j of [-2, -1, 0, 1, 2]) yield SLATE.map((_, i) => (i === 0 ? j : [2, -2, 1, -1, 0][i % 5]!));
  };

  it('a day-10 reference recruit alone (40 + 6 + 1 = 47) tops the poll for every jitter', () => {
    for (const jitters of allJitters()) {
      const lines = [player('me', 40, 2), ...npcLines(withJitter(jitters), 1, 8)];
      const r = countElection(lines, { 'p:me': 1 });
      expect(r.rows[0]).toMatchObject({
        key: 'p:me',
        total: 47,
        place: 1,
        seated: true,
        endorsementsCounted: 2,
      });
      expect(r.topKey).toBe('p:me');
      expect(r.npcSeats).toBe(6);
    }
  });

  it('a day-14 casual (30 + 6 + 1 = 37) takes a seat, not the top, for every jitter', () => {
    for (const j0 of [-2, -1, 0, 1, 2]) {
      for (const j1 of [-2, 2]) {
        const jitters = [j0, j1, 2, 2, 2, 2, 2, 2, 2];
        const lines = [player('me', 30, 2), ...npcLines(withJitter(jitters), 1, 8)];
        const r = countElection(lines, { 'p:me': 1 });
        const me = r.rows.find((x) => x.key === 'p:me')!;
        expect(me.total).toBe(37);
        expect(me.seated).toBe(true);
        expect(me.place).toBeGreaterThan(1);
      }
    }
  });

  it('ties: votes, then endorsements, then Successes, then filing; NPCs after players', () => {
    // Same totals (20): a on votes, b and c on endorsements, d and e on Successes, f and g on order.
    const lines: CountLine[] = [
      player('g', 20, 0, 6, 100),
      player('a', 17, 0, 0),
      player('b', 14, 2, 1),
      player('c', 17, 1, 2),
      player('d', 20, 0, 3, 110),
      player('e', 20, 0, 4, 105),
      { ...player('f', 20, 0, 5, 100), kind: 'npc', key: 'n:f' },
    ];
    const r = countElection(lines, { 'p:a': 3 });
    expect(r.rows.map((x) => x.name)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(r.rows.every((x) => x.total === 20)).toBe(true);
  });

  it('endorsements past five add nothing to the total but still break ties', () => {
    const r = countElection([player('a', 10, 7), player('b', 10, 5, 1)], {});
    expect(r.rows[0]).toMatchObject({ name: 'a', endorsementsCounted: 5, total: 25 });
    expect(r.rows[1]).toMatchObject({ name: 'b', total: 25 });
  });

  it('nine names: seven seats and two losers; the margins; the last seat', () => {
    const lines = npcLines(withJitter([0, 0, 0, 0, 0, 0, 0, 0, 0]), 0);
    const r = countElection(lines, { 'n:npc.c.8': 3 });
    expect(r.rows.filter((x) => x.seated)).toHaveLength(7);
    expect(r.rows.filter((x) => !x.seated).map((x) => x.name)).toEqual(['npc.c.8', 'npc.c.7']);
    expect(r.lastSeatKey).toBe('n:npc.c.6');
    expect(r.npcSeats).toBe(7);
    const eighth = r.rows[7]!;
    expect(marginToSeat(eighth, r)).toBe(19 - 18);
    expect(marginToSeat(r.rows[0]!, r)).toBe(0);
  });
});

describe('the division (design §10.4)', () => {
  const branch = { ordinanceId: 'ord.shift-hours', branch: true, movedAt: 0 };
  const x = { ordinanceId: 'ord.open-doors', branch: false, movedAt: 10 };
  const y = { ordinanceId: 'ord.street-fund', branch: false, movedAt: 5 };

  it('no player votes: the branch passes 7–0, or 6–0 beside a silent councillor', () => {
    expect(divide({ items: [branch], playerVotes: [], npcSeats: 7, unrest: false })).toMatchObject({
      npcChoice: 'ord.shift-hours',
      passed: 'ord.shift-hours',
      tallies: [
        { choice: 'ord.shift-hours', player: 0, npc: 7 },
        { choice: AGAINST_ALL, player: 0, npc: 0 },
      ],
    });
    const six = divide({ items: [branch, x], playerVotes: [], npcSeats: 6, unrest: false });
    expect(six.tallies[0]).toEqual({ choice: 'ord.shift-hours', player: 0, npc: 6 });
    expect(six.passed).toBe('ord.shift-hours');
  });

  it('one player vote for X: X passes with the NPCs', () => {
    const r = divide({
      items: [branch, x],
      playerVotes: [{ choice: x.ordinanceId }],
      npcSeats: 6,
      unrest: false,
    });
    expect(r.npcChoice).toBe(x.ordinanceId);
    expect(r.passed).toBe(x.ordinanceId);
  });

  it('a tie between X and the branch goes to the branch; between X and Y to the earliest moved', () => {
    const a = divide({
      items: [branch, x],
      playerVotes: [{ choice: x.ordinanceId }, { choice: branch.ordinanceId }],
      npcSeats: 5,
      unrest: false,
    });
    expect(a.passed).toBe(branch.ordinanceId);
    const b = divide({
      items: [branch, x, y],
      playerVotes: [{ choice: x.ordinanceId }, { choice: y.ordinanceId }],
      npcSeats: 5,
      unrest: false,
    });
    expect(b.npcChoice).toBe(y.ordinanceId);
  });

  it('seven players split 3/3/1: nothing passes', () => {
    const votes = [
      ...Array(3).fill({ choice: x.ordinanceId }),
      ...Array(3).fill({ choice: y.ordinanceId }),
      { choice: branch.ordinanceId },
    ];
    const r = divide({ items: [branch, x, y], playerVotes: votes, npcSeats: 0, unrest: false });
    expect(r.passed).toBeNull();
    expect(r.npcChoice).toBeNull();
  });

  it('Unrest: the NPCs abstain, and three player votes fail', () => {
    const r = divide({
      items: [branch, x],
      playerVotes: Array(3).fill({ choice: x.ordinanceId }),
      npcSeats: 4,
      unrest: true,
    });
    expect(r).toMatchObject({ npcChoice: null, npcAbstained: true, passed: null });
  });

  it('every player votes Against all: the NPCs vote the branch (design §17 Q15)', () => {
    const r = divide({
      items: [branch, x],
      playerVotes: [{ choice: AGAINST_ALL }, { choice: AGAINST_ALL }],
      npcSeats: 5,
      unrest: false,
    });
    expect(r.passed).toBe(branch.ordinanceId);
    expect(r.tallies.find((t) => t.choice === AGAINST_ALL)).toEqual({
      choice: AGAINST_ALL,
      player: 2,
      npc: 0,
    });
  });
});

describe('the stipend (ADR 0020)', () => {
  const term = { fromDay: 100, toDay: 105 };
  it('five boundaries a term; none before the first held; an away councillor gets all five', () => {
    expect(stipendBoundaries([term], 100, 100)).toBe(0);
    expect(stipendBoundaries([term], 100, 101)).toBe(1);
    expect(stipendBoundaries([term], 99, 110)).toBe(5);
    expect(stipendBoundaries([term], 104, 110)).toBe(1);
    expect(stipendBoundaries([term], 105, 110)).toBe(0);
    expect(stipendBoundaries([term, { fromDay: 105, toDay: 110 }], 99, 110)).toBe(10);
    expect(stipendBoundaries([term], null, 110)).toBe(0);
  });
});
