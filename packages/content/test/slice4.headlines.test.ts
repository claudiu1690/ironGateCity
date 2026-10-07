/**
 * Slice 4 (T9): the Irongate Herald's headline templates, the home papers' additions and the new UI
 * copy, word for word against docs/design/slice-4-battleground.md (§9.6, §12) and
 * docs/design/slice-4-screens.md (§11 and its help notes). The arrays are imported directly (the
 * load.ts wiring is checked elsewhere).
 */
import {
  CAPITAL_PLACEHOLDERS,
  PLACEHOLDERS,
  POLITICAL_PLACEHOLDERS,
  TIME_TOKENS,
  isPoliticalCondition,
  isPoliticalTemplate,
  placeholdersIn,
} from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import DESIGN from '../../../docs/design/slice-4-battleground.md?raw';
import SCREENS from '../../../docs/design/slice-4-screens.md?raw';
import { HeadlineTemplateSchema } from '../src/schemas';
import { capitalHomeHeadlines } from '../src/data/capitalHomeHeadlines';
import { copy } from '../src/data/copy';
import { headlines as storedHeadlines } from '../src/data/headlines';
import { heraldHeadlines } from '../src/data/heraldHeadlines';
import { politicalHeadlines } from '../src/data/politicalHeadlines';
import { reworded } from './review4';
import { systemTermHits } from './vocabulary';

/**
 * DESIGN INCONSISTENCY, recorded for the lead: §12's `hl.ig.district-line` headline is 86 characters
 * as a template (the schema allows 80), though under 80 once filled. Transcribed as written; it is
 * the one template parsed with the headline bound relaxed, and the test below pins that.
 */
const OVER_LIMIT = new Set(['hl.ig.district-line']);
const RelaxedSchema = HeadlineTemplateSchema.extend({ headline: z.string().min(1).max(90) });
const parseAll = (list: unknown[]) =>
  list.map((h) =>
    OVER_LIMIT.has((h as { id: string }).id) ? RelaxedSchema.parse(h) : HeadlineTemplateSchema.parse(h),
  );
const herald = parseAll(heraldHeadlines);
const home = HeadlineTemplateSchema.array().parse(capitalHomeHeadlines);
const all = [...herald, ...home];
const byId = new Map(all.map((h) => [h.id, h]));
const get = (id: string) => {
  const h = byId.get(id);
  expect(h, id).toBeDefined();
  return h!;
};

const unq = (s: string) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\*/g, '');
/** Slice 3's transcription rule: "{weekday} midnight" is the `{until}` token. */
const toToken = (s: string) => s.replace(/\{weekday\} midnight/g, '{until}');

function section(doc: string, start: string, end: string): string {
  const from = doc.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = doc.indexOf(end, from + 1);
  expect(to, end).toBeGreaterThan(from);
  return doc.slice(from, to);
}
function rows(text: string, row: RegExp): string[][] {
  return text
    .split('\n')
    .filter((l) => row.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
}

const ISSUE_ROWS = rows(section(DESIGN, '### 9.6', '## 10.'), /^\| `hl\.ig\./);
const HERALD_ROWS = rows(section(DESIGN, '## 12. The Herald', '### 12.1'), /^\| `hl\.ig\./);
/** §12.1: the three home papers' tables (Id | Headline | Deck), the Clarion's, the Sentinel's, the Gazette's. */
const HOME_ROWS = rows(section(DESIGN, '### 12.1', '## 13.'), /^\| `hl\.(v\.|a\.)?[a-z-]+` \| /);

/** The slice-1 stored set and the slice-3 political set, as the Herald carries them. */
const STAND_IN_NAMES = [
  'rank-up-2',
  'rank-up-3',
  'rank-up',
  'level-up',
  'level-up-quiet',
  'standing',
  'orders-done',
  'seniority-5',
  'seniority-10',
  'away',
  'away-no-job',
  'idle',
];
const SLICE3_NAMES = [
  'filed',
  'on-ballot',
  'struck',
  'voted-won',
  'voted-lost',
  'voted-lost-tie',
  'moved',
  'seat-ended',
  'council-passed',
  'council-failed',
];
const HOME_NAMES = [
  'train-open',
  'issues-drawn',
  'issue-leading',
  'issue-open',
  'issue-resolved',
  'issue-lapsed',
  'issue-pc',
  'hero',
  'moved-away',
  'quoted',
];

describe('the shape of the slice-4 headline templates', () => {
  it('ids are unique, in their paper, and every design id is present', () => {
    const ids = all.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Unique against the slice-1 and slice-3 sets too.
    const older = new Set([...storedHeadlines, ...politicalHeadlines].map((h) => h.id));
    expect(ids.filter((id) => older.has(id))).toEqual([]);

    expect(herald.every((h) => h.cityId === 'irongate' && h.id.startsWith('hl.ig.'))).toBe(true);
    const designIds = [...ISSUE_ROWS, ...HERALD_ROWS]
      .map((r) => unq(r[0]!))
      .filter((id) => !id.includes(' ') && !id.includes('..'));
    const expected = [
      ...designIds,
      ...STAND_IN_NAMES.map((n) => `hl.ig.${n}`),
      ...SLICE3_NAMES.map((n) => `hl.ig.${n}`),
      ...Array.from({ length: 10 }, (_, i) => `hl.ig.ambient-${i}`),
    ];
    expect(herald.map((h) => h.id).sort()).toEqual([...new Set(expected)].sort());

    const papers = [
      ['coalport', 'hl.'],
      ['duskwall', 'hl.v.'],
      ['ashford', 'hl.a.'],
    ] as const;
    expect(home.map((h) => h.id).sort()).toEqual(
      papers.flatMap(([, p]) => HOME_NAMES.map((n) => `${p}${n}`)).sort(),
    );
    for (const [cityId, p] of papers)
      for (const n of HOME_NAMES) expect(get(`${p}${n}`).cityId, `${p}${n}`).toBe(cityId);
  });

  it('headline ≤ 80 and deck ≤ 200 characters (the raw template), with one recorded exception', () => {
    for (const h of all) {
      if (!OVER_LIMIT.has(h.id)) expect(h.headline.length, h.id).toBeLessThanOrEqual(80);
      expect((h.deck ?? '').length, h.id).toBeLessThanOrEqual(200);
    }
    // The exception: 86 as a template (the schema allows a template 90, filled 80), and it fits
    // once filled with the longest district and faction names.
    const line = get('hl.ig.district-line');
    expect(line.headline.length).toBe(86);
    expect(HeadlineTemplateSchema.safeParse(line).success).toBe(true);
    const filled = line.headline
      .replace('{district}', 'Government Quarter')
      .replace('{leader}', 'Collective')
      .replace('{second}', 'Collective')
      .replace('{third}', 'Collective')
      .replace(/\{\w+Share\}/g, '100.0');
    expect(filled.length).toBeLessThanOrEqual(80);
  });

  it('a template uses live kinds only or stored kinds only, with the placeholders of its kind', () => {
    const stored = new Set<string>(PLACEHOLDERS);
    const live = new Set<string>([...POLITICAL_PLACEHOLDERS, ...CAPITAL_PLACEHOLDERS, ...TIME_TOKENS]);
    for (const h of all) {
      const text = `${h.headline} ${h.deck ?? ''}`;
      if (isPoliticalTemplate(h)) {
        expect(h.when.every(isPoliticalCondition), h.id).toBe(true);
        expect(
          placeholdersIn(text).filter((p) => !live.has(p)),
          h.id,
        ).toEqual([]);
      } else {
        expect(h.when.some(isPoliticalCondition), h.id).toBe(false);
        expect(
          placeholdersIn(text).filter((p) => !stored.has(p)),
          h.id,
        ).toEqual([]);
      }
    }
    // Stored: the slice-1 stand-ins, the train and the ambient pool; everything else is live.
    const storedIds = all.filter((h) => !isPoliticalTemplate(h)).map((h) => h.id);
    expect(storedIds.sort()).toEqual(
      [
        ...STAND_IN_NAMES.map((n) => `hl.ig.${n}`),
        ...Array.from({ length: 10 }, (_, i) => `hl.ig.ambient-${i}`),
        'hl.ig.train-open',
        'hl.train-open',
        'hl.v.train-open',
        'hl.a.train-open',
      ].sort(),
    );
  });

  it('the conditions as the lead mapped them (tech design §11.3)', () => {
    const when: Record<string, unknown[]> = {
      'welcome-resident': [{ kind: 'registeredYesterday' }],
      'first-arrival': [{ kind: 'firstCapitalArrivalYesterday' }],
      'train-open': [{ kind: 'levelCrossed', level: 10 }],
      'seat-won': [{ kind: 'seatWon', top: false }],
      'seat-top': [{ kind: 'seatWon', top: true }],
      'seat-lost': [{ kind: 'seatLost', tie: false, bloc: false }],
      'seat-lost-bloc': [{ kind: 'seatLost', tie: false, bloc: true }],
      'seat-lost-tie': [{ kind: 'seatLost', tie: true }],
      count: [{ kind: 'countToday' }],
      'polls-open': [{ kind: 'phaseToday', phase: 'polling', cycleDay: 2 }],
      nominations: [{ kind: 'phaseToday', phase: 'nominations', cycleDay: 0 }],
      'ordinance-city': [{ kind: 'ordinanceFromToday' }],
      battleground: [{ kind: 'districtBattleground' }],
      'battleground-new': [{ kind: 'districtBecameBattleground' }],
      'battleground-over': [{ kind: 'districtLeftBattleground' }],
      groundswell: [{ kind: 'groundswellStarted' }],
      'district-line': [{ kind: 'districtLine' }],
      hero: [{ kind: 'heroYesterday', place: 'district' }],
      quoted: [{ kind: 'quotedYesterday' }],
      'issues-drawn': [{ kind: 'issuesDrawnToday' }],
      'issue-leading': [{ kind: 'issueLeading' }],
      'issue-open': [{ kind: 'issueOpen' }],
      'issue-resolved': [{ kind: 'issueResolvedToday', owned: true }],
      'issue-lapsed': [{ kind: 'issueResolvedToday', owned: false }],
      'issue-pc': [{ kind: 'issuePcYesterday' }],
    };
    for (const [n, w] of Object.entries(when)) expect(get(`hl.ig.${n}`).when, n).toEqual(w);
    for (const p of ['hl.', 'hl.v.', 'hl.a.']) {
      for (const n of HOME_NAMES.filter((x) => x !== 'hero' && x !== 'moved-away'))
        expect(get(`${p}${n}`).when, `${p}${n}`).toEqual(when[n]);
      expect(get(`${p}hero`).when).toEqual([{ kind: 'heroYesterday', place: 'city' }]);
      expect(get(`${p}moved-away`).when).toEqual([{ kind: 'registeredYesterday' }]);
      // The home papers' groups and priorities are the Herald's (welcome-resident's for moved-away).
      for (const n of HOME_NAMES) {
        const like = get(`hl.ig.${n === 'moved-away' ? 'welcome-resident' : n}`);
        expect([get(`${p}${n}`).group, get(`${p}${n}`).priority], `${p}${n}`).toEqual([
          like.group,
          like.priority,
        ]);
      }
    }
    // The slice-1 and slice-3 sets keep the Clarion's conditions, groups and priorities.
    for (const n of [...STAND_IN_NAMES, ...SLICE3_NAMES]) {
      const clarion = [...storedHeadlines, ...politicalHeadlines].find((h) => h.id === `hl.${n}`)!;
      expect(clarion, n).toBeDefined();
      const h = get(`hl.ig.${n}`);
      expect([h.when, h.group, h.priority], n).toEqual([clarion.when, clarion.group, clarion.priority]);
    }
    for (let i = 0; i < 10; i++)
      expect(get(`hl.ig.ambient-${i}`)).toMatchObject({ group: 'ambient', when: [] });
  });
});

describe('word for word against the design (slice-4-battleground.md §9.6, §12)', () => {
  it('every §9.6 and §12 row with its full text: headline, deck, group and priority', () => {
    const full = [...ISSUE_ROWS, ...HERALD_ROWS].filter((r) => {
      const id = unq(r[0]!);
      return !id.includes(' ') && !id.includes('..') && !id.includes('/');
    });
    // Six Issue rows; §12's own nineteen, the ten of the slice-3 set and the twelve of the slice-1
    // set, every one written out (3 Oct 2026).
    expect(full).toHaveLength(6 + 19 + 10 + 12);
    for (const [idCell, gp, , headline, deck] of full) {
      const id = unq(idCell!);
      const h = get(id);
      expect([h.headline, h.deck], id).toEqual([headline, toToken(deck!)]);
      const [, group, priority] = /^(personal|city) (\d)/.exec(gp!)!;
      expect([h.group, h.priority], id).toEqual([group, Number(priority)]);
    }
  });

  it('the Herald keeps the Clarion\'s texts where nothing is capital-specific', () => {
    // The seniority pair and the away line are the same in every paper (review 1).
    for (const n of ['seniority-5', 'seniority-10', 'away']) {
      const clarion = storedHeadlines.find((h) => h.id === `hl.${n}`)!;
      expect([get(`hl.ig.${n}`).headline, get(`hl.ig.${n}`).deck], n).toEqual([clarion.headline, clarion.deck]);
    }
    // The idle line names no district: a visitor living at home has none.
    expect(get('hl.ig.idle').headline).toBe('Quiet Day in the Capital');
    expect(placeholdersIn(get('hl.ig.idle').headline)).toEqual([]);
  });

  it('the ten ambient headlines', () => {
    const row = HERALD_ROWS.find((r) => r[0]!.startsWith('`hl.ig.ambient-'))!;
    expect(row[1]).toBe('ambient');
    const list = row[3]!.split(' · ');
    expect(list).toHaveLength(10);
    expect(list.map((_, i) => get(`hl.ig.ambient-${i}`).headline)).toEqual(list);
  });

  it("the home papers' ten additions each, word for word against §12.1", () => {
    expect(HOME_ROWS).toHaveLength(30);
    for (const [idCell, headline, deck] of HOME_ROWS) {
      const id = unq(idCell!);
      expect([get(id).headline, get(id).deck], id).toEqual([headline, toToken(deck!)]);
    }
    // Each paper names its own city, paper and journey time; moved-away is one text in all three.
    const names: Record<string, [string, string, string]> = {
      'hl.': ['Coalport', 'Clarion', 'twelve'],
      'hl.v.': ['Duskwall', 'Sentinel', 'fifteen'],
      'hl.a.': ['Ashford', 'Gazette', 'twelve'],
    };
    for (const [p, [city, paper, minutes]] of Object.entries(names)) {
      expect(get(`${p}train-open`).deck).toContain(`Irongate in ${minutes} minutes, third class, 20 Iron.`);
      expect(get(`${p}hero`).headline).toBe(`{name} Named City Hero of ${city}`);
      expect(get(`${p}issue-lapsed`).deck).toContain(`The ${paper}`);
      expect(get(`${p}issues-drawn`).headline).toBe(`This Week in ${city}: {issue1} and {issue2}`);
      expect([get(`${p}moved-away`).headline, get(`${p}moved-away`).deck]).toEqual([
        '{name} Takes Up Residence in the Capital',
        'The branch keeps a chair for them. Orders now come from the capital; they vote in {district}.',
      ]);
    }
  });

  it('§3.5 names the quoted line as §12 builds it (the Herald id, {issueShort})', () => {
    expect(DESIGN).toContain(
      '`hl.ig.quoted` in the next edition (§12; the home papers\' `hl.*.quoted` in their own voices, §12.1): **{name} Quoted in the Herald on {issueShort}**',
    );
    expect(get('hl.ig.quoted').headline).toBe('{name} Quoted in the Herald on {issueShort}');
  });

  it('the Issues-drawn decks fit 200 characters with the longest blurb, district and Issue name', () => {
    // Two blurbs do not fit (the two longest are 110 and 108), so the deck names the second Issue.
    const fill = (s: string) =>
      s
        .replace('{issue1Blurb}', 'x'.repeat(110))
        .replace('{district2}', 'Government Quarter')
        .replace('{issue2}', 'Men at the Labour Exchange');
    for (const p of ['hl.ig.', 'hl.', 'hl.v.', 'hl.a.'])
      expect(fill(get(`${p}issues-drawn`).deck!).length, p).toBeLessThanOrEqual(200);
  });
});

/** A placeholder token as an argument, so a copy function prints the design's `{token}`. */
const P = (name: string) => `{${name}}` as never;

describe('the new UI copy, word for word against slice-4-screens.md §11', () => {
  const { travel: t, capital: c, residence: r, issues: i, capitalElection: e, scoreboard: s } = copy;
  const produced: string[] = [
    t.nation,
    t.city,
    t.fromLevel(10),
    t.youAreHere,
    t.home,
    t.rivalGround,
    t.noServiceYet,
    t.cities,
    t.citiesOfTheRepublic,
    t.board(P('fare'), P('min')),
    t.needsFare(P('fare')),
    t.seeTheFiveDistricts,
    t.rivalGroundLater,
    t.noServiceYetCard,
    c.whoHolds(P('place')),
    t.votesIn(P('n')),
    t.votingOpenUntil(P('until')),
    t.onTheTrainTo(P('city')),
    t.theTrainAt(P('time'), P('city')),
    t.arrives(P('when'), P('time')),
    t.eitherWay,
    t.onTheWay,
    t.optional,
    t.oneChoice,
    t.ignoreIt,
    t.arrived,
    t.inTheCapital,
    t.nothingHappened,
    t.cardBelow,
    c.irongate,
    c.districtOf(P('n'), 5),
    c.districts,
    c.closeRace,
    c.leans(P('faction')),
    c.heldBy(P('faction'), P('share')),
    c.comeback(P('faction'), P('pct')),
    c.notACloseRace,
    c.closeRaceToday,
    c.thisWeek(P('issue')),
    c.noIssue,
    c.councilSeats(P('a'), P('b')),
    c.goTo(P('district')),
    c.showPlaces,
    c.heldLegend,
    c.youLiveHere,
    c.visiting,
    c.districtCloseRace(P('district')),
    c.districtLeans(P('district'), P('faction')),
    c.membersOnly,
    c.councilRule(P('rule'), P('n')),
    c.issueLeads(P('issue'), P('faction'), P('a'), P('b')),
    t.boardTheTrainTo(P('city'), P('fare'), P('min')),
    t.seeTheNationMap,
    r.whereYouLive,
    r.youLiveIn(P('place')),
    r.registerIn(P('district'), 500),
    r.needsIron(500),
    r.registerHere(P('district')),
    r.canMoveAgainFrom(P('weekday')),
    r.onBallotLine(P('place'), P('weekday')),
    r.registeredLine(P('weekday'), P('weekday2'), P('weekday3')),
    r.belowRank(P('rank2'), 400),
    r.register(500),
    r.registered,
    r.newVoter(P('district')),
    r.seatGivenUp('Coalport'),
    r.nextVote(P('district'), P('weekday')),
    r.room,
    r.roomLine(100, 7, 50),
    r.takeARoom(100),
    r.renew(100),
    r.roomUntil(P('weekday'), P('cap')),
    r.roomPaidAhead(P('weekday'), P('cap'), P('renewFrom')),
    r.taken,
    i.theIssues,
    i.leads,
    i.open,
    i.settles('Sunday midnight'),
    i.newThisWeek,
    i.ifSettled(P('effect')),
    i.whereToAct,
    // The lead's slice-4 Election state (screens §7.2), line 1.
    copy.election.registered(P('district'), 'Thursday')[0]!,
    e.votingIsOpenIn(P('district')),
    e.twoSeats(P('until')),
    e.votesCast(P('n'), P('pct'), P('pct2')),
    e.howSeatsAreWon,
    e.factionProposal(P('faction'), P('secretary')),
    e.sixVotes(P('at')),
    s.line(P('place'), P('swing'), P('faction'), P('rank'), P('n')),
    s.noOneElse,
    s.whoMoved(P('district')),
    ...s.brackets,
    s.heroNote,
    s.heroTitle(P('district')),
    s.heroes(P('district'), P('n')),
    r.meLine(P('district'), P('weekday')),
    s.inPrint,
  ];
  // Review 4: the strings the review reworded are compared as reworded (./review4.ts).
  const listed = [...section(SCREENS, '## 11. Copy', 'Help notes (tap').matchAll(/\*([^*]+)\*/g)].map(
    (m) => reworded(m[1]!),
  );

  it('every §11 string is in copy, and nothing else', () => {
    expect([...new Set(produced)].sort()).toEqual([...new Set(listed)].sort());
    expect(new Set(produced).size).toBe(produced.length);
  });

  it('the plural and article forms beyond the design string', () => {
    expect(t.votesIn(1)).toBe('Votes in 1 day');
    expect(c.councilRule('Tram Subsidy', 1)).toBe('Council rule: Tram Subsidy · 1 day left');
    expect(r.belowRank('Activist', 400)).toBe(
      'Activists can register in the capital. 400 Party XP makes an Activist.',
    );
    expect(r.belowRank('Steward', 400)).toBe(
      'Stewards can register in the capital. 400 Party XP makes a Steward.',
    );
  });

  it('the help notes word for word (§6.1, §7.1, §11)', () => {
    const notes = section(SCREENS, 'Help notes (tap', 'British English');
    expect(r.help.whereYouLive()[0]).toBe('Where you live');
    expect(SCREENS).toContain(`the help note *${r.help.whereYouLive()[1]}*`);
    expect(i.help.theIssues()[0]).toBe('The Issues');
    expect(SCREENS).toContain(`the help note *${i.help.theIssues()[1]}*`);
    expect(c.help.closeRace()).toEqual(['Close race', /\*Close race\* \(\*(.+?)\*\)/.exec(notes)![1]]);
    expect(c.help.comeback()).toEqual(['Comeback', /\*Comeback\* \(\*(.+?)\*\)/.exec(notes)![1]]);
    // Review 2's share note with "a home city never falls below half" (its clause) replaced.
    expect(notes).toContain(
      '*a home city never falls below half* replaced, in the capital, by *nobody holds a district until a party passes half*',
    );
    expect(c.help.whoHolds('Eastside')).toEqual([
      'Who holds Eastside',
      copy.help
        .share('Eastside')[1]!
        .replace(
          'A home city never falls below half for its own party',
          'Nobody holds a district until a party passes half',
        ),
    ]);
  });
});

describe('vocabulary over the new strings (review 2 §1.13, content-policy §8)', () => {
  const sources = [
    { name: 'herald', value: heraldHeadlines },
    { name: 'home', value: capitalHomeHeadlines },
    {
      name: 'copy4',
      value: {
        travel: copy.travel,
        capital: copy.capital,
        residence: copy.residence,
        issues: copy.issues,
        capitalElection: copy.capitalElection,
        scoreboard: copy.scoreboard,
      },
    },
  ];

  it('no system term, except the one the design gives: a hospital ward', () => {
    // §12's ambient "Fever Ward at St Agnes Full, Say Sisters" is a hospital ward, not the retired
    // electoral word; allowed as such (vocabulary.ts, the designer's review of 3 Oct 2026).
    const hits = systemTermHits(sources);
    expect(hits).toEqual([]);
  });

  it('no war framing, allowing Garrison Hill (a place) and the war (the historical one)', () => {
    const war =
      /\b(war|wars|warfare|battle|battles|battlefield|uprising|insurrection|revolt|troops|soldiers?|army|armies|militia|invade|invasion|attack|assault|siege|combat|enemy|enemies|weapon|guns?|rifles?|bomb|kill|killed|garrisons?|barracks|drill(s|ed|ing)?|musters?|mustered|marshals?|footsoldiers?|sergeants?|uniforms?|purges?|purged|conscription|paramilitar(y|ies))\b/gi;
    const text = sources
      .map((x) => JSON.stringify(x.value))
      .join(' ')
      .replace(/\bGarrison Hill\b/g, '…')
      .replace(/\bthe war\b/gi, '…');
    expect([...text.matchAll(war)].map((m) => m[0])).toEqual([]);
    const fronts = [...text.matchAll(/.{0,20}\bfront\b.{0,20}/gi)].map((m) => m[0]);
    for (const f of fronts) expect(f, f).toMatch(/out front|the front of|front door|front room|front row/i);
    // The one allowance used: "Since the War".
    expect(get('hl.ig.ambient-8').headline).toMatch(/the War$/);
  });

  it('no exclamation marks and no "UTC"', () => {
    const text = sources.map((x) => JSON.stringify(x.value)).join(' ') + produced();
    expect(text).not.toMatch(/UTC|!/);
  });
});

/** The copy functions' outputs (JSON.stringify drops functions). */
function produced(): string {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'function') {
      try {
        walk((v as (...a: unknown[]) => unknown)('X', 'Y', 'Z', 'W', 'V'));
      } catch {
        /* a function that needs other arguments */
      }
    } else if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk([copy.travel, copy.capital, copy.residence, copy.issues, copy.capitalElection, copy.scoreboard]);
  return out.join(' ');
}
