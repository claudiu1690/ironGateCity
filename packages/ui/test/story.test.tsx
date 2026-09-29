import {
  chapterCheckScreenFixture,
  chapterResultFixture,
  characterViewFixture,
  factionCardFixtures,
  originScreenFixture,
  paperViewFixture,
} from '@irongate/rules/testing';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AvatarPicker, DeskList, FactionCard, HudBar, LettersRow, ResultModal, StoryScreen } from '../src';

/** Slice-2 tech design §14 UI fixtures: the story screen, the faction card, the chapter modal. */
describe('StoryScreen (ADR 0013)', () => {
  it('an origin step: the echo, the prompt beside the portrait, one tap commits a choice', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<StoryScreen view={originScreenFixture} onChoose={onChoose} />);
    expect(screen.getByRole('heading', { name: 'The room' })).toBeInTheDocument();
    expect(screen.getByTestId('story-echo')).toHaveTextContent('You went fishing with him.');
    expect(screen.getByTestId('story-prompt')).toHaveTextContent(
      'And when the street kids got into trouble.',
    );
    expect(screen.getAllByTestId('story-choice')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Talked them out of it.' }));
    expect(onChoose).toHaveBeenCalledWith('b');
    expect(screen.getByTestId('story-waits')).toHaveTextContent(
      'Close the game now and this waits for you · Step 1 of 3',
    );
    // The art panel crops at the focus point (ADR 0015).
    expect(document.querySelector('img')).toHaveStyle({ objectPosition: '30% 50%' });
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
    expect(approaches[0]).toHaveTextContent('46 %');
    expect(approaches[1]).toHaveTextContent('66 %');
    await user.click(approaches[1]!);
    expect(onSelect).toHaveBeenCalledWith('sort');
    expect(screen.getByTestId('story-cta')).toBeDisabled();
    expect(screen.getByTestId('story-cta-note')).toHaveTextContent('Needs 10 Energy · ready at 09:10');
    const onCta = vi.fn();
    rerender(
      <StoryScreen
        view={{ ...chapterCheckScreenFixture, cta: { label: 'Walk his ward', energy: 10, readyAt: null } }}
        selectedApproach="sort"
        onCta={onCta}
      />,
    );
    expect(screen.getByRole('radio', { checked: true })).toHaveTextContent('Sort the book by street first');
    await user.click(screen.getByTestId('story-cta'));
    expect(onCta).toHaveBeenCalled();
  });
});

describe('FactionCard (§7.3)', () => {
  it('collapsed: the first line and the wish tag; selected: the blurb and the facts', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <FactionCard card={factionCardFixtures[1]!} selected={false} onSelect={onSelect} />,
    );
    expect(screen.getByTestId('wish-tag')).toHaveTextContent('His wish · +50 Faction XP');
    expect(screen.queryByTestId('faction-facts')).toBeNull();
    await user.click(screen.getByRole('radio', { name: /Red Collective/ }));
    expect(onSelect).toHaveBeenCalled();
    rerender(<FactionCard card={factionCardFixtures[1]!} selected onSelect={onSelect} />);
    expect(screen.getByTestId('faction-facts')).toHaveTextContent('Starts in Coalport');
    render(<FactionCard card={factionCardFixtures[0]!} selected={false} onSelect={onSelect} />);
    expect(screen.getAllByTestId('wish-tag')).toHaveLength(1);
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
    expect(row).toHaveTextContent("From your father's things");
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
    expect(screen.getByText('Ambition · Finish His Work · Chapter 1 of 12')).toBeInTheDocument();
    expect(screen.getByTestId('tile-keepsake')).toHaveTextContent('His ward book');
    expect(screen.queryByTestId('tile-opinion')).toBeNull();
    expect(screen.getByTestId('effect-item')).toHaveTextContent('Keepsake: His ward book');
    expect(screen.getByTestId('effect-hook')).toHaveTextContent(
      'Chapter 2, "Stand where he stood": from Tuesday 6 October, at Rank 2',
    );
    const buttons = within(screen.getByTestId('result-buttons')).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Continue']);
    // Nothing but the stamp says so (designer answer §13 Q10).
    expect(screen.getByRole('dialog').textContent).not.toMatch(/failed/i);
  });
});
