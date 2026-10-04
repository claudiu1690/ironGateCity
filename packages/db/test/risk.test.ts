import { dayKey } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import { AGAIN_WINDOW_MS, buildRiskReport, dayLabel, riskTables } from '../src/risk';
import type { RiskActionLog, RiskEncounter, RiskInput, RiskJourney, RiskResult, RiskStay } from '../src/risk';

/** Slice 5 (tech design §15.2): the risk section of the playtest report, from fixtures. */

const T0 = Date.UTC(2026, 9, 5, 9);
const at = (min: number) => new Date(T0 + min * 60_000);
const DAY = 24 * 60;
const D0 = dayKey(T0);

const HOMES = [
  { cityId: 'duskwall', factionId: 'vanguard' },
  { cityId: 'coalport', factionId: 'collective' },
  { cityId: 'ashford', factionId: 'alliance' },
];

const log = (characterId: string, min: number, over: Partial<RiskActionLog> = {}): RiskActionLog => ({
  characterId,
  createdAt: at(min),
  kind: 'checked',
  actionId: 'canvass',
  cityId: 'coalport',
  times: 1,
  outcome: 'success',
  encounterId: null,
  result: null,
  ...over,
});

const mission = (
  type: string,
  way: string,
  check: 'success' | 'partial' | 'failure',
  over: RiskResult = {},
): RiskResult => ({
  mission: { type, way: { id: way } },
  attempts: [{ outcome: check }],
  ...over,
});

const fxp = (gain: number) => ({ before: 100, after: 100 + gain });

const encounter = (id: string, characterId: string, over: Partial<RiskEncounter> = {}): RiskEncounter => ({
  id,
  characterId,
  kind: 'mission',
  refId: 'm',
  cityId: 'coalport',
  day: D0,
  rivalGround: false,
  state: 'resolved',
  choice: 'fight',
  by: 'player',
  outcome: 'won',
  payOff: null,
  createdAt: at(0),
  ...over,
});

const stay = (characterId: string, over: Partial<RiskStay> = {}): RiskStay => ({
  characterId,
  kind: 'cells',
  cityId: 'coalport',
  rivalGround: false,
  since: at(0),
  releasedAt: null,
  how: null,
  ironPaid: 0,
  heatAtArrest: null,
  heatAfter: null,
  ...over,
});

const journey = (characterId: string, over: Partial<RiskJourney> = {}): RiskJourney => ({
  characterId,
  to: 'duskwall',
  boardedAt: at(0),
  kind: 'ticket',
  rivalGround: true,
  card: null,
  choice: null,
  sleptThrough: false,
  ...over,
});

/**
 * a (Vanguard): two vandalism missions in Coalport (rival ground), the second by Again, taken in,
 * bailed out after 7 minutes; back on day 1. b (Collective): a speech at home whose run-in he ran
 * from, a rival tap whose run-in luck lost (the infirmary, discharged after 8 minutes); not back on
 * day 1. c (Alliance): a tap in the capital, a run-in paid off, a hostile card that left him Hot.
 */
const input = (over: Partial<RiskInput> = {}): RiskInput => ({
  now: at(3 * DAY),
  homeCities: HOMES,
  characters: [
    {
      id: 'a',
      name: 'Anna',
      factionId: 'vanguard',
      homeCityId: 'duskwall',
      marks: [
        { day: D0, kind: 'minor', logId: 'l1' },
        { day: D0, kind: 'minor', logId: 'l2' },
      ],
    },
    { id: 'b', name: 'Bruno', factionId: 'collective', homeCityId: 'coalport', marks: [] },
    { id: 'c', name: 'Clara', factionId: 'alliance', homeCityId: 'ashford', marks: [] },
  ],
  actionLogs: [
    log('a', 0, {
      kind: 'mission',
      actionId: 'coalport.posters',
      result: mission('vandalism', 'agi', 'success', {
        street: {
          heat: { before: 10, after: 22 },
          record: { added: 1, escalated: false, before: 'clean', after: 'onFile' },
        },
        effects: {
          fxp: fxp(30),
          opinion: { applied: 1.5, mode: 'against', targetFactionId: 'collective', capped: false },
        },
      }),
    }),
    log('a', 5, {
      kind: 'mission',
      actionId: 'coalport.posters',
      outcome: 'takenIn',
      result: mission('vandalism', 'agi', 'failure', {
        street: {
          heat: { before: 30, after: 60 },
          record: { added: 1, escalated: false, before: 'onFile', after: 'onFile' },
        },
        effects: {
          fxp: fxp(0),
          opinion: { applied: 0.5, mode: 'against', targetFactionId: 'collective', capped: true },
        },
      }),
    }),
    log('a', DAY + 60, { cityId: 'duskwall', result: { effects: { fxp: fxp(10) } } }),
    log('b', 30, { times: 3, result: { effects: { fxp: fxp(10) } } }),
    // The run-in started at minute 58 and was answered at 61: the row is the run-in's.
    log('b', 61, {
      kind: 'mission',
      actionId: 'coalport.speech',
      encounterId: 'e1',
      result: mission('speech', 'cha-int', 'partial', {
        street: { heat: { before: 0, after: 0 }, runIn: { ironPaid: 0 }, dropped: 'ran' },
        effects: { fxp: fxp(20) },
      }),
    }),
    log('b', 120, {
      cityId: 'duskwall',
      outcome: 'carriedOff',
      encounterId: 'e2',
      result: {
        street: { runIn: { ironPaid: 0 } },
        effects: { fxp: fxp(0), opinion: { applied: 0.3, mode: 'persuade' } },
      },
    }),
    log('c', DAY + 30, { cityId: 'irongate', result: { effects: { fxp: fxp(5) } } }),
  ],
  encounters: [
    encounter('e1', 'b', { choice: 'run', outcome: 'ran', createdAt: at(58) }),
    encounter('e2', 'b', {
      kind: 'action',
      choice: 'fight',
      by: 'auto',
      outcome: 'lost',
      cityId: 'duskwall',
      rivalGround: true,
      createdAt: at(115),
    }),
    encounter('e3', 'c', {
      day: D0 + 1,
      choice: 'pay',
      outcome: 'paid',
      payOff: 40,
      createdAt: at(DAY + 40),
    }),
    encounter('e4', 'a', {
      day: D0 + 2,
      state: 'pending',
      choice: null,
      by: null,
      outcome: null,
      createdAt: at(2 * DAY),
    }),
  ],
  stays: [
    stay('a', {
      since: at(5),
      releasedAt: at(12),
      how: 'bail',
      ironPaid: 200,
      heatAtArrest: 60,
      heatAfter: 25,
      rivalGround: true,
    }),
    stay('b', {
      kind: 'infirmary',
      cityId: 'duskwall',
      since: at(120),
      releasedAt: at(128),
      how: 'discharge',
    }),
  ],
  journeys: [
    journey('c', {
      boardedAt: at(DAY),
      card: { eventId: 'card.lamp', deck: 'hostile' },
      choice: { choiceId: 'pay-the-lamp', at: at(DAY + 5), flag: 'watched', heat: { before: 45, after: 55 } },
    }),
    journey('b', {
      boardedAt: at(100),
      card: { eventId: 'card.papers', deck: 'hostile' },
      sleptThrough: true,
    }),
    journey('c', { to: 'irongate', rivalGround: false, boardedAt: at(DAY - 60) }),
    journey('a', { to: 'duskwall', kind: 'deported', rivalGround: false, boardedAt: at(12) }),
  ],
  ...over,
});

describe('risk report (slice 5)', () => {
  it('counts missions per type and day, the players who took one, and the repeats', () => {
    const r = buildRiskReport(input());
    expect(r.missions.attempts).toBe(3);
    expect(r.missions.players).toEqual({ active: 3, tookOne: 0.667, legal: 0.333, illegal: 0.333 });
    expect(r.missions.byDay).toEqual([
      {
        day: dayLabel(D0),
        byType: { speech: 1, surveillance: 0, vandalism: 2, disruption: 0, sabotage: 0, theft: 0 },
        attempts: 3,
        active: 2,
        tookOne: 1,
        legal: 0.5,
        illegal: 0.5,
      },
    ]);
    const vandalism = r.missions.byType.find((t) => t.type === 'vandalism')!;
    expect(vandalism).toMatchObject({
      attempts: 2,
      success: 0.5,
      partial: 0,
      failure: 0.5,
      takenIn: 1,
      again: 0.5,
    });
    const speech = r.missions.byType.find((t) => t.type === 'speech')!;
    expect(speech).toMatchObject({ attempts: 1, partial: 1, dropped: 1, again: 0 });
    expect(r.missions.byType.find((t) => t.type === 'theft')).toMatchObject({
      attempts: 0,
      success: null,
      again: null,
    });
  });

  it('infers Again only for the same mission and way within the window', () => {
    const later = AGAIN_WINDOW_MS / 60_000 + 1;
    const base = input();
    const logs = base.actionLogs.map((l, k) => (k === 1 ? { ...l, createdAt: at(later) } : l));
    expect(
      buildRiskReport({ ...base, actionLogs: logs }).missions.byType.find((t) => t.type === 'vandalism')!
        .again,
    ).toBe(0);
    const otherWay = base.actionLogs.map((l, k) =>
      k === 1 ? { ...l, result: { ...l.result, mission: { type: 'vandalism', way: { id: 'str' } } } } : l,
    );
    expect(
      buildRiskReport({ ...base, actionLogs: otherWay }).missions.byType.find((t) => t.type === 'vandalism')!
        .again,
    ).toBe(0);
  });

  it('counts run-ins, the choices, the rates and the loss rate on auto-resolve', () => {
    const r = buildRiskReport(input()).runIns;
    expect(r).toMatchObject({ total: 4, resolved: 3, pending: 1, perActivePlayer: 1.33 });
    expect(r.rates).toEqual({ won: 0, lost: 0.333, away: 0.667 });
    expect(r.auto).toEqual({ resolved: 1, lost: 1 });
    // The pay-off's row is missing, so the opponent's price stands in.
    expect(r.paidOff).toEqual({ runIns: 1, iron: 40 });
    expect(r.choices).toEqual([
      { by: 'player', fight: 0, run: 1, talk: 0, pay: 1, total: 2 },
      { by: 'luck', fight: 0, run: 0, talk: 0, pay: 0, total: 0 },
      { by: 'auto', fight: 1, run: 0, talk: 0, pay: 0, total: 1 },
    ]);
    expect(r.byDay.map((d) => [d.runIns, d.players, d.active])).toEqual([
      [2, 1, 2],
      [1, 1, 2],
      [1, 1, 0],
    ]);
    expect(r.byPlayer.find((p) => p.player === 'Bruno')).toEqual({
      player: 'Bruno',
      runIns: 2,
      won: 0,
      lost: 1,
      away: 1,
      auto: 1,
    });
  });

  it('prefers the Iron the resolving row paid', () => {
    const base = input();
    const logs = [
      ...base.actionLogs,
      log('c', DAY + 41, {
        encounterId: 'e3',
        cityId: 'irongate',
        result: { street: { runIn: { ironPaid: 44 } } },
      }),
    ];
    expect(buildRiskReport({ ...base, actionLogs: logs }).runIns.paidOff.iron).toBe(44);
  });

  it('reads Heat at mission time and approximates the time spent Hot or above', () => {
    const h = buildRiskReport(input()).heat;
    expect(h.atMission).toEqual({
      missions: 3,
      median: 10,
      byState: { cool: 2, noticed: 1, hot: 0, wanted: 0 },
    });
    // Anna: Heat 60 at the arrest, 25 at the bail seven minutes later. Clara: 55 from a card, then
    // nothing: (55 − 50 + 1) ÷ 5 = 1.2 hours.
    expect(h.hotOrAbove.players).toBe(2);
    expect(h.hotOrAbove.byPlayer).toEqual([
      { player: 'Anna', hours: 0.1 },
      { player: 'Clara', hours: 1.2 },
    ]);
    expect(h.hotOrAbove.hours).toBe(1.3);
  });

  it('reports the record, with fades estimated and strike-offs not recorded', () => {
    const r = buildRiskReport(input()).record;
    expect(r.marksAdded).toBe(2);
    expect(r.escalations).toBe(0);
    expect(r.byPlayer).toEqual([{ player: 'Anna', added: 2, onRecord: 2, level: 'onFile' }]);
    expect(r.levelRises).toEqual([{ from: 'clean', to: 'onFile', times: 1 }]);
    expect(r.fadesEstimated).toBe(0);
    expect(r.strikeOffs).toBeNull();
    // A fortnight on, both minor marks have faded.
    const later = buildRiskReport(input({ now: at(20 * DAY) })).record;
    expect(later.fadesEstimated).toBe(2);
    expect(later.byPlayer).toEqual([{ player: 'Anna', added: 2, onRecord: 0, level: 'clean' }]);
  });

  it('reports the cells and the infirmary, and who came back the next City Day', () => {
    const [cells, ward] = buildRiskReport(input()).held;
    expect(cells).toMatchObject({
      kind: 'cells',
      stays: 1,
      players: 1,
      bail: 1,
      served: 0,
      medianMinutesPaid: 7,
      medianMinutesServed: null,
      iron: 200,
      bailIron: 200,
      cameBack: { players: 1, of: 1, share: 1 },
    });
    expect(ward).toMatchObject({
      kind: 'infirmary',
      stays: 1,
      discharge: 1,
      medianMinutesPaid: 8,
      cameBack: { players: 0, of: 1, share: 0 },
    });
    // Taken in today: the next City Day is not over, so the stay is not counted yet.
    const fresh = buildRiskReport(input({ now: at(10) })).held[0]!;
    expect(fresh.cameBack).toEqual({ players: 0, of: 0, share: null });
  });

  it('reports rival ground: trips, cards, flags, Party XP, pressure and deportations', () => {
    const r = buildRiskReport(input()).rival;
    expect(r).toMatchObject({ trips: 2, travellers: 2, flags: { watched: 1, warned: 0 }, deportations: 1 });
    expect(r.byCity).toEqual([{ city: 'duskwall', trips: 2 }]);
    expect(r.cards).toEqual([
      { card: 'card.lamp (hostile)', choice: 'pay-the-lamp', times: 1 },
      { card: 'card.papers (hostile)', choice: 'slept through', times: 1 },
    ]);
    expect(r.partyXp).toEqual([
      { where: 'rival ground', actions: 3, partyXp: 30, perAction: 10 },
      { where: 'home', actions: 5, partyXp: 40, perAction: 8 },
      { where: 'elsewhere', actions: 1, partyXp: 5, perAction: 5 },
    ]);
    expect(r.pressure).toEqual([{ city: 'coalport', day: dayLabel(D0), lost: 2, capReached: true }]);
  });

  it('prints every table with plain labels', () => {
    const tables = riskTables(buildRiskReport(input()));
    expect(tables.map((t) => t.title)).toContain('Run-in choices');
    const overall = tables.find((t) => t.title === 'Run-ins: overall')!.rows[0]!;
    expect(overall['lost when left to luck (no answer)']).toBe('100 %');
    const record = tables.find((t) => t.title === 'The record')!.rows[0]!;
    expect(record['struck off']).toBe('not recorded');
    const held = tables.find((t) => t.title.startsWith('The cells'))!.rows;
    expect(held.map((x) => x['came back next day'])).toEqual(['100 % (1 of 1)', '0 % (0 of 1)']);
  });

  it('never throws on empty collections', () => {
    const r = buildRiskReport({
      now: at(0),
      homeCities: [],
      characters: [],
      actionLogs: [],
      encounters: [],
      stays: [],
      journeys: [],
    });
    expect(r.missions).toMatchObject({ attempts: 0, byDay: [], players: { active: 0, tookOne: null } });
    expect(r.missions.byType).toHaveLength(6);
    expect(r.runIns).toMatchObject({
      total: 0,
      perActivePlayer: null,
      rates: { won: null, lost: null, away: null },
    });
    expect(r.heat.atMission.median).toBeNull();
    expect(r.held.map((h) => h.stays)).toEqual([0, 0]);
    expect(r.rival).toMatchObject({ trips: 0, cards: [], pressure: [], deportations: 0 });
    const tables = riskTables(r);
    expect(tables.length).toBeGreaterThan(10);
    for (const t of tables)
      for (const row of t.rows) for (const v of Object.values(row)) expect(v).toBeDefined();
  });

  it('tolerates rows without a stored result', () => {
    const base = input();
    const logs = base.actionLogs.map((l) => ({ ...l, result: null }));
    const r = buildRiskReport({ ...base, actionLogs: logs });
    expect(r.missions.byType.find((t) => t.type === 'unknown')).toMatchObject({ attempts: 3 });
    expect(r.heat.atMission.missions).toBe(0);
  });
});
