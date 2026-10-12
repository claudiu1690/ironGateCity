/**
 * Review 4, phases 3–4 (docs/tech/review-4.md §8.5, §9.7; ADR 0076–0077): a home city is one map
 * (the open places, the greyed `lockedPins`, the Town Hall open at every Level); a locked place's
 * ticket and mission are refused whatever the client sends; and the Town Hall's sheet
 * (`council.hall`): the council's public face, the councillor's desk with its Next line, and *What
 * now*, marked seen once (`council.whatNowSeen`).
 */
import { ActionLog, Character, OfficeTerm } from '@irongate/db';
import { councilDay, councilKey} from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleCityDay } from '../src/services/cityDay';
import { gameData, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { nextCycleDay } from './politics.helpers';
import type { Player } from './politics.helpers';
import { at, content, key, member } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026

beforeAll(async () => {
  await setupDb('review4-hall-test');
});
afterAll(async () => {
  await teardownDb();
});

const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => null,
      (e: unknown) => e,
    ),
  );

/** Put `p` in the seat `n` of `cityId`'s council sitting on `day` (as a count would). */
async function seat(cityId: string, day: number, n: number, p: Player, name: string) {
  const cal = councilDay(day, content.city(cityId)!.council!.offset);
  const r = await OfficeTerm.updateOne(
    { councilKey: councilKey(cityId, cal.cycle), seat: n },
    { $set: { holder: { kind: 'player', characterId: p.id, name } } },
  );
  expect(r.matchedCount).toBe(1);
}

describe('a home city is one map (answers §21, ADR 0076)', () => {
  it('Coalport at Level 1: 7 open (the Mill and its Town Hall), 5 locked at Level 6, 4 later; no shapes', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'One Map', level: 1 });
    const v = await p.caller.city.get({ cityId: 'coalport' });
    expect(v.locations.map((l) => [l.n, l.id])).toEqual([
      [1, 'coalport.mill-gate'],
      [2, 'coalport.market-row'],
      [3, 'coalport.union-hall'],
      [4, 'coalport.terraces'],
      [5, 'coalport.quays'],
      [6, 'coalport.anchor'],
      [12, 'coalport.town-hall'],
    ]);
    expect(v.locations.find((l) => l.id === 'coalport.town-hall')).toMatchObject({ kind: 'town-hall', hall: true });
    expect(v.locations.filter((l) => l.hall)).toHaveLength(1);
    const locked = v.lockedPins!;
    expect(locked.filter((l) => l.lock.kind === 'level').map((l) => l.id)).toEqual([
      'coalport.shipyard',
      'coalport.customs-house',
      'coalport.infirmary',
      'coalport.harbour-police',
      'coalport.far-bank',
    ]);
    for (const l of locked.filter((x) => x.lock.kind === 'level'))
      expect(l).toMatchObject({ quarterId: 'coalport.harbour', lock: { kind: 'level', level: 6 } });
    expect(locked.filter((l) => l.lock.kind === 'edition').map((l) => [l.id, l.quarterId])).toEqual([
      ['coalport.station', 'coalport.sidings'],
      ['coalport.coal-yards', 'coalport.sidings'],
      ['coalport.tram-depot', 'coalport.sidings'],
      ['coalport.st-barbaras', 'coalport.sidings'],
    ]);
    // Names and points only: no tickets leave the server for a locked pin.
    for (const l of locked) expect(Object.keys(l).sort()).toEqual(['id', 'lock', 'map', 'name', 'quarterId']);
    // The quarters are the list's groups, with no shape.
    expect(v.quarters.map((q) => [q.id, q.open, q.lock, q.frame, q.outline, q.label])).toEqual([
      ['coalport.mill', true, null, undefined, undefined, undefined],
      ['coalport.harbour', false, { kind: 'level', level: 6 }, undefined, undefined, undefined],
      ['coalport.sidings', false, { kind: 'edition' }, undefined, undefined, undefined],
    ]);
  });

  it('Coalport at Level 6: 12 open, only the 4 later pins greyed', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Six Open', level: 6 });
    const v = await p.caller.city.get({ cityId: 'coalport' });
    expect(v.locations).toHaveLength(12);
    expect(v.lockedPins!.map((l) => l.lock.kind)).toEqual(['edition', 'edition', 'edition', 'edition']);
  });

  it("Ashford at Level 1: its Town Hall, painted in a later edition's quarter, is open", async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ash Hall', factionId: 'alliance', level: 1 });
    const v = await p.caller.city.get({ cityId: 'ashford' });
    const hall = v.locations.find((l) => l.id === 'ashford.town-hall')!;
    expect(hall).toMatchObject({ n: 12, kind: 'town-hall', hall: true, quarterId: 'ashford.station-road' });
    expect(hall.actions.map((a) => [a.id, a.energy, a.givesFxp])).toEqual([['ashford.town-hall.gallery', 6, false]]);
    expect(v.lockedPins!.map((l) => l.id)).not.toContain('ashford.town-hall');
    expect(v.lockedPins!.filter((l) => l.lock.kind === 'edition')).toHaveLength(5);
  });

  it('the capital has no greyed pins; its thirty places include the City Hall', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Cap Hall', level: 1, cityId: 'irongate' });
    const v = await p.caller.city.get({ cityId: 'irongate' });
    expect(v.lockedPins).toEqual([]);
    expect(v.locations).toHaveLength(30);
    expect(v.locations.at(-1)).toMatchObject({ id: 'irongate.city-hall', n: 30, hall: true });
    for (const q of v.quarters) expect(q.outline!.length).toBeGreaterThanOrEqual(6);
  });

  it('the Town Hall ticket at Level 1 is an ordinary gallery seat: no Party XP', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Gallery Seat', level: 1 });
    const r = await p.caller.action.perform({
      actionId: 'coalport.town-hall.gallery',
      locationId: 'coalport.town-hall',
      idempotencyKey: key(),
      times: 1,
    });
    expect(r).toMatchObject({ kind: 'checked', action: { id: 'coalport.town-hall.gallery' } });
    if ('attempts' in r) for (const a of r.attempts) expect(a.rewards.fxp.total).toBe(0);
  });
});

describe('a locked place is refused whatever the client sends (tech design §3.2)', () => {
  it('a Harbour ticket at Level 5: ACTION_LOCKED · QUARTER · 6, nothing written', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Too Early', level: 5 });
    const before = (await Character.findById(p.id).lean())!;
    const got = await refusal(
      p.caller.action.perform({
        actionId: 'coalport.shipyard.riveters',
        locationId: 'coalport.shipyard',
        idempotencyKey: key(),
        times: 1,
      }),
    );
    expect(got).toMatchObject({ code: 'PRECONDITION_FAILED', game: { reason: 'ACTION_LOCKED', lock: 'QUARTER', need: 6 } });
    const after = (await Character.findById(p.id).lean())!;
    expect(after.energy).toEqual(before.energy);
    expect(after.version).toBe(before.version);
    expect(await ActionLog.countDocuments({ characterId: p.id })).toBe(0);
  });

  it('a Harbour mission at Level 5: MISSION_LOCKED · QUARTER, nothing written', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Too Early Mission', level: 5, rank: 3 });
    const before = (await Character.findById(p.id).lean())!;
    const got = await refusal(
      p.caller.mission.start({
        locationId: 'coalport.shipyard',
        missionId: 'coalport.shipyard.launch',
        wayId: 'str',
        idempotencyKey: key(),
      }),
    );
    expect(got).toMatchObject({ game: { reason: 'MISSION_LOCKED', lock: 'QUARTER', need: 6 } });
    const after = (await Character.findById(p.id).lean())!;
    expect(after.version).toBe(before.version);
    expect(after.energy).toEqual(before.energy);
  });

  it('at Level 6 the same ticket is served', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Now Open', level: 6 });
    const r = await p.caller.action.perform({
      actionId: 'coalport.shipyard.riveters',
      locationId: 'coalport.shipyard',
      idempotencyKey: key(),
      times: 1,
    });
    expect(r).toMatchObject({ action: { id: 'coalport.shipyard.riveters' } });
  });
});

describe('the Town Hall sheet (answers §11.2, ADR 0077)', () => {
  it('an unknown city is NOT_FOUND', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Lost Hall' });
    expect(await refusal(p.caller.council.hall({ cityId: 'atlantis' }))).toMatchObject({
      code: 'NOT_FOUND',
      game: { reason: 'UNKNOWN_CITY' },
    });
  });
});

describe('What now (answers §10.1)', () => {
  it('whatNowSeen is idempotent: concurrent calls keep one moment; another character cannot mark it', async () => {
    await resetCity('duskwall');
    const D0 = nextCycleDay('duskwall', 0, 20930);
    const clock = testClock(at(D0));
    await settleCityDay(content, 'duskwall', clock.now());
    const cr = await member(clock, { name: 'Wha Tnow', factionId: 'vanguard', level: 10, rank: 3 });
    const other = await member(clock, { name: 'Not Mine', factionId: 'vanguard', level: 10 });
    await seat('duskwall', D0, 3, cr, 'Wha Tnow');
    const termId = (await cr.caller.council.hall({ cityId: 'duskwall' })).whatNow!.termId;

    // Another character's call changes nothing and reads nothing.
    expect(await other.caller.council.whatNowSeen({ termId })).toEqual({ seenAt: null });
    expect((await cr.caller.council.hall({ cityId: 'duskwall' })).whatNow).not.toBeNull();

    const rs = await Promise.all([1, 2, 3].map(() => cr.caller.council.whatNowSeen({ termId })));
    expect(new Set(rs.map((r) => r.seenAt)).size).toBe(1);
    expect(rs[0]!.seenAt).toBe(clock.now());
    clock.set(clock.now() + 60_000);
    expect(await cr.caller.council.whatNowSeen({ termId })).toEqual(rs[0]);
    expect((await cr.caller.council.hall({ cityId: 'duskwall' })).whatNow).toBeNull();
  });

});
