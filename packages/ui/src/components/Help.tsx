import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { cx } from '../format';

/** A note behind a label: [the caps kicker, one or two lines] (review 1, GDD §3.7; copy.help). */
export type HelpNote = readonly string[];

/** The dotted underline that marks a label with a note behind it (the paper's footnote mark). */
export const helpMark = 'underline decoration-dotted decoration-1 underline-offset-[3px]';

export interface HelpButtonProps {
  /** The notes this tap opens, in order (the tapped label's first). */
  notes: ReadonlyArray<HelpNote>;
  /** The button's accessible name, e.g. "What Energy, XP and Faction XP mean". */
  label: string;
  /**
   * What the button shows: the labels themselves, set with `helpMark`. Absent for an overlay button
   * laid over a group whose parts must stay readable on their own (the HUD's meters).
   */
  children?: ReactNode;
  className?: string;
  testId?: string;
  /** For a decorative neighbour that opens the same notes on a tap (the plate's share bar). */
  buttonRef?: RefObject<HTMLButtonElement | null>;
  /**
   * Review 4 #12: for an overlay over a group of labels, the index of the note under a tap at
   * (x, y), which the sheet then opens on (the others follow). Null, or a keyboard press: the order
   * given.
   */
  firstAt?: (x: number, y: number) => number | null;
  /**
   * Review 4 #25: a tap on the label of note `index` (by `firstAt`) that opens something else (the
   * Party XP label opens the rank ladder); return true to keep the notes closed.
   */
  onPick?: (index: number) => boolean;
  /** Review 4 #25: a button under a note (by its index in `notes`), e.g. *See the ranks*. */
  actions?: Readonly<Record<number, { label: string; onClick: () => void }>>;
  /**
   * The voting rework (design §4.9): a line behind *More* under the first note, for the curious (the
   * capital's formula). Hidden until the button is tapped.
   */
  more?: string;
}

/** A label's box on screen, for `pickNoteAt`. */
export interface NoteBox {
  key: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Review 4 #12: the label under a tap: the box that holds the point, else the nearest one (a tap in
 * the gap between two labels goes to the closer). Null when there are no boxes.
 */
export function pickNoteAt(boxes: ReadonlyArray<NoteBox>, x: number, y: number): string | null {
  let best: { key: string; d: number } | null = null;
  for (const b of boxes) {
    const dx = x < b.left ? b.left - x : x > b.right ? x - b.right : 0;
    const dy = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0;
    const d = dx * dx + dy * dy;
    if (!best || d < best.d) best = { key: b.key, d };
  }
  return best?.key ?? null;
}

/** The notes with the one at `first` moved to the front (the rest in their order). */
export function notesFrom<T>(notes: ReadonlyArray<T>, first: number | null): ReadonlyArray<T> {
  if (first === null || first <= 0 || first >= notes.length) return notes;
  return [notes[first]!, ...notes.filter((_, i) => i !== first)];
}

/** The indices of `notesFrom`'s order (so a note keeps its action when moved first). */
function orderFrom(length: number, first: number | null): number[] {
  return notesFrom(
    Array.from({ length }, (_, i) => i),
    first,
  ) as number[];
}

/**
 * Review 1 (answers §5, GDD §3.7): tap the label. The labels a note explains are set with a dotted
 * underline; a tap (or a click, or Enter on the focused button) opens the notes as a bottom sheet on
 * phones and a small card beside the label on wide screens. No "i" icons: the paper has none. Where
 * labels sit too close together for a 44 px target each (the HUD's gauges, the city plate, the
 * Today strip), one button covers the group and its sheet lists each label's note.
 */
export function HelpButton({
  notes,
  label,
  children,
  className,
  testId,
  buttonRef,
  firstAt,
  onPick,
  actions,
  more,
}: HelpButtonProps) {
  const own = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const ref = buttonRef ?? own;
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState<number | null>(null);
  const order = orderFrom(notes.length, first);
  const shown = order.map((i) => notes[i]!);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (o && ref.current && typeof window !== 'undefined') {
          const r = ref.current.getBoundingClientRect();
          const width = Math.min(360, window.innerWidth - 32);
          setAt({
            top: Math.min(r.bottom + 8, window.innerHeight - 240),
            left: Math.max(16, Math.min(r.left, window.innerWidth - width - 16)),
          });
        }
        setOpen(o);
        if (!o) setMoreOpen(false);
      }}
    >
      <Dialog.Trigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          data-testid={testId}
          // A pointer tap (detail > 0) opens on the note under it; Enter or Space keeps the order.
          onClick={
            firstAt
              ? (e) => {
                  const at = e.detail > 0 ? firstAt(e.clientX, e.clientY) : null;
                  // Radix skips its toggle when the click's default is prevented.
                  if (at !== null && onPick?.(at)) {
                    e.preventDefault();
                    return;
                  }
                  setFirst(at);
                }
              : undefined
          }
          className={cx('min-h-11 cursor-pointer text-left', className)}
        >
          {children}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 lg:bg-transparent" />
        <Dialog.Content
          className={cx(
            'fixed inset-x-0 bottom-0 z-40 flex max-h-[70dvh] flex-col gap-3 overflow-y-auto bg-paper px-4 pt-3 pb-5 text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.45)]',
            'lg:inset-x-auto lg:top-(--help-top) lg:bottom-auto lg:left-(--help-left) lg:w-[360px] lg:shadow-[0_0_0_1px_var(--color-ink),0_12px_30px_rgb(0_0_0/0.45)]',
          )}
          style={
            at ? ({ '--help-top': `${at.top}px`, '--help-left': `${at.left}px` } as CSSProperties) : undefined
          }
          data-testid="help-note"
        >
          <div className="flex flex-col gap-3">
            {shown.map(([kicker, text], i) => {
              const action = actions?.[order[i]!];
              const button = action && (
                <button
                  type="button"
                  className="label-caps min-h-11 cursor-pointer self-start border-[1.5px] border-ink px-3 text-[11px] hover:bg-ink hover:text-paper"
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                >
                  {action.label}
                </button>
              );
              return i === 0 ? (
                <div key={kicker} className="flex flex-col gap-1">
                  <Dialog.Title className="label-caps text-[11px] font-semibold text-muted">
                    {kicker}
                  </Dialog.Title>
                  <Dialog.Description className="font-body text-[15px] leading-snug">
                    <NoteLines text={text!} />
                  </Dialog.Description>
                  {more &&
                    (moreOpen ? (
                      <p className="mt-1.5 font-body text-[14px] leading-snug text-text-2" data-testid="help-more-line">
                        {more}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        className="-my-1 inline-flex min-h-11 cursor-pointer items-center self-start font-mono text-[13px] underline underline-offset-2"
                        data-testid="help-more"
                      >
                        {copy.help.more}
                      </button>
                    ))}
                  {button}
                </div>
              ) : (
                <div key={kicker} className="flex flex-col gap-1 border-t border-dotted border-faint pt-2.5">
                  <h3 className="label-caps text-[11px] font-semibold text-muted">{kicker}</h3>
                  <p className="font-body text-[15px] leading-snug">
                    <NoteLines text={text!} />
                  </p>
                  {button}
                </div>
              );
            })}
          </div>
          <Dialog.Close className="label-caps min-h-11 cursor-pointer self-end border-[1.5px] border-ink px-3 text-[11px] hover:bg-ink hover:text-paper">
            {copy.help.close}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Review 3: a note of several short lines (*How elections work*), one line each, not a run-on. */
function NoteLines({ text }: { text: string }) {
  const lines = text.split('\n');
  if (lines.length === 1) return <>{text}</>;
  return (
    <>
      {lines.map((l, i) => (
        <span key={i} className={cx('block', i > 0 && 'mt-1.5')} data-testid="note-line">
          {l}
        </span>
      ))}
    </>
  );
}
