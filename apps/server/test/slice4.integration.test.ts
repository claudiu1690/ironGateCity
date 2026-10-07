/**
 * Slice 4, T19 (tech design §15, §20): a capital week on the test clock for one player per faction
 * (travel, register, a candidacy, the vote, the count, a coalition rule, an Issue owned and its
 * effect, a hero), and the boundary races: a vote at 23:59:59.999 against the count, a tagged action
 * against the Monday resolution, a district action against the drift.
 */
import { randomUUID } from 'node:crypto';
import {
  Award,
  Character,
  City,
  District,
  Election,
  InfluenceLedger,
  IssueModel,
  OfficeTerm,
  OrderPaper,
  Vote,
} from '@irongate/db';
import type { CharacterDoc, ElectionDoc, OfficeTermDoc } from '@irongate/db';
import { FACTION_IDS, applyBaselineDrift, applyPersuasion, dayStart } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cityDayHooks, runCityDay, settleCityDay } from '../src/services/cityDay';
import { callerFor, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, content, setLiveIssues, traveller } from './slice4.helpers';
import type { Player } from './politics.helpers';

const D0 = 20730; // Sun 4 Oct 2026: Irongate cycle day 0 (cycle 4146)
const MON1 = 20731;
const MON2 = 20738;
const COUNT = 20735; // Fri 9 Oct: election 4146 counted, council 4147 sits
const key = () => randomUUID();
const E = 'irongate.eastside';
const GQ = 'irongate.government-quarter';
const FOUNDRY = { actionId: 'irongate.foundry-row.canvass', locationId: 'irongate.foundry-row' };
const ARRIVALS = { actionId: 'irongate.central-station.arrivals', locationId: 'irongate.central-station' };

beforeAll(async () => {
  await setupDb('slice4-integration-test');
});
afterAll(teardownDb);
afterEach(() => {
  delete cityDayHooks.seed;
});

/** A run of ×3 taps with a full bar before each (a test convenience). */
async function work(p: Player, action: { actionId: string; locationId: string }, taps: number, now: number) {
  for (let i = 0; i < taps; i++) {
    await Character.updateOne(
      { _id: p.id },
      { $set: { 'energy.value': 100, 'energy.updatedAt': new Date(now) } },
    );
    await p.caller.action.perform({ ...action, idempotencyKey: key(), times: 3 });
  }
}

describe('a capital week (tech design §15, T19)', () => {
  it('travel, register, stand, vote, count, a coalition rule, an Issue owned and its effect, a hero', async () => {
    cityDayHooks.seed = (placeId, cycle) => `int-${placeId}-${cycle}`;
    await resetCity('irongate');
    const clock = testClock(at(D0));
    await settleCityDay(content, 'irongate', clock.now());

    // One player per faction rides in from home; the Collective candidate lives in Eastside already.
    const vera = await traveller(clock, { name: 'Vera Stolz', factionId: 'vanguard' });
    const anna = await traveller(clock, { name: 'Anna Grey', factionId: 'alliance' });
    const cleo = await traveller(clock, {
      name: 'Cleo Brandt',
      factionId: 'collective',
      fxp: 2_000,
      pc: 40,
      irongateSuccesses: 125,
      residence: { cityId: 'irongate', districtId: E },
    });
    for (const p of [vera, anna, cleo])
      await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    clock.advance(16 * 60_000);
    for (const p of [vera, anna, cleo]) {
      const j = (await p.caller.travel.journey())!;
      expect(j.status).toBe('arrived');
      await p.caller.travel.close({ journeyId: j.id });
    }
    // Vera and Anna register in the Government Quarter on cycle day 0: they vote this cycle.
    for (const p of [vera, anna]) {
      const r = await p.caller.residence.register({
        cityId: 'irongate',
        districtId: GQ,
        idempotencyKey: key(),
      });
      expect(r.act).toBe('register');
    }
    expect((await Character.findById(vera.id).lean<CharacterDoc>())!.residence?.votesFromDay).toBe(D0 + 2);

    // Cleo stands in Eastside; two Collective residents back her.
    const platform = content.faction('collective').platforms[0]!.id;
    const filed = await cleo.caller.council.declare({ platformId: platform, idempotencyKey: key() });
    const candidacyId = filed.view.kind === 'election' ? filed.view.election.candidacy!.candidacyId : '';
    for (const name of ['Carl Mohr', 'Cilla Roth']) {
      const b = await traveller(clock, {
        name,
        pc: 20,
        cityId: 'irongate',
        residence: { cityId: 'irongate', districtId: 'irongate.old-town' },
      });
      await b.caller.council.endorse({ candidacyId, idempotencyKey: key() });
    }

    // Monday: the week's Issues (made known for the test: the tram fares and the evictions).
    clock.set(at(MON1));
    await runCityDay(content, clock.now());
    const [fares, evictions] = await setLiveIssues('irongate', ['issue.tram-fares', 'issue.evictions'], MON1);
    // Work: Cleo canvasses Foundry Row (Eastside, tagged with the evictions) toward a hero's +0.5;
    // Vera outworks Anna on the tram fares at Central Station.
    // Margins that hold whatever the rolls: 18 canvasses at ≥ 0.0375 each (≥ 0.675); 9 against 3.
    await work(cleo, FOUNDRY, 6, clock.now());
    await work(vera, ARRIVALS, 3, clock.now());
    await work(anna, ARRIVALS, 1, clock.now());

    // Polls (cycle day 2): Cleo is on Eastside's list; everyone votes.
    clock.set(at(D0 + 2));
    const ballot = await cleo.caller.council.election();
    expect(ballot.candidates.some((c) => c.you)).toBe(true);
    await cleo.caller.council.vote({ candidateKey: `p:${cleo.id}`, idempotencyKey: key() });
    await vera.caller.council.vote({ candidateKey: 'n:npc.v.ig.brandt', idempotencyKey: key() });
    await anna.caller.council.vote({ candidateKey: 'n:npc.a.ig.keller', idempotencyKey: key() });

    // The count (Friday): Cleo takes an Eastside seat; she is Eastside's District Hero.
    clock.set(at(COUNT));
    await runCityDay(content, clock.now());
    const east = (await Election.findById(`${E}:4146`).lean<ElectionDoc>())!;
    const mine = east.result!.rows.find((r) => r.key === `p:${cleo.id}`)!;
    expect(mine.seated).toBe(true);
    const hero = await Award.findOne({ kind: 'hero', ref: `${E}:4146` }).lean();
    expect(hero?.characterId.toHexString()).toBe(cleo.id);
    const paper = await cleo.caller.paper.today();
    expect(paper.desk.awards).toEqual(
      expect.arrayContaining([{ kind: 'hero', label: 'District Hero, Eastside', pc: 25 }]),
    );
    expect(paper.headlines.map((h) => h.headline)).toEqual(
      expect.arrayContaining(['Cleo Brandt Named District Hero of Eastside']),
    );

    // The coalition: Cleo votes for the largest other bloc's motion; her locals follow her.
    const terms = await OfficeTerm.find({ councilKey: 'irongate:4147', vacatedDay: null }).lean<
      OfficeTermDoc[]
    >();
    const seats = Object.fromEntries(
      FACTION_IDS.map((f) => [f, terms.filter((t) => t.factionId === f).length]),
    ) as Record<FactionId, number>;
    const ally = FACTION_IDS.filter((f) => f !== 'collective').sort((a, b) => seats[b] - seats[a])[0]!;
    expect(seats.collective + seats[ally]).toBeGreaterThanOrEqual(6);
    const motion = content.faction(ally).branchMotion;
    const chamber = await cleo.caller.council.chamber();
    expect(chamber.you.councillor).toBe(true);
    await cleo.caller.council.councilVote({ choice: motion, idempotencyKey: key() });
    clock.set(at(COUNT + 2));
    await runCityDay(content, clock.now());
    const divided = (await OrderPaper.findById('irongate:4147').lean())!;
    expect(divided.division!.passed).toBe(motion);
    expect((await City.findById('irongate').lean())!.ordinance?.id).toBe(motion);

    // The second Monday: the tram fares go to the Vanguard (more points), the evictions to the
    // Collective; the effects are in force for the week; the top five's 4 PC wait for the settlement.
    clock.set(at(MON2));
    await runCityDay(content, clock.now());
    expect((await IssueModel.findById(fares).lean())!.result?.ownerId).toBe('vanguard');
    expect((await IssueModel.findById(evictions).lean())!.result?.ownerId).toBe('collective');
    const n = await vera.caller.travel.nation();
    const home = n.cities.find((c) => c.cityId === 'duskwall')!;
    expect(home.fare).toMatchObject({ total: 10 });
    expect(home.fare!.lines.map((l) => l.id)).toContain('issue.tram-fares');
    const city = await cleo.caller.city.get({ cityId: 'irongate' });
    // Review 4 #9: the room is the Lodgings card at the Junction.
    expect(city.locations.find((l) => l.id === 'irongate.tram-junction')!.lodgings?.price.total).toBe(50);
    const veraPaper = await vera.caller.paper.today();
    expect(veraPaper.desk.awards).toEqual(
      expect.arrayContaining([{ kind: 'issue', label: 'Your work on the tram fares', pc: 4 }]),
    );
    // Two personal lines and one city line fit: the Issue PC is personal; the draw takes the city slot.
    expect(veraPaper.headlines.map((h) => h.headline)).toEqual(
      expect.arrayContaining(['Your Work on the tram fares Counted']),
    );
  });
});

describe('the boundary races (tech design §15, T19)', () => {
  it('a vote at 23:59:59.999 against the count: counted, or refused; never a ballot left out', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0 + 4));
    await settleCityDay(content, 'irongate', clock.now());
    const v = await traveller(clock, {
      name: 'Wim Lee',
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: E },
    });
    const late = callerFor(v.user, () => dayStart(D0 + 5) - 1);
    const [vote] = await Promise.allSettled([
      late.council.vote({ candidateKey: 'n:npc.c.ig.novak', idempotencyKey: key() }),
      runCityDay(content, dayStart(D0 + 5) + 1),
    ]);
    await settleCityDay(content, 'irongate', dayStart(D0 + 5) + 1);
    const e = (await Election.findById(`${E}:4146`).lean<ElectionDoc>())!;
    expect(e.status).toBe('counted');
    const votes = await Vote.countDocuments({ electionId: `${E}:4146` });
    const counted = e.result!.rows.reduce((s, r) => s + r.votes, 0);
    expect(counted).toBe(votes);
    if (vote.status === 'fulfilled') expect(votes).toBe(1);
  });

  it('a tagged action against the Monday resolution: its points land on the week it was in', async () => {
    await resetCity('irongate');
    const clock = testClock(at(MON2 - 1, 20));
    await settleCityDay(content, 'irongate', clock.now());
    const [fares] = await setLiveIssues('irongate', ['issue.tram-fares', 'issue.press-raids'], MON2 - 1);
    const p = await traveller(clock, { name: 'Xia Moss', cityId: 'irongate' });
    const late = callerFor(p.user, () => dayStart(MON2) - 1);
    const [act] = await Promise.allSettled([
      late.action.perform({ ...ARRIVALS, idempotencyKey: key(), times: 1 }),
      runCityDay(content, dayStart(MON2) + 1),
    ]);
    await settleCityDay(content, 'irongate', dayStart(MON2) + 1);
    const old = (await IssueModel.findById(fares).lean())!;
    expect(old.status).not.toBe('live');
    if (act.status === 'fulfilled') {
      const tag = act.value.effects.issues?.[0];
      if (tag) {
        // Either before the resolution (on last week's document) or retried into the new week.
        const doc = (await IssueModel.find({ cityId: 'irongate', issueId: tag.issueId }).lean()).find(
          (d) => d.momentum.collective >= tag.added,
        );
        expect(doc).toBeDefined();
      }
    }
  });

  it('a district action against the drift: one ledger row, the meter consistent with one order or the other', async () => {
    await resetCity('irongate');
    const clock = testClock(at(D0 + 1, 20));
    await settleCityDay(content, 'irongate', clock.now());
    const p = await traveller(clock, { name: 'Yuri Pell', cityId: 'irongate' });
    const before = (await District.findById(E).lean())!.opinion;
    const late = callerFor(p.user, () => dayStart(D0 + 2) - 1);
    const [act] = await Promise.allSettled([
      late.action.perform({
        actionId: 'irongate.riverside-quays.dockers',
        locationId: 'irongate.riverside-quays',
        idempotencyKey: key(),
        times: 1,
      }),
      runCityDay(content, dayStart(D0 + 2) + 1),
    ]);
    await settleCityDay(content, 'irongate', dayStart(D0 + 2) + 1);
    const after = (await District.findById(E).lean())!.opinion;
    const baseline = content.districtsOf('irongate').find((q) => q.id === E)!.district!.baselineOpinion;
    if (act.status === 'fulfilled') {
      const r = act.value;
      expect(await InfluenceLedger.countDocuments({ kind: 'action', ref: r.logId })).toBe(1);
      const swing = r.rewards.opinion;
      const actionFirst = applyBaselineDrift(
        applyPersuasion(before, { factionId: 'collective', swing }).shares,
        baseline,
      ).shares;
      const driftFirst = applyPersuasion(applyBaselineDrift(before, baseline).shares, {
        factionId: 'collective',
        swing,
      }).shares;
      expect([actionFirst, driftFirst]).toContainEqual(after);
    } else {
      expect(after).toEqual(applyBaselineDrift(before, baseline).shares);
    }
  });
});
