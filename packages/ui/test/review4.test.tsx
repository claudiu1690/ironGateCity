/**
 * Review 4 (docs/review/2026-10-06-review-4.md): #5 the level-up line after the point is placed,
 * #12 each HUD label opens its own note, #24 Health always in the HUD.
 */
import { batchResultFixture, characterViewFixture } from '@irongate/rules/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HudBar, ResultModal, notesFrom, pickNoteAt } from '../src';

describe('#5 the level-up line follows the waiting point', () => {
  const modal = (pending: number) => (
    <ResultModal
      result={batchResultFixture}
      open
      onOpenChange={vi.fn()}
      onAgain={vi.fn()}
      energy={{ value: 90, nextTickAt: null }}
      statPoints={{ pending, level: 2, stats: { str: 10, int: 12, agi: 5 } }}
      onPlaceStat={vi.fn()}
    />
  );

  it('"one point to place" while it waits, "point placed" once the character has none left', () => {
    const { rerender } = render(modal(1));
    const d = within(screen.getByRole('dialog'));
    // Review 5 (answers §4.1): the line and *Place it*; the picker is a sheet behind it.
    expect(d.getByTestId('effect-level')).toHaveTextContent('Level 2 · one point to place');
    expect(d.getByRole('button', { name: 'Place it' })).toBeInTheDocument();
    // The placement lands in the `me` cache; the modal re-renders with the new count. Nothing was seen
    // to move here (the stats are the same), so the plain placed line; with a stat moved, see below.
    rerender(modal(0));
    expect(d.getByTestId('effect-level')).toHaveTextContent('Level 2 · point placed');
    expect(d.getByTestId('effect-level')).not.toHaveTextContent('to place');
    expect(d.queryByRole('button', { name: 'Place it' })).toBeNull();
  });

  it('answers §5: once placed, the stat in full ("Level 2 · Strength 10 → 11")', () => {
    const at = (pending: number, str: number) => (
      <ResultModal
        result={batchResultFixture}
        open
        onOpenChange={vi.fn()}
        onAgain={vi.fn()}
        energy={{ value: 90, nextTickAt: null }}
        statPoints={{ pending, level: 2, stats: { str, int: 12, agi: 5 } }}
        onPlaceStat={vi.fn()}
      />
    );
    const { rerender } = render(at(1, 10));
    rerender(at(0, 11));
    const line = within(screen.getByRole('dialog')).getByTestId('effect-level');
    expect(line).toHaveTextContent('Level 2 · Strength 10 → 11');
    expect(line).not.toHaveTextContent('point placed');
  });
});

describe('#12 each HUD label opens its own note', () => {
  it('pickNoteAt: the box under the tap, else the nearest; notesFrom puts it first', () => {
    const boxes = [
      { key: 'energy', top: 0, bottom: 12, left: 0, right: 300 },
      { key: 'health', top: 30, bottom: 42, left: 0, right: 300 },
      { key: 'heat', top: 45, bottom: 57, left: 0, right: 300 },
    ];
    expect(pickNoteAt(boxes, 10, 5)).toBe('energy');
    expect(pickNoteAt(boxes, 10, 50)).toBe('heat');
    expect(pickNoteAt(boxes, 10, 43)).toBe('health'); // the gap, nearer Health
    expect(pickNoteAt(boxes, 10, 70)).toBe('heat'); // below every box
    expect(pickNoteAt([], 0, 0)).toBeNull();
    expect(notesFrom(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b']);
    expect(notesFrom(['a', 'b', 'c'], null)).toEqual(['a', 'b', 'c']);
  });

  it('Political Capital is its own button with its own note (it used to open Heat)', async () => {
    const user = userEvent.setup();
    render(<HudBar character={{ ...characterViewFixture, pc: 5 }} nextTickIn={null} heat={60} />);
    const pc = screen.getByRole('button', { name: '5 Political Capital: what Political Capital means' });
    expect(pc).toHaveAttribute('data-testid', 'hud-pc-block');
    await user.click(pc);
    const note = screen.getByRole('dialog', { name: 'Political Capital' });
    expect(note).not.toHaveTextContent('How much notice the police are taking of you');
    expect(note).not.toHaveTextContent('Every action costs Energy.');
    // Heat is no longer a button of its own whose 44 px target reached over Political Capital.
    expect(screen.getByTestId('hud-heat').tagName).not.toBe('BUTTON');
  });

  it("the gauges' button opens on the note of the label under the tap", () => {
    render(
      <HudBar
        character={{ ...characterViewFixture, pc: 5 }}
        nextTickIn={null}
        heat={60}
        health={{ value: 90, max: 125 }}
      />,
    );
    // Design Review 2 #6: Energy, Health, Heat, XP, Party XP from the top.
    const rows: Record<string, number> = { energy: 0, health: 15, heat: 30, xp: 45, fxp: 60 };
    for (const el of document.querySelectorAll<HTMLElement>('[data-note]')) {
      const top = rows[el.dataset.note!]!;
      el.getBoundingClientRect = () =>
        ({ top, bottom: top + 12, left: 0, right: 300, width: 300, height: 12, x: 0, y: top }) as DOMRect;
    }
    const help = screen.getByTestId('hud-help');
    expect(help).toHaveAccessibleName('What Energy, Health, Heat, XP and Party XP mean');
    const opened = (y: number) => {
      fireEvent.click(help, { clientX: 20, clientY: y, detail: 1 });
      const title = screen.getByTestId('help-note').querySelector('h2')!.textContent;
      fireEvent.click(within(screen.getByTestId('help-note')).getByRole('button', { name: 'Close' }));
      return title;
    };
    // Review 4 #12 (answers §12): Heat's note names its state.
    expect(opened(35)).toBe('Heat · Hot');
    expect(opened(20)).toBe('Health');
    expect(opened(50)).toBe('Experience');
    // Review 4 #25: the Party XP label opens the rank ladder instead of a note.
    fireEvent.click(help, { clientX: 20, clientY: 63, detail: 1 });
    expect(screen.queryByTestId('help-note')).toBeNull();
    const ladder = screen.getByTestId('rank-ladder');
    expect(ladder).toHaveTextContent("The Collective's ranks");
    fireEvent.click(within(ladder).getByRole('button', { name: 'Close' }));
    expect(opened(4)).toBe('Energy');
    // A keyboard press (detail 0) keeps the order: Energy first.
    fireEvent.click(help, { detail: 0 });
    expect(screen.getByTestId('help-note').querySelector('h2')).toHaveTextContent('Energy');
  });
});

describe('#24 Health always in the HUD', () => {
  it('full Health is shown too, as a meter in the gauges', () => {
    render(<HudBar character={characterViewFixture} nextTickIn={null} health={{ value: 125, max: 125 }} />);
    expect(screen.getByTestId('hud-health-value')).toHaveTextContent('125 / 125');
    expect(screen.getByRole('meter', { name: 'Health' })).toHaveAttribute('aria-valuemax', '125');
  });

  it('held sideways (the 60 px HUD), Health and Heat ride in the name line: one button, their own notes', async () => {
    const user = userEvent.setup();
    render(<HudBar character={characterViewFixture} nextTickIn={null} heat={60} health={{ value: 90, max: 125 }} />);
    const side = screen.getByTestId('hud-vitals-short');
    expect(side).toHaveClass('hidden', 'short:flex');
    expect(side).toHaveAccessibleName('Health 90 / 125, Heat 60 · Hot: what they mean');
    // The grid's copies step aside at that size.
    expect(screen.getByTestId('hud-health')).toHaveClass('short:hidden');
    expect(screen.getByTestId('hud-heat')).toHaveClass('short:hidden');
    await user.click(side);
    const note = screen.getByTestId('help-note');
    expect(note.querySelector('h2')).toHaveTextContent('Health');
    expect(note).toHaveTextContent('How much notice the police are taking of you');
    expect(note).not.toHaveTextContent('Every action costs Energy.');
  });
});
