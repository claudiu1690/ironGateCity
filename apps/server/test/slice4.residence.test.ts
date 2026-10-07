/**
 * Slice 4, T12 (tech design §8.4, §20; ADR 0026): the residence seam. With every member living at
 * home it changes nothing (the slice 1–3 suite is the proof); here: the seam itself, the places a
 * request settles, and the eligibility counts by residence (with a document stored before
 * migration 006 still counted at home).
 */
import { getContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { dayKey } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activeMembersFilter, ensurePlaces } from '../src/services/cityDay';
import {
  jobCityOf,
  paperCityOf,
  placesOf,
  residenceCtx,
  residenceOf,
  residenceSpec,
} from '../src/services/residence';
import { setupDb, teardownDb, testClock } from './helpers';
import { player } from './politics.helpers';

const content = getContent();

beforeAll(async () => {
  await setupDb('slice4-residence-test');
});
afterAll(teardownDb);

const home = {
  cityId: 'coalport',
  districtId: null,
  sinceDay: 0,
  votesFromDay: 0,
  standsFromDay: 0,
  canMoveFromDay: 0,
};

describe('the seam (pure)', () => {
  it('a document without a residence lives at home, every window open', () => {
    expect(residenceOf({ homeCityId: 'coalport' })).toEqual(home);
    expect(residenceCtx({ homeCityId: 'coalport' })).toEqual({ cityId: 'coalport', districtId: null });
    const eastside = { ...home, cityId: 'irongate', districtId: 'irongate.eastside', sinceDay: 20_731 };
    expect(residenceOf({ homeCityId: 'coalport', residence: eastside })).toBe(eastside);
    expect(paperCityOf({ homeCityId: 'coalport', residence: eastside })).toBe('irongate');
    // Review 4 (GDD §3.3, ADR 0074): a Coalport resident in the capital, or on the train to it, reads
    // the Clarion (its Irongate edition is composed at read), not the Herald.
    const visitor = { homeCityId: 'coalport', residence: home, cityId: 'irongate' };
    expect(paperCityOf(visitor)).toBe('coalport');
    expect(paperCityOf({ homeCityId: 'duskwall' })).toBe('duskwall');
  });

  it("the residence's council: the home city's for a home resident; the capital's comes with T17", () => {
    const spec = residenceSpec(content, { homeCityId: 'duskwall' });
    expect([spec.city.id, spec.offset, spec.home, spec.place]).toEqual([
      'duskwall',
      3,
      'vanguard',
      { id: 'duskwall', name: 'Duskwall', kind: 'home' },
    ]);
    expect(() =>
      residenceSpec(content, {
        homeCityId: 'duskwall',
        residence: { ...home, cityId: 'irongate', districtId: 'irongate.eastside' },
      }),
    ).toThrow();
  });

  it('the places a request settles: where it stands (or the train goes), the residence, the job', () => {
    const c = {
      homeCityId: 'coalport',
      cityId: 'coalport',
      journey: null,
      job: { id: 'coalport-factory-worker', since: 1, seniority: 0 },
    } as Pick<CharacterDoc, 'homeCityId' | 'residence' | 'cityId' | 'journey' | 'job'>;
    expect(jobCityOf(content, c)).toBe(
      content.location(content.job('coalport-factory-worker')!.locationId)!.city.id,
    );
    expect(placesOf(content, c)).toEqual(['coalport']);
    const travelling = {
      ...c,
      residence: { ...home, cityId: 'irongate', districtId: 'irongate.eastside' },
      journey: {
        id: new Types.ObjectId(),
        from: 'coalport',
        to: 'irongate',
        boardedAt: new Date(),
        arrivesAt: new Date(),
        status: 'onTheWay' as const,
      },
    };
    expect(placesOf(content, travelling)).toEqual(['irongate', 'coalport']);
  });
});

describe('the eligibility counts by residence (tech design §5.7)', () => {
  it('counts residents through the residence index (migration 006 gives every document one)', async () => {
    const clock = testClock();
    const today = dayKey(clock.now());
    const a = await player(clock, { name: 'Ada Kern', fxp: 400 });
    const b = await player(clock, { name: 'Bela Vos', fxp: 400 });
    const count = () => Character.countDocuments(activeMembersFilter('coalport', 'collective', today));
    expect(await count()).toBe(2);
    // B moves to the capital: no longer a Coalport resident.
    await Character.updateOne(
      { _id: b.id },
      { $set: { residence: { ...home, cityId: 'irongate', districtId: 'irongate.eastside' } } },
    );
    expect(await count()).toBe(1);
    expect(await Character.countDocuments(activeMembersFilter('irongate', 'collective', today))).toBe(1);
    // T13: the filter is the residence index's own fields (no  on homeCityId), so the index serves it.
    const plan = await Character.find(activeMembersFilter('coalport', 'collective', today)).explain();
    expect(JSON.stringify(plan)).toContain('residence.cityId_1');
    expect(a.id).toBeTruthy();
  });

  it('ensurePlaces settles the residence city for a home resident (one city, as before)', async () => {
    const clock = testClock();
    const p = await player(clock, { name: 'Cora Lind' });
    const doc = (await Character.findById(p.id).lean<CharacterDoc>())!;
    const places = await ensurePlaces(content, doc, clock.now());
    expect([...places.keys()]).toEqual(['coalport']);
    expect(places.get('coalport')?.world?.settledDay).toBe(dayKey(clock.now()));
  });
});
