import type { TownHallView } from '@irongate/rules';
import { cityViewFixture, townHallDeskFixture, townHallFixture, whatNowFixture } from '@irongate/rules/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { systemTermHits } from '../../content/test/vocabulary';
import { CityMap, TownHallBlocks, WhatNowCard, bboxOf, deskNextLine, setClockSource } from '../src';

/**
 * Review 4, phases 3–4 (docs/tech/review-4.md §7.2, §8.4, §9.5): a home city's greyed pins on the map;
 * a district's drag limit as its outline's box; the Town Hall's blocks for a visitor and a councillor;
 * the *What now* card at 360 px.
 */

const noop = () => undefined;
const names = { vanguard: 'Vanguard', collective: 'Collective', alliance: 'Alliance' } as const;

describe('the greyed pins (answers §21.4)', () => {
  it('a locked pin is the disc at 50 % with the lock, named by its note; a tap reaches the page, no zoom', () => {
    const onSelect = vi.fn();
    render(
      <CityMap
        map={cityViewFixture.map}
        isNight={false}
        locations={[
          ...cityViewFixture.locations,
          {
            id: 'coalport.coal-yards',
            n: 0,
            name: 'Coal Yards',
            map: { x: 0.44, y: 0.84 },
            pin: { marks: ['locked'], sub: 'Opens with a later edition' },
          },
        ]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );
    const pin = screen.getByTestId('locked-pin');
    expect(pin).toHaveAttribute('aria-label', 'Coal Yards, opens with a later edition');
    expect(pin).toHaveAttribute('data-marks', 'locked');
    expect(within(pin).getByTestId('lock-mark')).toBeInTheDocument();
    expect(pin.querySelector('.opacity-50')).not.toBeNull();
    // The open places stay numbered hotspots.
    expect(screen.getAllByTestId('hotspot')).toHaveLength(cityViewFixture.locations.length);
    fireEvent.click(pin);
    expect(onSelect).toHaveBeenCalledWith('coalport.coal-yards');
  });

  it("bboxOf: a district's outline box (the drag limit)", () => {
    expect(
      bboxOf([
        [0, 0.37],
        [0.2, 0.4],
        [0.605, 0.53],
        [0.53, 1],
        [0, 1],
      ]),
    ).toEqual({ x0: 0, y0: 0.37, x1: 0.605, y1: 1 });
  });
});

describe('the Town Hall (answers §11.2)', () => {
  it('a visitor: the rule in force with its plain words, the seats as rows, the paper read-only, no desk', () => {
    render(<TownHallBlocks hall={townHallFixture} names={names} factionId="collective" />);
    expect(screen.queryByTestId('hall-desk')).toBeNull();
    expect(screen.getByTestId('hall-rule-name')).toHaveTextContent('Reading Room Grant');
    expect(screen.getByTestId('hall-rule-line')).toHaveTextContent('Studying costs a fifth less · 3 days left');
    const seats = screen.getAllByTestId('hall-seat');
    expect(seats).toHaveLength(7);
    expect(seats[0]).toHaveTextContent('Player · Organiser');
    expect(seats[1]).toHaveTextContent('Local candidate · townspeople run by the game');
    expect(screen.getByTestId('hall-term')).toHaveTextContent(/^Term ends \w+day$/);
    const paper = screen.getByTestId('hall-paper');
    expect(within(paper).queryAllByRole('radio')).toHaveLength(0);
    expect(within(paper).getByTestId('hall-next-vote')).toHaveTextContent(/^The council votes /);
  });

  it('no rule in force: *the council couldn\'t agree* after the vote, *the council votes …* before it', () => {
    const divided: TownHallView = { ...townHallFixture, inForce: null, noRule: { why: 'divided', at: null } };
    const { unmount } = render(<TownHallBlocks hall={divided} names={names} factionId="collective" />);
    expect(screen.getByTestId('hall-rule-line')).toHaveTextContent("No rule in force · the council couldn't agree");
    unmount();
    const before: TownHallView = {
      ...townHallFixture,
      inForce: null,
      noRule: { why: 'beforeVote', at: townHallFixture.divideAt },
    };
    render(<TownHallBlocks hall={before} names={names} factionId="collective" />);
    expect(screen.getByTestId('hall-rule-line')).toHaveTextContent(/^No rule in force · the council votes /);
  });

  it('a councillor: the desk first, the vote and *Put forward a rule*, the Next line', () => {
    setClockSource(() => townHallDeskFixture.serverNow);
    const onSelect = vi.fn();
    const onVote = vi.fn();
    render(
      <TownHallBlocks
        hall={townHallDeskFixture}
        names={names}
        factionId="collective"
        desk={{ selected: 'ord.open-doors', onSelect, onVote, onPropose: noop, pending: null }}
      />,
    );
    const desk = screen.getByTestId('hall-desk');
    // The desk comes before the public blocks; the read-only paper steps aside.
    expect(screen.getByTestId('town-hall').firstElementChild).toBe(desk);
    expect(screen.queryByTestId('hall-paper')).toBeNull();
    fireEvent.click(within(desk).getAllByRole('radio')[0]!);
    expect(onSelect).toHaveBeenCalledWith('ord.shift-hours');
    fireEvent.click(within(desk).getByRole('button', { name: 'Vote for Open Doors' }));
    expect(onVote).toHaveBeenCalled();
    expect(within(desk).getByRole('button', { name: 'Put forward a rule · 20 Political Capital' })).toBeInTheDocument();
    expect(within(desk).getByTestId('desk-next')).toHaveTextContent('Next: the council votes tomorrow');
    setClockSource(() => Date.now());
  });

  it('the Next line by cycle day', () => {
    const at = (next: NonNullable<TownHallView['desk']>['next']) =>
      deskNextLine({ desk: { ...townHallDeskFixture.desk!, next } });
    expect(at({ kind: 'voted', ordinance: 'Open Doors' })).toBe(
      "Your vote is in: Open Doors. The result is in tomorrow's paper.",
    );
    expect(at({ kind: 'runs', ordinance: 'Open Doors', untilDay: 20737, nominationsFromDay: 20735 })).toMatch(
      /^Next: Open Doors runs until \w+day; candidates put their names in from \w+day\.$/,
    );
    expect(at({ kind: 'rose', nominationsFromDay: 20735 })).toMatch(
      /^Next: no rule this term; candidates put their names in from \w+day\.$/,
    );
  });
});

describe('What now (answers §10.1)', () => {
  it('three numbered lines and the button, at 360 px with no overflow of words', () => {
    const onDesk = vi.fn();
    render(
      <div style={{ width: 360 }}>
        <WhatNowCard whatNow={whatNowFixture} hallName="Town Hall" onDesk={onDesk} />
      </div>,
    );
    const card = screen.getByTestId('what-now');
    expect(card).toHaveTextContent('What now · your five days');
    const items = within(card).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringMatching(/^1Put a rule forward — today or tomorrow, 20 Political Capital\./),
      expect.stringMatching(/^2Vote on the rule — one vote, before the council votes .+\. The rule with four of seven passes/),
      expect.stringMatching(/^3Draw your pay — 10 Political Capital and 20 Party XP every morning/),
    ]);
    fireEvent.click(within(card).getByRole('button', { name: 'To your desk at the Town Hall' }));
    expect(onDesk).toHaveBeenCalled();
  });

  it('the capital: six of ten', () => {
    render(<WhatNowCard whatNow={{ ...whatNowFixture, seatCount: 10, passVotes: 6 }} hallName="City Hall" />);
    expect(screen.getByTestId('what-now')).toHaveTextContent('The rule with six of ten passes');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('campaign vocabulary on every new string', () => {
    const { container } = render(
      <>
        <WhatNowCard whatNow={whatNowFixture} hallName="Town Hall" onDesk={noop} />
        <TownHallBlocks hall={townHallFixture} names={names} factionId="collective" />
      </>,
    );
    const text = container.textContent ?? '';
    expect(systemTermHits([{ name: 'ui', value: text }])).toEqual([]);
    expect(text).not.toMatch(/\b(war|battle|uprising|troops|front|enemy)\b/i);
  });
});
