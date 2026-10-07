import { useEffect, useState } from 'react';
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
}

export function TravelPin({ traveller, view, content, transition }: TravelPinProps) {
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
        aria-hidden="true"
        className="absolute top-[16px] left-0 -translate-x-1/2 border border-ink bg-paper px-1.5 py-0.5 font-mono text-[11px] leading-tight whitespace-nowrap text-ink shadow-[0_2px_6px_rgb(0_0_0/0.4)]"
        data-testid="travel-pin-label"
      >
        {at.label}
      </span>
    </div>
  );
}
