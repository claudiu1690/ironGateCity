import { describe, expect, it } from 'vitest';
import { isPoliticalTemplate, mergeHeadlines, selectHeadlines, selectPoliticalHeadlines } from '../src';
import type { HeadlineTemplate, LiveHeadline, PaperFacts, PoliticalFacts } from '../src';

const T = (
  id: string,
  group: HeadlineTemplate['group'],
  priority: number,
  when: HeadlineTemplate['when'],
  headline = id,
  deck?: string,
): HeadlineTemplate => ({
  id,
  cityId: 'coalport',
  group,
  priority,
  when,
  headline,
  ...(deck ? { deck } : {}),
});

const TEMPLATES: HeadlineTemplate[] = [
  T(
    'hl.seat-won',
    'personal',
    0,
    [{ kind: 'seatWon', top: false }],
    '{name} Takes a Seat',
    'Elected {ordinal} with {votes}.',
  ),
  T('hl.seat-top', 'personal', 0, [{ kind: 'seatWon', top: true }], '{name} Tops the Poll'),
  T('hl.seat-lost', 'personal', 1, [{ kind: 'seatLost', tie: false }], '{name} Misses by {margin}'),
  T('hl.seat-lost-tie', 'personal', 1, [{ kind: 'seatLost', tie: true }], '{name} Loses on the Tie-Break'),
  T('hl.filed', 'personal', 2, [{ kind: 'filedYesterday' }], '{name} Files', 'By {until}, or off.'),
  T('hl.on-ballot', 'personal', 2, [{ kind: 'nominationsClosed', struck: false }], 'On', 'Until {until}.'),
  T(
    'hl.struck',
    'personal',
    2,
    [{ kind: 'nominationsClosed', struck: true }],
    'Struck',
    'Again on {weekday}.',
  ),
  T('hl.voted-won', 'personal', 2, [{ kind: 'votedFor', won: true }], 'Your Vote: {voted} Wins'),
  T(
    'hl.voted-lost',
    'personal',
    2,
    [{ kind: 'votedFor', won: false, tie: false }],
    'Your Vote: {voted} Short',
  ),
  T('hl.voted-lost-tie', 'personal', 2, [{ kind: 'votedFor', won: false, tie: true }], 'Your Vote: tie'),
  T('hl.moved', 'personal', 2, [{ kind: 'movedYesterday' }], 'Moves', 'Divides at {until}.'),
  T('hl.seat-ended', 'personal', 2, [{ kind: 'termEnded' }], 'Rises'),
  T('hl.council-passed', 'personal', 2, [{ kind: 'divided', passed: true }], 'Passes {ordinance}'),
  T('hl.council-failed', 'personal', 2, [{ kind: 'divided', passed: false }], 'No Motion'),
  T('hl.count', 'city', 0, [{ kind: 'countToday' }], 'Polls Close: {winner}'),
  T('hl.stands-firm', 'city', 0, [{ kind: 'leftUnrest' }], 'Stands Firm'),
  T('hl.ordinance-city', 'city', 0, [{ kind: 'ordinanceFromToday' }], '{ordinance} in Force'),
  T('hl.polls-open', 'city', 0, [{ kind: 'phaseToday', phase: 'polling' }], 'Polls Open', 'Until {until}.'),
  T(
    'hl.nominations',
    'city',
    0,
    [{ kind: 'phaseToday', phase: 'nominations' }],
    'Nominations',
    'Until {until}.',
  ),
];

const facts = (over: Partial<PoliticalFacts> = {}): PoliticalFacts => ({
  seat: null,
  voted: null,
  filedYesterday: false,
  nominationsClosed: null,
  termEnded: false,
  divided: null,
  movedYesterday: false,
  countToday: false,
  phase: 'nominations',
  cycleDay: 0,
  ordinanceFromToday: false,
  leftUnrest: false,
  vars: {
    name: 'Mara Lenk',
    ordinal: 'first',
    votes: '47',
    margin: '3',
    voted: 'Anna Weiss',
    winner: 'Weiss',
    ordinance: 'Open Doors',
    weekday: 'Tuesday',
  },
  until: { nominations: 1000, polls: 2000, divide: 3000 },
  ...over,
});

const ids = (h: Array<{ templateId: string }>) => h.map((x) => x.templateId);

describe('political headlines (ADR 0023)', () => {
  it('each condition holds only on its facts', () => {
    expect(ids(selectPoliticalHeadlines(TEMPLATES, facts()))).toEqual(['hl.nominations']);
    const count = facts({
      countToday: true,
      seat: { won: false, top: false, tie: false },
      voted: { won: true, tie: false },
      termEnded: true,
    });
    expect(ids(selectPoliticalHeadlines(TEMPLATES, count))).toEqual([
      'hl.seat-lost',
      'hl.voted-won',
      'hl.seat-ended',
      'hl.count',
      'hl.nominations',
    ]);
    const polls = facts({
      phase: 'polling',
      cycleDay: 2,
      nominationsClosed: { struck: false },
      divided: { passed: true },
      ordinanceFromToday: true,
      leftUnrest: true,
    });
    expect(ids(selectPoliticalHeadlines(TEMPLATES, polls))).toEqual([
      'hl.on-ballot',
      'hl.council-passed',
      'hl.stands-firm',
      'hl.ordinance-city',
      'hl.polls-open',
    ]);
    expect(
      ids(selectPoliticalHeadlines(TEMPLATES, facts({ nominationsClosed: { struck: true } }))),
    ).toContain('hl.struck');
    expect(ids(selectPoliticalHeadlines(TEMPLATES, facts({ divided: { passed: false } })))).toContain(
      'hl.council-failed',
    );
    expect(ids(selectPoliticalHeadlines(TEMPLATES, facts({ movedYesterday: true })))).toContain('hl.moved');
    expect(
      ids(selectPoliticalHeadlines(TEMPLATES, facts({ seat: { won: false, top: false, tie: true } }))),
    ).toContain('hl.seat-lost-tie');
    expect(ids(selectPoliticalHeadlines(TEMPLATES, facts({ voted: { won: false, tie: false } })))).toContain(
      'hl.voted-lost',
    );
    expect(ids(selectPoliticalHeadlines(TEMPLATES, facts({ voted: { won: false, tie: true } })))).toContain(
      'hl.voted-lost-tie',
    );
  });

  it('seat-top excludes seat-won', () => {
    const top = ids(
      selectPoliticalHeadlines(TEMPLATES, facts({ seat: { won: true, top: true, tie: false } })),
    );
    expect(top).toContain('hl.seat-top');
    expect(top).not.toContain('hl.seat-won');
    const won = ids(
      selectPoliticalHeadlines(TEMPLATES, facts({ seat: { won: true, top: false, tie: false } })),
    );
    expect(won).toContain('hl.seat-won');
    expect(won).not.toContain('hl.seat-top');
  });

  it('filed shows only while nominations are still open (a day-0 filing)', () => {
    expect(ids(selectPoliticalHeadlines(TEMPLATES, facts({ filedYesterday: true })))).toContain('hl.filed');
    expect(
      ids(
        selectPoliticalHeadlines(TEMPLATES, facts({ filedYesterday: true, phase: 'polling', cycleDay: 2 })),
      ),
    ).not.toContain('hl.filed');
  });

  it('placeholders are resolved on the server; {until} stays in the text with its epoch ms', () => {
    const [won] = selectPoliticalHeadlines(TEMPLATES, facts({ seat: { won: true, top: false, tie: false } }));
    expect(won).toMatchObject({ headline: 'Mara Lenk Takes a Seat', deck: 'Elected first with 47.' });
    expect(won!.until).toBeUndefined();
    const filed = selectPoliticalHeadlines(TEMPLATES, facts({ filedYesterday: true })).find(
      (h) => h.templateId === 'hl.filed',
    )!;
    expect(filed).toMatchObject({ deck: 'By {until}, or off.', until: 1000 });
    const moved = selectPoliticalHeadlines(TEMPLATES, facts({ movedYesterday: true })).find(
      (h) => h.templateId === 'hl.moved',
    )!;
    expect(moved.until).toBe(3000);
    const polls = selectPoliticalHeadlines(TEMPLATES, facts({ phase: 'polling', cycleDay: 3 })).at(-1)!;
    expect(polls).toMatchObject({ templateId: 'hl.polls-open', until: 2000 });
  });

  it('the settlement selector never picks a political template', () => {
    const f: PaperFacts = {
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
      energyYesterday: 0,
      homeShare: 70,
    };
    expect(selectHeadlines(TEMPLATES, f, 20727)).toEqual([]);
    expect(TEMPLATES.every(isPoliticalTemplate)).toBe(true);
  });
});

describe('mergeHeadlines', () => {
  const H = (templateId: string, group: LiveHeadline['group'], priority: number): LiveHeadline => ({
    templateId,
    group,
    priority,
    headline: templateId,
  });
  it('keeps two personal at most, three in all, live first on a tie, the ambient only with room', () => {
    const stored = [H('rank-rose', 'personal', 2), H('morale', 'city', 1), H('ambient', 'ambient', 0)];
    const live = [H('seat-ended', 'personal', 2), H('voted-won', 'personal', 2), H('count', 'city', 0)];
    expect(ids(mergeHeadlines(stored, live))).toEqual(['seat-ended', 'voted-won', 'count']);
    expect(ids(mergeHeadlines(stored, [H('count', 'city', 0)]))).toEqual(['rank-rose', 'count', 'morale']);
    expect(ids(mergeHeadlines([H('ambient', 'ambient', 0)], [H('nominations', 'city', 0)]))).toEqual([
      'nominations',
      'ambient',
    ]);
    expect(ids(mergeHeadlines([H('rank-rose', 'personal', 1)], [H('seat-top', 'personal', 0)]))).toEqual([
      'seat-top',
      'rank-rose',
    ]);
    // The welcome edition: stored first on a tie.
    const welcome = [H('welcome', 'personal', 1), H('arrival', 'city', 0), H('morale', 'city', 1)];
    expect(ids(mergeHeadlines(welcome, [H('polls-open', 'city', 0)], { storedFirst: true }))).toEqual([
      'welcome',
      'arrival',
      'polls-open',
    ]);
  });
});
