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
  h('hl.rank-up', 'personal', 2, [{ kind: 'rankRose' }]),
  h('hl.level-up', 'personal', 3, [{ kind: 'levelRose' }]),
  h('hl.standing', 'personal', 4, [{ kind: 'standingRose' }]),
  h('hl.orders-done', 'personal', 5, [{ kind: 'ordersAllDoneYesterday' }]),
  h('hl.streak-5', 'personal', 6, [{ kind: 'streakHitYesterday', values: [5] }]),
  h('hl.streak-10', 'personal', 6, [{ kind: 'streakHitYesterday', values: [10] }]),
  h('hl.away', 'personal', 7, [{ kind: 'daysSinceLastPaper', min: 2 }]),
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
  levelRose: false,
  standingRose: false,
  ordersAllDoneYesterday: false,
  streakHitYesterday: null,
  daysSinceLastPaper: 1,
  idleYesterday: false,
  homeShare: 70,
  ...over,
});

const ids = (f: PaperFacts, day = DIRECTIVES.epochDay + 3) =>
  selectHeadlines(TEMPLATES, f, day).map((t) => t.id);

describe('selectHeadlines (§3.3)', () => {
  it('2 personal + city', () => {
    expect(ids(facts({ levelRose: true, rankRose: true, standingRose: true }))).toEqual([
      'hl.rank-up',
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
    expect(ids(facts({ streakHitYesterday: 5 }))[0]).toBe('hl.streak-5');
    expect(ids(facts({ streakHitYesterday: 10 }))[0]).toBe('hl.streak-10');
    expect(ids(facts({ streakHitYesterday: 6 }))[0]).toBe('hl.morale-steady');
    expect(ids(facts({ daysSinceLastPaper: 2 }))[0]).toBe('hl.away');
    expect(ids(facts({ daysSinceLastPaper: null }))[0]).toBe('hl.morale-steady');
    expect(ids(facts({ idleYesterday: true }))[0]).toBe('hl.idle');
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
