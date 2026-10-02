import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlacesList } from '../src';
import type { PlaceRow } from '../src';

/** Review 3 (the user, 2 Oct 2026): a list of the places on the map, beside looking for the pins. */

const places: PlaceRow[] = [
  { id: 'coalport.union-hall', n: 3, name: 'Union Hall', blurb: "The Collective's hall.", order: true },
  { id: 'coalport.mill-gate', n: 1, name: 'Mill Gate', blurb: 'The gates of the Coalport Steel Mill.' },
  {
    id: 'coalport.market-row',
    n: 2,
    name: 'Market Row',
    blurb: 'Striped awnings between the mill and the quay.',
  },
];

const renderList = (over: Partial<Parameters<typeof PlacesList>[0]> = {}) => {
  const onOpenChange = vi.fn();
  const onPick = vi.fn();
  render(
    <PlacesList
      open
      onOpenChange={onOpenChange}
      cityName="Coalport"
      places={places}
      onPick={onPick}
      {...over}
    />,
  );
  return { onOpenChange, onPick };
};

describe('the Places list', () => {
  it('is a dialog named for the city, with every place in pin order: number, name, line', () => {
    renderList();
    const dialog = screen.getByRole('dialog', { name: 'Places in Coalport' });
    const rows = within(dialog).getAllByTestId('place-row');
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.querySelector('[aria-hidden="true"]')!.textContent)).toEqual(['1', '2', '3']);
    expect(rows[0]).toHaveAccessibleName('1. Mill Gate');
    expect(rows[0]).toHaveAccessibleDescription('The gates of the Coalport Steel Mill.');
    expect(rows[2]).toHaveAccessibleName('3. Union Hall, Party order');
    expect(rows[2]).toHaveTextContent('Union Hall');
    expect(rows[2]).toHaveTextContent("The Collective's hall.");
    // The line is held to two lines; the rows are real buttons, at least 44 px tall.
    expect(rows[0]!.querySelector('.line-clamp-2')).not.toBeNull();
    expect(rows.every((r) => r.tagName === 'BUTTON' && r.className.includes('min-h-11'))).toBe(true);
    // Focus moves into the list.
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('tags the places a Party order points to, and only those', () => {
    renderList();
    const tags = screen.getAllByTestId('place-order');
    expect(tags).toHaveLength(1);
    expect(tags[0]!.closest('button')).toHaveTextContent('Union Hall');
    expect(tags[0]).toHaveTextContent('Party order');
  });

  it('a tap on a row closes the list, then goes to that place', () => {
    const { onOpenChange, onPick } = renderList();
    fireEvent.click(screen.getByRole('button', { name: /^2\. Market Row/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onPick).toHaveBeenCalledExactlyOnceWith('coalport.market-row');
    expect(onOpenChange.mock.invocationCallOrder[0]!).toBeLessThan(onPick.mock.invocationCallOrder[0]!);
  });

  it('closes with its Close button and with Escape', () => {
    const { onOpenChange, onPick } = renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    onOpenChange.mockClear();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('shows nothing while closed', () => {
    renderList({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
