import {
  councilViewFixture,
  countViewFixture,
  electionViewFixture,
  frontPageFixture,
  politicalResultFixture,
  politicsSummaryFixture,
} from '@irongate/rules/testing';
import type { ElectionYourLine, PoliticalResult, PoliticsSummaryView } from '@irongate/rules';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  CountTable,
  ElectionCard,
  FrontPage,
  OrderPaper,
  ResultModal,
  Slate,
  electionLines,
  formatAt,
  formatUntil,
  ordinanceTagText,
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

describe('ElectionCard (review 2: screens §1a, §2.1, §7)', () => {
  // The test runner's clock is UTC. The cycle: names in until Tuesday midnight (Wed 00:00), voting
  // from Wednesday, the result Sunday morning (Sun 00:00); now is Monday noon.
  const wed = Date.UTC(2026, 9, 7);
  const sun = Date.UTC(2026, 9, 11);
  const now = Date.UTC(2026, 9, 5, 12);
  const card = (over: Partial<PoliticsSummaryView['card']>): PoliticsSummaryView => ({
    ...S,
    inForce: null,
    card: { ...S.card, closesAt: wed, pollsOpenAt: wed, countAt: sun, ...over },
  });
  const result = {
    winner: 'Anna Weiss',
    yourLine: null,
    councilUntil: Date.UTC(2026, 9, 10),
    namesUntil: wed,
  };
  const table: Array<
    [string, Partial<PoliticsSummaryView['card']>, string, string, string | null, string | null]
  > = [
    [
      'belowRank',
      { state: 'belowRank', fxp: 120 },
      'Coalport elects its council on Sunday',
      'Activists vote · 400 Party XP makes an Activist · you have 120',
      null,
      "See who's standing",
    ],
    [
      'candidates',
      { state: 'candidates' },
      'Candidates are putting their names in',
      'Voting opens Wednesday · 2 days to stand or back someone',
      "See who's standing",
      null,
    ],
    [
      'candidates, eligible',
      { state: 'candidates', canStand: true },
      'Candidates are putting their names in',
      'Voting opens Wednesday · 2 days to stand or back someone',
      'Stand for the council · 10 Political Capital',
      "See who's standing",
    ],
    [
      'standing',
      { state: 'standing', backers: { n: 1, needed: 2, branchLine: false, branchWillMakeUp: false } },
      "You're standing · backers 1 of 2",
      "Two backers by Tuesday midnight or your name comes off · do today's orders and the branch backs you",
      'See the candidates',
      null,
    ],
    [
      'backing',
      { state: 'backing', backing: 'Anna Weiss' },
      "You're backing Anna Weiss",
      'Voting opens Wednesday · 2 days',
      "See who's standing",
      null,
    ],
    [
      'voting',
      { state: 'voting', closesAt: sun },
      'Voting is open',
      'Closes Saturday midnight · 6 days left · your vote is secret',
      'Vote now',
      null,
    ],
    [
      'voted',
      { state: 'voted', votedFor: 'Anna Weiss' },
      'You voted for Anna Weiss',
      'Result Sunday morning, here and in the Clarion',
      'See the candidates',
      null,
    ],
    [
      'candidateVoting',
      { state: 'candidateVoting', closesAt: sun },
      "You're a candidate · voting is open",
      'Closes Saturday midnight · you can vote for yourself',
      'Vote now',
      null,
    ],
    [
      'result',
      {
        state: 'result',
        canStand: true,
        result: { ...result, yourLine: { kind: 'voteWon', name: 'Anna Weiss' } },
      },
      'Result: Anna Weiss topped the poll · your vote: Anna Weiss was elected',
      'Seven seats · the new council sits until Friday · next election: names in until Tuesday midnight',
      'See the result',
      'Stand for the council · 10 Political Capital',
    ],
    [
      'councilSits',
      { state: 'councilSits', rule: { votedFor: null, divideAt: wed } },
      "You're on the council · vote on the rule",
      'The council votes Tuesday midnight · 2 days',
      'Vote on the rule',
      null,
    ],
    [
      'councilVoted',
      { state: 'councilVoted', rule: { votedFor: 'Open Doors', divideAt: wed } },
      'You voted for Open Doors',
      'Result Wednesday morning',
      'See the council',
      null,
    ],
  ];
  it.each(table)('%s', (_name, over, line1, line2, primary, secondary) => {
    render(<ElectionCard summary={card(over)} onOpen={vi.fn()} now={now} />);
    expect(screen.getByTestId('election-line1')).toHaveTextContent(line1);
    expect(screen.getByTestId('election-line2')).toHaveTextContent(line2);
    if (primary) expect(screen.getByTestId('election-primary')).toHaveTextContent(primary);
    else expect(screen.queryByTestId('election-primary')).toBeNull();
    if (secondary) expect(screen.getByTestId('election-secondary')).toHaveTextContent(secondary);
    else expect(screen.queryByTestId('election-secondary')).toBeNull();
  });

  it('your line on the result morning: elected, missed, your vote fell short', () => {
    const line = (yourLine: NonNullable<typeof result>['yourLine'] | ElectionYourLine) =>
      electionLines(card({ state: 'result', result: { ...result, yourLine } }), now).line1;
    expect(line({ kind: 'elected', place: 3 })).toBe(
      'Result: Anna Weiss topped the poll · you: elected, 3rd of 7',
    );
    expect(line({ kind: 'missed', margin: 3 })).toBe(
      'Result: Anna Weiss topped the poll · you: missed the last seat by 3',
    );
    expect(line({ kind: 'voteLost', name: 'Josef Baum' })).toBe(
      'Result: Anna Weiss topped the poll · your vote: Josef Baum fell short',
    );
    expect(line(null)).toBe('Result: Anna Weiss topped the poll');
  });

  it('the last day of voting closes tonight; the rule line; the first-time note; the buttons open routes', async () => {
    const onOpen = vi.fn();
    render(
      <ElectionCard
        summary={{ ...card({ state: 'voting', closesAt: Date.UTC(2026, 9, 6), firstTime: true }) }}
        onOpen={onOpen}
        now={now}
      />,
    );
    expect(screen.getByTestId('election-line2')).toHaveTextContent(
      'Closes tonight at midnight · your vote is secret',
    );
    expect(screen.getByTestId('election-first-time')).toHaveTextContent(
      'Coalport elects its council every five days. You can vote now; Organisers who are Known here can stand.',
    );
    await userEvent.setup().click(screen.getByTestId('election-primary'));
    expect(onOpen).toHaveBeenCalledWith('/council/ballot');
  });

  it('the paper row: one tap to the primary route; the rule line on the card', async () => {
    const onOpen = vi.fn();
    const { rerender } = render(
      <ElectionCard summary={card({ state: 'result', result })} onOpen={onOpen} layout="row" now={now} />,
    );
    await userEvent.setup().click(screen.getByTestId('polling-day-row'));
    expect(onOpen).toHaveBeenCalledWith('/council/count');
    rerender(
      <ElectionCard
        summary={{ ...S, inForce: { ordinanceId: 'ord.open-doors', name: 'Open Doors', daysLeft: 3 } }}
        onOpen={onOpen}
        now={now}
      />,
    );
    expect(screen.getByTestId('election-rule')).toHaveTextContent('Council rule: Open Doors · 3 days left');
    // Below Rank 2 the row is not a button (nothing to do yet, but the candidates on the card).
    rerender(<ElectionCard summary={card({ state: 'belowRank' })} onOpen={onOpen} layout="row" now={now} />);
    expect(screen.getByTestId('polling-day-row').tagName).toBe('BUTTON');
  });
});

describe('Slate (screens §3, §4)', () => {
  it('candidates: players first, then the local candidates; Back · 10 Political Capital', async () => {
    const onEndorse = vi.fn();
    render(<Slate candidates={electionViewFixture.candidates} mode="slate" onEndorse={onEndorse} />);
    const rows = screen.getAllByTestId('slate-row');
    expect(rows[0]).toHaveTextContent('Mara Lenk');
    expect(rows[0]).toHaveTextContent('Organiser · One of Us in Coalport · backers 1 of 2');
    expect(rows[1]).toHaveTextContent('local · One of Us in Coalport');
    expect(screen.getByText('Local candidates')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back · 10 Political Capital' }));
    expect(onEndorse).toHaveBeenCalledWith('66f9a0000000000000000009');
  });

  it('the vote: radio rows, no totals; a cast vote marks its row and dims the rest', async () => {
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
    expect(screen.getByText(/^You voted for /)).toBeInTheDocument();
    expect(screen.queryByText(/total/i)).toBeNull();
  });
});

describe('CountTable (screens §5.2)', () => {
  it('seven seats, the line, you, your vote, local marks and the formula in plain words', () => {
    render(<CountTable rows={countViewFixture.rows} />);
    const rows = screen.getAllByTestId('count-row');
    expect(rows).toHaveLength(9);
    expect(rows.filter((r) => r.dataset.seated === 'true')).toHaveLength(7);
    expect(rows[0]).toHaveTextContent('Mara Lenk');
    expect(rows[0]).toHaveTextContent('you');
    expect(rows[0]).toHaveTextContent('your vote');
    expect(rows[6]).toHaveTextContent('the line');
    expect(rows[1]).toHaveTextContent('local');
    expect(screen.getByText(/^Support = local support \+ 3 per backer \+ votes/)).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toContain('Support');
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
  it("open: radio rows with the party's proposal and None of these", async () => {
    const onSelect = vi.fn();
    render(
      <OrderPaper council={councilViewFixture} secretary="Petra Holm" selected={null} onSelect={onSelect} />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByText("the party's proposal · Petra Holm")).toBeInTheDocument();
    expect(screen.getByText('put forward by you')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('radio', { name: /None of these/ }));
    expect(onSelect).toHaveBeenCalledWith('against');
  });

  it("after the council's vote: the counts and the Passed stamp; no agreement", () => {
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
    expect(screen.getByText("The council couldn't agree · no rule this term")).toBeInTheDocument();
  });
});

describe('ResultModal, kind political (screens §9)', () => {
  const stamps: Array<[PoliticalResult['act'], string, 'success' | 'partial']> = [
    ['ballot', 'Vote cast', 'success'],
    ['declare', "You're standing", 'success'],
    ['endorse', 'Backed', 'success'],
    ['withdraw', 'Withdrawn', 'partial'],
    ['propose', 'Put forward', 'success'],
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

  it('the vote: morale +0.5 → 84.5 %, and the Next line last (review 2, screens §9)', () => {
    render(
      <ResultModal
        result={{ ...politicalResultFixture, next: 'Next: the result, Sunday morning.' }}
        open
        onOpenChange={() => undefined}
      />,
    );
    expect(screen.getByTestId('political-morale')).toHaveTextContent('Coalport morale +0.5 → 84.5 %');
    const items = screen.getAllByRole('listitem');
    expect(items.at(-1)).toHaveTextContent('Next: the result, Sunday morning.');
    expect(items.at(-1)).toHaveAttribute('data-testid', 'political-next');
  });

  it('standing: the Political Capital line and {until} rendered in the local clock', () => {
    render(
      <ResultModal
        result={{
          ...politicalResultFixture,
          act: 'declare',
          body: 'You need two backers by {until} or your name comes off.',
          until: Date.UTC(2026, 9, 7),
          knockOns: { pc: { before: 45, after: 35 }, morale: null, endorsements: null },
        }}
        open
        onOpenChange={() => undefined}
      />,
    );
    expect(
      screen.getByText('You need two backers by Tuesday midnight or your name comes off.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('political-pc')).toHaveTextContent('−10 Political Capital · 35 left');
  });
});

describe('council rule ticket tags (screens §8, review 2)', () => {
  it('words each kind; the odds as a word, never a percentage', () => {
    const t = { ordinanceId: 'x', name: 'Rally Permits' };
    expect(ordinanceTagText({ ...t, kind: 'energy', value: 10 })).toBe('Rally Permits · 10 Energy');
    expect(ordinanceTagText({ ...t, name: 'Open Doors', kind: 'chance', value: 4 })).toBe(
      'Open Doors · better odds',
    );
    expect(ordinanceTagText({ ...t, name: 'Street Fund', kind: 'iron', value: -25 })).toBe(
      'Street Fund · −25 % Iron',
    );
    expect(ordinanceTagText({ ...t, name: 'Public Meetings Order', kind: 'fxp', value: 25 })).toBe(
      'Public Meetings Order · +25 % Party XP',
    );
  });
});
