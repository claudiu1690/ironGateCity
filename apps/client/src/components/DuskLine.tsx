import { copy } from '@irongate/content/copy';
import { dayKey, dayStart } from '@irongate/rules';
import type { NightView } from '@irongate/rules';
import { HelpButton, cx, formatClock, helpMark } from '@irongate/ui';
import { useNow } from '../lib/useNow';

/** The plate line's note: the clock's (answers §11.3), with the day's turn in the player's clock. */
export function duskNote(now: number): readonly string[] {
  return copy.help.clock(formatClock(dayStart(dayKey(now))));
}

/**
 * Review 5 (answers §11.3, ADR 0079): the plate's line for the town's six-hour day, *Dusk in 40 min* /
 * *Night · dawn at 18:00*, Courier 11, ticking every 30 s from the view's `night` block (never from
 * the browser's own idea of night). As a button it opens the clock's note; inside a plate whose
 * whole block is already one notes button, it is plain dotted text (`button={false}`).
 *
 * QA m1 (fix round): `stacked`, on a phone under 700 px tall, the line sits beside the plate's name in
 * two short lines, *Night · dawn* over *at 18:00*, so the plate keeps its height and every pin its room.
 */
export function DuskLine({
  night,
  button = true,
  stacked = false,
  className,
}: {
  night: NightView;
  button?: boolean;
  stacked?: boolean;
  className?: string;
}) {
  const now = useNow(30_000);
  const text = copy.night.plate(night, now);
  const [lead, at] = copy.night.plateParts(night, now);
  const line = stacked ? (
    <span
      className={cx('flex flex-col items-end font-mono text-[10px] leading-[11px] whitespace-nowrap text-text-2', helpMark)}
      data-testid="plate-dusk"
      data-night={night.night}
      data-stacked=""
    >
      <span>{lead}</span> <span>{at}</span>
    </span>
  ) : (
    <span className={cx('font-mono text-[11px] text-text-2', helpMark)} data-testid="plate-dusk" data-night={night.night}>
      {text}
    </span>
  );
  if (!button) return <span className={cx('flex', className)}>{line}</span>;
  return (
    <HelpButton
      notes={[duskNote(now)]}
      label={`${text}: what the town's day means`}
      testId="plate-dusk-help"
      className={cx('-my-3 inline-flex min-h-11 items-center self-start', className)}
    >
      {line}
    </HelpButton>
  );
}
