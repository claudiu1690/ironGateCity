import type { AssetView } from '@irongate/rules';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
   * Overlays that don't pan (the city plate, the orders panel). Mark each with `data-map-overlay`
   * (`"top"` or `"bottom"` for a band across the map) and the first view keeps every pin clear of
   * it. Any other element marked `data-map-overlay` that lies over the map (the desktop tab dock)
   * is kept clear too.
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
/**
 * An overlay at least this share of the map wide is a band across it (the phone plate, the phone
 * orders panel): the pins go between the bands. A narrower one (the desktop plate in its corner, the
 * tab dock) is a block the pins must stay out of (slice-2 QA M2).
 */
const OVERLAY_BAND_WIDTH_SHARE = 0.6;
/** Each step of the search for a first view clear of the blocks zooms out by this factor. */
const FIT_STEP = 0.97;
/** Positions tried per axis at each scale of that search. */
const FIT_GRID = 24;
const MIN_FIT_SCALE = 0.2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A rectangle in the map box's pixels. */
export interface MapRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface MapInsets {
  top: number;
  bottom: number;
  /** Overlays that are not bands across the map: no pin may sit under one (QA M2). */
  blocks?: MapRect[];
}

export interface MapView {
  scale: number;
  x: number;
  y: number;
}

type FitInput = {
  box: { w: number; h: number };
  content: { w: number; h: number };
  pins: ReadonlyArray<{ x: number; y: number }>;
  insets: MapInsets;
};

/** Every pin, with PIN_PAD around it, inside the box and between the bands at this view. */
function betweenBands(i: FitInput, v: MapView): boolean {
  const e = 0.5; // rounding
  return i.pins.every((p) => {
    const px = v.x + p.x * i.content.w * v.scale;
    const py = v.y + p.y * i.content.h * v.scale;
    return (
      px >= PIN_PAD - e &&
      px <= i.box.w - PIN_PAD + e &&
      py >= i.insets.top + PIN_PAD - e &&
      py <= i.box.h - i.insets.bottom - PIN_PAD + e
    );
  });
}

/** No pin's target (with PIN_PAD around its centre) overlaps a block at this view. */
function clearOfBlocks(i: FitInput, v: MapView): boolean {
  const blocks = i.insets.blocks ?? [];
  return i.pins.every((p) => {
    const px = v.x + p.x * i.content.w * v.scale;
    const py = v.y + p.y * i.content.h * v.scale;
    return blocks.every(
      (b) => px + PIN_PAD <= b.x0 || px - PIN_PAD >= b.x1 || py + PIN_PAD <= b.y0 || py - PIN_PAD >= b.y1,
    );
  });
}

/**
 * The first view of the map (QA M2): the largest scale up to 1 ("cover") at which every pin fits
 * the box between the bands with PIN_PAD around it, the pins' box centred there. The image may
 * then be narrower or shorter than the box (as in the MobileCity mockup), never offset past an edge
 * that the pan limits would snap back.
 *
 * Slice-2 QA M2: if that view leaves a pin under a block (the desktop plate in its corner, the tab
 * dock) or outside the bands (the pan limits keep an image shorter than the box inside it, which
 * can pull the pins back under a tall plate), the view is searched for instead, from that scale
 * down: at each scale the positions that keep every pin between the bands and the image within its
 * pan limits are tried, nearest the centred one first, and the first that keeps every pin clear of
 * every block wins. The map may then show a margin of dark ground beside the image, under the plate.
 */
export function fitPinsView(i: FitInput): MapView {
  const first = fitBetweenBands(i);
  if (i.pins.length === 0 || (betweenBands(i, first) && clearOfBlocks(i, first))) return first;
  const { box, content, pins, insets } = i;
  const xs = pins.map((p) => p.x);
  const ys = pins.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let scale = first.scale; scale >= MIN_FIT_SCALE; scale *= FIT_STEP) {
    const cw = content.w * scale;
    const ch = content.h * scale;
    const dx = box.w - cw;
    const dy = box.h - ch;
    // Every pin inside the box (between the bands), and the image within its pan limits.
    const xr = [
      Math.max(PIN_PAD - x0 * cw, Math.min(dx, 0)),
      Math.min(box.w - PIN_PAD - x1 * cw, Math.max(dx, 0)),
    ];
    const yr = [
      Math.max(insets.top + PIN_PAD - y0 * ch, Math.min(dy, 0)),
      Math.min(box.h - insets.bottom - PIN_PAD - y1 * ch, Math.max(dy, 0)),
    ];
    if (xr[0]! > xr[1]! || yr[0]! > yr[1]!) continue;
    const centred = fitBetweenBands({ ...i, box }, scale);
    let best: MapView | null = null;
    let bestD = Infinity;
    for (let a = 0; a <= FIT_GRID; a++) {
      const x = xr[0]! + ((xr[1]! - xr[0]!) * a) / FIT_GRID;
      for (let b = 0; b <= FIT_GRID; b++) {
        const y = yr[0]! + ((yr[1]! - yr[0]!) * b) / FIT_GRID;
        const d = (x - centred.x) ** 2 + (y - centred.y) ** 2;
        if (d < bestD && clearOfBlocks(i, { scale, x, y })) {
          best = { scale, x, y };
          bestD = d;
        }
      }
    }
    if (best) return best;
  }
  return first;
}

/** The pins' box centred between the bands at the largest scale that fits it (or at `atScale`). */
function fitBetweenBands(i: FitInput, atScale?: number): MapView {
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
  const scale =
    atScale ??
    clamp(
      Math.min(
        fits(x1 - x0, safe.right - safe.left, content.w),
        fits(y1 - y0, safe.bottom - safe.top, content.h),
        1,
      ),
      0.2,
      1,
    );
  const cw = content.w * scale;
  const ch = content.h * scale;
  // QA n11: an image shorter than the box, centred on its pins, left one empty dark band of about
  // 130 px between the map and the phone's orders panel. Where the pins allow it, the image covers
  // the clear area between the bands (any empty ground goes under the plate or the panel); if it is
  // too short for that, it sits in the middle of the clear area, so what is left is split evenly.
  // `centred`: the position that centres the pins; [lo, hi]: the clear area; [pinLo, pinHi]: the
  // positions that keep every pin inside it.
  const cover = (centred: number, lo: number, hi: number, size: number, pinLo: number, pinHi: number) => {
    if (pinLo > pinHi) return centred;
    if (size >= hi - lo) {
      const from = Math.max(hi - size, pinLo);
      const to = Math.min(lo, pinHi);
      return from <= to ? clamp(centred, from, to) : centred;
    }
    return clamp(lo + (hi - lo - size) / 2, pinLo, pinHi);
  };
  const x = cover(
    (safe.left + safe.right) / 2 - ((x0 + x1) / 2) * cw,
    0,
    box.w,
    cw,
    safe.left - x0 * cw,
    safe.right - x1 * cw,
  );
  const y = cover(
    (safe.top + safe.bottom) / 2 - ((y0 + y1) / 2) * ch,
    insets.top,
    box.h - insets.bottom,
    ch,
    safe.top - y0 * ch,
    safe.bottom - y1 * ch,
  );
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

/**
 * The overlays marked with `data-map-overlay` that lie over the map box (its own children, and the
 * shell's, like the desktop tab dock), measured against it: wide ones marked `top` or `bottom` as
 * bands, the rest as blocks (QA M2).
 */
function measureInsets(box: HTMLElement): MapInsets {
  const b = box.getBoundingClientRect();
  const insets: MapInsets = { top: 0, bottom: 0, blocks: [] };
  for (const el of box.ownerDocument.querySelectorAll<HTMLElement>('[data-map-overlay]')) {
    const r = el.getBoundingClientRect();
    const x0 = Math.round(Math.max(r.left, b.left) - b.left);
    const x1 = Math.round(Math.min(r.right, b.right) - b.left);
    const y0 = Math.round(Math.max(r.top, b.top) - b.top);
    const y1 = Math.round(Math.min(r.bottom, b.bottom) - b.top);
    if (x1 <= x0 || y1 <= y0) continue; // hidden, or not over the map
    const band = r.width >= b.width * OVERLAY_BAND_WIDTH_SHARE;
    if (band && el.dataset.mapOverlay === 'top') insets.top = Math.max(insets.top, y1);
    else if (band && el.dataset.mapOverlay === 'bottom')
      insets.bottom = Math.max(insets.bottom, Math.round(b.height) - y0);
    else insets.blocks!.push({ x0, y0, x1, y1 });
  }
  return insets;
}

const sameInsets = (a: MapInsets, b: MapInsets) => JSON.stringify(a) === JSON.stringify(b);

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
  // Slice 2 (first-session art budget, ADR 0015): the night art is fetched only once it is night,
  // and the day art only once it is day (a first landing at night loads one map, not two).
  const [nightMounted, setNightMounted] = useState(isNight);
  const [dayMounted, setDayMounted] = useState(!isNight);
  useEffect(() => {
    if (isNight) setNightMounted(true);
    else setDayMounted(true);
  }, [isNight]);

  // While a pin is selected the overlays are not re-measured: the desktop plate folds under an open
  // sheet, and the first view is the one for the unfolded plate (QA M2). Measured again on close.
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const measureRef = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    // jsdom has no layout: fall back to a phone-sized box so the map still renders in tests.
    const measure = () =>
      setSize((prev) => {
        const next = {
          w: el.clientWidth || 390,
          h: el.clientHeight || 480,
          insets: prev && selectedRef.current ? prev.insets : measureInsets(el),
        };
        return prev && prev.w === next.w && prev.h === next.h && sameInsets(prev.insets, next.insets)
          ? prev
          : next;
      });
    measureRef.current = measure;
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    // The box (a banner above the map shrinks it) and the overlays in it (the plate grows when the
    // orders load or unfold): either changes the first view (QA M2).
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const o of el.querySelectorAll('[data-map-overlay]')) ro.observe(o);
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
  const pinsKey = locations.map((l) => `${l.map.x},${l.map.y}`).join(';');
  const fitted = useMemo(
    () =>
      fitPinsView({
        box: { w, h },
        content: { w: contentW, h: contentH },
        pins: locations.map((l) => l.map),
        insets,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, h, contentW, contentH, pinsKey, insets],
  );
  // The transform library keeps its initial position rounded to 2 decimals; the reset after a sheet
  // closes uses the same numbers, so it lands on exactly the view the map mounted with.
  const initial = { scale: fitted.scale, x: Number(fitted.x.toFixed(2)), y: Number(fitted.y.toFixed(2)) };
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const contentKey = `${Math.round(contentW)}x${Math.round(contentH)}`;
  const viewKey = `${initial.x}|${initial.y}|${initial.scale}`;

  /**
   * The map is at its first view: just mounted, or reset, and not moved since by the player or by a
   * pan to a pin. Only then does a new first view (the box or an overlay changed size) move it.
   */
  const atFirstView = useRef(true);
  /** The first view the transform shows: the one it mounted with, or the last one applied. */
  const applied = useRef<{ content: string; view: string } | null>(null);
  /**
   * Back to the first view, in place: never by remounting the transform, which would replace every
   * pin button just as the player taps one (the lost-tap fix, c732d64). 1 ms, not 0: an animated
   * transform first cancels any momentum still running from a flick (an instant one would set the
   * view and let that momentum carry on over it); it lands on the next frame.
   */
  const verifyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(verifyTimer.current), []);
  const resetView = () => {
    const v = initialRef.current;
    atFirstView.current = true;
    applied.current = { content: contentKey, view: `${v.x}|${v.y}|${v.scale}` };
    void zoomRef.current?.setTransform(v.x, v.y, v.scale, 1);
    // The library aligns the view to its box when its own size observer sees the box change (a
    // banner above the map), and that cancels an animation in flight: when it lands after this
    // reset, the reset is lost. Once things have settled, set the first view again if it did not
    // hold (instantly: nothing is moving by then).
    clearTimeout(verifyTimer.current);
    verifyTimer.current = setTimeout(() => {
      const z = zoomRef.current;
      const t = initialRef.current;
      if (!z || !atFirstView.current || selectedRef.current) return;
      const s = z.instance.state;
      const off =
        Math.abs(s.positionX - t.x) > 0.5 ||
        Math.abs(s.positionY - t.y) > 0.5 ||
        Math.abs(s.scale - t.scale) > 1e-3;
      if (off) void z.setTransform(t.x, t.y, t.scale, 0);
    }, 150);
  };
  useEffect(() => {
    if (w === 0) return;
    const prev = applied.current;
    if (!prev || prev.content !== contentKey) {
      // Mounted, or remounted for a new size: the transform starts at this first view.
      applied.current = { content: contentKey, view: viewKey };
      atFirstView.current = true;
      return;
    }
    if (prev.view === viewKey || selectedId || !atFirstView.current) return;
    resetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, viewKey, selectedId, w]);

  /**
   * Pan (keeping the zoom) so that a pin sits in the middle of the clear area. A focus pan is
   * instant: the focused pin must be visible at once, and it needs no animation frame.
   */
  const panTo = (target: MapHotspot, mode: 'select' | 'focus'): boolean => {
    const z = zoomRef.current;
    if (!z || w === 0) return false;
    // The ref's `state` is a snapshot from mount; the instance holds the live transform.
    const { scale: current, positionX, positionY } = z.instance.state;
    const px = positionX + target.map.x * contentW * current;
    const py = positionY + target.map.y * contentH * current;
    // Visible: the whole 44 px target is inside the box and clear of the overlays.
    const half = 22;
    const visible =
      px >= half &&
      px <= w - half &&
      py >= insets.top + half &&
      py <= h - insets.bottom - half &&
      (insets.blocks ?? []).every(
        (b) => px + half <= b.x0 || px - half >= b.x1 || py + half <= b.y0 || py - half >= b.y1,
      );
    if (mode === 'focus' && visible) return false;
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
    if (Math.abs(p.x - positionX) < 0.5 && Math.abs(p.y - positionY) < 0.5 && scale === current) return false;
    atFirstView.current = false;
    void z.setTransform(p.x, p.y, scale, instant ? 0 : 250);
    return true;
  };

  // Pan to a newly selected location (also the one selected on arrival, once the box is measured).
  // A pan made for a sheet is undone when the sheet closes: back to the first view, every pin on
  // screen and clear of the plate again (QA M2; on desktop the plate unfolds as the sheet closes).
  // The view is reset in place (resetView), so a pin the player has just focused or started to tap
  // is never detached and the Enter or the tap is not lost.
  const pannedForSheet = useRef(false);
  useEffect(() => {
    if (w === 0) return;
    const target = locations.find((l) => l.id === selectedId);
    // Closed: measure the overlays again (they were held while the sheet was open).
    if (!target) measureRef.current();
    // The first measure remounts the transform (its key): wait a frame for the new instance.
    const id = requestAnimationFrame(() => {
      if (target) {
        pannedForSheet.current = panTo(target, 'select') || pannedForSheet.current;
      } else if (pannedForSheet.current) {
        pannedForSheet.current = false;
        resetView();
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
  /** The player moved the map: a new first view no longer moves it. */
  const moved = () => {
    atFirstView.current = false;
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
          key={contentKey}
          ref={zoomRef}
          initialScale={initial.scale}
          initialPositionX={initial.x}
          initialPositionY={initial.y}
          minScale={initial.scale}
          maxScale={MAX_SCALE}
          limitToBounds
          doubleClick={{ disabled: true }}
          panning={{ excluded: ['hotspot'] }}
          onPanning={moved}
          onPinch={moved}
          onWheel={moved}
        >
          <TransformComponent
            wrapperStyle={{ width: w, height: h }}
            contentStyle={{ width: contentW, height: contentH }}
          >
            <div className="relative" style={{ width: contentW, height: contentH }}>
              {dayMounted && (
                <Picture
                  asset={map.day}
                  sizes={`${Math.round(contentW)}px`}
                  loading="eager"
                  className="absolute inset-0 size-full select-none"
                />
              )}
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
