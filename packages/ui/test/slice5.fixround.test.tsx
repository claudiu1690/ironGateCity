import type { ActionResult, MissionView, StreetView } from '@irongate/rules';
import {
  illegalMissionFixture,
  missionFixture,
  missionResultFixture,
  takenInResultFixture,
} from '@irongate/rules/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { MissionBriefing, MissionTicket, ResultModal, quarterLockLine, runInReason } from '../src';

/**
 * Slice 5 fix round (docs/qa/slice-5-report.md, docs/design/slice-5-fixes.md): the record cards by
 * level (m5), the run-in's reason by the failed row's band (n12) and its training place (m4), the
 * receipt's opinion row in points and the risk parts (n4), the ticket's lines (m3), the cap row (n12),
 * the risk line's whole segments (§7.2), the later-edition lock line (§9), and focus back on the
 * opener when the briefing closes (m8).
 */

const NAMES = { vanguard: 'Vanguard', collective: 'Collective', alliance: 'Alliance' } as const;
const noop = () => undefined;
const energy = { value: 100, nextTickAt: null };

function resultWith(street: Partial<StreetView>, extra: Partial<ActionResult> = {}): ActionResult {
  return { ...takenInResultFixture, ...extra, street: { ...takenInResultFixture.street!, ...street } };
}

describe('m5: the record card of the level reached', () => {
  const record = (r: Partial<NonNullable<StreetView['record']>>) =>
    resultWith({
      record: {
        added: 1,
        escalated: false,
        before: 'clean',
        after: 'onFile',
        marks: 1,
        first: true,
        allMinor: true,
        ...r,
      },
    });

  it('a first offence of three serious marks reads Repeat offender, without a fade', () => {
    render(
      <ResultModal
        result={record({ added: 3, after: 'repeat', marks: 3, allMinor: false })}
        open
        onOpenChange={noop}
        factionNames={NAMES}
      />,
    );
    const card = screen.getByTestId('effect-record-card');
    expect(card).toHaveTextContent(/^REPEAT OFFENDER · Three marks\. /);
    expect(card).toHaveTextContent("These don't fade");
    expect(card).not.toHaveTextContent('One mark');
  });

  it('On file with two moderate marks says they do not fade', () => {
    render(
      <ResultModal
        result={record({ added: 2, marks: 2, allMinor: false })}
        open
        onOpenChange={noop}
        factionNames={NAMES}
      />,
    );
    expect(screen.getByTestId('effect-record-card')).toHaveTextContent(
      "ON FILE · Two marks, and they don't fade.",
    );
  });

  it('no card when the level was crossed before', () => {
    render(<ResultModal result={record({ first: false })} open onOpenChange={noop} factionNames={NAMES} />);
    expect(screen.queryByTestId('effect-record-card')).toBeNull();
  });
});

describe('n12 and m4: the run-in reason line', () => {
  const runIn = takenInResultFixture.street!.runIn!;
  const failed = (band: 'good' | 'fair' | 'long', cause: NonNullable<StreetView['runIn']>['cause']) => ({
    ...runIn,
    cause,
    steps: [
      { row: 'run' as const, ok: false, band },
      { row: 'fight' as const, ok: false },
    ],
  });

  it('Good odds: bad luck, never *Try again*', () => {
    expect(runInReason(failed('good', 'agi'))).toBe("Bad luck. The odds were good; it just didn't come off.");
  });
  it('Fair odds: only fair', () => {
    expect(runInReason(failed('fair', 'agi'))).toBe('The odds were only fair.');
  });
  it('a Long shot names the stat and where it trains', () => {
    expect(runInReason(failed('long', 'agi'), { agi: 'Harbour Quays' })).toBe(
      'Your Agility is low for this. Raise it at Harbour Quays.',
    );
  });
  it('a result stored before the fix (no band) keeps the cause', () => {
    expect(runInReason(runIn)).toBe(
      'You were outmatched. Strength is what counts in a fight; a coat with some weight to it helps.',
    );
  });
});

describe('n4: the receipt', () => {
  it('the opinion against reads points, never a %; rival ground is a lower-case part joined by ·', () => {
    const r: ActionResult = {
      ...missionResultFixture,
      rewards: {
        ...missionResultFixture.rewards,
        fxp: {
          base: 6,
          bonus: 3,
          total: 9,
          parts: [{ id: 'rivalGround', label: 'Rival ground', amount: 3 }],
        },
      },
    };
    render(
      <ResultModal result={r} open onOpenChange={noop} onAgain={noop} energy={energy} factionNames={NAMES} />,
    );
    const opinion = screen.getByTestId('reward-opinion');
    expect(opinion).toHaveTextContent('Coalport−0.2Vanguard');
    expect(opinion).not.toHaveTextContent('−0.2 %');
    expect(screen.getByTestId('reward-fxp')).toHaveTextContent('+6 · rival ground +3');
  });
});

describe('m3 and §7.2: the mission ticket', () => {
  it('the tags line is the type and the odds; the rest are chips; the cap is its own row', () => {
    const m: MissionView = {
      ...illegalMissionFixture,
      placeTags: [...(illegalMissionFixture.placeTags ?? []), { kind: 'pressureCapped' }],
    };
    render(<MissionTicket mission={m} energy={energy} names={NAMES} onChoose={noop} onAgain={noop} />);
    expect(screen.getByTestId('mission-tags').textContent).toBe(
      'Mission · Against the Vanguard · Fair odds · Agility',
    );
    expect(screen.getByTestId('mission-chips')).toHaveTextContent('On file · −10 % Iron');
    expect(screen.getByTestId('mission-chips')).not.toHaveTextContent('had enough');
    expect(screen.getByTestId('mission-capped')).toHaveTextContent(
      'The town has had enough today · no opinion',
    );
  });

  it('no chips line when there are no chips', () => {
    render(
      <MissionTicket
        mission={{ ...missionFixture, placeTags: [], tags: [] }}
        energy={energy}
        names={NAMES}
        onChoose={noop}
        onAgain={noop}
      />,
    );
    expect(screen.queryByTestId('mission-chips')).toBeNull();
  });

  it('the risk line keeps each segment whole', () => {
    render(
      <MissionTicket
        mission={illegalMissionFixture}
        energy={energy}
        names={NAMES}
        onChoose={noop}
        onAgain={noop}
      />,
    );
    const parts = [...screen.getByTestId('risk-line').querySelectorAll('.whitespace-nowrap')].map(
      (e) => e.textContent,
    );
    expect(parts).toEqual(['Heat +6', 'Risky', 'if caught, a mark on your record']);
  });
});

describe('§9: a later edition reads its teaser', () => {
  it('*Opens with a later edition · …*', () => {
    expect(quarterLockLine({ lock: { kind: 'edition' }, teaser: 'The station.' }, { teaser: true })).toBe(
      'Opens with a later edition · The station.',
    );
    // The map's pin and the Quarters list keep the lock alone.
    expect(quarterLockLine({ lock: { kind: 'edition' }, teaser: 'The station.' })).toBe('Opens with a later edition');
    expect(quarterLockLine({ lock: { kind: 'level', level: 6 }, teaser: 'x' })).toBe('Opens at Level 6');
  });
});

describe('m8: Escape on the briefing gives focus back to the ticket', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" data-testid="opener" onClick={() => setOpen(true)}>
          Choose a way
        </button>
        <MissionBriefing
          open={open}
          onOpenChange={setOpen}
          mission={missionFixture}
          placeName="The Shipyard"
          energy={energy}
          onConfirm={noop}
        />
      </>
    );
  }

  it('focus returns to the button that opened it', async () => {
    render(<Harness />);
    const opener = screen.getByTestId('opener');
    opener.focus();
    fireEvent.click(opener);
    expect(await screen.findByTestId('briefing')).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId('briefing')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
