import { townHallFixture } from '@irongate/rules/testing';
import type { TownHallView } from '@irongate/rules';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TownHallBlocks } from '../src';

/**
 * Review 4, QA fix round (docs/qa/review-4-report.md m4): the council-rule note gives each council's own
 * majority: four of seven at home, six of ten in the capital (GDD §15.3).
 */

const names = { vanguard: 'Vanguard', collective: 'Collective', alliance: 'Alliance' } as const;

async function ruleNote(hall: TownHallView): Promise<string> {
  render(<TownHallBlocks hall={hall} names={names} factionId="collective" />);
  await userEvent.click(screen.getByRole('button', { name: /what a council rule is/ }));
  return screen.getByTestId('help-note').textContent ?? '';
}

describe('the council-rule note per city (QA m4)', () => {
  it('a home council: four councillors of seven', async () => {
    const note = await ruleNote(townHallFixture);
    expect(note).toContain('Passed by four councillors of seven.');
  });

  it('the capital: six councillors of ten, never four of seven', async () => {
    const capital: TownHallView = { ...townHallFixture, cityId: 'irongate', cityName: 'Irongate', seatCount: 10, passVotes: 6 };
    const note = await ruleNote(capital);
    expect(note).toContain('Passed by six councillors of ten.');
    expect(note).not.toContain('of seven');
  });
});
