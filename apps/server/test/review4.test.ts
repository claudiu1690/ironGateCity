/**
 * Review 4 (docs/review/2026-10-06-review-4.md) #22: the slot-B mission order is only drawn on a day
 * the member has a mission they can start in the residence city, and its pin is the first place
 * with one (it used to have no pin at all, so *Take on a mission anywhere in Ashford* led nowhere).
 */
import { Character } from '@irongate/db';
import { ordersForDay } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startableMissions } from '../src/services/views';
import { setupDb, teardownDb, testClock } from './helpers';
import { at, content, member, rankFloor } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026

/** The first day from DAY whose rotation puts the mission order in slot B for this reader. */
function missionDay(templateId: string, residence: 'home' | 'capital', level: number): number {
  const templates = content.ordersOf(templateId.startsWith('dir.a.') ? 'alliance' : 'collective');
  let day = DAY;
  while (!ordersForDay(templates, day, residence, level).some((t) => t.id === templateId)) day++;
  return day;
}

beforeAll(async () => {
  await setupDb('review4-test');
});
afterAll(async () => {
  await teardownDb();
});

describe('startableMissions (review 4 #22)', () => {
  const doc = (level: number, rank = 1) => ({
    factionId: 'alliance' as const,
    level,
    rank,
    localStanding: [],
    record: { marks: [] },
    held: null,
  });

  it("an Alliance member at Level 6 in Ashford: the Wharf's two open missions, nothing against the Alliance", () => {
    const list = startableMissions(content, doc(6) as never, 'ashford', DAY);
    expect(list.map((m) => m.missionId).sort()).toEqual([
      'ashford.cattle-market.auction',
      'ashford.wharf.watch',
    ]);
    // In pin order, with each place's pin number.
    expect(list[0]).toMatchObject({ locationId: 'ashford.wharf', n: 7 });
  });

  it('below Level 6 nothing, and Rank 3 adds the posters (against the Collective)', () => {
    expect(startableMissions(content, doc(5) as never, 'ashford', DAY)).toEqual([]);
    const ranked = startableMissions(content, doc(6, 3) as never, 'ashford', DAY).map((m) => m.missionId);
    expect(ranked).toContain('ashford.brewery.posters');
    // The Assembly Rooms' jobs are against the Alliance: never offered to its members.
    expect(startableMissions(content, doc(12, 4) as never, 'ashford', DAY).map((m) => m.missionId)).not.toContain(
      'ashford.assembly-rooms.spike',
    );
  });

  it('the capital at Level 6: every mission there wants Level 10, so none', () => {
    expect(startableMissions(content, doc(6) as never, 'irongate', DAY)).toEqual([]);
    expect(startableMissions(content, doc(10) as never, 'irongate', DAY).length).toBeGreaterThan(0);
  });
});

describe('the mission order (review 4 #22)', () => {
  it('drawn with a mission to start, and its pin is the first place with one', async () => {
    const day = missionDay('dir.a.mission', 'home', 6);
    const clock = testClock(at(day - 1));
    const p = await member(clock, { name: 'Ada Wharf', factionId: 'alliance', cityId: 'ashford' });
    clock.set(at(day));
    const paper = await p.caller.paper.today();
    const order = paper.orders.items.find((x) => x.id === 'dir.a.mission')!;
    expect(order.title).toBe('Take on a mission anywhere in Ashford');
    expect(order.pin).toEqual({ locationId: 'ashford.wharf', n: 7 });
    // And the pin's place does list a mission the member can start.
    const city = await p.caller.city.get({ cityId: 'ashford' });
    const place = city.locations.find((l) => l.id === order.pin!.locationId)!;
    expect((place.missions ?? []).some((m) => m.locked === null)).toBe(true);
  });

  it('not drawn on a day the member has no mission to start in the residence city; another order fills slot B', async () => {
    // A capital resident below Level 10 (every capital mission wants Level 10): the rotation would
    // give the mission order today, but there is nothing to start, so slot B draws another.
    const day = missionDay('dir.a.mission', 'capital', 6);
    const clock = testClock(at(day - 1));
    const p = await member(clock, { name: 'Bo Capital', factionId: 'alliance', cityId: 'irongate' });
    await Character.updateOne(
      { _id: p.id },
      {
        $set: {
          level: 6,
          fxp: rankFloor(1),
          residence: {
            cityId: 'irongate',
            districtId: 'irongate.old-town',
            sinceDay: 0,
            votesFromDay: 0,
            standsFromDay: 0,
            canMoveFromDay: 0,
          },
        },
        $inc: { version: 1 },
      },
    );
    clock.set(at(day));
    const paper = await p.caller.paper.today();
    const ids = paper.orders.items.map((x) => x.id);
    expect(ids).not.toContain('dir.a.mission');
    expect(ids).toHaveLength(3);
    expect(paper.orders.items.some((x) => x.title.includes('mission'))).toBe(false);
  });
});
