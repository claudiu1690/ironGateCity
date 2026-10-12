/**
 * Slice 4, T19 (tech design §15, §20): the boundary races: a tagged action against the Monday
 * resolution, a district action against the drift. The voting rework retired the capital week and
 * the person-ballot race (tech design §15.3).
 */
import { randomUUID } from 'node:crypto';
import {
  District,
  InfluenceLedger,
  IssueModel,
} from '@irongate/db';
import { applyBaselineDrift, applyPersuasion, dayStart } from '@irongate/rules';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cityDayHooks, runCityDay, settleCityDay } from '../src/services/cityDay';
import { callerFor, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, content, setLiveIssues, traveller } from './slice4.helpers';

const D0 = 20730; // Sun 4 Oct 2026: Irongate cycle day 0 (cycle 4146)
const MON2 = 20738;
const key = () => randomUUID();
const E = 'irongate.eastside';
const ARRIVALS = { actionId: 'irongate.central-station.arrivals', locationId: 'irongate.central-station' };

beforeAll(async () => {
  await setupDb('slice4-integration-test');
});
afterAll(teardownDb);
afterEach(() => {
  delete cityDayHooks.seed;
});

describe('the boundary races (tech design §15, T19)', () => {
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
