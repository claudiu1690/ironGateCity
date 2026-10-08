/**
 * Review 5, T2 (docs/tech/review-5.md §3.2–§3.5; ADR 0079, 0080): the one night seam (`nightAt`, its
 * test-only modes, the env and the route), the views' night blocks, and the night on rival ground
 * while acting: a Collective visitor's Duskwall tickets at 21:59 and 22:00, a rival tap at 22:30 whose
 * opponent comes from the night pool, the dev status's chance 25, *To dusk*, and `StreetForce.rolls`.
 */
import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Character, City, mongoose, nativeDb } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { createRng, dayStart, heatState, pickOpponent, riskBand } from '@irongate/rules';
import type { CityView, FactionId, MissionView, RunInPending } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { createAuth } from '../src/auth';
import { toDuskAt } from '../src/dev/clock';
import { tapRunInChance } from '../src/dev/risk';
import type { DevActionResult, DevStatus } from '../src/dev/types';
import { keySeed } from '../src/services/keyGuard';
import { nightAt, nightHooks } from '../src/services/night';
import { streetHooks } from '../src/services/streetHooks';
import { setupDb, teardownDb, testClock, testEnv } from './helpers';
import { content, key, member } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const H = 3_600_000;
const M = 60_000;
const at = (h: number, m = 0) => dayStart(DAY) + h * H + m * M;
const WATCH = { placeId: 'duskwall.checkpoint', missionId: 'duskwall.checkpoint.watch' };
const CANVASS = { actionId: 'duskwall.quartermaster-market.canvass', locationId: 'duskwall.quartermaster-market' };

let uri: string;
beforeAll(async () => {
  uri = await setupDb('review5-night-test');
  streetHooks.enabled = true;
});
afterAll(teardownDb);
afterEach(() => {
  // The suite's pin (test/setup.ts): every night test restores it.
  nightHooks.mode = 'day';
});

const missionAt = (v: CityView, placeId: string, id: string): MissionView => {
  const m = (v.locations.find((l) => l.id === placeId)?.missions ?? []).find((x) => x.id === id);
  if (!m) throw new Error(`no mission ${id} at ${placeId}`);
  return m;
};

describe('the seam (ADR 0079)', () => {
  it('on the clock: night the last two hours of six, changesAt the next dusk or dawn', () => {
    nightHooks.mode = 'clock';
    expect(nightAt(at(21, 59))).toEqual({ night: false, nextDusk: at(22), nextDawn: at(24), changesAt: at(22) });
    expect(nightAt(at(22))).toEqual({ night: true, nextDusk: at(28), nextDawn: at(24), changesAt: at(24) });
    expect(nightAt(at(9)).changesAt).toBe(at(10));
  });

  it('pinned: day or night whatever the clock, changesAt null, the clock times kept', () => {
    nightHooks.mode = 'day';
    expect(nightAt(at(22, 30))).toEqual({ night: false, nextDusk: at(28), nextDawn: at(24), changesAt: null });
    nightHooks.mode = 'night';
    expect(nightAt(at(9))).toEqual({ night: true, nextDusk: at(10), nextDawn: at(12), changesAt: null });
  });

  it('the panel\'s *To dusk*: a minute past the next dusk', () => {
    expect(toDuskAt(at(3, 58))).toBe(at(4, 1));
    expect(toDuskAt(at(4))).toBe(at(10, 1));
  });
});

describe('a Collective visitor in Duskwall at dusk (tech design §3.4)', () => {
  it('21:59: the watch reads Risky with no night tag; 22:00: Dangerous, tagged, every tap tagged', async () => {
    nightHooks.mode = 'clock';
    const clock = testClock(at(21, 59));
    const p = await member(clock, { name: 'Nia Dusk', level: 10, cityId: 'duskwall' });
    await City.updateOne({ _id: 'duskwall' }, { $set: { rivalPressure: null } });

    const day = await p.caller.city.get({ cityId: 'duskwall' });
    expect(day.night).toEqual({ night: false, nextDusk: at(22), nextDawn: at(24), changesAt: at(22) });
    expect(day.isNight).toBe(false);
    const w1 = missionAt(day, WATCH.placeId, WATCH.missionId);
    expect(w1.risk.runInChance).toBe(20);
    expect(riskBand(w1.risk.runInChance)).toBe('risky');
    expect(w1.placeTags).not.toContainEqual({ kind: 'night' });
    const taps1 = day.locations.flatMap((l) => l.actions.filter((a) => a.kind === 'checked'));
    expect(taps1.some((a) => a.placeTags?.some((t) => t.kind === 'night'))).toBe(false);

    clock.set(at(22));
    const night = await p.caller.city.get({ cityId: 'duskwall' });
    expect(night.night).toEqual({ night: true, nextDusk: at(28), nextDawn: at(24), changesAt: at(24) });
    expect(night.isNight).toBe(true);
    const w2 = missionAt(night, WATCH.placeId, WATCH.missionId);
    expect(w2.risk.runInChance).toBe(30);
    expect(riskBand(w2.risk.runInChance)).toBe('dangerous');
    expect(w2.placeTags).toContainEqual({ kind: 'night' });
    const taps2 = night.locations.flatMap((l) => l.actions.filter((a) => a.kind === 'checked' && !a.locked));
    expect(taps2.length).toBeGreaterThan(0);
    for (const a of taps2) expect(a.placeTags, a.id).toContainEqual({ kind: 'night' });
  });

  it('at home the night changes no ticket: no tag, the run-in as by day', async () => {
    nightHooks.mode = 'clock';
    const clock = testClock(at(22, 10));
    const p = await member(clock, { name: 'Ola Home', level: 10 });
    const v = await p.caller.city.get({ cityId: 'coalport' });
    expect(v.night.night).toBe(true);
    for (const l of v.locations) {
      for (const a of l.actions) expect(a.kind === 'checked' ? a.placeTags : [], a.id).not.toContainEqual({ kind: 'night' });
      for (const m of l.missions ?? []) expect(m.placeTags, m.id).not.toContainEqual({ kind: 'night' });
    }
  });

  it('the forced day (the suite\'s pin) keeps 22:00 a day read', async () => {
    const clock = testClock(at(22));
    const p = await member(clock, { name: 'Pia Pinned', level: 10, cityId: 'duskwall' });
    const v = await p.caller.city.get({ cityId: 'duskwall' });
    expect(v.night).toMatchObject({ night: false, changesAt: null });
    expect(missionAt(v, WATCH.placeId, WATCH.missionId).risk.runInChance).toBe(20);
  });
});

describe('a rival tap at 22:30 (ADR 0080: read at the act)', () => {
  it('the run-in forced through the street hook draws its opponent from the night pool; the dev status reads 25', async () => {
    nightHooks.mode = 'clock';
    const clock = testClock(at(22, 30));
    const p = await member(clock, { name: 'Ros Night', level: 10, cityId: 'duskwall' });
    await City.updateOne({ _id: 'duskwall' }, { $set: { rivalPressure: null } });
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;

    // The dev status: a tap's run-in chance here and now (Cool, clean): 25 at night, 15 by day.
    expect(tapRunInChance(content, c, null, at(22, 30))).toBe(25);
    expect(tapRunInChance(content, c, null, at(21, 30))).toBe(15);

    // A key whose street stream picks someone else by day and the police at night (Cool: the night
    // pool is half police), so the opponent shows which pool the act read.
    const pool = content.runInPoolOf('duskwall');
    const sideOf = (id: string) => content.opponent(id)?.side ?? 'police';
    const pick = (k: string, night: boolean) => {
      const street = createRng(`${keySeed(new Types.ObjectId(p.id), k)}:runIn`);
      street.roll100();
      return pickOpponent({
        pool,
        actor: 'collective' as FactionId,
        heatState: heatState(0),
        sideOf,
        policeId: 'city-police',
        rng: street,
        night,
        rivalGround: true,
      });
    };
    let k = '';
    for (let n = 0; n < 500 && !k; n++) {
      const candidate = randomUUID();
      if (pick(candidate, true) === 'city-police' && pick(candidate, false) !== 'city-police') k = candidate;
    }
    expect(k).not.toBe('');
    streetHooks.set(p.id, { runIn: 'next', checkRoll: 1 });
    const r = (await p.caller.action.perform({ ...CANVASS, idempotencyKey: k, times: 1 })) as unknown as RunInPending;
    expect(r).toMatchObject({ kind: 'runIn', opponent: { id: 'city-police' } });
  });
});

describe('the night blocks on the other views (ADR 0079 §3)', () => {
  it('the nation, the Town Hall and the election carry the block', async () => {
    nightHooks.mode = 'clock';
    const clock = testClock(at(16, 30));
    const p = await member(clock, { name: 'Sev Views', level: 10 });
    const block = { night: true, nextDusk: at(22), nextDawn: at(18), changesAt: at(18) };
    const nation = await p.caller.travel.nation();
    expect(nation.night).toEqual(block);
    expect(nation.isNight).toBe(true);
    const hall = await p.caller.council.hall({ cityId: 'coalport' });
    expect(hall.night).toEqual(block);
    expect(hall.hall.night).toEqual(block);
    const election = await p.caller.council.election();
    expect(election.hall?.night).toEqual(block);
  });

  it('a journey carries the block', async () => {
    nightHooks.mode = 'clock';
    const clock = testClock(at(10, 15));
    const p = await member(clock, { name: 'Tam Train', level: 10, iron: 500 });
    await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const j = await p.caller.travel.journey();
    expect(j?.night).toEqual({ night: true, nextDusk: at(16), nextDawn: at(12), changesAt: at(12) });
  });
});

describe('StreetForce.rolls (tech design §4.3): each row\'s roll, home tier 1 included', () => {
  it('a ×3 at home takes [1, 99, 1] and leaves the rest of the force for the next act', async () => {
    const clock = testClock(at(9));
    const p = await member(clock, { name: 'Uli Rolls', level: 10 });
    streetHooks.set(p.id, { rolls: [1, 99, 1], runIn: 'never' });
    const r = await p.caller.action.perform({
      actionId: 'coalport.mill-gate.canvass',
      locationId: 'coalport.mill-gate',
      idempotencyKey: key(),
      times: 3,
    });
    expect(r.attempts.map((a) => a.roll)).toEqual([1, 99, 1]);
    expect(streetHooks.peek(p.id)).toEqual({ runIn: 'never' });
    streetHooks.clear();
  });
});

describe('the night route and the env (ADR 0079)', () => {
  const ORIGIN = 'http://localhost:5173';
  async function appWith(env: Record<string, unknown>) {
    const e = { ...testEnv(uri), ...env };
    const app = await buildApp({
      env: e,
      auth: createAuth(e, nativeDb(), mongoose.connection.getClient()),
      content: getContent(),
      now: () => at(9),
    });
    await app.ready();
    return app;
  }

  it('without the hooks the route does not exist', async () => {
    const app = await appWith({});
    const res = await app.inject({ method: 'POST', url: '/api/test/night', payload: { mode: 'night' } });
    expect(res.statusCode).toBe(404);
    expect(nightHooks.mode).toBe('day');
    await app.close();
  });

  it('E2E_NIGHT at start-up; POST /api/test/night switches it and answers the block; a bad mode is a 400', async () => {
    nightHooks.mode = 'clock';
    const app = await appWith({ E2E_TEST_HOOKS: true, E2E_NIGHT: 'day' });
    expect(nightHooks.mode).toBe('day');
    const res = await app.inject({
      method: 'POST',
      url: '/api/test/night',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      payload: { mode: 'night' },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, mode: 'night', night: { night: true, changesAt: null } });
    const bad = await app.inject({
      method: 'POST',
      url: '/api/test/night',
      headers: { 'content-type': 'application/json' },
      payload: { mode: 'dusk' },
    });
    expect(bad.statusCode).toBe(400);
    await app.close();
  });

  it('the dev panel: the status shows the night, and *To dusk* lands a minute past it', async () => {
    nightHooks.mode = 'clock';
    const app = await appWith({ E2E_TEST_HOOKS: true });
    const status = await app.inject({ method: 'GET', url: '/api/test/dev/status' });
    expect(status.statusCode).toBe(200);
    expect((status.json() as DevStatus).night).toMatchObject({
      night: false,
      nextDusk: at(10),
      nextDuskUtc: 'Tuesday 6 Oct 10:00 UTC',
      mode: 'clock',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/test/dev/dusk',
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode, res.body).toBe(200);
    const after = res.json() as DevActionResult;
    expect(after.status.now).toBe(at(10, 1));
    expect(after.status.night).toMatchObject({ night: true, nextDawnUtc: 'Tuesday 6 Oct 12:00 UTC' });
    await app.close();
  });
});
