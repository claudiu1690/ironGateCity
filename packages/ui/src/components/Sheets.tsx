import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import type { LocationJobView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatClock } from '../format';

/**
 * Where the location opens (review 2 #2, #3): `sheet`, a bottom sheet on a phone held upright;
 * `side`, a panel down the left on a phone held sideways; `panel`, a centred panel over the dimmed
 * map on tablets and desktops.
 */
export type LocationLayout = 'sheet' | 'side' | 'panel';

export interface LocationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  n: number;
  kindLabel: string;
  name: string;
  blurb: string;
  /** Small bonus tags ("Rested +50 % XP and Iron"). */
  tags?: string[];
  layout?: LocationLayout;
  /**
   * A bottom sheet the full 60 dvh, however little it holds: the zoomed map's art stops short of the
   * map's edge under it (CityMap `onArrive`), and a shorter sheet would show the gap.
   */
  fill?: boolean;
  children: ReactNode;
}

/** A pointer-down on the city map (a drag of the zoomed map, another pin) keeps the sheet open. */
const onTheMap = (e: Event) =>
  e.target instanceof Element && e.target.closest('[data-testid="city-map"]') !== null;

/**
 * The location (mockups MobileCity, City). Radix Dialog, so Escape closes it and focus moves in.
 * On phones it is not modal: the zoomed map beside or above it stays live, to pan or to tap another
 * pin (review 2 #8). On tablets and desktops it is a modal panel in the middle of the screen over the
 * dimmed map, since the map no longer matters once a place is open (review 2 #2).
 */
export function LocationSheet({
  open,
  onOpenChange,
  n,
  kindLabel,
  name,
  blurb,
  tags = [],
  layout = 'sheet',
  fill = false,
  children,
}: LocationSheetProps) {
  const modal = layout === 'panel';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <Dialog.Portal>
        {modal && <Dialog.Overlay className="fixed inset-0 z-30 bg-ink/60" data-testid="location-backdrop" />}
        <Dialog.Content
          aria-describedby={undefined}
          data-layout={layout}
          onPointerDownOutside={(e) => {
            if (!modal && onTheMap(e)) e.preventDefault();
          }}
          // Not modal, focus may leave it for the result modal or a note over it: that is no close.
          onFocusOutside={(e) => {
            if (!modal) e.preventDefault();
          }}
          className={cx(
            'fixed z-30 flex flex-col overflow-y-auto overscroll-contain bg-paper text-ink',
            layout === 'sheet' &&
              // Slice 2 (§12.3): at most 60 dvh on phones, so the map and the pin stay visible above it.
              'inset-x-0 bottom-16 max-h-[60dvh] shadow-[0_-10px_30px_rgb(0_0_0/0.45)]',
            layout === 'sheet' && fill && 'h-[60dvh]',
            layout === 'side' &&
              // Right of the tab rail, under the HUD, the full height; it scrolls inside (review 2 #3).
              'top-[var(--hud-h,44px)] bottom-0 left-[calc(64px+env(safe-area-inset-left))] w-[min(340px,50vw)] shadow-[10px_0_30px_rgb(0_0_0/0.45)]',
            layout === 'panel' &&
              'top-1/2 left-1/2 max-h-[min(760px,calc(100dvh-48px))] w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.55)]',
          )}
        >
          {layout === 'sheet' && (
            <div className="flex justify-center pt-2" aria-hidden="true">
              <span className="h-1 w-10 bg-faint" />
            </div>
          )}
          <div
            className={cx(
              'flex items-start gap-3 border-b-2 border-ink px-4 pb-2.5',
              layout === 'sheet' ? 'pt-1.5' : 'pt-3',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="label-caps text-[10px] text-muted">
                {n} · {kindLabel}
              </span>
              <Dialog.Title
                className={cx(
                  'font-display leading-[1.05] font-black',
                  layout === 'side' ? 'text-[22px]' : 'text-[26px]',
                )}
              >
                {name}
              </Dialog.Title>
              <p className="font-body text-[14px] leading-snug text-text-2">{blurb}</p>
              {tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t) => (
                    <li
                      key={t}
                      className="label-caps border border-petrol px-1.5 py-0.5 text-[10px] text-petrol"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Dialog.Close
              className="label-caps -mr-1 min-h-11 min-w-11 cursor-pointer border-[1.5px] border-ink px-2 text-[11px] hover:bg-ink hover:text-paper"
              aria-label={`Close ${name}`}
            >
              Close
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-2 px-3 pt-2.5 pb-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface JobsCardProps {
  jobs: LocationJobView[];
  /** The job the character holds (anywhere), for the "Your job" line: seniority days and %. */
  held: { days: number; pct: number } | null;
  onTake: (jobId: string) => void;
  pendingJobId?: string | null;
  /** One line under a job after taking it ("Taken · paid at 01:00"). */
  message?: { jobId: string; text: string } | null;
}

function needsText(j: LocationJobView): string {
  return copy.jobNeeds(
    j.unmet.map((u) => (u.reason === 'LEVEL' ? `Level ${u.need}` : `${u.stat!.toUpperCase()} ${u.need}`)),
  );
}

/**
 * §9.1 Jobs card (review 1: a job is a wage): what is offered here, with pay and requirements, and
 * *{pay} a day · paid at midnight*. Taking and switching are free, one tap; a switch resets seniority.
 */
export function JobsCard({ jobs, held, onTake, pendingJobId, message }: JobsCardProps) {
  if (jobs.length === 0) return null;
  return (
    <section aria-label="Jobs" className="mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card">
      <h3 className="label-caps border-b border-ink px-3 py-1.5 text-[11px] font-semibold">Jobs</h3>
      {jobs.map((j) => (
        <div
          key={j.jobId}
          className="flex flex-col gap-1.5 border-b border-dotted border-faint px-3 py-2 last:border-b-0"
          data-testid={`job-${j.jobId}`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-[15px] font-bold">{j.name}</span>
            <span className="font-label text-[13px]">{copy.jobPayLine(j.pay)}</span>
          </div>
          <p className="font-body text-[13px] text-text-2">{j.blurb}</p>
          {j.held ? (
            <p className="font-mono text-[12px] text-petrol" data-testid="job-held">
              {held ? copy.yourJob(held.days, held.pct) : 'Your job'}
            </p>
          ) : j.locked ? (
            <button
              type="button"
              disabled
              className="label-caps min-h-11 border-[1.5px] border-faint px-3 text-[12px] text-muted"
            >
              {needsText(j)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onTake(j.jobId)}
              disabled={!!pendingJobId}
              aria-busy={pendingJobId === j.jobId || undefined}
              className="label-caps min-h-11 cursor-pointer bg-ink px-3 text-[12px] text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:bg-faint"
            >
              {pendingJobId === j.jobId ? '…' : j.isSwitch ? copy.switchJob : copy.takeJob}
            </button>
          )}
          {message?.jobId === j.jobId && (
            <p role="status" className="font-mono text-[12px] text-collective">
              {message.text}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

export interface OutOfEnergyCardProps {
  fullAt: number | null;
  /** Open orders, worded by the caller. */
  waiting: string[];
}

/** Shown when projected Energy is below the cheapest ticket here (tech design §12.2). */
export function OutOfEnergyCard({ fullAt, waiting }: OutOfEnergyCardProps) {
  return (
    <section
      aria-label={copy.outOfEnergy}
      className="flex flex-col gap-1 bg-ink px-3 py-2.5 text-paper"
      data-testid="out-of-energy"
    >
      <span className="label-caps text-[11px] font-semibold">{copy.outOfEnergy}</span>
      {fullAt !== null && (
        <span className="font-label text-[14px]">{copy.outOfEnergyRegen(formatClock(fullAt))}</span>
      )}
      <span className="font-mono text-[11px] text-dim">{copy.outOfEnergyRested}</span>
      {waiting.length > 0 && (
        <span className="font-mono text-[11px] text-dim">
          {copy.waitingForYou}: {waiting.join(' · ')}
        </span>
      )}
    </section>
  );
}

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

/** A bottom sheet on phones, a centred card from 640 px (the Me tab's face change, slice 2 §12.3). */
export function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col gap-3 overflow-y-auto bg-paper p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-ink sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <Dialog.Title className="font-display text-[22px] font-bold">{title}</Dialog.Title>
          {children}
          <Dialog.Close className="label-caps min-h-11 cursor-pointer border-[1.5px] border-ink px-4 text-[13px] hover:bg-ink hover:text-paper">
            Close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
