/**
 * Review 4, phases 2 and 5 (docs/tech/review-4.md §10.4, §11.5–§11.6; answers §9, §19, §20): the
 * cells screen's orders line and note, the release modal's and the result's knock-ons, the orders
 * panel when off, *In the cells now*, *Live here* and the Lodgings card.
 */
import type { ActionResult, CellsNowRow, PoliticalResult } from '@irongate/rules';
import {
  cellsFixture,
  lodgingsFixtures,
  ordersViewFixture,
  releasedResultFixture,
  residenceCardFixtures,
  takenInResultFixture,
} from '@irongate/rules/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CellsNowCard, HeldScreen, LodgingsCard, OrdersList, RegisterSheet, ResidenceCard, ResultModal } from '../src';

const noop = () => undefined;
const energy = { value: 60, nextTickAt: null };

describe('the cells screen (answers §20.3)', () => {
  const held = (ordersOff: boolean) => (
    <HeldScreen
      held={{ ...cellsFixture, ordersOff }}
      now={cellsFixture.since + 60_000}
      health={{ value: 125, max: 125 }}
      energy={energy}
      onBail={noop}
      onWalkOut={noop}
      onDischarge={noop}
      pending={null}
      onTap={noop}
    />
  );
  it('the orders line under the sentence while they are off; the note is the new rule', () => {
    const { unmount } = render(held(true));
    expect(screen.getByTestId('held-sentence')).toHaveTextContent('either way');
    expect(screen.getByTestId('held-orders-off')).toHaveTextContent(
      "The branch has taken today's orders off the board.",
    );
    fireEvent.click(screen.getByRole('button', { name: 'What the cells mean' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('A sentence of twenty to sixty minutes, by your Heat.');
    expect(screen.getByRole('dialog')).toHaveTextContent('a mark on your record, and no Party orders until the day turns');
    unmount();
    render(held(false));
    expect(screen.queryByTestId('held-orders-off')).toBeNull();
  });
});

describe('the knock-ons (answers §20.3, tech design §11.6)', () => {
  it('the release modal: Heat, bail, the record taken in, the orders off', () => {
    const r: PoliticalResult = {
      ...releasedResultFixture,
      act: 'bail',
      knockOns: {
        ...releasedResultFixture.knockOns,
        heat: { before: 58, after: 25 },
        iron: { before: 900, after: 750 },
        takenIn: { added: 1, marks: 1, level: 'onFile' },
        ordersOff: true,
      },
    };
    render(<ResultModal result={r} open onOpenChange={noop} onContinue={noop} />);
    expect(screen.getByTestId('political-heat')).toHaveTextContent('Heat 58 → 25 · Noticed');
    expect(screen.getByTestId('political-iron')).toHaveTextContent('−150 Iron · bail');
    expect(screen.getByTestId('political-taken-in')).toHaveTextContent('Your record: taken in · 1 mark · On file');
    expect(screen.getByTestId('political-orders-off')).toHaveTextContent('Orders off until the day turns');
  });

  it('a mission ending in the cells: the record line is the arrest, and the orders are off', () => {
    const street = takenInResultFixture.street!;
    const r: ActionResult = {
      ...takenInResultFixture,
      street: { ...street, record: { ...street.record!, added: 1, marks: 1, after: 'onFile', takenIn: true }, ordersOff: true },
    };
    render(<ResultModal result={r} open onOpenChange={noop} />);
    expect(screen.getByTestId('effect-record')).toHaveTextContent('Your record: taken in · 1 mark · On file');
    expect(screen.getByTestId('effect-orders-off')).toHaveTextContent('Orders off until the day turns');
  });
});

describe('the orders panel when off (answers §20.1)', () => {
  it('one quiet line on the city screen; the paper keeps the list with the line', () => {
    const off = { ...ordersViewFixture, off: { reason: 'cells' as const } };
    const { unmount } = render(<OrdersList orders={off} />);
    expect(screen.getByTestId('orders-off')).toHaveTextContent('Orders off today · the branch heard about the cells');
    expect(screen.queryAllByTestId('order')).toHaveLength(0);
    unmount();
    // Off wins over away.
    const { unmount: u2 } = render(<OrdersList orders={{ ...off, away: { cityName: 'Coalport', done: 1, of: 3 } }} />);
    expect(screen.getByTestId('orders-off')).toBeInTheDocument();
    expect(screen.queryByTestId('orders-away')).toBeNull();
    u2();
    render(<OrdersList orders={off} variant="paper" />);
    expect(screen.getByTestId('orders-off')).toBeInTheDocument();
    expect(screen.getAllByTestId('order').length).toBe(ordersViewFixture.items.length);
  });
});

describe('In the cells now (answers §19)', () => {
  const now = Date.UTC(2026, 9, 7, 14, 0);
  const rows: CellsNowRow[] = [
    { name: 'Ada Varga', avatar: null, factionId: 'vanguard', until: now + 24 * 60_000, you: false },
    { name: 'Mara Lenk', avatar: null, factionId: 'collective', until: now + 38 * 60_000, you: true },
    { name: 'Gone Already', avatar: null, factionId: 'alliance', until: now - 1, you: false },
  ];
  const names = { vanguard: 'Iron Vanguard', collective: 'Red Collective', alliance: 'Civic Alliance' };
  it('a row a prisoner, any party: the name, the party mark, out in n min, you; not one past its time', () => {
    render(<CellsNowCard rows={rows} now={now} factionNames={names} />);
    const card = screen.getByTestId('cells-now');
    expect(card).toHaveTextContent('In the cells now');
    const list = within(card).getAllByTestId('cells-now-row');
    expect(list).toHaveLength(2);
    expect(list[0]).toHaveTextContent('Ada Varga');
    expect(list[0]).toHaveTextContent('out in 24 min');
    expect(within(list[0]!).getByRole('img', { name: 'Iron Vanguard' })).toBeInTheDocument();
    expect(within(list[0]!).queryByTestId('cells-now-you')).toBeNull();
    expect(within(list[1]!).getByTestId('cells-now-you')).toHaveTextContent('you');
  });
  it('empty: the duty officer is reading', () => {
    render(<CellsNowCard rows={[]} now={now} factionNames={names} />);
    expect(screen.getByTestId('cells-now-empty')).toHaveTextContent('Nobody. The duty officer is reading.');
  });
});

describe('Live here and Lodgings (answers §9.2–§9.3)', () => {
  it('the card: one button, Live here · 500 Iron; its note says what living somewhere means', () => {
    const onRegister = vi.fn();
    render(<ResidenceCard card={residenceCardFixtures.visitingMay} placeName="Eastside" rank2Title="Activist" onRegister={onRegister} />);
    expect(screen.getAllByRole('button').filter((b) => b.textContent === 'Live here · 500 Iron')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('residence-register'));
    expect(onRegister).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'What Where you live means' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('everything you own comes with you');
  });
  it('the sheet: Live in Eastside · 500 Iron, and the button Live here · 500 Iron', () => {
    render(
      <RegisterSheet open onOpenChange={noop} placeName="Eastside" cost={500} lines={residenceCardFixtures.visitingMay.sheet!.lines} onRegister={noop} />,
    );
    expect(screen.getByRole('dialog', { name: 'Live in Eastside · 500 Iron' })).toBeInTheDocument();
    expect(screen.getByTestId('register-confirm')).toHaveTextContent('Live here · 500 Iron');
  });
  it('Lodgings: the kicker and its note, the line, the benefit in words, Take a bed', () => {
    render(<LodgingsCard lodgings={lodgingsFixtures.take} onTake={noop} />);
    expect(screen.getByTestId('lodgings')).toHaveTextContent('Lodgings');
    expect(screen.getByTestId('lodgings-take')).toHaveClass('min-h-11');
    fireEvent.click(screen.getByRole('button', { name: 'What Lodgings means' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Rested banks to 250 instead of 200');
  });
});
