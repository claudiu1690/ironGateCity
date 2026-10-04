/**
 * Slice 5, T12 (tech design §8.3, §15 "Server — quarters and views"): the city view v5. Every
 * city's quarters with their locks at Levels 5, 6 and 10; the missions after the tickets (hidden
 * from their target's members, their gates, their risk line); the record's lock at a court; and
 * `city.get` on rival ground (the plate, the residence card, ×1 only, the tags).
 */
import { Character, City, District } from '@irongate/db';
import type { CharacterDoc, CityDoc, DistrictDoc } from '@irongate/db';
import { createRng, resolveMission } from '@irongate/rules';
import type { ActionView, CityView, FactionId, LocationView, MissionView } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { missionCtx, missionInput, wayOf, wayPreview } from '../src/services/missionCtx';
import { setupDb, teardownDb, testClock } from './helpers';
import type { Player } from './politics.helpers';
import { at, content, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026

beforeAll(async () => {
  await setupDb('slice5-views-test');
});
afterAll(teardownDb);

const HOME: Record<string, FactionId> = { coalport: 'collective', duskwall: 'vanguard', ashford: 'alliance' };

const place = (v: CityView, id: string): LocationView => {
  const l = v.locations.find((x) => x.id === id);
  if (!l) throw new Error(`no place ${id} in ${v.id}`);
  return l;
};
const missionAt = (v: CityView, placeId: string, id: string): MissionView => {
  const m = (place(v, placeId).missions ?? []).find((x) => x.id === id);
  if (!m) throw new Error(`no mission ${id} at ${placeId}`);
  return m;
};
const missionIds = (v: CityView): string[] => v.locations.flatMap((l) => (l.missions ?? []).map((m) => m.id));
const checked = (v: CityView): ActionView[] =>
  v.locations.flatMap((l) => l.actions.filter((a) => a.kind === 'checked'));

async function cityOf(p: Player, cityId: string): Promise<CityView> {
  return p.caller.city.get({ cityId });
}

describe('CityView.quarters for every city (ADR 0035, design §2.1)', () => {
  for (const level of [5, 6, 10]) {
    for (const cityId of ['coalport', 'duskwall', 'ashford'] as const) {
      it(`${cityId} at Level ${level}: three quarters, the second open from 6, the third a teaser`, async () => {
        const clock = testClock(at(DAY));
        const p = await member(clock, { name: `Q ${cityId} ${level}`, factionId: HOME[cityId]!, level });
        const v = await cityOf(p, cityId);
        const city = content.city(cityId)!;
        expect(v.quarters.map((q) => q.id)).toEqual(city.quarters.map((q) => q.id));
        const [first, second, third] = v.quarters;
        expect(first).toMatchObject({ open: true, lock: null });
        expect(second).toMatchObject(
          level >= 6 ? { open: true, lock: null } : { open: false, lock: { kind: 'level', level: 6 } },
        );
        expect(third).toMatchObject({ open: false, lock: { kind: 'edition' }, places: 0 });
        for (const [i, q] of v.quarters.entries()) {
          const c = city.quarters[i]!;
          expect(q.frame).toEqual(c.frame);
          expect(q.outline!.length).toBeGreaterThanOrEqual(6);
          expect(q.outline).toEqual(c.outline);
          expect(q.label).toEqual(c.label);
          expect(q.blurb).toBe(c.blurb ?? null);
          expect(q.teaser).toBe(c.teaser ?? null);
          expect(q.places).toBe(city.locations.filter((l) => l.quarterId === c.id).length);
        }
        // The locked quarters' teasers come back; their places are not offered.
        expect(second!.teaser).toEqual(expect.any(String));
        expect(third!.teaser).toEqual(expect.any(String));
        expect(second!.places).toBe(5);
        const offered = new Set(v.locations.map((l) => l.quarterId));
        expect(offered.has(first!.id)).toBe(true);
        expect(offered.has(second!.id)).toBe(level >= 6);
        expect(offered.has(third!.id)).toBe(false);
      });
    }
    it(`irongate at Level ${level}: five districts, all open, with outlines and labels`, async () => {
      const clock = testClock(at(DAY));
      const p = await member(clock, { name: `Q irongate ${level}`, level, cityId: 'irongate' });
      const v = await cityOf(p, 'irongate');
      expect(v.quarters).toHaveLength(5);
      for (const q of v.quarters) {
        expect(q).toMatchObject({ open: true, lock: null, teaser: null });
        expect(q.outline!.length).toBeGreaterThanOrEqual(6);
        expect(q.label).toEqual(content.city('irongate')!.quarters.find((x) => x.id === q.id)!.label);
        expect(q.places).toBeGreaterThan(0);
      }
      // The districts keep their own view.
      expect(v.districts).toHaveLength(5);
    });
  }

  it('a quarter the game sent the character to opens whatever the Level (a view rule)', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Q Sent', level: 5 });
    const ward = content.servicesOf('coalport')!.infirmary.location;
    await setRisk(p.id, clock.now(), {
      held: {
        kind: 'infirmary',
        state: 'out',
        cityId: 'coalport',
        locationId: ward.id,
        since: new Date(clock.now() - 60_000),
        until: new Date(clock.now() - 1_000),
        bail: null,
        rivalGround: false,
      },
    });
    const v = await cityOf(p, 'coalport');
    expect(v.quarters.find((q) => q.id === ward.quarterId)).toMatchObject({ open: true, lock: null });
    expect(v.locations.some((l) => l.id === ward.id)).toBe(true);
  });
});

describe('missions on the place sheet (tech design §8.3, design §4)', () => {
  it('are hidden from their target faction; a visitor sees the HQ missions against it', async () => {
    const clock = testClock(at(DAY));
    const own = await member(clock, { name: 'M Own', level: 10, rank: 3 });
    const mine = await cityOf(own, 'coalport');
    const ids = missionIds(mine);
    // The Union Hall's two and the Foundry Row meeting are against the Collective: hidden from its members.
    expect(ids).not.toContain('coalport.union-hall.spike');
    expect(ids).not.toContain('coalport.union-hall.roll');
    expect(ids).not.toContain('coalport.terraces.stair-meeting');
    expect(ids).toEqual(
      expect.arrayContaining([
        'coalport.shipyard.launch',
        'coalport.customs-house.watch',
        'coalport.far-bank.posters',
      ]),
    );
    expect(missionAt(mine, 'coalport.far-bank', 'coalport.far-bank.posters').targetFactionId).toBe('vanguard');

    const visitor = await member(clock, { name: 'M Visitor', factionId: 'vanguard', level: 10, rank: 3, cityId: 'coalport' });
    const theirs = await cityOf(visitor, 'coalport');
    // At the Union Hall a visitor sees the members-only tickets dimmed and the two missions.
    const hall = place(theirs, 'coalport.union-hall');
    expect(hall.actions.every((a) => a.locked?.reason === 'MEMBERS_ONLY')).toBe(true);
    expect((hall.missions ?? []).map((m) => m.id)).toEqual(['coalport.union-hall.spike', 'coalport.union-hall.roll']);
    // The posters are against the visitor's own party.
    expect(missionIds(theirs)).not.toContain('coalport.far-bank.posters');
    expect(missionIds(theirs)).toContain('coalport.terraces.stair-meeting');
  });

  it("the capital's leader target: the district's leader, or the runner-up for the leader's own", async () => {
    const clock = testClock(at(DAY));
    const red = await member(clock, { name: 'M Red', level: 10, rank: 3, cityId: 'irongate' });
    const blue = await member(clock, { name: 'M Blue', factionId: 'vanguard', level: 10, rank: 3, cityId: 'irongate' });
    // Settle the capital's day first, then set the district as the boundary would have left it.
    await cityOf(red, 'irongate');
    const opinion = { vanguard: 40, collective: 30, alliance: 20, neutral: 10 };
    await District.updateOne(
      { _id: 'irongate.station-market' },
      { $set: { opinion, 'state.leader': 'vanguard' } },
    );
    const a = missionAt(await cityOf(red, 'irongate'), 'irongate.tram-junction', 'irongate.tram-junction.shelters');
    const b = missionAt(await cityOf(blue, 'irongate'), 'irongate.tram-junction', 'irongate.tram-junction.shelters');
    expect(a).toMatchObject({ targetFactionId: 'vanguard', label: 'against', locked: null });
    expect(b).toMatchObject({ targetFactionId: 'collective', label: 'against' });
    // An old district document without `leader` falls back to the top share.
    await District.updateOne({ _id: 'irongate.station-market' }, { $unset: { 'state.leader': 1 } });
    const c = missionAt(await cityOf(red, 'irongate'), 'irongate.tram-junction', 'irongate.tram-junction.shelters');
    expect(c.targetFactionId).toBe('vanguard');
  });

  it('the gates: Level, Rank (with the title); legal missions open at Level 6', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'M Gates', level: 6, rank: 1 });
    const v = await cityOf(p, 'coalport');
    // The Level-8 meetings are against the home party: a Level-6 visitor sees the Level lock first.
    const visitor = await member(clock, { name: 'M Gates V', factionId: 'vanguard', level: 6, cityId: 'coalport' });
    const vv = await cityOf(visitor, 'coalport');
    expect(missionAt(vv, 'coalport.terraces', 'coalport.terraces.stair-meeting').locked).toEqual({
      reason: 'LEVEL',
      need: 8,
    });
    expect(missionAt(vv, 'coalport.union-hall', 'coalport.union-hall.spike').locked).toEqual({
      reason: 'LEVEL',
      need: 10,
    });
    expect(missionAt(v, 'coalport.far-bank', 'coalport.far-bank.posters').locked).toEqual({
      reason: 'RANK',
      need: 3,
      rankTitle: 'Organiser',
    });
    const launch = missionAt(v, 'coalport.shipyard', 'coalport.shipyard.launch');
    expect(launch).toMatchObject({
      type: 'speech',
      label: 'speech',
      targetFactionId: null,
      energy: 15,
      locked: null,
      remembered: null,
      risk: { heat: 0, runInChance: 5, marks: 0 },
    });
    expect(launch.ways.map((w) => w.id)).toEqual(['cha-int', 'str', 'best']);
    expect(launch.ways.every((w) => w.risk === null)).toBe(true);
    expect(launch.briefing.length).toBeGreaterThan(0);
    expect(launch.art).toMatchObject({ rung: 'scene', asset: { id: content.missionCard('speech') } });
    expect(missionAt(v, 'coalport.customs-house', 'coalport.customs-house.watch')).toMatchObject({
      label: 'watch',
      energy: 12,
      risk: { heat: 5, runInChance: 10, marks: 0 },
    });
    // The suggested way is the best chance (ties in content order).
    const best = launch.ways.reduce((a, w) => (w.preview.chance > a.preview.chance ? w : a), launch.ways[0]!);
    expect(launch.suggested).toBe(best.id);
  });

  it('the risk line: Heat state, the record, a Watched day, the remembered way and a loud way', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'M Risk', level: 6, rank: 3 });
    let v = await cityOf(p, 'coalport');
    let posters = missionAt(v, 'coalport.far-bank', 'coalport.far-bank.posters');
    expect(posters).toMatchObject({ label: 'against', energy: 10, locked: null });
    // The agi way is the type's (15 %); the str way is the loud one (25 %).
    const agi = posters.ways.find((w) => w.id === 'agi')!;
    const str = posters.ways.find((w) => w.id === 'str')!;
    expect(agi.agility).toBe(true);
    expect(str.agility).toBe(false);
    const ticketWay = posters.suggested;
    expect(posters.risk).toEqual({ heat: 6, runInChance: ticketWay === 'agi' ? 15 : 25, marks: 1 });

    // Remember the loud way: the ticket's risk is its, and the quiet way shows its own line.
    await Character.updateOne(
      { _id: p.id },
      { $set: { ways: [{ missionId: 'coalport.far-bank.posters', wayId: 'str' }] } },
    );
    v = await cityOf(p, 'coalport');
    posters = missionAt(v, 'coalport.far-bank', 'coalport.far-bank.posters');
    expect(posters.remembered).toBe('str');
    expect(posters.risk).toEqual({ heat: 6, runInChance: 25, marks: 1 });
    expect(posters.ways.find((w) => w.id === 'str')!.risk).toBeNull();
    expect(posters.ways.find((w) => w.id === 'agi')!.risk).toEqual({ heat: 6, runInChance: 15 });

    // Noticed after the gain (+5), Repeat offender (+5), Watched today here (+10); the record's Iron tag.
    await setRisk(p.id, clock.now(), {
      heat: 40,
      marks: [
        { day: DAY - 3, kind: 'minor' },
        { day: DAY - 2, kind: 'minor' },
        { day: DAY - 1, kind: 'minor' },
      ],
      flags: [{ cityId: 'coalport', day: DAY, flag: 'watched' }],
    });
    v = await cityOf(p, 'coalport');
    posters = missionAt(v, 'coalport.far-bank', 'coalport.far-bank.posters');
    expect(posters.risk).toEqual({ heat: 6, runInChance: 25 + 5 + 5 + 10, marks: 1 });
    expect(posters.placeTags).toContainEqual({ kind: 'record', ironPct: -20 });
    // A Watched day in another city changes nothing here.
    await setRisk(p.id, clock.now(), { flags: [{ cityId: 'duskwall', day: DAY, flag: 'watched' }] });
    v = await cityOf(p, 'coalport');
    expect(missionAt(v, 'coalport.far-bank', 'coalport.far-bank.posters').risk.runInChance).toBe(35);
    // Tier-1 tickets carry no record tag (the penalty is on missions only).
    expect(checked(v).some((a) => a.placeTags?.some((t) => t.kind === 'record'))).toBe(false);
  });

  it("the preview rows are exactly resolveMission's check (the shared missionCtx)", async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'M Same', factionId: 'vanguard', level: 10, rank: 3, cityId: 'coalport' });
    const v = await cityOf(p, 'coalport');
    const spike = missionAt(v, 'coalport.union-hall', 'coalport.union-hall.spike');
    // Rival ground: the +4 as a named row; Heat ×2; run-in ×2.
    expect(spike.ways[0]!.preview.bonuses).toContainEqual({ id: 'rivalGround', label: 'Rival ground', value: -16 });
    expect(spike.risk).toEqual({ heat: 24, runInChance: 50, marks: 3 });
    expect(spike.energy).toBe(20);

    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    const docs = {
      city: await City.findById('coalport').lean<CityDoc>(),
      district: null as DistrictDoc | null,
      residence: await City.findById('duskwall').lean<CityDoc>(),
    };
    const ctx = missionCtx(content, c, 'coalport.union-hall.spike', docs, clock.now())!;
    expect(ctx).toMatchObject({ target: 'collective', offered: true, gate: null, energy: 20, record: 'clean' });
    expect(ctx.rivalGround).toMatchObject({ homeFactionId: 'collective', pressureLeft: 2 });
    for (const w of spike.ways) {
      const way = wayOf(ctx, w.id)!;
      expect(wayPreview(ctx, way)).toEqual(w.preview);
      const r = resolveMission(missionInput(content, ctx, c, way, docs, clock.now()), createRng('t12'));
      if (!r.ok) throw new Error('not enough energy');
      expect(r.start.attempt.check).toEqual(w.preview);
      expect(r.start.heat.after - r.start.heat.before).toBe(24);
    }
  });
});

describe("the record's lock (design §7.3, §23.1 #18)", () => {
  const notorious = Array.from({ length: 6 }, (_, i) => ({ day: DAY - 1 - (i % 2), kind: 'serious' as const }));

  it('Notorious: every ticket at a court reads RECORD; Clean: none', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'R Court', level: 6, cityId: 'irongate' });
    let v = await cityOf(p, 'irongate');
    const court = () => place(v, 'irongate.supreme-court');
    expect(court().actions.some((a) => a.locked?.reason === 'RECORD')).toBe(false);
    await setRisk(p.id, clock.now(), { marks: notorious });
    v = await cityOf(p, 'irongate');
    expect(court().actions.length).toBeGreaterThan(0);
    expect(court().actions.every((a) => a.locked?.reason === 'RECORD' && a.locked.need === 0)).toBe(true);
    // Elsewhere nothing is barred.
    expect(place(v, 'irongate.forecourt').actions.some((a) => a.locked?.reason === 'RECORD')).toBe(false);
  });

  it("Notorious bars the Alliance's own members from their HQ, and every player from a university", async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'R Hall', factionId: 'alliance', level: 6 });
    await setRisk(p.id, clock.now(), { marks: notorious });
    const v = await cityOf(p, 'ashford');
    for (const id of ['ashford.assembly-rooms', 'ashford.university', 'ashford.courts']) {
      const l = place(v, id);
      expect(l.actions.every((a) => a.locked?.reason === 'RECORD')).toBe(true);
    }
    expect(place(v, 'ashford.weavers-row').actions.some((a) => a.locked?.reason === 'RECORD')).toBe(false);
  });
});

describe('city.get on rival ground (design §11.2, screens §8.3)', () => {
  it('the plate, the residence card, ×1 only, the rival tag and no orders', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'G Visitor', factionId: 'vanguard', level: 10, rank: 3, cityId: 'coalport' });
    const v = await cityOf(p, 'coalport');
    expect(v.rivalGround).toEqual({
      homeFactionId: 'collective',
      unrest: false,
      pressure: { lost: 0, cap: 2, left: 2 },
    });
    expect(v.residence).toMatchObject({ state: 'rivalGround', button: null, sheet: null });
    const tickets = checked(v);
    expect(tickets.length).toBeGreaterThan(0);
    for (const a of tickets) {
      expect(a.energy3).toBeNull();
      expect(a.placeTags).toContainEqual({ kind: 'rivalGround', fxpPct: 50 });
      expect(a.order).toBeNull();
      expect(a.placeTags?.some((t) => t.kind === 'pressureCapped')).toBe(false);
    }
    const open = tickets.find((a) => !a.locked)!;
    expect(open.preview!.bonuses).toContainEqual({ id: 'rivalGround', label: 'Rival ground', value: -16 });
    // At home the same member has no plate and ×3.
    const home = await member(clock, { name: 'G Home', factionId: 'vanguard', level: 10, rank: 3 });
    const hv = await cityOf(home, 'duskwall');
    expect(hv.rivalGround).toBeNull();
    expect(hv.residence?.state).not.toBe('rivalGround');
    expect(checked(hv).every((a) => a.energy3 === a.energy * 3)).toBe(true);
    expect(checked(hv).some((a) => a.placeTags?.some((t) => t.kind === 'rivalGround'))).toBe(false);
  });

  it('the pressure: points lost today, the cap reached, and Unrest', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'G Cap', factionId: 'alliance', level: 10, rank: 3, cityId: 'coalport' });
    await City.updateOne(
      { _id: 'coalport' },
      { $set: { rivalPressure: { day: DAY, lost: 1_300, prev: null } } },
    );
    let v = await cityOf(p, 'coalport');
    expect(v.rivalGround!.pressure).toEqual({ lost: 1.3, cap: 2, left: 0.7 });

    // Yesterday's pressure does not count today.
    await City.updateOne({ _id: 'coalport' }, { $set: { rivalPressure: { day: DAY - 1, lost: 2_000, prev: null } } });
    v = await cityOf(p, 'coalport');
    expect(v.rivalGround!.pressure).toEqual({ lost: 0, cap: 2, left: 2 });

    await City.updateOne({ _id: 'coalport' }, { $set: { rivalPressure: { day: DAY, lost: 2_000, prev: null } } });
    v = await cityOf(p, 'coalport');
    expect(v.rivalGround!.pressure).toEqual({ lost: 2, cap: 2, left: 0 });
    const capped = (a: ActionView) => a.placeTags?.some((t) => t.kind === 'pressureCapped') ?? false;
    const opinionTypes = new Set(['canvass', 'speech', 'propaganda']);
    for (const a of checked(v)) expect(capped(a)).toBe(opinionTypes.has(a.type));
    // A mission against the home faction is capped; one against another party is not.
    const spike = missionAt(v, 'coalport.union-hall', 'coalport.union-hall.spike');
    expect(spike.placeTags).toContainEqual({ kind: 'pressureCapped' });
    const posters = missionAt(v, 'coalport.far-bank', 'coalport.far-bank.posters');
    expect(posters.targetFactionId).toBe('vanguard');
    expect(posters.placeTags.some((t) => t.kind === 'pressureCapped')).toBe(false);
    // A speech mission draws from the home faction on rival ground: capped too.
    expect(missionAt(v, 'coalport.shipyard', 'coalport.shipyard.launch').placeTags).toContainEqual({
      kind: 'pressureCapped',
    });

    // Unrest: +75 % Party XP.
    const doc = (await City.findById('coalport').lean<CityDoc>())!;
    await City.updateOne(
      { _id: 'coalport' },
      { $set: { opinion: { ...doc.opinion!, collective: 50, neutral: doc.opinion!.neutral + doc.opinion!.collective - 50 } } },
    );
    v = await cityOf(p, 'coalport');
    expect(v.rivalGround!.unrest).toBe(true);
    expect(checked(v)[0]!.placeTags).toContainEqual({ kind: 'rivalGround', fxpPct: 75 });
    await City.updateOne({ _id: 'coalport' }, { $set: { opinion: doc.opinion, rivalPressure: null } });
  });
});
