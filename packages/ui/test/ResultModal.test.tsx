import { actionResultFixture, batchResultFixture, trainingResultFixture } from '@irongate/rules/testing';
import type { ActionResult } from '@irongate/rules';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultModal } from '../src';

function renderModal(result: ActionResult, energy = { value: 90, nextTickAt: null as number | null }) {
  const onOpenChange = vi.fn();
  const onAgain = vi.fn();
  const onPlaceStat = vi.fn();
  render(
    <ResultModal
      result={result}
      open
      onOpenChange={onOpenChange}
      onAgain={onAgain}
      energy={energy}
      statPoints={{
        pending: result.character.statPointsPending,
        level: result.character.level,
        stats: { str: 10, int: 12, agi: 5 },
      }}
      onPlaceStat={onPlaceStat}
    />,
  );
  return { onOpenChange, onAgain, onPlaceStat, dialog: screen.getByRole('dialog') };
}

describe('ResultModal v2', () => {
  it('×1 Success: the six sections of §13.1a from the server breakdown', () => {
    const { dialog } = renderModal(actionResultFixture);
    const d = within(dialog);
    expect(d.getByTestId('stamp')).toHaveTextContent('Success');
    expect(d.getByText('Coalport · Mill Gate · 09:00')).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName('The whistle goes, and they stop');
    const rows = d.getAllByTestId('attempt-row');
    expect(rows).toHaveLength(1);
    // Review 2 (GDD §8.4, answers §2.3): the outcome and its XP; no chance, roll or reason on a Success.
    expect(within(rows[0]!).getByTestId('attempt-outcome')).toHaveTextContent('Success');
    expect(rows[0]).toHaveTextContent('+45 XP');
    expect(within(rows[0]!).queryByTestId('attempt-reason')).toBeNull();
    expect(rows[0]!.textContent).not.toMatch(/%|Rolled|roll/);
    expect(within(rows[0]!).queryByRole('button')).toBeNull();
    // Review 3 (answers §3): the receipt, one line per reward in a fixed order, the value at the right.
    const lines = within(d.getByTestId('receipt')).getAllByRole('listitem');
    expect(lines.map((l) => l.dataset.testid)).toEqual([
      'reward-xp',
      'reward-fxp',
      'reward-iron',
      'reward-opinion',
    ]);
    const xp = within(d.getByTestId('reward-xp'));
    expect(xp.getByTestId('reward-label')).toHaveTextContent(/^XP$/);
    expect(xp.getByTestId('reward-value')).toHaveTextContent(/^\+45$/);
    // The HUD's own distance to the next Level, and its bar in miniature.
    expect(xp.getByTestId('reward-note')).toHaveTextContent(/^105 to Level 2$/);
    expect(xp.getByRole('progressbar', { name: 'XP' })).toHaveAttribute('aria-valuenow', '45');
    const fxp = within(d.getByTestId('reward-fxp'));
    expect(fxp.getByTestId('reward-value')).toHaveTextContent('+6');
    expect(fxp.getByTestId('reward-note')).toHaveTextContent(/^6 \/ 400 to Activist$/);
    expect(fxp.getByRole('progressbar', { name: 'Party XP' })).toBeInTheDocument();
    expect(d.getByTestId('reward-iron')).toHaveTextContent(/^Iron\+20$/);
    // No bar on Iron or opinion.
    expect(within(d.getByTestId('reward-iron')).queryByRole('progressbar')).toBeNull();
    expect(d.getByTestId('reward-opinion')).toHaveTextContent(
      'Opinion in Coalport+0.05 %Collective 70.0 → 70.1 %',
    );
    // The knock-on block keeps Energy and Reputation; the before → after lines moved to the receipt.
    expect(d.queryByTestId('effect-opinion')).toBeNull();
    expect(d.getByTestId('effect-standing')).toHaveTextContent('Stranger · 1 / 10 to Familiar');
    expect(d.getByTestId('effect-energy')).toHaveTextContent('100 → 90');
    expect(d.queryByText('Experience')).toBeNull();
    // Review 3 (answers §4): the buttons say what they do and what they cost.
    expect(d.getByRole('button', { name: 'Once more · 10 Energy' })).toBeEnabled();
    expect(d.getByRole('button', { name: 'Three more · 30 Energy' })).toBeEnabled();
    expect(d.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('a ×3 batch: "2 of 3", three rows, Rested and order tags, the order line, level-up with STR / INT', async () => {
    const user = userEvent.setup();
    const { dialog, onPlaceStat } = renderModal(batchResultFixture, {
      value: 25,
      nextTickAt: Date.UTC(2026, 8, 29, 9, 10),
    });
    const d = within(dialog);
    expect(d.getByTestId('stamp')).toHaveTextContent('2 of 3');
    expect(d.getByText('Canvass the shift change · 3 times')).toBeInTheDocument();
    expect(d.getAllByTestId('attempt-row')).toHaveLength(3);
    // The non-Success row carries one plain reason, no digits (answers §2.4).
    const partial = d.getAllByTestId('attempt-row').find((r) => r.dataset.outcome !== 'success')!;
    expect(within(partial).getByTestId('attempt-reason').textContent).not.toMatch(/\d/);
    expect(d.getByText('Rested · 22 of 30 Energy, +37 % XP and Iron')).toBeInTheDocument();
    expect(d.getByText('Party order · +25 % Party XP')).toBeInTheDocument();
    expect(d.getByTestId('effect-order')).toHaveTextContent('0 → 2 / 2 ✓');
    // Review 1 (answers §6): a signed line from the secretary.
    expect(d.getByTestId('effect-order-signed')).toHaveTextContent(
      /^Done, that one · \+20 Party XP\. (One|Two) to go\. — P\.H\.$/,
    );
    expect(d.getByTestId('effect-level')).toHaveTextContent('Level 2 · place your point');
    await user.click(d.getByRole('button', { name: 'STR 10 → 11' }));
    expect(onPlaceStat).toHaveBeenCalledWith('str');
    // 25 Energy: once is fine, three need 30; the disabled button keeps its label and cost.
    expect(d.getByRole('button', { name: 'Once more · 10 Energy' })).toBeEnabled();
    expect(d.getByRole('button', { name: 'Three more · 30 Energy' })).toBeDisabled();
    expect(d.getByTestId('again-three')).toHaveTextContent('30 Energy');
    expect(d.getByTestId('again-hint')).toHaveTextContent(
      /^Three more needs 30 Energy · ready at \d\d:\d\d$/,
    );
    // The parts of a reward, worded ("+40 and Rested +5").
    expect(within(d.getByTestId('reward-xp')).getByTestId('reward-note').textContent).toMatch(/^\+\d+ and /);
  });

  it('review 2: the reason names where to train the stat; nothing opens on a tap', () => {
    const low = {
      ...actionResultFixture,
      stamp: 'partial' as const,
      attempts: [
        {
          ...actionResultFixture.attempts[0]!,
          outcome: 'partial' as const,
          roll: 60,
          check: {
            ...actionResultFixture.attempts[0]!.check,
            statValues: [5],
            statValue: 5,
            statTerm: -12,
            raw: 38,
            chance: 38,
          },
        },
      ],
    };
    render(
      <ResultModal
        result={low}
        open
        onOpenChange={() => undefined}
        trainingPlaces={{ int: 'the Union Hall' }}
      />,
    );
    const row = screen.getAllByTestId('attempt-row')[0]!;
    expect(within(row).getByTestId('attempt-outcome')).toHaveTextContent('Partial');
    expect(within(row).getByTestId('attempt-reason')).toHaveTextContent(
      'Your Intelligence is low for this. Raise it at the Union Hall.',
    );
    expect(within(row).queryByRole('button')).toBeNull();
  });

  it('training: Trained, one "always works" row, Intelligence 12 → 13', () => {
    const { dialog } = renderModal(trainingResultFixture, {
      value: 5,
      nextTickAt: Date.UTC(2026, 8, 29, 9, 10),
    });
    const d = within(dialog);
    expect(d.getByTestId('stamp')).toHaveTextContent('Trained');
    expect(d.getByText('44 Energy · always works')).toBeInTheDocument();
    expect(d.getByTestId('effect-stat')).toHaveTextContent('Intelligence 12 → 13');
    // Review 3 (answers §3.2): a zero line is not printed; a training result is one line, XP.
    const lines = within(d.getByTestId('receipt')).getAllByRole('listitem');
    expect(lines.map((l) => l.dataset.testid)).toEqual(['reward-xp']);
    expect(d.queryByTestId('reward-fxp')).toBeNull();
    expect(d.queryByTestId('reward-iron')).toBeNull();
    expect(d.queryByTestId('reward-opinion')).toBeNull();
    // ×1 only (§8.5): the verb's repeat (review 3: "Study again · 46 Energy") · Continue.
    expect(d.queryByRole('button', { name: /Three more/ })).toBeNull();
    expect(d.getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(d.getByRole('button', { name: 'Study again · 46 Energy' })).toBeDisabled();
    expect(d.getByTestId('again-hint')).toHaveTextContent(
      /^Study again needs 46 Energy · ready at \d\d:\d\d$/,
    );
  });

  it('keeps Again and Continue in a sticky bar at the bottom of the modal (m2)', () => {
    const { dialog } = renderModal(actionResultFixture);
    const bar = within(dialog).getByTestId('result-buttons');
    expect(bar).toHaveClass('sticky', 'bottom-0');
    expect(within(bar).getByRole('button', { name: 'Once more · 10 Energy' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Three more · 30 Energy' })).toBeInTheDocument();
    // Review 3 (answers §8.5): no button's text ends in a bare number; a cost is always "n Energy".
    for (const b of within(bar).getAllByRole('button')) {
      const text = b.textContent!.replace(/\s+/g, ' ').trim();
      if (/\d$/.test(text)) throw new Error(`a bare number: ${text}`);
      if (/\d/.test(text)) expect(text).toMatch(/\d+ Energy$/);
    }
    expect(within(bar).getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('Continue closes; Again asks for another run with its count', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onAgain } = renderModal(actionResultFixture);
    await user.click(screen.getByRole('button', { name: 'Three more · 30 Energy' }));
    expect(onAgain).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('m5: the order that completes all three shows "All orders carried out · +5 Political Capital"', () => {
    const { dialog } = renderModal({
      ...actionResultFixture,
      effects: { ...actionResultFixture.effects, ordersAllDone: { pc: 5 }, pc: { before: 0, after: 5 } },
    });
    const d = within(dialog);
    expect(d.getByTestId('effect-all-orders')).toHaveTextContent(
      'All orders carried out · +5 Political Capital',
    );
    expect(d.getByText('Political Capital')).toBeInTheDocument();
  });

  it('m1: the Faction XP and opinion values use the faction text colour, never the fill colour', () => {
    for (const [factionId, cls] of [
      ['vanguard', 'text-vanguard-text'],
      ['alliance', 'text-alliance-text'],
      ['collective', 'text-collective'],
    ] as const) {
      const { dialog } = renderModal({
        ...actionResultFixture,
        character: { ...actionResultFixture.character, factionId },
      });
      const value = within(dialog).getByTestId('reward-fxp').querySelector(`.${cls}`);
      expect(value, factionId).not.toBeNull();
      expect(within(dialog).getByTestId('reward-opinion').querySelector(`.${cls}`), factionId).not.toBeNull();
      cleanup();
    }
  });

  it('review 3: a result with no Party XP prints no Party XP line (zero lines are not printed)', () => {
    const { dialog } = renderModal({
      ...actionResultFixture,
      rewards: { ...actionResultFixture.rewards, fxp: { base: 0, bonus: 0, total: 0 } },
    });
    expect(within(dialog).queryByTestId('reward-fxp')).toBeNull();
    expect(within(dialog).getByTestId('reward-xp')).toBeInTheDocument();
  });

  it('review 3: at the top Rank the Party XP bar is full and the note reads the total', () => {
    const { dialog } = renderModal({
      ...actionResultFixture,
      character: {
        ...actionResultFixture.character,
        fxp: 25_000,
        rank: { ...actionResultFixture.character.rank, fxpNext: null, nextTitle: null },
      },
    });
    const fxp = within(within(dialog).getByTestId('reward-fxp'));
    expect(fxp.getByTestId('reward-note')).toHaveTextContent(/^25,000 Party XP$/);
    const bar = fxp.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', bar.getAttribute('aria-valuemax')!);
  });

  it('renders nothing without a result', () => {
    render(<ResultModal result={null} open onOpenChange={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
