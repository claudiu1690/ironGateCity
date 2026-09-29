import { xpForLevel } from '@irongate/rules';
import type { CharacterView } from '@irongate/rules';
import { formatCountdown, formatNumber } from '../format';
import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { Gauge } from './Gauge';

export interface HudBarProps {
  /** Energy and Rested already projected to now by the caller. */
  character: CharacterView;
  /** Milliseconds until the next +5 Energy, or null when full. */
  nextTickIn: number | null;
}

/** The top bar: who you are, Energy (ticking), Rested, XP and Iron. */
export function HudBar({ character: c, nextTickIn }: HudBarProps) {
  const levelFloor = xpForLevel(c.level);
  const levelSpan = xpForLevel(c.level + 1) - levelFloor;
  const next = nextTickIn === null ? 'full' : `next +5 in ${formatCountdown(nextTickIn)}`;
  return (
    <div
      role="region"
      aria-label="Character"
      className="flex min-h-14 items-center gap-2.5 border-b border-ink-2 bg-ink px-3 text-paper"
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-ink-2"
        style={{ borderColor: FACTION_STYLE[c.factionId].color }}
      >
        <FactionCrest factionId={c.factionId} label={c.factionName} size={14} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-display text-[15px] leading-none font-bold">{c.name}</span>
          <span className="label-caps shrink-0 text-[9px] text-dim">Level {c.level}</span>
        </div>
        <Gauge
          label="EN"
          name="Energy"
          tone="energy"
          value={c.energy.value}
          max={c.energy.max}
          valueText={`${c.energy.value} of ${c.energy.max}, ${next}`}
        />
        <Gauge
          label="XP"
          name="Experience to next level"
          tone="xp"
          value={c.xp - levelFloor}
          max={levelSpan}
          valueText={`${formatNumber(c.xp)} XP`}
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-label text-[14px] font-medium" data-testid="hud-energy">
          {c.energy.value} / {c.energy.max}
        </span>
        <span className="label-caps text-[9px] text-energy" data-testid="hud-next-tick">
          {nextTickIn === null ? 'Full' : `+5 in ${formatCountdown(nextTickIn)}`}
        </span>
        {c.rested > 0 && <span className="label-caps text-[9px] text-energy">Rested {c.rested}</span>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 border-l border-ink-2 pl-2.5">
        <span className="font-label text-[14px] font-medium" data-testid="hud-iron">
          {formatNumber(c.iron)}
        </span>
        <span className="label-caps text-[9px] text-dim">Iron</span>
      </div>
    </div>
  );
}
