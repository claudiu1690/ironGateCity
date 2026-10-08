/**
 * QA, review 4 (docs/qa/review-4-report.md): the result modal's level-up line against what the user
 * was told (docs/review/review-4-build-notes.md row 5) and answers §5 / §28 fix 1: once the point is
 * placed the line reads the placed stat, *Level 2 · Intelligence 12 → 13*; with two points waiting,
 * *Level 3 · two points to place* (review 5 answers §4.1). Known bugs are `it.fails` (they pass while the bug is there).
 */
import { batchResultFixture } from '@irongate/rules/testing';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResultModal } from '../src';

function Harness({ pending0 }: { pending0: number }) {
  const [stats, setStats] = useState({ str: 10, int: 12, agi: 5 });
  const [pending, setPending] = useState(pending0);
  return (
    <ResultModal
      result={batchResultFixture}
      open
      onOpenChange={vi.fn()}
      onAgain={vi.fn()}
      energy={{ value: 90, nextTickAt: null }}
      statPoints={{ pending, level: 2, stats }}
      onPlaceStat={(stat: 'str' | 'int' | 'agi') => {
        setStats((s) => ({ ...s, [stat]: s[stat] + 1 }));
        setPending((n) => n - 1);
      }}
    />
  );
}

describe('the level-up line after the point is placed (note #5)', () => {
  it('the line no longer says "place your point" once it is placed', async () => {
    render(<Harness pending0={1} />);
    // Review 5 (answers §4.1): the picker opens from *Place it*, as a sheet over the modal.
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Place it' }));
    await userEvent.click(screen.getByRole('button', { name: /^Intelligence 12 → 13/ }));
    expect(screen.getByTestId('effect-level')).not.toHaveTextContent('place your point');
  });

  // QA m1 (fixed in the fix round): the build printed *Level 2 · point placed*; the build notes (row 5),
  // answers §5 and fix list 1's *Done when* say *Level 2 · Intelligence 12 → 13*.
  it('the line reads the placed stat: "Level 2 · Intelligence 12 → 13"', async () => {
    render(<Harness pending0={1} />);
    // Review 5 (answers §4.1): the picker opens from *Place it*, as a sheet over the modal.
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Place it' }));
    await userEvent.click(screen.getByRole('button', { name: /^Intelligence 12 → 13/ }));
    expect(screen.getByTestId('effect-level')).toHaveTextContent('Level 2 · Intelligence 12 → 13');
  });

  it('with two points waiting the line reads "Level 3 · two points to place" (review 5)', () => {
    const result = {
      ...batchResultFixture,
      effects: { ...batchResultFixture.effects, levelUp: { from: 1, to: 3, statPoints: 2 } },
    };
    render(
      <ResultModal
        result={result}
        open
        onOpenChange={vi.fn()}
        onAgain={vi.fn()}
        energy={{ value: 90, nextTickAt: null }}
        statPoints={{ pending: 2, level: 3, stats: { str: 10, int: 12, agi: 5 } }}
        onPlaceStat={vi.fn()}
      />,
    );
    expect(within(screen.getByRole('dialog')).getByTestId('effect-level')).toHaveTextContent(
      'Level 3 · two points to place',
    );
  });
});
