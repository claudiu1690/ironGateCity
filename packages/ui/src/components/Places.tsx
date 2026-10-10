import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../format';
import { HelpButton, helpMark } from './Help';
import { LockMark } from './LockMark';

/** One place on the city map, as the Places list shows it. */
export interface PlaceRow {
  id: string;
  /** Pin number, 1-based: the list is in this order. */
  n: number;
  name: string;
  /** The location's one-line description (shown on at most two lines). */
  blurb: string;
  /** An open Party order points here (the orders list's pin link): a small tag. */
  order?: boolean;
  /**
   * Slice 4 (screens §7.1): work here is tagged with a live Issue: the small Issue mark. Review 4 #14
   * (answers §14): the chip names it, *Issue · Harbour Rates*, and opens `help.issue`.
   */
  issue?: string | null;
  /**
   * Review 4 (answers §21.2, ADR 0076): a place the player cannot open yet: the row is greyed, the lock
   * in place of the number, and this Courier note (*Opens at Level 6* / *Opens with a later edition*).
   */
  locked?: string | null;
}

/**
 * Review 4 (answers §21.2): a home city's Places list is grouped by quarter: the header carries the
 * name and the lock line (*The Harbour · opens at Level 6*), and the quarter's blurb opens from it.
 */
export interface PlaceGroup {
  id: string;
  title: string;
  blurb: string | null;
  places: PlaceRow[];
}

/**
 * Review 5 (answers §9.2, GDD §14.13): *What's here*, the blocks above the places. Each row's tap is
 * the page's (the list closes first, then it runs), as a tap on the pin or the order's pin.
 */
export interface WhatsHereBlocks {
  /** *Issues this week*: the name, then *the Collective leads · 48 momentum*; null tap: no place. */
  issues: Array<{ id: string; name: string; line: string; onPick: (() => void) | null }>;
  /** *Missions you can start*: the title, the Courier line, a night mission's lock line by day. */
  missions: Array<{ id: string; title: string; line: string; lock: string | null; onPick: () => void }>;
  /** *2 more from Level 8 · 3 from Rank 3*, or the empty line when no row. */
  moreLine: string | null;
  /** *Your orders here*: rows, or one quiet line (away, all done, off, none here). */
  orders: { rows: Array<{ id: string; title: string; line: string; onPick: () => void }> } | { line: string };
}

export interface PlacesListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityName: string;
  places: PlaceRow[];
  /** Review 4: the rows grouped (a home city); `places` is then ignored. Absent: one list in pin order. */
  groups?: PlaceGroup[];
  /**
   * A row was tapped: the list closes first, then this runs; the page does exactly what a tap on the
   * pin does (zoom to it, open its sheet).
   */
  onPick: (id: string) => void;
  /** Where the focus goes back to when the list closes without a pick (the Places button). */
  returnFocusTo?: () => HTMLElement | null;
  /** Review 5: the *What's here* blocks; absent, the list is the places alone (*Places in …*). */
  whatsHere?: WhatsHereBlocks;
}

/**
 * Review 3 (the user, 2 Oct 2026): a list of the places on the map, so the player need not look for
 * them on the picture (they still can). Every place in the city view, in pin order: the pin's number,
 * the name, its one line, and a tag where a Party order points. A bottom sheet on a phone held
 * upright; a small panel at the right from 640 px and on a phone held sideways. Radix Dialog: Escape
 * and the Close button close it, focus moves in and comes back to the Places button.
 */
export function PlacesList({
  open,
  onOpenChange,
  cityName,
  places,
  groups,
  onPick,
  returnFocusTo,
  whatsHere,
}: PlacesListProps) {
  // A pick zooms the map and opens the place's own sheet, which takes the focus: none goes back to
  // the Places button (it steps aside while a place is open).
  const picked = useRef(false);
  const ids = useId();
  const rows = [...places].sort((a, b) => a.n - b.n);
  const [blurbOf, setBlurbOf] = useState<string | null>(null);
  /** A block's row: the list closes first, then the page does what the row says. */
  const pick = (run: () => void) => {
    picked.current = true;
    onOpenChange(false);
    run();
  };
  const row = (p: PlaceRow): ReactNode => (
    <li key={p.id} className="border-b border-dotted border-faint last:border-b-0">
      <button
        type="button"
        data-testid="place-row"
        data-locked={p.locked ? true : undefined}
        // Named like the pin ("3. Union Hall"); a locked one by its note ("Coal Yards, opens with a
        // later edition"); the line describes it.
        aria-label={
          p.locked
            ? copy.map.lockedPinLabel(p.name, p.locked)
            : `${p.n}. ${p.name}${p.order ? ', Party order' : ''}`
        }
        aria-describedby={`${ids}-${p.id}`}
        className="flex min-h-11 w-full cursor-pointer items-start gap-3 px-4 py-2 text-left hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
        onClick={() => {
          picked.current = true;
          onOpenChange(false);
          onPick(p.id);
        }}
      >
        <span
          aria-hidden="true"
          className={cx(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-paper bg-ink font-label text-[14px] font-semibold text-paper shadow-[0_0_0_2px_var(--color-ink)]',
            p.locked && 'opacity-50',
          )}
        >
          {p.locked ? <LockMark /> : p.n}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cx('font-display text-[16px] leading-tight font-bold', p.locked && 'text-muted')}>
              {p.name}
            </span>
            {p.order && (
              <span
                className="label-caps border border-petrol px-1.5 py-px text-[9.5px] text-petrol"
                data-testid="place-order"
              >
                Party order
              </span>
            )}
          </span>
          {p.locked ? (
            <span id={`${ids}-${p.id}`} className="font-mono text-[11.5px] text-muted" data-testid="place-locked">
              {p.locked}
            </span>
          ) : (
            <span id={`${ids}-${p.id}`} className="line-clamp-2 font-body text-[13px] leading-snug text-text-2">
              {p.blurb}
            </span>
          )}
        </span>
      </button>
      {p.issue && !p.locked && (
        // Review 4 #14: the chip names the Issue and opens its note; a button of its own
        // beside the row's, never inside it.
        <div className="-mt-2 pb-1 pl-[60px]">
          <IssueChip name={p.issue} />
        </div>
      )}
    </li>
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50" data-testid="places-backdrop" />
        <Dialog.Content
          aria-describedby={undefined}
          data-testid="places"
          onOpenAutoFocus={() => {
            picked.current = false;
          }}
          onCloseAutoFocus={(e) => {
            if (picked.current) return e.preventDefault();
            const to = returnFocusTo?.();
            if (to) {
              e.preventDefault();
              to.focus();
            }
          }}
          className={cx(
            'fixed z-50 flex flex-col bg-paper text-ink',
            // Phones held upright: a bottom sheet over the tab bar.
            'inset-x-0 bottom-0 max-h-[75dvh] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgb(0_0_0/0.45)]',
            // From 640 px: a small panel at the top right of the map, under the HUD.
            'sm:inset-x-auto sm:top-[calc(var(--hud-h,44px)+12px)] sm:right-3 sm:bottom-auto sm:max-h-[calc(100dvh-var(--hud-h,44px)-24px)] sm:w-[360px] sm:pb-0 sm:shadow-[0_0_0_1px_var(--color-ink),0_18px_40px_rgb(0_0_0/0.5)]',
            // A phone held sideways: the same panel, from just under the HUD to the bottom.
            'short:top-[calc(var(--hud-h,44px)+6px)] short:max-h-[calc(100dvh-var(--hud-h,44px)-12px)]',
          )}
        >
          <div className="flex items-center gap-3 border-b-2 border-ink py-1.5 pr-2 pl-4">
            <Dialog.Title className="min-w-0 flex-1 font-display text-[20px] leading-tight font-black">
              {whatsHere ? copy.whatsHere.title(cityName) : `Places in ${cityName}`}
            </Dialog.Title>
            <Dialog.Close className="label-caps min-h-11 min-w-11 cursor-pointer border-[1.5px] border-ink px-2 text-[11px] hover:bg-ink hover:text-paper">
              Close
            </Dialog.Close>
          </div>
          <div className="flex flex-col overflow-y-auto overscroll-contain" data-testid="places-scroll">
          {whatsHere && <WhatsHere blocks={whatsHere} pick={pick} />}
          {whatsHere && <Kicker testId="wh-places">{copy.whatsHere.places}</Kicker>}
          {groups ? (
            <div className="flex flex-col" data-testid="place-groups">
              {groups.map((g) => (
                <section key={g.id} aria-label={g.title} data-testid="place-group">
                  <h3 className="border-b-2 border-ink bg-paper-2">
                    <button
                      type="button"
                      aria-expanded={blurbOf === g.id}
                      disabled={!g.blurb}
                      onClick={() => setBlurbOf((x) => (x === g.id ? null : g.id))}
                      className="label-caps flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-4 text-left text-[11px] font-semibold disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                      data-testid="place-group-title"
                    >
                      <span className={cx(g.blurb && helpMark)}>{g.title}</span>
                      {g.blurb && (
                        <span aria-hidden="true" className="font-label text-[14px]">
                          {blurbOf === g.id ? '−' : '+'}
                        </span>
                      )}
                    </button>
                  </h3>
                  {blurbOf === g.id && g.blurb && (
                    <p className="border-b border-dotted border-faint px-4 py-2 font-body text-[13px] leading-snug text-text-2" data-testid="place-group-blurb">
                      {g.blurb}
                    </p>
                  )}
                  <ul className="flex flex-col">{g.places.map(row)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="flex flex-col">{rows.map(row)}</ul>
          )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A block's kicker on a double rule (answers §9.2). */
function Kicker({ children, testId, help }: { children: ReactNode; testId: string; help?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-2 border-t-[3px] border-double border-ink px-4 pt-1" data-testid={testId}>
      <span className="label-caps flex-1 text-[11px] font-semibold">{children}</span>
      {help}
    </div>
  );
}

/** A row of a block: the title in body 600, its Courier line under it; a tap when it goes somewhere. */
function BlockRow({
  title,
  line,
  lock,
  onClick,
  testId,
}: {
  title: string;
  line: string;
  lock?: string | null;
  onClick: (() => void) | null;
  testId: string;
}) {
  const inner = (
    <>
      <span className="font-body text-[15px] leading-snug font-semibold">{title}</span>
      <span className="font-mono text-[11.5px] leading-snug text-text-2" data-testid="wh-line">
        {line}
      </span>
      {lock && (
        <span className="font-mono text-[11.5px] leading-snug text-muted" data-testid="wh-lock">
          {lock}
        </span>
      )}
    </>
  );
  const cls = 'flex min-h-11 w-full flex-col items-start justify-center gap-0.5 px-4 py-1.5 text-left';
  return (
    <li className="border-b border-dotted border-faint last:border-b-0">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          data-testid={testId}
          className={cx(
            cls,
            'cursor-pointer hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
          )}
        >
          {inner}
        </button>
      ) : (
        <div className={cls} data-testid={testId}>
          {inner}
        </div>
      )}
    </li>
  );
}

/** Review 5 (answers §9.2): the three blocks above the places, each with its empty line. */
function WhatsHere({ blocks, pick }: { blocks: WhatsHereBlocks; pick: (run: () => void) => void }) {
  const quiet = (text: string, testId: string) => (
    <p className="px-4 pt-1 pb-2 font-mono text-[11.5px] leading-snug text-muted" data-testid={testId}>
      {text}
    </p>
  );
  return (
    <div className="flex flex-col" data-testid="whats-here">
      <section aria-label={copy.whatsHere.issues} data-testid="wh-issues">
        <Kicker
          testId="wh-issues-kicker"
          help={
            <HelpButton
              notes={[copy.help.issue()]}
              label={`${copy.whatsHere.issues}: what an Issue is`}
              className="flex min-h-11 min-w-11 items-center justify-end"
            >
              <span className={cx('label-caps text-[10px] text-muted', helpMark)}>What is it</span>
            </HelpButton>
          }
        >
          {copy.whatsHere.issues}
        </Kicker>
        {blocks.issues.length > 0 ? (
          <ul className="flex flex-col">
            {blocks.issues.map((i) => {
              const go = i.onPick;
              return (
                <BlockRow
                  key={i.id}
                  title={i.name}
                  line={i.line}
                  onClick={go ? () => pick(go) : null}
                  testId="wh-issue"
                />
              );
            })}
          </ul>
        ) : (
          quiet(copy.whatsHere.noIssues, 'wh-issues-empty')
        )}
      </section>
      <section aria-label={copy.whatsHere.missions} data-testid="wh-missions">
        <Kicker testId="wh-missions-kicker">{copy.whatsHere.missions}</Kicker>
        {blocks.missions.length > 0 && (
          <ul className="flex flex-col">
            {blocks.missions.map((m) => (
              <BlockRow
                key={m.id}
                title={m.title}
                line={m.line}
                lock={m.lock}
                onClick={() => pick(m.onPick)}
                testId="wh-mission"
              />
            ))}
          </ul>
        )}
        {blocks.moreLine && quiet(blocks.moreLine, 'wh-more')}
      </section>
      <section aria-label={copy.whatsHere.orders} data-testid="wh-orders">
        <Kicker testId="wh-orders-kicker">{copy.whatsHere.orders}</Kicker>
        {'rows' in blocks.orders ? (
          <ul className="flex flex-col">
            {blocks.orders.rows.map((o) => (
              <BlockRow key={o.id} title={o.title} line={o.line} onClick={() => pick(o.onPick)} testId="wh-order" />
            ))}
          </ul>
        ) : (
          quiet(blocks.orders.line, 'wh-orders-line')
        )}
      </section>
    </div>
  );
}

/**
 * Review 4 #14 (answers §14): *Issue · Harbour Rates*, the Places list's and a place sheet's chip; a
 * tap opens *Issue of the week* (`help.issue`).
 */
export function IssueChip({ name, className }: { name: string; className?: string }) {
  return (
    <HelpButton
      notes={[copy.help.issue()]}
      label={`${copy.issueChip(name)}: what an Issue is`}
      testId="place-issue"
      className={cx('flex items-center', className)}
    >
      <span className="label-caps flex items-center gap-1 border border-ink px-1.5 py-px text-[9.5px]">
        <span className="size-2 shrink-0 rounded-full bg-petrol" aria-hidden="true" />
        <span className={helpMark}>{copy.issueChip(name)}</span>
      </span>
    </HelpButton>
  );
}
