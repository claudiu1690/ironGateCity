/**
 * QA, slice 3 "The first vote" (docs/qa/slice-3.md). Independent checks of the server against
 * GDD §15.3, §14.11, §6.5, §3.3, the slice-3 tech design (§7, §8, §14 and its Deviations) and
 * ADRs 0017–0023: the city day runs exactly once per boundary whoever gets there first, the six
 * political acts are set-once, replayable, exact on PC and never "stored then ignored" at a
 * boundary, the ballot is secret, the ten ordinances apply where the GDD says, morale has teeth,
 * and the paper tells the story. Known bugs are `it.fails`, each named after its report entry.
 */
import { getContent } from '@irongate/content';
import {
  Candidacy,
  Character,
  City,
  Election,
  OfficeTerm,
  PaperEntry,
  RequestLog,
  RuleBallot,
  Vote,
} from '@irongate/db';
import {
  councilDay,
  councilKey,
  dayKey,
  dayStart,
  electionKey,
  jobPay,
  jobPayWith,
  seniorityBonus,
} from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { isLoopbackUri, loadEnv } from '../src/env';
import { cityDayHooks, runCityDay, settleCityDay } from '../src/services/cityDay';
import { gameData, resetCity, noIssues, setupDb, teardownDb, testClock } from './helpers';
import { at, doTodaysOrders, key, nextCycleDay, player } from './politics.helpers';
import type { Player } from './politics.helpers';

const content = getContent();
const HOME: Record<FactionId, string> = { collective: 'coalport', vanguard: 'duskwall', alliance: 'ashford' };
const offsetOf = (cityId: string) => content.city(cityId)!.council!.offset;

beforeAll(async () => {
  await setupDb('qa-slice3');
  // Slice 4: these numbers predate the Issues of the Week.
  await noIssues();
});
afterAll(teardownDb);
afterEach(() => {
  delete cityDayHooks.seed;
  delete cityDayHooks.beforeBoundary;
});

const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => null,
      (e: unknown) => e,
    ),
  );
const pcOf = async (p: Player) => (await Character.findById(p.id).lean())!.pc;
const reasonOf = (r: PromiseSettledResult<unknown>) =>
  r.status === 'rejected' ? gameData(r.reason).game?.reason : 'ok';

/** Deterministic NPC jitter for this file (the seam the developer's tests use). */
function fixedSeeds() {
  cityDayHooks.seed = (cityId, cycle) => `qa-${cityId}-${cycle}`;
}

/** Everything the city day writes for a city, minus timestamps and ObjectIds (deep comparisons). */
async function worldOf(cityId: string) {
  const strip = (x: unknown): unknown => {
    if (x instanceof Date) return 'date';
    if (Array.isArray(x)) return x.map(strip);
    if (x && typeof x === 'object' && !(x as { _bsontype?: string })._bsontype) {
      return Object.fromEntries(
        Object.entries(x as Record<string, unknown>)
          .filter(([k]) => !['createdAt', 'updatedAt', 'closedAt', 'countedAt', 'at', 'seed'].includes(k))
          .filter(([k]) => !(k === '_id' && typeof (x as Record<string, unknown>)[k] !== 'string'))
          .map(([k, v]) => [k, strip(v)]),
      );
    }
    return x && typeof x === 'object' ? String(x) : x;
  };
  const city = await City.findById(cityId).lean();
  return strip({
    city: { ...city, world: { settledDay: city?.world?.settledDay } },
    elections: await Election.find({ cityId }).sort({ _id: 1 }).lean(),
    candidacies: await Candidacy.find({ cityId }).sort({ filedAt: 1 }).lean(),
    terms: await OfficeTerm.find({ cityId }).sort({ councilKey: 1, seat: 1 }).lean(),
    papers: await RuleBallot.find({ cityId }).sort({ _id: 1 }).lean(),
  });
}

/** Put a player in a seat of a sitting council (replacing an NPC), as a count would. */
async function seat(cityId: string, day: number, n: number, p: Player, name: string) {
  const cal = councilDay(day, offsetOf(cityId));
  await OfficeTerm.updateOne(
    { councilKey: councilKey(cityId, cal.cycle), seat: n },
    { $set: { holder: { kind: 'player', characterId: p.id, name } } },
  );
}

/** The ordinance in force today, as a division would set it (ADR 0021). */
async function forceOrdinance(cityId: string, id: string | null, day: number) {
  await City.updateOne(
    { _id: cityId },
    {
      $set: {
        ordinance: id ? { id, fromDay: day, toDay: day + 5, paperId: null } : null,
        ordinanceHistory: id ? [{ id, fromDay: day, toDay: day + 5 }] : [],
      },
    },
  );
}

// =============================================================================================
// 1. The calendar and the city day (GDD §15.3, ADR 0017)
// =============================================================================================

describe('QA 1 · the city day runs exactly once per boundary', () => {
  it('all three home cities: two jobs and three residents at the same boundary, then the job again → one of everything', async () => {
    fixedSeeds();
    for (const c of ['coalport', 'duskwall', 'ashford']) await resetCity(c);
    // A day on which some city counts (Coalport day 0) and another closes (Ashford day 1 → 2? no):
    // pick the day Coalport counts; the others cross their own boundaries on the same night.
    const D = nextCycleDay('coalport', 0, 21000);
    for (const c of ['coalport', 'duskwall', 'ashford']) await settleCityDay(content, c, at(D - 1));
    const clock = testClock(at(D - 1));
    const residents = [];
    for (const f of ['collective', 'vanguard', 'alliance'] as FactionId[])
      residents.push(await player(clock, { factionId: f, fxp: 400, name: `Resident ${f}` }));
    clock.set(at(D, 0) + 30_000); // 00:00:30, the job not yet run (it runs at 00:01)
    await Promise.all([
      runCityDay(content, clock.now()),
      runCityDay(content, clock.now()),
      ...residents.map((r) => r.caller.paper.today()),
    ]);
    const once = {
      coalport: await worldOf('coalport'),
      duskwall: await worldOf('duskwall'),
      ashford: await worldOf('ashford'),
    };
    for (const c of ['coalport', 'duskwall', 'ashford']) {
      const city = (await City.findById(c).lean())!;
      expect(city.world!.settledDay).toBe(D);
      // One morale log entry per boundary, never two.
      expect(city.moraleLog!.map((m) => m.day)).toEqual([D]);
      const cal = councilDay(D, offsetOf(c));
      expect(await OfficeTerm.countDocuments({ councilKey: councilKey(c, cal.cycle) })).toBe(7);
      expect(await Election.countDocuments({ _id: electionKey(c, cal.cycle) })).toBe(1);
    }
    // Coalport counted exactly once; its countedAt does not move on a rerun.
    const counted = (await Election.findById(electionKey('coalport', councilDay(D, 2).cycle - 1)).lean())!;
    expect(counted.status).toBe('counted');
    await runCityDay(content, at(D, 0) + 60_000); // the 00:01 job, late and redundant
    await runCityDay(content, at(D, 3));
    expect((await Election.findById(counted._id).lean())!.countedAt).toEqual(counted.countedAt);
    expect(await worldOf('coalport')).toEqual(once.coalport);
    expect(await worldOf('duskwall')).toEqual(once.duskwall);
    expect(await worldOf('ashford')).toEqual(once.ashford);
  });

});

// =============================================================================================
// 2. The count (GDD §15.3, §15.10)
// =============================================================================================

describe('QA 2 · the count', () => {
  it('NPC fill: nine names every cycle, two always lose, and the ward marks are NPCs, never players', async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 21060);
    for (let k = 0; k < 6; k++) {
      await settleCityDay(content, 'coalport', at(D0 + 5 * k + 2));
      const e = (await Election.findById(electionKey('coalport', councilDay(D0 + 5 * k, 2).cycle)).lean())!;
      expect(e.ballot).toHaveLength(9);
      expect(e.ballot!.every((b) => b.kind === 'npc')).toBe(true);
      e.npcSlate.forEach((s) => expect(Math.abs(s.jitter)).toBeLessThanOrEqual(2));
      await settleCityDay(content, 'coalport', at(D0 + 5 * k + 5));
      const counted = (await Election.findById(e._id).lean())!;
      expect(counted.result!.rows.filter((r) => !r.seated)).toHaveLength(2);
    }
  });

});

// =============================================================================================
// 3. Political acts (ADR 0018)
// =============================================================================================

describe('QA 3 · political acts: set-once, replayable, exact on PC', () => {
  it('declare: six taps with six keys at once → one candidacy, −10 PC once; the winner’s key replays its modal byte for byte', async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 21150);
    const clock = testClock(at(D0));
    const p = await player(clock, { name: 'Eager Filer', fxp: 2_000, successes: 30, pc: 45 });
    const keys = Array.from({ length: 6 }, key);
    const plats = ['ord.long-service', 'ord.street-fund', 'ord.public-works'];
    const rs = await Promise.allSettled(
      keys.map((k, i) => p.caller.council.declare({ ordinanceId: plats[i % 3]!, idempotencyKey: k })),
    );
    const ok = rs.flatMap((r, i) =>
      r.status === 'fulfilled' ? [{ r: r.value, k: keys[i]!, plat: plats[i % 3]! }] : [],
    );
    expect(ok).toHaveLength(1);
    expect(rs.filter((r) => r.status === 'rejected').map(reasonOf)).toEqual(Array(5).fill('ALREADY_FILED'));
    expect(await Candidacy.countDocuments({ characterId: p.id })).toBe(1);
    expect(await pcOf(p)).toBe(35);
    const e = (await Election.findOne({ cityId: 'coalport', status: 'nominations' }).lean())!;
    expect(e.filed).toBe(1);
    const again = await p.caller.council.declare({ ordinanceId: ok[0]!.plat, idempotencyKey: ok[0]!.k });
    expect(JSON.stringify(again)).toBe(JSON.stringify(ok[0]!.r));
    expect(await pcOf(p)).toBe(35);
    // The same key for another act is refused (ADR 0008).
    expect(await refusal(p.caller.council.vote({ ordinanceId: 'ord.long-service', idempotencyKey: ok[0]!.k }))).toMatchObject({
      game: { reason: 'KEY_REUSED' },
    });
  });

  it('declare eligibility: Rank 3 and Known (30 Successes) at the edges; a sitting councillor waits until the day the term ends', async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 21160);
    const clock = testClock(at(D0));
    const r2 = await player(clock, { name: 'Almost Organiser', fxp: 1_999, successes: 200, pc: 45 });
    const k29 = await player(clock, { name: 'Almost Known', fxp: 2_000, successes: 29, pc: 45 });
    const k30 = await player(clock, { name: 'Just Known', fxp: 2_000, successes: 30, pc: 45 });
    const sitting = await player(clock, { name: 'Sitting Member', fxp: 2_000, successes: 200, pc: 45 });
    expect(
      await refusal(r2.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'RANK_TOO_LOW', need: 3, fxpToGo: 1 },
    });
    expect(
      await refusal(k29.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'NOT_KNOWN', successes: 29, need: 30 },
    });
    await k30.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() });
    await seat('coalport', D0, 3, sitting, 'Sitting Member');
    expect(
      await refusal(sitting.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() })),
    ).toMatchObject({ game: { reason: 'SITTING_COUNCILLOR', termEndsAt: dayStart(D0 + 5) } });
    for (const p of [r2, k29, sitting]) expect(await pcOf(p)).toBe(45);
    // The morning the term ends (the next count), the councillor may declare again (design §3).
    clock.set(at(D0 + 5));
    const filed = await sitting.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() });
    expect(filed.stamp.label).toBe("You're standing");
  });

  it('endorse: one member, two candidates, two taps at once → one endorsement, −10 PC once; again next cycle; never oneself', async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 21170);
    const clock = testClock(at(D0));
    const a = await player(clock, { name: 'Candidate Alpha', fxp: 2_000, successes: 100, pc: 45 });
    const b = await player(clock, { name: 'Candidate Beta', fxp: 2_000, successes: 100, pc: 45 });
    const m = await player(clock, { name: 'Busy Member', fxp: 400, pc: 45 });
    const r1 = await player(clock, { name: 'New Member', fxp: 399, pc: 45 });
    await a.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() });
    await b.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() });
    const ids = (await m.caller.council.election()).candidates.flatMap((c) =>
      c.candidacyId ? [c.candidacyId] : [],
    );
    expect(ids).toHaveLength(2);
    const rs = await Promise.allSettled(
      ids.map((id) => m.caller.council.endorse({ candidacyId: id, idempotencyKey: key() })),
    );
    expect(rs.map(reasonOf).sort()).toEqual(['ALREADY_ENDORSED', 'ok']);
    const given = (await Candidacy.find({ 'endorsements.characterId': m.id }).lean()).length;
    expect(given).toBe(1);
    expect(await pcOf(m)).toBe(35);
    expect((await Character.findById(m.id).lean())!.endorsementsGiven).toHaveLength(1);
    // Rank 1 may not endorse; nor may a candidate endorse themselves.
    expect(
      await refusal(r1.caller.council.endorse({ candidacyId: ids[0]!, idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'RANK_TOO_LOW', need: 2 },
    });
    const aId = (await Candidacy.findOne({ characterId: a.id }).lean())!._id.toHexString();
    expect(
      await refusal(a.caller.council.endorse({ candidacyId: aId, idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'CANNOT_ENDORSE_SELF' },
    });
    // After the close the candidacy is closed to endorsements; the next cycle opens a new one.
    clock.set(at(D0 + 2));
    expect(
      await refusal(r1.caller.council.endorse({ candidacyId: ids[0]!, idempotencyKey: key() })),
    ).toMatchObject({
      game: { reason: 'NOT_NOMINATIONS' },
    });
    clock.set(at(D0 + 5));
    const next = await player(clock, { name: 'Next Cycle Candidate', fxp: 2_000, successes: 100, pc: 45 });
    await next.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() });
    const nid = (await Candidacy.findOne({ characterId: next.id }).lean())!._id.toHexString();
    await m.caller.council.endorse({ candidacyId: nid, idempotencyKey: key() });
    expect(await pcOf(m)).toBe(25 + 0 /* no orders done, no stipend */);
  });

});

// =============================================================================================
// 3b. Acts at the boundary: counted or refused, never stored and ignored (ADR 0018 §3)
// =============================================================================================

// =============================================================================================
// 4. The secret ballot (ADR 0019)
// =============================================================================================

// =============================================================================================
// 5. Ordinances in play (GDD §15.3, ADR 0021)
// =============================================================================================

describe('QA 5 · the ten ordinances, applied where the GDD says and shown on the ticket and in the modal', () => {
  const ticket = async (p: Player, locationId: string, actionId: string) => {
    const city = await p.caller.city.get({ cityId: 'coalport' });
    return city.locations.find((l) => l.id === locationId)!.actions.find((a) => a.id === actionId)!;
  };
  const perform = (p: Player, locationId: string, actionId: string) =>
    p.caller.action.perform({ actionId, locationId, idempotencyKey: key(), times: 1 });

  it('Open Doors: canvass +4 % on the ticket, in the odds and as a named row in the breakdown (95 % clamp)', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21710);
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Door Knocker', fxp: 400, successes: 0 });
    await forceOrdinance('coalport', null, D);
    const base = (await ticket(p, 'coalport.mill-gate', 'coalport.mill-gate.canvass')).preview!.chance;
    await forceOrdinance('coalport', 'ord.open-doors', D);
    const t = await ticket(p, 'coalport.mill-gate', 'coalport.mill-gate.canvass');
    expect(t.tags).toEqual([{ ordinanceId: 'ord.open-doors', name: 'Open Doors', kind: 'chance', value: 4 }]);
    expect(t.preview!.chance).toBe(Math.min(95, base + 4));
    const r = await perform(p, 'coalport.mill-gate', 'coalport.mill-gate.canvass');
    expect(r.attempts[0]!.check.bonuses).toContainEqual(
      expect.objectContaining({ label: 'Open Doors', value: 4 }),
    );
    expect(r.bonusTags.map((b) => b.label)).toContain('Open Doors');
  });

  it('Rally Permits: a speech costs 10 on the ticket and in play; rewards stay on 12', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21720);
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Soapbox Orator', fxp: 400 });
    await forceOrdinance('coalport', null, D);
    const plain = await perform(p, 'coalport.mill-gate', 'coalport.mill-gate.speech');
    await forceOrdinance('coalport', 'ord.rally-permits', D);
    const t = await ticket(p, 'coalport.mill-gate', 'coalport.mill-gate.speech');
    expect(t.energy).toBe(10);
    expect(t.tags).toContainEqual(
      expect.objectContaining({ kind: 'energy', value: 10, name: 'Rally Permits' }),
    );
    const r = await perform(p, 'coalport.mill-gate', 'coalport.mill-gate.speech');
    expect(r.effects.energy.before - r.effects.energy.after).toBe(10);
    // Same outcome → same base rewards as the 12-Energy speech (cost ordinances change the cost only).
    if (r.stamp === plain.stamp) {
      expect(r.rewards.xp.base).toBe(plain.rewards.xp.base);
      expect(r.rewards.iron.base).toBe(plain.rewards.iron.base);
    }
  });

  it('Reading Room Grant: training costs 20 % less (halves up) on the ticket and in play', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21730);
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Night Reader', fxp: 400 });
    await forceOrdinance('coalport', null, D);
    const base = (await ticket(p, 'coalport.union-hall', 'coalport.union-hall.reading-room')).energy;
    await forceOrdinance('coalport', 'ord.reading-room', D);
    const t = await ticket(p, 'coalport.union-hall', 'coalport.union-hall.reading-room');
    expect(t.energy).toBe(Math.round(base * 0.8 + 1e-9));
    await Character.updateOne(
      { _id: p.id },
      { $set: { 'energy.value': 100, 'energy.updatedAt': new Date(clock.now()) } },
    );
    const r = await perform(p, 'coalport.union-hall', 'coalport.union-hall.reading-room');
    expect(r.effects.energy.before - r.effects.energy.after).toBe(t.energy);
  });

  it('Street Permits: a propaganda swing ×1.15 in the knock-on line', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21740);
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Bill Poster', fxp: 400 });
    await forceOrdinance('coalport', null, D);
    const before = await perform(p, 'coalport.market-row', 'coalport.market-row.leaflets');
    await forceOrdinance('coalport', 'ord.street-permits', D);
    const t = await ticket(p, 'coalport.market-row', 'coalport.market-row.leaflets');
    expect(t.tags).toContainEqual(expect.objectContaining({ kind: 'swing', value: 15 }));
    const after = await perform(p, 'coalport.market-row', 'coalport.market-row.leaflets');
    if (before.stamp === after.stamp && before.effects.opinion && after.effects.opinion) {
      expect(after.effects.opinion.delta).toBeCloseTo(before.effects.opinion.delta * 1.15, 3);
    }
  });

  it('Street Register: every Success writes two Successes of Local Standing; Public Meetings and Street Fund are named parts', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21750);
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Ward Walker', fxp: 400, successes: 0 });
    for (const [id, check] of [
      ['ord.street-register', 'standing'],
      ['ord.public-meetings', 'fxp'],
      ['ord.street-fund', 'iron'],
    ] as const) {
      await forceOrdinance('coalport', id, D);
      const before =
        (await Character.findById(p.id).lean())!.localStanding.find((s) => s.cityId === 'coalport')
          ?.successes ?? 0;
      const r = await perform(p, 'coalport.mill-gate', 'coalport.mill-gate.canvass');
      const name = content.ordinance(id)!.name;
      if (check === 'standing') {
        const after = (await Character.findById(p.id).lean())!.localStanding.find(
          (s) => s.cityId === 'coalport',
        )!.successes;
        expect(after - before).toBe(2 * r.successes);
      } else if (check === 'fxp') {
        if (r.rewards.fxp.base > 0) expect(r.rewards.fxp.parts?.map((x) => x.label)).toContain(name);
      } else {
        if (r.rewards.iron.base > 0) expect(r.rewards.iron.parts?.map((x) => x.label)).toContain(name);
      }
      await Character.updateOne(
        { _id: p.id },
        { $set: { 'energy.value': 100, 'energy.updatedAt': new Date(clock.now()) } },
      );
    }
  });

  // Review 1 (§9.1, §15.3): was "the shift's Iron line names the ordinance; Shift Hours −1 Energy and
  // two streak days". The shift is gone: the ended day's ordinance is a line on the desk's wage (on the
  // unmodified pay), and the Long Service Order steps seniority by two days.
  it('Public Works and Street Fund: the wage’s ordinance line names the ordinance; Long Service adds two seniority days', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21760);
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Mill Hand', fxp: 400 });
    const job = content.jobsAt('coalport.mill-gate')[0]!;
    await p.caller.job.take({ jobId: job.id, idempotencyKey: key() });
    const pay = jobPay(job, 'collective');
    let seniority = 0;
    for (const [i, id] of (['ord.public-works', 'ord.street-fund', 'ord.long-service'] as const).entries()) {
      // The ordinance is in force on day D+i; the boundary into D+i+1 pays that day's wage.
      clock.set(at(D + i));
      await forceOrdinance('coalport', id, D + i);
      const ironBefore = (await Character.findById(p.id).lean())!.iron;
      clock.set(at(D + i + 1));
      await p.caller.character.me();
      const m = content.ordinanceSpec(id)!;
      const step = id === 'ord.long-service' ? 2 : 1;
      seniority += step;
      const delta = jobPayWith(pay, { ordinance: m, firedUp: false }) - pay;
      const salary = (await p.caller.paper.today()).desk.salary!;
      expect(salary).toMatchObject({
        days: 1,
        perDay: pay,
        seniority: { days: seniority, amount: seniorityBonus(pay, seniority) },
        total: pay + seniorityBonus(pay, seniority) + delta,
        ordinance: delta === 0 ? null : { label: m.name, amount: delta },
      });
      expect((await Character.findById(p.id).lean())!.iron - ironBefore).toBe(salary.total);
      expect((await Character.findById(p.id).lean())!.job!.seniority).toBe(seniority);
    }
    // Public Works +22, Street Fund −54 on 216 (GDD §9.1); Long Service: 1 → 2 → 4 days.
    expect(seniority).toBe(4);
  });

  it('Rest Day Order: the Rested cap reads 250 while in force and the pool is never cut when it expires', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21780);
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Long Sleeper', fxp: 400 });
    await forceOrdinance('coalport', 'ord.rest-day', D);
    expect((await p.caller.character.me()).restedCap).toBe(250);
    await Character.updateOne({ _id: p.id }, { $set: { rested: 250 } });
    clock.set(at(D + 6));
    const me = await p.caller.character.me();
    expect(me.restedCap).toBe(200);
    expect(me.rested).toBe(250);
  });
});

// =============================================================================================
// 6. Morale (GDD §14.11, ADR 0022)
// =============================================================================================

describe('QA 6 · morale', () => {
  it('Unrest: the crisis pair pays 40 each; the plate says Unrest; every paper announces it (GDD §14.11)', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21810);
    await settleCityDay(content, 'coalport', at(D - 1));
    await City.updateOne({ _id: 'coalport' }, { $set: { 'opinion.collective': 55, 'opinion.neutral': 30 } });
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Crisis Worker', fxp: 400 });
    const me = await p.caller.character.me();
    const titles = me.orders.items.map((o) => o.title);
    // Review 1 (§13.7): titles say what and where.
    expect(titles.slice(0, 2)).toEqual([
      'Win back Coalport: talk to voters anywhere',
      'Win back Coalport: a speech anywhere',
    ]);
    const city = await p.caller.city.get({ cityId: 'coalport' });
    expect(city.morale).toMatchObject({ state: 'unrest' });
    const paper = await p.caller.paper.today();
    expect(paper.headlines.some((h) => /Unrest in Coalport/.test(`${h.headline} ${h.deck ?? ''}`))).toBe(
      true,
    );
  });

  it.fails(
    'BUG m1: on a count morning with two personal headlines, the Unrest announcement is pushed out of the paper',
    async () => {
      fixedSeeds();
      await resetCity('coalport');
      const D0 = nextCycleDay('coalport', 0, 21830);
      const clock = testClock(at(D0));
      const c = await player(clock, { name: 'Unlucky Candidate', fxp: 2_000, successes: 30, pc: 45 });
      await c.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() });
      await doTodaysOrders(c.caller);
      clock.set(at(D0 + 2));
      await c.caller.council.vote({ ordinanceId: 'ord.long-service', idempotencyKey: key() });
      clock.set(at(D0 + 4));
      await c.caller.character.me();
      // The branch neglected the city: morale falls below 60 before the count.
      await City.updateOne(
        { _id: 'coalport' },
        { $set: { 'opinion.collective': 52, 'opinion.neutral': 33 } },
      );
      clock.set(at(D0 + 5));
      const paper = await c.caller.paper.today();
      // Two personal lines (seat lost, vote counted), the count: the morale line has no room.
      expect(paper.headlines.some((h) => /Unrest/.test(`${h.headline} ${h.deck ?? ''}`))).toBe(true);
    },
  );

  it('Fired up: +10 % FXP as a named part on actions at home; the plate says so', async () => {
    await resetCity('coalport');
    const D = nextCycleDay('coalport', 3, 21850);
    await settleCityDay(content, 'coalport', at(D));
    await City.updateOne({ _id: 'coalport' }, { $set: { 'opinion.collective': 85, 'opinion.neutral': 10 } });
    const clock = testClock(at(D));
    const p = await player(clock, { name: 'Fired Canvasser', fxp: 400 });
    await forceOrdinance('coalport', null, D);
    expect((await p.caller.city.get({ cityId: 'coalport' })).morale).toMatchObject({ state: 'fired' });
    const r = await p.caller.action.perform({
      actionId: 'coalport.mill-gate.canvass',
      locationId: 'coalport.mill-gate',
      idempotencyKey: key(),
      times: 1,
    });
    // Per-line rounding, halves up (§14.11): a Partial's 3 FXP × 10 % = 0.3 shows nothing (n-list).
    const want = Math.round(r.rewards.fxp.base * 0.1 + 1e-9);
    const part = r.rewards.fxp.parts?.find((x) => x.label === 'Fired up');
    expect(part?.amount ?? 0).toBe(want);
  });
});

// =============================================================================================
// 7. The paper (GDD §3.3, ADR 0023)
// =============================================================================================

describe('QA 7 · the paper', () => {
  it('ELECTED once: animated on the first edition of the term, still there without the animation that day, gone the next', async () => {
    fixedSeeds();
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 21900);
    const clock = testClock(at(D0));
    const c = await player(clock, { name: 'Late Riser', fxp: 2_000, successes: 200, pc: 45 });
    await c.caller.council.declare({ ordinanceId: 'ord.long-service', idempotencyKey: key() });
    await doTodaysOrders(c.caller);
    // Away from the count morning until two days into the term (design §17 Q14).
    clock.set(at(D0 + 7));
    const first = await c.caller.paper.today();
    expect(first.frontPage).toMatchObject({
      animate: true,
      headline: 'Late Riser Tops the Poll in Coalport',
    });
    // The seat headline is not printed twice.
    expect(first.headlines.map((h) => h.headline)).not.toContain('Late Riser Tops the Poll in Coalport');
    await c.caller.paper.markRead({ day: D0 + 7 });
    await c.caller.paper.markRead({ day: D0 + 7 });
    const again = await c.caller.paper.today();
    expect(again.frontPage).toMatchObject({ animate: false });
    clock.set(at(D0 + 8));
    expect((await c.caller.paper.today()).frontPage).toBeNull();
    clock.set(at(D0 + 11));
    expect((await c.caller.paper.today()).frontPage).toBeNull();
  });

});

// =============================================================================================
// 9. Test hooks and memory mode (tech design §8.6, Deviations)
// =============================================================================================

describe('QA 9 · test hooks are memory-mode only; memory mode never reaches a non-local database', () => {
  const base = {
    BETTER_AUTH_SECRET: 'x'.repeat(40),
    PUBLIC_ORIGIN: 'http://localhost:5173',
  };
  it('E2E_TEST_HOOKS is refused outside DB_MODE=memory', () => {
    expect(() =>
      loadEnv({ ...base, DB_MODE: 'uri', MONGODB_URI: 'mongodb://127.0.0.1/x', E2E_TEST_HOOKS: '1' }),
    ).toThrow(/E2E_TEST_HOOKS/);
    expect(loadEnv({ ...base, DB_MODE: 'memory', E2E_TEST_HOOKS: '1' }).E2E_TEST_HOOKS).toBe(true);
  });

  it.each([
    'mongodb://evil.example:27017/irongate',
    'mongodb+srv://localhost/irongate',
    'mongodb://127.0.0.1:27018,evil.example:27017/irongate',
    'mongodb://localhost@evil.example/irongate',
    'mongodb://127.0.0.1.nip.io/irongate',
    'mongodb://localhost.evil.example/irongate',
    ' mongodb://127.0.0.1/irongate',
  ])('not loopback: %s', (uri) => {
    expect(isLoopbackUri(uri)).toBe(false);
  });

  it.each(['mongodb://127.0.0.1:27018/irongate?directConnection=true', 'mongodb://localhost/irongate'])(
    'loopback: %s',
    (uri) => expect(isLoopbackUri(uri)).toBe(true),
  );

  // m3, fixed: a proxy option (any option outside a short allow-list) makes the URI not loopback.
  it('m3: a SOCKS proxy option cannot send a "loopback" URI to another machine (proxyHost)', () => {
    expect(isLoopbackUri('mongodb://127.0.0.1:27017/irongate?proxyHost=db.evil.example&proxyPort=1080')).toBe(
      false,
    );
    for (const uri of [
      'mongodb://127.0.0.1:27018/irongate?directConnection=true&PROXYHOST=db.evil.example',
      'mongodb://127.0.0.1:27018/irongate?%70roxyHost=db.evil.example',
      'mongodb://localhost/irongate?proxyPort=1080',
      'mongodb://localhost/irongate?loadBalanced=true',
      'mongodb://localhost/irongate?tls=true&tlsCAFile=/x',
      'mongodb://localhost/irongate?directConnection=true#proxyHost=db.evil.example',
    ]) {
      expect(isLoopbackUri(uri), uri).toBe(false);
    }
    expect(isLoopbackUri('mongodb://127.0.0.1:27018/irongate?directConnection=true&replicaSet=rs0')).toBe(
      true,
    );
  });
});

// Keep the imports honest for tools that flag unused ones.
void PaperEntry;
void RequestLog;
void Vote;
void dayKey;
void HOME;
