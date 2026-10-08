/**
 * Review 4, phase 1 (docs/tech/review-4.md §12, T1–T4): the HUD's clock and its note, the countdowns
 * read through `copy.when`, and Heat as a body line under Energy with its note by state.
 */
import {
  cellsFixture,
  characterViewFixture,
  cityViewFixture,
  ordersViewFixture,
} from '@irongate/rules/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeldScreen, HudBar, LocationSheet, OrdersList, PlacesList, RankLadderSheet, Ticket } from '../src';

// The test runner's clock is UTC (vitest config TZ).
const at = (h: number, m: number) => Date.UTC(2026, 9, 7, h, m, 30);

describe('T1 the clock in the top bar (answers §4.1)', () => {
  it('shows the time to the minute, at the right of the Energy line on a phone and in the first line wide', () => {
    render(<HudBar character={characterViewFixture} nextTickIn={null} now={at(14, 22)} />);
    expect(screen.getByTestId('hud-clock-time')).toHaveTextContent('14:22');
    expect(screen.getByTestId('hud-clock-line-time')).toHaveTextContent('14:22');
    // One of the two shows at a time: the Energy line's under 1024 px, the first line's from it.
    expect(screen.getByTestId('hud-clock')).toHaveClass('flex', 'lg:hidden', 'short:hidden');
    expect(screen.getByTestId('hud-clock-line')).toHaveClass('hidden', 'lg:flex', 'short:flex');
    // A 44 px target of its own, above the gauges' button.
    expect(screen.getByTestId('hud-clock')).toHaveClass('min-h-11', 'min-w-11', 'relative', 'z-10');
  });

  it('follows the clock it is given (the dev panel moves it)', () => {
    const { rerender } = render(
      <HudBar character={characterViewFixture} nextTickIn={null} now={at(14, 22)} />,
    );
    rerender(<HudBar character={characterViewFixture} nextTickIn={null} now={at(15, 22)} />);
    expect(screen.getByTestId('hud-clock-time')).toHaveTextContent('15:22');
  });

  it("its note: when the day turns, and (review 5, answers §11.3) the town's six-hour day", () => {
    render(<HudBar character={characterViewFixture} nextTickIn={null} now={at(14, 22)} />);
    fireEvent.click(screen.getByTestId('hud-clock'));
    const note = screen.getByTestId('help-note');
    expect(within(note).getByRole('heading', { level: 2 })).toHaveTextContent('The clock');
    expect(note).toHaveTextContent(
      "The game runs on real time, shown in your own clock. The day turns at 00:00. The town's own day is six hours long: dusk comes round four times a day, and the map and the streets are dark for two hours each time. Every time you read in the game is in this clock.",
    );
  });

  it('"full in 40 min" under the Energy bar (the `when` phrase)', () => {
    const now = at(14, 0);
    render(
      <HudBar
        character={{
          ...characterViewFixture,
          energy: { ...characterViewFixture.energy, fullAt: now + 40 * 60_000 },
        }}
        nextTickIn={60_000}
        now={now}
      />,
    );
    expect(screen.getByTestId('hud-next-tick')).toHaveTextContent('full in 40 min');
  });
});

describe('T4 Heat on the HUD (answers §12)', () => {
  const hot = {
    ...characterViewFixture,
    heat: {
      value: 60,
      state: 'hot' as const,
      at: at(14, 0),
      stepMs: 720_000,
      coolsAt: at(20, 40),
      zeroAt: null,
    },
  };

  it('a 13 px body line under Energy, "Heat 60 · Hot", the state word in the failure colour', () => {
    render(<HudBar character={hot} nextTickIn={null} heat={60} now={at(14, 0)} />);
    const line = screen.getByTestId('hud-heat');
    expect(line).toHaveClass('font-body', 'text-[13px]');
    expect(screen.getByTestId('hud-heat-line')).toHaveTextContent('Heat 60 · Hot');
    expect(line.querySelector('[data-heat-state="hot"]')).toHaveClass('text-failure-fill');
    // Under Energy: the next line after the Energy row in the gauges, before XP.
    const grid = screen.getByTestId('hud-help').parentElement!;
    const notes = [...grid.querySelectorAll<HTMLElement>('[data-note]')].map((e) => e.dataset.note);
    expect(notes.slice(0, 3)).toEqual(['energy', 'heat', 'xp']);
  });

  it('not shown at 0', () => {
    render(<HudBar character={characterViewFixture} nextTickIn={null} heat={0} now={at(14, 0)} />);
    expect(screen.queryByTestId('hud-heat')).toBeNull();
  });

  it('its note prints the state line and "Cool at {time}"', () => {
    render(<HudBar character={hot} nextTickIn={null} heat={60} now={at(14, 0)} />);
    const help = screen.getByTestId('hud-help');
    const line = screen.getByTestId('hud-heat');
    line.getBoundingClientRect = () =>
      ({ top: 20, bottom: 32, left: 0, right: 300, width: 300, height: 12, x: 0, y: 20 }) as DOMRect;
    fireEvent.click(help, { clientX: 10, clientY: 25, detail: 1 });
    const note = screen.getByTestId('help-note');
    expect(note.querySelector('h2')).toHaveTextContent('Heat · Hot');
    expect(note).toHaveTextContent(
      'Hot (50 and over): the same, more so, and your name taken means the cells.',
    );
    expect(note).toHaveTextContent('Cool at 20:40.');
  });
});

// ---------------------------------------------------------------------------------------------
// T2 and T3: the card slot, the orders away, the Known tag, the Issue chip, the rank ladder, Legal Aid.
// ---------------------------------------------------------------------------------------------

describe('T2 the place sheet card slot (tech design §3.1)', () => {
  it('renders the cards after the tickets, in the order given', () => {
    render(
      <LocationSheet
        open
        onOpenChange={() => undefined}
        n={1}
        kindLabel="Factory gate"
        name="Mill Gate"
        blurb="The gate."
        cards={[
          <p key="a" data-testid="card-a">
            A
          </p>,
          <p key="b" data-testid="card-b">
            B
          </p>,
        ]}
      >
        <p data-testid="ticket-x">ticket</p>
      </LocationSheet>,
    );
    const order = [...document.querySelectorAll('[data-testid^="card-"], [data-testid="ticket-x"]')].map(
      (e) => e.getAttribute('data-testid'),
    );
    expect(order).toEqual(['ticket-x', 'card-a', 'card-b']);
  });
});

describe('T3 the home orders away (answers §13)', () => {
  const away = { ...ordersViewFixture, away: { cityName: 'Coalport', done: 1, of: 3 } };

  it('one 36 px line, not tappable, no chevron: "Your orders are in Coalport · 1 of 3 done"', () => {
    render(<OrdersList orders={away} onPin={() => undefined} />);
    const line = screen.getByTestId('orders-away');
    expect(line).toHaveTextContent('Your orders are in Coalport · 1 of 3 done');
    expect(line).toHaveClass('h-9');
    expect(line.tagName).toBe('P');
    expect(within(screen.getByTestId('orders')).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByTestId('order')).toHaveLength(0);
    expect(line).not.toHaveTextContent('›');
  });

  it('the paper keeps the full list', () => {
    render(<OrdersList orders={away} variant="paper" />);
    expect(screen.queryByTestId('orders-away')).toBeNull();
    expect(screen.getAllByTestId('order')).toHaveLength(3);
  });
});

describe('T3 Known here · better odds (answers §18)', () => {
  it('a checked ticket at Familiar or better carries the tag where the odds tags sit', () => {
    const canvass = cityViewFixture.locations[0]!.actions[0]!;
    render(
      <Ticket
        action={{ ...canvass, placeTags: [...(canvass.placeTags ?? []), { kind: 'known' }] }}
        energy={{ value: 100, nextTickAt: null }}
        onPerform={() => undefined}
      />,
    );
    expect(screen.getByTestId('ticket-tags')).toHaveTextContent('Known here · better odds');
  });
});

describe('T3 the Issue chip (answers §14)', () => {
  it('the Places list names the Issue, and the chip opens its note', () => {
    render(
      <PlacesList
        open
        onOpenChange={() => undefined}
        cityName="Coalport"
        places={[
          { id: 'coalport.quays', n: 4, name: 'Harbour Quays', blurb: 'The quays.', issue: 'Harbour Rates' },
        ]}
        onPick={() => undefined}
      />,
    );
    const chip = screen.getByTestId('place-issue');
    expect(chip).toHaveTextContent('Issue · Harbour Rates');
    // Its own button, not inside the row's.
    expect(chip.closest('[data-testid="place-row"]')).toBeNull();
    fireEvent.click(chip);
    const note = screen.getByTestId('help-note');
    expect(note.querySelector('h2')).toHaveTextContent('Issue of the week');
    expect(note).toHaveTextContent('Two things the town is arguing about this week, drawn Monday.');
  });
});

describe('T3 the rank ladder (answers §25)', () => {
  it('seven rows with the floors and what each opens; your row marked, the next with what is left', () => {
    render(
      <RankLadderSheet
        open
        onOpenChange={() => undefined}
        factionName="Collective"
        ranks={characterViewFixture.ranks}
        rank={2}
        fxp={1_212}
      />,
    );
    const sheet = screen.getByTestId('rank-ladder');
    expect(sheet).toHaveTextContent("The Collective's ranks");
    const rows = screen.getAllByTestId('rank-row');
    expect(rows).toHaveLength(7);
    expect(rows[1]).toHaveAttribute('data-you', 'true');
    expect(rows[1]).toHaveTextContent('Activist');
    expect(within(rows[1]!).getByTestId('rank-you')).toHaveTextContent('you');
    expect(within(rows[2]!).getByTestId('rank-next')).toHaveTextContent('next · 788 more');
    expect(rows[2]).toHaveTextContent('2,000 Party XP');
    expect(rows[2]).toHaveTextContent(
      'Standing for the council; calling campaign events; the harder missions',
    );
    expect(rows[6]).toHaveTextContent("The title for life, and a line in the party's history");
    expect(sheet).toHaveTextContent('Ranks give rights: tap for the ladder. 788 more to Organiser.');
  });

  it('the HUD keyboard path: the Party XP note carries "See the ranks", which opens the ladder', () => {
    render(<HudBar character={characterViewFixture} nextTickIn={null} now={at(14, 0)} />);
    fireEvent.click(screen.getByTestId('hud-help'), { detail: 0 });
    fireEvent.click(within(screen.getByTestId('help-note')).getByRole('button', { name: 'See the ranks' }));
    expect(screen.queryByTestId('help-note')).toBeNull();
    expect(screen.getByTestId('rank-ladder')).toBeInTheDocument();
  });
});

describe('T3 Legal Aid (answers §17)', () => {
  it('the line says what it means and opens its note', () => {
    render(
      <HeldScreen
        held={{ ...cellsFixture, bail: { ...cellsFixture.bail!, legalAid: true } }}
        now={cellsFixture.since + 60_000}
        health={{ value: 125, max: 125 }}
        energy={{ value: 50, nextTickAt: null }}
        onBail={() => undefined}
        onWalkOut={() => undefined}
        onDischarge={() => undefined}
        pending={null}
        onTap={() => undefined}
      />,
    );
    expect(screen.getByTestId('held-legal-aid')).toHaveTextContent(
      'Legal Aid · the Alliance pays half your bail',
    );
    fireEvent.click(screen.getByRole('button', { name: /what Legal Aid is/ }));
    expect(screen.getByTestId('help-note')).toHaveTextContent(
      'The Alliance runs a legal-aid desk in every town. Its members pay half of any bail, anywhere, as a matter of policy.',
    );
  });
});
