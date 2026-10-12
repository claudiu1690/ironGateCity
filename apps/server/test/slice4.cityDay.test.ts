/**
 * Slice 4, T13 (tech design §7, §15 "the capital city day"; ADR 0027, 0028, 0029): the capital's
 * bootstrap on each cycle day, twice and concurrently; the worker down twelve days against the job
 * every day; a Monday that is also a count day (Mon 19 Oct 2026); the drift's sums; a comeback
 * starting and ending; Issues resolved and drawn; heroes named; the home cities' lazy first draw.
 */
import { getContent } from '@irongate/content';
import {
  Award,
  City,
  Contribution,
  District,
  Election,
  InfluenceLedger,
  IssueModel,
  OfficeTerm,
  RuleBallot,
  contributionId,
} from '@irongate/db';
import { applyBaselineDrift, applyPersuasion, councilDay, dayStart, isMonday, weekOf } from '@irongate/rules';
import type { OpinionShares } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cityDayHooks, runCityDay, settleCityDay } from '../src/services/cityDay';
import { resetCity, setupDb, teardownDb } from './helpers';

const content = getContent();
const at = (day: number, hour = 9) => dayStart(day) + hour * 3_600_000;
/** Sun 4 Oct 2026: Irongate's cycle day 0 (tech design §3.1). */
const D0 = 20730;
const MON_COUNT = 20745;
const DISTRICTS = content.districtsOf('irongate');
const baseline = (id: string) => DISTRICTS.find((q) => q.id === id)!.district!.baselineOpinion;
const sum = (s: OpinionShares) => Math.round((s.vanguard + s.collective + s.alliance + s.neutral) * 1000);

beforeAll(async () => {
  await setupDb('slice4-city-day-test');
});
afterAll(teardownDb);
afterEach(() => {
  delete cityDayHooks.seed;
  delete cityDayHooks.beforeBoundary;
});

async function snapshot() {
  const strip = (x: unknown): unknown => {
    if (x instanceof Date) return 'date';
    if (Array.isArray(x)) return x.map(strip);
    if (x && typeof x === 'object' && !(x as { _bsontype?: string })._bsontype) {
      return Object.fromEntries(
        Object.entries(x as Record<string, unknown>)
          .filter(
            ([k]) => !['createdAt', 'updatedAt', 'closedAt', 'countedAt', 'at', 'resolvedAt'].includes(k),
          )
          .filter(([k]) => !(k === '_id' && typeof (x as Record<string, unknown>)[k] !== 'string'))
          .map(([k, v]) => [k, strip(v)]),
      );
    }
    return x && typeof x === 'object' ? String(x) : x;
  };
  const city = await City.findById('irongate').lean();
  return strip({
    city: { ...city, world: { settledDay: city?.world?.settledDay } },
    districts: await District.find({ cityId: 'irongate' }).sort({ _id: 1 }).lean(),
    elections: await Election.find({ cityId: 'irongate' }).sort({ _id: 1 }).lean(),
    terms: await OfficeTerm.find({ cityId: 'irongate' }).sort({ councilKey: 1, seat: 1 }).lean(),
    papers: await RuleBallot.find({ cityId: 'irongate' }).sort({ _id: 1 }).lean(),
    issues: await IssueModel.find({ cityId: 'irongate' }).sort({ _id: 1 }).lean(),
    ledger: await InfluenceLedger.find({ cityId: 'irongate' })
      .sort({ day: 1, placeId: 1, factionId: 1 })
      .lean(),
  });
}

describe('the capital bootstrap (tech design §7.3)', () => {
  it.each([0, 1, 2, 3, 4])(
    'on cycle day %i: districts, ten NPC seats, no ordinance, elections in phase, Issues',
    async (cd) => {
      await resetCity('irongate');
      const day = D0 + cd;
      const city = await settleCityDay(content, 'irongate', at(day));
      expect(city.world).toEqual({ settledDay: day, bootstrappedDay: day });
      // ADR 0027: no meter of its own.
      expect(city.opinion).toBeUndefined();
      expect(city.council).toMatchObject({
        key: 'irongate:4146',
        fromDay: D0,
        toDay: D0 + 5,
        npcSeats: 10,
        seats: 10,
      });
      const ds = await District.find({ cityId: 'irongate' }).sort({ _id: 1 }).lean();
      expect(ds).toHaveLength(5);
      for (const d of ds) {
        expect(d.opinion).toEqual(baseline(d._id));
        expect(d.groundswell).toBeNull();
        expect(d.state.controlledBy).toBeNull();
      }
      // At the baselines the Government Quarter and Station & Market are close races (design §6.3).
      expect(ds.filter((d) => d.state.battleground).map((d) => d._id)).toEqual([
        'irongate.government-quarter',
        'irongate.station-market',
      ]);
      const terms = await OfficeTerm.find({ councilKey: 'irongate:4146' }).sort({ seat: 1 }).lean();
      expect(terms.map((t) => t.seat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(terms.every((t) => t.holder.kind === 'npc' && t.factionId && t.districtId)).toBe(true);
      // Eastside 15 / 35 / 15: the Collective takes both seats (design §8.2's first worked example).
      expect(terms.filter((t) => t.districtId === 'irongate.eastside').map((t) => t.factionId)).toEqual([
        'collective',
        'collective',
      ]);
      const es = await Election.find({ cityId: 'irongate' }).sort({ _id: 1 }).lean();
      expect(es.map((e) => e._id)).toEqual(DISTRICTS.map((q) => `${q.id}:4146`).sort());
      for (const e of es) {
        expect(e.kind).toBe('district');
        expect(e.npcSlate).toHaveLength(6);
        expect(e.status).toBe(cd >= 2 ? 'polling' : 'nominations');
        if (cd >= 2) expect(e.ballot).toHaveLength(6);
      }
      const issues = await IssueModel.find({ cityId: 'irongate' }).lean();
      expect(issues).toHaveLength(2);
      expect(new Set(issues.map((i) => i.districtId)).size).toBe(2);
      expect(issues.every((i) => i.weekDay === weekOf(day) && i.status === 'live')).toBe(true);
      expect(city.issues!.live.map((l) => l.docId).sort()).toEqual(issues.map((i) => i._id).sort());
    },
  );

  it('twice and concurrently: one set of everything', async () => {
    await resetCity('irongate');
    await Promise.all([
      settleCityDay(content, 'irongate', at(D0 + 1)),
      settleCityDay(content, 'irongate', at(D0 + 1)),
      runCityDay(content, at(D0 + 1)),
    ]);
    await settleCityDay(content, 'irongate', at(D0 + 1, 15));
    expect(await District.countDocuments({ cityId: 'irongate' })).toBe(5);
    expect(await OfficeTerm.countDocuments({ cityId: 'irongate' })).toBe(10);
    expect(await Election.countDocuments({ cityId: 'irongate' })).toBe(5);
    expect(await RuleBallot.countDocuments({ cityId: 'irongate' })).toBe(1);
    expect(await IssueModel.countDocuments({ cityId: 'irongate' })).toBe(2);
  });
});

describe('the capital boundary (tech design §7.2)', () => {
  it('the drift: 1 % of the distance to the baseline, a ledger row per move, the sum exact', async () => {
    await resetCity('irongate');
    await settleCityDay(content, 'irongate', at(D0 + 1));
    const off: OpinionShares = { vanguard: 15, collective: 45, alliance: 15, neutral: 25 };
    await District.updateOne({ _id: 'irongate.eastside' }, { $set: { opinion: off } });
    await settleCityDay(content, 'irongate', at(D0 + 2));
    const east = (await District.findById('irongate.eastside').lean())!;
    const expected = applyBaselineDrift(off, baseline('irongate.eastside'));
    expect(east.opinion).toEqual(expected.shares);
    // Collective 45 → 44.9 (design §6.2's worked example).
    expect(east.opinion.collective).toBe(44.9);
    expect(sum(east.opinion)).toBe(100_000);
    const rows = await InfluenceLedger.find({
      placeId: 'irongate.eastside',
      kind: 'drift',
      day: D0 + 2,
    }).lean();
    expect(rows.map((r) => [r.factionId, r.swing])).toEqual([['collective', -100]]);
    expect(rows[0]!.cycleKey).toBe('irongate.eastside:4146');
    for (const d of await District.find({ cityId: 'irongate' }).lean()) expect(sum(d.opinion)).toBe(100_000);
  });

  it('a comeback starts the boundary after control is lost and ends when it is retaken', async () => {
    await resetCity('irongate');
    await settleCityDay(content, 'irongate', at(D0 + 1));
    const held: OpinionShares = { vanguard: 10, collective: 55, alliance: 10, neutral: 25 };
    await District.updateOne({ _id: 'irongate.eastside' }, { $set: { opinion: held } });
    await settleCityDay(content, 'irongate', at(D0 + 2));
    let east = (await District.findById('irongate.eastside').lean())!;
    expect(east.state.controlledBy).toBe('collective');
    expect(east.groundswell).toBeNull();
    const lost: OpinionShares = { vanguard: 25, collective: 45, alliance: 10, neutral: 20 };
    await District.updateOne({ _id: 'irongate.eastside' }, { $set: { opinion: lost } });
    await settleCityDay(content, 'irongate', at(D0 + 3));
    east = (await District.findById('irongate.eastside').lean())!;
    expect(east.state.controlledBy).toBeNull();
    expect(east.groundswell).toEqual({ factionId: 'collective', fromDay: D0 + 3, untilDay: D0 + 17 });
    await District.updateOne({ _id: 'irongate.eastside' }, { $set: { opinion: held } });
    await settleCityDay(content, 'irongate', at(D0 + 4));
    east = (await District.findById('irongate.eastside').lean())!;
    expect(east.state.controlledBy).toBe('collective');
    expect(east.groundswell).toBeNull();
    expect(east.stateLog.map((l) => l.day)).toEqual([D0 + 2, D0 + 3, D0 + 4]);
  });

  it('Monday 19 Oct 2026 is a count day: the Issue resolves (+3 in its district) before the states and the count', async () => {
    expect(isMonday(MON_COUNT)).toBe(true);
    expect(councilDay(MON_COUNT, 0).cycleDay).toBe(0);
    cityDayHooks.seed = (placeId, cycle) => `seed-${placeId}-${cycle}`;
    await resetCity('irongate');
    await settleCityDay(content, 'irongate', at(MON_COUNT - 1));
    const live = await IssueModel.find({ cityId: 'irongate', status: 'live' }).sort({ order: 1 }).lean();
    const first = live[0]!;
    await IssueModel.updateOne({ _id: first._id }, { $set: { 'momentum.alliance': 30 } });
    const who = new Types.ObjectId();
    await Contribution.create({
      _id: contributionId(`points|${first._id}`, who),
      scope: `points|${first._id}`,
      kind: 'points',
      cityId: 'irongate',
      placeId: first.districtId!,
      ref: first._id,
      characterId: who,
      name: 'Ada Kern',
      factionId: 'alliance',
      level: 12,
      amount: 30,
      lastAt: new Date(at(MON_COUNT - 1)),
    });
    const before = (await District.findById(first.districtId).lean())!.opinion;
    await settleCityDay(content, 'irongate', at(MON_COUNT, 0) + 60_000);

    const placeId = first.districtId!;
    const drifted = applyBaselineDrift(before, baseline(placeId)).shares;
    const owned = applyPersuasion(drifted, { factionId: 'alliance', swing: 3 });
    const after = (await District.findById(placeId).lean())!;
    expect(after.opinion).toEqual(owned.shares);
    const resolved = (await IssueModel.findById(first._id).lean())!;
    expect(resolved.status).toBe('owned');
    expect(resolved.result).toMatchObject({
      ownerId: 'alliance',
      by: 'points',
      effect: { fromDay: MON_COUNT, toDay: MON_COUNT + 7 },
    });
    expect(resolved.result!.top.map((t) => t.points)).toEqual([30]);
    // The other Issue had no points: it lapsed.
    expect((await IssueModel.findById(live[1]!._id).lean())!.status).toBe('lapsed');
    // The count used the post-Issue shares (the Issue's step comes before the count).
    const counted = (await Election.findById(`${placeId}:4148`).lean())!;
    expect(counted.status).toBe('counted');
    const factionTotal = owned.shares.vanguard + owned.shares.collective + owned.shares.alliance;
    const res = counted.result as unknown as { factions: Array<{ factionId: string; opinionShare: number }> };
    expect(res.factions.find((f) => f.factionId === 'alliance')!.opinionShare).toBeCloseTo(
      owned.shares.alliance / factionTotal,
      9,
    );
    // The top five's award (4 PC), credited later by the settlement.
    const award = (await Award.findOne({ kind: 'issue', ref: first._id }).lean())!;
    expect(award).toMatchObject({ pc: 4, creditedAt: null, amount: 30 });
    expect(award.characterId.equals(who)).toBe(true);
    // The ledger names the Issue, not a player.
    const rows = await InfluenceLedger.find({ kind: 'issue', ref: first._id }).lean();
    expect(rows.map((r) => [r.factionId, r.swing, r.source.kind])).toEqual([['alliance', 3_000, 'system']]);
    // The effect is in force for the week, and two new Issues are drawn (never last week's).
    const city = (await City.findById('irongate').lean())!;
    expect(city.issues!.weekDay).toBe(MON_COUNT);
    expect(city.issues!.effects).toEqual([
      {
        issueId: first.issueId,
        docId: first._id,
        ownerId: 'alliance',
        fromDay: MON_COUNT,
        toDay: MON_COUNT + 7,
      },
    ]);
    const drawn = city.issues!.live.map((l) => l.issueId);
    expect(drawn).toHaveLength(2);
    for (const l of live) expect(drawn).not.toContain(l.issueId);
    // Ten new terms, five new elections.
    expect(await OfficeTerm.countDocuments({ councilKey: 'irongate:4149' })).toBe(10);
    expect(await Election.countDocuments({ cityId: 'irongate', cycle: 4149, status: 'nominations' })).toBe(5);
  });

  it('heroes at the count: the top of each bracket at +0.5 or more, and the scoreboard on the result', async () => {
    await resetCity('irongate');
    await settleCityDay(content, 'irongate', at(D0 + 4));
    const scope = 'influence|irongate.eastside:4146';
    const mk = (name: string, level: number, amount: number, hour: number) => {
      const id = new Types.ObjectId();
      return {
        _id: contributionId(scope, id),
        scope,
        kind: 'influence' as const,
        cityId: 'irongate',
        placeId: 'irongate.eastside',
        ref: 'irongate.eastside:4146',
        characterId: id,
        name,
        factionId: 'collective' as const,
        level,
        amount,
        lastAt: new Date(at(D0 + 3, hour)),
      };
    };
    await Contribution.create([
      mk('Ada Kern', 12, 800, 9),
      mk('Bela Vos', 14, 800, 10),
      mk('Cora Lind', 20, 400, 9),
      mk('Dov Ries', 35, 1_200, 9),
    ]);
    await settleCityDay(content, 'irongate', at(D0 + 5));
    const awards = await Award.find({ kind: 'hero', ref: 'irongate.eastside:4146' })
      .sort({ bracket: 1 })
      .lean();
    // Bracket 1: Ada (earlier to reach 0.8); bracket 2: nobody at +0.5; bracket 3: Dov.
    expect(awards.map((a) => [a.bracket, a.amount, a.pc])).toEqual([
      [1, 800, 25],
      [3, 1_200, 25],
    ]);
    expect(awards[0]!.title).toEqual({
      label: 'District Hero, Eastside',
      fromDay: D0 + 5,
      untilDay: D0 + 10,
    });
    const e = (await Election.findById('irongate.eastside:4146').lean())!;
    const board = (
      e.result as unknown as {
        scoreboard: Array<{ bracket: number; rows: Array<{ name: string; hero: boolean }> }>;
      }
    ).scoreboard;
    expect(board.map((b) => [b.bracket, b.rows.map((r) => [r.name, r.hero])])).toEqual([
      [
        1,
        [
          ['Ada Kern', true],
          ['Bela Vos', false],
        ],
      ],
      [2, [['Cora Lind', false]]],
      [3, [['Dov Ries', true]]],
    ]);
  });
});

describe('the worker down (ADR 0017 §3, tech design §15)', () => {
  it('twelve days with no job, then one request: deep-equal to the job every day', async () => {
    cityDayHooks.seed = (placeId, cycle) => `seed-${placeId}-${cycle}`;
    await resetCity('irongate');
    await settleCityDay(content, 'irongate', at(D0));
    for (let d = D0 + 1; d <= D0 + 12; d++) await runCityDay(content, at(d, 0) + 60_000);
    const daily = await snapshot();

    await resetCity('irongate');
    await settleCityDay(content, 'irongate', at(D0));
    await settleCityDay(content, 'irongate', at(D0 + 12, 15));
    const caughtUp = await snapshot();
    expect(caughtUp).toEqual(daily);
    expect(await Election.countDocuments({ cityId: 'irongate', status: 'counted' })).toBe(10);
    // Two Mondays in the twelve days (5 Oct and 12 Oct): two draws after the first.
    expect(await IssueModel.countDocuments({ cityId: 'irongate' })).toBe(6);
  });
});

describe('the home cities (tech design §7.4)', () => {
  it('a city settled before slice 4 draws its first Issues lazily, once', async () => {
    await resetCity('coalport');
    await settleCityDay(content, 'coalport', at(D0));
    await IssueModel.deleteMany({ cityId: 'coalport' });
    await City.updateOne({ _id: 'coalport' }, { $unset: { issues: 1 } });
    await Promise.all([
      settleCityDay(content, 'coalport', at(D0, 15)),
      settleCityDay(content, 'coalport', at(D0, 15)),
      runCityDay(content, at(D0, 15)),
    ]);
    const docs = await IssueModel.find({ cityId: 'coalport' }).lean();
    expect(docs).toHaveLength(2);
    expect(docs.every((d) => d.weekDay === weekOf(D0) && d.districtId === null)).toBe(true);
    const city = (await City.findById('coalport').lean())!;
    expect(city.issues!.live).toHaveLength(2);
  });

  it('a Monday at home: the owner +3 (the home floor applies), the effect, a lapse', async () => {
    await resetCity('coalport');
    const mon = 20738; // Mon 12 Oct 2026
    await settleCityDay(content, 'coalport', at(mon - 1));
    const live = await IssueModel.find({ cityId: 'coalport', status: 'live' }).sort({ order: 1 }).lean();
    await IssueModel.updateOne(
      { _id: live[0]!._id },
      { $set: { 'momentum.vanguard': 10, 'momentum.collective': 4 } },
    );
    await settleCityDay(content, 'coalport', at(mon));
    const r = (await IssueModel.findById(live[0]!._id).lean())!;
    expect(r.result).toMatchObject({ ownerId: 'vanguard', by: 'points' });
    expect(r.result!.opinion!.applied).toBe(3);
    expect((await IssueModel.findById(live[1]!._id).lean())!.status).toBe('lapsed');
    const city = (await City.findById('coalport').lean())!;
    expect(city.issues!.effects.map((e) => e.ownerId)).toEqual(['vanguard']);
    // The home faction keeps its floor (applyPersuasion's home floor).
    expect(city.opinion!.collective).toBeGreaterThanOrEqual(50);
  });
});
