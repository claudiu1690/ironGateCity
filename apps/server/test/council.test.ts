/**
 * The political acts (tech design §8.2, §14; ADR 0018, 0019): every refusal writes nothing, keys
 * replay the modal, concurrent duplicates surface as domain refusals, votes race the count, and no
 * procedure leaks a ballot or a total during the polls.
 */
import { getContent } from '@irongate/content';
import { Candidacy, Character, City, Election, OfficeTerm, OrderPaper, Vote } from '@irongate/db';
import { MORALE } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleCityDay } from '../src/services/cityDay';
import { gameData, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, doTodaysOrders, key, nextCycleDay, player } from './politics.helpers';
import type { Player } from './politics.helpers';

const content = getContent();

beforeAll(async () => {
  await setupDb('council-test');
});
afterAll(teardownDb);

const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => null,
      (e: unknown) => e,
    ),
  );

async function pcOf(p: Player) {
  return (await Character.findById(p.id).lean())!.pc;
}

describe('refusals write nothing', () => {
  it('declare, withdraw, endorse', async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 20780);
    const clock = testClock(at(D0));
    const low = await player(clock, { fxp: 400, successes: 200, pc: 45 });
    const unknown = await player(clock, { fxp: 2_000, successes: 20, pc: 45 });
    const poor = await player(clock, { fxp: 2_000, successes: 200, pc: 5 });
    const ok = await player(clock, { fxp: 2_000, successes: 200, pc: 45, name: 'Ok Candidate' });

    expect(
      await refusal(low.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'RANK_TOO_LOW', need: 3, fxpToGo: 1_600 },
    });
    expect(
      await refusal(unknown.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() })),
    ).toMatchObject({ game: { reason: 'NOT_KNOWN', successes: 20, need: 30 } });
    expect(
      await refusal(poor.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'NOT_ENOUGH_PC', pc: 5, cost: 10 },
    });
    expect(
      await refusal(ok.caller.council.declare({ platformId: 'plat.v.order', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'UNKNOWN_PLATFORM' },
    });
    expect(await refusal(ok.caller.council.withdraw({ idempotencyKey: key() }))).toMatchObject({
      game: { reason: 'NOT_FILED', status: null },
    });
    expect(await Candidacy.countDocuments({ cityId: 'coalport' })).toBe(0);
    expect([await pcOf(low), await pcOf(unknown), await pcOf(poor), await pcOf(ok)]).toEqual([45, 45, 5, 45]);

    // Declare, withdraw, declare again: refused with the withdrawn status.
    const k = key();
    const filed = await ok.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: k });
    expect(await ok.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: k })).toEqual(filed);
    expect(await refusal(ok.caller.council.withdraw({ idempotencyKey: k }))).toMatchObject({
      code: 'CONFLICT',
      game: { reason: 'KEY_REUSED' },
    });
    const out = await ok.caller.council.withdraw({ idempotencyKey: key() });
    expect(out).toMatchObject({ act: 'withdraw', stamp: { label: 'Withdrawn', tone: 'partial' } });
    expect(out.body).toMatch(
      /^The 10 Political Capital stays with the branch\. Candidates can put their names in again on [A-Z][a-z]+day\.$/,
    );
    expect(
      await refusal(ok.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'CONFLICT',
      game: { reason: 'ALREADY_FILED', status: 'withdrawn' },
    });
    expect(await pcOf(ok)).toBe(35);

    // Endorse: self, closed, unknown, rank, PC, twice.
    const cand = await low.caller.council
      .declare({ platformId: 'plat.c.mill', idempotencyKey: key() })
      .catch(() => null);
    expect(cand).toBeNull();
    await poor.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() }).catch(() => null);
    const A = await player(clock, { fxp: 2_000, successes: 200, pc: 45, name: 'Endorsed One' });
    await A.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() });
    const aCand = (await Candidacy.findOne({ characterId: A.id }).lean())!._id.toHexString();
    const okCand = (await Candidacy.findOne({ characterId: ok.id }).lean())!._id.toHexString();
    expect(
      await refusal(A.caller.council.endorse({ candidacyId: aCand, idempotencyKey: key() })),
    ).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'CANNOT_ENDORSE_SELF' },
    });
    expect(
      await refusal(low.caller.council.endorse({ candidacyId: okCand, idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'CANDIDACY_CLOSED', status: 'withdrawn' },
    });
    expect(
      await refusal(low.caller.council.endorse({ candidacyId: '0'.repeat(24), idempotencyKey: key() })),
    ).toMatchObject({ code: 'BAD_REQUEST', game: { reason: 'UNKNOWN_CANDIDACY' } });
    expect(
      await refusal(poor.caller.council.endorse({ candidacyId: aCand, idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'NOT_ENOUGH_PC' },
    });
    const recruit = await player(clock, { fxp: 0, pc: 45 });
    expect(
      await refusal(recruit.caller.council.endorse({ candidacyId: aCand, idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'RANK_TOO_LOW', need: 2 },
    });
    await low.caller.council.endorse({ candidacyId: aCand, idempotencyKey: key() });
    expect(
      await refusal(low.caller.council.endorse({ candidacyId: aCand, idempotencyKey: key() })),
    ).toMatchObject({
      code: 'CONFLICT',
      game: { reason: 'ALREADY_ENDORSED', name: 'Endorsed One' },
    });
    expect(await pcOf(low)).toBe(35);
    // Nominations only: a vote is refused, with when the polls open.
    expect(
      await refusal(low.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'NOT_POLLING', opensAt: at(D0 + 2, 0) },
    });
  });

  it('the ballot and the chamber', async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 20800);
    const clock = testClock(at(D0));
    const A = await player(clock, { fxp: 2_000, successes: 200, pc: 100, name: 'Council Member' });
    const V = await player(clock, { fxp: 400, pc: 0 });
    const R = await player(clock, { fxp: 0, pc: 0 });
    await A.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() });
    await doTodaysOrders(A.caller);
    clock.set(at(D0 + 2));
    expect(
      await refusal(R.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'RANK_TOO_LOW', need: 2, fxpToGo: 400 },
    });
    expect(
      await refusal(V.caller.council.vote({ candidateKey: 'n:npc.c.lenz', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'UNKNOWN_CANDIDATE' }, // the ninth NPC is not on a ballot with a player
    });
    expect(
      await refusal(V.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'NOT_NOMINATIONS' },
    });
    await V.caller.council.vote({ candidateKey: `p:${A.id}`, idempotencyKey: key() });
    expect(
      await refusal(V.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'CONFLICT',
      game: { reason: 'ALREADY_VOTED', candidateKey: `p:${A.id}`, name: 'Council Member' },
    });
    expect(await Vote.countDocuments({ voterId: V.id })).toBe(1);
    expect(
      await refusal(A.caller.council.propose({ ordinanceId: 'ord.street-fund', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'NOT_COUNCILLOR' },
    });

    clock.set(at(D0 + 5)); // A is seated
    const B = await player(clock, { fxp: 400, pc: 100 });
    expect(
      await refusal(B.caller.council.propose({ ordinanceId: 'ord.street-fund', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'NOT_COUNCILLOR' },
    });
    expect(
      await refusal(A.caller.council.propose({ ordinanceId: 'ord.curfew', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'UNKNOWN_ORDINANCE' },
    });
    expect(
      // Review 1: the Collective's branch motion is the Long Service Order (was ord.shift-hours).
      await refusal(A.caller.council.propose({ ordinanceId: 'ord.long-service', idempotencyKey: key() })),
    ).toMatchObject({ code: 'CONFLICT', game: { reason: 'ALREADY_ON_PAPER' } });
    const pc = await pcOf(A);
    await A.caller.council.propose({ ordinanceId: 'ord.street-fund', idempotencyKey: key() });
    expect(await pcOf(A)).toBe(pc - 20);
    expect(
      await refusal(A.caller.council.propose({ ordinanceId: 'ord.public-works', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'CONFLICT',
      game: { reason: 'ALREADY_PROPOSED', ordinanceId: 'ord.street-fund' },
    });
    expect(
      await refusal(A.caller.council.councilVote({ choice: 'ord.rest-day', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'NOT_ON_PAPER' },
    });
    const against = await A.caller.council.councilVote({ choice: 'against', idempotencyKey: key() });
    expect(against.view.kind === 'council' && against.view.council.you.voted).toBe('against');
    expect(
      await refusal(A.caller.council.councilVote({ choice: 'ord.street-fund', idempotencyKey: key() })),
    ).toMatchObject({
      code: 'CONFLICT',
      game: { reason: 'ALREADY_COUNCIL_VOTED', choice: 'against' },
    });
    // The paper fills at three proposals: the fourth is refused.
    const paper = (await OrderPaper.findOne({ cityId: 'coalport', status: 'open' }).lean())!;
    await OrderPaper.updateOne(
      { _id: paper._id },
      {
        $push: {
          items: {
            $each: ['ord.rest-day', 'ord.open-doors'].map((ordinanceId) => ({
              ordinanceId,
              movedBy: { kind: 'player', characterId: V.id, name: 'x' },
              at: new Date(),
              day: D0 + 5,
            })),
          },
        },
      },
    );
    expect(paper.items).toHaveLength(2);
    // A second councillor (a test seat) meets the full paper: the branch's motion and three proposals.
    await OfficeTerm.create({
      cityId: 'coalport',
      councilKey: paper._id,
      electionId: 'test',
      seat: 8,
      fromDay: D0 + 5,
      toDay: D0 + 10,
      holder: { kind: 'player', characterId: B.id, name: 'Late Councillor' },
      place: 8,
      total: 0,
    });
    expect(
      await refusal(B.caller.council.propose({ ordinanceId: 'ord.public-works', idempotencyKey: key() })),
    ).toMatchObject({ game: { reason: 'PAPER_FULL' } });
    expect(await pcOf(B)).toBe(100);
    // Every player votes Against all: the NPCs still vote the branch's motion (design §17 Q15).
    clock.set(at(D0 + 7));
    await settleCityDay(content, 'coalport', clock.now());
    const after = (await OrderPaper.findById(paper._id).lean())!;
    expect(after.division).toMatchObject({ passed: 'ord.long-service', npcChoice: 'ord.long-service' });
    expect(after.division!.tallies.find((t) => t.choice === 'against')).toMatchObject({ player: 1, npc: 0 });
    // After the division the chamber is closed.
    expect(
      await refusal(A.caller.council.councilVote({ choice: 'against', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'COUNCIL_CLOSED' },
    });
  });
});

describe('concurrency (ADR 0018)', () => {
  it('ten voters at once: ten rows, ballots 10, morale exactly +5.0; one key ×5 → one row; two keys → ALREADY_VOTED', async () => {
    await resetCity('coalport');
    const D2 = nextCycleDay('coalport', 2, 20820);
    const clock = testClock(at(D2));
    const voters = [];
    for (let i = 0; i < 10; i++) voters.push(await player(clock, { fxp: 400, name: `Voter ${i}` }));
    const e = (await Election.findOne({ cityId: 'coalport', status: 'polling' }).lean())!;
    const before = (await City.findById('coalport').lean())!.opinion.collective;
    await Promise.all(
      voters.map((v) => v.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() })),
    );
    expect(await Vote.countDocuments({ electionId: e._id })).toBe(10);
    expect((await Election.findById(e._id).lean())!.ballots).toBe(10);
    expect((await City.findById('coalport').lean())!.opinion.collective).toBeCloseTo(
      before + 10 * MORALE.ballot,
      3,
    );

    const one = await player(clock, { fxp: 400, name: 'Double Tapper' });
    const k = key();
    const five = await Promise.all(
      Array.from({ length: 5 }, () =>
        one.caller.council.vote({ candidateKey: 'n:npc.c.baum', idempotencyKey: k }),
      ),
    );
    expect(new Set(five.map((r) => JSON.stringify(r))).size).toBe(1);
    expect(await Vote.countDocuments({ voterId: one.id })).toBe(1);
    const two = await player(clock, { fxp: 400, name: 'Two Keys' });
    const r = await Promise.allSettled([
      two.caller.council.vote({ candidateKey: 'n:npc.c.baum', idempotencyKey: key() }),
      two.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() }),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const refused = r.find((x) => x.status === 'rejected') as PromiseRejectedResult;
    expect(gameData(refused.reason).game).toMatchObject({ reason: 'ALREADY_VOTED' });
    expect(await Vote.countDocuments({ voterId: two.id })).toBe(1);
  });

  it('votes racing the count: every stored vote is counted, every refused vote got NOT_POLLING', async () => {
    for (let i = 0; i < 6; i++) {
      await resetCity('coalport');
      const D4 = nextCycleDay('coalport', 4, 20840 + 5 * i);
      const clock = testClock(at(D4));
      const v = await player(clock, { fxp: 400, name: `Racer ${i}` });
      const e = (await Election.findOne({ cityId: 'coalport', status: 'polling' }).lean())!;
      // The voter's day is settled for D4; the vote's clock is 1 ms before the boundary.
      const late = (await import('./helpers')).callerFor(v.user, () => at(D4 + 1, 0) - 1);
      const [vote, count] = await Promise.allSettled([
        late.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() }),
        settleCityDay(content, 'coalport', at(D4 + 1, 0) + 1),
      ]);
      expect(count.status).toBe('fulfilled');
      const stored = await Vote.countDocuments({ electionId: e._id });
      const counted = (await Election.findById(e._id).lean())!;
      expect(counted.status).toBe('counted');
      const weiss = counted.result!.rows.find((x) => x.key === 'n:npc.c.weiss')!;
      expect(weiss.votes).toBe(stored);
      if (vote.status === 'rejected') {
        expect(stored).toBe(0);
        expect(['NOT_POLLING', 'ACTION_CONFLICT']).toContain(gameData(vote.reason).game?.reason);
      } else {
        expect(stored).toBe(1);
      }
    }
  });
});

describe('secrecy (ADR 0019)', () => {
  it('during the polls, no procedure shows another voter’s choice, the ballot count or a total', async () => {
    await resetCity('coalport');
    const D2 = nextCycleDay('coalport', 2, 20900);
    const clock = testClock(at(D2));
    const voter = await player(clock, { fxp: 400, name: 'Secret Voter' });
    const other = await player(clock, { fxp: 400, name: 'Curious Member' });
    await voter.caller.council.vote({ candidateKey: 'n:npc.c.ruzicka', idempotencyKey: key() });
    const outputs = [
      await other.caller.council.election(),
      await other.caller.paper.today(),
      await other.caller.city.get({ cityId: 'coalport' }),
      await other.caller.character.me(),
    ];
    // Review 1 (§5.3): the Me view's statGuide.total counts the city's checked actions, not votes.
    const text = JSON.stringify(outputs, (k, v: unknown) => (k === 'statGuide' ? undefined : v));
    expect(text).not.toContain('"ballots"');
    expect(text).not.toContain(voter.id);
    expect(text).not.toMatch(/"votes":\s*\d/);
    expect(text).not.toMatch(/"total":/);
    // The chamber is public (the council's own division), but carries no ballot.
    const chamber = JSON.stringify(await other.caller.council.chamber());
    expect(chamber).not.toContain(voter.id);
    expect(chamber).not.toContain('ruzicka');
    const e = (await Election.findOne({ cityId: 'coalport', status: 'polling' }).lean())!;
    expect(await other.caller.council.count({ electionId: e._id })).toBeNull();
    expect(await refusal(other.caller.council.count({ electionId: 'duskwall:4000' }))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'WRONG_CITY' },
    });
  });
});
