/**
 * Review 4, T21 (docs/tech/review-4.md §5.2, ADR 0074; answers §23, §29.1, §23.1 Q12): local
 * editions. `ambientFor` is the settlement's rotation; `composeHeadlines` is today's merge at home
 * and, away, personal (≤ 2) → the local line → the residence's city lines → the local ambient,
 * capped at three; `selectLocalLine` picks the one neutral local line.
 */
import { describe, expect, it } from 'vitest';
import {
  DIRECTIVES,
  PAPER,
  ambientFor,
  composeHeadlines,
  mergeHeadlines,
  selectHeadlines,
  selectLocalLine,
} from '../src';
import type { HeadlineTemplate, LiveHeadline, LocalFacts, PaperFacts } from '../src';

const H = (templateId: string, group: LiveHeadline['group'], priority: number): LiveHeadline => ({
  templateId,
  group,
  priority,
  headline: templateId,
});
const ids = (hs: readonly LiveHeadline[]) => hs.map((h) => h.templateId);

/** The merge fixtures of political-headlines.test.ts, and a few more. */
const FIXTURES: Array<{ stored: LiveHeadline[]; live: LiveHeadline[]; storedFirst?: boolean }> = [
  {
    stored: [H('rank-rose', 'personal', 2), H('morale', 'city', 1), H('ambient', 'ambient', 0)],
    live: [H('seat-ended', 'personal', 2), H('voted-won', 'personal', 2), H('count', 'city', 0)],
  },
  { stored: [H('rank-rose', 'personal', 2), H('morale', 'city', 1), H('ambient', 'ambient', 0)], live: [H('count', 'city', 0)] },
  { stored: [H('ambient', 'ambient', 0)], live: [H('nominations', 'city', 0)] },
  { stored: [H('rank-rose', 'personal', 1)], live: [H('seat-top', 'personal', 0)] },
  {
    stored: [H('welcome', 'personal', 1), H('arrival', 'city', 0), H('morale', 'city', 1)],
    live: [H('polls-open', 'city', 0)],
    storedFirst: true,
  },
  { stored: [], live: [] },
  { stored: [H('a', 'personal', 0), H('b', 'personal', 1), H('c', 'personal', 2), H('amb', 'ambient', 0)], live: [] },
];

describe('composeHeadlines at home', () => {
  it('equals mergeHeadlines on every fixture', () => {
    for (const f of FIXTURES) {
      const opts = f.storedFirst ? { storedFirst: true } : {};
      expect(composeHeadlines({ stored: f.stored, residenceLive: f.live, local: null, ...opts })).toEqual(
        mergeHeadlines(f.stored, f.live, opts),
      );
    }
  });

  it('the welcome edition is never composed away (a new character is at home)', () => {
    const f = FIXTURES[4]!;
    const local = { ambient: H('local-amb', 'ambient', 0), line: H('local', 'city', 0) };
    expect(composeHeadlines({ stored: f.stored, residenceLive: f.live, local, storedFirst: true })).toEqual(
      mergeHeadlines(f.stored, f.live, { storedFirst: true }),
    );
  });
});

describe('composeHeadlines away (§23.1 Q12)', () => {
  const local = { ambient: H('local-amb', 'ambient', 0), line: H('local', 'city', 0) };
  const cityLines = [H('morale', 'city', 1)];
  const storedAmbient = H('home-amb', 'ambient', 0);

  it('no personal line: the local line, the residence’s city line, the local ambient; the stored ambient dropped', () => {
    const out = composeHeadlines({ stored: [...cityLines, storedAmbient], residenceLive: [], local });
    expect(ids(out)).toEqual(['local', 'morale', 'local-amb']);
  });

  it('one personal line: it first, then the local line, then the residence’s city line', () => {
    const out = composeHeadlines({
      stored: [H('rank-rose', 'personal', 2), ...cityLines, storedAmbient],
      residenceLive: [H('count', 'city', 0)],
      local,
    });
    expect(ids(out)).toEqual(['rank-rose', 'local', 'count']);
  });

  it('two personal lines (stored and live, by priority, live first on a tie): then the local line', () => {
    const out = composeHeadlines({
      stored: [H('rank-rose', 'personal', 2), ...cityLines],
      residenceLive: [H('seat-ended', 'personal', 2)],
      local,
    });
    expect(ids(out)).toEqual(['seat-ended', 'rank-rose', 'local']);
  });

  it('three personal lines: two printed (PAPER.personalMax), the local line third', () => {
    const out = composeHeadlines({
      stored: [H('a', 'personal', 0), H('b', 'personal', 1), H('c', 'personal', 2)],
      residenceLive: [],
      local,
    });
    expect(PAPER.personalMax).toBe(2);
    expect(ids(out)).toEqual(['a', 'b', 'local']);
  });

  it('no local line that day: the residence’s city lines, then the local ambient', () => {
    const out = composeHeadlines({
      stored: [...cityLines, storedAmbient],
      residenceLive: [H('count', 'city', 0)],
      local: { ambient: local.ambient, line: null },
    });
    expect(ids(out)).toEqual(['count', 'morale', 'local-amb']);
    expect(
      ids(composeHeadlines({ stored: [storedAmbient], residenceLive: [], local: { ambient: null, line: null } })),
    ).toEqual([]);
  });

  it('never more than three', () => {
    const out = composeHeadlines({
      stored: [H('a', 'personal', 0), H('m1', 'city', 1), H('m2', 'city', 2), storedAmbient],
      residenceLive: [H('c0', 'city', 0)],
      local,
    });
    expect(out).toHaveLength(PAPER.headlines);
    expect(ids(out)).toEqual(['a', 'local', 'c0']);
  });
});

describe('ambientFor', () => {
  const T = (id: string, group: HeadlineTemplate['group']): HeadlineTemplate => ({
    id,
    cityId: 'x',
    group,
    priority: 0,
    when: [],
    headline: id,
  });
  const templates = [T('p', 'personal'), T('amb-1', 'ambient'), T('c', 'city'), T('amb-2', 'ambient'), T('amb-3', 'ambient')];

  it('is the ambient line selectHeadlines prints on the same day', () => {
    const facts: PaperFacts = {
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
    const ambientOnly = templates.filter((t) => t.group === 'ambient');
    for (let d = DIRECTIVES.epochDay; d < DIRECTIVES.epochDay + 9; d++) {
      expect(ambientFor(templates, d)?.id).toBe(selectHeadlines(ambientOnly, facts, d)[0]!.id);
    }
    expect(new Set([0, 1, 2].map((k) => ambientFor(templates, DIRECTIVES.epochDay + k)?.id)).size).toBe(3);
  });

  it('none in the set: null', () => {
    expect(ambientFor([T('p', 'personal')], DIRECTIVES.epochDay)).toBeNull();
  });
});

describe('selectLocalLine (answers §29.1)', () => {
  const L = (id: string, priority: number, when: HeadlineTemplate['when'], headline: string, deck?: string): HeadlineTemplate => ({
    id: `hl.local.${id}`,
    cityId: '*',
    group: 'city',
    priority,
    when,
    headline,
    ...(deck ? { deck } : {}),
  });
  const templates = [
    L('count', 0, [{ kind: 'countToday' }], '{city} Has a New Council', '{playerSeats} went to players, {npcSeats} to local candidates.'),
    L('voting', 1, [{ kind: 'phaseToday', phase: 'polling', cycleDay: 2 }], 'Voting Open in {city}', '{city} elects its council until {until}.'),
    L('candidates', 1, [{ kind: 'phaseToday', phase: 'nominations', cycleDay: 0 }], '{city} Council: Candidates Wanted', 'Names go in until {until}.'),
    L('rule', 2, [{ kind: 'ordinanceFromToday' }], '{ordinance} in Force in {city}', '{plainLine}.'),
    L('rival-pressure', 3, [{ kind: 'moraleLostToRivals', min: 1 }], "Callers from Other Parties on {city}'s Streets"),
    L('morale', 4, [{ kind: 'homeShare', min: 0 }], '{faction} Holds {city} at {share} %'),
  ];
  const facts = (over: Partial<LocalFacts> = {}): LocalFacts => ({
    countToday: false,
    phase: 'polling',
    cycleDay: 3,
    ordinanceFromToday: false,
    moraleLost: 0,
    homeShare: 70,
    vars: { city: 'Duskwall', faction: 'Vanguard', share: '70.0', playerSeats: '3', npcSeats: '4', ordinance: 'Open Doors', plainLine: 'Studying costs a fifth less' },
    until: { nominations: 1_000, polls: 2_000 },
    ...over,
  });

  it('the first that holds by priority, filled; {until} left beside its moment', () => {
    expect(selectLocalLine(templates, facts({ countToday: true, phase: 'nominations', cycleDay: 0 }))).toMatchObject({
      templateId: 'hl.local.count',
      group: 'city',
      headline: 'Duskwall Has a New Council',
      deck: '3 went to players, 4 to local candidates.',
    });
    expect(selectLocalLine(templates, facts({ phase: 'polling', cycleDay: 2 }))).toEqual({
      templateId: 'hl.local.voting',
      group: 'city',
      priority: 1,
      headline: 'Voting Open in Duskwall',
      deck: 'Duskwall elects its council until {until}.',
      until: 2_000,
    });
    expect(selectLocalLine(templates, facts({ phase: 'nominations', cycleDay: 0 }))?.until).toBe(1_000);
    expect(selectLocalLine(templates, facts({ ordinanceFromToday: true }))?.headline).toBe('Open Doors in Force in Duskwall');
    expect(selectLocalLine(templates, facts({ moraleLost: 1.5 }))?.templateId).toBe('hl.local.rival-pressure');
    expect(selectLocalLine(templates, facts())?.headline).toBe('Vanguard Holds Duskwall at 70.0 %');
  });

  it('a city without a home party (the capital, Clearwater): the last two never match', () => {
    expect(selectLocalLine(templates, facts({ moraleLost: null, homeShare: null }))).toBeNull();
    expect(selectLocalLine([], facts())).toBeNull();
  });
});
