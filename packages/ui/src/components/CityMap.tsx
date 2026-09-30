import type { AssetView } from '@irongate/rules';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
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

/** Pixels of the map box hidden by the open location panel, on each side. */
export interface MapCover {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface CityMapProps {
  map: { day: AssetView; night: AssetView };
  /** Night art 20:00–06:00 UTC (GDD §2.2); crossfades when it flips. */
  isNight: boolean;
  locations: MapHotspot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Overlays over the map (the city plate, the orders panel). Mark each with `data-map-overlay`
   * (`"top"` or `"bottom"` for a band across the map) and the fitted view keeps every pin clear of
   * it. Any other element marked `data-map-overlay` that lies over the map (the desktop tab dock)
   * is kept clear too.
   */
  children?: ReactNode;
  className?: string;
  /**
   * The part of the map the open location panel hides (review 2): the zoom puts the selected pin in
   * the middle of the rest, e.g. above a phone's bottom sheet, right of a landscape side panel.
   */
  cover?: MapCover;
  /**
   * Called once the zoom into the selected pin has landed (at once with reduced motion): the page
   * opens the location panel then, so the zoom plays first (review 2 #9).
   */
  onArrive?: (id: string) => void;
}

/** Review 2 #9: the zoom into a pin and back, with easing. */
export const ZOOM_MS = 500;
const ZOOM_EASE = 'cubic-bezier(0.33, 0, 0.2, 1)';
/** A pin's zoom: twice the fitted view, at least 1.25 × the covering size, at most 2.5 ×. */
const ZOOM_FACTOR = 2;
const MIN_ZOOM = 1.25;
const MAX_SCALE = 2.5;
/** A pointer that moves this far (px) while zoomed pans the map; less is a tap. */
const DRAG_SLOP = 6;
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

/** The usual pan limits: the image covers the box (or, smaller than it, stays inside it). */
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

type ZoomInput = {
  box: { w: number; h: number };
  content: { w: number; h: number };
  /** The fitted view: the zoom is relative to it. */
  fitted: MapView;
  pin: { x: number; y: number };
  cover?: MapCover;
};

/** The clear part of the box: all of it but what the panel covers (the whole box if that is nothing). */
function clearArea(box: { w: number; h: number }, cover: MapCover = {}): MapRect {
  const r = {
    x0: cover.left ?? 0,
    x1: box.w - (cover.right ?? 0),
    y0: cover.top ?? 0,
    y1: box.h - (cover.bottom ?? 0),
  };
  return r.x1 - r.x0 < 2 * PIN_PAD || r.y1 - r.y0 < 2 * PIN_PAD ? { x0: 0, x1: box.w, y0: 0, y1: box.h } : r;
}

/**
 * The view zoomed into one pin (review 2 #9): twice the fitted scale (1.25–2.5 × the covering size),
 * the pin in the middle of the part of the map the panel leaves clear. Inside the pan limits when
 * that still keeps the pin in the clear part; past them otherwise (a pin near the map's edge under a
 * phone's sheet), with dark ground beside the image rather than a pin hidden by the sheet.
 */
export function zoomView({ box, content, fitted, pin, cover }: ZoomInput): MapView {
  const scale = clamp(Math.max(fitted.scale * ZOOM_FACTOR, MIN_ZOOM), fitted.scale, MAX_SCALE);
  const a = clearArea(box, cover);
  const ideal = {
    scale,
    x: (a.x0 + a.x1) / 2 - pin.x * content.w * scale,
    y: (a.y0 + a.y1) / 2 - pin.y * content.h * scale,
  };
  const inLimits = { scale, ...clampPosition(box, content, scale, ideal.x, ideal.y) };
  const px = inLimits.x + pin.x * content.w * scale;
  const py = inLimits.y + pin.y * content.h * scale;
  const clear = px >= a.x0 + PIN_PAD && px <= a.x1 - PIN_PAD && py >= a.y0 + PIN_PAD && py <= a.y1 - PIN_PAD;
  return clear ? inLimits : ideal;
}

/**
 * How far the zoomed map pans (review 2 #8): the usual limits (the image covers the box), widened
 * to take in the zoomed view itself when it lies past them.
 */
export function panLimits(
  box: { w: number; h: number },
  content: { w: number; h: number },
  zoomed: MapView,
): { x: [number, number]; y: [number, number] } {
  const dx = box.w - content.w * zoomed.scale;
  const dy = box.h - content.h * zoomed.scale;
  return {
    x: [Math.min(dx, 0, zoomed.x), Math.max(dx, 0, zoomed.x)],
    y: [Math.min(dy, 0, zoomed.y), Math.max(dy, 0, zoomed.y)],
  };
}

const sameView = (a: MapView, b: MapView) =>
  Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.scale - b.scale) < 1e-4;

/**
 * The city's detailed map (mockups City, MobileCity) with numbered hotspots at their map fractions.
 *
 * Review 2 #8, #9: the map is fixed. At rest it shows the fitted view, every pin on screen and clear
 * of the plate, the orders panel and the dock (QA M2), and it does not pan, zoom, pinch or
 * double-tap. Tapping a pin (or Enter on a focused one) zooms smoothly into it (ZOOM_MS, eased; at
 * once with reduced motion), then `onArrive` lets the page open the location panel. While zoomed in
 * the map pans with a drag, within limits; closing the location zooms back out to the fitted view.
 * The view is a CSS transform on one layer, and the pins sit in a layer above it that is never
 * scaled, so they keep their 44 px targets, move with the same transition, and are never replaced:
 * no remount on open, close or resize, so no tap or keypress is lost (c732d64). The fitted view
 * follows every resize. Name tags show on wide screens.
 */
export function CityMap({
  map,
  isNight,
  locations,
  selectedId,
  onSelect,
  children,
  className,
  cover,
  onArrive,
}: CityMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number; insets: MapInsets } | null>(null);
  // Slice 2 (first-session art budget, ADR 0015): the night art is fetched only once it is night,
  // and the day art only once it is day (a first landing at night loads one map, not two).
  const [nightMounted, setNightMounted] = useState(isNight);
  const [dayMounted, setDayMounted] = useState(!isNight);
  useEffect(() => {
    if (isNight) setNightMounted(true);
    else setDayMounted(true);
  }, [isNight]);

  // While a pin is selected the overlays are not re-measured: a phone hides its plate under the
  // zoom, and the fitted view (the zoom's base, and where closing returns) is the one with it.
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const measureRef = useRef<() => void>(() => undefined);
  // Closed: measure the overlays again (the orders on the plate may have changed meanwhile).
  useLayoutEffect(() => {
    if (!selectedId) measureRef.current();
  }, [selectedId]);
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
    // orders load): either changes the fitted view (QA M2).
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const o of el.querySelectorAll('[data-map-overlay]')) ro.observe(o);
    return () => ro.disconnect();
  }, []);

  const aspect = map.day.width / map.day.height;
  const w = size?.w ?? 0;
  const h = size?.h ?? 0;
  const insets = size?.insets;
  // Scale 1 covers the box; the fitted view may zoom out below it to show every pin.
  const contentW = Math.max(w, h * aspect);
  const contentH = contentW / aspect;
  const pinsKey = locations.map((l) => `${l.id}:${l.map.x},${l.map.y}`).join(';');
  const coverKey = `${cover?.top ?? 0},${cover?.right ?? 0},${cover?.bottom ?? 0},${cover?.left ?? 0}`;
  const selected = locations.find((l) => l.id === selectedId) ?? null;

  /** Where the map should be: the fitted view, or zoomed into the selected pin. */
  const target = useMemo((): { fitted: MapView; view: MapView } | null => {
    if (w === 0 || h === 0 || !insets) return null;
    const box = { w, h };
    const content = { w: contentW, h: contentH };
    const fitted = fitPinsView({ box, content, pins: locations.map((l) => l.map), insets });
    const view = selected ? zoomView({ box, content, fitted, pin: selected.map, cover }) : fitted;
    return { fitted, view };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, contentW, contentH, insets, pinsKey, coverKey, selected?.id]);

  /** The view shown, and whether reaching it is animated. */
  const [shown, setShown] = useState<{ view: MapView; animate: boolean } | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;
  /** The selection the view was last moved for (undefined: not placed yet). */
  const placedFor = useRef<string | null | undefined>(undefined);
  const arriveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const frame = useRef(0);
  useEffect(
    () => () => {
      clearTimeout(arriveTimer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (!target) return;
    const sel = selected?.id ?? null;
    const first = placedFor.current === undefined;
    const changed = !first && placedFor.current !== sel;
    placedFor.current = sel;
    if (!first && !changed) {
      // A resize, an overlay or the panel's size: follow it at once (and stop any drag's offset).
      setShown({ view: target.view, animate: false });
      return;
    }
    clearTimeout(arriveTimer.current);
    cancelAnimationFrame(frame.current);
    const still = prefersReducedMotion();
    const arrive = (delay: number) => {
      if (!sel) return;
      arriveTimer.current = setTimeout(() => onArriveRef.current?.(sel), delay);
    };
    if (first) {
      // The first landing (the welcome day opens slot A's pin): show the city fitted, then zoom in.
      setShown({ view: target.fitted, animate: false });
      if (!sel) return;
      if (still) {
        setShown({ view: target.view, animate: false });
        arrive(0);
        return;
      }
      // Two frames, so the fitted view is painted before the transition starts from it.
      frame.current = requestAnimationFrame(() => {
        frame.current = requestAnimationFrame(() => {
          setShown({ view: target.view, animate: true });
          arrive(ZOOM_MS);
        });
      });
      return;
    }
    const from = shownRef.current?.view;
    const moves = !from || !sameView(from, target.view);
    setShown({ view: target.view, animate: moves && !still });
    arrive(moves && !still ? ZOOM_MS : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const view = shown?.view ?? target?.fitted ?? null;
  // A zoom in flight (`data-moving`, for tests and for anyone waiting for the map to settle).
  const [moving, setMoving] = useState(false);
  const moveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(moveTimer.current);
    if (!shown?.animate) {
      setMoving(false);
      return;
    }
    setMoving(true);
    moveTimer.current = setTimeout(() => setMoving(false), ZOOM_MS + 50);
    return () => clearTimeout(moveTimer.current);
  }, [shown]);
  const transition = shown?.animate ? `transform ${ZOOM_MS}ms ${ZOOM_EASE}` : 'none';

  // Review 2 #8: no free pan or zoom at rest. The browser's own gestures over the map (pinch, double
  // tap, a trackpad's ctrl + wheel page zoom) are off everywhere on it; the wheel does nothing.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener('wheel', stop, { passive: false });
    el.addEventListener('gesturestart', stop);
    return () => {
      el.removeEventListener('wheel', stop);
      el.removeEventListener('gesturestart', stop);
    };
  }, []);

  // While zoomed in: a drag pans, within panLimits. A tap stays a tap (DRAG_SLOP), and the click
  // that ends a drag is swallowed, so a drag that starts on a pin does not select it.
  const drag = useRef<{ id: number; sx: number; sy: number; from: MapView; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const lastPointerDown = useRef(0);
  const onPointerDown = (e: ReactPointerEvent) => {
    lastPointerDown.current = Date.now();
    if (!selected || !view || e.button !== 0) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, from: view, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !target) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      d.moved = true;
      boxRef.current?.setPointerCapture?.(e.pointerId);
    }
    const lim = panLimits({ w, h }, { w: contentW, h: contentH }, target.view);
    setShown({
      view: {
        scale: d.from.scale,
        x: clamp(d.from.x + dx, lim.x[0], lim.x[1]),
        y: clamp(d.from.y + dy, lim.y[0], lim.y[1]),
      },
      animate: false,
    });
  };
  const endDrag = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    swallowClick.current = true;
    // If no click follows (the pointer left the pin), the next real tap still counts.
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);
  };

  // Keyboard focus on a pin outside the zoomed view pans it into view (WCAG 2.4.11). At rest every
  // pin is already on screen. Not a tap's focus: moving the pin under the finger would lose the tap.
  const onPinFocus = (l: MapHotspot) => {
    if (!selected || !view || !target || Date.now() - lastPointerDown.current < 1_000) return;
    const px = view.x + l.map.x * contentW * view.scale;
    const py = view.y + l.map.y * contentH * view.scale;
    const a = clearArea({ w, h }, cover);
    if (px >= a.x0 + 22 && px <= a.x1 - 22 && py >= a.y0 + 22 && py <= a.y1 - 22) return;
    const lim = panLimits({ w, h }, { w: contentW, h: contentH }, target.view);
    setShown({
      view: {
        scale: view.scale,
        x: clamp((a.x0 + a.x1) / 2 - l.map.x * contentW * view.scale, lim.x[0], lim.x[1]),
        y: clamp((a.y0 + a.y1) / 2 - l.map.y * contentH * view.scale, lim.y[0], lim.y[1]),
      },
      animate: false,
    });
  };

  // The browser also scrolls the clipped wrappers to reveal a focused element, which would shift the
  // whole map under its transform; the map moves by transform only, so undo any such scroll.
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

  const layer: CSSProperties = view
    ? {
        width: contentW,
        height: contentH,
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        transformOrigin: '0 0',
        transition,
        willChange: 'transform',
      }
    : { visibility: 'hidden' };

  return (
    <div
      ref={boxRef}
      className={cx(
        'relative touch-none overflow-hidden bg-ink select-none',
        selected && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      data-testid="city-map"
      data-zoomed={selected ? 'true' : 'false'}
      data-moving={moving ? 'true' : 'false'}
      data-view={view ? `${view.x.toFixed(1)},${view.y.toFixed(1)},${view.scale.toFixed(4)}` : ''}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.stopPropagation();
        e.preventDefault();
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      {size && w > 0 && h > 0 && (
        <>
          <div className="absolute top-0 left-0" style={layer} data-testid="map-layer">
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
          </div>
          {/* The pins: never scaled, each moved with the same transition as the map under it (a
              pin's place is linear in the map's translate and scale, so it tracks it exactly). */}
          <div className="pointer-events-none absolute inset-0">
            {view &&
              locations.map((l) => {
                const on = l.id === selectedId;
                const px = view.x + l.map.x * contentW * view.scale;
                const py = view.y + l.map.y * contentH * view.scale;
                return (
                  <div
                    key={l.id}
                    className="absolute top-0 left-0 size-0"
                    style={{ transform: `translate(${px}px, ${py}px)`, transition }}
                    data-map-x={l.map.x}
                    data-map-y={l.map.y}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(l.id)}
                      onFocus={() => onPinFocus(l)}
                      aria-pressed={on}
                      aria-label={`${l.n}. ${l.name}`}
                      data-testid="hotspot"
                      className="hotspot pointer-events-auto absolute top-0 left-0 flex h-11 min-w-11 -translate-x-[22px] -translate-y-[22px] cursor-pointer items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                    >
                      <span
                        className={cx(
                          'hotspot mx-1.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-label text-[14px] font-semibold',
                          on
                            ? 'border-ink bg-paper text-ink shadow-[0_0_0_2px_var(--color-paper),0_0_0_8px_rgb(239_230_210/0.35)]'
                            : 'border-paper bg-ink text-paper shadow-[0_0_0_2px_var(--color-ink),0_3px_8px_rgb(0_0_0/0.5)]',
                        )}
                      >
                        {l.n}
                      </span>
                      <span
                        className={cx(
                          'hotspot label-caps -ml-2 hidden border border-l-0 py-1 pr-2 pl-2.5 text-[11px] whitespace-nowrap lg:inline',
                          on ? 'border-ink bg-paper text-ink' : 'border-paper bg-ink text-paper',
                        )}
                      >
                        {l.name}
                      </span>
                    </button>
                  </div>
                );
              })}
          </div>
        </>
      )}
      {children}
    </div>
  );
}
