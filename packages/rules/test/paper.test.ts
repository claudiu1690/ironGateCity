import { describe, expect, it } from 'vitest';
import { DIRECTIVES, fillTemplate, isPaperDue, placeholdersIn, selectHeadlines } from '../src';
import type { HeadlineTemplate, PaperFacts } from '../src';

const h = (
  id: string,
  group: HeadlineTemplate['group'],
  priority: number,
  when: HeadlineTemplate['when'] = [],
): HeadlineTemplate => ({ id, cityId: 'coalport', group, priority, when, headline: id });

const TEMPLATES: HeadlineTemplate[] = [
  h('hl.first-day', 'personal', 1, [{ kind: 'firstEdition' }]),
  h('hl.rank-up-2', 'personal', 2, [{ kind: 'rankRose', values: [2] }]),
  h('hl.rank-up-3', 'personal', 2, [{ kind: 'rankRose', values: [3] }]),
  h('hl.rank-up', 'personal', 2, [{ kind: 'rankRose', min: 4 }]),
  h('hl.level-up', 'personal', 3, [{ kind: 'levelRose' }, { kind: 'energyYesterday', min: 1 }]),
  h('hl.level-up-quiet', 'personal', 3, [{ kind: 'levelRose' }, { kind: 'energyYesterday', max: 0 }]),
  h('hl.standing', 'personal', 4, [{ kind: 'standingRose' }]),
  h('hl.orders-done', 'personal', 5, [{ kind: 'ordersAllDoneYesterday' }]),
  h('hl.seniority-5', 'personal', 6, [{ kind: 'seniorityHitYesterday', values: [5] }]),
  h('hl.seniority-10', 'personal', 6, [{ kind: 'seniorityHitYesterday', values: [10] }]),
  h('hl.away', 'personal', 7, [
    { kind: 'daysSinceLastPaper', min: 2 },
    { kind: 'daysPaid', min: 1 },
  ]),
  h('hl.away-no-job', 'personal', 7, [
    { kind: 'daysSinceLastPaper', min: 2 },
    { kind: 'daysPaid', max: 0 },
  ]),
  h('hl.idle', 'personal', 8, [{ kind: 'idleYesterday' }]),
  h('hl.morale-fired', 'city', 1, [{ kind: 'homeShare', min: 80 }]),
  h('hl.morale-steady', 'city', 1, [{ kind: 'homeShare', min: 60, max: 80 }]),
  h('hl.morale-unrest', 'city', 1, [{ kind: 'homeShare', max: 60 }]),
  h('hl.orders-call', 'city', 2, [{ kind: 'noPersonal' }]),
  ...Array.from({ length: 10 }, (_, i) => h(`hl.ambient-${i}`, 'ambient', 0)),
];

const facts = (over: Partial<PaperFacts> = {}): PaperFacts => ({
  firstEdition: false,
  rankRose: false,
  rank: 1,
  levelRose: false,
  standingRose: false,
  ordersAllDoneYesterday: false,
  seniority: null,
  daysSinceLastPaper: 1,
  idleYesterday: false,
  daysPaid: 0,
  energyYesterday: 30,
  homeShare: 70,
  ...over,
});

const ids = (f: PaperFacts, day = DIRECTIVES.epochDay + 3) =>
  selectHeadlines(TEMPLATES, f, day).map((t) => t.id);

describe('selectHeadlines (§3.3)', () => {
  it('2 personal + city', () => {
    expect(ids(facts({ levelRose: true, rankRose: true, rank: 2, standingRose: true }))).toEqual([
      'hl.rank-up-2',
      'hl.level-up',
      'hl.morale-steady',
    ]);
  });

  it('1 personal + city + ambient (by day)', () => {
    expect(ids(facts({ firstEdition: true }))).toEqual(['hl.first-day', 'hl.morale-steady', 'hl.ambient-3']);
    expect(ids(facts({ firstEdition: true }), DIRECTIVES.epochDay + 14)[2]).toBe('hl.ambient-4');
  });

  it('0 personal: morale + the orders call + ambient', () => {
    expect(ids(facts())).toEqual(['hl.morale-steady', 'hl.orders-call', 'hl.ambient-3']);
  });

  it('evaluates each condition kind', () => {
    expect(ids(facts({ homeShare: 80 }))[0]).toBe('hl.morale-fired');
    expect(ids(facts({ homeShare: 79.999 }))[0]).toBe('hl.morale-steady');
    expect(ids(facts({ homeShare: 59.9 }))[0]).toBe('hl.morale-unrest');
    expect(ids(facts({ ordersAllDoneYesterday: true }))[0]).toBe('hl.orders-done');
    expect(ids(facts({ seniority: { before: 4, after: 5 } }))[0]).toBe('hl.seniority-5');
    expect(ids(facts({ seniority: { before: 4, after: 6 } }))[0]).toBe('hl.seniority-5'); // Long Service
    expect(ids(facts({ seniority: { before: 9, after: 10 } }))[0]).toBe('hl.seniority-10');
    expect(ids(facts({ seniority: { before: 5, after: 6 } }))[0]).toBe('hl.morale-steady');
    expect(ids(facts({ daysSinceLastPaper: 2, daysPaid: 2 }))[0]).toBe('hl.away');
    expect(ids(facts({ daysSinceLastPaper: 2 }))[0]).toBe('hl.away-no-job');
    expect(ids(facts({ daysSinceLastPaper: 1, daysPaid: 1 }))[0]).toBe('hl.morale-steady');
    expect(ids(facts({ daysSinceLastPaper: null }))[0]).toBe('hl.morale-steady');
    expect(ids(facts({ idleYesterday: true }))[0]).toBe('hl.idle');
  });

  it('variants by rank, Energy yesterday and days paid: exactly one of each family matches (content §13)', () => {
    const rose = (rank: number) => ids(facts({ rankRose: true, rank }))[0];
    expect([rose(2), rose(3), rose(4), rose(7)]).toEqual([
      'hl.rank-up-2',
      'hl.rank-up-3',
      'hl.rank-up',
      'hl.rank-up',
    ]);
    expect(ids(facts({ rank: 3 }))[0]).toBe('hl.morale-steady'); // no rise, no headline
    expect(ids(facts({ levelRose: true, energyYesterday: 1 }))[0]).toBe('hl.level-up');
    expect(ids(facts({ levelRose: true, energyYesterday: 0 }))[0]).toBe('hl.level-up-quiet');
    for (const f of [
      facts({ rankRose: true, rank: 2, levelRose: true, energyYesterday: 0 }),
      facts({ daysSinceLastPaper: 5, daysPaid: 0, levelRose: true }),
    ]) {
      const picked = ids(f).filter(
        (id) => id.startsWith('hl.rank') || id.startsWith('hl.level') || id.startsWith('hl.away'),
      );
      expect(new Set(picked.map((id) => id.replace(/-(2|3|quiet|no-job)$/, ''))).size).toBe(picked.length);
    }
  });
});

describe('fillTemplate', () => {
  it('fills known placeholders and leaves missing ones as written', () => {
    expect(fillTemplate('{name} Made {rank} by the Branch', { name: 'Mara Lenk', rank: 'Activist' })).toBe(
      'Mara Lenk Made Activist by the Branch',
    );
    expect(fillTemplate('At {share} % {level}', { share: '70.1' })).toBe('At 70.1 % {level}');
    expect(placeholdersIn('{a} and {bee}')).toEqual(['a', 'bee']);
  });
});

describe('isPaperDue', () => {
  const H = 3_600_000;
  it('is due while unread, and 3 h after the later of read and last action', () => {
    expect(isPaperDue({ editionReadAt: null, lastActionAt: null, now: 0 })).toBe(true);
    expect(isPaperDue({ editionReadAt: 0, lastActionAt: H, now: H + 3 * H - 60_000 })).toBe(false);
    expect(isPaperDue({ editionReadAt: 0, lastActionAt: H, now: H + 3 * H })).toBe(true);
    expect(isPaperDue({ editionReadAt: 2 * H, lastActionAt: null, now: 5 * H })).toBe(true);
  });
});
