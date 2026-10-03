/**
 * Slice 4, T18 (tech design §8.5, §11, §15 "settlement"; ADR 0028, 0030 §6): the wage from the
 * job's city, awards credited once at the next settlement (a three-day absence), the capital's
 * orders with their Issue, the Herald for a resident, the Issues section, the scoreboard on the Me
 * tab, and the hero's title.
 */
import { randomUUID } from 'node:crypto';
import { Award, Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { noOrdinance, setupDb, teardownDb, testClock } from './helpers';
import { at, setIssueEffect, setLiveIssues, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const key = () => randomUUID();

beforeAll(async () => {
  await setupDb('slice4-settlement-test');
  await noOrdinance('coalport');
});
afterAll(teardownDb);

describe('the settlement v4 (tech design §8.5)', () => {
  it("the wage takes the job's city's effects: a Coalport resident with an Irongate job under the Ministry Cuts", async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Ada Kern', cityId: 'irongate' });
    await Character.updateOne(
      { _id: p.id },
      { $set: { job: { id: 'irongate-porter', since: DAY - 3, seniority: 0 } } },
    );
    await setIssueEffect('irongate', 'issue.ministry-cuts', DAY - 1, DAY + 6);
    clock.set(at(DAY + 1));
    const paper = await p.caller.paper.today();
    expect(paper.desk.salary).toMatchObject({ jobName: 'Porter', perDay: 180, days: 1 });
    expect(paper.desk.salary!.ordinance).toEqual({ label: 'The Ministry Cuts', amount: 18 });
  });

  it('a three-day absence: the hero and Issue awards wait and are credited once, on the desk', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Bela Vos', pc: 5 });
    const id = new Types.ObjectId(p.id);
    await Award.create([
      {
        characterId: id,
        kind: 'hero',
        cityId: 'coalport',
        placeId: 'coalport',
        ref: 'coalport:4145',
        pc: 25,
        title: { label: 'City Hero, Coalport', fromDay: DAY + 1, untilDay: DAY + 6 },
        amount: 800,
        bracket: 1,
        day: DAY + 1,
        creditedAt: null,
      },
      {
        characterId: id,
        kind: 'issue',
        cityId: 'coalport',
        placeId: 'coalport',
        ref: `coalport:20731:issue.mill-strike`,
        pc: 4,
        title: null,
        amount: 20,
        bracket: null,
        day: DAY + 2,
        creditedAt: null,
      },
    ]);
    clock.set(at(DAY + 3));
    const paper = await p.caller.paper.today();
    expect(paper.desk.awards).toEqual([
      { kind: 'hero', label: 'City Hero, Coalport', pc: 25 },
      { kind: 'issue', label: 'Your work on the mill strike', pc: 4 },
    ]);
    const me = await p.caller.character.me();
    expect(me.pc).toBe(5 + 29);
    expect(me.hero).toEqual({ title: 'City Hero, Coalport', untilDay: DAY + 6 });
    expect(me.heroes).toEqual([{ placeName: 'Coalport', n: 1 }]);
    expect(await Award.countDocuments({ characterId: id, creditedAt: null })).toBe(0);
    // Credited once: the next morning pays nothing more.
    clock.set(at(DAY + 4));
    expect((await p.caller.character.me()).pc).toBe(5 + 29);
    expect((await p.caller.paper.today()).desk.awards).toBeNull();
  });
});

describe('the paper v4 (tech design §11)', () => {
  it("a capital resident: the Herald, the district's Issues first, the capital's orders with {issue}, the scoreboard", async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, {
      name: 'Cora Lind',
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: 'irongate.station-market' },
    });
    await setLiveIssues('irongate', ['issue.tram-fares', 'issue.press-raids'], DAY);
    // A canvass in Station & Market today puts the player on the scoreboard.
    await p.caller.action.perform({
      actionId: 'irongate.central-station.arrivals',
      locationId: 'irongate.central-station',
      idempotencyKey: key(),
      times: 1,
    });
    const me = await p.caller.character.me();
    expect(me.scoreboard).toEqual([
      expect.objectContaining({
        placeId: 'irongate.station-market',
        placeName: 'Station & Market',
        rank: 1,
        of: 1,
      }),
    ]);
    clock.set(at(DAY + 1));
    const paper = await p.caller.paper.today();
    expect(paper.paper.name).toBe('The Irongate Herald');
    expect(paper.issues!.rows.map((r) => r.cityId)).toEqual(['irongate', 'irongate']);
    expect(paper.issues!.more.length).toBeGreaterThan(0);
    expect(paper.issues!.settlesAt).toBe(at(20738, 0));
    expect(paper.issues!.newThisWeek).toBe(false);
    // The stored lines name the faction (the Herald's {faction}); the resident's close race is news.
    expect(paper.headlines.map((h) => h.headline)).toEqual([
      'The Train Is Open to Cora Lind',
      'Collective Activist Rises to Level 10',
      'Station & Market Is a Close Race Today',
    ]);
    const orders = paper.orders.items;
    expect(orders.some((o) => o.id.includes('capital-'))).toBe(true);
    const issueOrder = orders.find((o) => o.id.endsWith('capital-issue'));
    if (issueOrder) expect(issueOrder.line).toContain('the tram fares');
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect(c.residence?.districtId).toBe('irongate.station-market');
  });
});
