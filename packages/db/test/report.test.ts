import { describe, expect, it } from 'vitest';
import { buildPlaytestReport } from '../src/report';
import type { ReportAction } from '../src/report';

const T0 = Date.UTC(2026, 8, 29, 8);
const H = 3_600_000;
const act = (at: number, over: Partial<ReportAction> = {}): ReportAction => ({
  characterId: 'a',
  createdAt: new Date(at),
  kind: 'checked',
  times: 1,
  txAttempts: 1,
  energy: 10,
  level: 1,
  ordersCompleted: 0,
  ...over,
});

describe('buildPlaytestReport', () => {
  it('splits sessions on 30-minute gaps and measures returns', () => {
    const r = buildPlaytestReport(
      [{ id: 'a', name: 'Mara', createdAt: new Date(T0) }],
      [
        act(T0),
        act(T0 + 5 * 60_000, { times: 3, energy: 30, ordersCompleted: 1 }),
        act(T0 + 3 * H, { level: 2 }),
        act(T0 + 9 * H, { kind: 'shift', energy: 4, txAttempts: 2 }),
        act(T0 + 30 * H, { level: 4 }),
      ],
      [
        { characterId: 'a', day: 1, read: true },
        { characterId: 'a', day: 2, read: false },
      ],
    );
    const p = r.players[0]!;
    expect(p.sessions).toBe(4);
    expect(p.daysActive).toBe(2);
    expect(p.energyPerSession).toBe(16);
    expect(p.returns2to4h).toBe(0.33);
    expect(p.x3Share).toBe(0.2);
    expect(p.paperReadRate).toBe(0.5);
    expect(p.levelByDay).toEqual([2, 4, 4]);
    expect(p.shiftsPerDay).toBe(0.5);
    expect(r.overall.contendedTransactions).toBe(0.2);
    expect(r.overall.ordersPerDay).toBe(0.5);
  });

  it('handles a player with no actions', () => {
    const r = buildPlaytestReport([{ id: 'b', name: 'Idle', createdAt: new Date(T0) }], [], []);
    expect(r.players[0]).toMatchObject({ sessions: 0, medianReturnHours: null, paperReadRate: null });
  });
});
