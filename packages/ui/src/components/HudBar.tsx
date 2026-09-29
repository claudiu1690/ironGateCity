import { copy } from '@irongate/content/copy';
import { xpForLevel } from '@irongate/rules';
import type { CharacterView, StatPointTarget } from '@irongate/rules';
import { useState } from 'react';
import { formatClock, formatCountdown, formatNumber } from '../format';

import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { Gauge } from './Gauge';
import { StatPointsPanel } from './Shell';

export interface HudBarProps {
  /** Energy and Rested already projected to now by the caller. */
  character: CharacterView;
  /** Milliseconds until the next +5 Energy, or null when full. */
  nextTickIn: number | null;
  /** Stat points: the badge opens a small panel with STR / INT. */
  onPlaceStat?: (stat: StatPointTarget) => void;
  placing?: StatPointTarget | null;
}

/**
 * The top bar (HUD v2): crest, name, rank title and level, Energy (ticking) with "full at" or
 * Rested, XP, Iron, Political Capital once earned, and a badge when stat points wait.
 */
export function HudBar({ character: c, nextTickIn, onPlaceStat, placing }: HudBarProps) {
  const [open, setOpen] = useState(false);
  const levelFloor = xpForLevel(c.level);
  const levelSpan = xpForLevel(c.level + 1) - levelFloor;
  const next = nextTickIn === null ? 'full' : `next +5 in ${formatCountdown(nextTickIn)}`;
  const status =
    c.energy.fullAt !== null
      ? copy.energyFullAt(formatClock(c.energy.fullAt))
      : c.rested > 0
        ? copy.energyFull(c.rested)
        : 'Full';
  return (
    <div
      role="region"
      aria-label="Character"
      className="relative z-20 border-b border-ink-2 bg-ink text-paper"
    >
      <div className="mx-auto flex min-h-14 max-w-6xl items-center gap-2.5 px-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-ink-2"
          style={{ borderColor: FACTION_STYLE[c.factionId].color }}
        >
          <FactionCrest factionId={c.factionId} label={c.factionName} size={14} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-display text-[15px] leading-none font-bold">{c.name}</span>
            <span className="label-caps shrink-0 text-[9px] text-dim" data-testid="hud-rank">
              {c.rank.title} · Lv {c.level}
            </span>
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
            valueText={`${formatNumber(c.xp)} XP, ${formatNumber(levelFloor + levelSpan - c.xp)} to Level ${c.level + 1}`}
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-label text-[14px] font-medium" data-testid="hud-energy">
            {c.energy.value} / {c.energy.max}
          </span>
          <span className="label-caps text-[9px] text-energy" data-testid="hud-next-tick">
            {status}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 border-l border-ink-2 pl-2.5">
          <span className="font-label text-[14px] font-medium" data-testid="hud-iron">
            {formatNumber(c.iron)}
          </span>
          <span className="label-caps text-[9px] text-dim">Iron</span>
        </div>
        {c.pc > 0 && (
          <div className="hidden shrink-0 flex-col items-end gap-0.5 border-l border-ink-2 pl-2.5 sm:flex">
            <span className="font-label text-[14px] font-medium" data-testid="hud-pc">
              {c.pc}
            </span>
            <span className="label-caps text-[9px] text-dim">PC</span>
          </div>
        )}
      </div>
      {c.statPointsPending > 0 && onPlaceStat && (
        <div className="mx-auto max-w-6xl px-3 pb-1.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="label-caps min-h-8 cursor-pointer bg-xp px-2 text-[10px] text-ink"
            data-testid="hud-points"
          >
            {copy.pointsToPlace(c.statPointsPending)}
          </button>
          {open && (
            <div className="mt-1.5 border border-ink-2 p-2">
              <StatPointsPanel
                tone="ink"
                pending={c.statPointsPending}
                level={c.level}
                stats={{ str: c.stats.str, int: c.stats.int }}
                onPlace={onPlaceStat}
                placing={placing}
                onLater={() => setOpen(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
