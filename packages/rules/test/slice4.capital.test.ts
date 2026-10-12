/** Slice 4, T5 (tech design §6.10): the capital's count, the design's worked examples. */
import { describe, expect, it } from 'vitest';
import {
  councilOrder,
  countDistrict,
  createRng,
  dhondt,
  districtScores,
  npcFill,
  turnoutWeight,
} from '../src';
import type { DistrictCountLine, FactionId, OpinionShares, Rng } from '../src';

const S = (vanguard: number, collective: number, alliance: number, neutral: number): OpinionShares => ({
  vanguard,
  collective,
  alliance,
  neutral,
});
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Two NPCs per faction (profiles 28 and 20), plus any players. */
function lines(
  players: Array<{ key: string; factionId: FactionId; wardVote?: number }> = [],
): DistrictCountLine[] {
  const out: DistrictCountLine[] = [];
  let order = 0;
  for (const p of players)
    out.push({
      key: p.key,
      kind: 'player',
      name: p.key,
      wardVote: p.wardVote ?? 6,
      successes: 30,
      backers: 2,
      order: order++,
      factionId: p.factionId,
    });
  for (const f of ['vanguard', 'collective', 'alliance'] as const) {
    const own = players.filter((p) => p.factionId === f).length;
    [28, 20].slice(0, npcFill(own)).forEach((profile, i) =>
      out.push({
        key: `n:${f}${i}`,
        kind: 'npc',
        name: `${f}${i}`,
        wardVote: profile,
        successes: profile * 5,
        backers: 0,
        order: 100 + order++,
        factionId: f,
      }),
    );
  }
  return out;
}

/** A draw that always returns the factions in faction order. */
const orderedRng: Rng = { seed: 'o', next: () => 0, int: (min) => min, roll100: () => 1 };

describe('the turnout weight and the score (design §8.2)', () => {
  it('w is five a ballot to 50 at ten ballots', () => {
    expect([0, 1, 2, 5, 9, 10, 11, 12].map(turnoutWeight)).toEqual([0, 5, 10, 25, 45, 50, 50, 50]);
  });

  it('Eastside 15 / 35 / 15 with no ballots: the Collective takes both seats (26.9 beats 23.1)', () => {
    const scores = districtScores({ ballotsByFaction: {}, opinion: S(15, 35, 15, 35) });
    expect(scores.map((s) => r1(s.score))).toEqual([23.1, 53.8, 23.1]);
    expect(dhondt(scores, 2, ['vanguard', 'collective', 'alliance']).seats).toEqual([
      'collective',
      'collective',
    ]);
    const r = countDistrict({
      lines: lines(),
      ballotsByFaction: { vanguard: 0, collective: 0, alliance: 0 },
      opinion: S(15, 35, 15, 35),
      rng: createRng('east'),
    });
    expect(r.seatsByFaction).toEqual({ vanguard: 0, collective: 2, alliance: 0 });
    expect(r.seated.map((x) => x.key)).toEqual(['n:collective0', 'n:collective1']);
    expect([r.w, r.ballots, r.tie]).toEqual([0, 0, null]);
  });

  it('two Vanguard ballots: w 10, V 30.8, C 48.5, A 20.8 → Collective, Vanguard', () => {
    const ls = lines();
    const r = countDistrict({
      lines: ls,
      ballotsByFaction: { vanguard: 2, collective: 0, alliance: 0 },
      opinion: S(15, 35, 15, 35),
      rng: createRng('east'),
    });
    expect(r.w).toBe(10);
    expect(r.factions.map((f) => r1(f.score))).toEqual([30.8, 48.5, 20.8]);
    expect(r.seated.map((x) => x.factionId)).toEqual(['collective', 'vanguard']);
  });

  it('the Government Quarter 20 / 20 / 20 with one Alliance ballot: seat 1 Alliance, seat 2 on the draw', () => {
    const scores = districtScores({ ballotsByFaction: { alliance: 1 }, opinion: S(20, 20, 20, 40) });
    expect(scores.map((s) => r1(s.score))).toEqual([31.7, 31.7, 36.7]);
    const a = dhondt(scores, 2, ['collective', 'vanguard', 'alliance']);
    expect(a).toEqual({ seats: ['alliance', 'collective'], drawn: true });
    const b = dhondt(scores, 2, ['vanguard', 'alliance', 'collective']);
    expect(b).toEqual({ seats: ['alliance', 'vanguard'], drawn: true });
    const r = countDistrict({
      lines: lines(),
      ballotsByFaction: { vanguard: 0, collective: 0, alliance: 1 },
      opinion: S(20, 20, 20, 40),
      rng: orderedRng,
    });
    expect(r.seated.map((x) => x.factionId)).toEqual(['alliance', 'vanguard']);
    expect(r.tie).toBe('draw');
  });
});

describe('the tie order and the forfeit', () => {
  it('ties: ballots, then opinion share, then the draw', () => {
    // Equal scores, more ballots wins.
    const rows = [
      { factionId: 'vanguard' as const, ballots: 1, ballotShare: 0.5, opinionShare: 0.3, score: 40 },
      { factionId: 'collective' as const, ballots: 1, ballotShare: 0.5, opinionShare: 0.4, score: 40 },
      { factionId: 'alliance' as const, ballots: 0, ballotShare: 0, opinionShare: 0.3, score: 40 },
    ];
    expect(dhondt(rows, 1, ['alliance', 'vanguard', 'collective'])).toEqual({
      seats: ['collective'],
      drawn: false,
    });
    const tied = rows.map((r) => ({ ...r, ballots: 0, opinionShare: 1 / 3 }));
    expect(dhondt(tied, 1, ['alliance', 'vanguard', 'collective'])).toEqual({
      seats: ['alliance'],
      drawn: true,
    });
    const byBallots = rows.map((r) => ({ ...r, opinionShare: 1 / 3 }));
    expect(dhondt(byBallots, 1, ['alliance', 'vanguard', 'collective']).seats).toEqual(['vanguard']);
  });

  it('a faction with no candidate forfeits to the next', () => {
    const scores = districtScores({ ballotsByFaction: {}, opinion: S(15, 35, 15, 35) });
    const r = dhondt(scores, 2, ['vanguard', 'collective', 'alliance'], (f) => f !== 'collective');
    expect(r.seats).toEqual(['vanguard', 'alliance']);
    // One candidate only: the second seat goes elsewhere.
    expect(
      dhondt(scores, 2, ['vanguard', 'collective', 'alliance'], (f, won) => f !== 'collective' || won < 1)
        .seats,
    ).toEqual(['collective', 'vanguard']);
  });

});

describe('the order of the blocs (design §8.4)', () => {
  it('the branch motions in order of seats, then the tie rule', () => {
    expect(
      councilOrder({ vanguard: 3, collective: 4, alliance: 3 }, { alliance: 2 }, S(20, 20, 20, 40), [
        'vanguard',
        'collective',
        'alliance',
      ]),
    ).toEqual(['collective', 'alliance', 'vanguard']);
    expect(
      councilOrder({ vanguard: 5, collective: 5 }, {}, S(20, 20, 20, 40), [
        'collective',
        'vanguard',
        'alliance',
      ]),
    ).toEqual(['collective', 'vanguard']);
  });
});
