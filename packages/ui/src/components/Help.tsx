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
}

/**
 * Review 1 (answers §5, GDD §3.7): tap the label. The labels a note explains are set with a dotted
 * underline; a tap (or a click, or Enter on the focused button) opens the notes as a bottom sheet on
 * phones and a small card beside the label on wide screens. No "i" icons: the paper has none. Where
 * labels sit too close together for a 44 px target each (the HUD's gauges, the city plate, the
 * Today strip), one button covers the group and its sheet lists each label's note.
 */
export function HelpButton({ notes, label, children, className, testId, buttonRef }: HelpButtonProps) {
  const own = useRef<HTMLButtonElement>(null);
  const ref = buttonRef ?? own;
  const [open, setOpen] = useState(false);
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
      }}
    >
      <Dialog.Trigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          data-testid={testId}
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
            {notes.map(([kicker, text], i) =>
              i === 0 ? (
                <div key={kicker} className="flex flex-col gap-1">
                  <Dialog.Title className="label-caps text-[11px] font-semibold text-muted">
                    {kicker}
                  </Dialog.Title>
                  <Dialog.Description className="font-body text-[15px] leading-snug">
                    {text}
                  </Dialog.Description>
                </div>
              ) : (
                <div key={kicker} className="flex flex-col gap-1 border-t border-dotted border-faint pt-2.5">
                  <h3 className="label-caps text-[11px] font-semibold text-muted">{kicker}</h3>
                  <p className="font-body text-[15px] leading-snug">{text}</p>
                </div>
              ),
            )}
          </div>
          <Dialog.Close className="label-caps min-h-11 cursor-pointer self-end border-[1.5px] border-ink px-3 text-[11px] hover:bg-ink hover:text-paper">
            {copy.help.close}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
