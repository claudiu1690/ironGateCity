/**
 * QA slice 4: Issues of the Week, the ledger and the capital's orders (GDD §14.5–§14.6, design §9–§11,
 * ADR 0028–0029). What the developer's tests leave open: a ×3 tagged canvass adds each row's points,
 * the ledger adds up to the meter, six contributors and only the top five paid, a tie on points decided
 * by the district's share, and a capital resident's orders (where they point, what they say).
 */
import { randomUUID } from 'node:crypto';
import { Award, City, District, InfluenceLedger, IssueModel, Contribution, contributionId } from '@irongate/db';
import type { CityDoc, IssueDoc } from '@irongate/db';
import { ordersForDay } from '@irongate/rules';
import type { FactionId, OpinionShares } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleCityDay } from '../src/services/cityDay';
import { resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, content, setDistrict, setLiveIssues, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026 (week 20731)
const MONDAY = 20738; // Mon 12 Oct: week 20731 resolves
const key = () => randomUUID();
const SM = 'irongate.station-market';
const ARRIVALS = { actionId: 'irongate.central-station.arrivals', locationId: 'irongate.central-station' };
const EVEN = { vanguard: 20, collective: 20, alliance: 20, neutral: 40 };

beforeAll(async () => {
  await setupDb('qa-slice4-issues');
});
afterAll(teardownDb);

describe('momentum (GDD §14.6 rule 3: Energy on Success, half on Partial, each row of a ×3)', () => {
  it('a ×3 tagged canvass adds each row’s points; the Issue, the contribution and the result agree', async () => {
    const clock = testClock(at(DAY));
    await settleCityDay(content, 'irongate', clock.now());
    const p = await traveller(clock, { cityId: 'irongate', name: 'Gert Imhof' });
    const [fares] = await setLiveIssues('irongate', ['issue.tram-fares', 'issue.press-raids'], DAY);
    const arrivals = content.action(ARRIVALS.actionId)!.action;
    const energy = 'energy' in arrivals ? arrivals.energy : 0;
    expect(energy).toBeGreaterThan(0);
    const r = await p.caller.action.perform({ ...ARRIVALS, idempotencyKey: key(), times: 3 });
    const expected = r.attempts.reduce(
      (s, a) => s + (a.outcome === 'success' ? energy : a.outcome === 'partial' ? Math.ceil(energy / 2) : 0),
      0,
    );
    expect(r.effects.issues![0]!.added).toBe(expected);
    expect((await IssueModel.findById(fares).lean<IssueDoc>())!.momentum.collective).toBe(expected);
    expect((await Contribution.findById(contributionId(`points|${fares}`, p.id)).lean())!.amount).toBe(expected);
  });
});

describe('the ledger adds up (GDD §14.5: every opinion change is a row)', () => {
  it('in Station & Market, after actions of three parties, a card and three nights of drift: the rows equal the meter', async () => {
    const clock = testClock(at(DAY));
    await settleCityDay(content, 'irongate', clock.now());
    await setDistrict(SM, EVEN, { battleground: true }, DAY);
    const before = (await District.findById(SM).lean())!.opinion as OpinionShares;
    await InfluenceLedger.deleteMany({ placeId: SM });
    const players = await Promise.all(
      (['vanguard', 'collective', 'alliance'] as FactionId[]).map((f, i) =>
        traveller(clock, { cityId: 'irongate', factionId: f, name: `Ledger ${i}` }),
      ),
    );
    for (const p of players) await p.caller.action.perform({ ...ARRIVALS, idempotencyKey: key(), times: 3 });
    const rider = await traveller(clock, { name: 'Ledger Rider' });
    const b = await rider.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    await rider.caller.travel.choose({ journeyId: b.journey.id, choiceId: 'talk', idempotencyKey: key() });
    clock.set(at(DAY + 3));
    await settleCityDay(content, 'irongate', clock.now());
    const after = (await District.findById(SM).lean())!.opinion as OpinionShares;
    const rows = await InfluenceLedger.find({ placeId: SM }).lean();
    for (const f of ['vanguard', 'collective', 'alliance'] as FactionId[]) {
      const sum = rows.filter((r) => r.factionId === f).reduce((s, r) => s + r.swing, 0);
      expect(sum, f).toBe(Math.round((after[f] - before[f]) * 1000));
    }
    expect(rows.filter((r) => r.kind === 'drift').length).toBeGreaterThan(0);
    expect(rows.filter((r) => r.kind === 'journey')).toHaveLength(1);
  });
});

describe('the resolution (GDD §14.6 rule 4)', () => {
  async function weekWith(pointsByFaction: Partial<Record<FactionId, number[]>>, shares?: OpinionShares) {
    await resetCity('irongate');
    const clock = testClock(at(DAY));
    await settleCityDay(content, 'irongate', clock.now());
    // The contributors first (a new character keeps the capital near its own clock, test helper).
    const people: Array<{ f: FactionId; pts: number; id: string }> = [];
    let n = 0;
    for (const [f, list] of Object.entries(pointsByFaction) as Array<[FactionId, number[]]>) {
      for (const pts of list) {
        const p = await traveller(clock, { factionId: f, name: `Pts ${n++}`, cityId: 'irongate' });
        people.push({ f, pts, id: p.id });
      }
    }
    const [fares] = await setLiveIssues('irongate', ['issue.tram-fares', 'issue.press-raids'], DAY);
    if (shares) await setDistrict(SM, shares, { battleground: true }, DAY);
    n = 0;
    for (const { f, pts, id } of people) {
      {
        n++;
        const p = { id };
        await Contribution.updateOne(
          { _id: contributionId(`points|${fares}`, p.id) },
          {
            $set: { amount: pts, lastAt: new Date(at(DAY) + n), level: 10, name: `Pts ${n}` },
            $setOnInsert: {
              scope: `points|${fares}`,
              kind: 'points',
              cityId: 'irongate',
              placeId: SM,
              ref: fares,
              characterId: p.id,
              factionId: f,
            },
          },
          { upsert: true },
        );
        await IssueModel.updateOne({ _id: fares }, { $inc: { [`momentum.${f}`]: pts } });
      }
    }
    clock.set(at(MONDAY));
    await settleCityDay(content, 'irongate', clock.now());
    return { fares: fares!, doc: (await IssueModel.findById(fares).lean<IssueDoc>())! };
  }

  it('six contributors for the owner: the top five get 4 Political Capital each, the sixth nothing', async () => {
    const { fares, doc } = await weekWith({ collective: [12, 10, 9, 8, 6, 2], vanguard: [20] });
    expect(doc.status).toBe('owned');
    expect(doc.result!.ownerId).toBe('collective');
    const awards = await Award.find({ kind: 'issue', ref: fares }).lean();
    expect(awards.map((a) => a.amount).sort((x, y) => (y ?? 0) - (x ?? 0))).toEqual([12, 10, 9, 8, 6]);
    expect(awards.every((a) => a.pc === 4)).toBe(true);
    expect(doc.result!.top).toHaveLength(5);
    // The effect for seven City Days on the city.
    const city = (await City.findById('irongate').lean<CityDoc>())!;
    expect(city.issues!.effects.find((e) => e.docId === fares)).toMatchObject({
      ownerId: 'collective',
      fromDay: MONDAY,
      toDay: MONDAY + 7,
    });
  });

  it('a tie on points goes to the higher share in the Issue’s district', async () => {
    const shares = { vanguard: 24, collective: 20, alliance: 18, neutral: 38 };
    const { doc } = await weekWith({ collective: [10], vanguard: [10] }, shares);
    expect(doc.result).toMatchObject({ ownerId: 'vanguard', by: 'share' });
  });
});

describe("a capital resident's orders (design §10, GDD §13.7)", () => {
  it('fixed (m2): "Speak on this week\'s Issue" has a pin (a place where a tap advances it), like every other order', async () => {
    // Find a day whose capital rotation carries the Issue order in slot B.
    const templates = content.ordersOf('collective');
    let day = DAY;
    // Slice 5: a Level-10 traveller's rotation carries the mission order from Level 6.
    while (!ordersForDay(templates, day, 'capital', 10).some((t) => t.id === 'dir.c.capital-issue')) day++;
    const clock = testClock(at(day - 1));
    const p = await traveller(clock, {
      cityId: 'irongate',
      name: 'Hana Issue',
      residence: { cityId: 'irongate', districtId: SM },
    });
    await setLiveIssues('irongate', ['issue.tram-fares', 'issue.press-raids'], day);
    clock.set(at(day));
    const me = await p.caller.character.me();
    const issue = me.orders.items.find((o) => o.id === 'dir.c.capital-issue');
    expect(issue).toBeDefined();
    // The Tram Fare Hike is tagged at the arrivals hall, Market Square and the Junction.
    expect(issue!.pin).not.toBeNull();
  });

  it('fixed (m1): no order a capital resident gets names the home city (slot C now says "anywhere in {city}")', async () => {
    const templates = content.ordersOf('collective');
    const titles = [DAY, DAY + 1, DAY + 2].flatMap((d) => ordersForDay(templates, d, 'capital')).map((t) => t.title);
    for (const t of titles) expect(t).not.toMatch(/Coalport/);
  });
});
