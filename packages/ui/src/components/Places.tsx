import * as Dialog from '@radix-ui/react-dialog';
import { useId, useRef } from 'react';
import { cx } from '../format';

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
}

export interface PlacesListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityName: string;
  places: PlaceRow[];
  /**
   * A row was tapped: the list closes first, then this runs; the page does exactly what a tap on the
   * pin does (zoom to it, open its sheet).
   */
  onPick: (id: string) => void;
  /** Where the focus goes back to when the list closes without a pick (the Places button). */
  returnFocusTo?: () => HTMLElement | null;
}

/**
 * Review 3 (the user, 2 Oct 2026): a list of the places on the map, so the player need not look for
 * them on the picture (they still can). Every place in the city view, in pin order: the pin's number,
 * the name, its one line, and a tag where a Party order points. A bottom sheet on a phone held
 * upright; a small panel at the right from 640 px and on a phone held sideways. Radix Dialog: Escape
 * and the Close button close it, focus moves in and comes back to the Places button.
 */
export function PlacesList({ open, onOpenChange, cityName, places, onPick, returnFocusTo }: PlacesListProps) {
  // A pick zooms the map and opens the place's own sheet, which takes the focus: none goes back to
  // the Places button (it steps aside while a place is open).
  const picked = useRef(false);
  const ids = useId();
  const rows = [...places].sort((a, b) => a.n - b.n);
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
              Places in {cityName}
            </Dialog.Title>
            <Dialog.Close className="label-caps min-h-11 min-w-11 cursor-pointer border-[1.5px] border-ink px-2 text-[11px] hover:bg-ink hover:text-paper">
              Close
            </Dialog.Close>
          </div>
          <ul className="flex flex-col overflow-y-auto overscroll-contain">
            {rows.map((p) => (
              <li key={p.id} className="border-b border-dotted border-faint last:border-b-0">
                <button
                  type="button"
                  data-testid="place-row"
                  // Named like the pin ("3. Union Hall"); the line describes it.
                  aria-label={`${p.n}. ${p.name}${p.order ? ', Party order' : ''}`}
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
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-paper bg-ink font-label text-[14px] font-semibold text-paper shadow-[0_0_0_2px_var(--color-ink)]"
                  >
                    {p.n}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-display text-[16px] leading-tight font-bold">{p.name}</span>
                      {p.order && (
                        <span
                          className="label-caps border border-petrol px-1.5 py-px text-[9.5px] text-petrol"
                          data-testid="place-order"
                        >
                          Party order
                        </span>
                      )}
                    </span>
                    <span
                      id={`${ids}-${p.id}`}
                      className="line-clamp-2 font-body text-[13px] leading-snug text-text-2"
                    >
                      {p.blurb}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
