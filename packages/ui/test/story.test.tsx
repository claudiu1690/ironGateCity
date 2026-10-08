import {
  chapterCheckScreenFixture,
  chapterResultFixture,
  characterViewFixture,
  originScreenFixture,
  paperViewFixture,
  platformScreenFixture,
} from '@irongate/rules/testing';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AvatarPicker,
  DeskList,
  HudBar,
  LettersRow,
  ResultModal,
  STORY_SETTLE_MS,
  StoryScreen,
} from '../src';
import { splitAsk } from '../src/components/Story';

/** A new screen's choices take taps once they have settled on screen (QA M1). */
const settled = () =>
  waitFor(() => {
    for (const b of screen.queryAllByRole('button')) expect(b).not.toHaveAttribute('aria-disabled');
    for (const b of screen.queryAllByRole('radio')) expect(b).not.toHaveAttribute('aria-disabled');
  });

/** Slice-2 tech design §14 UI fixtures (review 4: the three beats): the story screen, the chapter modal. */
describe('StoryScreen (ADR 0013)', () => {
  it('beat 2: the echo at the top, the helper beside the text, one tap commits a choice', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<StoryScreen view={originScreenFixture} onChoose={onChoose} />);
    expect(screen.getByRole('heading', { name: 'The kitbag' })).toBeInTheDocument();
    expect(screen.getByTestId('story-echo')).toHaveTextContent('You went for the work.');
    expect(screen.queryByTestId('story-prompt')).toBeNull();
    // The art and the helper's portrait.
    expect(document.querySelectorAll('img')).toHaveLength(2);
    expect(screen.getAllByTestId('story-choice')).toHaveLength(3);
    expect(screen.queryByTestId('story-confirm')).toBeNull();
    await settled();
    await user.click(screen.getByRole('button', { name: 'Books, from the camp library. They let us keep those.' }));
    expect(onChoose).toHaveBeenCalledWith('books', expect.any(String));
    expect(screen.getByTestId('story-waits')).toHaveTextContent('This waits for you · Step 2 of 3');
    // The art panel crops at the focus point (ADR 0015).
    expect(document.querySelector('img')).toHaveStyle({ objectPosition: '50% 50%' });
  });

  it('beat 1: rows with a portrait and two lines select; the confirm commits; the note under them', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<StoryScreen view={platformScreenFixture} onChoose={onChoose} />);
    const rows = screen.getAllByRole('radio');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Petra Holm · union organiser · at the bench by the door');
    expect(rows[0]!.querySelector('img')).not.toBeNull();
    expect(screen.getByTestId('story-note')).toHaveTextContent('One of these today.');
    const confirm = screen.getByTestId('story-confirm');
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveTextContent('Choose one of the three');
    await settled();
    await user.click(rows[1]!);
    expect(rows[1]).toHaveAttribute('aria-checked', 'true');
    expect(onChoose).not.toHaveBeenCalled();
    expect(confirm).toHaveTextContent("Go for the stamp · the six o'clock to Duskwall");
    await user.click(rows[0]!);
    expect(confirm).toHaveTextContent("Go for the work · the six o'clock to Coalport");
    await user.click(confirm);
    expect(onChoose).toHaveBeenCalledWith('holm', expect.any(String));
  });

  it('beat 1 (review 5, answers §19): a long ask is its first sentence as the title, the rest a smaller line', async () => {
    const user = userEvent.setup();
    render(<StoryScreen view={platformScreenFixture} onChoose={() => undefined} />);
    const [holm] = screen.getAllByRole('radio');
    expect(within(holm!).getByTestId('story-row-title')).toHaveTextContent(
      /^"Your mill's sold, but Coalport's rehires on Monday, union men first\."$/,
    );
    expect(within(holm!).getByTestId('story-row-rest')).toHaveTextContent(
      /^"Put your name on my sheet now and you've a place at the gate and a bed at the union hostel tonight\. The six o'clock to Coalport\."$/,
    );
    // One line until the row is picked, then whole.
    expect(within(holm!).getByTestId('story-row-rest')).toHaveClass('text-[13px]', 'line-clamp-1');
    await settled();
    await user.click(holm!);
    expect(within(holm!).getByTestId('story-row-rest')).not.toHaveClass('line-clamp-1');
    expect(splitAsk('Tools. I kept the kit.')).toEqual({ title: 'Tools.', rest: 'I kept the kit.' });
    expect(splitAsk('One sentence only.')).toEqual({ title: 'One sentence only.', rest: null });
  });

  it('beat 1: the arrow keys move through the rows and pick one, as a radio group does', async () => {
    const user = userEvent.setup();
    render(<StoryScreen view={platformScreenFixture} onChoose={() => undefined} />);
    const rows = screen.getAllByRole('radio');
    await settled();
    rows[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(rows[1]).toHaveFocus();
    expect(rows[1]).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowDown}');
    expect(rows[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('beat 1: while the choice is sent the confirm is busy and the rows are disabled', () => {
    render(<StoryScreen view={platformScreenFixture} onChoose={() => undefined} pendingChoice="holm" />);
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled();
    expect(screen.getByTestId('story-confirm')).toHaveAttribute('aria-busy', 'true');
  });

  it('while a choice is sent every choice is disabled', () => {
    render(<StoryScreen view={originScreenFixture} onChoose={() => undefined} pendingChoice="a" />);
    for (const b of screen.getAllByTestId('story-choice')) expect(b).toBeDisabled();
  });

  it('a chapter check: approaches with odds; the CTA waits for an approach and for Energy', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <StoryScreen
        view={chapterCheckScreenFixture}
        onSelectApproach={onSelect}
        ctaNote="Needs 10 Energy · ready at 09:10"
      />,
    );
    const approaches = screen.getAllByRole('radio');
    await settled();
    // Review 2 (GDD §8.4): the odds as a word and the stat, never a percentage.
    expect(approaches[0]).toHaveTextContent('Long shot');
    expect(approaches[1]).toHaveTextContent('Fair odds · Intelligence');
    for (const a of approaches) expect(a.textContent).not.toMatch(/%/);
    await user.click(approaches[1]!);
    expect(onSelect).toHaveBeenCalledWith('sort');
    expect(screen.getByTestId('story-cta')).toBeDisabled();
    expect(screen.getByTestId('story-cta-note')).toHaveTextContent('Needs 10 Energy · ready at 09:10');
    const onCta = vi.fn();
    rerender(
      <StoryScreen
        view={{ ...chapterCheckScreenFixture, cta: { label: 'Knock the three doors', energy: 10, readyAt: null } }}
        selectedApproach="sort"
        onCta={onCta}
      />,
    );
    expect(screen.getByRole('radio', { checked: true })).toHaveTextContent('Sort the list by street first');
    await user.click(screen.getByTestId('story-cta'));
    expect(onCta).toHaveBeenCalled();
  });
});

describe('StoryScreen: a double tap never reaches a screen the player has not read (QA M1)', () => {
  const next = {
    ...originScreenFixture,
    title: 'The post',
    echo: 'You brought books.',
    // A test prompt: the focus test needs a question heading (the post itself has none).
    prompt: 'Which envelope first?',
    choices: [
      { id: 'ward-book', text: "The unit's list.", hint: null },
      { id: 'letter', text: 'The requisition order.', hint: null },
      { id: 'marker', text: 'The ration page.', hint: null },
    ],
  };

  it('a new screen ignores taps until it has settled; each tap carries the screen it was rendered for', async () => {
    vi.useFakeTimers();
    try {
      const onChoose = vi.fn();
      const { rerender } = render(
        <StoryScreen view={originScreenFixture} screenKey="q2" settleOnMount onChoose={onChoose} />,
      );
      const first = screen.getByRole('button', { name: "Tools. I kept the workshop's kit when the workshop went." });
      expect(first).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(first, { detail: 1 });
      expect(onChoose).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(STORY_SETTLE_MS));
      expect(first).not.toHaveAttribute('aria-disabled');
      fireEvent.click(first, { detail: 1 });
      expect(onChoose).toHaveBeenLastCalledWith('tools', 'q2');

      // The answer is back: the next question takes the same place. Its choices are new buttons,
      // and the second tap of the double tap, 200 ms later, does nothing.
      rerender(<StoryScreen view={next} screenKey="q3" onChoose={onChoose} />);
      const again = screen.getByRole('button', { name: /^The unit's list/ });
      expect(again).not.toBe(first);
      act(() => vi.advanceTimersByTime(200));
      fireEvent.click(again, { detail: 1 });
      expect(onChoose).toHaveBeenCalledTimes(1);
      act(() => vi.advanceTimersByTime(STORY_SETTLE_MS - 200));
      fireEvent.click(again, { detail: 1 });
      expect(onChoose).toHaveBeenLastCalledWith('ward-book', 'q3');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the focus moves to the new prompt; a key press is not held back (no double activation from the keyboard)', async () => {
    vi.useFakeTimers();
    try {
      const onChoose = vi.fn();
      const { rerender } = render(
        <StoryScreen view={originScreenFixture} screenKey="q2" settleOnMount onChoose={onChoose} />,
      );
      const first = screen.getByRole('button', { name: 'Books, from the camp library. They let us keep those.' });
      first.focus();
      // A key press (click detail 0) works at once: the player chose the button with the keyboard.
      fireEvent.click(first, { detail: 0 });
      expect(onChoose).toHaveBeenLastCalledWith('books', 'q2');
      rerender(<StoryScreen view={next} screenKey="q3" onChoose={onChoose} />);
      // The old button is gone; the focus is on the new question, not on one of its answers.
      expect(screen.getByTestId('story-prompt')).toHaveFocus();
      expect(document.activeElement?.closest('button')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('the approaches of a chapter step settle the same way', () => {
    vi.useFakeTimers();
    try {
      const onSelect = vi.fn();
      render(
        <StoryScreen
          view={chapterCheckScreenFixture}
          screenKey="c1:check"
          settleOnMount
          onSelectApproach={onSelect}
        />,
      );
      const [one] = screen.getAllByRole('radio');
      fireEvent.click(one!, { detail: 1 });
      expect(onSelect).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(STORY_SETTLE_MS));
      fireEvent.click(one!, { detail: 1 });
      expect(onSelect).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a screen opened by a page load (no tap before it) takes a tap at once', () => {
    vi.useFakeTimers();
    try {
      const onChoose = vi.fn();
      render(<StoryScreen view={originScreenFixture} screenKey="q2" onChoose={onChoose} />);
      const first = screen.getByRole('button', { name: "Tools. I kept the workshop's kit when the workshop went." });
      expect(first).not.toHaveAttribute('aria-disabled');
      fireEvent.click(first, { detail: 1 });
      expect(onChoose).toHaveBeenCalledWith('tools', 'q2');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('AvatarPicker', () => {
  it('is a radio group of faces with their alt texts as names', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const faces = ['avatar.man-20s', 'avatar.woman-30s'].map((id) => ({
      ...characterViewFixture.avatar!,
      id,
      alt: `Face ${id}`,
    }));
    render(<AvatarPicker faces={faces} value={null} onChange={onChange} error="Choose your face" />);
    expect(screen.getByRole('group', { name: 'Your face' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Face avatar.woman-30s' }));
    expect(onChange).toHaveBeenCalledWith('avatar.woman-30s');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose your face');
  });
});

describe('the paper and the HUD, slice 2', () => {
  it('the Letters row opens the chapter; the desk shows what is worn', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<LettersRow letter={paperViewFixture.letters[0]!} onOpen={onOpen} />);
    const row = screen.getByTestId('letters-row');
    expect(row).toHaveTextContent("From the office's post");
    expect(row).toHaveTextContent('Chapter 1 is ready · 10 Energy');
    await user.click(row);
    expect(onOpen).toHaveBeenCalled();
    render(<DeskList desk={paperViewFixture.desk} />);
    expect(screen.getByTestId('desk')).toHaveTextContent('WearingMill work coat · CHA 2');
  });

  it('the HUD shows the face, or an empty ring with "No face yet"', () => {
    const { rerender } = render(<HudBar character={characterViewFixture} nextTickIn={null} />);
    expect(screen.getByTestId('hud-avatar').querySelector('img')).not.toBeNull();
    rerender(<HudBar character={{ ...characterViewFixture, avatar: null }} nextTickIn={null} />);
    expect(screen.getByTestId('hud-avatar')).toHaveTextContent('No face yet');
  });
});

describe('ResultModal, a chapter (§9.1)', () => {
  it('stamps Failure, shows the keepsake tile and the hook, Continue only', () => {
    render(<ResultModal result={chapterResultFixture} open onOpenChange={() => undefined} />);
    expect(screen.getByTestId('stamp')).toHaveTextContent('Failure');
    expect(screen.getByText('Ambition · The Names on the Stone · Chapter 1 of 12')).toBeInTheDocument();
    // Review 3: the keepsake is a receipt line with its picture; no opinion line on a chapter.
    expect(screen.getByTestId('reward-item')).toHaveTextContent("Keepsake · The unit's list");
    expect(screen.queryByTestId('reward-opinion')).toBeNull();
    // Review 5 (answers §18 Q2): the item stays on the receipt and is not repeated as a knock-on.
    expect(screen.queryByTestId('effect-item')).toBeNull();
    expect(screen.getByTestId('effect-hook')).toHaveTextContent(
      'Chapter 2, "Stand for the stone": from Tuesday 6 October, at Rank 2',
    );
    const buttons = within(screen.getByTestId('result-buttons')).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Continue']);
    // Nothing but the stamp says so (designer answer §13 Q10).
    expect(screen.getByRole('dialog').textContent).not.toMatch(/failed/i);
  });
});
