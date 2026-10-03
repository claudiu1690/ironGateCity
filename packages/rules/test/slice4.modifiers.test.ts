/**
 * Slice 4, T3 (tech design §6.10, ADR 0030): modifier sources. One source behaves as slice 3;
 * two combine by the table; the capital's factors on the opinion swing, Party XP and the check.
 */
import { describe, expect, it } from 'vitest';
import {
  actionEnergy,
  createRng,
  jobPayLines,
  jobPayWith,
  ordinanceCheckBonuses,
  ordinanceTags,
  resolveTier1Action,
  resolveTraining,
  restedCapFor,
  rewardShares,
  seniorityStep,
  standingPerSuccess,
  swingFactors,
  trainingEnergy,
} from '../src';
import type {
  CityModifiers,
  LiveIssue,
  ModifierSource,
  OrdersState,
  OrdinanceEffect,
  PlaceModifiers,
  Tier1ActionInput,
} from '../src';
import { NAMES, TEMPLATES, fixedRng } from './helpers';

const src = (
  id: string,
  name: string,
  kind: 'ordinance' | 'issue',
  ...effects: OrdinanceEffect[]
): ModifierSource => ({
  id,
  name,
  kind,
  effects,
});
const legacy = (o: ModifierSource): CityModifiers => ({
  ordinance: { id: o.id, name: o.name, effects: o.effects },
  firedUp: false,
});
const place = (
  sources: ModifierSource[],
  p: Partial<NonNullable<PlaceModifiers['place']>> = {},
): PlaceModifiers => ({
  sources,
  firedUp: false,
  place: { battleground: false, groundswell: null, issues: [], ...p },
});

const RALLY = src('ord.rally-permits', 'Rally Permits', 'ordinance', {
  kind: 'energyDelta',
  actionType: 'speech',
  value: -2,
});
const CURFEW = src('issue.hill-curfew', 'Curfew on the Hill', 'issue', {
  kind: 'energyDelta',
  actionType: 'speech',
  value: -2,
});
const READING = src('ord.reading-room', 'Reading Room Grant', 'ordinance', {
  kind: 'trainingEnergyPct',
  value: -20,
});
const PROTESTS = src('issue.college-protests', 'Protests at the College', 'issue', {
  kind: 'trainingEnergyPct',
  value: -20,
});
const WORKS = src('ord.public-works', 'Public Works', 'ordinance', { kind: 'jobPayPct', value: 10 });
const CUTS = src('issue.ministry-cuts', 'The Ministry Cuts', 'issue', { kind: 'jobPayPct', value: 10 });
const REST = src('ord.rest-day', 'Rest Day Order', 'ordinance', { kind: 'restedCapDelta', value: 50 });
const FEVER = src('issue.fever-st-agnes', 'Fever at St Agnes', 'issue', {
  kind: 'restedCapDelta',
  value: 50,
});
const OPEN = src('ord.open-doors', 'Open Doors', 'ordinance', {
  kind: 'chancePct',
  actionType: 'canvass',
  value: 4,
});
const GALA = src('issue.opera-gala', 'The Opera Gala', 'issue', {
  kind: 'chancePct',
  actionType: 'canvass',
  value: 4,
});
const REGISTER = src('ord.street-register', 'Street Register', 'ordinance', {
  kind: 'standingMultiplier',
  value: 2,
});
const CENSUS = src('issue.census-hill', 'The Census on the Hill', 'issue', {
  kind: 'standingMultiplier',
  value: 2,
});
const LONG = src('ord.long-service', 'Long Service Order', 'ordinance', { kind: 'seniorityDays', value: 2 });
const STRIKE = src('issue.mill-strike', 'Strike at the Mill', 'issue', { kind: 'seniorityDays', value: 2 });
const PERMITS = src('ord.street-permits', 'Street Permits', 'ordinance', {
  kind: 'swingPct',
  actionType: 'propaganda',
  value: 15,
});
const RAIDS = src('issue.press-raids', 'Press Raids in Old Town', 'issue', {
  kind: 'swingPct',
  actionType: 'propaganda',
  value: 15,
});
const MEETINGS = src('ord.public-meetings', 'Public Meetings', 'ordinance', {
  kind: 'fxpPct',
  scope: 'actions',
  value: 25,
});
const QUAYS = src('issue.quays-strike', 'Strike at the Quays', 'issue', {
  kind: 'fxpPct',
  scope: 'actions',
  value: 25,
});
const FUND = src('ord.street-fund', 'Street Fund', 'ordinance', {
  kind: 'ironPct',
  scope: 'checked',
  value: 25,
});
const BREAD = src('issue.bread-queues', 'Bread Queues at the Market', 'issue', {
  kind: 'ironPct',
  scope: 'checked',
  value: 15,
});

describe('one source is slice 3 exactly', () => {
  it('every slice-3 helper gives the same number with the source in either shape', () => {
    for (const [s, check] of [
      [RALLY, (m: PlaceModifiers | CityModifiers) => actionEnergy(12, 'speech', m)],
      [READING, (m: PlaceModifiers | CityModifiers) => trainingEnergy(44, m)],
      [WORKS, (m: PlaceModifiers | CityModifiers) => jobPayWith(216, m)],
      [REST, (m: PlaceModifiers | CityModifiers) => restedCapFor(m)],
      [REGISTER, (m: PlaceModifiers | CityModifiers) => standingPerSuccess(m)],
      [LONG, (m: PlaceModifiers | CityModifiers) => seniorityStep(m)],
    ] as const) {
      expect(check(place([s]))).toBe(check(legacy(s)));
    }
    expect([
      actionEnergy(12, 'speech', legacy(RALLY)),
      trainingEnergy(44, legacy(READING)),
      jobPayWith(216, legacy(WORKS)),
    ]).toEqual([10, 35, 238]);
    expect(ordinanceCheckBonuses('canvass', legacy(OPEN))).toEqual([
      { id: 'ord.open-doors', label: 'Open Doors', value: 4 },
    ]);
    expect(ordinanceTags({ kind: 'checked', type: 'speech', base: 12, m: legacy(RALLY) })).toEqual([
      { ordinanceId: 'ord.rally-permits', name: 'Rally Permits', kind: 'energy', value: 10 },
    ]);
  });
});

describe('two sources of one kind (ADR 0030 §2)', () => {
  it('Energy, chance and Rested cap deltas add', () => {
    expect(actionEnergy(12, 'speech', place([RALLY, CURFEW]))).toBe(8);
    expect(
      actionEnergy(
        3,
        'intelligence',
        place([
          src('x', 'x', 'issue', { kind: 'energyDelta', actionType: 'intelligence', value: -2 }),
          src('y', 'y', 'issue', { kind: 'energyDelta', actionType: 'intelligence', value: -2 }),
        ]),
      ),
    ).toBe(1);
    expect(ordinanceCheckBonuses('canvass', place([OPEN, GALA]))).toEqual([
      { id: 'ord.open-doors', label: 'Open Doors', value: 4 },
      { id: 'issue.opera-gala', label: 'The Opera Gala', value: 4 },
    ]);
    expect(restedCapFor(place([REST, FEVER]))).toBe(300);
    expect(restedCapFor(place([FEVER]), true)).toBe(300);
    expect(restedCapFor(undefined, true)).toBe(250);
  });

  it('pay, Iron and Party XP percentages are each their own line on the base', () => {
    expect(jobPayLines(216, place([WORKS, CUTS]))).toEqual([
      { id: 'ord.public-works', label: 'Public Works', amount: 22 },
      { id: 'issue.ministry-cuts', label: 'The Ministry Cuts', amount: 22 },
    ]);
    expect(jobPayWith(216, place([WORKS, CUTS]))).toBe(260);
    const shares = rewardShares({
      type: 'canvass',
      givesFxp: true,
      m: place([MEETINGS, QUAYS, FUND, BREAD]),
    });
    expect(shares.fxp.map((s) => [s.id, s.share])).toEqual([
      ['ord.public-meetings', 0.25],
      ['issue.quays-strike', 0.25],
    ]);
    expect(shares.iron.map((s) => [s.id, s.share])).toEqual([
      ['ord.street-fund', 0.25],
      ['issue.bread-queues', 0.15],
    ]);
  });

  it('opinion, training, tickets and rooms multiply; every win counts twice and seniority take the larger', () => {
    expect(swingFactors('propaganda', 'vanguard', place([PERMITS, RAIDS])).map((f) => f.pct)).toEqual([
      15, 15,
    ]);
    expect(trainingEnergy(44, place([READING, PROTESTS]))).toBe(28);
    expect(standingPerSuccess(place([REGISTER, CENSUS]))).toBe(2);
    expect(seniorityStep(place([LONG, STRIKE]))).toBe(2);
    const tags = ordinanceTags({ kind: 'checked', type: 'speech', base: 12, m: place([RALLY, CURFEW]) });
    expect(tags).toEqual([
      { ordinanceId: 'ord.rally-permits', name: 'Rally Permits', kind: 'energy', value: 8 },
      {
        ordinanceId: 'issue.hill-curfew',
        name: 'Curfew on the Hill',
        kind: 'energy',
        value: 8,
        source: 'issue',
      },
    ]);
  });
});

const T0 = 1_790_000_000_000;
const NO_ORDERS: OrdersState = { day: 0, items: [], allDoneAt: null };
const TRAM: LiveIssue = {
  docId: 'irongate:20731:issue.tram-fares',
  issueId: 'issue.tram-fares',
  name: 'Tram Fare Hike',
  feeds: [{ actionTypes: ['canvass', 'speech', 'propaganda'], locationIds: ['irongate.central-station'] }],
};

const capital = (over: Partial<Tier1ActionInput> = {}): Tier1ActionInput => ({
  action: {
    id: 'irongate.central-station.arrivals',
    type: 'canvass',
    locationId: 'irongate.central-station',
    cityId: 'irongate',
    energy: 10,
    stats: ['int'],
    givesFxp: true,
    givesOpinion: true,
    districtId: 'irongate.station-market',
    locationKind: 'station',
  },
  cityRole: 'battleground',
  values: { str: 10, int: 10, agi: 5, cha: 2 },
  energy: { value: 100, rested: 0, updatedAt: T0 },
  now: T0,
  times: 1,
  standing: { successes: 0, names: NAMES, cityName: 'Irongate' },
  orders: NO_ORDERS,
  orderTemplates: TEMPLATES,
  homeCityId: 'coalport',
  factionId: 'collective',
  modifiers: place([], { battleground: true, issues: [TRAM] }),
  ...over,
});

function ok(r: ReturnType<typeof resolveTier1Action>) {
  if (!r.ok) throw new Error('expected ok');
  return r.resolution;
}

describe('the capital on the result (tech design §10.1)', () => {
  it('a tagged canvass in a close race: opinion 0.05 × 1.25 × 1.5 = 0.094, FXP 6 + Close race 2, +5 on the check, 10 points', () => {
    const r = ok(resolveTier1Action(capital(), fixedRng([1])));
    const a = r.attempts[0]!;
    expect(a.outcome).toBe('success');
    expect(a.check.bonuses).toEqual([{ id: 'battleground', label: 'Close race', value: 5 }]);
    expect(a.check.chance).toBe(55);
    expect(r.rewards.opinion).toBe(0.094);
    expect(r.rewards.opinionFactors).toEqual([
      { id: 'battleground', label: 'Close race', pct: 25 },
      { id: 'issue:issue.tram-fares', label: 'Issue: Tram Fare Hike', pct: 50 },
    ]);
    expect(r.rewards.fxp).toEqual({
      base: 6,
      bonus: 2,
      total: 8,
      parts: [{ id: 'battleground', label: 'Close race', amount: 2 }],
    });
    expect(a.points).toBe(10);
    expect(r.issues).toEqual([
      { docId: TRAM.docId, issueId: 'issue.tram-fares', name: 'Tram Fare Hike', points: 10 },
    ]);
  });

  it('×3 with a Partial: points 10 + 5 + 10', () => {
    const r = ok(resolveTier1Action(capital({ times: 3 }), fixedRng([1, 99, 1])));
    expect(r.attempts.map((a) => a.points)).toEqual([10, 5, 10]);
    expect(r.issues?.[0]?.points).toBe(25);
  });

  it('a comeback on day 3 under Street Permits: 0.04 × 1.15 × 1.15 = 0.053', () => {
    const r = ok(
      resolveTier1Action(
        capital({
          action: {
            id: 'irongate.villas.bills',
            type: 'propaganda',
            locationId: 'irongate.villas',
            cityId: 'irongate',
            energy: 8,
            stats: ['str'],
            givesFxp: true,
            givesOpinion: true,
            districtId: 'irongate.garrison-hill',
            locationKind: 'street',
          },
          factionId: 'vanguard',
          modifiers: place([PERMITS], { groundswell: { factionId: 'vanguard', pct: 15 }, issues: [TRAM] }),
        }),
        fixedRng([1]),
      ),
    );
    expect(r.rewards.opinion).toBe(0.053);
    expect(r.rewards.opinionFactors?.map((f) => f.label)).toEqual(['Comeback', 'Street Permits']);
    expect(r.issues).toEqual([]);
    expect(r.attempts[0]!.points).toBe(0);
  });

  it("another faction's comeback, intelligence and training get no capital lines", () => {
    expect(
      swingFactors(
        'propaganda',
        'collective',
        place([], { groundswell: { factionId: 'vanguard', pct: 15 } }),
      ),
    ).toEqual([]);
    expect(swingFactors('intelligence', 'collective', place([], { battleground: true }))).toEqual([]);
    const r = ok(
      resolveTier1Action(
        capital({
          action: {
            ...capital().action,
            id: 'irongate.central-station.boards',
            type: 'intelligence',
            energy: 4,
            givesFxp: false,
            givesOpinion: false,
          },
        }),
        fixedRng([1]),
      ),
    );
    expect(r.attempts[0]!.check.bonuses).toEqual([]);
    expect(r.rewards.opinionFactors).toBeUndefined();
    const t = resolveTraining({
      trains: 'agi',
      base: { str: 5, int: 5, agi: 5 },
      energy: { value: 100, rested: 0, updatedAt: T0 },
      now: T0,
      orders: NO_ORDERS,
      orderTemplates: TEMPLATES,
      homeCityId: 'coalport',
      descriptor: { kind: 'training', type: 'training', cityId: 'irongate' },
      modifiers: place([], { battleground: true }),
    });
    expect(t.ok && t.resolution.xp).toEqual({ base: 68, bonus: 0, total: 68 });
  });

  it('slice 3 callers keep their stored shape', () => {
    const r = ok(
      resolveTier1Action(
        {
          ...capital(),
          modifiers: legacy(PERMITS),
          action: { ...capital().action, type: 'propaganda', energy: 8 },
        },
        createRng('x'),
      ),
    );
    expect(r.rewards.opinionFactors).toBeUndefined();
    expect('issues' in r).toBe(false);
    expect('points' in r.attempts[0]!).toBe(false);
  });
});
