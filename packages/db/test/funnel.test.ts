import { describe, expect, it } from 'vitest';
import { buildArrivalFunnel, buildArrivalFunnels } from '../src/funnel';
import type { FunnelAction, FunnelArrival, FunnelCharacter } from '../src/funnel';

const T0 = Date.UTC(2026, 8, 29, 9);
const at = (s: number) => new Date(T0 + s * 1000);
const DAY = Math.floor(T0 / 86_400_000);

const arrival = (
  userId: string,
  answers: number[],
  joinAt: number | null,
  faction = 'collective',
): FunnelArrival => ({
  userId,
  createdAt: at(0),
  hasFace: true,
  answeredAt: answers.map(at),
  completedAt: joinAt === null ? null : at(joinAt),
  factionId: joinAt === null ? null : faction,
  characterId: joinAt === null ? null : `c-${userId}`,
});
const character = (
  userId: string,
  joinAt: number,
  job: number | null,
  faction = 'collective',
): FunnelCharacter => ({
  id: `c-${userId}`,
  factionId: faction,
  createdAt: at(joinAt),
  jobSinceDay: job,
  welcomeActionId: 'coalport.mill-gate.canvass',
});
const act = (userId: string, s: number, over: Partial<FunnelAction> = {}): FunnelAction => ({
  characterId: `c-${userId}`,
  createdAt: at(s),
  kind: 'checked',
  actionId: 'coalport.mill-gate.canvass',
  ordersCompleted: 0,
  allOrdersDone: false,
  ...over,
});

describe('the arrival funnel (tech design §14.1)', () => {
  const arrivals = [
    arrival('a', [10, 20, 30, 40, 50, 60], 120),
    arrival('b', [10, 20, 30], null),
    // Came back after an hour between answers 3 and 4, and still joined.
    arrival('c', [10, 20, 30, 3630, 3640, 3650], 3700, 'vanguard'),
  ];
  const characters = [character('a', 120, DAY), character('c', 3700, null, 'vanguard')];
  const actions = [
    act('a', 150),
    act('a', 170, { ordersCompleted: 1 }),
    act('a', 300, { kind: 'shift', actionId: 'coalport.mill-gate.shift', ordersCompleted: 1 }),
    act('a', 500, { actionId: 'coalport.union-hall.committee', ordersCompleted: 1, allOrdersDone: true }),
    act('a', 700, { kind: 'chapter', actionId: 'finish-his-work.1' }),
    act('c', 3800, { actionId: 'duskwall.archives.clerks' }),
  ];

  it('counts where players stop, and how long each step takes', () => {
    const f = buildArrivalFunnel(arrivals, characters, actions);
    expect(Object.fromEntries(f.steps.map((s) => [s.step, s.players]))).toMatchObject({
      accounts: 3,
      face: 3,
      'answer 3': 3,
      'answer 4': 2,
      joined: 2,
      'first action': 2,
      'welcome orders 3 / 3 on day 1': 1,
      'job taken on day 1': 1,
      'chapter 1 done on day 1': 1,
    });
    expect(f.times.signupToJoin).toEqual({ median: 120, p75: 3700 });
    expect(f.times.joinToFirstAction).toEqual({ median: 30, p75: 100 });
    expect(f.times.joinToAllOrders).toEqual({ median: 380, p75: 380 });
    expect(f.firstActionMatch).toBe(0.5);
    expect(f.secondTapAgain).toBe(1);
    expect(f.resumes).toBe(1);
  });

  it('splits by faction', () => {
    const { byFaction } = buildArrivalFunnels(arrivals, characters, actions);
    expect(Object.keys(byFaction)).toEqual(['collective', 'vanguard']);
    expect(byFaction.vanguard!.steps.find((s) => s.step === 'joined')?.players).toBe(1);
  });
});
