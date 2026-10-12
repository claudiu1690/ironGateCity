/**
 * Slice 4, T17 (tech design §8.4, §15 "the count" and "secrecy"; ADR 0027): the capital's
 * politics. The design's worked examples end to end (seeded ballots in Eastside and the Government
 * Quarter), cross-faction ballots, turnout, the windows, a district candidacy and its endorsements.
 * The voting rework: the person-ballot, order-paper and secrecy cases are retired (tech design §15.3).
 */
import { randomUUID } from 'node:crypto';
import { Character } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleCityDay } from '../src/services/cityDay';
import { gameData, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, content, traveller } from './slice4.helpers';

const D0 = 20730; // Sun 4 Oct 2026: Irongate cycle day 0 (cycle 4146)
const key = () => randomUUID();
const E = 'irongate.eastside';

beforeAll(async () => {
  await setupDb('slice4-capital-test');
});
afterAll(teardownDb);

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
        .vote({ ordinanceId: content.faction('collective').branchMotion, idempotencyKey: key() })
        .catch((x: unknown) => x),
    );
    expect(e.game).toMatchObject({ reason: 'NOT_YET_VOTER' });
    expect(await late.caller.council.ballot()).toMatchObject({
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
      ordinanceId: content.faction('collective').branchMotion,
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
    expect(r.knockOns.backers).toMatchObject({ name: 'Mira Sand', n: 1 });
    const doc = (await Character.findById(backer.id).lean())!;
    expect(doc.endorsementsGiven.at(-1)).toMatchObject({
      cityCycle: 'irongate:4147',
      electionId: `${E}:4147`,
    });
  });
});
