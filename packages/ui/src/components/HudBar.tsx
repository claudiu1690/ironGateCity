import { copy } from '@irongate/content/copy';
import { dayKey, dayStart, heatState, xpForLevel } from '@irongate/rules';
import type { CharacterView, StatPointTarget } from '@irongate/rules';
import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { clockNow, cx, formatClock, formatCountdown, formatNumber, formatWhen } from '../format';

import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { Gauge } from './Gauge';
import { HelpButton, helpMark, pickNoteAt } from './Help';
import type { HelpNote, NoteBox } from './Help';
import { Picture } from './Picture';
import { RankLadderSheet } from './RankLadder';
import { StatPointsPanel } from './Shell';
import { HealthBar, HeatRow, heatWord } from './Street';

export interface HudBarProps {
  /** Energy and Rested already projected to now by the caller. */
  character: CharacterView;
  /**
   * Slice 5 (screens §2.1, §2.2): Heat and Health projected to now by the caller (the HUD shows the
   * Heat line only above 0; the Health bar always, review 4 #24). Absent: the view's own values.
   */
  heat?: number;
  health?: { value: number; max: number };
  /** Milliseconds until the next +5 Energy, or null when full. */
  nextTickIn: number | null;
  /**
   * Review 4 (answers §4.1): the server's clock now (the dev panel's test clock included), ticking;
   * the HUD's clock shows it to the minute. Absent: the clock source's now.
   */
  now?: number;
  /** Stat points: the badge opens a small panel with STR / INT / AGI. */
  onPlaceStat?: (stat: StatPointTarget) => void;
  placing?: StatPointTarget | null;
}

/**
 * The top bar (HUD v2, review 1 #3, #4, #14; answers §5, §8): crest, name, rank title and level,
 * Iron, Political Capital once earned, then the gauges in words: Energy (ticking) with "full at" or
 * Rested; XP with "{xp} XP · {n} to Level {next}", the bar filling within the level; and the
 * Faction XP bar to the next Rank in the faction's colour, labelled *To {rank title}* (*To Rank n* on
 * phones under 400 px) with its numbers after it, *38 / 400 FXP* (review 2 #7). Design Review 2 #6:
 * the order is Energy · Health (always, review 4 #24) · Heat (above 0) · XP · Party XP (review 5
 * answers §6); on wide screens the first column is Energy over Health over Heat, XP and Party XP the
 * first row's other two. Held sideways, Health and Heat ride in the name line. The gauges carry one
 * help button over the group; a tap opens the
 * sheet on the note of the label under it (review 4 #12), the others after it. Political Capital is
 * its own button with its own note. A badge shows when stat points wait.
 */
export function HudBar({ character: c, nextTickIn, onPlaceStat, placing, heat, health, now: nowProp }: HudBarProps) {
  const now = nowProp ?? clockNow();
  const heatValue = heat ?? c.heat?.value ?? 0;
  const heatS = heatState(heatValue);
  const coolsAt = c.heat?.coolsAt ?? null;
  const hp = health ?? (c.health ? { value: c.health.value, max: c.health.max } : null);
  const [open, setOpen] = useState(false);
  const levelFloor = xpForLevel(c.level);
  const levelNext = xpForLevel(c.level + 1);
  const next = nextTickIn === null ? 'full' : `next +5 in ${formatCountdown(nextTickIn)}`;
  const fullAt = c.energy.fullAt !== null ? formatWhen(c.energy.fullAt, now) : null;
  const status =
    fullAt !== null ? copy.energyFullAt(fullAt) : c.rested > 0 ? copy.energyFull(c.rested) : 'Full';
  const { fxpFloor, fxpNext, nextTitle } = c.rank;
  /** The next Rank, or null at the top one. */
  const up = fxpNext !== null && nextTitle !== null ? { fxp: fxpNext, title: nextTitle } : null;
  const toNext = formatNumber(levelNext - c.xp);
  // Each note keyed by the label it explains (`data-note`), so a tap opens on its own note.
  const keyed: Array<{ key: string; note: HelpNote }> = [
    { key: 'energy', note: copy.help.energy(fullAt) as HelpNote },
    ...(c.rested > 0 ? [{ key: 'rested', note: copy.help.rested() as HelpNote }] : []),
    // Design Review 2 #6: Health directly under Energy, then Heat (review 4 #12: its note says the
    // state and when it cools), then XP and Party XP.
    ...(hp ? [{ key: 'health', note: copy.risk.help.health() as HelpNote }] : []),
    ...(heatValue > 0
      ? [
          {
            key: 'heat',
            note: copy.risk.help.heat(
              heatS,
              heatS !== 'cool' && coolsAt !== null ? formatWhen(coolsAt, now) : null,
            ) as HelpNote,
          },
        ]
      : []),
    { key: 'xp', note: copy.help.xp(toNext, c.level + 1) as HelpNote },
    {
      key: 'fxp',
      note: copy.help.fxp(up ? formatNumber(up.fxp - c.fxp) : null, up?.title ?? null) as HelpNote,
    },
  ];
  const notes = keyed.map((k) => k.note);
  // Review 4 #25: the Party XP label opens the rank ladder; its note carries *See the ranks*.
  const [ladder, setLadder] = useState(false);
  const fxpAt = keyed.findIndex((k) => k.key === 'fxp');
  const gauges = useRef<HTMLDivElement>(null);
  const firstAt = firstNoteIn(gauges, keyed);
  // Review 4 #24: on a phone held sideways (the 60 px HUD) Health and Heat sit in the name line, one
  // button of their own (the gauges keep their one row).
  const vitalsKeyed = ['health', 'heat'].flatMap((key) => keyed.filter((k) => k.key === key));
  const vitals = useRef<HTMLButtonElement>(null);
  return (
    <div
      role="region"
      aria-label="Character"
      className="relative z-20 border-b border-ink-2 bg-ink text-paper"
    >
      <div className="mx-auto flex min-h-14 max-w-6xl items-center gap-2.5 px-3 py-1.5 short:min-h-0 short:gap-2 short:py-1">
        {/* Slice 2: the face in a ring of the faction's colour; an empty ring until one is chosen
            (migrated characters, designer answer §13 Q7), with the small crest mark beside it. */}
        <div className="relative shrink-0" data-testid="hud-avatar">
          <div
            className="size-9 overflow-hidden rounded-full border-2 bg-ink-2 short:size-7"
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
        <div className="flex min-w-0 flex-1 flex-col gap-1 short:gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-display text-[15px] leading-none font-bold">{c.name}</span>
            <span className="label-caps shrink-0 text-[9px] text-dim" data-testid="hud-rank">
              {c.rank.title} · Lv {c.level}
            </span>
            {vitalsKeyed.length > 0 && (
              <HelpButton
                notes={vitalsKeyed.map((k) => k.note)}
                firstAt={firstNoteIn(vitals, vitalsKeyed)}
                buttonRef={vitals}
                label={
                  hp
                    ? `${copy.risk.health} ${copy.risk.healthValue(hp.value, hp.max)}${heatValue > 0 ? `, ${copy.risk.heatLine(heatValue, heatWord(heatState(heatValue)))}` : ''}: what they mean`
                    : 'What Heat means'
                }
                testId="hud-vitals-short"
                className="-my-[15px] ml-auto hidden shrink-0 items-center gap-3 self-center text-paper short:flex"
              >
                {hp && (
                  <span className="flex items-center gap-1.5" data-note="health" aria-hidden="true">
                    <span className={cx('label-caps text-[9px] text-dim', helpMark)}>{copy.risk.health}</span>
                    <span className="h-[5px] w-10 bg-failure">
                      <span
                        className="block h-[5px] bg-paper"
                        style={{ width: `${hp.max > 0 ? Math.max(0, Math.min(100, (hp.value / hp.max) * 100)) : 0}%` }}
                      />
                    </span>
                    <span className="font-label text-[12px] leading-none font-medium">
                      {copy.risk.healthValue(hp.value, hp.max)}
                    </span>
                  </span>
                )}
                {heatValue > 0 && (
                  <HeatRow value={heatValue} className="pointer-events-none" testIds={false} />
                )}
              </HelpButton>
            )}
            {/* Review 4 (answers §4.1): the clock in the first line on wide screens (and on a phone
                held sideways); under 1024 px it sits at the right of the Energy line. */}
            {/* QA review 4 (R4-QA-03): in the first line the clock is drawn under the gauges' button, as
                Political Capital is, so its 44 px reach never covers the Party XP label below it. */}
            <HudClock now={now} testId="hud-clock-line" className="hidden self-center lg:ml-auto lg:flex short:flex" />
            <span className="ml-auto flex shrink-0 items-baseline gap-1 lg:ml-0 short:ml-0">
              <span className="font-label text-[14px] leading-none font-medium" data-testid="hud-iron">
                {formatNumber(c.iron)}
              </span>
              <span className="label-caps text-[9px] text-dim">Iron</span>
            </span>
            {/* Political Capital on every screen size once earned, never a zero (GDD §6.5, §7.5;
                onboarding §14.1). Review 2 #5: never the bare "PC"; the name sits in two short lines
                beside the number, so it fits a 360 px phone. */}
            {c.pc > 0 && (
              // Review 4 #12: its own button and its own note (a 44 px target over a 15 px line;
              // the gauges' button below is drawn over its lower reach, never over the label).
              <HelpButton
                notes={[copy.help.pc() as HelpNote]}
                label={`${c.pc} Political Capital: what Political Capital means`}
                testId="hud-pc-block"
                className="-my-[15px] flex shrink-0 items-center self-center text-paper"
              >
                {/* The rule beside it as tall as the two lines, not the 44 px target. */}
                <span className="flex items-center gap-1 border-l border-ink-2 pl-2">
                  <span className="font-label text-[14px] leading-none font-medium" data-testid="hud-pc">
                    {c.pc}
                  </span>
                  <span className="label-caps flex flex-col text-[7.5px] leading-[1.05] tracking-[0.1em] text-dim">
                    <span>Political</span>
                    <span className={helpMark}>Capital</span>
                  </span>
                </span>
              </HelpButton>
            )}
          </div>
          <div
            ref={gauges}
            // QA review 4 (R4-QA-03): held sideways the three columns are as wide as their words (the
            // rest shared out), so *1,212 / 2,000 Party XP* is never clipped beside a short Energy line.
            className="relative grid gap-[3px] lg:grid-cols-3 lg:gap-x-6 short:grid-cols-[repeat(3,auto)] short:gap-x-4"
          >
            <div className="flex min-w-0 items-center gap-1 lg:contents short:contents">
              <Gauge
                label={copy.hud.energy}
                name="Energy"
                tone="energy"
                value={c.energy.value}
                max={c.energy.max}
                valueText={`${c.energy.value} of ${c.energy.max}, ${next}`}
                figure={`${c.energy.value} / ${c.energy.max}`}
                figureTestId="hud-energy"
                noteKey="energy"
                note={status}
                noteTestId="hud-next-tick"
                // Wide screens: every gauge in its own cell (Design Review 2 #6), Energy the first.
                className="flex-1 lg:col-start-1 lg:row-start-1"
                narrowBar
              />
              {/* Inside the gauges, above their button (z-10), so a tap on the time opens the clock. */}
              <HudClock now={now} testId="hud-clock" className="relative z-10 -mr-2 flex lg:hidden short:hidden" />
            </div>
            {/* Design Review 2 #6: Health directly under Energy, always (review 4 #24); on wide screens
                the second row's first column. */}
            {hp && <HealthBar value={hp.value} max={hp.max} className="short:hidden lg:col-start-1 lg:row-start-2" />}
            {/* Review 4 #12 (answers §12): Heat is a body line of its own from 1, right after Health;
                review 5 answers §6: on wide screens under Health (the first column's third row, so the
                bar is three rows deep only while Heat is above 0). */}
            {heatValue > 0 && (
              <HeatRow value={heatValue} size="line" className="short:hidden lg:col-start-1 lg:row-start-3" />
            )}
            <Gauge
              label={copy.hud.xp}
              name="Experience to next level"
              tone="xp"
              value={c.xp - levelFloor}
              max={levelNext - levelFloor}
              valueText={`${formatNumber(c.xp)} XP, ${toNext} to Level ${c.level + 1}`}
              figure={copy.hud.xpLine(formatNumber(c.xp), toNext, c.level + 1)}
              figureTestId="hud-xp"
              noteKey="xp"
              className="lg:col-start-2 lg:row-start-1"
            />
            <Gauge
              // Review 2 #7: "To Steward" before the bar and "38 / 400 FXP" after it, always shown.
              label={
                up ? (
                  <>
                    <span className="min-[400px]:hidden">
                      {copy.hud.toRank(copy.hud.rankN(c.rank.value + 1))}
                    </span>
                    <span className="max-[399px]:hidden">{copy.hud.toRank(up.title)}</span>
                  </>
                ) : (
                  c.rank.title
                )
              }
              labelTestId="hud-fxp-rank"
              name="Party XP to next rank"
              tone="fxp"
              fillColor={FACTION_STYLE[c.factionId].color}
              value={up ? c.fxp - fxpFloor : 1}
              max={up ? up.fxp - fxpFloor : 1}
              valueText={
                up
                  ? `${formatNumber(c.fxp)} of ${formatNumber(up.fxp)} Party XP, ${formatNumber(up.fxp - c.fxp)} to ${up.title}`
                  : `${formatNumber(c.fxp)} Party XP, ${c.rank.title}`
              }
              figure={
                up
                  ? copy.hud.fxpLine(formatNumber(c.fxp), formatNumber(up.fxp))
                  : copy.hud.fxpTop(formatNumber(c.fxp))
              }
              figureTestId="hud-fxp"
              noteKey="fxp"
              className="lg:col-start-3 lg:row-start-1"
            />
            {/* One tap target over the gauges (44 px tall): the notes behind their labels, opening on
                the one under the tap. */}
            <HelpButton
              notes={notes}
              firstAt={firstAt}
              label={heatValue > 0 ? 'What Energy, Health, Heat, XP and Party XP mean' : 'What Energy, Health, XP and Party XP mean'}
              testId="hud-help"
              className="absolute inset-x-0 -top-1 -bottom-1 h-auto w-full bg-transparent focus-visible:outline-2 focus-visible:outline-paper lg:-bottom-3 short:-top-0.5"
              onPick={(i) => {
                if (i !== fxpAt) return false;
                setLadder(true);
                return true;
              }}
              actions={{ [fxpAt]: { label: copy.ranks.seeTheLadder, onClick: () => setLadder(true) } }}
            />
          </div>
        </div>
      </div>
      <RankLadderSheet
        open={ladder}
        onOpenChange={setLadder}
        factionName={c.factionName}
        ranks={c.ranks}
        rank={c.rank.value}
        fxp={c.fxp}
      />
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

/**
 * Review 4 (answers §4.1): the time in the player's own clock, Courier 12 px, dotted: its note says
 * when the day turns (00:00 UTC) in the same clock, and (review 5, answers §11.3) that the town's own
 * day is six hours. A 44 px target over a 12 px line, drawn above the gauges' group button.
 */
function HudClock({ now, testId, className }: { now: number; testId: string; className?: string }) {
  const turn = dayStart(dayKey(now));
  const note = copy.help.clock(formatClock(turn)) as HelpNote;
  const time = formatClock(now);
  return (
    <HelpButton
      notes={[note]}
      label={`${time}: what the clock means`}
      testId={testId}
      className={cx(
        '-my-[15px] min-w-11 shrink-0 items-center justify-end text-paper',
        className,
      )}
    >
      <span className={cx('font-mono text-[12px] leading-none', helpMark)} data-testid={`${testId}-time`}>
        {time}
      </span>
    </HelpButton>
  );
}

/**
 * Review 4 #12: a group button's `firstAt`: the index in `keyed` of the label (`data-note`) under the
 * tap inside `root`, by `pickNoteAt`.
 */
function firstNoteIn(
  root: RefObject<HTMLElement | null>,
  keyed: ReadonlyArray<{ key: string }>,
): (x: number, y: number) => number | null {
  return (x, y) => {
    const boxes: NoteBox[] = [];
    root.current?.querySelectorAll<HTMLElement>('[data-note]').forEach((el) => {
      const r = el.getBoundingClientRect();
      // A label not shown at this size (display: none) has no box.
      if (r.width === 0 && r.height === 0) return;
      boxes.push({ key: el.dataset.note ?? '', top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    });
    const key = pickNoteAt(boxes, x, y);
    const i = keyed.findIndex((k) => k.key === key);
    return i < 0 ? null : i;
  };
}
