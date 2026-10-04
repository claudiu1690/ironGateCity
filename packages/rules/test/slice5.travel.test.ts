/**
 * Slice 5, T5 (docs/tech/slice-5.md §6.9, §6.10, §11.2, §6.13): travel v3 (every destination state
 * at Levels 9 and 10 with and without a bar, the hostile draw, the card difficulty, the checkpoint's
 * gate), quarters, and the risk headline conditions.
 */
import { describe, expect, it } from 'vitest';
import {
  FACTION_IDS,
  cardDifficulty,
  coolAndClean,
  createRng,
  destinationState,
  drawHostileCard,
  drawJourneyCard,
  journeyChoiceCheck,
  quarterOpen,
  resolveJourneyChoice,
  selectHeadlines,
  selectPoliticalHeadlines,
} from '../src';
import type { FactionId, HeadlineTemplate, JourneyChoiceSpec, PaperFacts, PoliticalFacts, RiskFacts } from '../src';

const HOMES: Record<string, FactionId> = { coalport: 'collective', duskwall: 'vanguard', ashford: 'alliance' };
const T = Date.UTC(2026, 9, 3, 12);

describe('destination states (design §11.1, §11.5)', () => {
  const state = (to: string, faction: FactionId, level: number, barredUntil: number | null = null) =>
    destinationState({
      to,
      here: 'irongate',
      level,
      service: to === 'clearwater' ? 'later' : 'open',
      factionHomeOf: (id) => HOMES[id] ?? null,
      playerFaction: faction,
      capitalId: 'irongate',
      barredUntil,
      now: T,
    });
  it('every destination for each faction at Levels 9 and 10, with and without a bar', () => {
    for (const f of FACTION_IDS) {
      for (const to of ['irongate', 'coalport', 'duskwall', 'ashford', 'clearwater']) {
        expect(state(to, f, 9), `${f} → ${to} at 9`).toBe('level');
        const want =
          to === 'irongate' ? 'here' : to === 'clearwater' ? 'later' : HOMES[to] === f ? 'open' : 'rival';
        expect(state(to, f, 10), `${f} → ${to} at 10`).toBe(want);
        expect(state(to, f, 10, T + 1), `${f} → ${to} barred`).toBe(want === 'rival' ? 'barred' : want);
        expect(state(to, f, 10, T), `${f} → ${to} bar over`).toBe(want);
      }
    }
  });
});

describe('the hostile deck (design §11.4, §23.1 #12)', () => {
  const draw = (over: Partial<Parameters<typeof drawHostileCard>[0]> = {}) =>
    drawHostileCard({
      firstRival: false,
      heat: 0,
      seen: [],
      rotation: ['jev.checkpoint', 'jev.informer', 'jev.conductor'],
      firstId: 'jev.checkpoint',
      listed: { id: 'jev.listed', heatAtLeast: 50 },
      rng: createRng('h'),
      ...over,
    });
  it('the first trip always draws the checkpoint, Heat notwithstanding', () => {
    expect(draw({ firstRival: true, heat: 80 })).toEqual({ eventId: 'jev.checkpoint', seen: ['jev.checkpoint'] });
  });
  it('the list at Heat 50 (not 49), outside the rotation', () => {
    expect(draw({ heat: 50, seen: ['jev.informer'] })).toEqual({ eventId: 'jev.listed', seen: ['jev.informer'] });
    expect(draw({ heat: 49 }).eventId).not.toBe('jev.listed');
  });
  it('all three before a repeat, then a new round', () => {
    for (let n = 0; n < 50; n++) {
      let seen: string[] = [];
      const ids: string[] = [];
      for (let k = 0; k < 6; k++) {
        const r = draw({ seen, rng: createRng(`round${n}:${k}`) });
        ids.push(r.eventId);
        seen = r.seen;
      }
      expect(new Set(ids.slice(0, 3)).size).toBe(3);
      expect(new Set(ids.slice(3, 6)).size).toBe(3);
    }
  });
  it('the ordinary deck is unchanged (first journey, one in three)', () => {
    expect(drawJourneyCard({ first: true, seen: [], deck: ['jev.passenger'], firstId: 'jev.passenger', rng: createRng('x') }).eventId).toBe(
      'jev.passenger',
    );
  });
});

describe('the cards on rival ground (design §11.4, §23.2)', () => {
  it('difficulty 14 on the hostile deck, 10 on the ordinary', () => {
    expect(cardDifficulty('hostile')).toBe(14);
    expect(cardDifficulty('ordinary')).toBe(10);
    const values = { str: 10, int: 10, agi: 10, cha: 10 };
    expect(journeyChoiceCheck({ stats: ['cha'], values, standingBonus: null, difficulty: 14 }).chance).toBe(34);
    expect(journeyChoiceCheck({ stats: ['cha'], values, standingBonus: null }).chance).toBe(50);
  });
  const show: JourneyChoiceSpec = {
    id: 'show',
    gate: 'coolAndClean',
    success: { rewards: {} },
    partial: { rewards: { heat: 10, flag: 'watched' } },
  };
  it("the checkpoint's gate: Cool and Clean passes; Noticed, or one mark, is stopped", () => {
    expect(coolAndClean(24, 0)).toBe(true);
    expect(coolAndClean(25, 0)).toBe(false);
    expect(coolAndClean(0, 1)).toBe(false);
    const values = { str: 5, int: 5, agi: 5, cha: 5 };
    expect(resolveJourneyChoice({ choice: show, values, standingBonus: null, rng: createRng('g'), gateHolds: true })).toMatchObject({
      outcome: 'chosen',
      branch: 'pass',
      rewards: {},
      roll: null,
    });
    expect(resolveJourneyChoice({ choice: show, values, standingBonus: null, rng: createRng('g'), gateHolds: false })).toMatchObject({
      outcome: 'chosen',
      branch: 'stopped',
      rewards: { heat: 10, flag: 'watched' },
    });
    const talk: JourneyChoiceSpec = {
      id: 'talk',
      stats: ['cha'],
      success: { rewards: { fxp: 6 } },
      partial: { rewards: { fxp: 3, flag: 'watched' } },
    };
    const r = resolveJourneyChoice({ choice: talk, values, standingBonus: null, rng: createRng('t'), difficulty: 14 });
    expect(r.check?.difficulty).toBe(14);
    expect(r.branch).toBeUndefined();
  });
});

describe('quarters (GDD §14.13, ADR 0035)', () => {
  it('open by Level; a later edition is a teaser whatever the Level; the held rule', () => {
    expect(quarterOpen({ opens: { level: 1 } }, 1)).toEqual({ open: true, lock: null });
    expect(quarterOpen({ opens: { level: 6 } }, 5)).toEqual({ open: false, lock: { kind: 'level', level: 6 } });
    expect(quarterOpen({ opens: { level: 6 } }, 6)).toEqual({ open: true, lock: null });
    expect(quarterOpen({ opens: { level: 6 } }, 5, true)).toEqual({ open: true, lock: null });
    expect(quarterOpen({ opens: { edition: 'later' } }, 50)).toEqual({ open: false, lock: { kind: 'edition' } });
    expect(quarterOpen({}, 1).open).toBe(true);
  });
});

describe('the risk headlines (tech design §11.2)', () => {
  const t = (id: string, priority: number, when: HeadlineTemplate['when'], group: HeadlineTemplate['group'] = 'personal'): HeadlineTemplate => ({
    id,
    cityId: 'coalport',
    group,
    priority,
    when,
    headline: id,
  });
  const templates = [
    t('hl.cells', 0, [{ kind: 'arrestedYesterday' }]),
    t('hl.seen', 1, [{ kind: 'heatState', min: 'hot' }]),
    t('hl.infirmary', 1, [{ kind: 'admittedYesterday' }]),
    t('hl.deported', 1, [{ kind: 'deportedYesterday' }]),
    t('hl.name-taken', 2, [{ kind: 'markYesterday' }]),
    t('hl.record-up', 2, [{ kind: 'recordRose' }]),
    t('hl.quarter-open', 2, [{ kind: 'levelCrossed', level: 6 }]),
    t('hl.mission-first', 3, [{ kind: 'missionFirstYesterday' }]),
    t('hl.rival-trip', 3, [{ kind: 'rivalGroundYesterday' }]),
    t('hl.ambient', 0, [], 'ambient'),
  ];
  const none: RiskFacts = {
    missionFirstYesterday: false,
    heat: 'cool',
    markYesterday: false,
    arrestedYesterday: false,
    admittedYesterday: false,
    recordRose: false,
    rivalGroundYesterday: false,
    deportedYesterday: false,
  };
  const facts = (risk?: Partial<RiskFacts>, level?: { before: number; after: number }): PaperFacts => ({
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
    ...(level ? { level } : {}),
    ...(risk ? { risk: { ...none, ...risk } } : {}),
  });
  const ids = (f: PaperFacts) => selectHeadlines(templates, f, 20_730).map((h) => h.id);
  it('each risk condition from its fact; none without the facts', () => {
    expect(ids(facts())).toEqual(['hl.ambient']);
    expect(ids(facts({ arrestedYesterday: true }))).toEqual(['hl.cells', 'hl.ambient']);
    expect(ids(facts({ heat: 'hot' }))).toEqual(['hl.seen', 'hl.ambient']);
    expect(ids(facts({ heat: 'wanted' }))).toEqual(['hl.seen', 'hl.ambient']);
    expect(ids(facts({ heat: 'noticed' }))).toEqual(['hl.ambient']);
    expect(ids(facts({ admittedYesterday: true }))).toContain('hl.infirmary');
    expect(ids(facts({ deportedYesterday: true }))).toContain('hl.deported');
    expect(ids(facts({ markYesterday: true }))).toContain('hl.name-taken');
    expect(ids(facts({ recordRose: true }))).toContain('hl.record-up');
    expect(ids(facts({ missionFirstYesterday: true }))).toContain('hl.mission-first');
    expect(ids(facts({ rivalGroundYesterday: true }))).toContain('hl.rival-trip');
    expect(ids(facts(undefined, { before: 5, after: 6 }))).toContain('hl.quarter-open');
    // The cells and the infirmary outrank the rest (two personal at most).
    expect(ids(facts({ arrestedYesterday: true, heat: 'hot', markYesterday: true }))).toEqual(['hl.cells', 'hl.seen', 'hl.ambient']);
  });
  it('Rival Callers is live: the home city lost at least 1 point yesterday', () => {
    const live = [t('hl.rival-pressure', 1, [{ kind: 'moraleLostToRivals', min: 1 }], 'city')];
    const pf = (lost: number): PoliticalFacts => ({
      seat: null,
      voted: null,
      filedYesterday: false,
      nominationsClosed: null,
      termEnded: false,
      divided: null,
      movedYesterday: false,
      countToday: false,
      phase: 'nominations',
      cycleDay: 1,
      ordinanceFromToday: false,
      leftUnrest: false,
      capital: {
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
        moraleLostToRivals: lost,
      },
      vars: { lost: lost.toFixed(1) },
      until: { nominations: 0, polls: 0, divide: 0 },
    });
    expect(selectPoliticalHeadlines(live, pf(1.2)).map((h) => h.templateId)).toEqual(['hl.rival-pressure']);
    expect(selectPoliticalHeadlines(live, pf(0.9))).toEqual([]);
  });
});
