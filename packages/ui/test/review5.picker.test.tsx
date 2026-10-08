import { copy } from '@irongate/content/copy';
import type { CharacterView } from '@irongate/rules';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatPointsPanel } from '../src';

/**
 * Review 5 (answers §3; GDD §5.3; tech design §5.1): the level-up picker as three paper cards in the
 * ticket's style, the whole card the tap.
 */

const guide: NonNullable<CharacterView['statGuide']> = {
  cityName: 'Coalport',
  total: 15,
  counts: { str: 4, int: 9, agi: 2 },
  lead: 'int',
  best: { stat: 'int', value: 12 },
};
const stats = { str: 8, int: 12, agi: 5 };

describe('the picker cards (answers §3.2)', () => {
  it('three cards, each one button named in full with its move; the line under the name', () => {
    render(<StatPointsPanel pending={1} level={4} stats={stats} guide={guide} onPlace={vi.fn()} />);
    const group = screen.getByRole('group', { name: copy.statChoice.cards });
    const cards = within(group).getAllByRole('button');
    expect(cards.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Strength 8 → 9',
      'Intelligence 12 → 13',
      'Agility 5 → 6',
    ]);
    expect(screen.getByRole('button', { name: 'Strength 8 → 9' })).toHaveAccessibleDescription(
      'Shift changes, loaders, posters, the gate steps: 4 of 15 actions here. Later, security work, marches and holding your own.',
    );
    // A card, not a black block: a 1.5 px ink rule, no fill, 56 px at least.
    for (const b of cards) {
      expect(b).toHaveClass('border-[1.5px]', 'border-ink', 'min-h-14', 'bg-transparent');
      expect(b).not.toHaveClass('bg-ink');
    }
    expect(screen.getByRole('group', { name: copy.statChoice.cards }).querySelector('.bg-ink')).toBeNull();
  });

  it('the tags on the right cards, both on one card when they coincide', () => {
    const { rerender } = render(
      <StatPointsPanel pending={1} level={4} stats={stats} guide={guide} onPlace={vi.fn()} />,
    );
    expect(screen.getByTestId('stat-tags-int')).toHaveTextContent('Most used here · Your best');
    expect(screen.queryByTestId('stat-tags-str')).toBeNull();
    expect(screen.queryByTestId('stat-tags-agi')).toBeNull();
    rerender(
      <StatPointsPanel
        pending={1}
        level={4}
        stats={stats}
        guide={{ ...guide, best: { stat: 'str', value: 13 } }}
        onPlace={vi.fn()}
      />,
    );
    expect(screen.getByTestId('stat-tags-int')).toHaveTextContent(/^Most used here$/);
    expect(screen.getByTestId('stat-tags-str')).toHaveTextContent(/^Your best$/);
  });

  it('the heading: one point, two points; one more after the first is placed', () => {
    const { rerender } = render(<StatPointsPanel pending={1} level={4} stats={stats} onPlace={vi.fn()} />);
    expect(screen.getByText('Level 4 · one point to place')).toBeInTheDocument();
    rerender(<StatPointsPanel pending={2} level={5} stats={stats} onPlace={vi.fn()} />);
    expect(screen.getByText('Level 5 · two points to place')).toBeInTheDocument();
    rerender(<StatPointsPanel pending={1} level={5} stats={{ ...stats, str: 9 }} onPlace={vi.fn()} />);
    expect(screen.getByText('Level 5 · one more to place')).toBeInTheDocument();
  });

  it('one tap places; while it is in flight the card is busy and the others at 60 %', async () => {
    const onPlace = vi.fn();
    const { rerender } = render(<StatPointsPanel pending={1} level={4} stats={stats} onPlace={onPlace} />);
    await userEvent.click(screen.getByRole('button', { name: 'Strength 8 → 9' }));
    expect(onPlace).toHaveBeenCalledWith('str');
    rerender(<StatPointsPanel pending={1} level={4} stats={stats} onPlace={onPlace} placing="str" />);
    expect(screen.getByTestId('stat-card-str')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('stat-card-str')).toHaveClass('bg-ink', 'text-paper');
    for (const s of ['int', 'agi']) expect(screen.getByTestId(`stat-card-${s}`)).toHaveClass('opacity-60');
  });

  it('placed: the card reads *Strength 9* and a Courier *+1* in the success colour; the cards stay live', () => {
    const { rerender } = render(<StatPointsPanel pending={2} level={5} stats={stats} onPlace={vi.fn()} />);
    rerender(<StatPointsPanel pending={1} level={5} stats={{ ...stats, str: 9 }} onPlace={vi.fn()} />);
    const card = screen.getByTestId('stat-card-str');
    expect(card).toHaveAttribute('data-state', 'placed');
    expect(card).toHaveAccessibleName('Strength 9 · +1');
    expect(within(card).getByText('+1')).toHaveClass('font-mono', 'text-success');
    expect(card).toBeEnabled();
    // The `placed` prop says the same when the caller knows it.
    rerender(
      <StatPointsPanel pending={1} level={5} stats={stats} onPlace={vi.fn()} placed={{ stat: 'agi', value: 5 }} />,
    );
    expect(screen.getByTestId('stat-card-agi')).toHaveAttribute('data-state', 'placed');
  });

  it('on ink the cards are paper; *Choose later · nothing is lost* is a text button', async () => {
    const onLater = vi.fn();
    render(<StatPointsPanel pending={1} level={4} stats={stats} onPlace={vi.fn()} onLater={onLater} tone="ink" />);
    expect(screen.getByTestId('stat-card-int')).toHaveClass('bg-paper');
    await userEvent.click(screen.getByRole('button', { name: 'Choose later · nothing is lost' }));
    expect(onLater).toHaveBeenCalled();
  });

  it('no copy.statButton remains', () => {
    expect('statButton' in copy).toBe(false);
  });
});
