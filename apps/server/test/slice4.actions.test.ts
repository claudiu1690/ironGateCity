/**
 * Slice 4, T14 (tech design §8.2, §10.1, §15 "actions"; ADR 0027–0030): a capital action in a
 * close race tagged with an Issue (the factors, the parts, the ledger, the totals, the momentum),
 * members-only HQs, the district write contention, and the city view v4.
 */
import { randomUUID } from 'node:crypto';
import {
  ActionLog,
  Character,
  Contribution,
  District,
  InfluenceLedger,
  IssueModel,
  contributionId,
} from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { applyPersuasion } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, setDistrict, setLiveIssues, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const key = () => randomUUID();
const ARRIVALS = { actionId: 'irongate.central-station.arrivals', locationId: 'irongate.central-station' };
const DOCKERS = { actionId: 'irongate.riverside-quays.dockers', locationId: 'irongate.riverside-quays' };
const SM = 'irongate.station-market';
const EVEN = { vanguard: 20, collective: 20, alliance: 20, neutral: 40 };

beforeAll(async () => {
  await setupDb('slice4-actions-test');
});
afterAll(teardownDb);

describe('a capital action (tech design §10.1)', () => {
  it('a canvass in a close race tagged with the Tram Fare Hike: the factors, the parts, the ledger, the momentum', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { cityId: 'irongate', name: 'Ada Kern' });
    await setDistrict(SM, EVEN, { battleground: true }, DAY);
    const [fares] = await setLiveIssues('irongate', ['issue.tram-fares', 'issue.press-raids'], DAY);
    const r = await p.caller.action.perform({ ...ARRIVALS, idempotencyKey: key(), times: 1 });
    const success = r.stamp === 'success';
    // 0.05 × 1.25 × 1.5 = 0.09375 → 0.094 (rounded once); a Partial 0.047.
    expect(r.rewards.opinion).toBe(success ? 0.094 : 0.047);
    expect(r.rewards.opinionFactors).toEqual([
      { id: 'battleground', label: 'Close race', pct: 25 },
      { id: 'issue:issue.tram-fares', label: 'Issue: Tram Fare Hike', pct: 50 },
    ]);
    // Party XP: base 6 (3 on a Partial) and Close race +25 % of base as its own part.
    expect(r.rewards.fxp.parts).toEqual(
      expect.arrayContaining([{ id: 'battleground', label: 'Close race', amount: success ? 2 : 1 }]),
    );
    expect(r.attempts[0]!.check.bonuses).toEqual(
      expect.arrayContaining([{ id: 'battleground', label: 'Close race', value: 5 }]),
    );
    expect((r.attempts[0] as unknown as { points: number }).points).toBe(success ? 10 : 5);
    expect(r.bonusTags.map((t) => t.label)).toEqual(
      expect.arrayContaining(['Issue: Tram Fare Hike', 'Close race']),
    );
    const op = applyPersuasion(EVEN, { factionId: 'collective', swing: r.rewards.opinion });
    expect(r.effects.opinion).toMatchObject({
      cityId: 'irongate',
      placeId: SM,
      placeName: 'Station & Market',
      shareBefore: 20,
      shareAfter: op.shares.collective,
    });
    expect((await District.findById(SM).lean())!.opinion).toEqual(op.shares);
    expect(r.effects.issues).toEqual([
      {
        issueId: 'issue.tram-fares',
        name: 'Tram Fare Hike',
        factionId: 'collective',
        added: success ? 10 : 5,
        totals: { vanguard: 0, collective: success ? 10 : 5, alliance: 0 },
        leader: 'collective',
      },
    ]);
    expect(r.effects.scoreboard).toEqual({
      placeName: 'Station & Market',
      swing: r.rewards.opinion,
      rank: 1,
      of: 1,
    });
    // The ledger row (the action's log id), the influence total, the points total.
    const rows = await InfluenceLedger.find({ kind: 'action', ref: r.logId }).lean();
    expect(rows.map((x) => [x.placeId, x.factionId, x.swing, x.cycleKey])).toEqual([
      [SM, 'collective', Math.round(r.rewards.opinion * 1000), 'irongate.station-market:4146'],
    ]);
    const infl = await Contribution.findById(
      contributionId('influence|irongate.station-market:4146', p.id),
    ).lean();
    expect(infl).toMatchObject({ amount: Math.round(r.rewards.opinion * 1000), level: 10, name: 'Ada Kern' });
    const pts = await Contribution.findById(contributionId(`points|${fares}`, p.id)).lean();
    expect(pts?.amount).toBe(success ? 10 : 5);
    expect((await IssueModel.findById(fares).lean())!.momentum.collective).toBe(success ? 10 : 5);
    // Eastside is not a close race and the tram fares do not feed the quays: no factors there.
    const r2 = await p.caller.action.perform({ ...DOCKERS, idempotencyKey: key(), times: 1 });
    expect(r2.rewards.opinionFactors).toBeUndefined();
    expect(r2.effects.opinion?.placeId).toBe('irongate.eastside');
  });

  it("members only: another faction's capital HQ refuses; your own works", async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { cityId: 'irongate', factionId: 'alliance', name: 'Bela Vos' });
    const e = gameData(
      await p.caller.action
        .perform({
          actionId: 'irongate.union-house.committee',
          locationId: 'irongate.union-house',
          idempotencyKey: key(),
          times: 1,
        })
        .catch((x: unknown) => x),
    );
    expect(e).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'MEMBERS_ONLY', factionId: 'collective' },
    });
    const city = await p.caller.city.get({ cityId: 'irongate' });
    const union = city.locations.find((l) => l.id === 'irongate.union-house')!;
    expect(union.actions[0]!.locked).toEqual({ reason: 'MEMBERS_ONLY', need: 0, factionId: 'collective' });
    expect(union.actions[0]!.placeTags).toEqual([{ kind: 'membersOnly', factionId: 'collective' }]);
  });

  it('concurrent actions in two districts do not conflict; in one district they serialise, every row in the ledger', async () => {
    const clock = testClock(at(DAY));
    const a = await traveller(clock, { cityId: 'irongate', name: 'Cora Lind' });
    const b = await traveller(clock, { cityId: 'irongate', name: 'Dov Ries', factionId: 'vanguard' });
    const [ra, rb] = await Promise.all([
      a.caller.action.perform({ ...ARRIVALS, idempotencyKey: key(), times: 1 }),
      b.caller.action.perform({ ...DOCKERS, idempotencyKey: key(), times: 1 }),
    ]);
    const logs = await ActionLog.find({ _id: { $in: [ra.logId, rb.logId] } }, { txAttempts: 1 }).lean();
    expect(logs.map((l) => l.txAttempts)).toEqual([1, 1]);
    const c = await traveller(clock, { cityId: 'irongate', name: 'Eva Holt', factionId: 'alliance' });
    const runs = await Promise.all([
      a.caller.action.perform({ ...ARRIVALS, idempotencyKey: key(), times: 1 }),
      c.caller.action.perform({ ...ARRIVALS, idempotencyKey: key(), times: 1 }),
      b.caller.action.perform({ ...ARRIVALS, idempotencyKey: key(), times: 1 }),
    ]);
    const rows = await InfluenceLedger.find({ ref: { $in: runs.map((r) => r.logId) } }).lean();
    expect(rows).toHaveLength(3);
  });
});

describe('city.get v4 in the capital (tech design §8.3)', () => {
  it('five districts, the place tags, the Trains card at Central Station, the residence cards', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { cityId: 'irongate', name: 'Fritz Mann' });
    await setDistrict(SM, EVEN, { battleground: true }, DAY);
    await setLiveIssues('irongate', ['issue.tram-fares', 'issue.press-raids'], DAY);
    const city = await p.caller.city.get({ cityId: 'irongate' });
    expect(city.districts!.map((d) => d.id)).toEqual([
      'irongate.government-quarter',
      'irongate.old-town',
      SM,
      'irongate.eastside',
      'irongate.garrison-hill',
    ]);
    const sm = city.districts!.find((d) => d.id === SM)!;
    expect(sm.state).toMatchObject({ battleground: true, word: 'closeRace' });
    expect(sm.issues.map((i) => i.issueId)).toEqual(['issue.tram-fares']);
    expect(sm.seats).toHaveLength(2);
    // A Rank 2 visitor with the Iron: may register here.
    expect(sm.residence).toMatchObject({
      state: 'visitingMay',
      livesIn: 'Coalport',
      cost: 500,
      button: { enabled: true },
    });
    expect(sm.residence.sheet!.lines[0]!.text).toMatch(
      /^You vote and stand in Station & Market from the next election/,
    );
    expect(sm.residence.room).toMatchObject({ state: 'none', price: { total: 100 }, cap: 250 });
    const station = city.locations.find((l) => l.id === 'irongate.central-station')!;
    expect(station.quarterId).toBe(SM);
    expect(station.issueIds).toEqual(['issue.tram-fares']);
    // Slice 5 (design §11.1): the rival homes are listed and boardable from Level 10.
    expect(station.trains!.destinations.map((d) => [d.cityId, d.minutes, d.fare.total, d.canBoard])).toEqual([
      ['ashford', 12, 20, true],
      ['duskwall', 15, 20, true],
      ['coalport', 12, 20, true],
    ]);
    const canvass = station.actions.find((a) => a.id === ARRIVALS.actionId)!;
    expect(canvass.placeTags).toEqual([
      { kind: 'issue', issueId: 'issue.tram-fares', name: 'Tram Fare Hike', pct: 50 },
      { kind: 'closeRace', fxpPct: 25 },
    ]);
    expect(canvass.preview!.bonuses).toEqual(
      expect.arrayContaining([{ id: 'battleground', label: 'Close race', value: 5 }]),
    );
    expect(city.issues!.map((i) => i.issueId)).toEqual(['issue.tram-fares', 'issue.press-raids']);
    // The residence's Election card wherever you are (Coalport's for a home resident).
    expect(city.election?.cityId).toBe('coalport');
    const doc = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect(doc.cityId).toBe('irongate');
  });
});
