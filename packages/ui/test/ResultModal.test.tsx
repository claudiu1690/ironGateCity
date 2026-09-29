import {
  actionResultFixture,
  batchResultFixture,
  shiftResultFixture,
  trainingResultFixture,
} from '@irongate/rules/testing';
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
        stats: { str: 10, int: 12 },
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
    expect(within(rows[0]!).getByRole('img', { name: 'Chance 66 %, rolled 41' })).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/Rolled 41 against 66 % · INT 12 vs 8/)).toBeInTheDocument();
    expect(d.getByTestId('tile-experience')).toHaveTextContent('+45');
    expect(d.getByTestId('tile-faction-xp')).toHaveTextContent('+6');
    expect(d.getByTestId('tile-iron')).toHaveTextContent('+20');
    expect(d.getByTestId('tile-opinion')).toHaveTextContent('Coalport+0.05 %Collective opinion');
    expect(d.getByTestId('effect-opinion')).toHaveTextContent('70.0 → 70.1 %');
    expect(d.getByTestId('effect-standing')).toHaveTextContent('Stranger · 1 / 10 to Familiar');
    expect(d.getByTestId('effect-energy')).toHaveTextContent('100 → 90');
    expect(d.getByRole('button', { name: 'Again ×1' })).toBeEnabled();
    expect(d.getByRole('button', { name: 'Again ×3' })).toBeEnabled();
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
    expect(d.getByText('Rested: 22 of 30 Energy, +37 % XP and Iron')).toBeInTheDocument();
    expect(d.getByText('Party order: +25 % FXP')).toBeInTheDocument();
    expect(d.getByTestId('effect-order')).toHaveTextContent('0 → 2 / 2 ✓ · Party order complete: +20 FXP');
    expect(d.getByTestId('effect-level')).toHaveTextContent('Level 2 · place your point');
    await user.click(d.getByRole('button', { name: 'STR 10 → 11' }));
    expect(onPlaceStat).toHaveBeenCalledWith('str');
    // 25 Energy: ×1 is fine, ×3 needs 30.
    expect(d.getByRole('button', { name: 'Again ×1' })).toBeEnabled();
    expect(d.getByRole('button', { name: 'Again ×3' })).toBeDisabled();
    expect(d.getByTestId('again-hint')).toHaveTextContent('×3 needs 30 Energy');
  });

  it('opens a row to show its breakdown', async () => {
    const user = userEvent.setup();
    const { dialog } = renderModal(actionResultFixture);
    await user.click(within(dialog).getAllByTestId('attempt-row')[0]!.querySelector('button')!);
    expect(within(dialog).getByText('INT 12 vs difficulty 8 (×4)')).toBeInTheDocument();
  });

  it('training: Trained, one "no roll" row, INT 12 → 13', () => {
    const { dialog } = renderModal(trainingResultFixture, {
      value: 5,
      nextTickAt: Date.UTC(2026, 8, 29, 9, 10),
    });
    const d = within(dialog);
    expect(d.getByTestId('stamp')).toHaveTextContent('Trained');
    expect(d.getByText('44 Energy · no roll')).toBeInTheDocument();
    expect(d.getByTestId('effect-stat')).toHaveTextContent('INT 12 → 13');
    expect(d.getByTestId('tile-opinion')).toHaveTextContent('—');
    // ×1 only (§8.5, content §13.2): Again ×1 · Continue.
    expect(d.queryByRole('button', { name: 'Again ×3' })).toBeNull();
    expect(d.getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(d.getByRole('button', { name: 'Again ×1' })).toBeDisabled();
    expect(d.getByTestId('again-hint')).toHaveTextContent(/^Needs 46 Energy · ready at \d\d:\d\d$/);
  });

  it('keeps Again and Continue in a sticky bar at the bottom of the modal (m2)', () => {
    const { dialog } = renderModal(actionResultFixture);
    const bar = within(dialog).getByTestId('result-buttons');
    expect(bar).toHaveClass('sticky', 'bottom-0');
    expect(within(bar).getByRole('button', { name: 'Again ×1' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Again ×3' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('a shift: Shift worked, half pay and streak, Continue only', () => {
    const { dialog } = renderModal(shiftResultFixture);
    const d = within(dialog);
    expect(d.getByTestId('stamp')).toHaveTextContent('Shift worked');
    expect(d.getByTestId('tile-iron')).toHaveTextContent('+112+108 half pay, +4 streak');
    expect(d.getByTestId('effect-shift')).toHaveTextContent(
      /^1 day · 2 sick days left · next shift at \d\d:\d\d$/,
    );
    expect(d.queryByRole('button', { name: 'Again ×1' })).toBeNull();
    expect(d.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('Continue closes; Again asks for another run with its count', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onAgain } = renderModal(actionResultFixture);
    await user.click(screen.getByRole('button', { name: 'Again ×3' }));
    expect(onAgain).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('m5: the order that completes all three shows "All orders carried out · +5 PC"', () => {
    const { dialog } = renderModal({
      ...actionResultFixture,
      effects: { ...actionResultFixture.effects, ordersAllDone: { pc: 5 }, pc: { before: 0, after: 5 } },
    });
    const d = within(dialog);
    expect(d.getByTestId('effect-all-orders')).toHaveTextContent('All orders carried out · +5 PC');
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
      const value = within(dialog).getByTestId('tile-faction-xp').querySelector(`.${cls}`);
      expect(value, factionId).not.toBeNull();
      expect(within(dialog).getByTestId('tile-opinion').querySelector(`.${cls}`), factionId).not.toBeNull();
      cleanup();
    }
  });

  it('renders nothing without a result', () => {
    render(<ResultModal result={null} open onOpenChange={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
