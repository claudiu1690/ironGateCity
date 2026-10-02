import type { AssetView } from '@irongate/rules';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { cx } from '../format';
import { backdropUrl } from '../tiles';
import type { TilePyramid } from '../tiles';
import { Picture } from './Picture';
import { TileLayer } from './TileLayer';

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
   * opens the location panel then, so the zoom plays first (review 2 #9). `fillsMap` is false when
   * the art stops short of the map's edge under the panel (a pin near the art's bottom under a phone's
   * sheet, `zoomView`): the panel must then cover all of `cover`, not less, or the gap shows.
   */
  onArrive?: (id: string, info: { fillsMap: boolean }) => void;
  /**
   * Maps v3 (ADR 0024): the art as Deep Zoom tile pyramids, drawn instead of `map`'s stills. `map`
   * still gives the alt text, and its stills take over for the rest of the mount if the tiles turn
   * out to be unavailable (an underlay tile fails: design §5.2). Null or absent: the stills.
   */
  tiles?: { day: TilePyramid; night: TilePyramid } | null;
  /**
   * Maps v3: the part of the picture this view is about (a quarter's frame, fractions of the art).
   * Scale 1 is "the frame covers the box", and a zoomed drag stays within the frame grown by
   * FRAME_PAN_MARGIN. Outside the frame is the rest of the picture, real art. Default: all of it.
   */
  frame?: MapRect;
}

/** The whole picture, as a frame. */
const WHOLE: MapRect = { x0: 0, y0: 0, x1: 1, y1: 1 };
/** Maps v3 §2: while zoomed, the frame grown by this share of its size on each side covers the box. */
export const FRAME_PAN_MARGIN = 0.25;
/** Maps v3 §6: day and night differ by up to half a building, so they cross-fade quickly. */
export const NIGHT_FADE_MS = 250;
/** With tiles, the layer that faded out is unmounted this long after the flip (one set of tiles). */
const HIDDEN_TILES_UNMOUNT_MS = 300;

/**
 * Maps v3 §2: the layer's size at scale 1, the whole picture laid out so that `frame` covers the box.
 * With the default frame this is today's "the picture covers the box".
 */
export function contentFor(
  box: { w: number; h: number },
  aspect: number,
  frame: MapRect = WHOLE,
): { w: number; h: number } {
  const w = Math.max(box.w / (frame.x1 - frame.x0), (box.h * aspect) / (frame.y1 - frame.y0));
  return { w, h: w / aspect };
}

/** Review 2 #9: the zoom into a pin and back, with easing (no overshoot: both y control points in [0, 1]). */
export const ZOOM_MS = 500;
const ZOOM_EASE = 'cubic-bezier(0.33, 0, 0.2, 1)';
/**
 * A pin's zoom (review 2 follow-up: closer than the first 2 × / 1.25 ×): 2.5 × the fitted view, at
 * least 1.6 × the covering size, at most 3 ×, and never past the art's native resolution.
 */
const ZOOM_FACTOR = 2.5;
const MIN_ZOOM = 1.6;
const MAX_SCALE = 3;
/** A pointer that moves this far (px) while zoomed pans the map; less is a tap. */
const DRAG_SLOP = 6;
/** Room around a pin: half its 44 px target plus a margin, so no pin touches an edge. */
const PIN_PAD = 30;
/**
 * An overlay at least this share of the map wide is a band across it (the phone plate, the phone
 * orders panel): the pins go between the bands. A narrower one (the desktop plate in its corner, the
 * tab dock) is a block the pins must stay out of (slice-2 QA M2).
 *
 * Maps v3: 0.7, so the 420 px corner plate from 640 px up is always a block (at 640 px it is 66 % of
 * the map and was a band, which left the square art's pins about 250 px of height under a tall plate
 * and pressed them onto each other); beside and below it there is room for them.
 */
const OVERLAY_BAND_WIDTH_SHARE = 0.7;
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
 * every block wins.
 *
 * Review 2 follow-up (no black past the art): scale 1 is "cover", so the first view covers the box
 * whenever some position at that scale keeps every pin clear (centred if it can, shifted otherwise).
 * Only where no position can (the pins are wider or taller than the covered view allows) does it
 * zoom out below 1, the least that shows them all: a letterbox, and CityMap fills the margin with a
 * blurred, darkened copy of the art (`data-fit="letterbox"`), never plain black.
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
  /**
   * The largest scale that does not upscale the largest file served (`nativeScale`); never below 1,
   * the scale that covers the box. Without it, MAX_SCALE.
   */
  maxScale?: number;
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
 * The scale at which the map shows the art at its native resolution: one pixel of the largest file
 * served (the largest of `widths`, at most the intrinsic `width`) per CSS pixel. Never below 1:
 * covering the box comes first (a box wider than the art upscales it rather than show past its edge).
 */
export function nativeScale(asset: Pick<AssetView, 'width' | 'widths'>, contentW: number): number {
  const served = asset.widths.length > 0 ? Math.min(asset.width, Math.max(...asset.widths)) : asset.width;
  return contentW > 0 ? Math.max(1, served / contentW) : 1;
}

/** A pin's zoom, before an edge pin needs more: ZOOM_FACTOR × the fitted view, within its bounds. */
export function zoomScale(fitted: MapView, maxScale = MAX_SCALE): number {
  const top = Math.max(1, Math.min(MAX_SCALE, maxScale));
  return clamp(Math.max(fitted.scale * ZOOM_FACTOR, MIN_ZOOM), 1, top);
}

const overlap = (a: readonly [number, number], b: readonly [number, number]): [number, number] | null =>
  Math.max(a[0], b[0]) <= Math.min(a[1], b[1]) ? [Math.max(a[0], b[0]), Math.min(a[1], b[1])] : null;

/**
 * One axis of a zoomed view: where the image starts (`len`: the box, [a0, a1]: its clear part,
 * `size`: the image at this scale, `p`: the pin's offset in it). The pin goes in the middle of the
 * clear part, moved off-centre as far as it takes for the image to cover the whole box. If no place
 * does both (a pin near the bottom of the art under a phone's tall sheet), the pin stays clear and the
 * image stops short of the box's edge by the least that takes, so only under the panel: the clear
 * part is always covered. (For a pin within PIN_PAD of the art's edge even that cannot be done; the
 * image then covers the clear part and the pin sits as near the clear part as it can.)
 */
function placeAxis(len: number, a0: number, a1: number, size: number, p: number): number {
  const ideal = (a0 + a1) / 2 - p;
  const fillsBox = [len - size, 0] as const;
  const pinClear = [a0 + PIN_PAD - p, a1 - PIN_PAD - p] as const;
  const both = overlap(fillsBox, pinClear);
  if (both) return clamp(ideal, both[0], both[1]);
  const fillsClear = [a1 - size, a0] as const;
  const nearest = clamp(ideal, fillsBox[0], fillsBox[1]);
  const ok = overlap(fillsClear, pinClear);
  if (ok) return clamp(nearest, ok[0], ok[1]);
  return clamp(clamp(nearest, pinClear[0], pinClear[1]), fillsClear[0], fillsClear[1]);
}

/** The least scale at which the image can cover the box with the pin clear, on one axis. */
function scaleToFill(len: number, a0: number, a1: number, size1: number, f: number): number {
  const lo = f > 0 ? (a0 + PIN_PAD) / (f * size1) : Infinity;
  const hi = f < 1 ? (len - a1 + PIN_PAD) / ((1 - f) * size1) : Infinity;
  return Math.max(lo, hi);
}

/**
 * The view zoomed into one pin (review 2 #9; review 2 follow-up: no ground past the art's edge):
 * `zoomScale` (ZOOM_FACTOR × the fitted view, at least MIN_ZOOM × the covering size, at most
 * MAX_SCALE, and never past the art's native resolution, `maxScale`), the pin in the middle of the
 * part of the map the panel leaves clear. The image covers the box: near an edge the pin sits
 * off-centre instead, and if it would then be under the panel the zoom goes closer (up to the native
 * cap) until it is clear. Only where even that cannot do it (a pin near the bottom of the art under a
 * phone's sheet) does the image stop short of the box's edge, by the least that keeps the pin clear,
 * and only under the panel (`placeAxis`).
 */
export function zoomView({ box, content, fitted, pin, cover, maxScale = MAX_SCALE }: ZoomInput): MapView {
  const top = Math.max(1, Math.min(MAX_SCALE, maxScale));
  const a = clearArea(box, cover);
  const need = Math.max(
    scaleToFill(box.w, a.x0, a.x1, content.w, pin.x),
    scaleToFill(box.h, a.y0, a.y1, content.h, pin.y),
  );
  const z = zoomScale(fitted, maxScale);
  const scale = need <= top ? Math.max(z, need) : z;
  return {
    scale,
    x: placeAxis(box.w, a.x0, a.x1, content.w * scale, pin.x * content.w * scale),
    y: placeAxis(box.h, a.y0, a.y1, content.h * scale, pin.y * content.h * scale),
  };
}

/** Whether the image covers the whole box at this view (no ground past its edge shows). */
export function coversBox(
  box: { w: number; h: number },
  content: { w: number; h: number },
  v: MapView,
): boolean {
  const e = 0.5; // rounding
  return (
    v.x <= e && v.y <= e && v.x + content.w * v.scale >= box.w - e && v.y + content.h * v.scale >= box.h - e
  );
}

/**
 * How far the zoomed map pans (review 2 #8): the image covers the box, widened only to take in the
 * zoomed view itself when it stops short of an edge under a phone's sheet (`zoomView`), so the part
 * the sheet leaves clear stays covered.
 *
 * Maps v3 §2 (no free pan on a picture much larger than the screen): with a `frame`, it is the frame
 * grown by FRAME_PAN_MARGIN of its width and height on each side (clamped to the picture) that must
 * cover the box, so a drag stays near the quarter; the zoomed view itself is always allowed.
 */
export function panLimits(
  box: { w: number; h: number },
  content: { w: number; h: number },
  zoomed: MapView,
  frame: MapRect = WHOLE,
): { x: [number, number]; y: [number, number] } {
  const axis = (len: number, size: number, f0: number, f1: number, at: number): [number, number] => {
    const m = FRAME_PAN_MARGIN * (f1 - f0);
    const g0 = Math.max(0, f0 - m);
    const g1 = Math.min(1, f1 + m);
    let lo = len - g1 * size;
    let hi = -g0 * size;
    // The grown frame narrower than the box (not reached at a zoom's scale): the picture's limits.
    if (lo > hi) [lo, hi] = [Math.min(len - size, 0), Math.max(len - size, 0)];
    return [Math.min(lo, at), Math.max(hi, at)];
  };
  return {
    x: axis(box.w, content.w * zoomed.scale, frame.x0, frame.x1, zoomed.x),
    y: axis(box.h, content.h * zoomed.scale, frame.y0, frame.y1, zoomed.y),
  };
}

/** Maps v3: the least distance between two pins' centres on screen, so their 44 px targets never overlap. */
export const PIN_GAP = 46;

/**
 * Maps v3 (a deviation from the design, see maps-v3-integration.md §9): on a small screen the fitted
 * view of a dense quarter can bring two pins closer than their 44 px targets (Duskwall's Customs
 * Market and Beacon House, 0.1 of the picture apart, while its pins span 0.73 of its height), so one
 * covers the other and cannot be tapped. Where that happens the pins are spread apart on screen by
 * the least that clears them (a few relaxation passes), kept inside `area`. Pins already clear (every
 * zoomed view, every larger screen) do not move. Returns the offsets, in px, in input order.
 */
export function spreadPins(
  points: ReadonlyArray<{ x: number; y: number }>,
  area: MapRect,
  gap = PIN_GAP,
): Array<{ x: number; y: number }> {
  const p = points.map((q) => ({ x: q.x, y: q.y }));
  const pad = 22;
  const keep = (q: { x: number; y: number }) => {
    if (area.x1 - area.x0 > 2 * pad) q.x = clamp(q.x, area.x0 + pad, area.x1 - pad);
    if (area.y1 - area.y0 > 2 * pad) q.y = clamp(q.y, area.y0 + pad, area.y1 - pad);
  };
  // Only pins on screen take part (a zoomed view leaves others off screen, where they stay).
  const shown = points.map((q) => q.x >= area.x0 && q.x <= area.x1 && q.y >= area.y0 && q.y <= area.y1);
  for (let pass = 0; pass < 24; pass++) {
    let moved = false;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++) {
        if (!shown[i] || !shown[j]) continue;
        const a = p[i]!;
        const b = p[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= gap - 0.5) continue;
        if (d < 1e-6) [dx, dy] = [0, 1];
        const k = (gap - d) / 2 / Math.max(d, 1e-6);
        const ux = d < 1e-6 ? 0 : dx * k;
        const uy = d < 1e-6 ? (gap - d) / 2 : dy * k;
        a.x -= ux;
        a.y -= uy;
        b.x += ux;
        b.y += uy;
        keep(a);
        keep(b);
        moved = true;
      }
    if (!moved) break;
  }
  return p.map((q, i) => ({ x: q.x - points[i]!.x, y: q.y - points[i]!.y }));
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
  tiles,
  frame = WHOLE,
}: CityMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  // Maps v3 §5.2: once an underlay tile fails, the stills draw the art for the rest of the mount.
  const [tilesFailed, setTilesFailed] = useState(false);
  const pyramids = tiles && !tilesFailed ? tiles : null;
  const [size, setSize] = useState<{ w: number; h: number; insets: MapInsets } | null>(null);
  // Slice 2 (first-session art budget, ADR 0015): the night art is fetched only once it is night,
  // and the day art only once it is day (a first landing at night loads one map, not two).
  const [nightMounted, setNightMounted] = useState(isNight);
  const [dayMounted, setDayMounted] = useState(!isNight);
  useEffect(() => {
    if (isNight) setNightMounted(true);
    else setDayMounted(true);
  }, [isNight]);
  // Maps v3 §6: with tiles, the layer that faded out goes once the fade is over, so a later zoom
  // fetches one set of tiles, not two. (The stills stay: they are one file each, already loaded.)
  const tiled = !!pyramids;
  useEffect(() => {
    if (!tiled) return;
    const t = setTimeout(
      () => (isNight ? setDayMounted(false) : setNightMounted(false)),
      HIDDEN_TILES_UNMOUNT_MS,
    );
    return () => clearTimeout(t);
  }, [isNight, tiled]);

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

  // Any size and shape of art: only its aspect and the largest file served matter (the pins are
  // fractions of it). With tiles they come from the pyramid (design §5.2: whichever source is active).
  const aspect = pyramids ? pyramids.day.width / pyramids.day.height : map.day.width / map.day.height;
  const w = size?.w ?? 0;
  const h = size?.h ?? 0;
  const insets = size?.insets;
  // Scale 1: the frame covers the box (maps v3 §2); the fitted view may zoom out below it to show
  // every pin. Outside the frame is the rest of the picture.
  const { w: contentW, h: contentH } = contentFor({ w, h }, aspect, frame);
  // The zoom never upscales the largest file served (the 2048 px still, or the full-size tiles).
  const maxScale = pyramids
    ? nativeScale({ width: pyramids.day.width, widths: [pyramids.day.width] }, contentW)
    : nativeScale(map.day, contentW);
  const frameKey = `${frame.x0},${frame.y0},${frame.x1},${frame.y1}`;
  // The files are picked for the closest the map zooms, so a zoomed-in map is never upscaled; the
  // blurred margin asks for the same file, so it costs no second download.
  const sizes = `${Math.round(contentW * Math.min(MAX_SCALE, maxScale))}px`;
  const pinsKey = locations.map((l) => `${l.id}:${l.map.x},${l.map.y}`).join(';');
  const coverKey = `${cover?.top ?? 0},${cover?.right ?? 0},${cover?.bottom ?? 0},${cover?.left ?? 0}`;
  const selected = locations.find((l) => l.id === selectedId) ?? null;

  /** Where the map should be: the fitted view, or zoomed into the selected pin. */
  const target = useMemo((): { fitted: MapView; view: MapView } | null => {
    if (w === 0 || h === 0 || !insets) return null;
    const box = { w, h };
    const content = { w: contentW, h: contentH };
    const fitted = fitPinsView({ box, content, pins: locations.map((l) => l.map), insets });
    const view = selected ? zoomView({ box, content, fitted, pin: selected.map, cover, maxScale }) : fitted;
    return { fitted, view };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, contentW, contentH, maxScale, insets, pinsKey, coverKey, selected?.id, frameKey]);
  /** The first view covers the box, or is letterboxed onto the blurred copy (reported for tests). */
  const fit = target
    ? coversBox({ w, h }, { w: contentW, h: contentH }, target.fitted)
      ? 'cover'
      : 'letterbox'
    : '';

  /** The view shown, and whether reaching it is animated. */
  const [shown, setShown] = useState<{ view: MapView; animate: boolean } | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;
  /** The selection the view was last moved for (undefined: not placed yet). */
  const placedFor = useRef<string | null | undefined>(undefined);
  /** The view was dragged away from the target (the tiles then follow the view, not the target). */
  const panned = useRef(false);
  const arriveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const raf = useRef(0);
  useEffect(
    () => () => {
      clearTimeout(arriveTimer.current);
      cancelAnimationFrame(raf.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (!target) return;
    const sel = selected?.id ?? null;
    const first = placedFor.current === undefined;
    const changed = !first && placedFor.current !== sel;
    placedFor.current = sel;
    panned.current = false;
    if (!first && !changed) {
      // A resize, an overlay or the panel's size: follow it at once (and stop any drag's offset).
      setShown({ view: target.view, animate: false });
      return;
    }
    clearTimeout(arriveTimer.current);
    cancelAnimationFrame(raf.current);
    const still = prefersReducedMotion();
    const arrive = (delay: number) => {
      if (!sel) return;
      const fillsMap = coversBox({ w, h }, { w: contentW, h: contentH }, target.view);
      arriveTimer.current = setTimeout(() => onArriveRef.current?.(sel, { fillsMap }), delay);
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
      raf.current = requestAnimationFrame(() => {
        raf.current = requestAnimationFrame(() => {
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
  // The tiles follow where the map is going (the target), so a zoom fetches its destination from its
  // first frame; only a drag, which moves the view away from the target, makes them follow the view.
  const tileView = panned.current ? view : (target?.view ?? view);
  const onTilesUnavailable = () => setTilesFailed(true);
  // Pins too close to tap apart on this screen are spread apart (see spreadPins), between the bands.
  const spread = view
    ? spreadPins(
        locations.map((l) => ({
          x: view.x + l.map.x * contentW * view.scale,
          y: view.y + l.map.y * contentH * view.scale,
        })),
        { x0: 0, x1: w, y0: insets?.top ?? 0, y1: h - (insets?.bottom ?? 0) },
      )
    : [];
  // Maps v3 §6: a quick cross-fade (day and night differ by up to half a building); none with
  // reduced motion.
  const fade = prefersReducedMotion() ? 'none' : `opacity ${NIGHT_FADE_MS}ms ease`;

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
      panned.current = true;
      boxRef.current?.setPointerCapture?.(e.pointerId);
    }
    const lim = panLimits({ w, h }, { w: contentW, h: contentH }, target.view, frame);
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
    const lim = panLimits({ w, h }, { w: contentW, h: contentH }, target.view, frame);
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
      data-fit={fit}
      data-art={pyramids ? 'tiles' : 'still'}
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
      {/* Wherever the art does not reach (a letterboxed first view, the zoom on its way in, a pin
          near the art's bottom edge under a phone's sheet): a blurred, darkened copy of it over an
          ink-and-petrol wash, never plain black. Static, so it costs one paint. */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--color-petrol) 40%, var(--color-ink)) 0%, var(--color-ink) 75%)',
        }}
        aria-hidden="true"
        data-testid="map-backdrop"
      >
        {size && w > 0 && h > 0 && (isNight ? nightMounted : dayMounted) && pyramids && (
          // With tiles: the underlay's one small tile, the same file the tile layer draws first.
          <img
            src={backdropUrl(isNight ? pyramids.night : pyramids.day)}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full scale-110 object-cover blur-xl brightness-[0.45] saturate-[0.7] select-none"
          />
        )}
        {size && w > 0 && h > 0 && (isNight ? nightMounted : dayMounted) && !pyramids && (
          <Picture
            asset={isNight ? map.night : map.day}
            sizes={sizes}
            loading="eager"
            decorative
            className="absolute inset-0 size-full scale-110 object-cover blur-xl brightness-[0.45] saturate-[0.7] select-none"
          />
        )}
      </div>
      {size && w > 0 && h > 0 && (
        <>
          <div className="absolute top-0 left-0" style={layer} data-testid="map-layer">
            {dayMounted && pyramids && tileView && (
              <div className="absolute inset-0" role="img" aria-label={map.day.alt} aria-hidden={isNight}>
                <TileLayer
                  pyramid={pyramids.day}
                  content={{ w: contentW, h: contentH }}
                  box={{ w, h }}
                  view={tileView}
                  onUnavailable={onTilesUnavailable}
                />
              </div>
            )}
            {dayMounted && !pyramids && (
              <Picture
                asset={map.day}
                sizes={sizes}
                loading="eager"
                className="absolute inset-0 size-full select-none"
              />
            )}
            <div
              className="absolute inset-0"
              style={{ opacity: isNight ? 1 : 0, transition: fade }}
              aria-hidden={!isNight}
              data-testid="map-night"
            >
              {nightMounted && pyramids && tileView && (
                <div
                  className="absolute inset-0"
                  role="img"
                  aria-label={map.night.alt}
                  aria-hidden={!isNight}
                >
                  <TileLayer
                    pyramid={pyramids.night}
                    content={{ w: contentW, h: contentH }}
                    box={{ w, h }}
                    view={tileView}
                    onUnavailable={onTilesUnavailable}
                  />
                </div>
              )}
              {nightMounted && !pyramids && (
                <Picture
                  asset={map.night}
                  sizes={sizes}
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
              locations.map((l, i) => {
                const on = l.id === selectedId;
                const px = view.x + l.map.x * contentW * view.scale + (spread[i]?.x ?? 0);
                const py = view.y + l.map.y * contentH * view.scale + (spread[i]?.y ?? 0);
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
