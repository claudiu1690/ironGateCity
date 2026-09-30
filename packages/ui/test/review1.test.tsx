import { actionResultFixture, characterViewFixture, checkFixture } from '@irongate/rules/testing';
import type { ActionResult, CheckBreakdown } from '@irongate/rules';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  HelpButton,
  HudBar,
  OrdersComplete,
  ResultModal,
  StatPointsPanel,
  TodayStrip,
  bandNote,
  batchReasons,
  oddsTag,
  reasonFor,
  statLine,
  ticketOdds,
} from '../src';

/** Review 1 (30 Sep 2026): `docs/design/review-1-answers.md` §4–§9 in the components. */
const check = (over: Partial<CheckBreakdown>): CheckBreakdown => ({ ...checkFixture, ...over });

/**
 * Review 2 (answers §2, GDD §8.4; replaces review 1's odds sentence and roll line): the odds are a
 * word, and a row that isn't a Success gets one plain reason with no number in it.
 */
describe('the odds as a word, the reason in plain words (review 2 §2)', () => {
  it('bands: Good odds from 70, Fair odds 50–69, Long shot under 50; the stat in full', () => {
    expect(ticketOdds(check({ chance: 70 }))).toBe('Good odds · Intelligence');
    expect(ticketOdds(check({ chance: 69 }))).toBe('Fair odds · Intelligence');
    expect(ticketOdds(check({ chance: 50 }))).toBe('Fair odds · Intelligence');
    expect(ticketOdds(check({ chance: 49 }))).toBe('Long shot · Intelligence');
    expect(statLine(check({ stats: ['cha', 'int'], statValues: [2, 11] }))).toBe('Charisma and Intelligence');
    expect(statLine(check({ stats: ['str'], best: true, statValues: [13] }))).toBe('your best, Strength');
    expect(bandNote(check({ chance: 76 }))).toEqual([
      'Good odds',
      'About three tries in four come off here. It uses your Intelligence.',
    ]);
    expect(oddsTag({ label: 'First day in Duskwall', value: 10 })).toBe(
      'First day in Duskwall · better odds',
    );
    expect(oddsTag({ label: 'Rain', value: -8 })).toBe('Rain · worse odds');
  });

  it('the reason: a low stat (with where to train it), a penalty, luck; never a digit', () => {
    const places = { int: 'the Union Hall', str: 'the Mill Gate' };
    const low = check({ statValues: [5], statValue: 5, statTerm: -12, raw: 38, chance: 38 });
    expect(reasonFor(low, 'partial', places)?.text).toBe(
      'Your Intelligence is low for this. Train it at the Union Hall.',
    );
    expect(reasonFor(low, 'partial')?.text).toBe('Your Intelligence is low for this.');
    expect(reasonFor(low, 'success', places)).toBeNull();
    const two = check({
      stats: ['cha', 'int'],
      statValues: [2, 11],
      statValue: 6.5,
      statTerm: -6,
      chance: 44,
    });
    expect(reasonFor(two, 'partial', places)?.text).toBe(
      'This needs Charisma and Intelligence, and your Charisma is the low one. It comes from what you wear.',
    );
    const cha = check({ stats: ['cha'], statValues: [3], statValue: 3, statTerm: -20, chance: 30 });
    expect(reasonFor(cha, 'partial')?.text).toBe(
      'Your Charisma is low for this. It comes from what you wear; a better coat helps.',
    );
    const best = check({
      stats: ['str'],
      best: true,
      statValues: [5],
      statValue: 5,
      statTerm: -12,
      chance: 38,
    });
    expect(reasonFor(best, 'partial')?.text).toBe(
      'Even your best, Strength, is low for this. Training anything would help.',
    );
    const rain = check({
      statValues: [7],
      statValue: 7,
      statTerm: -4,
      bonuses: [{ id: 'weather', label: 'Rain', value: -10 }],
      chance: 36,
    });
    expect(reasonFor(rain, 'partial')?.text).toBe('The rain was against you.');
    expect(reasonFor(check({ chance: 76 }), 'partial')?.text).toBe(
      "Bad luck. The odds were good; it just didn't come off. Try again.",
    );
    expect(reasonFor(check({ chance: 62 }), 'partial')?.text).toBe(
      'The odds were only fair. Every win here builds your reputation, and reputation lifts the odds.',
    );
    expect(reasonFor(low, 'failure', places)?.text).toBe(
      'It went badly. Your Intelligence is low for this. Train it at the Union Hall.',
    );
    for (const c of [low, two, cha, best, rain, check({ chance: 76 }), check({ chance: 62 })])
      for (const o of ['partial', 'failure'] as const)
        expect(reasonFor(c, o, places)?.text).not.toMatch(/\d/);
  });

  it('a batch: a shared cause prints once under the rows; a cause of its own under its row', () => {
    const low = check({ statValues: [5], statValue: 5, statTerm: -12, raw: 38, chance: 38 });
    const r = batchReasons(
      [
        { index: 1, check: low, outcome: 'partial' },
        { index: 2, check: low, outcome: 'success' },
        { index: 3, check: low, outcome: 'partial' },
      ],
      { int: 'the Union Hall' },
    );
    expect(r.shared).toBe(
      "2 of 3 didn't come off. Your Intelligence is low for this. Train it at the Union Hall.",
    );
    expect(r.byRow.size).toBe(0);
    const one = batchReasons([{ index: 1, check: check({ chance: 76 }), outcome: 'partial' }]);
    expect(one.shared).toBeNull();
    expect(one.byRow.get(1)).toMatch(/^Bad luck\./);
  });
});

describe('tap the label (answers §5)', () => {
  it('a help button opens its notes as a dialog, and closes', async () => {
    const user = userEvent.setup();
    render(
      <HelpButton
        notes={[
          ['Energy', 'Every action costs Energy.'],
          ['Rested', 'Banked.'],
        ]}
        label="What these mean"
      >
        Energy
      </HelpButton>,
    );
    await user.click(screen.getByRole('button', { name: 'What these mean' }));
    const note = screen.getByRole('dialog', { name: 'Energy' });
    expect(note).toHaveTextContent('Every action costs Energy.');
    expect(note).toHaveTextContent('Rested');
    await user.click(within(note).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the HUD gauges carry one 44 px target with the Energy, XP and Party XP notes', async () => {
    const user = userEvent.setup();
    render(<HudBar character={{ ...characterViewFixture, pc: 5 }} nextTickIn={null} />);
    expect(screen.getByRole('meter', { name: 'Energy' })).toBeInTheDocument();
    await user.click(screen.getByTestId('hud-help'));
    const note = screen.getByTestId('help-note');
    for (const kicker of ['Energy', 'Experience', 'Party XP', 'Political Capital'])
      expect(note).toHaveTextContent(kicker);
    // The Faction XP note names the vote, the candidacy and what is left to the next Rank.
    expect(note).toHaveTextContent(
      'the vote at Activist, standing for the council at Organiser. 394 more to Activist.',
    );
  });

  it('the Today strip explains each of its items', async () => {
    const user = userEvent.setup();
    render(<TodayStrip today={characterViewFixture.today} help={{ cityName: 'Coalport', turnsAt: 0 }} />);
    await user.click(screen.getByTestId('today-help'));
    const note = screen.getByTestId('help-note');
    expect(note).toHaveTextContent('Attempts');
    expect(note).toHaveTextContent("How far your work moved Coalport's meter today");
  });
});

describe('orders complete (answers §6)', () => {
  it("the secretary's note: two tiles, tomorrow's line, Carry on", async () => {
    const user = userEvent.setup();
    const onCarryOn = vi.fn();
    render(
      <OrdersComplete
        open
        note={{ pc: 5, fxp: 60 }}
        factionId="vanguard"
        name="Otto Brandt"
        issuer={characterViewFixture.orders.issuer}
        onCarryOn={onCarryOn}
      />,
    );
    const d = screen.getByTestId('orders-complete');
    expect(d).toHaveTextContent('Orders carried out');
    expect(d).toHaveTextContent('Three of three, Otto Brandt. Entered in the day book, in order.');
    expect(within(d).getByTestId('tile-pc')).toHaveTextContent('+5');
    expect(within(d).getByTestId('tile-orders-fxp')).toHaveTextContent('+60');
    expect(d).toHaveTextContent("Tomorrow's orders are in the morning paper");
    await user.click(within(d).getByRole('button', { name: 'Carry on' }));
    expect(onCarryOn).toHaveBeenCalled();
  });
});

describe('stat points: three stats and a reason (answers §7)', () => {
  it('leads with the computed line, one line per stat, the CHA footer', () => {
    render(
      <StatPointsPanel
        pending={1}
        level={2}
        stats={{ str: 13, int: 5, agi: 8 }}
        guide={{
          cityName: 'Duskwall',
          total: 15,
          counts: { str: 4, int: 9, agi: 2 },
          lead: 'int',
          best: { stat: 'str', value: 13 },
        }}
        onPlace={() => undefined}
      />,
    );
    expect(screen.getByTestId('stat-lead')).toHaveTextContent(
      // Review 2 (answers §1.2): the stat in full in a sentence; the codes stay on the buttons.
      'Most of the work in Duskwall uses Intelligence: 9 of 15 actions. Your best is Strength 13.',
    );
    expect(screen.getByRole('button', { name: 'AGI 8 → 9' })).toBeInTheDocument();
    expect(screen.getByTestId('stat-line-str')).toHaveTextContent(
      'Strength. Shift changes, loaders, posters, the gate steps: 4 of 15 actions here.',
    );
    expect(
      screen.getByText("Charisma isn't trained. It's worn: your coat, your suit, your party outfit."),
    ).toBeInTheDocument();
  });
});

describe('the Standing card (answers §9)', () => {
  it('shows the new title, the bonus now and the next level, inside the result modal', () => {
    const result: ActionResult = {
      ...actionResultFixture,
      effects: {
        ...actionResultFixture.effects,
        standingUp: { level: 1, cityName: 'Duskwall', rank3Title: 'Bailiff' },
      },
    };
    render(<ResultModal result={result} open onOpenChange={() => undefined} />);
    const card = screen.getByTestId('effect-standing-card');
    // Review 2 (answers §1.9): Reputation, and no percentages.
    expect(card).toHaveTextContent('Reputation');
    expect(card).toHaveTextContent('Familiar in Duskwall');
    expect(card).toHaveTextContent('Faces nod. Everything you do in Duskwall goes a little better now.');
    expect(card).toHaveTextContent('your name will do to stand for the council once you are a Bailiff.');
    expect(card).not.toHaveTextContent('%');
  });
});
