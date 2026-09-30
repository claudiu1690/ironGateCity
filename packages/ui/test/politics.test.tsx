import {
  councilViewFixture,
  countViewFixture,
  electionViewFixture,
  frontPageFixture,
  politicalResultFixture,
  politicsSummaryFixture,
} from '@irongate/rules/testing';
import type { PoliticalResult, PoliticsSummaryView } from '@irongate/rules';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  CouncilCard,
  CountTable,
  FrontPage,
  OrderPaper,
  PollingDayRow,
  ResultModal,
  Slate,
  formatAt,
  formatUntil,
  ordinanceTagText,
  pollingDayLines,
  renderTimeTokens,
} from '../src';

const S = politicsSummaryFixture;

describe('time tokens (tech design §4.3)', () => {
  it('until: "{weekday} midnight" at local 00:00, else "{weekday} hh:mm"; at: "hh:mm on {weekday}"', () => {
    // The test runner's clock is UTC (vitest config TZ).
    const wedMidnight = Date.UTC(2026, 9, 7); // Wednesday 7 October 00:00 UTC
    expect(formatUntil(wedMidnight)).toBe('Tuesday midnight');
    expect(formatUntil(wedMidnight + 3_600_000)).toBe('Wednesday 01:00');
    expect(formatAt(wedMidnight)).toBe('00:00 on Wednesday');
    expect(renderTimeTokens('Until {until}; at {at}.', { until: wedMidnight, at: wedMidnight })).toBe(
      'Until Tuesday midnight; at 00:00 on Wednesday.',
    );
    expect(renderTimeTokens('No {until} here', {})).toBe('No {until} here');
  });
});

describe('PollingDayRow (screens §2.1)', () => {
  const states: Array<[PoliticsSummaryView['state'], Partial<PoliticsSummaryView>, RegExp]> = [
    ['ballot', {}, /^Cast your ballot/],
    ['voted', { votedFor: 'Anna Weiss' }, /^Ballot cast for Anna Weiss/],
    ['stand', { phase: 'nominations' }, /^Stand for the council · 10 PC/],
    [
      'filed',
      { endorsements: { n: 1, needed: 2, branchWillMakeUp: true } },
      /On the slate · endorsements 1 \/ 2/,
    ],
    [
      'count',
      { count: { winner: 'Weiss', npcSeats: 6, seats: 7, turnout: { voters: 3, eligible: 9 } } },
      /Weiss tops the poll/,
    ],
    ['councilSits', { divideAt: Date.UTC(2026, 9, 7) }, /^The council sits · vote on the ordinance/],
    ['nominations', { phase: 'nominations' }, /^Nominations open in Coalport/],
    ['belowRank', { route: null }, /^Coalport votes from Thursday/],
  ];
  it.each(states)('%s', (state, over, text) => {
    const onOpen = vi.fn();
    render(<PollingDayRow summary={{ ...S, ...over, state }} onOpen={onOpen} />);
    const row = screen.getByTestId('polling-day-row');
    expect(row).toHaveTextContent(text);
    expect(row.tagName).toBe(state === 'belowRank' ? 'DIV' : 'BUTTON');
  });

  it('the filed row says the branch will make up the number; the below-rank line names the rank', () => {
    expect(
      pollingDayLines({ ...S, state: 'filed', endorsements: { n: 0, needed: 2, branchWillMakeUp: true } })[1],
    ).toBe('The branch will make up the number');
    expect(pollingDayLines({ ...S, state: 'belowRank' })[1]).toBe(
      'Activists vote. 400 Faction XP makes an Activist.',
    );
    expect(pollingDayLines({ ...S, state: 'belowRank', rank2Title: 'Steward' })[1]).toBe(
      'Stewards vote. 400 Faction XP makes a Steward.',
    );
  });

  it('opens the route', async () => {
    const onOpen = vi.fn();
    render(<PollingDayRow summary={S} onOpen={onOpen} />);
    await userEvent.setup().click(screen.getByTestId('polling-day-row'));
    expect(onOpen).toHaveBeenCalledWith('/council/ballot');
  });
});

describe('CouncilCard (screens §7)', () => {
  it('mirrors the row: the state line, the ordinance in force, one button', async () => {
    const onOpen = vi.fn();
    render(<CouncilCard summary={S} onOpen={onOpen} />);
    const card = screen.getByTestId('council-card');
    expect(card).toHaveTextContent('Polls open · closes');
    expect(card).toHaveTextContent('Ordinance in force: Shift Hours Order · 3 days left');
    await userEvent.setup().click(within(card).getByRole('button', { name: 'Cast your ballot' }));
    expect(onOpen).toHaveBeenCalledWith('/council/ballot');
  });
});

describe('Slate (screens §3, §4)', () => {
  it('nominations: players first, then the ward candidates; Endorse · 10 PC', async () => {
    const onEndorse = vi.fn();
    render(<Slate candidates={electionViewFixture.candidates} mode="slate" onEndorse={onEndorse} />);
    const rows = screen.getAllByTestId('slate-row');
    expect(rows[0]).toHaveTextContent('Mara Lenk');
    expect(rows[0]).toHaveTextContent('Organiser · One of Us in Coalport · endorsements 1 / 2');
    expect(rows[1]).toHaveTextContent('ward · One of Us in Coalport');
    expect(screen.getByText('Ward candidates')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Endorse · 10 PC' }));
    expect(onEndorse).toHaveBeenCalledWith('66f9a0000000000000000009');
  });

  it('ballot: radio rows, no totals; a cast ballot marks its row and dims the rest', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <Slate
        candidates={electionViewFixture.candidates}
        mode="ballot"
        selectedKey={null}
        onSelect={onSelect}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    await userEvent.setup().click(screen.getAllByRole('radio')[1]!);
    expect(onSelect).toHaveBeenCalledWith('n:npc.c.weiss');
    rerender(<Slate candidates={electionViewFixture.candidates} mode="ballot" castKey="n:npc.c.weiss" />);
    expect(screen.getByText('Your ballot')).toBeInTheDocument();
    expect(screen.queryByText(/total/i)).toBeNull();
  });
});

describe('CountTable (screens §5.2)', () => {
  it('seven seats, the line, you, your vote, ward marks and the formula', () => {
    render(<CountTable rows={countViewFixture.rows} />);
    const rows = screen.getAllByTestId('count-row');
    expect(rows).toHaveLength(9);
    expect(rows.filter((r) => r.dataset.seated === 'true')).toHaveLength(7);
    expect(rows[0]).toHaveTextContent('Mara Lenk');
    expect(rows[0]).toHaveTextContent('you');
    expect(rows[0]).toHaveTextContent('your vote');
    expect(rows[6]).toHaveTextContent('the line');
    expect(rows[1]).toHaveTextContent('ward');
    expect(screen.getByText(/Total = ward vote \+ 3 × endorsements/)).toBeInTheDocument();
  });
});

describe('FrontPage (screens §2.2)', () => {
  it('the photograph, ELECTED (animated once), the caption, the headline, the count', () => {
    const { rerender } = render(<FrontPage front={frontPageFixture} />);
    const stamp = screen.getByTestId('stamp');
    expect(stamp).toHaveTextContent('ELECTED');
    expect(stamp.className).toContain('animate-stamp');
    expect(screen.getByTestId('front-page-caption')).toHaveTextContent(
      'Mara Lenk, Organiser, elected to Coalport Council',
    );
    expect(screen.getByRole('heading', { name: 'Mara Lenk Tops the Poll in Coalport' })).toBeInTheDocument();
    rerender(<FrontPage front={{ ...frontPageFixture, animate: false }} />);
    expect(screen.getByTestId('stamp').className).not.toContain('animate-stamp');
  });
});

describe('OrderPaper (screens §6.3, §6.4)', () => {
  it('open: radio rows with the branch line and Against all', async () => {
    const onSelect = vi.fn();
    render(
      <OrderPaper council={councilViewFixture} secretary="Petra Holm" selected={null} onSelect={onSelect} />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByText("the branch's motion · Petra Holm")).toBeInTheDocument();
    expect(screen.getByText('moved by you')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('radio', { name: /Against all/ }));
    expect(onSelect).toHaveBeenCalledWith('against');
  });

  it('divided: the counts and the Passed stamp; rose without a motion', () => {
    const divided = {
      ...councilViewFixture,
      window: { ...councilViewFixture.window, voting: false },
      paper: {
        status: 'divided' as const,
        items: councilViewFixture.paper.items.map((i) => ({
          ...i,
          votes: i.ordinanceId === 'ord.open-doors' ? 7 : 0,
          passed: i.ordinanceId === 'ord.open-doors',
        })),
        against: 0,
        rose: false,
      },
    };
    const { rerender } = render(<OrderPaper council={divided} secretary="Petra Holm" selected={null} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText('Passed')).toBeInTheDocument();
    rerender(
      <OrderPaper
        council={{
          ...divided,
          paper: {
            ...divided.paper,
            rose: true,
            items: divided.paper.items.map((i) => ({ ...i, passed: false })),
          },
        }}
        secretary="Petra Holm"
        selected={null}
      />,
    );
    expect(screen.getByText('Council rose without a motion')).toBeInTheDocument();
  });
});

describe('ResultModal, kind political (screens §9)', () => {
  const stamps: Array<[PoliticalResult['act'], string, 'success' | 'partial']> = [
    ['ballot', 'Ballot cast', 'success'],
    ['declare', 'Filed', 'success'],
    ['endorse', 'Endorsed', 'success'],
    ['withdraw', 'Withdrawn', 'partial'],
    ['propose', 'Moved', 'success'],
    ['councilVote', 'Voted', 'success'],
  ];
  it.each(stamps)('%s: the masthead strip, the stamp, the text, Continue only', (act, label, tone) => {
    render(
      <ResultModal
        result={{ ...politicalResultFixture, act, stamp: { label, tone } }}
        open
        onOpenChange={() => undefined}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('stamp')).toHaveTextContent(label);
    expect(within(dialog).getByText('The Coalport Clarion')).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Continue']);
    expect(within(dialog).queryByText('How it went')).toBeNull();
  });

  it('the ballot: morale +0.5 → 84.5 %, and the secrecy note', () => {
    render(<ResultModal result={politicalResultFixture} open onOpenChange={() => undefined} />);
    expect(screen.getByTestId('political-morale')).toHaveTextContent('Coalport morale +0.5 → 84.5 %');
    expect(screen.getByTestId('political-secret')).toHaveTextContent('the ballot is secret');
  });

  it('declare: the PC line and {until} rendered in the local clock', () => {
    render(
      <ResultModal
        result={{
          ...politicalResultFixture,
          act: 'declare',
          body: 'Two endorsements by {until} and your name is printed.',
          until: Date.UTC(2026, 9, 7),
          knockOns: { pc: { before: 45, after: 35 }, morale: null, endorsements: null },
        }}
        open
        onOpenChange={() => undefined}
      />,
    );
    expect(
      screen.getByText('Two endorsements by Tuesday midnight and your name is printed.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('political-pc')).toHaveTextContent('−10 PC · 35 left');
  });
});

describe('ordinance ticket tags (screens §8)', () => {
  it('words each kind', () => {
    const t = { ordinanceId: 'x', name: 'Rally Permits' };
    expect(ordinanceTagText({ ...t, kind: 'energy', value: 10 })).toBe('Rally Permits: 10 Energy');
    expect(ordinanceTagText({ ...t, name: 'Open Doors', kind: 'chance', value: 4 })).toBe('Open Doors: +4 %');
    expect(ordinanceTagText({ ...t, name: 'Ward Fund', kind: 'iron', value: -25 })).toBe(
      'Ward Fund: −25 % Iron',
    );
    expect(ordinanceTagText({ ...t, name: 'Public Meetings Order', kind: 'fxp', value: 25 })).toBe(
      'Public Meetings Order: +25 % FXP',
    );
  });
});
