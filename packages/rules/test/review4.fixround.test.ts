/**
 * Review 4, QA fix round (docs/qa/review-4-report.md m2): the welcome set is dealt once per character
 * (ADR 0073). On a late sign-up's second welcome day the evening's set goes on as it stands; a finished
 * set gives way to the rotation; anything else is dealt fresh.
 */
import { describe, expect, it } from 'vitest';
import { carriedWelcome } from '../src';
import type { OrderTemplate, OrdersState } from '../src';

const templates = [
  { id: 'dir.shift-change', match: { kinds: ['political'] } },
  { id: 'dir.welcome-b', match: { actionIds: ['coalport.union-hall.favour'] } },
  { id: 'dir.take-a-job', match: { kinds: ['takeJob'] } },
] as unknown as OrderTemplate[];
const item = (templateId: string, doneAt: number | null, progress = doneAt ? 1 : 0, target = 1) => ({
  templateId,
  variant: 'main' as const,
  target,
  progress,
  doneAt,
});
const DAY = 100;
const prev = (items: OrdersState['items'], extra: Partial<OrdersState> = {}): OrdersState => ({
  day: DAY,
  items,
  allDoneAt: null,
  ...extra,
});

describe('carriedWelcome (QA m2)', () => {
  it('carries the set on: the favour done stays done, the rest as it stood, the day turned, off ended', () => {
    const p = prev(
      [item('dir.shift-change', null, 1, 2), item('dir.welcome-b', 5), item('dir.take-a-job', null)],
      { off: { at: 7, reason: 'cells' } },
    );
    const c = carriedWelcome(p, DAY + 1, 'dir.welcome-b', templates, false, 999);
    expect(c).toEqual({
      day: DAY + 1,
      items: [item('dir.shift-change', null, 1, 2), item('dir.welcome-b', 5), item('dir.take-a-job', null)],
      allDoneAt: null,
    });
  });

  it('a job taken counts for Take a job, as on any dealing', () => {
    const p = prev([item('dir.shift-change', null), item('dir.welcome-b', 5), item('dir.take-a-job', null)]);
    const c = carriedWelcome(p, DAY + 1, 'dir.welcome-b', templates, true, 999);
    expect(c !== null && c !== 'rotation' && c.items[2]).toEqual(item('dir.take-a-job', 999));
  });

  it('a finished set gives way to the rotation', () => {
    const done = [item('dir.shift-change', 1), item('dir.welcome-b', 2), item('dir.take-a-job', 3)];
    expect(carriedWelcome(prev(done), DAY + 1, 'dir.welcome-b', templates, false, 9)).toBe('rotation');
    expect(carriedWelcome(prev(done, { allDoneAt: 3 }), DAY + 1, 'dir.welcome-b', templates, false, 9)).toBe(
      'rotation',
    );
  });

  it('dealt fresh when yesterday held no welcome set, or the orders are already today’s', () => {
    const rot = prev([item('dir.shift-change', null), item('dir.take-a-job', null)]);
    expect(carriedWelcome(rot, DAY + 1, 'dir.welcome-b', templates, false, 9)).toBeNull();
    const today = prev([item('dir.welcome-b', null)]);
    expect(carriedWelcome(today, DAY, 'dir.welcome-b', templates, false, 9)).toBeNull();
  });
});
