/**
 * Slice 5, T3 (docs/tech/slice-5.md §6.5, §6.11, §6.13): missions — the ladder, the target, the
 * gates, the risk line, the remembered/suggested way, the resolver (determinism, the dropped twin),
 * Agility +¼, the close race on speech only; and the orders' `minLevel`, `kinds: ['mission']` and
 * rival ground.
 */
import { describe, expect, it } from 'vitest';
import {
  createRng,
  districtLeader,
  finishMission,
  missionDifficulty,
  missionGate,
  missionRisk,
  missionTarget,
  offeredTo,
  ordersForDay,
  orderMatches,
  resolveMission,
  riskBand,
  startOrders,
  suggestedWay,
  tier2Rewards,
} from '../src';
import type {
  ActionDescriptor,
  MissionInput,
  MissionStart,
  OrderTemplate,
  OrdersState,
  PlaceModifiers,
} from '../src';
import { NAMES, TEMPLATES } from './helpers';

describe('the difficulty ladder (§8.4, design §4.3, §23.1 #1)', () => {
  it('14, 16, 18, 20 by Level; +2 in the capital (an Irongate Level-10 mission is 20)', () => {
    expect(([6, 8, 10, 12] as const).map((l) => missionDifficulty(l, 'home'))).toEqual([14, 16, 18, 20]);
    expect(missionDifficulty(10, 'battleground')).toBe(20);
    expect(missionDifficulty(6, 'battleground')).toBe(16);
  });
});

describe('the target (design §4.1, ADR 0034 §5)', () => {
  const shares = { vanguard: 30, collective: 35, alliance: 25, neutral: 10 };
  it('a named faction; none for a legal mission', () => {
    expect(missionTarget('vanguard', 'collective', null)).toBe('vanguard');
    expect(missionTarget(undefined, 'collective', null)).toBeNull();
  });
  it('`leader`: the boundary leader, or the runner-up when it is the actor', () => {
    expect(missionTarget('leader', 'vanguard', { leader: 'collective', shares })).toBe('collective');
    expect(missionTarget('leader', 'collective', { leader: 'collective', shares })).toBe('vanguard');
    // No stored leader yet: by the shares.
    expect(missionTarget('leader', 'alliance', { leader: null, shares })).toBe('collective');
    expect(districtLeader(shares)).toBe('collective');
    // A tie goes to the first in faction order.
    expect(
      districtLeader({ vanguard: 30, collective: 30, alliance: 30, neutral: 10 })
    ).toBe('vanguard');
  });
  it('hidden from the target faction', () => {
    expect(offeredTo('vanguard', 'vanguard')).toBe(false);
    expect(offeredTo('vanguard', 'alliance')).toBe(true);
    expect(offeredTo(null, 'alliance')).toBe(true);
  });
});

describe('the gates (design §4.1, §4.7)', () => {
  const base = {
    level: 10,
    rank: 3,
    standingLevel: 2,
    record: 'clean' as const,
    mission: { level: 8, requires: { rank: 3, standing: 2 } },
    place: { kind: 'street' },
  };
  it('Level, Rank, Standing, then the record', () => {
    expect(missionGate(base)).toBeNull();
    expect(missionGate({ ...base, level: 7 })).toEqual({ reason: 'LEVEL', need: 8 });
    expect(missionGate({ ...base, rank: 2 })).toEqual({ reason: 'RANK', need: 3 });
    expect(missionGate({ ...base, standingLevel: 1 })).toEqual({ reason: 'STANDING', need: 2 });
    expect(missionGate({ ...base, record: 'notorious', place: { kind: 'court' } })).toEqual({ reason: 'RECORD', need: 0 });
    expect(
      missionGate({ ...base, record: 'notorious', place: { kind: 'faction-hq', factionId: 'alliance' } })?.reason,
    ).toBe('RECORD');
    expect(missionGate({ ...base, record: 'notorious' })).toBeNull();
  });
});

describe('the risk line (design §4.7)', () => {
  it('the risk word bands at 0, 1, 10, 11, 24, 25', () => {
    expect([0, 1, 10, 11, 24, 25, 90].map(riskBand)).toEqual([
      'safe',
      'littleRisk',
      'littleRisk',
      'risky',
      'risky',
      'dangerous',
      'dangerous',
    ]);
  });
  const flags = { watched: false, warned: false };
  it('Heat, the run-in after the gain, marks; a loud way; rival ground doubles both', () => {
    expect(missionRisk({ type: 'vandalism', way: {}, rivalGround: false, heat: 0, record: 'clean', flags })).toEqual({
      heat: 6,
      runInChance: 15,
      marks: 1,
    });
    expect(missionRisk({ type: 'vandalism', way: { runIn: 25 }, rivalGround: false, heat: 0, record: 'clean', flags }).runInChance).toBe(25);
    expect(missionRisk({ type: 'speech', way: {}, rivalGround: false, heat: 0, record: 'clean', flags })).toEqual({
      heat: 0,
      runInChance: 5,
      marks: 0,
    });
    // A Cool player at 20 who takes +8 is Noticed for the run-in (design §6.2).
    expect(missionRisk({ type: 'disruption', way: {}, rivalGround: false, heat: 20, record: 'clean', flags }).runInChance).toBe(35);
    // Hot on rival ground: a disruption reads 75 (design §10.1); sabotage's Heat is 24 there.
    expect(missionRisk({ type: 'disruption', way: {}, rivalGround: true, heat: 50, record: 'clean', flags }).runInChance).toBe(75);
    expect(missionRisk({ type: 'sabotage', way: {}, rivalGround: true, heat: 0, record: 'clean', flags }).heat).toBe(24);
  });
  it('the suggested way: the best chance, ties in content order', () => {
    const ways = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(suggestedWay(ways, [{ chance: 50 }, { chance: 70 }, { chance: 70 }])).toBe('b');
    expect(suggestedWay(ways, [{ chance: 70 }, { chance: 70 }, { chance: 70 }])).toBe('a');
  });
});

const ORDERS: OrdersState = {
  day: 20_730,
  items: [
    { templateId: 'dir.say-it', variant: 'main', target: 1, progress: 0, doneAt: null },
    { templateId: 'dir.mission', variant: 'main', target: 1, progress: 0, doneAt: null },
    { templateId: 'dir.full-day', variant: 'main', target: 6, progress: 0, doneAt: null },
  ],
  allDoneAt: null,
};
const MISSION_ORDER: OrderTemplate = {
  id: 'dir.mission',
  factionId: 'collective',
  slot: 'B',
  title: 'Take on a mission anywhere in {city}',
  line: 'Any mission.',
  match: { kinds: ['mission'], cityId: 'home' },
  target: 1,
  counts: 'attempts',
  residence: 'any',
  minLevel: 6,
};
const TEMPLATES5 = [...TEMPLATES, MISSION_ORDER];

const T0 = Date.UTC(2026, 9, 3, 9);
const input = (over: Partial<MissionInput> = {}): MissionInput => ({
  mission: {
    id: 'coalport.shipyard.launch',
    type: 'speech',
    energy: 15,
    difficulty: 14,
    locationId: 'coalport.shipyard',
    cityId: 'coalport',
    locationKind: 'docks',
    pool: ['strike-picket', 'street-enforcer'],
  },
  way: { id: 'gantry', stats: ['str'] },
  values: { str: 19, int: 12, agi: 5, cha: 5 },
  energy: { value: 100, rested: 0, updatedAt: T0 },
  now: T0,
  standing: { successes: 0, names: NAMES, cityName: 'Coalport' },
  orders: ORDERS,
  orderTemplates: TEMPLATES5,
  homeCityId: 'coalport',
  factionId: 'collective',
  target: null,
  heat: { value: 0, at: T0 },
  rateOn: () => 5,
  record: 'clean',
  flags: { watched: false, warned: false },
  opponents: {
    sideOf: (id) =>
      id === 'city-police' ? 'police' : id.startsWith('strike') || id.startsWith('branch') ? 'collective' : 'vanguard',
    policeId: 'city-police',
  },
  ...over,
});
const start = (i: MissionInput, seed = 'mission-seed'): MissionStart => {
  const r = resolveMission(i, createRng(seed));
  if (!r.ok) throw new Error('refused');
  return r.start;
};

describe('resolveMission (ADR 0031 §3, design §4.6)', () => {
  it('determinism per seed; another seed rolls again', () => {
    const a = start(input(), 's1');
    expect(start(input(), 's1')).toEqual(a);
    const rolls = new Set(['s1', 's2', 's3', 's4', 's5', 's6'].map((s) => start(input(), s).attempt.roll));
    expect(rolls.size).toBeGreaterThan(1);
  });

  it('refuses short of Energy, spending nothing', () => {
    const r = resolveMission(input({ energy: { value: 14, rested: 0, updatedAt: T0 } }), createRng('x'));
    expect(r).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_ENERGY', cost: 15 });
  });

  it('the check at the mission difficulty; the rewards as rolled; the dropped twin is exactly Failure\'s XP', () => {
    for (const roll of [1, 60, 99]) {
      const s = start(input({ force: { checkRoll: roll }, energy: { value: 100, rested: 40, updatedAt: T0 } }));
      expect(s.attempt.check.difficulty).toBe(14);
      expect(s.attempt.check.chance).toBe(70);
      const want = roll <= 70 ? 'success' : roll <= 90 ? 'partial' : 'failure';
      expect(s.attempt.outcome).toBe(want);
      expect(s.rewards.dropped).toEqual(
        tier2Rewards({ type: 'speech', energy: 15, outcome: 'failure', restedUsed: 15, costPaid: 15 }),
      );
      expect(s.rewards.dropped.xp.total).toBe(23);
      expect(s.rewards.dropped.fxp.total + s.rewards.dropped.iron.total + s.rewards.dropped.opinion).toBe(0);
    }
  });

  it('a Success pays the table and advances the speech order and the mission order, not *Six wins*', () => {
    const s = start(input({ force: { checkRoll: 1 } }));
    expect([s.rewards.rolled.xp.total, s.rewards.rolled.iron.total, s.rewards.rolled.opinion]).toEqual([75, 60, 0.15]);
    // +25 % FXP for the first order it advances (the speech order): 12 + 3.
    expect(s.rewards.rolled.fxp.total).toBe(15);
    expect(s.orders.rolled.advanced).toBe('dir.say-it');
    expect(s.descriptor).toMatchObject({ kind: 'mission', type: 'speech' });
    expect(orderMatches(MISSION_ORDER.match, s.descriptor, 'coalport')).toBe(true);
    const sixWins = TEMPLATES.find((t) => t.id === 'dir.full-day')!;
    expect(orderMatches(sixWins.match, s.descriptor, 'coalport')).toBe(false);
    expect(s.standing).toEqual({ before: 0, rolled: 1, dropped: 0 });
    expect(s.opinion).toMatchObject({ mode: 'persuade', target: null, swing: { rolled: 0.15, dropped: 0 } });
  });

  it('Heat on every outcome (×2 on rival ground) and the run-in after the gain', () => {
    const vandal = input({
      mission: { ...input().mission, id: 'coalport.far-bank.posters', type: 'vandalism', energy: 10, pool: ['street-enforcer', 'city-police'] },
      way: { id: 'dark', stats: ['agi'] },
      target: 'vanguard',
      heat: { value: 20, at: T0 },
    });
    const s = start({ ...vandal, force: { checkRoll: 100 } });
    expect(s.attempt.outcome).toBe('failure');
    expect(s.heat).toMatchObject({ before: 20, after: 26, stateAfter: 'noticed' });
    expect(s.runIn.chance).toBe(20);
    expect(s.opinion).toMatchObject({ mode: 'against', target: 'vanguard', swing: { rolled: 0 } });
    const rival: PlaceModifiers = {
      sources: [],
      firedUp: false,
      place: { battleground: false, groundswell: null, issues: [], rivalGround: { homeFactionId: 'vanguard', unrest: false, pressureLeft: 2 } },
    };
    const r = start({ ...vandal, modifiers: rival, heat: { value: 0, at: T0 } });
    expect(r.heat.after).toBe(12);
    expect(r.runIn.chance).toBe(30);
    expect(r.attempt.check.bonuses).toContainEqual({ id: 'rivalGround', label: 'Rival ground', value: -16 });
    expect(r.opinion.cap).toBe(2);
    expect(r.orders.rolled.advanced).toBeNull();
    // A speech mission on rival ground draws from the home faction too.
    const speech = start({ ...input(), modifiers: rival });
    expect(speech.opinion).toMatchObject({ mode: 'against', target: 'vanguard', cap: 2 });
  });

  it('the forced run-in and opponent (test hooks); the opponent never of the actor\'s side', () => {
    const s = start(input({ force: { runIn: 'next' } }));
    expect(s.runIn.fires).toBe(true);
    expect(s.runIn.opponentId).toBe('street-enforcer');
    expect(start(input({ force: { runIn: 'never' } })).runIn.fires).toBe(false);
    expect(start(input({ force: { runIn: 'next', opponentId: 'city-police' } })).runIn.opponentId).toBe('city-police');
  });

  it('a speech mission in a close race carries +5 and the factor; vandalism does not', () => {
    const close: PlaceModifiers = { sources: [], firedUp: false, place: { battleground: true, groundswell: null, issues: [] } };
    const sp = start(input({ modifiers: close, force: { checkRoll: 1 } }));
    expect(sp.attempt.check.bonuses).toContainEqual({ id: 'battleground', label: 'Close race', value: 5 });
    expect(sp.opinion.factors).toEqual([{ id: 'battleground', label: 'Close race', pct: 25 }]);
    expect(sp.rewards.rolled.opinion).toBe(0.188);
    const v = start(
      input({
        modifiers: close,
        mission: { ...input().mission, type: 'vandalism', energy: 10 },
        target: 'vanguard',
        force: { checkRoll: 1 },
      }),
    );
    expect(v.attempt.check.bonuses).toEqual([]);
    expect(v.opinion.factors).toEqual([]);
    expect(v.rewards.rolled.opinion).toBe(0.2);
  });

  it('Rally Permits takes a speech mission from 15 to 13 Energy; rewards stay on 15', () => {
    const rally: PlaceModifiers = {
      sources: [{ id: 'ord.rally-permits', name: 'Rally Permits', kind: 'ordinance', effects: [{ kind: 'energyDelta', actionType: 'speech', value: -2 }] }],
      firedUp: false,
    };
    const s = start(input({ modifiers: rally, force: { checkRoll: 1 } }));
    expect(s.energy.cost).toBe(13);
    expect(s.rewards.rolled.xp.total).toBe(75);
  });

  it('a speech mission is tagged by an Issue feed; an illegal one is not', () => {
    const issues = [
      { docId: 'coalport:1:issue.harbour-rates', issueId: 'issue.harbour-rates', name: 'Harbour Rates', feeds: [{ locationIds: ['coalport.shipyard'] }] },
    ];
    const tagged: PlaceModifiers = { sources: [], firedUp: false, place: { battleground: false, groundswell: null, issues } };
    const sp = start(input({ modifiers: tagged, force: { checkRoll: 1 } }));
    expect(sp.issues.map((x) => [x.issueId, x.points])).toEqual([['issue.harbour-rates', 15]]);
    const v = start(input({ modifiers: tagged, mission: { ...input().mission, type: 'vandalism', energy: 10 }, target: 'vanguard' }));
    expect(v.issues).toEqual([]);
    const fail = start(input({ modifiers: tagged, force: { checkRoll: 100 } }));
    expect(fail.points).toBe(0);
  });
});

describe('Agility +¼ (design §4.1)', () => {
  const agiInput = input({ way: { id: 'roofs', stats: ['agi'] }, values: { str: 5, int: 5, agi: 30, cha: 5 } });
  const finish = (s: MissionStart, q: number) =>
    finishMission({
      start: s,
      runIn: null,
      opponentSide: null,
      caught: null,
      marks: [],
      arrests: [],
      agiQuarters: q,
      health: { damage: 0, at: T0 },
      level: 6,
      at: T0,
      today: 20_730,
      rateOn: () => 5,
      logId: null,
      bail: { alliance: false, sources: [] },
    });
  it('a quarter per paid Success on an Agility way; four make a point', () => {
    const s = start({ ...agiInput, force: { checkRoll: 1 } });
    expect(s.agility).toBe(true);
    expect(finish(s, 0).agility).toEqual({ quarters: 1, gained: true, statUp: false });
    expect(finish(s, 3).agility).toEqual({ quarters: 0, gained: true, statUp: true });
    const partial = start({ ...agiInput, force: { checkRoll: 99 } });
    expect(finish(partial, 2).agility).toEqual({ quarters: 2, gained: false, statUp: false });
    expect(finish(start({ ...input(), force: { checkRoll: 1 } }), 2).agility).toBeNull();
  });
});

describe('orders (design §12.2)', () => {
  it('minLevel: the mission order enters slot B at Level 6, not before; default Level 1', () => {
    const slotB = (level?: number) =>
      [20_730, 20_731, 20_732, 20_733, 20_734].map((d) => ordersForDay(TEMPLATES5, d, 'home', level)[1]!.id);
    expect(slotB(5)).not.toContain('dir.mission');
    expect(slotB()).not.toContain('dir.mission');
    expect(slotB(6)).toContain('dir.mission');
    expect(startOrders(TEMPLATES5, 20_731, false, undefined, undefined, 0, 'home', 6).items.map((i) => i.templateId)).toEqual(
      ordersForDay(TEMPLATES5, 20_731, 'home', 6).map((t) => t.id),
    );
  });

  it('review 4 #22: `offerable` keeps the mission order out of slot B on a day there is no mission to start', () => {
    const noMission = (t: (typeof TEMPLATES5)[number]) => !(t.match.kinds ?? []).includes('mission');
    const days = [20_730, 20_731, 20_732, 20_733, 20_734];
    const slotB = (offerable?: typeof noMission) =>
      days.map((d) => ordersForDay(TEMPLATES5, d, 'home', 6, offerable)[1]!.id);
    expect(slotB()).toContain('dir.mission');
    expect(slotB(noMission)).not.toContain('dir.mission');
    // Slot B still has an order every day, and the other slots are as before.
    for (const d of days) {
      const withIt = ordersForDay(TEMPLATES5, d, 'home', 6);
      const without = ordersForDay(TEMPLATES5, d, 'home', 6, noMission);
      expect(without).toHaveLength(withIt.length);
      expect([without[0]!.id, without[2]!.id]).toEqual([withIt[0]!.id, withIt[2]!.id]);
    }
    expect(
      startOrders(TEMPLATES5, 20_731, false, undefined, undefined, 0, 'home', 6, noMission).items.map(
        (i) => i.templateId,
      ),
    ).toEqual(ordersForDay(TEMPLATES5, 20_731, 'home', 6, noMission).map((t) => t.id));
  });
  it('kinds mission; nothing matches on rival ground', () => {
    const d: ActionDescriptor = { kind: 'mission', type: 'vandalism', cityId: 'coalport', actionId: 'x' };
    expect(orderMatches({ kinds: ['mission'], cityId: 'home' }, d, 'coalport')).toBe(true);
    expect(orderMatches({ kinds: ['mission'], cityId: 'home' }, d, { cityId: 'coalport', districtId: null, rivalGround: true })).toBe(false);
    expect(orderMatches({ kinds: ['training'] }, { kind: 'training' }, { cityId: 'coalport', districtId: null, rivalGround: true })).toBe(false);
    expect(orderMatches({ actionTypes: ['speech'] }, d, 'coalport')).toBe(false);
  });
});
