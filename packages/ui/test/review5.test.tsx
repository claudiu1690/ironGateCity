/**
 * Design Review 2 (docs/review/2026-10-08-review-5.md; docs/design/review-5-answers.md), the quick
 * fixes: #6 Energy · Health · Heat · XP · Party XP in the HUD; #7 the journey card stays until a row
 * is tapped (its sheet, the put-aside row, Continue on the arrival only after a row); #4 the level-up
 * in the result modal is a line and *Place it*, and only the modal's middle scrolls.
 */
import {
  batchResultFixture,
  characterViewFixture,
  journeyArrivedFixture,
  journeyViewFixture,
} from '@irongate/rules/testing';
import type { JourneyCardResult } from '@irongate/rules';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HudBar, JourneyCard, JourneyCardSheet, ResultModal } from '../src';

describe('#6 Health under Energy (answers §6)', () => {
  it('the gauges read Energy, Health, Heat, XP, Party XP; on wide screens Energy over Health over Heat', async () => {
    const user = userEvent.setup();
    render(<HudBar character={characterViewFixture} nextTickIn={null} heat={60} health={{ value: 90, max: 125 }} />);
    // The gauges' own lines, in reading order (the sideways name line's copies are outside them).
    const gauges = screen.getByTestId('hud-help').parentElement!;
    const order = [...gauges.querySelectorAll<HTMLElement>('[data-note]')].map((el) => el.dataset.note);
    expect(order).toEqual(['energy', 'health', 'heat', 'xp', 'fxp']);
    // From 1024 px: the first column Energy, Health, Heat; XP and Party XP the first row's others.
    expect(screen.getByTestId('hud-health')).toHaveClass('lg:col-start-1', 'lg:row-start-2');
    expect(screen.getByTestId('hud-heat')).toHaveClass('lg:col-start-1', 'lg:row-start-3');
    // Held sideways the grid's copies step aside for the name line's (unchanged).
    expect(screen.getByTestId('hud-health')).toHaveClass('short:hidden');
    // The help group's order follows.
    expect(screen.getByTestId('hud-help')).toHaveAccessibleName('What Energy, Health, Heat, XP and Party XP mean');
    await user.click(screen.getByTestId('hud-help'));
    const sheet = screen.getByTestId('help-note');
    expect(sheet.querySelector('h2')).toHaveTextContent('Energy');
    expect([...sheet.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'Health',
      'Heat · Hot',
      'Experience',
      'Party XP',
    ]);
  });

  it('without Heat: Energy, Health, XP, Party XP', () => {
    render(<HudBar character={characterViewFixture} nextTickIn={null} heat={0} health={{ value: 125, max: 125 }} />);
    const gauges = screen.getByTestId('hud-help').parentElement!;
    const order = [...gauges.querySelectorAll<HTMLElement>('[data-note]')].map((el) => el.dataset.note);
    expect(order).toEqual(['energy', 'health', 'xp', 'fxp']);
    expect(screen.getByTestId('hud-help')).toHaveAccessibleName('What Energy, Health, XP and Party XP mean');
  });
});

describe('#7 the journey card stays until a row is tapped (answers §7)', () => {
  const card = journeyViewFixture.card!;

  it('the sheet: no Close, and Escape or a tap on the dim leaves it open', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(
      <JourneyCardSheet title="On the train to Irongate">
        <JourneyCard card={card} onChoose={onChoose} />
      </JourneyCardSheet>,
    );
    const sheet = screen.getByRole('dialog', { name: 'On the train to Irongate' });
    expect(sheet).toHaveFocus();
    expect(within(sheet).queryByRole('button', { name: 'Close' })).toBeNull();
    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('card-dim'));
    expect(screen.getByRole('dialog', { name: 'On the train to Irongate' })).toBeInTheDocument();
    // The put-aside row is the card's foot: *Sleep through it* · *Nothing happens.*; it is a row.
    const aside = screen.getByTestId('journey-set-aside');
    expect(aside).toHaveTextContent('Sleep through it');
    expect(aside).toHaveTextContent('Nothing happens.');
    expect(screen.getByTestId('journey-card')).not.toHaveTextContent('Ignore it');
    await user.click(aside);
    expect(onChoose).toHaveBeenCalledWith('set-aside');
  });

  it('answered: Close, Escape and the dim put it away', () => {
    const onClose = vi.fn();
    render(
      <JourneyCardSheet title="On the train to Irongate" onClose={onClose}>
        <p>outcome</p>
      </JourneyCardSheet>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByTestId('card-dim'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('the hostile deck: *Let it pass* with its consequence; set aside, its outcome is the ignore text', () => {
    const hostile = {
      ...card,
      deck: 'hostile' as const,
      choices: [
        ...card.choices.filter((c) => !c.setAside),
        {
          id: 'set-aside',
          title: 'Let it pass',
          detail: 'your name gets written down · Heat +10 · Watched today',
          stat: null,
          chance: null,
          cost: null,
          affordable: true,
          setAside: true,
        },
      ],
    };
    const { rerender } = render(<JourneyCard card={hostile} onChoose={vi.fn()} />);
    expect(screen.getByTestId('journey-set-aside-line')).toHaveTextContent(
      'your name gets written down · Heat +10 · Watched today',
    );
    const chosen = {
      kind: 'journeyCard',
      choiceId: 'set-aside',
      stamp: null,
      headline: 'Let it pass',
      body: 'You keep your eyes shut. They write your name down anyway.',
      reason: null,
      rewards: [{ id: 'heat', amount: 10 }],
    } as unknown as JourneyCardResult;
    rerender(<JourneyCard card={{ ...hostile, chosen }} onChoose={vi.fn()} />);
    // Only the tapped row stays; the outcome is the text, no stamp, no repeated heading.
    expect(screen.queryAllByTestId('journey-choice')).toHaveLength(0);
    expect(screen.getByTestId('journey-set-aside')).toHaveAttribute('aria-pressed', 'true');
    const out = screen.getByTestId('journey-outcome');
    expect(out).toHaveTextContent('You keep your eyes shut. They write your name down anyway.');
    expect(within(out).queryByRole('heading')).toBeNull();
    expect(within(out).queryByTestId('stamp')).toBeNull();
  });

  it('the arrival: Continue is not shown until a row is tapped', () => {
    const arrival = (chosen: JourneyCardResult | null) => (
      <ResultModal
        result={{ kind: 'journey', journey: { ...journeyArrivedFixture, card: { ...card, chosen } } }}
        open
        onOpenChange={vi.fn()}
        onContinue={vi.fn()}
        journeyCard={<span>the card</span>}
      />
    );
    const { rerender } = render(arrival(null));
    expect(screen.queryByTestId('arrival-continue')).toBeNull();
    rerender(arrival({ choiceId: 'set-aside' } as unknown as JourneyCardResult));
    expect(screen.getByTestId('arrival-continue')).toBeInTheDocument();
  });
});

describe('#4 the level-up in the result modal (answers §4.1)', () => {
  it('one line and *Place it*; the picker opens as a sheet; only the middle scrolls', async () => {
    const user = userEvent.setup();
    const onPlaceStat = vi.fn();
    render(
      <ResultModal
        result={batchResultFixture}
        open
        onOpenChange={vi.fn()}
        onAgain={vi.fn()}
        energy={{ value: 90, nextTickAt: null }}
        statPoints={{ pending: 1, level: 2, stats: { str: 10, int: 12, agi: 5 } }}
        onPlaceStat={onPlaceStat}
      />,
    );
    const modal = screen.getByRole('dialog');
    const line = within(modal).getByTestId('effect-level');
    expect(line).toHaveTextContent('Level 2 · one point to place');
    // Not inline: no stat button in the modal until *Place it*.
    expect(within(modal).queryByRole('button', { name: 'STR 10 → 11' })).toBeNull();
    expect(modal).toHaveClass('overflow-hidden');
    expect(within(modal).getByTestId('result-middle')).toHaveClass('overflow-y-auto', 'overscroll-contain');
    await user.click(within(line).getByRole('button', { name: 'Place it' }));
    const picker = screen.getByRole('dialog', { name: 'Level 2 · one point to place' });
    await user.click(within(picker).getByRole('button', { name: 'STR 10 → 11' }));
    expect(onPlaceStat).toHaveBeenCalledWith('str');
  });
});
