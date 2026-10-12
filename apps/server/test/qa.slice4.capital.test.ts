/**
 * QA slice 4: the capital's elections (GDD §15.3, §15.10, design §8, ADR 0026–0027). What the
 * developer's tests leave open: who may vote where (a visitor, another district's resident, a Rank 1),
 * who may stand (Known in Irongate, not at home; the standing window), one endorsement a cycle across
 * districts and none from a non-resident, the ballot's NPC fill with players standing, the turnout
 * weight's full 50 at ten ballots (nine against ten flips the second seat), and the ten seats'
 * numbering and turnout's eligible roll.
 */
import { randomUUID } from 'node:crypto';
import { Candidacy, Character, Election, OfficeTerm } from '@irongate/db';
import type { CandidacyDoc, ElectionDoc, OfficeTermDoc } from '@irongate/db';
import type { FactionId } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleCityDay } from '../src/services/cityDay';
import { gameData, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, content, traveller } from './slice4.helpers';

const D0 = 20730; // Sun 4 Oct 2026: Irongate cycle day 0 (cycle 4146)
const E = 'irongate.eastside';
const OT = 'irongate.old-town';
const key = () => randomUUID();
const reason = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => {
        throw new Error('expected a refusal');
      },
      (e: unknown) => e,
    ),
  ).game?.reason;

const resident = (
  clock: ReturnType<typeof testClock>,
  districtId: string,
  factionId: FactionId,
  name: string,
  extra: Parameters<typeof traveller>[1] = {},
) =>
  traveller(clock, {
    name,
    factionId,
    cityId: 'irongate',
    residence: { cityId: 'irongate', districtId },
    ...extra,
  });

beforeAll(async () => {
  await setupDb('qa-slice4-capital');
});
afterAll(teardownDb);

describe('who stands (GDD §15.3: Rank 3, resident, Known in Irongate, not a sitting councillor)', () => {
  it('Known at home is not Known in the capital; 29 Successes there refused, 30 stands; the window and the seat refuse', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0));
    await settleCityDay(content, 'irongate', clock.now());
    const platform = content.faction('collective').branchMotion;
    const homeKnown = await resident(clock, E, 'collective', 'Home Known', {
      fxp: 2_000,
      pc: 40,
      successes: 400,
      irongateSuccesses: 29,
    });
    expect(await reason(homeKnown.caller.council.declare({ ordinanceId: platform, idempotencyKey: key() }))).toBe(
      'NOT_KNOWN',
    );
    await Character.updateOne(
      { _id: homeKnown.id },
      { $set: { localStanding: [{ cityId: 'irongate', successes: 30 }] }, $inc: { version: 1 } },
    );
    const filed = await homeKnown.caller.council.declare({ ordinanceId: platform, idempotencyKey: key() });
    expect(filed.act).toBe('declare');
    const late = await resident(clock, E, 'collective', 'Late Comer', {
      fxp: 2_000,
      pc: 40,
      irongateSuccesses: 30,
      residence: { cityId: 'irongate', districtId: E, windows: { standsFromDay: D0 + 5 } },
    });
    expect(await reason(late.caller.council.declare({ ordinanceId: platform, idempotencyKey: key() }))).toBe(
      'NOT_YET_CANDIDATE',
    );
    const sitting = await resident(clock, OT, 'collective', 'Sits Already', {
      fxp: 2_000,
      pc: 40,
      irongateSuccesses: 30,
    });
    const seat = (await OfficeTerm.findOne({ councilKey: 'irongate:4146' }).lean<OfficeTermDoc>())!;
    await OfficeTerm.updateOne(
      { _id: seat._id },
      { $set: { holder: { kind: 'player', characterId: sitting.id, name: 'Sits Already' } } },
    );
    expect(await reason(sitting.caller.council.declare({ ordinanceId: platform, idempotencyKey: key() }))).toBe(
      'SITTING_COUNCILLOR',
    );
  });

  it('one endorsement a cycle in the city, across districts; none from a member who lives at home', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0));
    await settleCityDay(content, 'irongate', clock.now());
    const platform = content.faction('collective').branchMotion;
    const stand = async (districtId: string, name: string) => {
      const p = await resident(clock, districtId, 'collective', name, { fxp: 2_000, pc: 40, irongateSuccesses: 30 });
      const r = await p.caller.council.declare({ ordinanceId: platform, idempotencyKey: key() });
      return r.view.kind === 'election' ? r.view.election.candidacy!.candidacyId : '';
    };
    const inEast = await stand(E, 'East Stander');
    const inOld = await stand(OT, 'Old Stander');
    const backer = await resident(clock, 'irongate.station-market', 'collective', 'Busy Backer', { pc: 40 });
    await backer.caller.council.endorse({ candidacyId: inEast, idempotencyKey: key() });
    expect(await reason(backer.caller.council.endorse({ candidacyId: inOld, idempotencyKey: key() }))).toBe(
      'ALREADY_ENDORSED',
    );
  });

  it('a member who lives at home cannot back a capital candidate (Ashford and Irongate both in nominations)', async () => {
    await resetCity('irongate');
    // Mon 5 Oct: Irongate cycle day 1, Ashford cycle day 0 (Coalport's nominations never meet the capital's).
    const clock = testClock(at(D0 + 1));
    await settleCityDay(content, 'irongate', clock.now());
    const stander = await resident(clock, E, 'alliance', 'Ally Stander', { fxp: 2_000, pc: 40, irongateSuccesses: 30 });
    const r = await stander.caller.council.declare({
      ordinanceId: content.faction('alliance').branchMotion,
      idempotencyKey: key(),
    });
    const candidacyId = r.view.kind === 'election' ? r.view.election.candidacy!.candidacyId : '';
    const fromHome = await traveller(clock, { name: 'Home Backer', factionId: 'alliance', pc: 40, cityId: 'irongate' });
    expect((await fromHome.caller.council.election()).phase).toBe('nominations');
    expect(await reason(fromHome.caller.council.endorse({ candidacyId, idempotencyKey: key() }))).toBe(
      'UNKNOWN_CANDIDACY',
    );
    expect((await Character.findById(fromHome.id).lean())!.pc).toBe(40);
  });
});

describe('the ballot (GDD §15.10: NPCs fill each faction’s list to two names)', () => {
  it('one Collective player standing: six names, one Collective local; three standing: seven names, no Collective local', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0));
    await settleCityDay(content, 'irongate', clock.now());
    const platform = content.faction('collective').branchMotion;
    const standIn = async (districtId: string, name: string) => {
      const p = await resident(clock, districtId, 'collective', name, { fxp: 2_000, pc: 40, irongateSuccesses: 30 });
      await p.caller.council.declare({ ordinanceId: platform, idempotencyKey: key() });
      const cand = (await Candidacy.findOne({ characterId: p.id }).lean<CandidacyDoc>())!;
      // Two members' endorsements, so the candidacy stands at the close.
      await Candidacy.updateOne(
        { _id: cand._id },
        {
          $push: {
            endorsements: {
              $each: [1, 2].map(() => ({
                characterId: new Character()._id,
                name: 'A Member',
                day: D0,
                at: new Date(at(D0)),
              })),
            },
          },
        },
      );
      return p;
    };
    await standIn(E, 'East One');
    for (const n of ['Old One', 'Old Two', 'Old Three']) await standIn(OT, n);
    clock.set(at(D0 + 2));
    await settleCityDay(content, 'irongate', clock.now());
    const ballot = async (d: string) => (await Election.findById(`${d}:4146`).lean<ElectionDoc>())!.ballot!;
    const east = await ballot(E);
    expect(east).toHaveLength(6);
    expect(east.filter((b) => b.factionId === 'collective').map((b) => b.kind)).toEqual(['player', 'npc']);
    // The faction's top local by profile fills the list (Pavel Novak, 28).
    expect(east.find((b) => b.factionId === 'collective' && b.kind === 'npc')!.name).toBe('Pavel Novak');
    const old = await ballot(OT);
    expect(old).toHaveLength(7);
    expect(old.filter((b) => b.factionId === 'collective').every((b) => b.kind === 'player')).toBe(true);
    for (const f of ['vanguard', 'alliance'] as const)
      expect(old.filter((b) => b.factionId === f && b.kind === 'npc')).toHaveLength(2);
  });
});

describe('the count: the turnout weight (GDD §15.3: w = 50 × min(1, ballots ÷ 10))', () => {
  async function eastsideWith(ballots: number) {
    await resetCity('irongate');
    const clock = testClock(at(D0 + 2));
    await settleCityDay(content, 'irongate', clock.now());
    for (let i = 0; i < ballots; i++) {
      const v = await resident(clock, E, 'alliance', `Voter ${i}`);
      await v.caller.council.vote({ ordinanceId: content.faction('alliance').branchMotion, idempotencyKey: key() });
    }
    clock.set(at(D0 + 5));
    await settleCityDay(content, 'irongate', clock.now());
    const e = (await Election.findById(`${E}:4146`).lean<ElectionDoc>())!;
    const r = e.result as unknown as {
      w: number;
      ballots: number;
      factions: Array<{ factionId: FactionId; score: number; seats: number }>;
      seatsByFaction: Record<FactionId, number>;
      turnout: { voters: number; eligible: number };
    };
    return r;
  }

  it('nine Alliance ballots in Eastside: w 45, the Collective keeps the second seat on opinion', async () => {
    const r = await eastsideWith(9);
    expect([r.ballots, r.w]).toEqual([9, 45]);
    expect(r.seatsByFaction).toEqual({ vanguard: 0, collective: 1, alliance: 1 });
    // Eligible: active Rank 2+ residents of Eastside (this file's earlier residents count too) ∪ voters.
    expect(r.turnout.voters).toBe(9);
    expect(r.turnout.eligible).toBeGreaterThanOrEqual(9);
  });

  it('ten Alliance ballots: w 50 (the full half), the Alliance takes both seats (61.5 ÷ 2 > 26.9)', async () => {
    const r = await eastsideWith(10);
    expect([r.ballots, r.w]).toEqual([10, 50]);
    const a = r.factions.find((f) => f.factionId === 'alliance')!.score;
    const c = r.factions.find((f) => f.factionId === 'collective')!.score;
    expect(a / 2).toBeGreaterThan(c);
    expect(r.seatsByFaction).toEqual({ vanguard: 0, collective: 0, alliance: 2 });
    // Scores always add to 100 (both halves are shares).
    expect(r.factions.reduce((s, f) => s + f.score, 0)).toBeCloseTo(100, 9);
  });

  it('ten seats, two a district, numbered by district (1–2 … 9–10), the factions as counted', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0 + 4));
    await settleCityDay(content, 'irongate', clock.now());
    clock.set(at(D0 + 5));
    await settleCityDay(content, 'irongate', clock.now());
    const terms = await OfficeTerm.find({ councilKey: 'irongate:4147' }).sort({ seat: 1 }).lean<OfficeTermDoc[]>();
    expect(terms.map((t) => t.seat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const order = content.districtsOf('irongate').map((q) => q.id);
    for (const t of terms) expect(t.districtId).toBe(order[Math.floor((t.seat - 1) / 2)]);
    for (const q of order) {
      const e = (await Election.findById(`${q}:4146`).lean<ElectionDoc>())!;
      const seated = (e.result!.rows as unknown as Array<{ seated: boolean; factionId: FactionId }>)
        .filter((r) => r.seated)
        .map((r) => r.factionId)
        .sort();
      expect(
        terms
          .filter((t) => t.districtId === q)
          .map((t) => t.factionId)
          .sort(),
        q,
      ).toEqual(seated);
    }
  });
});
