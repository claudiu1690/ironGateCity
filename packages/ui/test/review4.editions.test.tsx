import { capitalPaperFixture, issueRowFixtures, paperViewFixture } from '@irongate/rules/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IssuesSection, Masthead } from '../src';

/**
 * Review 4, phase 7 (docs/tech/review-4.md §5.4; answers §23): the masthead's edition line and the
 * local Issues pair in a local edition.
 */

const NAMES = { vanguard: 'Vanguard', collective: 'Collective', alliance: 'Alliance' } as const;

describe('the masthead (answers §23.1)', () => {
  it('at home: no edition line; the dateline names the paper’s city', () => {
    render(<Masthead paper={paperViewFixture} />);
    expect(screen.queryByTestId('edition-line')).toBeNull();
    expect(screen.getByTestId('dateline')).toHaveTextContent('Coalport');
  });

  it('away: *The Coalport Clarion · Duskwall edition*, dotted, opening its note; the dateline is Duskwall', () => {
    render(
      <div style={{ width: 360 }}>
        <Masthead
          paper={{
            ...paperViewFixture,
            edition: { cityId: 'duskwall', cityName: 'Duskwall' },
            dateline: { ...paperViewFixture.dateline, city: 'Duskwall' },
          }}
        />
      </div>,
    );
    const header = screen.getByRole('banner');
    expect(header).toHaveTextContent(`${paperViewFixture.paper.name}· Duskwall edition`);
    expect(screen.getByTestId('edition-line')).toHaveTextContent('· Duskwall edition');
    expect(screen.getByTestId('dateline')).toHaveTextContent('Duskwall');
    fireEvent.click(screen.getByRole('button', { name: 'What the Duskwall edition means' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Away from home it prints a local edition');
  });
});

describe('the Issues in a local edition (answers §23.2)', () => {
  it('the local pair first, each row naming its place; the rest of the rows fold with the other cities', () => {
    const local = issueRowFixtures.map((r) => ({ ...r, cityId: 'duskwall', placeName: 'Duskwall', local: true }));
    const capital = issueRowFixtures.map((r) => ({ ...r, issueId: `${r.issueId}.c`, placeName: 'Eastside' }));
    render(
      <IssuesSection
        issues={{ newThisWeek: false, rows: [...local, ...issueRowFixtures, ...capital], more: capitalPaperFixture.issues!.more }}
        names={NAMES}
        settles="Sunday 00:00"
      />,
    );
    const section = screen.getByTestId('issues-section');
    const rows = within(section).getAllByTestId('issue-row');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('Duskwall');
    expect(rows[1]).toHaveTextContent('Duskwall');
    expect(within(section).getByTestId('issues-more')).toHaveTextContent('Eastside');
  });
});
