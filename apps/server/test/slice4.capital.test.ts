/**
 * Slice 4, T17 (tech design §8.4, §15 "the count" and "secrecy"; ADR 0027): the capital's
 * politics. The design's worked examples end to end (seeded ballots in Eastside and the Government
 * Quarter), cross-faction ballots, turnout, the windows, a district candidacy and its endorsements,
 * the order paper's branch motions and a coalition passing 7–3, and ballot secrecy.
 */
import { randomUUID } from 'node:crypto';
import { Character, City, Election, OfficeTerm, OrderPaper } from '@irongate/db';
import type { ElectionDoc, OfficeTermDoc } from '@irongate/db';
import { FACTION_IDS } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleCityDay } from '../src/services/cityDay';
import { gameData, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, content, traveller } from './slice4.helpers';

const D0 = 20730; // Sun 4 Oct 2026: Irongate cycle day 0 (cycle 4146)
const key = () => randomUUID();
const E = 'irongate.eastside';
const GQ = 'irongate.government-quarter';
type Factions = Array<{ factionId: FactionId; ballots: number; score: number; seats: number }>;

beforeAll(async () => {
  await setupDb('slice4-capital-test');
});
afterAll(teardownDb);

const resident = (
  clock: ReturnType<typeof testClock>,
  districtId: string,
  factionId: FactionId,
  name: string,
) => traveller(clock, { name, factionId, cityId: 'irongate', residence: { cityId: 'irongate', districtId } });

describe('the count in a district (design §8.2, end to end)', () => {
  it('Eastside 15 / 35 / 15: no ballots → the Collective both seats; two Vanguard ballots → Collective, Vanguard', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0 + 2));
    await settleCityDay(content, 'irongate', clock.now());
    // Two Vanguard residents of Eastside vote, one for each Vanguard local; a Collective resident
    // votes across the floor for an Alliance local (any name on the list).
    const v1 = await resident(clock, E, 'vanguard', 'Hans Vogel');
    const v2 = await resident(clock, E, 'vanguard', 'Ines Roth');
    const c1 = await resident(clock, E, 'collective', 'Jana Holm');
    const ballot = (await v1.caller.council.election()).candidates;
    expect(ballot).toHaveLength(6);
    expect(new Set(ballot.map((x) => x.factionId))).toEqual(new Set(FACTION_IDS));
    await v1.caller.council.vote({ candidateKey: 'n:npc.v.ig.hollmann', idempotencyKey: key() });
    await v2.caller.council.vote({ candidateKey: 'n:npc.v.ig.wirth', idempotencyKey: key() });
    const cross = await c1.caller.council.vote({ candidateKey: 'n:npc.a.ig.baumann', idempotencyKey: key() });
    // No opinion moves and no morale in the capital (design §8.6).
    expect(cross.knockOns.morale).toBeNull();
    clock.set(at(D0 + 5));
    await settleCityDay(content, 'irongate', clock.now());
    const e = (await Election.findById(`${E}:4146`).lean<ElectionDoc>())!;
    const res = e.result as unknown as { factions: Factions; w: number; ballots: number; tie: string | null };
    // Three ballots: w = 15; Vanguard 2, Alliance 1; the Collective still leads on opinion.
    expect([res.ballots, res.w]).toEqual([3, 15]);
    // Rows are grouped by party; the first seat is the top key's (D'Hondt's order).
    const rows = e.result!.rows as unknown as Array<{ key: string; seated: boolean; factionId: string }>;
    expect(rows.find((r) => r.key === e.result!.topKey)!.factionId).toBe('collective');
    expect(
      rows
        .filter((r) => r.seated)
        .map((r) => r.factionId)
        .sort(),
    ).toEqual(['collective', 'vanguard']);
    expect(e.result!.turnout).toEqual({ voters: 3, eligible: 3 });
    // The capital's count view: five districts, the player's first, their own vote marked.
    const view = (await v1.caller.council.capitalCount())!;
    expect(view.kind).toBe('capital');
    expect(view.districts[0]!.districtId).toBe(E);
    expect(view.districts[0]!.rows.find((r) => r.yourVote)?.name).toBe('Georg Hollmann');
    expect(view.districts.every((d) => d.seats.length === 2)).toBe(true);
    expect(Object.values(view.seatsByFaction).reduce((a, b) => a + b, 0)).toBe(10);
    // Ten terms for council 4147, two per district.
    const terms = await OfficeTerm.find({ councilKey: 'irongate:4147' }).lean<OfficeTermDoc[]>();
    expect(terms.filter((t) => t.districtId === E).map((t) => [t.seat, t.factionId])).toEqual([
      [7, 'collective'],
      [8, 'vanguard'],
    ]);
  });

  it('the Government Quarter 20 / 20 / 20 with one Alliance ballot: seat 1 Alliance, seat 2 on the draw', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0 + 3));
    await settleCityDay(content, 'irongate', clock.now());
    const a = await resident(clock, GQ, 'alliance', 'Karl Ober');
    await a.caller.council.vote({ candidateKey: 'n:npc.a.ig.keller', idempotencyKey: key() });
    clock.set(at(D0 + 5));
    await settleCityDay(content, 'irongate', clock.now());
    const e = (await Election.findById(`${GQ}:4146`).lean<ElectionDoc>())!;
    const res = e.result as unknown as { w: number; tie: string | null };
    expect(res.w).toBe(5);
    expect(res.tie).toBe('draw');
    const rows = e.result!.rows as unknown as Array<{ factionId: string; key: string; seated: boolean }>;
    expect(rows.find((r) => r.key === e.result!.topKey)!.factionId).toBe('alliance');
    const second = rows.find((r) => r.seated && r.key !== e.result!.topKey)!;
    expect(['vanguard', 'collective']).toContain(second.factionId);
  });
});

describe('the windows and the candidacy (ADR 0026 §3, design §8.1)', () => {
  it('a new resident votes from the next polls; stands from the next nominations; endorsements stay in the faction', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0 + 2));
    await settleCityDay(content, 'irongate', clock.now());
    const late = await traveller(clock, {
      name: 'Lena Ritz',
      cityId: 'irongate',
      residence: {
        cityId: 'irongate',
        districtId: E,
        windows: { votesFromDay: D0 + 7, standsFromDay: D0 + 5 },
      },
    });
    const e = gameData(
      await late.caller.council
        .vote({ candidateKey: 'n:npc.c.ig.novak', idempotencyKey: key() })
        .catch((x: unknown) => x),
    );
    expect(e.game).toMatchObject({ reason: 'NOT_YET_VOTER' });
    expect((await late.caller.council.election()).ballot).toMatchObject({
      canVote: false,
      reason: 'NOT_YET_VOTER',
    });
    expect((await late.caller.city.get({ cityId: 'irongate' })).election?.card.state).toBe('registered');

    // The next cycle's nominations: a Rank 3, Known in Irongate, stands in Eastside.
    clock.set(at(D0 + 5));
    const cand = await traveller(clock, {
      name: 'Mira Sand',
      fxp: 2_000,
      pc: 40,
      irongateSuccesses: 30,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: E },
    });
    const filed = await cand.caller.council.declare({
      platformId: content.faction('collective').platforms[0]!.id,
      idempotencyKey: key(),
    });
    expect(filed.view.kind).toBe('election');
    const candidacyId = filed.view.kind === 'election' ? filed.view.election.candidacy!.candidacyId : '';
    // A Vanguard member cannot back a Collective candidate (WRONG_FACTION); a Collective member of
    // another district can, once a cycle in the city.
    const rival = await traveller(clock, {
      name: 'Nils Berg',
      factionId: 'vanguard',
      pc: 20,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: E },
    });
    expect(
      gameData(
        await rival.caller.council.endorse({ candidacyId, idempotencyKey: key() }).catch((x: unknown) => x),
      ).game,
    ).toMatchObject({ reason: 'WRONG_FACTION', factionId: 'collective' });
    const backer = await traveller(clock, {
      name: 'Olga Penn',
      pc: 20,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: 'irongate.old-town' },
    });
    const r = await backer.caller.council.endorse({ candidacyId, idempotencyKey: key() });
    expect(r.knockOns.endorsements).toMatchObject({ name: 'Mira Sand', n: 1 });
    const doc = (await Character.findById(backer.id).lean())!;
    expect(doc.endorsementsGiven.at(-1)).toMatchObject({
      cityCycle: 'irongate:4147',
      electionId: `${E}:4147`,
    });
  });
});

describe('the council in the capital (design §8.4)', () => {
  it('the seated blocs move their branch motions; one player crossing the floor carries their locals: 7 of 10', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0));
    await settleCityDay(content, 'irongate', clock.now());
    const paper = (await OrderPaper.findById('irongate:4146').lean())!;
    const terms = await OfficeTerm.find({ councilKey: 'irongate:4146' }).lean<OfficeTermDoc[]>();
    const seats = Object.fromEntries(
      FACTION_IDS.map((f) => [f, terms.filter((t) => t.factionId === f).length]),
    ) as Record<FactionId, number>;
    // One branch motion per seated bloc, the largest bloc's first.
    const movers = paper.items.map((i) => i.movedBy.factionId!);
    expect([...movers].sort()).toEqual(FACTION_IDS.filter((f) => seats[f] > 0).sort());
    expect(seats[movers[0]!]).toBe(Math.max(...Object.values(seats)));
    expect(paper.items.map((i) => i.ordinanceId)).toEqual(movers.map((f) => content.faction(f).branchMotion));
    const top = paper.items[0]!.movedBy.factionId!;
    const other = FACTION_IDS.find((f) => f !== top && seats[f] > 0 && seats[top] + seats[f] >= 6)!;
    expect(other).toBeDefined();
    // A player of the other bloc takes one of its seats and votes for the top bloc's motion.
    const p = await traveller(clock, {
      name: 'Paul Kurz',
      factionId: other,
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: E },
    });
    const seat = terms.find((t) => t.factionId === other)!;
    await OfficeTerm.updateOne(
      { _id: seat._id },
      { $set: { holder: { kind: 'player', characterId: p.id, name: 'Paul Kurz' } } },
    );
    const chamber = await p.caller.council.chamber();
    expect([chamber.passVotes, chamber.seatCount, chamber.you.councillor]).toEqual([6, 10, true]);
    expect(chamber.paper.items[0]!.branchOf).toBe(top);
    await p.caller.council.councilVote({ choice: paper.items[0]!.ordinanceId, idempotencyKey: key() });
    clock.set(at(D0 + 2));
    await settleCityDay(content, 'irongate', clock.now());
    const divided = (await OrderPaper.findById('irongate:4146').lean())!;
    const tally = divided.division!.tallies.find((t) => t.choice === paper.items[0]!.ordinanceId)!;
    expect(tally.player + tally.npc).toBe(seats[top] + seats[other]);
    expect(divided.division!.passed).toBe(paper.items[0]!.ordinanceId);
    expect((await City.findById('irongate').lean())!.ordinance).toMatchObject({
      id: paper.items[0]!.ordinanceId,
      fromDay: D0 + 2,
      toDay: D0 + 7,
    });
  });
});

describe('secrecy (ADR 0019)', () => {
  it("during the capital's polls no procedure shows another player's ballot or a total", async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0 + 3));
    await settleCityDay(content, 'irongate', clock.now());
    const voter = await resident(clock, E, 'collective', 'Rosa Klee');
    const other = await resident(clock, E, 'alliance', 'Sven Dorn');
    await voter.caller.council.vote({ candidateKey: 'n:npc.v.ig.wirth', idempotencyKey: key() });
    const seen = JSON.stringify([
      await other.caller.council.election(),
      await other.caller.city.get({ cityId: 'irongate' }),
      await other.caller.paper.today(),
      await other.caller.character.me(),
    ]);
    expect(seen).not.toMatch(/"ballots":\s*[1-9]/);
    expect(seen).not.toMatch(/"votes":\s*[1-9]/);
    expect(seen).not.toContain('Rosa Klee');
    expect((await other.caller.council.election()).ballot?.cast).toBeNull();
  });
});
