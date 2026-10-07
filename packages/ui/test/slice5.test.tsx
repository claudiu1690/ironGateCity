import type { DeskView, JourneyCardView, NationCityView } from '@irongate/rules';
import {
  cellsFixture,
  deportedResultFixture,
  illegalMissionFixture,
  infirmaryFixture,
  journeyViewFixture,
  missionFixture,
  missionResultFixture,
  nationViewFixture,
  paperViewFixture,
  lockedPinFixtures,
  quarterFixtures,
  releasedResultFixture,
  riskCharacterFixture,
  runInFixture,
  takenInResultFixture,
} from '@irongate/rules/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { playerStrings, systemTermHits } from '../../content/test/vocabulary';
import {
  CityCard,
  DeskList,
  EncounterModal,
  HeldScreen,
  HudBar,
  JourneyCard,
  MissionBriefing,
  MissionTicket,
  LockedPinSheet,
  PlacesList,
  ResultModal,
  RiskRows,
  Ticket,
  healthNow,
  heatNow,
  minutesLeft,
  recordText,
  setClockSource,
} from '../src';

/**
 * Slice 5's components (docs/tech/slice-5.md §12.2, §15 UI): the mission ticket first, remembered and
 * locked by each reason; the briefing with three ways and a loud way; the run-in with and without Pay
 * and short of Iron; the mission result with its run-in, taken in; the cells and the infirmary, home
 * and rival, *again*; the release modals; the record rows; the quarters with a locked teaser; the HUD,
 * the desk, the nation card and the hostile card's rows.
 */

const NAMES = { vanguard: 'Vanguard', collective: 'Collective', alliance: 'Alliance' } as const;
const noop = () => undefined;
const energy = { value: 100, nextTickAt: null };
/** Odds are words: no digit beside a percentage sign, no "chance" (screens §1). */
const noOdds = (text: string) =>
  expect(text).not.toMatch(/\d+ ?%(?! (Iron|Party XP|opinion))|chance|rolled/i);

describe('the mission ticket (screens §4.1)', () => {
  it('the first time: the type, the odds word and stat, the risk line, one button *Choose a way*', () => {
    const onChoose = vi.fn();
    render(
      <MissionTicket
        mission={missionFixture}
        energy={energy}
        names={NAMES}
        onChoose={onChoose}
        onAgain={noop}
      />,
    );
    expect(screen.getByTestId('mission-tags')).toHaveTextContent(
      'Mission · Speech · Good odds · Intelligence',
    );
    expect(screen.getByTestId('risk-line')).toHaveTextContent('Heat +0 · A little risk');
    expect(screen.queryByTestId('mission-again')).toBeNull();
    fireEvent.click(screen.getByTestId('mission-choose'));
    expect(onChoose).toHaveBeenCalled();
    noOdds(screen.getByTestId(`mission-${missionFixture.id}`).textContent!);
  });

  it('remembered: *Again* with its cost, *Choose another way* under it, the record tag and the marks', () => {
    const onAgain = vi.fn();
    render(
      <MissionTicket
        mission={illegalMissionFixture}
        energy={energy}
        names={NAMES}
        onChoose={noop}
        onAgain={onAgain}
      />,
    );
    // QA fixes §2 (m3): the type and the odds on the tags line; the record tag a chip (§7.1).
    const tags = screen.getByTestId('mission-tags');
    expect(tags).toHaveTextContent(/^Mission · Against the Vanguard · Fair odds · Agility$/);
    expect(screen.getByTestId('mission-chips')).toHaveTextContent('On file · −10 % Iron');
    expect(screen.getByTestId('risk-line')).toHaveTextContent(
      'Heat +6 · Risky · if caught, a mark on your record',
    );
    expect(screen.getByTestId('mission-again-cost')).toHaveTextContent('10 Energy');
    expect(screen.getByTestId('mission-another')).toHaveTextContent('Choose another way');
    fireEvent.click(screen.getByTestId('mission-again'));
    expect(onAgain).toHaveBeenCalled();
  });

  it('a Dangerous risk word is in the failure colour', () => {
    render(
      <MissionTicket
        mission={{ ...illegalMissionFixture, risk: { heat: 24, runInChance: 30, marks: 3 } }}
        energy={energy}
        names={NAMES}
        onChoose={noop}
        onAgain={noop}
      />,
    );
    expect(screen.getByTestId('risk-line')).toHaveTextContent(
      'Heat +24 · Dangerous · if caught, three marks on your record',
    );
    expect(screen.getByTestId('risk-line')).toHaveAttribute('data-dangerous', 'true');
  });

  it.each([
    [{ reason: 'LEVEL' as const, need: 8 }, 'From Level 8'],
    [{ reason: 'RANK' as const, need: 3, rankTitle: 'Organiser' }, 'Organisers and above'],
    [{ reason: 'STANDING' as const, need: 2 }, 'Needs a Known reputation here'],
    [{ reason: 'RECORD' as const, need: 0 }, 'Not with your record'],
  ])('locked (%o): dimmed, one reason, no button', (locked, words) => {
    render(
      <MissionTicket
        mission={{ ...missionFixture, locked }}
        energy={energy}
        names={NAMES}
        onChoose={noop}
        onAgain={noop}
      />,
    );
    expect(screen.getByTestId('mission-lock')).toHaveTextContent(words);
    expect(screen.queryByTestId('mission-choose')).toBeNull();
    expect(screen.queryByTestId('risk-line')).toBeNull();
  });

  it('short of Energy: the button is disabled and the line says when', () => {
    render(
      <MissionTicket
        mission={missionFixture}
        energy={{ value: 5, nextTickAt: null }}
        names={NAMES}
        onChoose={noop}
        onAgain={noop}
      />,
    );
    expect(screen.getByTestId('mission-choose')).toBeDisabled();
    expect(screen.getByTestId('mission-hint')).toHaveTextContent('15 Energy');
  });
});

describe('the briefing (screens §4.2)', () => {
  it('three ways; a row selects, the sticky button spends: *{Way} · 15 Energy*', () => {
    const onConfirm = vi.fn();
    render(
      <MissionBriefing
        open
        onOpenChange={noop}
        mission={missionFixture}
        placeName="The Shipyard"
        energy={energy}
        onConfirm={onConfirm}
      />,
    );
    const sheet = screen.getByTestId('briefing');
    expect(within(sheet).getByTestId('briefing-kicker')).toHaveTextContent('Mission · The Shipyard');
    expect(within(sheet).getAllByTestId('way-row')).toHaveLength(3);
    expect(within(sheet).getByTestId('briefing-confirm')).toBeDisabled();
    // No digit before a choice is made (screens §4.2: odds are words).
    expect(sheet.textContent).not.toMatch(/\d/);
    fireEvent.click(within(sheet).getAllByTestId('way-row')[2]!);
    expect(within(sheet).getAllByTestId('way-row')[2]).toHaveAttribute('aria-checked', 'true');
    const confirm = within(sheet).getByTestId('briefing-confirm');
    expect(confirm).toHaveTextContent('The drawing office first, then the bank · 15 Energy');
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('int');
  });

  it('the remembered way first with *Last time*; a loud way prints its own run-in word', () => {
    render(
      <MissionBriefing
        open
        onOpenChange={noop}
        mission={illegalMissionFixture}
        placeName="The Far Bank"
        energy={energy}
        onConfirm={noop}
      />,
    );
    const rows = screen.getAllByTestId('way-row');
    expect(rows[0]).toHaveAttribute('data-way', 'agi');
    expect(within(rows[0]!).getByTestId('way-last')).toHaveTextContent('Last time');
    expect(within(rows[1]!).getByTestId('way-odds')).toHaveTextContent('run-in: Dangerous');
  });

  it('short of Energy: *Needs 10 Energy*, disabled', () => {
    render(
      <MissionBriefing
        open
        onOpenChange={noop}
        mission={illegalMissionFixture}
        placeName="The Far Bank"
        energy={{ value: 3, nextTickAt: null }}
        onConfirm={noop}
      />,
    );
    fireEvent.click(screen.getAllByTestId('way-row')[0]!);
    expect(screen.getByTestId('briefing-confirm')).toHaveTextContent('Needs 10 Energy');
    expect(screen.getByTestId('briefing-confirm')).toBeDisabled();
  });
});

describe('the run-in (screens §5)', () => {
  it('a face, a line, four rows with odds words and the price, *Leave it to luck*; one tap', () => {
    const onChoose = vi.fn();
    render(<EncounterModal pending={runInFixture} open onChoose={onChoose} choosing={null} />);
    const modal = screen.getByTestId('run-in');
    expect(within(modal).getByTestId('run-in-kicker')).toHaveTextContent('A run-in · The Far Bank');
    expect(within(modal).getByTestId('run-in-you')).toHaveTextContent('Health 125 / 125 · Heat 14 · Cool');
    expect(within(modal).getByTestId('run-in-fight')).toHaveTextContent('Fight');
    expect(within(modal).getByTestId('run-in-fight')).toHaveTextContent('Fair odds · Strength');
    expect(within(modal).getByTestId('run-in-fight')).toHaveTextContent('best free odds');
    expect(within(modal).getByTestId('run-in-run')).toHaveTextContent('Long shot · Agility');
    expect(within(modal).getByTestId('run-in-talk')).toHaveTextContent('Talk your way out');
    expect(within(modal).getByTestId('run-in-pay')).toHaveTextContent('Pay them off · 60 Iron');
    expect(within(modal).getByTestId('run-in-pay')).toHaveTextContent('nearly always works');
    expect(within(modal).getByTestId('run-in-luck')).toHaveTextContent('Leave it to luck');
    noOdds(modal.textContent!);
    fireEvent.click(within(modal).getByTestId('run-in-pay'));
    expect(onChoose).toHaveBeenCalledWith('pay');
  });

  it("won't be bought; short of Iron; every row disabled while a choice waits", () => {
    const { unmount } = render(
      <EncounterModal
        pending={{ ...runInFixture, rows: { ...runInFixture.rows, pay: null } }}
        open
        onChoose={noop}
        choosing={null}
      />,
    );
    expect(screen.getByTestId('run-in-pay')).toHaveTextContent("Won't be bought");
    expect(screen.getByTestId('run-in-pay')).toBeDisabled();
    unmount();
    const { unmount: u2 } = render(
      <EncounterModal
        pending={{
          ...runInFixture,
          rows: { ...runInFixture.rows, pay: { chance: 90, price: 60, affordable: false } },
        }}
        open
        onChoose={noop}
        choosing={null}
      />,
    );
    expect(screen.getByTestId('run-in-pay')).toHaveTextContent('Needs 60 Iron');
    expect(screen.getByTestId('run-in-pay')).toBeDisabled();
    u2();
    render(<EncounterModal pending={runInFixture} open onChoose={noop} choosing="fight" />);
    for (const id of ['run-in-fight', 'run-in-run', 'run-in-talk', 'run-in-pay', 'run-in-luck'])
      expect(screen.getByTestId(id)).toBeDisabled();
  });
});

describe('the mission result (screens §4.3)', () => {
  it('the run-in block first, the kicker, the receipt against the Vanguard, Heat, *Missions remember*, Again', () => {
    const onAgain = vi.fn();
    render(
      <ResultModal
        result={missionResultFixture}
        open
        onOpenChange={noop}
        onAgain={onAgain}
        energy={energy}
        factionNames={NAMES}
      />,
    );
    expect(screen.getByTestId('run-in-did')).toHaveTextContent(
      'You paid him off. He takes the notes without counting',
    );
    expect(screen.getByTestId('result-kicker')).toHaveTextContent(
      'Mission · Against the Vanguard · Tear down',
    );
    expect(screen.getByTestId('reward-opinion')).toHaveTextContent(
      'Opinion against the Vanguard in Coalport',
    );
    expect(screen.getByTestId('reward-opinion')).toHaveTextContent('Vanguard 9.0 → 8.8 %');
    expect(screen.getByTestId('reward-iron')).toHaveTextContent('paid off −60');
    expect(screen.getByTestId('effect-heat')).toHaveTextContent('Heat +6 → 6 · Cool');
    expect(screen.getByTestId('effect-remembered')).toHaveTextContent(
      'Missions remember: next time, one tap',
    );
    expect(screen.getByTestId('effect-agility')).toHaveTextContent('Agility +¼ · 3 more for a point');
    expect(screen.getByTestId('again-once')).toHaveAccessibleName('Again · 10 Energy');
    expect(screen.queryByTestId('again-three')).toBeNull();
    fireEvent.click(screen.getByTestId('again-once'));
    expect(onAgain).toHaveBeenCalled();
  });

  it('taken in: the stamp, the dropped note, the reason, the record and its card, one button *To the cells*', () => {
    const onSentTo = vi.fn();
    render(
      <ResultModal
        result={takenInResultFixture}
        open
        onOpenChange={noop}
        onSentTo={onSentTo}
        factionNames={NAMES}
      />,
    );
    expect(screen.getByTestId('stamp')).toHaveTextContent('Taken in');
    expect(screen.getByTestId('run-in-did')).toHaveTextContent(
      'You tried to run; he was faster. You fought and lost.',
    );
    expect(screen.getByTestId('run-in-health')).toHaveTextContent('Health 125 → 30');
    expect(screen.getByTestId('run-in-reason')).toHaveTextContent('You were outmatched.');
    expect(screen.getByTestId('attempt-dropped')).toHaveTextContent('dropped: you lost');
    expect(screen.getByTestId('effect-heat')).toHaveTextContent(
      /^Heat \+6 → 58 · Hot · Cool (in \d+ min|at \d\d:\d\d|tomorrow \d\d:\d\d|\w+day|now)$/,
    );
    expect(screen.getByTestId('effect-record')).toHaveTextContent(
      'The police took your name · 1 mark · On file',
    );
    expect(screen.getByTestId('effect-record-card')).toHaveTextContent('ON FILE · One mark.');
    expect(screen.queryByTestId('again-once')).toBeNull();
    fireEvent.click(screen.getByTestId('result-sent-to'));
    expect(onSentTo).toHaveBeenCalled();
    expect(screen.getByTestId('result-sent-to')).toHaveTextContent('To the cells');
  });
});

describe('the cells and the infirmary (screens §6, §7)', () => {
  const now = cellsFixture.since + 60_000;
  it('the cells at home: the minutes, out at, the duty officer, the sentence, Pay bail, the one tap', () => {
    const onBail = vi.fn();
    render(
      <HeldScreen
        held={cellsFixture}
        now={now}
        health={{ value: 125, max: 125 }}
        energy={energy}
        onBail={onBail}
        onWalkOut={noop}
        onDischarge={noop}
        pending={null}
        onTap={noop}
      />,
    );
    expect(screen.getByTestId('held-kicker')).toHaveTextContent('The cells · Harbour Police');
    expect(screen.getByTestId('held-minutes')).toHaveTextContent('38 minutes');
    expect(screen.getByTestId('held-out-at')).toHaveTextContent('out in 38 min · or pay bail');
    expect(screen.getByTestId('held-voice')).toHaveTextContent('"Name." He has it already.');
    expect(screen.getByTestId('held-sentence')).toHaveTextContent(
      'The door opens in 38 min either way, and Energy keeps refilling in here.',
    );
    expect(screen.getByTestId('stamp')).toHaveTextContent('Taken in');
    fireEvent.click(screen.getByTestId('held-bail'));
    expect(onBail).toHaveBeenCalled();
    expect(screen.getByTestId('held-bail')).toHaveTextContent('Pay bail · 150 Iron');
    expect(screen.getByTestId('ticket-held.cells')).toHaveTextContent('Listen to the cells');
    expect(screen.queryByTestId('ticket-three')).toBeNull();
  });

  it('rival ground: double bail; a second arrest: *You again*; short of Iron: *Needs 300 Iron*', () => {
    render(
      <HeldScreen
        held={{
          ...cellsFixture,
          rivalGround: true,
          bail: { total: 300, lines: [], affordable: false, legalAid: false },
        }}
        now={now}
        health={{ value: 125, max: 125 }}
        energy={energy}
        onBail={noop}
        onWalkOut={noop}
        onDischarge={noop}
        pending={null}
        onTap={noop}
      />,
    );
    expect(screen.getByTestId('held-voice')).toHaveTextContent('"Visiting, were we."');
    expect(screen.getByTestId('held-bail-double')).toHaveTextContent('Bail is double on rival ground');
    expect(screen.getByTestId('held-bail')).toHaveTextContent('Needs 300 Iron');
    expect(screen.getByTestId('held-bail')).toBeDisabled();
  });

  it('the infirmary: the matron, Health rising, *Walk out well* and *Discharge yourself*', () => {
    const onDischarge = vi.fn();
    render(
      <HeldScreen
        held={{ ...infirmaryFixture, again: true }}
        now={infirmaryFixture.since}
        health={{ value: 30, max: 125 }}
        energy={energy}
        onBail={noop}
        onWalkOut={noop}
        onDischarge={onDischarge}
        pending={null}
        onTap={noop}
      />,
    );
    expect(screen.getByTestId('held-kicker')).toHaveTextContent('The infirmary · the ward');
    expect(screen.getByTestId('held-minutes')).toHaveTextContent('20 minutes');
    expect(screen.getByTestId('held-out-at')).toHaveTextContent('Health 30 / 125, rising');
    expect(screen.getByTestId('held-voice')).toHaveTextContent('"You again," says the matron.');
    expect(screen.getByTestId('held-walk-out')).toHaveTextContent('Walk out well · 5 Energy · 100 Iron');
    fireEvent.click(screen.getByTestId('held-discharge'));
    expect(onDischarge).toHaveBeenCalled();
    expect(screen.getByTestId('stamp')).toHaveTextContent('Taken to the infirmary');
  });

  it('minutes left round up and stop at 0', () => {
    expect(minutesLeft(10 * 60_000 + 1, 0)).toBe(11);
    expect(minutesLeft(0, 5)).toBe(0);
  });

  it('the release modals: Released with Heat and bail; Put on the train with the bar; Continue', () => {
    const onContinue = vi.fn();
    const { unmount } = render(
      <ResultModal result={releasedResultFixture} open onOpenChange={noop} onContinue={onContinue} />,
    );
    expect(screen.getByTestId('stamp')).toHaveTextContent('Released');
    expect(screen.getByTestId('political-heat')).toHaveTextContent('Heat 58 → 25 · Noticed');
    expect(screen.getByTestId('political-iron')).toHaveTextContent('−150 Iron · bail');
    fireEvent.click(screen.getByTestId('political-continue'));
    expect(onContinue).toHaveBeenCalled();
    unmount();
    render(<ResultModal result={deportedResultFixture} open onOpenChange={noop} onContinue={noop} />);
    expect(screen.getByTestId('stamp')).toHaveTextContent('Put on the train');
    expect(screen.getByTestId('political-barred')).toHaveTextContent(
      /^Barred from Duskwall until (\d\d:\d\d|tomorrow \d\d:\d\d|\w+day \d\d:\d\d)$/,
    );
  });
});

describe('the record, Heat and Health (screens §2)', () => {
  it('the Me rows: Health, Heat with *Cool at*, the record and *Have a mark struck off*', () => {
    const onStrike = vi.fn();
    const c = riskCharacterFixture;
    render(
      <RiskRows
        heat={32}
        heatState="noticed"
        coolsAt={c.heat!.coolsAt}
        health={{ value: 96, max: 125 }}
        record={c.record!}
        pc={40}
        onStrike={onStrike}
      />,
    );
    expect(screen.getByTestId('me-health')).toHaveTextContent('96 / 125');
    expect(screen.getByTestId('me-heat')).toHaveTextContent(
      /^32 · Noticed · Cool (in \d+ min|at \d\d:\d\d|tomorrow \d\d:\d\d|\w+day|now)$/,
    );
    expect(screen.getByTestId('me-record')).toHaveTextContent(/^On file · 2 marks · one fades on \w+day$/);
    fireEvent.click(screen.getByTestId('me-strike'));
    expect(onStrike).toHaveBeenCalled();
    expect(screen.getByTestId('me-strike')).toHaveTextContent(
      'Have a mark struck off · 30 Political Capital',
    );
  });

  it('short of Political Capital: disabled; Clean; Notorious with bail doubled', () => {
    const r = riskCharacterFixture.record!;
    render(
      <RiskRows
        heat={0}
        heatState="cool"
        coolsAt={null}
        health={{ value: 125, max: 125 }}
        record={{ ...r, strike: { cost: 30, affordable: false } }}
        pc={10}
        onStrike={noop}
      />,
    );
    expect(screen.getByTestId('me-strike')).toHaveTextContent('Needs 30 Political Capital');
    expect(screen.getByTestId('me-strike')).toBeDisabled();
    expect(screen.getByTestId('me-heat')).toHaveTextContent('0 · Cool');
    expect(recordText({ ...r, level: 'clean', marks: 0 })).toBe('Clean');
    expect(recordText({ ...r, level: 'notorious', marks: 7, fading: 0, bailDoubled: true })).toBe(
      'Notorious · 7 marks · bail doubled',
    );
  });

  it('the HUD: Heat only above 0; Health always (review 4 #24)', () => {
    const { unmount } = render(
      <HudBar
        character={riskCharacterFixture}
        nextTickIn={null}
        heat={32}
        health={{ value: 96, max: 125 }}
      />,
    );
    expect(screen.getByTestId('hud-heat-line')).toHaveTextContent('Heat 32 · Noticed');
    expect(screen.getByTestId('hud-health-value')).toHaveTextContent('96 / 125');
    unmount();
    render(
      <HudBar
        character={riskCharacterFixture}
        nextTickIn={null}
        heat={0}
        health={{ value: 125, max: 125 }}
      />,
    );
    expect(screen.queryByTestId('hud-heat-line')).toBeNull();
    expect(screen.getByTestId('hud-health-value')).toHaveTextContent('125 / 125');
    expect(screen.getByRole('meter', { name: 'Health' })).toHaveAttribute('aria-valuenow', '125');
  });

  it('the lazy states tick on the client: Heat cools a point a step, Health back ten every ten minutes', () => {
    const h = riskCharacterFixture.heat!;
    expect(heatNow(h, h.at)).toBe(32);
    expect(heatNow(h, h.at + 2 * h.stepMs)).toBe(30);
    expect(heatNow(h, h.at + 100 * h.stepMs)).toBe(0);
    const hp = riskCharacterFixture.health!;
    expect(healthNow(hp, hp.at)).toBe(96);
    expect(healthNow(hp, hp.fullAt!)).toBe(125);
  });

  it('the desk: the held line first, then Where you are, Heat and the record', () => {
    const onHeld = vi.fn();
    // Review 4 (answers §4.2): the times read the clock source, pinned here.
    const now = Date.UTC(2026, 9, 6, 18, 0);
    setClockSource(() => now);
    const desk: DeskView = {
      ...paperViewFixture.desk,
      held: {
        kind: 'cells',
        placeName: 'Harbour Police',
        minutesLeft: 24,
        until: now + 24 * 60_000,
        bail: 150,
      },
      where: { rivalGround: { cityName: 'Duskwall' } },
      heat: { value: 32, state: 'noticed', coolsAt: Date.UTC(2026, 9, 6, 20, 40) },
      record: { level: 'onFile', marks: 2 },
    };
    render(<DeskList desk={desk} onHeld={onHeld} />);
    expect(screen.getByTestId('desk-held')).toHaveTextContent(
      'In the cells at Harbour Police · out in 24 min · bail 150 Iron',
    );
    fireEvent.click(screen.getByTestId('desk-held'));
    expect(onHeld).toHaveBeenCalled();
    expect(screen.getByTestId('desk-where')).toHaveTextContent(
      'Rival ground · Duskwall · everything is harder here',
    );
    expect(screen.getByTestId('desk-heat')).toHaveTextContent(/^Noticed \(32\), cooling · Cool at 20:40$/);
    expect(screen.getByTestId('desk-record')).toHaveTextContent('On file · 2 marks');
  });
});

describe('a home city is one map (review 4, answers §21.4, ADR 0076)', () => {
  it('the locked pin sheet: the kicker with the lock, the name, the blurb, *Level 6 opens it; you are Level 5.*, only Close', () => {
    render(
      <LockedPinSheet
        pin={{
          name: 'The Shipyard',
          lock: { kind: 'level', level: 6 },
          quarter: { name: 'The Harbour', blurb: quarterFixtures[1]!.blurb! },
        }}
        open
        onOpenChange={noop}
        level={5}
      />,
    );
    const sheet = screen.getByTestId('locked-pin-sheet');
    expect(within(sheet).getByTestId('locked-kicker')).toHaveTextContent('The Harbour · opens at Level 6');
    expect(within(within(sheet).getByTestId('locked-kicker')).getByTestId('lock-mark')).toBeInTheDocument();
    expect(within(sheet).getByRole('heading', { name: 'The Shipyard' })).toBeInTheDocument();
    expect(within(sheet).getByText(quarterFixtures[1]!.blurb!)).toBeInTheDocument();
    expect(within(sheet).getByTestId('locked-line')).toHaveTextContent('Level 6 opens it; you are Level 5.');
    expect(
      within(sheet)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Close']);
  });

  it('a later edition: *The Sidings · a later edition* and *Opens with a later edition*', () => {
    render(
      <LockedPinSheet
        pin={{ name: 'Coal Yards', lock: { kind: 'edition' }, quarter: { name: 'The Sidings', blurb: null } }}
        open
        onOpenChange={noop}
        level={9}
      />,
    );
    expect(screen.getByTestId('locked-kicker')).toHaveTextContent('The Sidings · a later edition');
    expect(screen.getByTestId('locked-line')).toHaveTextContent('Opens with a later edition');
  });

  it('the Places list grouped by quarter: the lock line in the header, the blurb on tap, locked rows greyed', () => {
    const onPick = vi.fn();
    render(
      <PlacesList
        open
        onOpenChange={noop}
        cityName="Coalport"
        places={[]}
        groups={[
          {
            id: 'coalport.mill',
            title: 'The Mill',
            blurb: 'The mill and the men who work it.',
            places: [
              { id: 'coalport.mill-gate', n: 1, name: 'Mill Gate', blurb: 'The gates.' },
              { id: 'coalport.town-hall', n: 12, name: 'Town Hall', blurb: 'The dome on the river.' },
            ],
          },
          {
            id: 'coalport.harbour',
            title: 'The Harbour · opens at Level 6',
            blurb: 'Where the basin opens to the sea.',
            places: [{ id: 'coalport.shipyard', n: 7, name: 'The Shipyard', blurb: '', locked: 'Opens at Level 6' }],
          },
        ]}
        onPick={onPick}
      />,
    );
    const titles = screen.getAllByTestId('place-group-title');
    expect(titles.map((t) => t.textContent)).toEqual(['The Mill+', 'The Harbour · opens at Level 6+']);
    expect(screen.queryByTestId('place-group-blurb')).toBeNull();
    fireEvent.click(titles[1]!);
    expect(screen.getByTestId('place-group-blurb')).toHaveTextContent('Where the basin opens to the sea.');
    expect(titles[1]).toHaveAttribute('aria-expanded', 'true');
    const rows = screen.getAllByTestId('place-row');
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      '1. Mill Gate',
      '12. Town Hall',
      'The Shipyard, opens at Level 6',
    ]);
    expect(rows[2]).toHaveAttribute('data-locked', 'true');
    expect(within(rows[2]!).getByTestId('lock-mark')).toBeInTheDocument();
    expect(within(rows[2]!).getByTestId('place-locked')).toHaveTextContent('Opens at Level 6');
    fireEvent.click(rows[2]!);
    expect(onPick).toHaveBeenCalledWith('coalport.shipyard');
  });
});

describe('rival ground (screens §8)', () => {
  const duskwall = (): NationCityView => ({
    ...nationViewFixture.cities.find((c) => c.cityId === 'ashford')!,
    cityId: 'duskwall',
    name: 'Duskwall',
    state: 'rival',
    lockWord: null,
    rival: { homeFactionId: 'vanguard' },
    minutes: 15,
    fare: { base: 20, lines: [], total: 20 },
    canBoard: { ok: true },
  });

  it('the nation card: the rival line, the note and *Board · 20 Iron · 15 min*; barred: no button', () => {
    const { unmount } = render(<CityCard city={duskwall()} names={NAMES} onBoard={noop} />);
    expect(screen.getByTestId('city-rival')).toHaveTextContent('Rival ground · Home city of the Vanguard');
    expect(screen.getByTestId('city-lock')).toHaveTextContent('Everything is harder here.');
    expect(screen.getByTestId('city-board')).toHaveTextContent('Board · 20 Iron · 15 min');
    unmount();
    render(
      <CityCard
        city={{
          ...duskwall(),
          state: 'barred',
          lockWord: 'barred',
          barredUntil: Date.UTC(2026, 9, 7, 14, 20),
          fare: null,
        }}
        names={NAMES}
        onBoard={noop}
      />,
    );
    expect(screen.getByTestId('city-lock')).toHaveTextContent(
      /^Barred · until (\d\d:\d\d|tomorrow \d\d:\d\d|\w+day \d\d:\d\d)$/,
    );
    expect(screen.queryByTestId('city-board')).toBeNull();
  });

  it('a ticket on rival ground: one button, *Once*, and the rival tag', () => {
    const base = missionFixture.ways[0]!.preview;
    render(
      <Ticket
        action={{
          id: 'duskwall.fortress-gate.talk',
          name: 'Talk to the customs men',
          type: 'canvass',
          kind: 'checked',
          givesFxp: true,
          energy: 10,
          energy3: null,
          preview: { ...base, bonuses: [{ id: 'rivalGround', label: 'Rival ground', value: -16 }] },
          order: null,
          locked: null,
          tags: [],
          placeTags: [{ kind: 'rivalGround', fxpPct: 50 }],
        }}
        energy={energy}
        onPerform={noop}
      />,
    );
    expect(screen.getByTestId('ticket-once')).toBeInTheDocument();
    expect(screen.queryByTestId('ticket-three')).toBeNull();
    const tags = screen.getByTestId('ticket-tags').textContent!;
    expect(tags).toContain('Rival ground · +50 % Party XP · worse odds');
    // The rival row's worse odds are the tag's words, not a second tag.
    expect(tags.match(/worse odds/g)).toHaveLength(1);
  });

  it('the checkpoint card: a gated row prints no odds word; a card that moves Heat says so', () => {
    const base = journeyViewFixture.card!;
    const card: JourneyCardView = {
      ...base,
      deck: 'hostile',
      title: 'Papers, please',
      choices: [
        {
          id: 'show',
          title: 'Show your papers',
          detail: 'your party card · it depends on your Heat and your record',
          stat: null,
          chance: null,
          cost: null,
          affordable: true,
          gated: true,
        },
      ],
      chosen: null,
    };
    const { unmount } = render(<JourneyCard card={card} onChoose={noop} />);
    expect(screen.getByTestId('journey-choice-line')).toHaveTextContent(
      /^your party card · it depends on your Heat and your record$/,
    );
    unmount();
    render(
      <JourneyCard
        card={{
          ...card,
          chosen: {
            ...journeyViewFixture.card!.chosen!,
            ...(base.chosen ?? {}),
            kind: 'journeyCard',
            journeyId: 'j',
            eventId: 'papers',
            choiceId: 'show',
            stamp: 'partial',
            headline: 'They write your name down',
            body: 'The man with the lamp writes slowly.',
            reason: null,
            rewards: [{ id: 'heat', amount: 10 }],
            opinion: null,
            points: null,
            quoted: false,
            // Review 4: `{until}` (the day's turn) is rendered in the player's clock.
            flag: {
              flag: 'watched',
              line: 'Watched today: run-ins likelier in Duskwall until {until}',
              until: Date.UTC(2026, 9, 8),
            },
            performedAt: new Date(0).toISOString(),
            idempotencyKey: 'k',
            character: riskCharacterFixture,
            journey: journeyViewFixture,
          },
        }}
        onChoose={noop}
      />,
    );
    expect(screen.getByTestId('journey-rewards')).toHaveTextContent('Heat +10');
    expect(screen.getByTestId('journey-flag')).toHaveTextContent(
      /^Watched today: run-ins likelier in Duskwall until (\d\d:\d\d|tomorrow \d\d:\d\d|\w+day \d\d:\d\d)$/,
    );
  });
});

/**
 * Tech design §12.5, T26: both vocabulary guards over the words the slice-5 components print
 * themselves (the fixtures' strings, standing in for content, are taken out first): no system term,
 * none of the screens' banned words (screens §1), no war framing, no odds as a number.
 */
describe('vocabulary over the slice-5 screens (screens §1, review 2 §1.13)', () => {
  const fixtures: unknown[] = [
    missionFixture,
    illegalMissionFixture,
    runInFixture,
    missionResultFixture,
    takenInResultFixture,
    cellsFixture,
    infirmaryFixture,
    releasedResultFixture,
    deportedResultFixture,
    quarterFixtures,
    riskCharacterFixture,
  ];
  const strip = [
    ...new Set(
      fixtures.flatMap((f) => playerStrings(f).map((s) => s.text)).filter((t) => t.trim().length > 2),
    ),
  ].sort((a, b) => b.length - a.length);
  const words = (ui: ReactElement) => {
    const { container, unmount } = render(ui);
    const doc = container.ownerDocument.body;
    const attrs = [...doc.querySelectorAll('[aria-label], [title]')].map(
      (el) => `${el.getAttribute('aria-label') ?? ''}\n${el.getAttribute('title') ?? ''}`,
    );
    let text = [doc.textContent ?? '', ...attrs].join('\n');
    for (const s of strip) text = text.split(s).join('…');
    unmount();
    return text;
  };
  const cases: Array<[string, ReactElement]> = [
    [
      'MissionTicket',
      <MissionTicket
        mission={illegalMissionFixture}
        energy={energy}
        names={NAMES}
        onChoose={noop}
        onAgain={noop}
      />,
    ],
    [
      'MissionBriefing',
      <MissionBriefing
        open
        onOpenChange={noop}
        mission={illegalMissionFixture}
        placeName="The Far Bank"
        energy={energy}
        onConfirm={noop}
      />,
    ],
    ['EncounterModal', <EncounterModal pending={runInFixture} open onChoose={noop} choosing={null} />],
    [
      'ResultModal, mission',
      <ResultModal
        result={missionResultFixture}
        open
        onOpenChange={noop}
        onAgain={noop}
        factionNames={NAMES}
      />,
    ],
    [
      'ResultModal, taken in',
      <ResultModal result={takenInResultFixture} open onOpenChange={noop} factionNames={NAMES} />,
    ],
    ['ResultModal, released', <ResultModal result={releasedResultFixture} open onOpenChange={noop} />],
    ['ResultModal, deported', <ResultModal result={deportedResultFixture} open onOpenChange={noop} />],
    [
      'HeldScreen, cells',
      <HeldScreen
        held={cellsFixture}
        now={cellsFixture.since}
        health={{ value: 125, max: 125 }}
        energy={energy}
        onBail={noop}
        onWalkOut={noop}
        onDischarge={noop}
        pending={null}
        onTap={noop}
      />,
    ],
    [
      'HeldScreen, infirmary',
      <HeldScreen
        held={infirmaryFixture}
        now={infirmaryFixture.since}
        health={{ value: 30, max: 125 }}
        energy={energy}
        onBail={noop}
        onWalkOut={noop}
        onDischarge={noop}
        pending={null}
        onTap={noop}
      />,
    ],
    [
      'RiskRows',
      <RiskRows
        heat={60}
        heatState="hot"
        coolsAt={0}
        health={{ value: 96, max: 125 }}
        record={riskCharacterFixture.record!}
        pc={40}
        onStrike={noop}
      />,
    ],
    [
      'HudBar',
      <HudBar
        character={riskCharacterFixture}
        nextTickIn={null}
        heat={80}
        health={{ value: 50, max: 125 }}
      />,
    ],
    [
      'LockedPinSheet',
      <LockedPinSheet
        pin={{ name: 'Coal Yards', lock: { kind: 'edition' }, quarter: { name: 'The Sidings', blurb: quarterFixtures[2]!.blurb! } }}
        open
        onOpenChange={noop}
        level={5}
      />,
    ],
    [
      'PlacesList (grouped)',
      <PlacesList
        open
        onOpenChange={noop}
        cityName="Coalport"
        places={[]}
        groups={quarterFixtures.map((q) => ({
          id: q.id,
          title: q.name,
          blurb: q.blurb ?? null,
          places: lockedPinFixtures
            .filter((l) => l.quarterId === q.id)
            .map((l) => ({ id: l.id, n: 0, name: l.name, blurb: '', locked: 'Opens at Level 6' })),
        }))}
        onPick={noop}
      />,
    ],
  ];
  it.each(cases)('%s', (_name, ui) => {
    const text = words(ui);
    expect(systemTermHits([{ name: 'ui', value: text }])).toEqual([]);
    expect(text).not.toMatch(
      /\b(encounters?|bluff\w*|brib\w*|flee\w*|approach\w*|criminal record|jail\w*|hospital\w*|surveillance|sabotage|hostile)\b/i,
    );
    expect(text).not.toMatch(
      /\b(war|battle|uprising|troops|soldiers?|army|enemy|weapon|sergeants?|uniforms?|torch)\b/i,
    );
    expect(text).not.toMatch(/\d+ % ·|Chance|Rolled \d/);
  });
});
