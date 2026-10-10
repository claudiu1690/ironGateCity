import { boundary, copy } from '@irongate/content/copy';
import { FACTION_IDS } from '@irongate/rules';
import type { FactionId, RivalGroundView } from '@irongate/rules';
import { cx } from '../format';
import type { FactionNames } from './Capital';
import { FACTION_STYLE } from './FactionCrest';
import { helpMark } from './Help';

/**
 * Review 5 (answers §10.2, §16.1, ADR 0082): the rival plate's header, three lines under the morale
 * line: the push bar against the town's 2-point day, the danger in the player's risk word (with the
 * patrols at night), and the goal, Unrest. Plain props; the server decides every figure. The plate's
 * one notes button carries the three notes (`help.push`, `help.rivalGround`, `help.unrest`).
 */

/** Points to one decimal, a whole number without it: *0.7*, *2*, *0*. */
export function pointsWord(x: number): string {
  const v = Math.round(x * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export interface RivalHeaderInput {
  rival: RivalGroundView;
  cityName: string;
  names: FactionNames;
  /** The player's party: its push is named first. */
  mine: FactionId;
  now: number;
  /** The next City Day's start (the cap's *more from tomorrow 01:00*). */
  dayTurnAt: number;
}

/** The three lines' words (the plate's notes carry the whole push and goal lines). */
export function rivalHeaderLines(i: RivalHeaderInput): {
  push: string;
  pushTotal: string;
  pushSplit: string;
  danger: string;
  goal: string;
  goalShort: string;
  full: boolean;
} {
  const { rival: r, names } = i;
  const nameOf = (f: FactionId) => names[f] ?? f;
  const full = r.pressure.left <= 0;
  const order = [i.mine, ...FACTION_IDS.filter((f) => f !== i.mine && f !== r.homeFactionId)];
  const parts = order
    .filter((f) => (r.pressure.byFaction[f] ?? 0) > 0)
    .map((f) => ({ party: nameOf(f), points: pointsWord(r.pressure.byFaction[f]!) }));
  const home = nameOf(r.homeFactionId);
  const push = full
    ? copy.risk.rival.pushFull(boundary(i.dayTurnAt, i.now))
    : copy.risk.rival.pushFigure(pointsWord(r.pressure.lost), parts);
  const pushTotal = full ? push : copy.risk.rival.pushFigure(pointsWord(r.pressure.lost), []);
  return {
    full,
    push,
    pushTotal,
    pushSplit: push.slice(pushTotal.length),
    danger: copy.risk.rival.danger(copy.risk.riskWord[r.risk] ?? r.risk, r.night),
    goal: r.unrest
      ? copy.risk.rival.goalHold(i.cityName, home, r.goal.aboveFloor.toFixed(1))
      : copy.risk.rival.goal(home, r.goal.toUnrest.toFixed(1), pointsWord(r.goal.weekPushed)),
    goalShort: r.unrest
      ? copy.risk.rival.goalHoldShort(i.cityName, r.goal.aboveFloor.toFixed(1))
      : copy.risk.rival.goalShort(r.goal.toUnrest.toFixed(1), pointsWord(r.goal.weekPushed)),
  };
}

/**
 * The push bar: a 2-point track filled by party in the parties' colours (the player's first), the
 * whole bar in the failure colour once the town has had enough today. A day stored before the split
 * fills in ink.
 */
export function PushBar({ rival, mine }: { rival: RivalGroundView; mine: FactionId }) {
  const { pressure, homeFactionId } = rival;
  const full = pressure.left <= 0;
  const order = [mine, ...FACTION_IDS.filter((f) => f !== mine && f !== homeFactionId)];
  const split = order.reduce((n, f) => n + (pressure.byFaction[f] ?? 0), 0);
  const pct = (x: number) => `${Math.min(100, (x / pressure.cap) * 100)}%`;
  return (
    <span
      className={cx('flex h-1.5 w-10 shrink-0 overflow-hidden bg-paper-2', full && 'bg-failure')}
      data-testid="push-bar"
      data-full={full}
      aria-hidden="true"
    >
      {!full &&
        (split > 0
          ? order.map((f) =>
              (pressure.byFaction[f] ?? 0) > 0 ? (
                <span
                  key={f}
                  data-faction={f}
                  style={{ width: pct(pressure.byFaction[f]!), background: FACTION_STYLE[f].color }}
                />
              ) : null,
            )
          : pressure.lost > 0 && <span className="bg-ink" style={{ width: pct(pressure.lost) }} />)}
    </span>
  );
}

/**
 * The three lines, each one line on the plate so the pins stay clear: the push (the total never cut,
 * the split by party truncating), the danger and the goal. On a phone the goal is its short form (the
 * whole sentence is the Unrest note's first line); from 640 px wide it is the whole sentence.
 * `foldGoal`: classes that fold the goal away (a phone under 700 px tall: it rides the push note).
 */
export function RivalHeader({ input, foldGoal }: { input: RivalHeaderInput; foldGoal?: string }) {
  const lines = rivalHeaderLines(input);
  const r = input.rival;
  return (
    <div className="flex min-w-0 flex-col gap-0.5" data-testid="rival-header">
      <span
        className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] whitespace-nowrap text-text-2"
        data-testid="plate-pressure"
        aria-label={`${copy.risk.rival.pushedToday}: ${lines.push}`}
      >
        <span className={cx('label-caps shrink-0 text-[8.5px] text-muted', helpMark)}>
          {copy.risk.rival.pushedToday}
        </span>
        <PushBar rival={r} mine={input.mine} />
        <span className={cx('flex min-w-0', lines.full && 'text-failure')} data-testid="push-figure">
          <span className={lines.full ? 'truncate' : 'shrink-0'}>{lines.pushTotal}</span>
          {/* The split's leading space survives as a no-break space (a flex item's edge collapses it). */}
          {lines.pushSplit && (
            <span className="min-w-0 truncate">{lines.pushSplit.replace(/^ /, '\u00a0')}</span>
          )}
        </span>
      </span>
      <span
        className={cx(
          'truncate font-mono text-[11px]',
          r.risk === 'dangerous' ? 'text-failure' : 'text-text-2',
        )}
        data-testid="plate-danger"
        data-risk={r.risk}
        data-night={r.night}
        title={lines.danger}
      >
        {lines.danger}
      </span>
      <span className={cx('min-w-0', foldGoal)} data-testid="plate-goal" data-goal={lines.goal}>
        <span className="block truncate font-mono text-[11px] text-ink sm:hidden">{lines.goalShort}</span>
        <span className="hidden font-body text-[13px] leading-snug text-ink sm:block">{lines.goal}</span>
      </span>
    </div>
  );
}
