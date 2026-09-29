import type { FactionId } from '@irongate/rules';

/** Crest shapes and colours (design canvas): ■ Vanguard ochre, ● Collective oxblood, ▲ Alliance slate. */
export const FACTION_STYLE: Record<
  FactionId,
  /** `text`: the colour as text on paper, at 4.5:1 (QA m1). */
  { shape: 'square' | 'circle' | 'triangle'; color: string; text: string }
> = {
  vanguard: { shape: 'square', color: 'var(--color-vanguard)', text: 'text-vanguard-text' },
  collective: { shape: 'circle', color: 'var(--color-collective)', text: 'text-collective' },
  alliance: { shape: 'triangle', color: 'var(--color-alliance)', text: 'text-alliance-text' },
};

export interface FactionCrestProps {
  factionId: FactionId;
  /** Accessible name, e.g. the faction's display name. Omit for a decorative crest. */
  label?: string;
  size?: number;
  className?: string;
}

export function FactionCrest({ factionId, label, size = 12, className }: FactionCrestProps) {
  const { shape, color } = FACTION_STYLE[factionId];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {shape === 'square' && <rect width="10" height="10" fill={color} />}
      {shape === 'circle' && <circle cx="5" cy="5" r="5" fill={color} />}
      {shape === 'triangle' && <path d="M5 0 10 10H0z" fill={color} />}
    </svg>
  );
}
