/** Slice 4, T4 (tech design §6.10): the Issues' draw, tags, points and resolution. */
import { describe, expect, it } from 'vitest';
import { createRng, drawIssues, issueTags, pointsFor, resolveIssue } from '../src';
import type { ActionDescriptor, OpinionShares } from '../src';

const S = (vanguard: number, collective: number, alliance: number, neutral: number): OpinionShares => ({
  vanguard,
  collective,
  alliance,
  neutral,
});

/** Irongate's thirteen (design §9.5): ten of its own and three shared, by district. */
const IRONGATE = [
  ['issue.tram-fares', 'irongate.station-market'],
  ['issue.press-raids', 'irongate.old-town'],
  ['issue.evictions', 'irongate.eastside'],
  ['issue.ministry-cuts', 'irongate.government-quarter'],
  ['issue.hill-curfew', 'irongate.garrison-hill'],
  ['issue.bread-queues', 'irongate.station-market'],
  ['issue.quays-strike', 'irongate.eastside'],
  ['issue.opera-gala', 'irongate.government-quarter'],
  ['issue.fever-st-agnes', 'irongate.old-town'],
  ['issue.census-hill', 'irongate.garrison-hill'],
  ['issue.labour-exchange', 'irongate.station-market'],
  ['issue.price-of-coal', 'irongate.eastside'],
  ['issue.lights-out', 'irongate.old-town'],
].map(([id, districtId]) => ({ id: id!, districtId: districtId! }));

describe('the draw (design §9.1)', () => {
  it('two from two different districts, never last week’s two, over 10,000 seeds', () => {
    const last = ['issue.tram-fares', 'issue.evictions'];
    for (let n = 0; n < 10_000; n++) {
      const d = drawIssues({
        eligible: IRONGATE,
        lastWeek: last,
        distinctDistricts: true,
        rng: createRng(`irongate:${n}`),
      });
      expect(d).toHaveLength(2);
      expect(d.map((x) => x.order)).toEqual([1, 2]);
      expect(d[0]!.districtId).not.toBe(d[1]!.districtId);
      for (const x of d) expect(last).not.toContain(x.id);
    }
  });

  it('a home city draws two of five, not last week’s', () => {
    const home = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id: `issue.${id}`, districtId: null }));
    const seen = new Set<string>();
    for (let n = 0; n < 1_000; n++) {
      const d = drawIssues({
        eligible: home,
        lastWeek: ['issue.a', 'issue.b'],
        distinctDistricts: false,
        rng: createRng(`c:${n}`),
      });
      expect(d).toHaveLength(2);
      expect(d[0]!.id).not.toBe(d[1]!.id);
      d.forEach((x) => seen.add(x.id));
    }
    expect([...seen].sort()).toEqual(['issue.c', 'issue.d', 'issue.e']);
  });

  it('is deterministic per seed', () => {
    const a = drawIssues({
      eligible: IRONGATE,
      lastWeek: [],
      distinctDistricts: true,
      rng: createRng('irongate:20731'),
    });
    const b = drawIssues({
      eligible: IRONGATE,
      lastWeek: [],
      distinctDistricts: true,
      rng: createRng('irongate:20731'),
    });
    expect(a).toEqual(b);
  });
});

describe('tags (design §9.2)', () => {
  const live = [
    {
      docId: 'irongate:20731:issue.tram-fares',
      issueId: 'issue.tram-fares',
      feeds: [
        {
          actionTypes: ['canvass', 'speech', 'propaganda'],
          locationIds: ['irongate.tram-junction', 'irongate.central-station', 'irongate.market-square'],
        },
      ],
    },
    {
      docId: 'irongate:20731:issue.press-raids',
      issueId: 'issue.press-raids',
      feeds: [
        { actionTypes: ['propaganda'], districtId: 'irongate.old-town' },
        { actionTypes: ['canvass', 'speech'], locationIds: ['irongate.herald-house', 'irongate.press-club'] },
      ],
    },
    {
      docId: 'coalport:20731:issue.price-of-coal',
      issueId: 'issue.price-of-coal',
      feeds: [
        { actionTypes: ['canvass'], locationKinds: ['street'] },
        { actionTypes: ['propaganda'], locationKinds: ['market'] },
      ],
    },
  ];
  const a = (over: Partial<ActionDescriptor>): ActionDescriptor => ({ kind: 'checked', ...over });

  it('types and ids; the OR of feeds; districts; kinds', () => {
    const ids = (d: ActionDescriptor) => issueTags(live, d).map((t) => t.issueId);
    expect(
      ids(
        a({ type: 'canvass', locationId: 'irongate.central-station', districtId: 'irongate.station-market' }),
      ),
    ).toEqual(['issue.tram-fares']);
    expect(ids(a({ type: 'intelligence', locationId: 'irongate.central-station' }))).toEqual([]);
    expect(
      ids(a({ type: 'propaganda', locationId: 'irongate.lantern-lane', districtId: 'irongate.old-town' })),
    ).toEqual(['issue.press-raids']);
    expect(
      ids(a({ type: 'speech', locationId: 'irongate.press-club', districtId: 'irongate.old-town' })),
    ).toEqual(['issue.press-raids']);
    expect(
      ids(a({ type: 'propaganda', locationId: 'irongate.ironworks-gate', districtId: 'irongate.eastside' })),
    ).toEqual([]);
    expect(ids(a({ type: 'canvass', locationKind: 'street' }))).toEqual(['issue.price-of-coal']);
    expect(ids(a({ type: 'canvass', locationKind: 'market' }))).toEqual([]);
    expect(ids({ kind: 'training', type: 'training', locationKind: 'street' })).toEqual([]);
  });

  it('points: the content Energy on Success, half up on a Partial', () => {
    expect(pointsFor(10, 'success')).toBe(10);
    expect(pointsFor(10, 'partial')).toBe(5);
    expect(pointsFor(3, 'partial')).toBe(2);
    expect(pointsFor(12, 'success')).toBe(12);
    expect(pointsFor(10, 'failure')).toBe(0);
  });
});

describe('resolution (design §9.4)', () => {
  it('most points owns; a tie goes to the higher share; still tied, nobody; none at all, it lapses', () => {
    expect(resolveIssue({ momentum: { collective: 30, vanguard: 10 }, shares: S(20, 20, 20, 40) })).toEqual({
      ownerId: 'collective',
      by: 'points',
      lapsed: false,
    });
    expect(resolveIssue({ momentum: { collective: 30, vanguard: 30 }, shares: S(21, 20, 20, 39) })).toEqual({
      ownerId: 'vanguard',
      by: 'share',
      lapsed: false,
    });
    expect(resolveIssue({ momentum: { collective: 30, vanguard: 30 }, shares: S(20, 20, 25, 35) })).toEqual({
      ownerId: null,
      by: null,
      lapsed: false,
    });
    expect(resolveIssue({ momentum: {}, shares: S(20, 20, 20, 40) })).toEqual({
      ownerId: null,
      by: null,
      lapsed: true,
    });
    expect(
      resolveIssue({ momentum: { vanguard: 0, collective: 0, alliance: 0 }, shares: S(20, 20, 20, 40) })
        .lapsed,
    ).toBe(true);
  });
});
