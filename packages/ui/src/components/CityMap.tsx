import type { AssetView } from '@irongate/rules';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { KeepScale, TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { cx } from '../format';
import { Picture } from './Picture';

export interface MapHotspot {
  id: string;
  /** Pin number, 1-based. */
  n: number;
  name: string;
  /** Fractions of the map image. */
  map: { x: number; y: number };
}

export interface CityMapProps {
  map: { day: AssetView; night: AssetView };
  /** Night art 20:00–06:00 UTC (GDD §2.2); crossfades when it flips. */
  isNight: boolean;
  locations: MapHotspot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Overlays that don't pan (the city plate). Mark a full-width overlay with
   * `data-map-overlay="top"` or `"bottom"` and the first view keeps every pin clear of it.
   */
  children?: ReactNode;
  className?: string;
  /**
   * Pixels at the bottom of the map hidden by an open sheet (phones, slice 2 §12.3): a selected pin
   * is panned into the part above it, so the first landing shows pin 1 over its sheet.
   */
  coverBottom?: number;
}

const MAX_SCALE = 2.5;
/** Room around a pin: half its 44 px target plus a margin, so no pin touches an edge. */
const PIN_PAD = 30;
/** An overlay narrower than this share of the map is ignored (the desktop plate sits in a corner). */
const OVERLAY_MIN_WIDTH_SHARE = 0.6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface MapInsets {
  top: number;
  bottom: number;
}

export interface MapView {
  scale: number;
  x: number;
  y: number;
}

/**
 * The first view of the map (QA M2): the largest scale up to 1 ("cover") at which every pin fits
 * the box between the insets with PIN_PAD around it, the pins' box centred there. The image may
 * then be narrower or shorter than the box (as in the MobileCity mockup), never offset past an edge
 * that the pan limits would snap back.
 */
export function fitPinsView(i: {
  box: { w: number; h: number };
  content: { w: number; h: number };
  pins: ReadonlyArray<{ x: number; y: number }>;
  insets: MapInsets;
}): MapView {
  const { box, content, pins, insets } = i;
  if (pins.length === 0) return { scale: 1, ...clampPosition(box, content, 1, 0, 0) };
  const xs = pins.map((p) => p.x);
  const ys = pins.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const safe = {
    left: PIN_PAD,
    right: box.w - PIN_PAD,
    top: insets.top + PIN_PAD,
    bottom: box.h - insets.bottom - PIN_PAD,
  };
  const fits = (span: number, room: number, size: number) => (span > 0 ? room / (span * size) : Infinity);
  const scale = clamp(
    Math.min(
      fits(x1 - x0, safe.right - safe.left, content.w),
      fits(y1 - y0, safe.bottom - safe.top, content.h),
      1,
    ),
    0.2,
    1,
  );
  const x = (safe.left + safe.right) / 2 - ((x0 + x1) / 2) * content.w * scale;
  const y = (safe.top + safe.bottom) / 2 - ((y0 + y1) / 2) * content.h * scale;
  return { scale, ...clampPosition(box, content, scale, x, y) };
}

/** The pan limits of react-zoom-pan-pinch (`limitToBounds`, no centring), so a view never jumps. */
function clampPosition(
  box: { w: number; h: number },
  content: { w: number; h: number },
  scale: number,
  x: number,
  y: number,
) {
  const dx = box.w - content.w * scale;
  const dy = box.h - content.h * scale;
  return { x: clamp(x, Math.min(dx, 0), Math.max(dx, 0)), y: clamp(y, Math.min(dy, 0), Math.max(dy, 0)) };
}

/** Full-width overlays marked with `data-map-overlay`, measured against the map box. */
function measureInsets(box: HTMLElement): MapInsets {
  const b = box.getBoundingClientRect();
  const insets: MapInsets = { top: 0, bottom: 0 };
  for (const el of box.querySelectorAll<HTMLElement>('[data-map-overlay]')) {
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.width < b.width * OVERLAY_MIN_WIDTH_SHARE) continue;
    if (el.dataset.mapOverlay === 'top') insets.top = Math.max(insets.top, r.bottom - b.top);
    if (el.dataset.mapOverlay === 'bottom') insets.bottom = Math.max(insets.bottom, b.bottom - r.top);
  }
  return insets;
}

/**
 * The city's detailed map (mockups City, MobileCity) with numbered hotspots at their map fractions.
 * The first view fits every pin on screen, clear of the plate and the orders panel (QA M2); the map
 * then pans and zooms (react-zoom-pan-pinch, up to 2.5× the covering size), and a pin focused with
 * the keyboard is panned into view. Hotspots keep a 44 px touch target at every zoom. Name tags
 * show on wide screens.
 */
export function CityMap({
  map,
  isNight,
  locations,
  selectedId,
  onSelect,
  children,
  className,
  coverBottom = 0,
}: CityMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ReactZoomPanPinchRef>(null);
  const [size, setSize] = useState<{ w: number; h: number; insets: MapInsets } | null>(null);
  // Slice 2 (first-session art budget, ADR 0015): the night art is fetched only once it is night.
  const [nightMounted, setNightMounted] = useState(isNight);
  /** Bumped to return to the first view (its key remounts the transform). */
  const [firstViews, setFirstViews] = useState(0);
  useEffect(() => {
    if (isNight) setNightMounted(true);
  }, [isNight]);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    // jsdom has no layout: fall back to a phone-sized box so the map still renders in tests.
    const measure = () =>
      setSize({ w: el.clientWidth || 390, h: el.clientHeight || 480, insets: measureInsets(el) });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = map.day.width / map.day.height;
  const w = size?.w ?? 0;
  const h = size?.h ?? 0;
  const insets = size?.insets ?? { top: 0, bottom: 0 };
  // Scale 1 covers the box; the first view may zoom out below it to show every pin.
  const contentW = Math.max(w, h * aspect);
  const contentH = contentW / aspect;
  const box = { w, h };
  const content = { w: contentW, h: contentH };
  const initial = fitPinsView({ box, content, pins: locations.map((l) => l.map), insets });

  /**
   * Pan (keeping the zoom) so that a pin sits in the middle of the clear area. A focus pan is
   * instant: the focused pin must be visible at once, and it needs no animation frame.
   */
  const panTo = (target: MapHotspot, mode: 'select' | 'focus') => {
    const z = zoomRef.current;
    if (!z || w === 0) return;
    // The ref's `state` is a snapshot from mount; the instance holds the live transform.
    const { scale: current, positionX, positionY } = z.instance.state;
    const px = positionX + target.map.x * contentW * current;
    const py = positionY + target.map.y * contentH * current;
    // Visible: the whole 44 px target is inside the box and clear of the overlays.
    const half = 22;
    const visible = px >= half && px <= w - half && py >= insets.top + half && py <= h - insets.bottom - half;
    if (mode === 'focus' && visible) return;
    const bottom = mode === 'select' ? Math.max(insets.bottom, coverBottom) : insets.bottom;
    const cx = w / 2;
    const cy = (insets.top + h - bottom) / 2;
    // Under a phone's sheet the clear strip is short: zoom in just enough that the pan limits let the
    // pin reach its middle (slice 2 §12.3: the first landing keeps pin 1 visible above the sheet).
    let scale = current;
    if (mode === 'select' && coverBottom > 0) {
      const { x: tx, y: ty } = target.map;
      const need = Math.max(
        tx > 0 ? cx / (tx * contentW) : 0,
        tx < 1 ? (w - cx) / ((1 - tx) * contentW) : 0,
        ty > 0 ? cy / (ty * contentH) : 0,
        ty < 1 ? (h - cy) / ((1 - ty) * contentH) : 0,
      );
      scale = clamp(Math.max(current, need), current, MAX_SCALE);
    }
    const x = cx - target.map.x * contentW * scale;
    const y = cy - target.map.y * contentH * scale;
    const p = clampPosition(box, content, scale, x, y);
    // Instant for a focus, and under a phone's sheet (it slides in over the map anyway, and an
    // animation still running when the sheet closes would outlive the reset to the first view).
    const instant = mode === 'focus' || coverBottom > 0 || prefersReducedMotion();
    void z.setTransform(p.x, p.y, scale, instant ? 0 : 250);
  };

  // Pan to a newly selected location (also the one selected on arrival, once the box is measured).
  // A pan made to clear a phone's sheet is undone when the sheet closes: back to the first view,
  // every pin on screen again (QA M2).
  const pannedUnderSheet = useRef(false);
  useEffect(() => {
    if (w === 0) return;
    const target = locations.find((l) => l.id === selectedId);
    // The first measure remounts the transform (its key): wait a frame for the new instance.
    const id = requestAnimationFrame(() => {
      if (target) {
        panTo(target, 'select');
        pannedUnderSheet.current = coverBottom > 0;
      } else if (pannedUnderSheet.current) {
        pannedUnderSheet.current = false;
        // Remount the transform: its first view is exactly the fitted one (every pin whole on screen).
        setFirstViews((n) => n + 1);
      }
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, w > 0, coverBottom]);

  // Keyboard focus on a pin that is off-screen or under an overlay pans it into view (WCAG 2.4.11).
  // Not a tap's focus: moving the pin under the finger would lose the tap.
  const lastPointerDown = useRef(0);
  const onPinFocus = (l: MapHotspot) => {
    if (Date.now() - lastPointerDown.current > 1_000) panTo(l, 'focus');
  };

  // The browser also scrolls the clipped wrappers to reveal a focused element, which would shift the
  // whole map under its pan state; the map moves by transform only, so undo any such scroll.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const unscroll = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || !el.contains(t)) return;
      if (t.scrollLeft !== 0) t.scrollLeft = 0;
      if (t.scrollTop !== 0) t.scrollTop = 0;
    };
    el.addEventListener('scroll', unscroll, true);
    return () => el.removeEventListener('scroll', unscroll, true);
  }, []);

  return (
    <div ref={boxRef} className={cx('relative overflow-hidden bg-ink', className)} data-testid="city-map">
      {size && w > 0 && h > 0 && (
        <TransformWrapper
          key={`${Math.round(contentW)}x${Math.round(contentH)}-${firstViews}`}
          ref={zoomRef}
          initialScale={initial.scale}
          initialPositionX={initial.x}
          initialPositionY={initial.y}
          minScale={initial.scale}
          maxScale={MAX_SCALE}
          limitToBounds
          doubleClick={{ disabled: true }}
          panning={{ excluded: ['hotspot'] }}
        >
          <TransformComponent
            wrapperStyle={{ width: w, height: h }}
            contentStyle={{ width: contentW, height: contentH }}
          >
            <div className="relative" style={{ width: contentW, height: contentH }}>
              <Picture
                asset={map.day}
                sizes={`${Math.round(contentW)}px`}
                loading="eager"
                className="absolute inset-0 size-full select-none"
              />
              <div
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: isNight ? 1 : 0 }}
                aria-hidden={!isNight}
                data-testid="map-night"
              >
                {nightMounted && (
                  <Picture
                    asset={map.night}
                    sizes={`${Math.round(contentW)}px`}
                    decorative={!isNight}
                    className="size-full select-none"
                  />
                )}
              </div>
              {locations.map((l) => {
                const selected = l.id === selectedId;
                return (
                  <KeepScale
                    key={l.id}
                    className="absolute size-0"
                    style={{ left: `${l.map.x * 100}%`, top: `${l.map.y * 100}%` }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(l.id)}
                      onPointerDown={() => {
                        lastPointerDown.current = Date.now();
                      }}
                      onFocus={() => onPinFocus(l)}
                      aria-pressed={selected}
                      aria-label={`${l.n}. ${l.name}`}
                      data-testid="hotspot"
                      className="hotspot absolute top-0 left-0 flex h-11 min-w-11 -translate-x-[22px] -translate-y-[22px] cursor-pointer items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                    >
                      <span
                        className={cx(
                          'hotspot mx-1.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-label text-[14px] font-semibold',
                          selected
                            ? 'border-ink bg-paper text-ink shadow-[0_0_0_2px_var(--color-paper),0_0_0_8px_rgb(239_230_210/0.35)]'
                            : 'border-paper bg-ink text-paper shadow-[0_0_0_2px_var(--color-ink),0_3px_8px_rgb(0_0_0/0.5)]',
                        )}
                      >
                        {l.n}
                      </span>
                      <span
                        className={cx(
                          'hotspot label-caps -ml-2 hidden border border-l-0 py-1 pr-2 pl-2.5 text-[11px] whitespace-nowrap lg:inline',
                          selected ? 'border-ink bg-paper text-ink' : 'border-paper bg-ink text-paper',
                        )}
                      >
                        {l.name}
                      </span>
                    </button>
                  </KeepScale>
                );
              })}
            </div>
          </TransformComponent>
        </TransformWrapper>
      )}
      {children}
    </div>
  );
}
