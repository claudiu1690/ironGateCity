import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { clockNow, cx } from '../format';

/**
 * Review 4 (answers §7.1, tech design §6.5; the user, 7 Oct 2026: a plain moving pin, not a train):
 * the traveller on the nation map. The city-marker pin (the nation's diamond) in the faction's
 * colour with a small ink ring, 20 px across, and a Courier label under it (*To Coalport · in 12
 * min*). It ticks on its own once a second on the server's clock, so only this pin re-renders, never
 * the map's tiles: its place is a `transform` on one element.
 */
export interface MapTraveller {
  /** Where the pin is at `now` (fractions of the picture) and the label under it. */
  at: (now: number) => { x: number; y: number; label: string };
  /** The faction's colour, a CSS colour (`var(--color-collective)`). */
  colour: string;
  /** The accessible name (*Your pin: to Coalport, in 12 min*). */
  name: (now: number) => string;
  /** Changing it pulses the pin once (the card arrives); no pulse under reduced motion. */
  pulse?: number;
}

export interface TravelPinProps {
  traveller: MapTraveller;
  /** The map's view: where the picture's origin is on the box, and the layer's size at scale 1. */
  view: { x: number; y: number; scale: number };
  content: { w: number; h: number };
  transition: string;
  /**
   * Review 4 (the user: the label half under the 480 px side sheet): the map box's width and the
   * overlays over it (the side sheet, the zoom buttons, the dock), in the box's pixels. The label
   * slides sideways off them and inside the box, so it is never under the sheet or cut by the edge.
   */
  boxW?: number;
  /** The map box's height: a label that would run past the bottom goes above the pin. */
  boxH?: number;
  avoid?: ReadonlyArray<{ x0: number; y0: number; x1: number; y1: number }>;
}

/** The label's top below the pin's centre, its gap from an overlay and from the box's edge. */
const LABEL_TOP = 16;
const LABEL_GAP = 6;

/**
 * Review 4: where the label's left edge goes (box pixels), centred under the pin when that is clear;
 * otherwise slid right of (or left of) each overlay it meets, and kept inside the box.
 */
export function travelLabelLeft(i: {
  px: number;
  py: number;
  width: number;
  height: number;
  boxW: number;
  avoid: ReadonlyArray<{ x0: number; y0: number; x1: number; y1: number }>;
  /** The label above the pin (`travelLabelAbove`). */
  above?: boolean;
}): number {
  const top = i.above ? i.py - LABEL_TOP - i.height : i.py + LABEL_TOP;
  const bottom = top + i.height;
  const inBox = (l: number) => Math.min(Math.max(l, LABEL_GAP), Math.max(LABEL_GAP, i.boxW - i.width - LABEL_GAP));
  const hits = (l: number) =>
    i.avoid.filter((b) => l < b.x1 && l + i.width > b.x0 && top < b.y1 && bottom > b.y0);
  // A pin dragged off the map takes its label with it.
  if (i.px < 0 || i.px > i.boxW) return i.px - i.width / 2;
  let left = inBox(i.px - i.width / 2);
  for (let k = 0; k < 3; k++) {
    const hit = hits(left)[0];
    if (!hit) break;
    // To the overlay's right if the pin is right of its middle (the side sheet on the left), else its left.
    const right = hit.x1 + LABEL_GAP;
    const leftOf = hit.x0 - LABEL_GAP - i.width;
    const next = i.px >= (hit.x0 + hit.x1) / 2 || leftOf < LABEL_GAP ? right : leftOf;
    left = inBox(next);
  }
  return left;
}

/** Review 4: the label goes above the pin when below it would run past the map's bottom edge. */
export const travelLabelAbove = (py: number, height: number, boxH: number): boolean =>
  py + LABEL_TOP + height > boxH - LABEL_GAP && py - LABEL_TOP - height >= LABEL_GAP;

export function TravelPin({ traveller, view, content, transition, boxW, boxH, avoid = [] }: TravelPinProps) {
  const [now, setNow] = useState(clockNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(clockNow()), 1_000);
    return () => window.clearInterval(id);
  }, []);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (!traveller.pulse) return;
    setPulsing(true);
    const t = window.setTimeout(() => setPulsing(false), 900);
    return () => window.clearTimeout(t);
  }, [traveller.pulse]);
  const at = traveller.at(now);
  const px = view.x + at.x * content.w * view.scale;
  const py = view.y + at.y * content.h * view.scale;
  // The label's size, measured once it is drawn (its text changes once a minute at most).
  const labelRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!size || size.w !== w || size.h !== h) setSize({ w, h });
  }, [at.label, size]);
  // Where the label sits relative to the pin (box pixels): centred, unless an overlay or the edge is there.
  const above = size && boxH !== undefined ? travelLabelAbove(py, size.h, boxH) : false;
  const dx =
    size && boxW !== undefined
      ? travelLabelLeft({ px, py, width: size.w, height: size.h, boxW, avoid, above }) - px
      : null;
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-10 size-0"
      style={{ transform: `translate(${px}px, ${py}px)`, transition }}
      data-testid="travel-pin"
      data-map-x={at.x.toFixed(4)}
      data-map-y={at.y.toFixed(4)}
      role="img"
      aria-label={traveller.name(now)}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-0 left-0 block size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-paper shadow-[0_0_0_2px_var(--color-ink),0_3px_8px_rgb(0_0_0/0.5)]',
          pulsing && 'travel-pin-pulse',
        )}
        style={{ background: traveller.colour }}
        data-testid="travel-pin-mark"
      />
      <span
        ref={labelRef}
        aria-hidden="true"
        className={cx(
          'absolute top-[16px] left-0 border border-ink bg-paper px-1.5 py-0.5 font-mono text-[11px] leading-tight whitespace-nowrap text-ink shadow-[0_2px_6px_rgb(0_0_0/0.4)]',
          dx === null && '-translate-x-1/2',
        )}
        style={{
          ...(dx === null ? {} : { left: dx }),
          ...(above && size ? { top: -LABEL_TOP - size.h } : {}),
        }}
        data-testid="travel-pin-label"
      >
        {at.label}
      </span>
    </div>
  );
}
