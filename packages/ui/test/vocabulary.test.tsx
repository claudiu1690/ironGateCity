import {
  actionResultFixture,
  batchResultFixture,
  chapterCheckScreenFixture,
  characterViewFixture,
  cityViewFixture,
  councilViewFixture,
  countViewFixture,
  electionViewFixture,
  frontPageFixture,
  paperViewFixture,
  politicalResultFixture,
  politicsSummaryFixture,
  trainingResultFixture,
} from '@irongate/rules/testing';
import type { ElectionCardState } from '@irongate/rules';
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { playerStrings, systemTermHits } from '../../content/test/vocabulary';
import {
  CountTable,
  DeskList,
  ElectionCard,
  FrontPage,
  HudBar,
  JobsCard,
  LocationSheet,
  Masthead,
  OrderPaper,
  OrdersComplete,
  OrdersList,
  OutOfEnergyCard,
  ResultModal,
  SeatGrid,
  Slate,
  StatPointsPanel,
  StoryScreen,
  Ticket,
  TodayStrip,
} from '../src';

/**
 * Review 2 (answers §1.13, GDD §1.5): the words `packages/ui` prints itself carry no system term.
 * Each component is rendered from the fixtures; the fixtures' own strings (test data standing in
 * for content, which `packages/content` checks) are taken out, and what is left, with every
 * `aria-label` and `title`, is scanned with the content test's regex.
 */
const FIXTURES: unknown[] = [
  actionResultFixture,
  batchResultFixture,
  trainingResultFixture,
  characterViewFixture,
  cityViewFixture,
  councilViewFixture,
  countViewFixture,
  electionViewFixture,
  frontPageFixture,
  paperViewFixture,
  politicalResultFixture,
  politicsSummaryFixture,
  chapterCheckScreenFixture,
];
/** The fixtures' strings, longest first, so a long one goes before a part of it. */
const fixtureStrings = [
  ...new Set(FIXTURES.flatMap((f) => playerStrings(f).map((s) => s.text)).filter((t) => t.trim().length > 2)),
].sort((a, b) => b.length - a.length);

function uiWords(ui: ReactElement): string {
  render(ui);
  const doc = document.body;
  const attrs = [...doc.querySelectorAll('[aria-label], [title]')].flatMap((el) => [
    el.getAttribute('aria-label') ?? '',
    el.getAttribute('title') ?? '',
  ]);
  let text = [doc.textContent ?? '', ...attrs].join('\n');
  for (const s of fixtureStrings) text = text.split(s).join('…');
  cleanup();
  return text;
}

const noop = () => undefined;
const energy = { value: 100, nextTickAt: null };
const mill = cityViewFixture.locations[0]!;

describe('review 2 §1.13: no system term in what packages/ui prints', () => {
  const cases: Array<[string, ReactElement]> = [
    ['HudBar', <HudBar character={{ ...characterViewFixture, pc: 5, rested: 20 }} nextTickIn={1000} />],
    [
      'Ticket',
      <Ticket
        action={{
          ...mill.actions[0]!,
          tags: [{ ordinanceId: 'ord.open-doors', name: 'Open Doors', kind: 'chance', value: 4 }],
        }}
        energy={energy}
        onPerform={noop}
      />,
    ],
    [
      'Ticket, training',
      <Ticket action={cityViewFixture.locations[1]!.actions[0]!} energy={energy} onPerform={noop} />,
    ],
    [
      'Ticket, locked',
      <Ticket
        action={{ ...mill.actions[0]!, locked: { reason: 'STANDING', need: 2 } }}
        energy={energy}
        onPerform={noop}
      />,
    ],
    ['ResultModal', <ResultModal result={actionResultFixture} open onOpenChange={noop} onAgain={noop} />],
    ['ResultModal, ×3', <ResultModal result={batchResultFixture} open onOpenChange={noop} />],
    ['ResultModal, training', <ResultModal result={trainingResultFixture} open onOpenChange={noop} />],
    [
      'ResultModal, political',
      <ResultModal
        result={{
          ...politicalResultFixture,
          knockOns: {
            ...politicalResultFixture.knockOns,
            pc: { before: 45, after: 35 },
            endorsements: { name: 'Anna Weiss', n: 1, needed: 2 },
          },
        }}
        open
        onOpenChange={noop}
      />,
    ],
    ['Slate', <Slate candidates={electionViewFixture.candidates} mode="slate" onEndorse={noop} />],
    [
      'Slate, the vote',
      <Slate candidates={electionViewFixture.candidates} mode="ballot" castKey="n:npc.c.weiss" />,
    ],
    ['CountTable', <CountTable rows={countViewFixture.rows} />],
    ['FrontPage', <FrontPage front={frontPageFixture} />],
    ['SeatGrid', <SeatGrid seats={councilViewFixture.seats} factionId="collective" />],
    [
      'OrderPaper',
      <OrderPaper council={councilViewFixture} secretary="Petra Holm" selected={null} onSelect={noop} />,
    ],
    [
      'LocationSheet',
      <LocationSheet
        open
        onOpenChange={noop}
        n={1}
        kindLabel="Factory gate"
        name={mill.name}
        blurb={mill.blurb}
      >
        <JobsCard jobs={mill.jobs} held={null} onTake={noop} />
        <OutOfEnergyCard fullAt={0} waiting={['x']} />
      </LocationSheet>,
    ],
    ['OrdersList', <OrdersList orders={characterViewFixture.orders} variant="paper" />],
    ['TodayStrip', <TodayStrip today={characterViewFixture.today} />],
    [
      'Paper',
      <>
        <Masthead paper={paperViewFixture} />
        <DeskList desk={paperViewFixture.desk} />
      </>,
    ],
    [
      'StatPointsPanel',
      <StatPointsPanel
        pending={1}
        level={2}
        stats={{ str: 10, int: 12, agi: 5 }}
        guide={characterViewFixture.statGuide}
        onPlace={noop}
        onLater={noop}
      />,
    ],
    [
      'OrdersComplete',
      <OrdersComplete
        open
        note={{ pc: 5, fxp: 60 }}
        factionId="collective"
        name="X"
        issuer={characterViewFixture.orders.issuer}
        onCarryOn={noop}
      />,
    ],
    ['StoryScreen', <StoryScreen view={chapterCheckScreenFixture} selectedApproach="sort" />],
  ];
  const states: ElectionCardState[] = [
    'belowRank',
    'candidates',
    'standing',
    'backing',
    'voting',
    'voted',
    'candidateVoting',
    'result',
    'councilSits',
    'councilVoted',
  ];
  for (const state of states) {
    const summary = {
      ...politicsSummaryFixture,
      card: {
        ...politicsSummaryFixture.card,
        state,
        canStand: true,
        firstTime: true,
        backers: { n: 1, needed: 2, branchLine: true, branchWillMakeUp: true },
        backing: 'X',
        votedFor: 'X',
        result: {
          winner: 'X',
          yourLine: { kind: 'missed' as const, margin: 3 },
          councilUntil: 0,
          namesUntil: 0,
        },
        rule: { votedFor: null, divideAt: 0 },
      },
    };
    cases.push([`ElectionCard ${state}`, <ElectionCard summary={summary} onOpen={noop} />]);
    cases.push([`Election row ${state}`, <ElectionCard summary={summary} onOpen={noop} layout="row" />]);
  }

  it.each(cases)('%s', (_name, ui) => {
    const words = uiWords(ui);
    expect(systemTermHits([{ name: 'ui', value: words }])).toEqual([]);
    // No percentage of chance anywhere a player reads (GDD §8.4): a "%" only on rewards and shares.
    expect(words).not.toMatch(/\d+ % ·|Chance|Rolled \d/);
  });
});
