import type { ActionView, DistrictView, NationCityView } from '@irongate/rules';
import {
  capitalActionResultFixture,
  capitalCityViewFixture,
  capitalCountFixture,
  capitalCouncilFixture,
  capitalPaperFixture,
  capitalResultSummaryFixture,
  capitalSummaryFixture,
  districtFixtures,
  issueRowFixtures,
  journeyArrivedFixture,
  journeyChosenFixture,
  journeyViewFixture,
  nationViewFixture,
  registerResultFixture,
  lodgingsFixtures,
  residenceCardFixtures,
  stationMarketFixture,
} from '@irongate/rules/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { playerStrings, systemTermHits } from '../../content/test/vocabulary';
import {
  CitiesList,
  CityCard,
  CityMap,
  DistrictResultTable,
  DistrictSwitcher,
  DistrictsList,
  ElectionCard,
  GroundSash,
  IssuesSection,
  JourneyCard,
  JourneyProgress,
  LocationSheet,
  OpinionBars,
  OrderPaper,
  RegisterSheet,
  LodgingsCard,
  ResidenceCard,
  ResultModal,
  ScoreboardLine,
  ScoreboardTable,
  SeatGrid,
  Ticket,
  TrainsCard,
  TramBar,
  formatSwing,
  groundOf,
  ordinal,
} from '../src';

/**
 * Slice 4's components (docs/tech/slice-4.md §12.2, §15 UI): a fixture for every new component and
 * state, the changed ticket and result modal, the ground sash (slice-4 screens, 3 Oct 2026) and the
 * user's district lock on the map.
 */

const NAMES = { vanguard: 'Vanguard', collective: 'Collective', alliance: 'Alliance' } as const;
const noop = () => undefined;
const energy = { value: 100, nextTickAt: null };
const city = (id: string): NationCityView => nationViewFixture.cities.find((c) => c.cityId === id)!;
/** "Good odds", "Fair odds", "Long shot": a digit next to them would be a chance. */
const noOddsNumbers = (text: string) => expect(text).not.toMatch(/\d+ ?%\s*(chance|odds)|chance|rolled/i);

describe('the three-bar gauge (screens §1)', () => {
  it('prints each share to one decimal on its own bar, and names them for a screen reader', () => {
    render(<OpinionBars values={{ vanguard: 21, collective: 21.25, alliance: 20.96, neutral: 36.79 }} names={NAMES} />);
    const bars = screen.getByTestId('opinion-bars');
    expect(within(bars).getByTestId('share-vanguard')).toHaveTextContent('21.0');
    expect(within(bars).getByTestId('share-collective')).toHaveTextContent('21.3');
    expect(within(bars).getByTestId('share-alliance')).toHaveTextContent('21.0');
    expect(bars).toHaveAccessibleName('Vanguard 21.0 %, Collective 21.3 %, Alliance 21.0 %');
  });

  it('in points mode is one bar in three, no Neutral track', () => {
    render(<OpinionBars mode="points" values={{ vanguard: 85, collective: 120, alliance: 40 }} names={NAMES} />);
    const bar = screen.getByTestId('points-bar');
    expect(bar.children).toHaveLength(3);
    expect(bar).toHaveAccessibleName('Vanguard 85, Collective 120, Alliance 40');
  });
});

describe('the ground sash (whose ground this is)', () => {
  it('a home city: the largest share; a tie or a close race: Contested; an HQ: its own party', () => {
    expect(groundOf({ shares: { vanguard: 9, collective: 70.05, alliance: 6, neutral: 14.95 }, names: NAMES })).toEqual({
      factionId: 'collective',
      word: 'Collective',
      note: 'Collective ground: the Collective holds 70.1 % here.',
    });
    const tie = { vanguard: 20, collective: 20, alliance: 20, neutral: 40 };
    expect(groundOf({ shares: tie, names: NAMES }).factionId).toBeNull();
    expect(groundOf({ shares: { ...tie, alliance: 25 }, names: NAMES, closeRace: true }).word).toBe('Contested');
    expect(groundOf({ shares: tie, names: NAMES, hq: 'alliance' })).toMatchObject({
      factionId: 'alliance',
      note: "Alliance ground: the Alliance's own headquarters.",
    });
  });

  it('is a band with the crest and the word; a tap opens the one-line note', () => {
    render(<GroundSash ground={groundOf({ shares: districtFixtures[3]!.opinion, names: NAMES })} />);
    const sash = screen.getByTestId('ground-sash');
    expect(sash).toHaveAccessibleName('Whose ground this is: Collective');
    expect(sash.querySelector('[data-faction="collective"]')).toHaveTextContent('Collective');
    expect(sash.querySelector('svg')).not.toBeNull();
    fireEvent.click(sash);
    expect(screen.getByTestId('help-note')).toHaveTextContent('Collective ground: the Collective holds 52.0 % here.');
  });

  it('Contested is the grey band without a crest', () => {
    render(<GroundSash ground={groundOf({ shares: stationMarketFixture.opinion, names: NAMES, closeRace: true })} />);
    const band = screen.getByTestId('ground-sash').querySelector('[data-faction]')!;
    expect(band).toHaveAttribute('data-faction', 'contested');
    expect(band).toHaveTextContent('Contested');
    expect(band.querySelector('svg')).toBeNull();
  });

  it('sits on the place sheet’s art and on the result’s picture, where the stamp moves left', () => {
    const ground = groundOf({ shares: stationMarketFixture.opinion, names: NAMES, closeRace: true });
    const station = capitalCityViewFixture.locations[0]!;
    render(
      <LocationSheet open onOpenChange={noop} n={15} kindLabel="Station" name="Central Station" blurb="x" art={station.art} ground={ground}>
        <p>tickets</p>
      </LocationSheet>,
    );
    expect(screen.getByRole('dialog').querySelector('[data-art="map-crop"] [data-testid="ground-sash"]')).not.toBeNull();
  });

  it('the result modal carries it and moves the stamp out of its way', () => {
    const ground = groundOf({ shares: stationMarketFixture.opinion, names: NAMES, closeRace: true });
    render(<ResultModal result={capitalActionResultFixture} open onOpenChange={noop} ground={ground} />);
    expect(screen.getByTestId('ground-sash')).toBeInTheDocument();
    expect(screen.getByTestId('result-stamp').className).toMatch(/justify-start/);
  });
});

describe('the ticket in the capital (screens §5.2)', () => {
  const station = capitalCityViewFixture.locations[0]!;
  it('prints the place tags in order, the close race once (no second "better odds")', () => {
    const a: ActionView = {
      ...station.actions[0]!,
      tags: [
        { ordinanceId: 'ord.rally-permits', name: 'Rally Permits', kind: 'energy', value: -2 },
        { ordinanceId: 'ord.street-fund', name: 'Street Fund', kind: 'iron', value: 25 },
      ],
      placeTags: [
        { kind: 'issue', issueId: 'issue.tram-fares', name: 'Tram Fare Hike', pct: 50 },
        { kind: 'closeRace', fxpPct: 25 },
        { kind: 'comeback', factionId: 'collective', pct: 15 },
      ],
      order: { id: 'dir.x', title: 'x', progress: 0, target: 2 },
    };
    render(<Ticket action={a} energy={energy} onPerform={noop} />);
    const tags = screen.getByTestId('ticket-tags').textContent!;
    expect(tags).toBe(
      'Talk to voters · Rally Permits · -2 Energy · Issue: Tram Fare Hike · opinion +50 % · Close race · +25 % Party XP · better odds · Comeback · +15 % · Street Fund · +25 % Iron · Party order 0 / 2 · +25 % Party XP',
    );
    expect(tags.match(/better odds/g)).toHaveLength(1);
  });

  it('members only: the whole ticket dimmed, no buttons, the words in their place', () => {
    const hq = capitalCityViewFixture.locations[2]!;
    const onPerform = vi.fn();
    render(<Ticket action={hq.actions[0]!} energy={energy} onPerform={onPerform} />);
    expect(screen.queryByTestId('ticket-once')).toBeNull();
    expect(screen.queryByTestId('ticket-three')).toBeNull();
    expect(screen.getByTestId('ticket-members-only')).toHaveTextContent('Members only');
    expect(screen.getByTestId(`ticket-${hq.actions[0]!.id}`).querySelector('[data-members-only]')).not.toBeNull();
    expect(screen.queryByTestId('ticket-hint')).toBeNull();
  });
});

describe('the result modal in the capital (tech design §10.1)', () => {
  it('the opinion row names the district and its factors; the Issue and the scoreboard are knock-ons', () => {
    render(<ResultModal result={capitalActionResultFixture} open onOpenChange={noop} factionNames={NAMES} />);
    const row = screen.getByTestId('reward-opinion');
    expect(within(row).getByTestId('reward-label')).toHaveTextContent('Opinion in Station & Market');
    expect(within(row).getByTestId('reward-value')).toHaveTextContent('+0.094 %');
    expect(within(row).getByTestId('reward-note')).toHaveTextContent(
      'Close race +25 % · Issue: Tram Fare Hike +50 % · Collective 20.0 → 20.1 %',
    );
    expect(within(screen.getByTestId('reward-fxp')).getByTestId('reward-note')).toHaveTextContent('+6 and Close race +2');
    expect(screen.getByTestId('effect-issue')).toHaveTextContent('Tram Fare Hike: Collective +10 points (leads 130 to 85)');
    expect(screen.getByTestId('effect-scoreboard')).toHaveTextContent(
      "This election you've moved Station & Market +0.39 for the Collective (1st of 3)",
    );
  });

  it('another party leading the Issue, and nobody', () => {
    const r = {
      ...capitalActionResultFixture,
      effects: {
        ...capitalActionResultFixture.effects,
        issues: [
          { ...capitalActionResultFixture.effects.issues![0]!, totals: { vanguard: 140, collective: 130, alliance: 0 }, leader: 'vanguard' as const },
          { ...capitalActionResultFixture.effects.issues![0]!, issueId: 'issue.b', name: 'B', totals: { vanguard: 10, collective: 10, alliance: 0 }, leader: null },
        ],
      },
    };
    render(<ResultModal result={r} open onOpenChange={noop} factionNames={NAMES} />);
    const lines = screen.getAllByTestId('effect-issue').map((l) => l.textContent);
    expect(lines).toEqual([
      'Tram Fare Hike: Collective +10 points (Vanguard leads 140 to 130)',
      'B: Collective +10 points (level at 10)',
    ]);
  });

  it('a move: the Iron, a seat given up, a candidacy withdrawn, the next vote', () => {
    render(<ResultModal result={registerResultFixture} open onOpenChange={noop} />);
    expect(screen.getByTestId('political-iron')).toHaveTextContent('−500 Iron · 3,910 left');
    expect(screen.getByTestId('political-seat')).toHaveTextContent('Coalport seat given up');
    expect(screen.getByTestId('political-candidacy')).toBeInTheDocument();
    expect(screen.getByTestId('political-next')).toHaveTextContent('Next: vote in Eastside from Thursday.');
  });
});

describe('the arrival (ResultModal kind journey, screens §4)', () => {
  it('Arrived on the station, the headline, the ticket and the Herald; Continue closes it', () => {
    const onContinue = vi.fn();
    render(
      <ResultModal
        result={{ kind: 'journey', journey: journeyArrivedFixture }}
        open
        onOpenChange={noop}
        onContinue={onContinue}
        journeyCard={<JourneyCard card={journeyArrivedFixture.card!} compact onChoose={noop} />}
      />,
    );
    expect(screen.getByTestId('stamp')).toHaveTextContent('Arrived');
    expect(screen.getByTestId('arrival-headline')).toHaveTextContent("You're in the capital");
    expect(screen.getByTestId('arrival-ticket')).toHaveTextContent('−20 Iron · ticket');
    expect(screen.getByTestId('arrival-herald')).toHaveTextContent("The Herald is your paper while you're here");
    expect(screen.getByRole('dialog')).toHaveTextContent('Irongate · Station & Market');
    // The unanswered card inside, answerable until Continue.
    expect(screen.getAllByTestId('journey-choice')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('arrival-continue'));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('Continue is disabled from the tap until the answer', () => {
    render(
      <ResultModal result={{ kind: 'journey', journey: journeyArrivedFixture }} open onOpenChange={noop} onContinue={noop} continuePending />,
    );
    expect(screen.getByTestId('arrival-continue')).toBeDisabled();
  });
});

describe('the journey (screens §3)', () => {
  it('the progress line moves with the time and says when it arrives', () => {
    const j = journeyViewFixture;
    render(<JourneyProgress from="Coalport" to="Irongate" boardedAt={j.boardedAt} arrivesAt={j.arrivesAt} now={j.boardedAt + 3 * 60_000} />);
    const p = screen.getByTestId('journey-progress');
    expect(p).toHaveAttribute('data-progress', '0.250');
    expect(screen.getByTestId('journey-left')).toHaveTextContent('arrives in 9 min · 14:22');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });

  it('the card: the odds word and the stat once, an unchecked row with its reward only, one tap', () => {
    const onChoose = vi.fn();
    render(<JourneyCard card={journeyViewFixture.card!} onChoose={onChoose} />);
    const lines = screen.getAllByTestId('journey-choice-line').map((l) => l.textContent!);
    expect(lines[0]).toBe('Good odds · Charisma · opinion +0.03 in Station & Market · +6 Party XP');
    expect(lines[1]).toBe('+14 XP');
    for (const l of lines) noOddsNumbers(l);
    expect(screen.getByTestId('journey-card')).toHaveTextContent('On the way');
    expect(screen.getByTestId('journey-card')).toHaveTextContent('Optional');
    expect(screen.getByTestId('journey-card')).toHaveTextContent('Ignore it and you sleep through it. Nothing happens.');
    fireEvent.click(screen.getAllByTestId('journey-choice')[0]!);
    expect(onChoose).toHaveBeenCalledWith('talk');
  });

  it('pending: the row collapses to the chosen one at once', () => {
    render(<JourneyCard card={journeyViewFixture.card!} onChoose={noop} pendingChoiceId="talk" />);
    const rows = screen.getAllByTestId('journey-choice');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBeDisabled();
  });

  it('chosen: the outcome, its stamp and the Partial’s reason', () => {
    render(<JourneyCard card={journeyChosenFixture.card!} onChoose={noop} />);
    expect(screen.getAllByTestId('journey-choice')).toHaveLength(1);
    const out = screen.getByTestId('journey-outcome');
    expect(out).toHaveTextContent('He hears you out, mostly');
    expect(within(out).getByTestId('stamp')).toHaveTextContent('Partial');
    expect(screen.getByTestId('journey-reason')).toHaveTextContent('Raise it at Central Station');
    expect(screen.getByTestId('journey-rewards')).toHaveTextContent('+3 Party XP · Opinion in Station & Market +0.015 %');
  });

  it('a stake the player cannot pay: the row says what it needs and cannot be tapped', () => {
    const card = {
      ...journeyViewFixture.card!,
      choices: [{ ...journeyViewFixture.card!.choices[1]!, id: 'sit', cost: 20, affordable: false }],
    };
    render(<JourneyCard card={card} onChoose={noop} />);
    expect(screen.getByTestId('journey-choice')).toBeDisabled();
    expect(screen.getByTestId('journey-choice-line')).toHaveTextContent('Needs 20 Iron');
  });
});

describe('the nation (screens §2)', () => {
  it('an open city: who holds it, its Issues, the election and Board · 20 Iron · 12 min', () => {
    const onBoard = vi.fn();
    render(<CityCard city={city('irongate')} names={NAMES} onBoard={onBoard} />);
    expect(screen.getByTestId('opinion-bars')).toBeInTheDocument();
    expect(screen.getByTestId('city-issues')).toHaveTextContent('Tram Fare Hike');
    expect(screen.getByTestId('city-election')).toHaveTextContent('Votes in 3 days');
    fireEvent.click(screen.getByTestId('city-board'));
    expect(onBoard).toHaveBeenCalled();
    expect(screen.getByTestId('city-board')).toHaveTextContent('Board · 20 Iron · 12 min');
  });

  it('no service: the lock line and no button; below Level 10: From Level 10', () => {
    // Slice 5 (screens §8.1): rival ground opens at Level 10, so `rival` is an open card now (the
    // slice-5 tests cover it); a city with no service keeps its lock line and no button.
    const { unmount } = render(
      <CityCard city={{ ...city('ashford'), state: 'later', lockWord: 'no service yet' }} names={NAMES} onBoard={noop} />,
    );
    expect(screen.getByTestId('city-lock')).toHaveTextContent('No service yet');
    expect(screen.queryByTestId('city-board')).toBeNull();
    unmount();
    render(<CityCard city={{ ...city('irongate'), state: 'level' }} names={NAMES} onBoard={noop} />);
    expect(screen.getByTestId('city-board')).toHaveTextContent('From Level 10');
    expect(screen.getByTestId('city-board')).toBeDisabled();
  });

  it('short of Iron: Needs 20 Iron, disabled; in the capital: See the five districts', () => {
    const { unmount } = render(
      <CityCard city={{ ...city('irongate'), canBoard: { ok: false, reason: 'NOT_ENOUGH_IRON' } }} names={NAMES} onBoard={noop} />,
    );
    expect(screen.getByTestId('city-board')).toHaveTextContent('Needs 20 Iron');
    expect(screen.getByTestId('city-board')).toBeDisabled();
    unmount();
    const onSee = vi.fn();
    render(
      <CityCard city={{ ...city('irongate'), state: 'here', fare: null, minutes: null, seeDistricts: true }} names={NAMES} onBoard={noop} onSeeDistricts={onSee} />,
    );
    fireEvent.click(screen.getByTestId('city-districts'));
    expect(onSee).toHaveBeenCalled();
  });

  it('the Cities list: five rows in the server’s order, each with its time, lock word or you are here', () => {
    const onPick = vi.fn();
    const onOpenChange = vi.fn();
    render(<CitiesList open onOpenChange={onOpenChange} cities={nationViewFixture.cities} onPick={onPick} />);
    const dialog = screen.getByRole('dialog', { name: 'Cities of the republic' });
    const rows = within(dialog).getAllByTestId('city-row');
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Irongate, 12 min · 20 Iron',
      'Coalport, you are here',
      'Ashford, rival ground',
      'Duskwall, rival ground',
      'Clearwater, no service yet',
    ]);
    fireEvent.click(rows[0]!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onPick).toHaveBeenCalledWith('irongate');
  });

  it('the Trains card: Board the train to Coalport · 20 Iron · 12 min, and the nation map', () => {
    const onBoard = vi.fn();
    const onNation = vi.fn();
    render(<TrainsCard trains={capitalCityViewFixture.locations[0]!.trains!} onBoard={onBoard} onNation={onNation} />);
    fireEvent.click(screen.getByTestId('trains-board'));
    expect(onBoard).toHaveBeenCalledWith('coalport');
    expect(screen.getByTestId('trains-board')).toHaveTextContent('Board the train to Coalport · 20 Iron · 12 min');
    fireEvent.click(screen.getByTestId('trains-nation'));
    expect(onNation).toHaveBeenCalled();
  });
});

describe('the capital (screens §5)', () => {
  it('the tram bar: the four other districts, one tap each', () => {
    const onGo = vi.fn();
    render(<TramBar districts={districtFixtures.map((d) => ({ id: d.id, name: d.name }))} current="irongate.eastside" onGo={onGo} />);
    const chips = screen.getAllByTestId('tram-chip');
    expect(chips.map((c) => c.textContent)).toEqual(['Gov. Quarter', 'Old Town', 'Station & Market', 'Garrison Hill']);
    expect(chips.every((c) => c.className.includes('min-h-11'))).toBe(true);
    fireEvent.click(chips[1]!);
    expect(onGo).toHaveBeenCalledWith('irongate.old-town');
  });

  it('the Districts list: each with its state word and bars', () => {
    const onPick = vi.fn();
    render(<DistrictsList open onOpenChange={noop} districts={districtFixtures} names={NAMES} onPick={onPick} />);
    const rows = screen.getAllByTestId('district-row');
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      '1. Government Quarter, Close race',
      '2. Old Town, Leans Alliance',
      '3. Station & Market, Close race',
      '4. Eastside, Held by the Collective 52.0',
      '5. Garrison Hill, Leans Vanguard',
    ]);
    fireEvent.click(rows[3]!);
    expect(onPick).toHaveBeenCalledWith('irongate.eastside');
  });

  it('the scoreboard line, alone and among others; the table by bracket with you and the hero', () => {
    expect(formatSwing(1.3)).toBe('+1.3');
    expect(formatSwing(0.05)).toBe('+0.05');
    expect(formatSwing(0.394)).toBe('+0.39');
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(23)).toBe('23rd');
    const { unmount } = render(
      <ScoreboardLine line={{ placeName: 'Eastside', swing: 1.3, rank: 2, of: 7 }} factionName="Collective" />,
    );
    expect(screen.getByTestId('scoreboard-line')).toHaveTextContent(
      "This election you've moved Eastside +1.3 for the Collective (2nd of 7)",
    );
    unmount();
    render(<ScoreboardLine line={{ placeName: 'Eastside', swing: 0.3, rank: 1, of: 1 }} factionName="Collective" />);
    expect(screen.getByTestId('scoreboard-line')).toHaveTextContent('(no one else yet)');
  });

  it('the scoreboard table: brackets, the player’s row, the hero’s rosette and the note', () => {
    const table = stationMarketFixture.scoreboard.table.map((b) => ({
      ...b,
      rows: b.rows.map((r, i) => ({ ...r, hero: i === 0 })),
    }));
    render(<ScoreboardTable table={table} districtName="Station & Market" names={NAMES} />);
    expect(screen.getByTestId('scoreboard-table')).toHaveTextContent('Who moved Station & Market · this election');
    expect(screen.getByTestId('scoreboard-table')).toHaveTextContent('Levels 1–15');
    const rows = screen.getAllByTestId('scoreboard-row');
    expect(rows[0]).toHaveTextContent('Mara Lenk');
    expect(rows[0]).toHaveTextContent('you');
    expect(rows[0]!.querySelector('[data-testid="rosette"]')).not.toBeNull();
    expect(rows[1]!.querySelector('[data-testid="rosette"]')).toBeNull();
    expect(screen.getByTestId('scoreboard-table')).toHaveTextContent('District Hero: the top of each bracket');
  });
});

describe('where you live (screens §6)', () => {
  const cases: Array<[keyof typeof residenceCardFixtures, string, string, string | null]> = [
    // Review 4 #9 (answers §9.2): one button, *Live here · 500 Iron*, and the plain reason why.
    ['visitingMay', 'You live in Coalport.', 'Live in Eastside instead: vote and stand here, and your orders come from here. A week between moves.', 'Live here · 500 Iron'],
    ['belowRank', 'You live in Coalport.', 'Activists can live in the capital. 400 Party XP makes an Activist.', null],
    ['cooldown', 'You live in Eastside.', 'You can move again from Thursday.', null],
    ['noIron', 'You live in Coalport.', 'Live in Eastside instead: vote and stand here, and your orders come from here.', 'Needs 500 Iron'],
    ['resident', 'You live in Eastside.', 'Since Monday · you vote from Thursday · move again from Monday.', null],
    ['homeElsewhere', 'You live in Eastside.', 'Live in Eastside again: vote and stand at home.', 'Live here · 500 Iron'],
  ];
  it.each(cases)('%s', (state, line1, line2, button) => {
    render(
      <ResidenceCard
        card={residenceCardFixtures[state]}
        placeName="Eastside"
        rank2Title="Activist"
        onRegister={noop}
       
      />,
    );
    expect(screen.getByTestId('residence-line1')).toHaveTextContent(line1);
    expect(screen.getByTestId('residence-line2')).toHaveTextContent(line2);
    if (button) expect(screen.getByTestId('residence-register')).toHaveTextContent(button);
    else expect(screen.queryByTestId('residence-register')).toBeNull();
    if (state === 'noIron') expect(screen.getByTestId('residence-register')).toBeDisabled();
  });

  // Review 4 #9 (answers §9.3): the room left the card; the Lodgings card at Tram Junction says it as a bed.
  it('the card has no room row; Lodgings: Take a bed · 100 Iron, or Your bed until … with Seven more nights; the Evictions price', () => {
    const { unmount: u0 } = render(
      <ResidenceCard card={residenceCardFixtures.resident} placeName="Eastside" rank2Title="Activist" onRegister={noop} />,
    );
    expect(screen.queryByTestId('room-row')).toBeNull();
    expect(screen.getByTestId('residence-card')).not.toHaveTextContent(/room|bed/i);
    u0();
    const onTake = vi.fn();
    const { unmount } = render(<LodgingsCard lodgings={lodgingsFixtures.take} onTake={onTake} />);
    expect(screen.getByTestId('lodgings')).toHaveTextContent('Lodgings');
    expect(screen.getByTestId('lodgings-line')).toHaveTextContent('A bed on the tram line · 7 nights · 100 Iron');
    expect(screen.getByTestId('lodgings-benefit')).toHaveTextContent(
      'Rested banks higher while you have it: up to 250 instead of 200.',
    );
    fireEvent.click(screen.getByTestId('lodgings-take'));
    expect(onTake).toHaveBeenCalled();
    expect(screen.getByTestId('lodgings-take')).toHaveTextContent('Take a bed · 100 Iron');
    unmount();
    const { unmount: u2 } = render(<LodgingsCard lodgings={lodgingsFixtures.renew} onTake={noop} />);
    expect(screen.getByTestId('lodgings-running')).toHaveTextContent('Your bed until Sunday · Rested banks to 250');
    expect(screen.getByTestId('lodgings-take')).toHaveTextContent('Seven more nights · 100 Iron');
    u2();
    render(<LodgingsCard lodgings={lodgingsFixtures.evictions} onTake={noop} />);
    expect(screen.getByTestId('lodgings-priced')).toHaveTextContent('50 Iron · Eviction Notices');
    expect(screen.getByTestId('lodgings-take')).toHaveTextContent('Take a bed · 50 Iron');
  });

  it('the sheet: the five lines before the tap, a lost seat in the failure colour, one button', () => {
    const onRegister = vi.fn();
    render(
      <RegisterSheet open onOpenChange={noop} placeName="Eastside" cost={500} lines={residenceCardFixtures.visitingMay.sheet!.lines} onRegister={onRegister} />,
    );
    expect(screen.getByRole('dialog', { name: 'Live in Eastside · 500 Iron' })).toBeInTheDocument();
    const items = within(screen.getByTestId('register-lines')).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[1]!.className).toMatch(/text-failure/);
    fireEvent.click(screen.getByTestId('register-confirm'));
    expect(onRegister).toHaveBeenCalled();
    expect(screen.getByTestId('register-confirm')).toHaveTextContent('Live here · 500 Iron');
  });
});

describe('the Issues in the paper (screens §7.1)', () => {
  it('at most four rows, New this week, the leader or open; a row opens to its blurb, stances, effect and Where to act', () => {
    const onWhereToAct = vi.fn();
    const rows = issueRowFixtures.map((r) => ({
      ...r,
      blurb: 'The tram company wants a penny more.',
      stances: { vanguard: 'Order on the trams.', collective: 'Not a penny more.', alliance: 'Let the council decide.' },
    }));
    render(
      <IssuesSection
        issues={{ newThisWeek: true, rows: [...rows, ...rows], more: capitalPaperFixture.issues!.more }}
        names={NAMES}
        settles="Sunday midnight"
        onWhereToAct={onWhereToAct}
      />,
    );
    expect(screen.getAllByTestId('issue-row')).toHaveLength(4);
    expect(screen.getByTestId('issues-new')).toHaveTextContent('New this week');
    const [open, leads] = screen.getAllByTestId('issue-leader');
    expect(open).toHaveTextContent('open');
    expect(leads).toHaveTextContent('leads');
    expect(screen.getAllByTestId('issue-totals')[1]).toHaveTextContent(
      'Collective 120 · Vanguard 85 · Alliance 40 · settles Sunday midnight',
    );
    fireEvent.click(within(screen.getAllByTestId('issue-row')[1]!).getAllByRole('button')[0]!);
    const detail = screen.getByTestId('issue-detail');
    expect(detail).toHaveTextContent('The tram company wants a penny more.');
    expect(detail).toHaveTextContent('Collective: Not a penny more.');
    expect(detail).toHaveTextContent('If settled: Tickets from Irongate: half price');
    fireEvent.click(screen.getByTestId('where-to-act'));
    expect(onWhereToAct).toHaveBeenCalledWith(expect.objectContaining({ issueId: 'issue.tram-fares' }));
    // The other cities fold into one row.
    expect(screen.getByTestId('issues-more')).toHaveTextContent('Ashford');
    fireEvent.click(screen.getByTestId('issues-more'));
    expect(screen.getAllByTestId('issue-row')).toHaveLength(5);
  });
});

describe('the Election card in the capital (screens §7.2)', () => {
  it('voting open in Eastside: two seats, any name; the kicker names the district', () => {
    render(<ElectionCard summary={capitalSummaryFixture} onOpen={noop} now={Date.UTC(2026, 9, 6, 14)} />);
    expect(screen.getByTestId('election-card')).toHaveAccessibleName('Election · Irongate Council · Eastside');
    expect(screen.getByTestId('election-line1')).toHaveTextContent('Voting is open in Eastside');
    expect(screen.getByTestId('election-line2')).toHaveTextContent(/^Two seats · any name · your vote is secret · until /);
  });

  it('the result: the district’s two seats by party, and the capital’s ten', () => {
    render(<ElectionCard summary={capitalResultSummaryFixture} onOpen={noop} factionNames={NAMES} />);
    expect(screen.getByTestId('election-line1')).toHaveTextContent(
      'Eastside went Collective, Vanguard · your vote: Jana Varga was elected',
    );
    expect(screen.getByTestId('election-line2')).toHaveTextContent(
      'Irongate: 4 Vanguard · 3 Collective · 3 Alliance · turnout 3 of 5 in Eastside',
    );
    expect(screen.getByTestId('election-primary')).toHaveTextContent('See the result');
  });
});

describe('the result in the capital (screens §8)', () => {
  const eastside = capitalCountFixture.districts[0]!;
  it('the parties’ table, the votes line in words, the candidates by party, who moved it', () => {
    render(<DistrictResultTable district={eastside} names={NAMES} />);
    const parties = screen.getAllByTestId('party-row').map((r) => r.textContent);
    // Votes 1, the share of opinion among the parties in points (63.4), the score.
    expect(parties[0]).toMatch(/^Collective163\.448\.5/);
    expect(screen.getAllByTestId('seat-bar')).toHaveLength(2);
    expect(screen.getByTestId('votes-cast')).toHaveTextContent(
      '3 votes cast · votes count 15 % of the score, opinion 85 % (votes count in full from 10 cast)',
    );
    const rows = screen.getAllByTestId('capital-count-row');
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent('Jana Varga');
    expect(rows[0]).toHaveTextContent('your vote');
    expect(rows[0]).toHaveTextContent('Local candidate');
    expect(rows.filter((r) => r.getAttribute('data-seated') === 'true')).toHaveLength(2);
    expect(screen.getByTestId('how-seats')).toHaveTextContent("returning officer's draw");
    expect(screen.getByTestId('scoreboard-table')).toBeInTheDocument();
  });

  it('the district switcher: the server’s order, the selected chip pressed', () => {
    const onSelect = vi.fn();
    render(
      <DistrictSwitcher
        districts={capitalCountFixture.districts.map((d) => ({ districtId: d.districtId, name: d.name }))}
        selected="irongate.eastside"
        onSelect={onSelect}
      />,
    );
    const chips = screen.getAllByRole('tab');
    expect(chips.map((c) => c.textContent)).toEqual(['Eastside', 'Gov. Quarter']);
    expect(chips[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(chips[1]!);
    expect(onSelect).toHaveBeenCalledWith('irongate.government-quarter');
  });

  it('the council: ten seats in five pairs, captioned by district', () => {
    render(
      <SeatGrid
        seats={capitalCouncilFixture.seats}
        factionId="collective"
        groups={districtFixtures.map((d) => ({ id: d.id, name: d.name }))}
      />,
    );
    const groups = screen.getAllByTestId('seat-group');
    expect(groups).toHaveLength(5);
    expect(groups.map((g) => within(g).getAllByTestId('seat')).every((s) => s.length === 2)).toBe(true);
    expect(groups[3]).toHaveTextContent('Eastside');
  });

  it("the order paper names each party's own proposal", () => {
    render(<OrderPaper council={capitalCouncilFixture} secretary="Petra Holm" selected={null} factionNames={NAMES} />);
    const paper = screen.getByTestId('order-paper');
    expect(paper).toHaveTextContent("the Collective's proposal · Petra Holm");
    expect(paper).toHaveTextContent("the Vanguard's proposal · Viktor Hahn");
  });
});

describe("the user's district lock on the map (3 Oct 2026)", () => {
  const map = capitalCityViewFixture.map;
  it('the overview: the outlines with their names, no place pins', () => {
    const onOutline = vi.fn();
    render(
      <CityMap
        map={map}
        isNight={false}
        locations={districtFixtures.map((d) => ({ id: d.id, n: d.n, name: d.name, map: d.anchor, pin: { style: 'name' as const } }))}
        selectedId={null}
        onSelect={noop}
        outlines={districtFixtures.map((d) => ({ id: d.id, points: d.outline, label: d.name }))}
        onOutline={onOutline}
      />,
    );
    expect(screen.getAllByTestId('district-outline')).toHaveLength(5);
    const pins = screen.getAllByTestId('hotspot');
    expect(pins.every((p) => p.getAttribute('data-pin') === 'name')).toBe(true);
    expect(pins.map((p) => p.textContent)).toEqual(districtFixtures.map((d) => d.name));
    fireEvent.click(screen.getAllByTestId('district-outline')[3]!);
    expect(onOutline).toHaveBeenCalledWith('irongate.eastside');
  });

  it('a district: its edge, the picture dimmed outside it, the zoom held at its own view', () => {
    const d: DistrictView = stationMarketFixture;
    render(
      <CityMap
        map={map}
        isNight={false}
        frame={d.frame}
        locations={capitalCityViewFixture.locations.slice(0, 2)}
        selectedId={null}
        onSelect={noop}
        focusOutline={d.outline}
        lockToFrame
      />,
    );
    const mask = screen.getByTestId('district-mask');
    expect(mask.getAttribute('d')).toMatch(/^M0 0H1V1H0Z M0\.29 0\.5L/);
    expect(mask).toHaveAttribute('fill-rule', 'evenodd');
    expect(screen.getByTestId('district-edge')).toBeInTheDocument();
    const [min, , fitted] = screen.getByTestId('city-map').getAttribute('data-zoom-limits')!.split(',');
    expect(min).toBe(fitted);
  });

  it('the nation: label pins with you are here and the lock word, the at-rest view on two of them', () => {
    render(
      <CityMap
        map={nationViewFixture.map}
        isNight={false}
        frame={nationViewFixture.frame}
        locations={nationViewFixture.cities.map((c) => ({
          id: c.cityId,
          n: c.n,
          name: c.name,
          map: { x: c.x, y: c.y },
          pin: {
            style: 'label' as const,
            sub: c.state === 'here' ? 'you are here' : (c.lockWord ?? undefined),
            marks: c.lockWord ? (['muted'] as const) : c.state === 'here' ? (['here'] as const) : [],
          },
        }))}
        selectedId={null}
        onSelect={noop}
        restFocus={['coalport', 'irongate']}
      />,
    );
    const pins = screen.getAllByTestId('hotspot');
    expect(pins.map((p) => p.getAttribute('aria-label'))).toEqual([
      'Irongate',
      'Coalport, you are here',
      'Ashford, rival ground',
      'Duskwall, rival ground',
      'Clearwater, no service yet',
    ]);
    expect(pins[2]!.className).toMatch(/opacity-60/);
    expect(pins[1]).toHaveAttribute('data-marks', 'here');
  });
});

describe('slice 4: no system term in what packages/ui prints', () => {
  const fixtureStrings = [
    ...new Set(
      [nationViewFixture, journeyViewFixture, journeyChosenFixture, capitalCityViewFixture, capitalCountFixture, issueRowFixtures]
        .flatMap((f) => playerStrings(f).map((s) => s.text))
        .filter((t) => t.trim().length > 2),
    ),
  ].sort((a, b) => b.length - a.length);
  const words = (ui: React.ReactElement) => {
    const { container, unmount } = render(ui);
    let text = [document.body.textContent ?? '', ...[...container.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') ?? '')].join('\n');
    for (const s of fixtureStrings) text = text.split(s).join('…');
    unmount();
    return text;
  };
  it.each([
    ['CityCard', <CityCard city={city('irongate')} names={NAMES} onBoard={noop} />],
    ['JourneyCard', <JourneyCard card={journeyChosenFixture.card!} onChoose={noop} />],
    ['Arrival', <ResultModal result={{ kind: 'journey', journey: journeyArrivedFixture }} open onOpenChange={noop} onContinue={noop} />],
    ['Capital result', <ResultModal result={capitalActionResultFixture} open onOpenChange={noop} factionNames={NAMES} />],
    ['ResidenceCard', <ResidenceCard card={residenceCardFixtures.visitingMay} placeName="Eastside" rank2Title="Activist" onRegister={noop} />],
    ['DistrictResultTable', <DistrictResultTable district={capitalCountFixture.districts[0]!} names={NAMES} />],
    ['IssuesSection', <IssuesSection issues={capitalPaperFixture.issues!} names={NAMES} settles="Sunday midnight" />],
    ['ElectionCard capital', <ElectionCard summary={capitalResultSummaryFixture} onOpen={noop} factionNames={NAMES} />],
  ])('%s', (_name, ui) => {
    const text = words(ui as React.ReactElement);
    expect(systemTermHits([{ name: 'ui', value: text }])).toEqual([]);
    noOddsNumbers(text);
  });
});
