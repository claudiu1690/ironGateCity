/** Slice 4, T6 (tech design §11.3): the new headline conditions, stored and live. */
import { describe, expect, it } from 'vitest';
import { isPoliticalTemplate, selectHeadlines, selectPoliticalHeadlines } from '../src';
import type { CapitalFacts, HeadlineTemplate, PaperFacts, PoliticalFacts } from '../src';

const facts: PaperFacts = {
  firstEdition: false,
  rankRose: false,
  rank: 1,
  levelRose: true,
  standingRose: false,
  ordersAllDoneYesterday: false,
  seniority: null,
  daysSinceLastPaper: 1,
  idleYesterday: false,
  daysPaid: 0,
  energyYesterday: 0,
  homeShare: 70,
};

const capital: CapitalFacts = {
  registeredYesterday: false,
  firstCapitalArrivalYesterday: false,
  hero: null,
  issuePcYesterday: false,
  quotedYesterday: false,
  issuesDrawnToday: false,
  issueLeading: false,
  issueOpen: false,
  issueResolved: null,
  districtBattleground: false,
  districtBecameBattleground: false,
  districtLeftBattleground: false,
  groundswellStarted: false,
  districtLine: false,
};

const political: PoliticalFacts = {
  seat: null,
  filedYesterday: false,
  termEnded: false,
  countToday: false,
  phase: 'nominations',
  cycleDay: 0,
  ruleFromToday: false,
  leftUnrest: false,
  vars: { name: 'Vera', district: 'Eastside', issueShort: 'the tram fares', faction: 'Collective' },
  until: { nominations: 1, polls: 2 },
};

const t = (
  id: string,
  group: HeadlineTemplate['group'],
  when: HeadlineTemplate['when'],
  headline: string,
): HeadlineTemplate => ({
  id,
  cityId: 'irongate',
  group,
  priority: 0,
  when,
  headline,
});

describe('the train opens at Level 10 (stored)', () => {
  const open = t(
    'hl.ig.train-open',
    'personal',
    [{ kind: 'levelCrossed', level: 10 }],
    'The Train Is Open to {name}',
  );
  it('holds when the level crossed 10 since the last paper, not before or after', () => {
    expect(selectHeadlines([open], { ...facts, level: { before: 9, after: 10 } }, 20_731)).toEqual([open]);
    expect(selectHeadlines([open], { ...facts, level: { before: 8, after: 11 } }, 20_731)).toEqual([open]);
    expect(selectHeadlines([open], { ...facts, level: { before: 10, after: 11 } }, 20_731)).toEqual([]);
    expect(selectHeadlines([open], facts, 20_731)).toEqual([]);
  });
});

describe('the live capital conditions', () => {
  const welcome = t(
    'hl.ig.welcome-resident',
    'personal',
    [{ kind: 'registeredYesterday' }],
    '{name} Takes Up Residence in {district}',
  );
  const hero = t(
    'hl.ig.hero',
    'personal',
    [{ kind: 'heroYesterday', place: 'district' }],
    '{name} Named District Hero of {district}',
  );
  const owned = t(
    'hl.ig.issue-resolved',
    'city',
    [{ kind: 'issueResolvedToday', owned: true }],
    '{faction} Owns {issueShort}',
  );
  const lapsed = t(
    'hl.ig.issue-lapsed',
    'city',
    [{ kind: 'issueResolvedToday', owned: false }],
    'Nobody Spoke for {issueShort}',
  );
  const all = [welcome, hero, owned, lapsed];

  it('are live templates, kept out of the settlement', () => {
    for (const x of all) expect(isPoliticalTemplate(x)).toBe(true);
    expect(selectHeadlines(all, facts, 20_731)).toEqual([]);
  });

  it('hold on their facts, with the capital placeholders resolved', () => {
    expect(selectPoliticalHeadlines(all, political)).toEqual([]);
    const live = selectPoliticalHeadlines(all, {
      ...political,
      capital: {
        ...capital,
        registeredYesterday: true,
        hero: 'district',
        issueResolved: { owned: true, lapsed: true },
      },
    });
    expect(live.map((h) => h.headline)).toEqual([
      'Vera Takes Up Residence in Eastside',
      'Vera Named District Hero of Eastside',
      'Collective Owns the tram fares',
      'Nobody Spoke for the tram fares',
    ]);
    const city = selectPoliticalHeadlines(all, { ...political, capital: { ...capital, hero: 'city' } });
    expect(city).toEqual([]);
  });
});
