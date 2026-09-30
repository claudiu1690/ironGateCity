import { copy } from '@irongate/content/copy';
import { xpForLevel } from '@irongate/rules';
import type { CharacterView, StatPointTarget } from '@irongate/rules';
import { useState } from 'react';
import { formatClock, formatCountdown, formatNumber } from '../format';

import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { Gauge } from './Gauge';
import { HelpButton } from './Help';
import type { HelpNote } from './Help';
import { Picture } from './Picture';
import { StatPointsPanel } from './Shell';

export interface HudBarProps {
  /** Energy and Rested already projected to now by the caller. */
  character: CharacterView;
  /** Milliseconds until the next +5 Energy, or null when full. */
  nextTickIn: number | null;
  /** Stat points: the badge opens a small panel with STR / INT / AGI. */
  onPlaceStat?: (stat: StatPointTarget) => void;
  placing?: StatPointTarget | null;
}

/**
 * The top bar (HUD v2, review 1 #3, #4, #14; answers §5, §8): crest, name, rank title and level,
 * Iron, Political Capital once earned, then the gauges in words: Energy (ticking) with "full at" or
 * Rested; XP with "{xp} XP · {n} to Level {next}", the bar filling within the level; and the
 * Faction XP bar to the next Rank in the faction's colour, labelled with that rank's title (*Rank n*
 * on phones under 400 px), its numbers on a tap. The gauges carry one help button: a tap opens the
 * notes for Energy, Rested, XP, Faction XP and PC. A badge shows when stat points wait.
 */
export function HudBar({ character: c, nextTickIn, onPlaceStat, placing }: HudBarProps) {
  const [open, setOpen] = useState(false);
  const levelFloor = xpForLevel(c.level);
  const levelNext = xpForLevel(c.level + 1);
  const next = nextTickIn === null ? 'full' : `next +5 in ${formatCountdown(nextTickIn)}`;
  const fullAt = c.energy.fullAt !== null ? formatClock(c.energy.fullAt) : null;
  const status =
    fullAt !== null ? copy.energyFullAt(fullAt) : c.rested > 0 ? copy.energyFull(c.rested) : 'Full';
  const { fxpFloor, fxpNext, nextTitle } = c.rank;
  /** The next Rank, or null at the top one. */
  const up = fxpNext !== null && nextTitle !== null ? { fxp: fxpNext, title: nextTitle } : null;
  const toNext = formatNumber(levelNext - c.xp);
  const notes: HelpNote[] = [
    copy.help.energy(fullAt) as HelpNote,
    ...(c.rested > 0 ? [copy.help.rested() as HelpNote] : []),
    copy.help.xp(toNext, c.level + 1) as HelpNote,
    copy.help.fxp(
      c.rank.ladder[1] ?? '',
      c.rank.ladder[2] ?? '',
      up ? formatNumber(up.fxp - c.fxp) : null,
      up?.title ?? null,
    ) as HelpNote,
    ...(c.pc > 0 ? [copy.help.pc() as HelpNote] : []),
  ];
  return (
    <div
      role="region"
      aria-label="Character"
      className="relative z-20 border-b border-ink-2 bg-ink text-paper"
    >
      <div className="mx-auto flex min-h-14 max-w-6xl items-center gap-2.5 px-3 py-1.5">
        {/* Slice 2: the face in a ring of the faction's colour; an empty ring until one is chosen
            (migrated characters, designer answer §13 Q7), with the small crest mark beside it. */}
        <div className="relative shrink-0" data-testid="hud-avatar">
          <div
            className="size-9 overflow-hidden rounded-full border-2 bg-ink-2"
            style={{ borderColor: FACTION_STYLE[c.factionId].color }}
          >
            {c.avatar ? (
              <Picture
                asset={c.avatar}
                sizes="36px"
                decorative
                className="size-full object-cover object-top"
              />
            ) : (
              <span className="sr-only">{copy.noFaceYet}</span>
            )}
          </div>
          <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-ink">
            <FactionCrest factionId={c.factionId} label={c.factionName} size={8} />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-display text-[15px] leading-none font-bold">{c.name}</span>
            <span className="label-caps shrink-0 text-[9px] text-dim" data-testid="hud-rank">
              {c.rank.title} · Lv {c.level}
            </span>
            <span className="ml-auto flex shrink-0 items-baseline gap-1">
              <span className="font-label text-[14px] leading-none font-medium" data-testid="hud-iron">
                {formatNumber(c.iron)}
              </span>
              <span className="label-caps text-[9px] text-dim">Iron</span>
            </span>
            {/* PC on every screen size once earned, never a zero (GDD §6.5, §7.5; onboarding §14.1). */}
            {c.pc > 0 && (
              <span className="flex shrink-0 items-baseline gap-1 border-l border-ink-2 pl-2">
                <span className="font-label text-[14px] leading-none font-medium" data-testid="hud-pc">
                  {c.pc}
                </span>
                <span className="label-caps text-[9px] text-dim">PC</span>
              </span>
            )}
          </div>
          <div className="relative grid gap-[3px] lg:grid-cols-3 lg:gap-x-6">
            <Gauge
              label={copy.hud.energy}
              name="Energy"
              tone="energy"
              value={c.energy.value}
              max={c.energy.max}
              valueText={`${c.energy.value} of ${c.energy.max}, ${next}`}
              figure={`${c.energy.value} / ${c.energy.max}`}
              figureTestId="hud-energy"
              note={status}
              noteTestId="hud-next-tick"
            />
            <Gauge
              label={copy.hud.xp}
              name="Experience to next level"
              tone="xp"
              value={c.xp - levelFloor}
              max={levelNext - levelFloor}
              valueText={`${formatNumber(c.xp)} XP, ${toNext} to Level ${c.level + 1}`}
              figure={copy.hud.xpLine(formatNumber(c.xp), toNext, c.level + 1)}
              figureTestId="hud-xp"
            />
            <Gauge
              label={
                <>
                  <span className="min-[400px]:hidden">
                    {copy.hud.rankN(up ? c.rank.value + 1 : c.rank.value)}
                  </span>
                  <span className="max-[399px]:hidden">{up ? up.title : c.rank.title}</span>
                </>
              }
              labelTestId="hud-fxp-rank"
              name="Faction XP to next rank"
              tone="fxp"
              fillColor={FACTION_STYLE[c.factionId].color}
              value={up ? c.fxp - fxpFloor : 1}
              max={up ? up.fxp - fxpFloor : 1}
              valueText={
                up
                  ? `${formatNumber(c.fxp)} of ${formatNumber(up.fxp)} Faction XP, ${formatNumber(up.fxp - c.fxp)} to ${up.title}`
                  : `${formatNumber(c.fxp)} Faction XP, ${c.rank.title}`
              }
            />
            {/* One tap target over the gauges (44 px tall): the notes behind their labels. */}
            <HelpButton
              notes={notes}
              label="What Energy, XP and Faction XP mean"
              testId="hud-help"
              className="absolute inset-0 -my-1 h-auto w-full bg-transparent focus-visible:outline-2 focus-visible:outline-paper lg:-my-4"
            />
          </div>
        </div>
      </div>
      {c.statPointsPending > 0 && onPlaceStat && (
        <div className="mx-auto max-w-6xl px-3 pb-1.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="label-caps min-h-11 cursor-pointer bg-xp px-3 text-[10px] text-ink"
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
                stats={{ str: c.stats.str, int: c.stats.int, agi: c.stats.agi }}
                guide={c.statGuide}
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
