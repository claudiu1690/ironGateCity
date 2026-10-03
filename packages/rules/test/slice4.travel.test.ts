/**
 * Slice 4, T1 (tech design §6.10): the week and travel. Legs, destination states, fares, the
 * journey card's draw and its choice.
 */
import { describe, expect, it } from 'vitest';
import {
  FACTION_IDS,
  createRng,
  dayKey,
  destinationState,
  drawJourneyCard,
  fare,
  isMonday,
  journeyProgress,
  legMinutes,
  nextMonday,
  resolveJourneyChoice,
  weekOf,
  weekday,
} from '../src';
import type { FactionId, JourneyChoiceSpec, ModifierSource, PlaceModifiers } from '../src';
import { fixedRng } from './helpers';

const day = (y: number, m: number, d: number) => dayKey(Date.UTC(y, m - 1, d));

describe('the week', () => {
  it('isMonday agrees with weekday over 800 days', () => {
    for (let d = 20_000; d < 20_800; d++) expect(isMonday(d)).toBe(weekday(d) === 0);
  });

  it('pins §3.1: 5 and 12 Oct 2026 are Mondays; week 20731 runs to 20737', () => {
    expect(day(2026, 1, 5)).toBe(20_458);
    expect(day(2026, 10, 5)).toBe(20_731);
    expect(isMonday(20_731)).toBe(true);
    expect(isMonday(20_738)).toBe(true);
    expect(isMonday(20_730)).toBe(false);
    expect(weekOf(20_737)).toBe(20_731);
    expect(weekOf(20_731)).toBe(20_731);
    expect(nextMonday(20_731)).toBe(20_738);
    expect(nextMonday(20_737)).toBe(20_738);
    // Mon 19 Oct 2026: a Monday and Irongate's cycle day 0 (tech design §17).
    expect(isMonday(day(2026, 10, 19))).toBe(true);
  });
});

const MINUTES = { irongate: 0, coalport: 12, ashford: 12, duskwall: 15, clearwater: 25 };

describe('legs and destinations', () => {
  it('the capital to each city, and outer to outer as the sum', () => {
    expect(legMinutes('irongate', 'coalport', MINUTES, 'irongate')).toBe(12);
    expect(legMinutes('ashford', 'irongate', MINUTES, 'irongate')).toBe(12);
    expect(legMinutes('irongate', 'duskwall', MINUTES, 'irongate')).toBe(15);
    expect(legMinutes('irongate', 'clearwater', MINUTES, 'irongate')).toBe(25);
    expect(legMinutes('coalport', 'duskwall', MINUTES, 'irongate')).toBe(27);
    expect(legMinutes('coalport', 'ashford', MINUTES, 'irongate')).toBe(24);
  });

  const HOMES: Record<string, FactionId> = {
    duskwall: 'vanguard',
    coalport: 'collective',
    ashford: 'alliance',
  };
  const HOME_OF: Record<FactionId, string> = {
    vanguard: 'duskwall',
    collective: 'coalport',
    alliance: 'ashford',
  };

  it('every destination state for each faction at Levels 9 and 10', () => {
    for (const f of FACTION_IDS) {
      for (const level of [9, 10]) {
        for (const to of ['irongate', 'coalport', 'duskwall', 'ashford', 'clearwater']) {
          const s = destinationState({
            to,
            here: HOME_OF[f],
            level,
            service: to === 'clearwater' ? 'later' : 'open',
            factionHomeOf: (c) => HOMES[c] ?? null,
            playerFaction: f,
            capitalId: 'irongate',
          });
          const want =
            level < 10
              ? 'level'
              : to === HOME_OF[f]
                ? 'here'
                : to === 'clearwater'
                  ? 'later'
                  : to === 'irongate'
                    ? 'open'
                    : 'rival';
          expect([f, level, to, s]).toEqual([f, level, to, want]);
        }
      }
    }
  });

  it('from the capital, the way home is open', () => {
    expect(
      destinationState({
        to: 'coalport',
        here: 'irongate',
        level: 10,
        service: 'open',
        factionHomeOf: (c) => HOMES[c] ?? null,
        playerFaction: 'collective',
        capitalId: 'irongate',
      }),
    ).toBe('open');
  });
});

const ticketSource = (id: string, name: string, kind: 'ordinance' | 'issue'): ModifierSource => ({
  id,
  name,
  kind,
  effects: [{ kind: 'ticketPct', value: -50 }],
});
const withSources = (...sources: ModifierSource[]): PlaceModifiers => ({ sources, firedUp: false });

describe('fares (ADR 0030)', () => {
  it('20, halved once to 10, twice to 5, and never below 5', () => {
    expect(fare()).toEqual({ base: 20, lines: [], total: 20 });
    const subsidy = ticketSource('ord.tram-subsidy', 'Tram Subsidy', 'ordinance');
    const hike = ticketSource('issue.tram-fares', 'Tram Fare Hike', 'issue');
    expect(fare(withSources(subsidy)).total).toBe(10);
    expect(fare(withSources(subsidy, hike))).toEqual({
      base: 20,
      lines: [
        { id: 'ord.tram-subsidy', label: 'Tram Subsidy', pct: -50 },
        { id: 'issue.tram-fares', label: 'Tram Fare Hike', pct: -50 },
      ],
      total: 5,
    });
    const third = ticketSource('x.third', 'A third', 'issue');
    expect(fare(withSources(subsidy, hike, third)).total).toBe(5);
    // Slice 3's shape: the ordinance alone.
    expect(
      fare({
        ordinance: {
          id: 'ord.tram-subsidy',
          name: 'Tram Subsidy',
          effects: [{ kind: 'ticketPct', value: -50 }],
        },
        firedUp: false,
      }).total,
    ).toBe(10);
  });
});

const DECK = [
  'jev.passenger',
  'jev.leaflets',
  'jev.parcel',
  'jev.cards',
  'jev.reporter',
  'jev.signal',
  'jev.boy',
];

describe('the journey card draw', () => {
  it('the first journey always draws the passenger', () => {
    for (let n = 0; n < 50; n++) {
      expect(
        drawJourneyCard({
          first: true,
          seen: [],
          deck: DECK,
          firstId: 'jev.passenger',
          rng: createRng(`s${n}`),
        }),
      ).toEqual({ eventId: 'jev.passenger', seen: ['jev.passenger'] });
    }
  });

  it('then one in three over 30,000 seeds (±1 %)', () => {
    let drawn = 0;
    const N = 30_000;
    for (let n = 0; n < N; n++) {
      const r = drawJourneyCard({
        first: false,
        seen: ['jev.passenger'],
        deck: DECK,
        firstId: 'jev.passenger',
        rng: createRng(`seed-${n}`),
      });
      if (r.eventId) drawn++;
    }
    expect(Math.abs(drawn / N - 1 / 3)).toBeLessThan(0.01);
  });

  it('all seven are seen before a repeat, then the round starts again', () => {
    let seen: string[] = [];
    const order: string[] = [];
    // A card on every draw: int(1, 3) → 1, then pick the first left.
    const rng = { seed: 'x', next: () => 0, int: (min: number) => min, roll100: () => 1 };
    for (let n = 0; n < 14; n++) {
      const r = drawJourneyCard({ first: n === 0, seen, deck: DECK, firstId: 'jev.passenger', rng });
      order.push(r.eventId!);
      seen = r.seen;
    }
    expect(new Set(order.slice(0, 7)).size).toBe(7);
    expect(new Set(order.slice(7, 14)).size).toBe(7);
  });

  it('is deterministic per seed, and no card leaves the seen list as it was', () => {
    const a = drawJourneyCard({
      first: false,
      seen: ['jev.passenger'],
      deck: DECK,
      firstId: 'jev.passenger',
      rng: createRng('j1'),
    });
    const b = drawJourneyCard({
      first: false,
      seen: ['jev.passenger'],
      deck: DECK,
      firstId: 'jev.passenger',
      rng: createRng('j1'),
    });
    expect(a).toEqual(b);
    const none = drawJourneyCard({
      first: false,
      seen: ['jev.passenger'],
      deck: DECK,
      firstId: 'jev.passenger',
      rng: fixedRng([2]),
    });
    expect(none).toEqual({ eventId: null, seen: ['jev.passenger'] });
  });
});

describe('progress and the choice', () => {
  it('progress clamps to 0…1', () => {
    expect(journeyProgress(1000, 2000, 500)).toBe(0);
    expect(journeyProgress(1000, 2000, 1500)).toBe(0.5);
    expect(journeyProgress(1000, 2000, 9000)).toBe(1);
  });

  const checked: JourneyChoiceSpec = {
    id: 'swap',
    stats: ['agi'],
    success: { rewards: { opinion: 0.05, fxp: 5 } },
    partial: { rewards: { opinion: 0.025, fxp: 2 } },
  };

  it('a checked choice never fails over 10,000 rolls (difficulty 10)', () => {
    const values = { str: 1, int: 1, agi: 1, cha: 0 };
    let partial = 0;
    for (let n = 0; n < 10_000; n++) {
      const r = resolveJourneyChoice({
        choice: checked,
        values,
        standingBonus: null,
        rng: createRng(`c${n}`),
      });
      expect(r.outcome === 'success' || r.outcome === 'partial').toBe(true);
      if (r.outcome === 'partial') {
        partial++;
        expect(r.rewards).toEqual({ opinion: 0.025, fxp: 2 });
      }
      expect(r.check!.difficulty).toBe(10);
    }
    expect(partial).toBeGreaterThan(0);
  });

  it('the Standing bonus is a row; an unchecked choice has no roll and pays its rewards', () => {
    const r = resolveJourneyChoice({
      choice: checked,
      values: { str: 10, int: 10, agi: 10, cha: 0 },
      standingBonus: { id: 'standing', label: 'Known in Irongate', value: 6 },
      rng: fixedRng([56]),
    });
    expect(r.check!.chance).toBe(56);
    expect(r.outcome).toBe('success');
    const talk = resolveJourneyChoice({
      choice: { id: 'listen', success: { rewards: { xp: 14 } } },
      values: { str: 10, int: 10, agi: 10, cha: 0 },
      standingBonus: null,
      rng: fixedRng([]),
    });
    expect(talk).toEqual({ outcome: 'chosen', check: null, roll: null, rewards: { xp: 14 }, cost: 0 });
    const sit = resolveJourneyChoice({
      choice: {
        id: 'sit',
        stats: ['int'],
        cost: { iron: 20 },
        success: { rewards: { iron: 40 } },
        partial: { rewards: { iron: 20 } },
      },
      values: { str: 10, int: 10, agi: 10, cha: 0 },
      standingBonus: null,
      rng: fixedRng([99]),
    });
    expect([sit.outcome, sit.cost, sit.rewards.iron]).toEqual(['partial', 20, 20]);
  });
});
