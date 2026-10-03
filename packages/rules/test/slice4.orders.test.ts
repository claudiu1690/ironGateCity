/** Slice 4, T6 (tech design §6.10, design §10): orders by residence and the new match fields. */
import { describe, expect, it } from 'vitest';
import { cityDayIndex, orderMatches, ordersForDay, startOrders } from '../src';
import type { ActionDescriptor, OrderTemplate } from '../src';
import { TEMPLATES } from './helpers';

const cap = (id: string, slot: 'A' | 'B', match: OrderTemplate['match'], target: number): OrderTemplate => ({
  id,
  factionId: 'collective',
  slot,
  title: id,
  line: `${id}.`,
  match,
  target,
  counts: 'attempts',
  residence: 'capital',
});

const CAPITAL = [
  cap('dir.c.capital-canvass', 'A', { actionTypes: ['canvass'], cityId: 'irongate' }, 3),
  cap('dir.c.capital-district', 'A', { actionTypes: ['canvass'], districtId: 'home' }, 2),
  cap('dir.c.capital-issue', 'B', { issueTagged: true, cityId: 'irongate' }, 2),
  cap('dir.c.capital-report', 'B', { actionIds: ['irongate.union-house.committee'] }, 1),
];
// Slice C shared: the home set's C templates serve both (`any`).
const ALL = [...TEMPLATES.map((t) => (t.slot === 'C' ? { ...t, residence: 'any' as const } : t)), ...CAPITAL];

describe('the capital rotation (design §10)', () => {
  it('a capital resident: A[i mod 2], B[i mod 2], slot C shared, never the same pair two days running', () => {
    let prev = '';
    for (let day = 20_730; day < 20_740; day++) {
      const ids = ordersForDay(ALL, day, 'capital').map((t) => t.id);
      const i = cityDayIndex(day) % 2;
      expect(ids.slice(0, 2)).toEqual([CAPITAL[i]!.id, CAPITAL[2 + i]!.id]);
      expect(ALL.find((t) => t.id === ids[2])?.slot).toBe('C');
      const pair = ids.slice(0, 2).join();
      expect(pair).not.toBe(prev);
      prev = pair;
    }
  });

  it('home residents are unchanged by the capital templates', () => {
    for (let day = 20_730; day < 20_745; day++) {
      expect(ordersForDay(ALL, day, 'home').map((t) => t.id)).toEqual(
        ordersForDay(TEMPLATES, day).map((t) => t.id),
      );
    }
  });

  it('the crisis pair only at home', () => {
    const crisis = [
      {
        ...cap('dir.c.restore-a', 'A', { actionTypes: ['canvass'], cityId: 'coalport' }, 3),
        residence: 'home' as const,
        use: 'crisis' as const,
      },
      {
        ...cap('dir.c.restore-b', 'B', { actionTypes: ['speech'], cityId: 'coalport' }, 1),
        residence: 'home' as const,
        use: 'crisis' as const,
      },
    ];
    const templates = [...ALL, ...crisis];
    const pair = ['dir.c.restore-a', 'dir.c.restore-b'] as const;
    expect(
      startOrders(templates, 20_731, false, undefined, pair)
        .items.map((x) => x.templateId)
        .slice(0, 2),
    ).toEqual([...pair]);
    expect(
      startOrders(templates, 20_731, false, undefined, pair, 0, 'capital')
        .items.map((x) => x.templateId)
        .slice(0, 2),
    ).toEqual(
      ordersForDay(ALL, 20_731, 'capital')
        .slice(0, 2)
        .map((t) => t.id),
    );
  });
});

describe('the match fields (ADR 0026)', () => {
  const canvass = (over: Partial<ActionDescriptor> = {}): ActionDescriptor => ({
    kind: 'checked',
    type: 'canvass',
    cityId: 'irongate',
    locationId: 'irongate.foundry-row',
    districtId: 'irongate.eastside',
    locationKind: 'street',
    ...over,
  });
  const resident = { cityId: 'irongate', districtId: 'irongate.eastside' };

  it("cityId 'home' is the residence city; a string context is a home city with no district", () => {
    expect(orderMatches({ cityId: 'home' }, canvass(), resident)).toBe(true);
    expect(orderMatches({ cityId: 'home' }, canvass(), 'coalport')).toBe(false);
    expect(orderMatches({ cityId: 'home' }, canvass({ cityId: 'coalport' }), 'coalport')).toBe(true);
  });

  it("districtId 'home' is the residence district (never without one)", () => {
    expect(orderMatches({ districtId: 'home' }, canvass(), resident)).toBe(true);
    expect(orderMatches({ districtId: 'home' }, canvass({ districtId: 'irongate.old-town' }), resident)).toBe(
      false,
    );
    expect(orderMatches({ districtId: 'home' }, canvass(), 'irongate')).toBe(false);
    expect(orderMatches({ districtId: 'irongate.eastside' }, canvass(), 'coalport')).toBe(true);
  });

  it('issueTagged and locationKinds', () => {
    expect(orderMatches({ issueTagged: true }, canvass(), resident)).toBe(false);
    expect(orderMatches({ issueTagged: true }, canvass({ issueIds: ['issue.evictions'] }), resident)).toBe(
      true,
    );
    expect(orderMatches({ locationKinds: ['street'] }, canvass(), resident)).toBe(true);
    expect(orderMatches({ locationKinds: ['market'] }, canvass(), resident)).toBe(false);
  });
});
