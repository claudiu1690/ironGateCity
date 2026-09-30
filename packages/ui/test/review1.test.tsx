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
  oddsSentence as sentence,
  rollLine,
  statLine,
} from '../src';

/** Review 1 (30 Sep 2026): `docs/design/review-1-answers.md` §4–§9 in the components. */
/** The sentence with its no-break spaces read as spaces. */
const oddsSentence = (c: CheckBreakdown) => sentence(c).replace(/\u00a0/g, ' ');
const check = (over: Partial<CheckBreakdown>): CheckBreakdown => ({ ...checkFixture, ...over });

describe('the odds as a sentence (answers §4)', () => {
  it('above, below, equal, two stats, best stat', () => {
    expect(oddsSentence(checkFixture)).toBe('Your INT 12 is 4 above the 8 this needs: 66 %.');
    expect(oddsSentence(check({ statValues: [5], statValue: 5, statTerm: -12, raw: 38, chance: 38 }))).toBe(
      'Your INT 5 is 3 below the 8 this needs: 38 %.',
    );
    expect(oddsSentence(check({ statValues: [8], statValue: 8, statTerm: 0, raw: 50, chance: 50 }))).toBe(
      'Your INT 8 matches the 8 this needs: 50 %.',
    );
    const two = check({
      stats: ['cha', 'int'],
      statValues: [2, 11],
      statValue: 6.5,
      statTerm: -6,
      raw: 44,
      chance: 44,
    });
    expect(oddsSentence(two)).toBe('CHA 2 and INT 11 average 6.5, 1.5 below the 8 this needs: 44 %.');
    expect(statLine(two)).toBe('CHA 2 + INT 11');
    const best = check({
      stats: ['str'],
      best: true,
      statValues: [13],
      statValue: 13,
      statTerm: 20,
      raw: 70,
      chance: 70,
    });
    expect(oddsSentence(best)).toBe('Your best, STR 13, is 5 above the 8 this needs: 70 %.');
    expect(statLine(best)).toBe('your best, STR 13');
  });

  it('bonuses end the sentence; the clamp says so', () => {
    const known = check({
      bonuses: [{ id: 'standing', label: 'Known in Coalport', value: 6 }],
      bonusTotal: 6,
      raw: 72,
      chance: 72,
    });
    expect(oddsSentence(known)).toBe(
      'Your INT 12 is 4 above the 8 this needs: 66 %, and +6 % for being Known here: 72 %.',
    );
    const first = check({
      bonuses: [{ id: 'first-day', label: 'First day in Duskwall', value: 10 }],
      bonusTotal: 10,
      raw: 76,
      chance: 76,
    });
    expect(oddsSentence(first)).toMatch(/and \+10 % for your first day in Duskwall: 76 %\.$/);
    const many = check({
      bonuses: [
        { id: 'first-day', label: 'First day in Coalport', value: 10 },
        { id: 'standing', label: 'Known in Coalport', value: 6 },
      ],
      bonusTotal: 16,
      raw: 82,
      chance: 82,
    });
    expect(oddsSentence(many)).toMatch(/: 66 %, and bonuses \+16 %: 82 %\.$/);
    const capped = check({ statValues: [16], statValue: 16, statTerm: 32, raw: 98, chance: 95 });
    expect(oddsSentence(capped)).toBe('Your INT 16 is 8 above the 8 this needs: 98 %, capped at 95 %.');
  });

  it('the roll, one line', () => {
    expect(rollLine({ roll: 26, chance: 38, outcome: 'success', tier: 1, type: 'canvass' })).toBe(
      'Rolled 26: Success (38 or under).',
    );
    expect(rollLine({ roll: 51, chance: 38, outcome: 'partial', tier: 1, type: 'canvass' })).toBe(
      'Rolled 51: Partial (39 to 58).',
    );
    expect(rollLine({ roll: 77, chance: 38, outcome: 'partial', tier: 1, type: 'canvass' })).toBe(
      'Rolled 77: Partial (a canvass never fails).',
    );
    expect(rollLine({ roll: 77, chance: 38, outcome: 'partial', tier: 1, type: 'intelligence' })).toBe(
      'Rolled 77: Partial (an intelligence never fails).',
    );
    expect(rollLine({ roll: 77, chance: 38, outcome: 'failure', tier: 3, type: 'chapter' })).toBe(
      'Rolled 77: Failure (more than 20 over).',
    );
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

  it('the HUD gauges carry one 44 px target with the Energy, XP and Faction XP notes', async () => {
    const user = userEvent.setup();
    render(<HudBar character={{ ...characterViewFixture, pc: 5 }} nextTickIn={null} />);
    expect(screen.getByRole('meter', { name: 'Energy' })).toBeInTheDocument();
    await user.click(screen.getByTestId('hud-help'));
    const note = screen.getByTestId('help-note');
    for (const kicker of ['Energy', 'Experience', 'Faction XP', 'Political Capital'])
      expect(note).toHaveTextContent(kicker);
    // The Faction XP note names the vote, the candidacy and what is left to the next Rank.
    expect(note).toHaveTextContent(
      'the vote at Activist, a council candidacy at Organiser. 394 more to Activist.',
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
      'Most of the work in Duskwall uses INT: 9 of 15 actions. Your best is STR 13.',
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
    expect(card).toHaveTextContent('Local standing');
    expect(card).toHaveTextContent('Familiar in Duskwall');
    expect(card).toHaveTextContent('Faces nod. Every check in Duskwall is now +3 %.');
    expect(card).toHaveTextContent('your name will do for a council candidacy at Bailiff.');
  });
});
