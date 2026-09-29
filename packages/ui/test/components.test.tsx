import { characterViewFixture } from '@irongate/rules/testing';
import type { CheckBreakdown } from '@irongate/rules';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field, HudBar, Ticket, formatCountdown, formatOpinionDelta, formatSigned } from '../src';

const preview: CheckBreakdown = {
  stat: 'int',
  statValue: 12,
  difficulty: 8,
  base: 50,
  statTerm: 16,
  bonuses: [],
  bonusTotal: 0,
  raw: 66,
  chance: 66,
};

describe('Ticket', () => {
  it('shows the odds and the Energy stub, and performs on tap', async () => {
    const user = userEvent.setup();
    const onPerform = vi.fn();
    render(
      <Ticket
        name="Canvass the shift change"
        typeLabel="Canvass"
        energy={10}
        preview={preview}
        onPerform={onPerform}
      />,
    );
    expect(screen.getByTestId('ticket-chance')).toHaveTextContent('66 %');
    expect(screen.getByText('10')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }));
    expect(onPerform).toHaveBeenCalledTimes(1);
  });

  it('tapping the percentage shows the breakdown', async () => {
    const user = userEvent.setup();
    render(
      <Ticket name="Canvass" typeLabel="Canvass" energy={10} preview={preview} onPerform={() => undefined} />,
    );
    const toggle = screen.getByRole('button', { name: /66 %/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('INT 12 vs difficulty 8 (×4)')).not.toBeVisible();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('INT 12 vs difficulty 8 (×4)')).toBeVisible();
    expect(screen.getByText('+16 %')).toBeVisible();
  });

  it('is disabled while pending and shows a notice', () => {
    render(
      <Ticket
        name="Canvass"
        typeLabel="Canvass"
        energy={10}
        preview={preview}
        onPerform={() => undefined}
        pending
        notice="Not enough Energy"
      />,
    );
    expect(screen.getByRole('button', { name: /once/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Not enough Energy');
  });
});

describe('HudBar', () => {
  it('shows name, crest, Energy with its countdown, and Iron', () => {
    render(<HudBar character={characterViewFixture} nextTickIn={425_000} />);
    expect(screen.getByText('Mara Lenk')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Collective' })).toBeInTheDocument();
    expect(screen.getByTestId('hud-energy')).toHaveTextContent('90 / 100');
    expect(screen.getByTestId('hud-next-tick')).toHaveTextContent('+5 in 7:05');
    expect(screen.getByRole('meter', { name: 'Energy' })).toHaveAttribute('aria-valuenow', '90');
    expect(screen.getByTestId('hud-iron')).toHaveTextContent('20');
  });
});

describe('Field', () => {
  it('labels its input and reports errors', () => {
    render(<Field label="Email" type="email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
  });
});

describe('format helpers', () => {
  it('formats countdowns, signed numbers and opinion deltas', () => {
    expect(formatCountdown(425_000)).toBe('7:05');
    expect(formatCountdown(3_725_000)).toBe('1:02:05');
    expect(formatCountdown(-5)).toBe('0:00');
    expect(formatSigned(45)).toBe('+45');
    expect(formatSigned(-3)).toBe('−3');
    expect(formatSigned(0)).toBe('0');
    expect(formatOpinionDelta(0.05)).toBe('+0.05');
    expect(formatOpinionDelta(0.025)).toBe('+0.025');
    expect(formatOpinionDelta(0)).toBe('0');
  });
});
