import { actionResultFixture } from '@irongate/rules/testing';
import type { ActionResult } from '@irongate/rules';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultModal } from '../src';

function renderModal(result: ActionResult = actionResultFixture) {
  const onOpenChange = vi.fn();
  const onAgain = vi.fn();
  render(<ResultModal result={result} open onOpenChange={onOpenChange} onAgain={onAgain} />);
  return { onOpenChange, onAgain, dialog: screen.getByRole('dialog') };
}

describe('ResultModal', () => {
  it('renders the six sections of §13.1a from the server breakdown', () => {
    const { dialog } = renderModal();
    const d = within(dialog);

    // 1. Stamp, place and time
    expect(d.getByTestId('stamp')).toHaveTextContent('Success');
    expect(d.getByText('Coalport · Mill Gate · 09:00')).toBeInTheDocument();
    // 2. Headline and narrative (the dialog's accessible name and description)
    expect(dialog).toHaveAccessibleName('The whistle goes, and they stop');
    expect(dialog).toHaveAccessibleDescription(/Coal dust, tired faces/);
    // 3. One attempt row: chance bar, roll marker, the maths
    const rows = d.getAllByTestId('attempt-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getByRole('img', { name: 'Chance 66 %, rolled 41' })).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/Rolled 41 against 66 % · INT 12 vs 8/)).toBeInTheDocument();
    // 4. Four reward tiles
    expect(d.getByTestId('tile-experience')).toHaveTextContent('+45');
    expect(d.getByTestId('tile-faction-xp')).toHaveTextContent('+6');
    expect(d.getByTestId('tile-iron')).toHaveTextContent('+20');
    expect(d.getByTestId('tile-opinion')).toHaveTextContent('Coalport+0.05 %Collective opinion');
    // 5. Knock-on effects
    expect(d.getByTestId('effect-energy')).toHaveTextContent('100 → 90');
    expect(d.getByText('+0.05 % · counted from slice 1')).toBeInTheDocument();
    // 6. Buttons
    expect(d.getByRole('button', { name: 'Again ×1' })).toBeEnabled();
    expect(d.getByRole('button', { name: 'Again ×3' })).toBeDisabled();
    expect(d.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('shows a Partial stamp and bonus tags with their notes', () => {
    renderModal({
      ...actionResultFixture,
      stamp: 'partial',
      attempts: [{ ...actionResultFixture.attempts[0]!, roll: 80, outcome: 'partial' }],
      rewards: { ...actionResultFixture.rewards, xp: { base: 23, bonus: 11, total: 34 } },
      bonusTags: [{ id: 'rested', label: 'Rested', note: '10 of 10 Energy, +50 % XP and Iron' }],
      effects: { ...actionResultFixture.effects, rested: { before: 30, after: 20 } },
    });
    expect(screen.getByTestId('stamp')).toHaveTextContent('Partial');
    expect(screen.getByText('Rested: 10 of 10 Energy, +50 % XP and Iron')).toBeInTheDocument();
    expect(screen.getByTestId('tile-experience')).toHaveTextContent('+34+23 and +11 bonus');
    expect(screen.getByText('30 → 20')).toBeInTheDocument();
  });

  it('Continue closes; Again ×1 asks for another run', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onAgain } = renderModal();
    await user.click(screen.getByRole('button', { name: 'Again ×1' }));
    expect(onAgain).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing without a result', () => {
    render(<ResultModal result={null} open onOpenChange={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
