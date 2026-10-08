import {
  actionResultFixture,
  batchResultFixture,
  missionResultFixture,
  trainingResultFixture,
} from '@irongate/rules/testing';
import type { ActionResult } from '@irongate/rules';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KNOCK_ONS_SHOWN, ResultModal, fitTagCount, howItWent, knockOnLines } from '../src';

/**
 * Review 5 (answers §17, §18 Q1–Q3; tech design §4): the compact result modal. *How it went* only
 * when it says what the stamp does not; the tags on one line; four receipt lines and *Details*; three
 * knock-ons and *n more*.
 */

const noReasons = { byRow: new Map<number, string>(), shared: null };
const at = (o: 'success' | 'partial' | 'failure', xp: number, index = 1) => ({
  ...actionResultFixture.attempts[0]!,
  index,
  outcome: o,
  rewards: { ...actionResultFixture.attempts[0]!.rewards, xp: { base: xp, bonus: 0, total: xp } },
});

describe('howItWent (answers §17.2 item 3)', () => {
  it('a ×1 Success: nothing (the stamp says it)', () => {
    expect(howItWent(actionResultFixture, noReasons)).toEqual({ kind: 'none' });
  });

  it('a ×1 Partial or Failure: one reason line', () => {
    const reasons = { byRow: new Map([[1, 'Bad luck. Try again.']]), shared: null };
    for (const o of ['partial', 'failure'] as const)
      expect(howItWent({ attempts: [at(o, 23)] }, reasons)).toEqual({
        kind: 'reason',
        text: 'Bad luck. Try again.',
      });
  });

  it('a ×3, 2 of 3: one Courier line of the rows, then the reason', () => {
    const r = { attempts: [at('success', 45, 1), at('partial', 23, 2), at('success', 45, 3)] };
    expect(howItWent(r, { byRow: new Map([[2, 'Bad luck.']]), shared: null })).toEqual({
      kind: 'rows',
      line: '1 · Success · +45 · 2 · Partial · +23 · 3 · Success · +45',
      reason: 'Bad luck.',
    });
    // A shared cause is the one reason printed.
    expect(howItWent(r, { byRow: new Map(), shared: '2 of 3 didn’t come off.' })).toMatchObject({
      reason: '2 of 3 didn’t come off.',
    });
    expect(howItWent({ attempts: [at('success', 45, 1), at('success', 45, 2)] }, noReasons)).toMatchObject({
      reason: null,
    });
  });

  it('a run-in: its block as built', () => {
    expect(howItWent(missionResultFixture, noReasons)).toEqual({ kind: 'runIn' });
  });

  it('training: nothing (the stamp and the trained stat say it)', () => {
    expect(howItWent(trainingResultFixture, noReasons)).toEqual({ kind: 'none' });
  });
});

describe('fitTagCount (answers §17.2 item 4)', () => {
  const more = () => 50;
  it('every tag when they all fit', () => {
    expect(fitTagCount([100, 80, 60], 100 + 80 + 60 + 2 * 10, 10, more)).toBe(3);
  });
  it('all but one, leaving room for *· +1 more*', () => {
    // 100 + 10 + 80 = 190; with " · +1 more" 250 fits in 260; the third tag would need 260 alone.
    expect(fitTagCount([100, 80, 60], 259, 10, more)).toBe(2);
  });
  it('none when the first does not fit beside its *+n more*', () => {
    expect(fitTagCount([300, 80], 320, 10, more)).toBe(0);
    expect(fitTagCount([], 0, 10, more)).toBe(0);
  });
});

/** A result with seven knock-ons: a point to place, Heat, an order, an Issue, PC, Reputation, Energy. */
const seven: ActionResult = {
  ...actionResultFixture,
  effects: {
    ...actionResultFixture.effects,
    levelUp: { from: 1, to: 2, statPoints: 1 },
    pc: { before: 0, after: 5 },
    orders: [{ id: 'o1', title: 'Talk to the shift', before: 0, after: 1, target: 2, done: false, fxp: 0 }],
    issues: [
      {
        issueId: 'issue.a',
        name: 'Tram Fare Hike',
        factionId: 'collective',
        added: 10,
        totals: { collective: 130, vanguard: 85, alliance: 0 },
        leader: 'collective',
      },
    ],
    heat: {
      before: 0,
      gain: 6,
      after: 6,
      state: 'cool',
      stateBefore: 'cool',
      coolsAt: null,
      first: false,
    },
  },
};

describe('knockOnLines (answers §17.2 item 6, §18 Q3)', () => {
  it('seven knock-ons: three shown in the priority, four behind *n more*', () => {
    const lines = knockOnLines(seven, { statPending: 1 });
    expect(lines.map((l) => l.key)).toEqual([
      'placeIt',
      'heat',
      'order',
      'issue',
      'pc',
      'standing',
      'energy',
    ]);
    expect(lines.slice(0, KNOCK_ONS_SHOWN).map((l) => l.id)).toEqual(['placeIt', 'heat', 'order:o1']);
    expect(lines.length - KNOCK_ONS_SHOWN).toBe(4);
  });

  it('a *Trained* result puts the trained stat first', () => {
    expect(knockOnLines(trainingResultFixture, { statPending: 0 })[0]!.key).toBe('trained');
  });

  it('a done order is its signed line; the item never comes here', () => {
    const lines = knockOnLines(batchResultFixture, { statPending: 1 });
    expect(lines.some((l) => l.id.startsWith('order-signed:'))).toBe(true);
    expect(lines.some((l) => l.id.startsWith('order:'))).toBe(false);
    expect(lines.some((l) => l.key === 'item')).toBe(false);
  });
});

function renderModal(result: ActionResult) {
  render(
    <ResultModal
      result={result}
      open
      onOpenChange={vi.fn()}
      onAgain={vi.fn()}
      energy={{ value: 90, nextTickAt: null }}
      statPoints={{ pending: 1, level: 2, stats: { str: 10, int: 12, agi: 5 } }}
      onPlaceStat={vi.fn()}
    />,
  );
  return within(screen.getByRole('dialog'));
}

describe('the compact modal (answers §17.2)', () => {
  it('no *How it went* heading on a ×1 Success; the picture is 112 / 136 / 150 by height', () => {
    const d = renderModal(actionResultFixture);
    expect(d.queryByText('How it went')).toBeNull();
    expect(d.queryByTestId('attempt-row')).toBeNull();
    const art = screen.getByRole('dialog').querySelector('[data-art]')!;
    expect(art).toHaveClass(
      'h-[112px]',
      '[@media(min-height:800px)]:h-[136px]',
      '[@media(min-height:900px)]:h-[150px]',
    );
  });

  it('the receipt prints no note under Iron or opinion; XP and Party XP keep their distance', () => {
    const d = renderModal({
      ...actionResultFixture,
      rewards: { ...actionResultFixture.rewards, iron: { base: 20, bonus: 5, total: 25 } },
    });
    expect(within(d.getByTestId('reward-iron')).queryByTestId('reward-note')).toBeNull();
    expect(within(d.getByTestId('reward-opinion')).queryByTestId('reward-note')).toBeNull();
    expect(within(d.getByTestId('reward-xp')).getByTestId('reward-note')).toHaveTextContent(
      /^105 to Level 2$/,
    );
    expect(within(d.getByTestId('reward-fxp')).getByTestId('reward-note')).toHaveTextContent(
      /^6 \/ 400 to Activist$/,
    );
  });

  it('*Details* reveals the parts and the meter in place, with aria-expanded', async () => {
    const user = userEvent.setup();
    const d = renderModal({
      ...actionResultFixture,
      rewards: { ...actionResultFixture.rewards, iron: { base: 20, bonus: 5, total: 25 } },
    });
    const toggle = d.getByRole('button', { name: /^Details/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(d.getByTestId('result-details-list')).not.toBeVisible();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(d.getByTestId('result-details-list')).toBeVisible();
    expect(d.getByTestId('detail-iron')).toHaveTextContent('Iron · +20 and +5 bonus');
    expect(d.getByTestId('detail-opinion')).toHaveTextContent('Collective 70.0 → 70.1 %');
  });

  it('three knock-ons and *4 more*, which reveals the rest in place', async () => {
    const user = userEvent.setup();
    const d = renderModal(seven);
    const first = within(d.getByTestId('effect-lines')).getAllByRole('listitem');
    expect(first).toHaveLength(3);
    expect(first[0]).toHaveTextContent('Level 2 · one point to place');
    expect(d.getByTestId('effect-more')).not.toBeVisible();
    const more = d.getByRole('button', { name: /^4 more/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(d.getByTestId('effect-more')).toBeVisible();
    expect(within(d.getByTestId('effect-more')).getAllByRole('listitem')).toHaveLength(4);
    expect(d.getByTestId('effect-energy')).toBeVisible();
  });

  it('the tags are one line, no boxes, joined with ·', () => {
    const d = renderModal(batchResultFixture);
    const line = d.getByTestId('result-tags');
    expect(line).toHaveClass('whitespace-nowrap', 'overflow-x-clip');
    expect(line.querySelector('.border')).toBeNull();
    expect(line).toHaveTextContent(
      'Rested · 22 of 30 Energy, +37 % XP and Iron·Party order · +25 % Party XP',
    );
  });
});
