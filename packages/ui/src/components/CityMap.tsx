import type { AssetView } from '@irongate/rules';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { cx } from '../format';
import { copy } from '@irongate/content/copy';
import { CLOUDS } from '../clouds';
import type { CloudConfig } from '../clouds';
import { TILE_MAX_DPR, backdropUrl } from '../tiles';
import type { TilePyramid } from '../tiles';
import { CloudLayer } from './CloudLayer';
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
  /**
   * Map atmosphere (`clouds.ts`): clouds by day and fog by night drift over the art, under the pins.
   * `true` for the standard look (`CLOUDS`), a config to tune it (the dev viewer); off by default.
   * The city's content switches it on (`City.clouds`, tried on Coalport).
   */
  clouds?: boolean | CloudConfig;
  /**
   * Review 3: where the player's own at-rest view (dragged, zoomed) is kept for the session, e.g. the
   * city's id; it is restored when the map mounts again. Absent: kept for this mount only.
   */
  memoryKey?: string;
  /**
   * Review 3: the + / − zoom buttons, placed and shown by these classes (they set the display, e.g.
   * `flex` or `hidden sm:pointer-fine:flex`; absent: none). They are a block the first view keeps
   * the pins clear of (`data-map-overlay`).
   */
  zoomButtons?: string;
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

/**
 * Review 2 #9: the zoom into a pin and back, with easing (no overshoot: both y control points in
 * [0, 1]). Review 3 (GDD §14.13): opening a place is one movement of 250–350 ms, the zoom, the dim
 * and the sheet on this one curve; the sheet's keyframes (`tokens.css`, `--place-ms`,
 * `--place-ease`) use the same numbers.
 */
export const ZOOM_MS = 300;
export const ZOOM_EASE = 'cubic-bezier(0.33, 0, 0.2, 1)';
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
  /**
   * Review 3: how deep the bands that run edge to edge from the map's top (and bottom) edge are (a
   * phone's plate and orders panel). They are opaque, so the art may stop short of the box under them:
   * at rest the art covers the rest of the box, which lets a pin near the art's edge come out from
   * under the plate. 0 or absent: the art covers the whole box.
   */
  hideTop?: number;
  hideBottom?: number;
}

export interface MapView {
  scale: number;
  x: number;
  y: number;
}

/**
 * Where the image may sit at this scale (its top-left corner): covering the box, less what the
 * edge-to-edge bands hide (review 3), or inside it if it is smaller.
 */
function picLimits(
  box: { w: number; h: number },
  content: { w: number; h: number },
  scale: number,
  insets?: MapInsets,
): { x: [number, number]; y: [number, number] } {
  const ht = insets?.hideTop ?? 0;
  const hb = insets?.hideBottom ?? 0;
  const dx = box.w - content.w * scale;
  const dy = box.h - hb - content.h * scale;
  return { x: [Math.min(dx, 0), Math.max(dx, 0)], y: [Math.min(dy, ht), Math.max(dy, ht)] };
}

type FitInput = {
  box: { w: number; h: number };
  content: { w: number; h: number };
  pins: ReadonlyArray<{ x: number; y: number }>;
  insets: MapInsets;
};

/** Maps v3: the least distance between two pins' centres on screen, so their 44 px targets never overlap. */
export const PIN_GAP = 46;

/** The least distance between two pins at scale 1, in the layer's pixels (Infinity for one pin). */
function closestPins(
  pins: ReadonlyArray<{ x: number; y: number }>,
  content: { w: number; h: number },
): number {
  let d = Infinity;
  for (let a = 0; a < pins.length; a++)
    for (let b = a + 1; b < pins.length; b++)
      d = Math.min(
        d,
        Math.hypot((pins[a]!.x - pins[b]!.x) * content.w, (pins[a]!.y - pins[b]!.y) * content.h),
      );
  return d;
}

/** Review 3: the closest the at-rest view may zoom, to bring a pin out from under an overlay (below a pin's MIN_ZOOM). */
const REST_MAX_SCALE = 1.5;

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
 *
 * Review 3 (the user, 2 Oct 2026: no dark bands): CityMap passes `minScale`, the scale at which the
 * whole picture covers the box (less what a phone's opaque edge-to-edge bands hide), so the first
 * view never zooms out past the art's edge; nor so far that two pins' targets overlap (PIN_GAP). If
 * no view at or above that floor keeps every pin clear, the covered view with the most pins clear
 * wins (`mostPinsClear`); the others are a drag away (`restPanLimits`) or in the Places list.
 */
export function fitPinsView(i: FitInput & { minScale?: number; frame?: MapRect }): MapView {
  // Review 3: with a `minScale` (the covering scale), never so far out that two pins' 44 px targets
  // overlap (PIN_GAP between centres); the rest are a drag away. This replaces `spreadPins`, which
  // moved pins off their buildings on small phones.
  const gapScale = i.minScale !== undefined ? PIN_GAP / closestPins(i.pins, i.content) : 0;
  const floor = clamp(Math.max(i.minScale ?? MIN_FIT_SCALE, gapScale), MIN_FIT_SCALE, 1);
  const first = fitBetweenBands(i, undefined, floor);
  if (i.pins.length === 0 || (betweenBands(i, first) && clearOfBlocks(i, first))) return first;
  const { box, content, pins, insets } = i;
  const xs = pins.map((p) => p.x);
  const ys = pins.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (
    let scale = first.scale;
    scale >= floor - 1e-9;
    scale = scale > floor ? Math.max(floor, scale * FIT_STEP) : -1
  ) {
    const cw = content.w * scale;
    const ch = content.h * scale;
    const pic = picLimits(box, content, scale, insets);
    // Every pin inside the box (between the bands), and the image within its pan limits.
    const xr = [Math.max(PIN_PAD - x0 * cw, pic.x[0]), Math.min(box.w - PIN_PAD - x1 * cw, pic.x[1])];
    const yr = [
      Math.max(insets.top + PIN_PAD - y0 * ch, pic.y[0]),
      Math.min(box.h - insets.bottom - PIN_PAD - y1 * ch, pic.y[1]),
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
  // Review 3: no view at or above the floor keeps every pin clear (the pins spread wider than the
  // covered view): at the floor, the position that keeps the most pins clear, nearest the centred one.
  return i.minScale !== undefined ? mostPinsClear(i, floor, i.frame ?? WHOLE) : first;
}

/**
 * Review 3: the covered view with the most pins clear, when none keeps them all clear. Scales from
 * `floor` (the picture just covers the box) up to 1, positions within the picture's own limits. First
 * the scale at which a drag (restPanLimits) can bring the most pins clear (a pin under the desktop's
 * corner plate at the art's edge can only come out from under it a little closer in), then the view
 * with the most pins clear, then the lower scale (more of the quarter shows), then the position
 * nearest the centred one.
 */
function mostPinsClear(i: FitInput, floor: number, frame: MapRect): MapView {
  const { box, content } = i;
  let best: MapView | null = null;
  let bestN = -1;
  let bestR = -1;
  let bestD = 0;
  // Up to REST_MAX_SCALE: past 1 only when a pin can be brought clear no other way (a small tablet,
  // where the corner plate takes two thirds of the map's width), since reach comes first.
  for (
    let scale = floor;
    scale <= REST_MAX_SCALE + 1e-9;
    scale = scale < REST_MAX_SCALE ? Math.min(REST_MAX_SCALE, scale / FIT_STEP) : 9
  ) {
    const centred = fitBetweenBands(i, scale);
    const reach = reachablePins(i, centred, frame);
    const { x: xr, y: yr } = picLimits(box, content, scale, i.insets);
    for (let a = -1; a <= FIT_GRID; a++) {
      for (let b = -1; b <= FIT_GRID; b++) {
        // a = b = -1: the centred position itself.
        const x = a < 0 ? centred.x : xr[0] + ((xr[1] - xr[0]) * a) / FIT_GRID;
        const y = b < 0 ? centred.y : yr[0] + ((yr[1] - yr[0]) * b) / FIT_GRID;
        if (a < 0 !== b < 0) continue;
        const v = { scale, x, y };
        const n = clearPins(i, v);
        const d = (x - centred.x) ** 2 + (y - centred.y) ** 2;
        const better =
          reach > bestR ||
          (reach === bestR && n > bestN) ||
          (reach === bestR && n === bestN && scale === best!.scale && d < bestD);
        if (better) [best, bestN, bestR, bestD] = [v, n, reach, d];
      }
    }
  }
  return best!;
}

/** How many pins a drag at rest (within restPanLimits, at this view's scale) can bring clear. */
function reachablePins(i: FitInput, rest: MapView, frame: MapRect): number {
  const lim = restPanLimits(i.box, i.content, rest, frame, i.pins, i.insets);
  const N = 12;
  return i.pins.filter((p) => {
    const one = { ...i, pins: [p] };
    for (let a = 0; a <= N; a++)
      for (let b = 0; b <= N; b++) {
        const v = {
          scale: rest.scale,
          x: lim.x[0] + ((lim.x[1] - lim.x[0]) * a) / N,
          y: lim.y[0] + ((lim.y[1] - lim.y[0]) * b) / N,
        };
        if (betweenBands(one, v) && clearOfBlocks(one, v)) return true;
      }
    return false;
  }).length;
}

/** How many pins are inside the box between the bands and clear of every block at this view. */
function clearPins(i: FitInput, v: MapView): number {
  return i.pins.filter((p) => {
    const one = { ...i, pins: [p] };
    return betweenBands(one, v) && clearOfBlocks(one, v);
  }).length;
}

/**
 * The pins' box centred between the bands at the largest scale that fits it (or at `atScale`), never
 * below `floor` (review 3: the scale at which the picture covers the box).
 */
function fitBetweenBands(i: FitInput, atScale?: number, floor = MIN_FIT_SCALE): MapView {
  const { box, content, pins, insets } = i;
  if (pins.length === 0) return { scale: 1, ...clampPosition(box, content, 1, 0, 0, insets) };
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
      floor,
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
  return { scale, ...clampPosition(box, content, scale, x, y, insets) };
}

/** The usual pan limits: the image covers the box (or, smaller than it, stays inside it). */
function clampPosition(
  box: { w: number; h: number },
  content: { w: number; h: number },
  scale: number,
  x: number,
  y: number,
  insets?: MapInsets,
) {
  const lim = picLimits(box, content, scale, insets);
  return { x: clamp(x, lim.x[0], lim.x[1]), y: clamp(y, lim.y[0], lim.y[1]) };
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
    // Review 3: an opaque band (`data-map-opaque`) from edge to edge, touching the map's top or bottom
    // edge, hides the art under it, so at rest the art need only reach it.
    const edgeToEdge = 'mapOpaque' in el.dataset && x0 <= 1 && x1 >= Math.round(b.width) - 1;
    if (band && el.dataset.mapOverlay === 'top') {
      insets.top = Math.max(insets.top, y1);
      if (edgeToEdge && y0 <= 1) insets.hideTop = Math.max(insets.hideTop ?? 0, y1);
    } else if (band && el.dataset.mapOverlay === 'bottom') {
      insets.bottom = Math.max(insets.bottom, Math.round(b.height) - y0);
      if (edgeToEdge && y1 >= Math.round(b.height) - 1)
        insets.hideBottom = Math.max(insets.hideBottom ?? 0, Math.round(b.height) - y0);
    } else insets.blocks!.push({ x0, y0, x1, y1 });
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
  insets?: Pick<MapInsets, 'hideTop' | 'hideBottom'>,
): boolean {
  const e = 0.5; // rounding
  // Review 3: less what the opaque edge-to-edge bands hide (the art may stop short under them).
  const top = insets?.hideTop ?? 0;
  const bottom = box.h - (insets?.hideBottom ?? 0);
  return (
    v.x <= e &&
    v.y <= top + e &&
    v.x + content.w * v.scale >= box.w - e &&
    v.y + content.h * v.scale >= bottom - e
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

/** Review 3: at rest the map drags within the frame grown by this share of its size on each side. */
export const REST_PAN_MARGIN = 0.1;

/**
 * Review 3 (the user, 2 Oct 2026: no dark bands): how far the map drags at rest. The at-rest view
 * covers the box, so on a wide or tall screen some pins may sit off it or under an overlay; a drag
 * brings them in. Limits, on each axis: the quarter's frame grown by REST_PAN_MARGIN, widened so that
 * every pin can be brought into the clear part of the box (past the widest block, the desktop plate),
 * and always within the picture, so its edge never shows. The at-rest view itself is always allowed.
 * At the at-rest view's scale; review 3's free zoom asks at any scale (`freePanLimits`).
 */
export function restPanLimits(
  box: { w: number; h: number },
  content: { w: number; h: number },
  rest: MapView,
  frame: MapRect,
  pins: ReadonlyArray<{ x: number; y: number }>,
  insets: MapInsets,
): { x: [number, number]; y: [number, number] } {
  const blocks = insets.blocks ?? [];
  const axis = (
    pic: [number, number],
    len: number,
    size: number,
    f0: number,
    f1: number,
    ps: number[],
    a0: number,
    a1: number,
    ext: number,
    at: number,
  ): [number, number] => {
    const m = REST_PAN_MARGIN * (f1 - f0);
    const fa = len - Math.min(1, f1 + m) * size;
    const fb = -Math.max(0, f0 - m) * size;
    let lo = Math.min(fa, fb, at);
    let hi = Math.max(fa, fb, at);
    if (ps.length > 0) {
      lo = Math.min(lo, a1 - PIN_PAD - Math.max(...ps) * size - ext);
      hi = Math.max(hi, a0 + PIN_PAD - Math.min(...ps) * size + ext);
    }
    return [Math.min(at, clamp(lo, pic[0], pic[1])), Math.max(at, clamp(hi, pic[0], pic[1]))];
  };
  const picAt = picLimits(box, content, rest.scale, insets);
  const bw = Math.max(0, ...blocks.map((b) => b.x1 - b.x0));
  const bh = Math.max(0, ...blocks.map((b) => b.y1 - b.y0));
  return {
    x: axis(
      picAt.x,
      box.w,
      content.w * rest.scale,
      frame.x0,
      frame.x1,
      pins.map((p) => p.x),
      0,
      box.w,
      bw,
      rest.x,
    ),
    y: axis(
      picAt.y,
      box.h,
      content.h * rest.scale,
      frame.y0,
      frame.y1,
      pins.map((p) => p.y),
      insets.top,
      box.h - insets.bottom,
      bh,
      rest.y,
    ),
  };
}

const sameView = (a: MapView, b: MapView) =>
  Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.scale - b.scale) < 1e-4;

/**
 * Review 3 (GDD §14.13, answers §1): the player may zoom the map at rest between two limits a player
 * can see the reason for. **Out**: the covering scale, at which the whole picture still fills the map
 * (never a dark band, never the blurred backdrop), and never past the at-rest view. **In**: the
 * painting's finest detail at its real size, one pixel of the largest art served (the top tile level,
 * or the largest still) per device pixel with the DPR capped at TILE_MAX_DPR (never blurry); never
 * below the at-rest view, so the view the map opens on is always allowed.
 */
export function freeZoomLimits(i: {
  /** The at-rest (fitted) view's scale. */
  fitted: number;
  /** The scale at which the whole picture covers the map. */
  cover: number;
  /** The width of the largest art served, in its own pixels (8,640 for a tiled city). */
  artWidth: number;
  /** The layer's width at scale 1 (CityMap's `contentW`). */
  contentW: number;
  dpr: number;
}): { min: number; max: number } {
  const dpr = Math.min(TILE_MAX_DPR, i.dpr > 0 ? i.dpr : 1);
  const native = i.contentW > 0 ? i.artWidth / (i.contentW * dpr) : i.fitted;
  return { min: Math.min(i.cover, i.fitted), max: Math.max(i.fitted, native) };
}

/** The view at `scale` that keeps the picture's point under `at` (box pixels) where it is. */
export function zoomAt(view: MapView, scale: number, at: { x: number; y: number }): MapView {
  const k = scale / view.scale;
  return { scale, x: at.x - (at.x - view.x) * k, y: at.y - (at.y - view.y) * k };
}

/**
 * Review 3: how far the map drags at rest at any zoom: `restPanLimits` at that scale (the quarter's
 * frame grown by REST_PAN_MARGIN, widened so every pin can be brought clear, and always within the
 * picture, so its edge never shows). The at-rest view zoomed about the box's centre to that scale is
 * always allowed, so the limits move smoothly with the zoom and hold the view the map opens on.
 */
export function freePanLimits(
  box: { w: number; h: number },
  content: { w: number; h: number },
  fitted: MapView,
  scale: number,
  frame: MapRect,
  pins: ReadonlyArray<{ x: number; y: number }>,
  insets: MapInsets,
): { x: [number, number]; y: [number, number] } {
  const pic = picLimits(box, content, scale, insets);
  const z = zoomAt(fitted, scale, { x: box.w / 2, y: box.h / 2 });
  const anchor = { scale, x: clamp(z.x, pic.x[0], pic.x[1]), y: clamp(z.y, pic.y[0], pic.y[1]) };
  return restPanLimits(box, content, anchor, frame, pins, insets);
}

/** A view kept within limits (its scale unchanged). */
const within = (v: MapView, lim: { x: [number, number]; y: [number, number] }): MapView => ({
  scale: v.scale,
  x: clamp(v.x, lim.x[0], lim.x[1]),
  y: clamp(v.y, lim.y[0], lim.y[1]),
});

/**
 * Review 3: the player's at-rest view, kept for the session (`memoryKey`): the picture's point at the
 * map's centre (fractions) and the art's width on screen, for the map's size (`box`, "390x692"). It
 * survives the plate's orders loading and a return to the city; a new size of map (a turn of the
 * phone, a resized window) starts again from the view that fits it, as a drag at rest always did.
 */
export interface RestView {
  fx: number;
  fy: number;
  artW: number;
  box: string;
}

export function restFromView(
  v: MapView,
  box: { w: number; h: number },
  content: { w: number; h: number },
): RestView {
  return {
    fx: (box.w / 2 - v.x) / (content.w * v.scale),
    fy: (box.h / 2 - v.y) / (content.h * v.scale),
    artW: content.w * v.scale,
    box: `${box.w}x${box.h}`,
  };
}

export function viewFromRest(
  r: RestView,
  box: { w: number; h: number },
  content: { w: number; h: number },
  zoom: { min: number; max: number },
): MapView {
  const scale = clamp(r.artW / content.w, zoom.min, zoom.max);
  return { scale, x: box.w / 2 - r.fx * content.w * scale, y: box.h / 2 - r.fy * content.h * scale };
}

/** The session's at-rest views by `memoryKey` (also in sessionStorage, so a reload keeps them). */
const restMemory = new Map<string, RestView | null>();
const STORAGE_PREFIX = 'irongate.map.';

function recall(key: string | undefined): RestView | null {
  if (!key) return null;
  if (restMemory.has(key)) return restMemory.get(key) ?? null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    const r = raw ? (JSON.parse(raw) as RestView) : null;
    return r && [r.fx, r.fy, r.artW].every(Number.isFinite) && typeof r.box === 'string' ? r : null;
  } catch {
    return null;
  }
}

function remember(key: string | undefined, r: RestView | null) {
  if (!key) return;
  restMemory.set(key, r);
  try {
    if (r) window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(r));
    else window.sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Private mode or blocked storage: the view is kept for this mount and this page only.
  }
}

/** Review 3: a double tap within this long and this near the first is a zoom, not two taps. */
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 30;
/** Review 3: the double tap's and the + / − buttons' step (answers §1: twice the rest view's scale). */
export const FREE_ZOOM_STEP = 2;
/** How far one wheel notch (100 px of delta) zooms; a trackpad's pinch (ctrl + wheel) is finer. */
const WHEEL_RATE = 0.0015;
const PINCH_WHEEL_RATE = 0.01;
/** A wheel or a trackpad's gesture holds the layer as a compositor layer until it has been still this long. */
const GESTURE_SETTLE_MS = 200;
/** Not the map itself: a pin, a control, or an overlay (the plate, the orders): no double-tap zoom there. */
const isOverlay = (t: EventTarget | null) =>
  t instanceof Element && t.closest('[data-map-overlay], [data-map-control], button, a') !== null;
/** Over an overlay (the plate, its orders) the wheel scrolls as usual; over the map and its pins it zooms. */
const isPanel = (t: EventTarget | null) =>
  t instanceof Element && t.closest('[data-map-overlay], [data-map-control]') !== null;

/**
 * The city's detailed map (mockups City, MobileCity) with numbered hotspots at their map fractions.
 *
 * Review 2 #8, #9, review 3: at rest the map shows the fitted view, which covers the box (no dark
 * bands) with as many pins as it can clear of the plate, the orders panel and the dock (QA M2); it
 * drags within the quarter (`freePanLimits`) to bring the others in. Review 3 (the user, 2 Oct 2026):
 * the player may also zoom it, by a pinch or a double tap, the wheel or a trackpad, or the + / −
 * buttons (`zoomButtons`), between the covering scale and the art's finest detail (`freeZoomLimits`);
 * the view is kept for the session (`memoryKey`). Tapping a pin (or Enter on a focused one) zooms
 * smoothly into it (ZOOM_MS, eased; at once with reduced motion) and `onArrive` lets the page open the
 * location panel at the same moment, so the zoom, the dim and the sheet are one movement; closing
 * zooms back out to the player's own view. While zoomed in the map pans with a drag, within limits.
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
  clouds,
  memoryKey,
  zoomButtons,
}: CityMapProps) {
  const cloudConfig = clouds === true ? CLOUDS : clouds || null;
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
  /** The largest art served, in its own pixels: the free zoom's finest detail (review 3). */
  const artWidth = pyramids
    ? pyramids.day.width
    : map.day.widths.length > 0
      ? Math.min(map.day.width, Math.max(...map.day.widths))
      : map.day.width;
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const frameKey = `${frame.x0},${frame.y0},${frame.x1},${frame.y1}`;
  const pinsKey = locations.map((l) => `${l.id}:${l.map.x},${l.map.y}`).join(';');
  const coverKey = `${cover?.top ?? 0},${cover?.right ?? 0},${cover?.bottom ?? 0},${cover?.left ?? 0}`;
  const selected = locations.find((l) => l.id === selectedId) ?? null;

  // Review 3: the scale at which the whole picture covers the box. The at-rest view never zooms out
  // past it, so the art always fills the map (no blurred bands); 1 for the default frame.
  // (Less what a phone's opaque plate and orders panel hide: the art may stop short under them.)
  const shownH = h - (insets?.hideTop ?? 0) - (insets?.hideBottom ?? 0);
  const coverScale =
    contentW > 0 && contentH > 0 ? Math.min(1, Math.max(w / contentW, shownH / contentH)) : 1;

  /** Review 3: where the player left the map at rest (dragged or zoomed), kept for the session. */
  const [restAt, setRestAtState] = useState<RestView | null>(() => recall(memoryKey));
  const setRestAt = (r: RestView | null) => {
    remember(memoryKey, r);
    setRestAtState(r);
  };
  // A view kept for another size of map does not apply to this one (see RestView).
  const mine = restAt && restAt.box === `${w}x${h}` ? restAt : null;
  const restAtKey = mine ? `${mine.fx},${mine.fy},${mine.artW}` : '';

  /** The default at-rest view (QA M2, review 3): the zoom's base and the free zoom's limits hang on it. */
  const fitted = useMemo((): MapView | null => {
    if (w === 0 || h === 0 || !insets) return null;
    const box = { w, h };
    const content = { w: contentW, h: contentH };
    return fitPinsView({
      box,
      content,
      pins: locations.map((l) => l.map),
      insets,
      minScale: coverScale,
      frame,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, contentW, contentH, insets, pinsKey, frameKey, coverScale]);
  const zoom = fitted
    ? freeZoomLimits({ fitted: fitted.scale, cover: coverScale, artWidth, contentW, dpr })
    : { min: 1, max: 1 };
  const pinsList = () => locations.map((l) => l.map);
  /** How far the map drags at rest at this scale (review 3: any zoom). */
  const restLimits = (scale: number) =>
    fitted && insets
      ? freePanLimits({ w, h }, { w: contentW, h: contentH }, fitted, scale, frame, pinsList(), insets)
      : null;

  /**
   * Where the map should be: at rest (the fitted view, or where the player dragged and zoomed it), or
   * zoomed into the selected pin. `fitted` is the default at-rest view; the pin's zoom is relative to it.
   */
  const target = useMemo((): { fitted: MapView; view: MapView } | null => {
    if (!fitted || !insets) return null;
    const box = { w, h };
    const content = { w: contentW, h: contentH };
    let rest = fitted;
    if (mine) {
      const v = viewFromRest(mine, box, content, zoom);
      const lim = restLimits(v.scale);
      if (lim) rest = within(v, lim);
    }
    // A pin's zoom keeps review 2's numbers: 2.5 × the view that would show every pin (the old first
    // view, which zoomed out past the picture's edge), not × the covered one, which is closer already.
    const zoomBase = selected ? fitPinsView({ box, content, pins: pinsList(), insets }) : fitted;
    const view = selected
      ? zoomView({ box, content, fitted: zoomBase, pin: selected.map, cover, maxScale })
      : rest;
    return { fitted, view };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitted, maxScale, zoom.min, zoom.max, coverKey, selected?.id, restAtKey]);
  /** The first view covers the box, or is letterboxed onto the blurred copy (reported for tests). */
  const fit = target
    ? coversBox({ w, h }, { w: contentW, h: contentH }, target.fitted, insets)
      ? 'cover'
      : 'letterbox'
    : '';
  // The files are picked for the closest the map zooms, so a zoomed-in map is never upscaled; the
  // blurred margin asks for the same file, so it costs no second download.
  const sizes = `${Math.round(contentW * Math.max(Math.min(MAX_SCALE, maxScale), zoom.max))}px`;

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
  /** Review 3: the next move to the target is animated (a double tap, the + / − buttons). */
  const animateNext = useRef(false);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  /** The first landing's zoom is waiting for its frames (see below). */
  const landing = useRef(false);
  const targetRef = useRef(target);
  targetRef.current = target;

  useLayoutEffect(() => {
    if (!target) return;
    const sel = selected?.id ?? null;
    const first = placedFor.current === undefined;
    const changed = !first && placedFor.current !== sel;
    placedFor.current = sel;
    panned.current = false;
    const still = prefersReducedMotion();
    if (!first && !changed && landing.current) {
      // The first landing's zoom has not started yet (the plate's orders loaded meanwhile): stay at
      // rest; the zoom starts from the latest view in a frame, with the sheet.
      setShown({ view: target.fitted, animate: false });
      return;
    }
    if (!first && !changed) {
      // A resize, an overlay, the panel's size, or the player's own zoom: follow it (at once, but for
      // a double tap or a button, which ease like a pin's zoom).
      const from = shownRef.current?.view;
      const moves = !from || !sameView(from, target.view);
      setShown({ view: target.view, animate: animateNext.current && moves && !still });
      animateNext.current = false;
      return;
    }
    animateNext.current = false;
    cancelAnimationFrame(raf.current);
    landing.current = false;
    // Review 3 (GDD §14.13): opening a place is one movement. The page opens the panel as the zoom
    // starts (not when it lands), so the zoom, the dim and the sheet ease in together.
    const arrive = (t = target) => {
      if (!sel) return;
      const fillsMap = coversBox({ w, h }, { w: contentW, h: contentH }, t.view);
      onArriveRef.current?.(sel, { fillsMap });
    };
    if (first) {
      // The first landing (the welcome day opens slot A's pin, a deep link `?loc=`): show the city
      // at rest, then zoom in.
      const rest = sel ? target.fitted : target.view;
      setShown({ view: rest, animate: false });
      if (!sel) return;
      if (still) {
        setShown({ view: target.view, animate: false });
        arrive();
        return;
      }
      // Two frames, so the view at rest is painted before the transition starts from it (to the
      // latest target: the box may have changed meanwhile).
      landing.current = true;
      raf.current = requestAnimationFrame(() => {
        raf.current = requestAnimationFrame(() => {
          landing.current = false;
          const t = targetRef.current ?? target;
          setShown({ view: t.view, animate: true });
          arrive(t);
        });
      });
      return;
    }
    const from = shownRef.current?.view;
    const moves = !from || !sameView(from, target.view);
    setShown({ view: target.view, animate: moves && !still });
    arrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const view = shown?.view ?? target?.view ?? null;
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
    // Landed: the view stays, without its transition (so `willChange` lets go, see `layer`).
    moveTimer.current = setTimeout(
      () => setShown((s) => (s?.animate ? { view: s.view, animate: false } : s)),
      ZOOM_MS + 50,
    );
    return () => clearTimeout(moveTimer.current);
  }, [shown]);
  const transition = shown?.animate ? `transform ${ZOOM_MS}ms ${ZOOM_EASE}` : 'none';
  /** A drag, a pinch, or a wheel or trackpad zoom in progress (the layer stays a compositor layer). */
  const [dragging, setDragging] = useState(false);
  const [wheeling, setWheeling] = useState(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(wheelTimer.current), []);
  // The tiles follow where the map is going (the target), so a zoom fetches its destination from its
  // first frame; only a drag or a pinch, which moves the view away from the target, makes them follow
  // the view.
  const tileView = panned.current ? view : (target?.view ?? view);
  const onTilesUnavailable = () => setTilesFailed(true);
  // Maps v3 §6: a quick cross-fade (day and night differ by up to half a building); none with
  // reduced motion.
  const fade = prefersReducedMotion() ? 'none' : `opacity ${NIGHT_FADE_MS}ms ease`;

  /** The view the player's next zoom starts from: where the map is, or (mid-ease) where it is going. */
  const current = (): MapView | null => shownRef.current?.view ?? target?.view ?? null;
  /** Review 3: zoom the map at rest to `scale` about a point of the box, within the limits. */
  const zoomTo = (scale: number, at: { x: number; y: number }, animate = false) => {
    const from = current();
    if (!from || !target || selectedRef.current) return;
    const s = clamp(scale, zoom.min, zoom.max);
    const lim = restLimits(s);
    if (!lim) return;
    const v = within(zoomAt(from, s, at), lim);
    animateNext.current = animate;
    setRestAt(restFromView(v, { w, h }, { w: contentW, h: contentH }));
  };
  const zoomRef = useRef(zoomTo);
  zoomRef.current = zoomTo;
  const currentRef = useRef(current);
  currentRef.current = current;
  const gestureHold = () => {
    setWheeling(true);
    clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => setWheeling(false), GESTURE_SETTLE_MS);
  };
  const gestureHoldRef = useRef(gestureHold);
  gestureHoldRef.current = gestureHold;
  /** Touch pointers on the map now: a pinch is theirs, not Safari's gesture events. */
  const touches = useRef(0);

  // Review 3: the wheel and a trackpad's pinch (ctrl + wheel in Chromium and Firefox; Safari's
  // gesture events) zoom the map at rest about the pointer. The browser's own page zoom over the map
  // is off everywhere on it. Over an overlay (the plate, its orders) the wheel scrolls as usual.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (isPanel(e.target)) {
        if (e.ctrlKey) e.preventDefault();
        return;
      }
      e.preventDefault();
      const from = currentRef.current();
      if (!from) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      const k = Math.exp(-e.deltaY * unit * (e.ctrlKey ? PINCH_WHEEL_RATE : WHEEL_RATE));
      const b = el.getBoundingClientRect();
      gestureHoldRef.current();
      zoomRef.current(from.scale * clamp(k, 0.5, 2), { x: e.clientX - b.left, y: e.clientY - b.top });
    };
    let gesture: { scale: number } | null = null;
    type Gesture = Event & { scale: number; clientX: number; clientY: number };
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gesture = touches.current > 0 ? null : { scale: currentRef.current()?.scale ?? 1 };
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      if (!gesture || touches.current > 0) return;
      const g = e as Gesture;
      const b = el.getBoundingClientRect();
      gestureHoldRef.current();
      zoomRef.current(gesture.scale * g.scale, { x: g.clientX - b.left, y: g.clientY - b.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('gesturestart', onGestureStart);
    el.addEventListener('gesturechange', onGestureChange);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', onGestureStart);
      el.removeEventListener('gesturechange', onGestureChange);
    };
  }, []);

  /** How far the map drags now: zoomed into a place, near the frame (panLimits); at rest, freePanLimits. */
  const dragLimits = (scale: number) => {
    if (!target || !insets) return null;
    const box = { w, h };
    const content = { w: contentW, h: contentH };
    if (selected) return panLimits(box, content, target.view, frame);
    const lim = restLimits(scale);
    if (!lim) return null;
    if (Math.abs(target.view.scale - scale) > 1e-6) return lim;
    // The player's own at-rest view (after a resize it may sit outside) is always allowed.
    return {
      x: [Math.min(lim.x[0], target.view.x), Math.max(lim.x[1], target.view.x)] as [number, number],
      y: [Math.min(lim.y[0], target.view.y), Math.max(lim.y[1], target.view.y)] as [number, number],
    };
  };

  // A drag pans: zoomed into a place, within panLimits; at rest, within freePanLimits at the scale
  // the player chose. Two fingers pinch (review 3): the picture's point between them stays between
  // them, at rest only. A tap stays a tap (DRAG_SLOP), and the click that ends a drag or a pinch is
  // swallowed, so a drag that starts on a pin does not select it. Two taps close together on the map
  // (not on a pin or a control) zoom in to twice the rest view's scale, or back out to it.
  const drag = useRef<{
    id: number;
    sx: number;
    sy: number;
    from: MapView;
    moved: boolean;
    last: MapView;
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number; touch: boolean }>());
  const pinch = useRef<{ d0: number; m0: { x: number; y: number }; from: MapView; last: MapView } | null>(
    null,
  );
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const swallowClick = useRef(false);
  const lastPointerDown = useRef(0);
  const local = (e: { clientX: number; clientY: number }) => {
    const b = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const swallow = () => {
    swallowClick.current = true;
    // If no click follows (the pointer left the pin), the next real tap still counts.
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);
  };
  const commitRest = (v: MapView) => {
    if (!selectedRef.current) setRestAt(restFromView(v, { w, h }, { w: contentW, h: contentH }));
  };
  const pinchView = () => {
    const p = pinch.current;
    const pts = [...pointers.current.values()];
    if (!p || pts.length < 2 || !boxRef.current) return null;
    const b = boxRef.current.getBoundingClientRect();
    const a = pts[0]!;
    const c = pts[1]!;
    const d = Math.hypot(a.x - c.x, a.y - c.y);
    const m = { x: (a.x + c.x) / 2 - b.left, y: (a.y + c.y) / 2 - b.top };
    const s = clamp((p.from.scale * d) / Math.max(1, p.d0), zoom.min, zoom.max);
    // The picture's point under the first midpoint goes under the current one (pinch and pan).
    const z = zoomAt(p.from, s, p.m0);
    const lim = dragLimits(s);
    return lim ? within({ scale: s, x: z.x + m.x - p.m0.x, y: z.y + m.y - p.m0.y }, lim) : null;
  };
  const onPointerDown = (e: ReactPointerEvent) => {
    lastPointerDown.current = Date.now();
    const touch = e.pointerType === 'touch';
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, touch });
    if (touch) touches.current++;
    if (!view) return;
    if (pointers.current.size === 2 && !selected) {
      // A second finger: the drag becomes a pinch.
      const pts = [...pointers.current.values()];
      const b = boxRef.current!.getBoundingClientRect();
      const a = pts[0]!;
      const c = pts[1]!;
      pinch.current = {
        d0: Math.hypot(a.x - c.x, a.y - c.y),
        m0: { x: (a.x + c.x) / 2 - b.left, y: (a.y + c.y) / 2 - b.top },
        from: view,
        last: view,
      };
      drag.current = null;
      lastTap.current = null;
      panned.current = true;
      setDragging(true);
      boxRef.current?.setPointerCapture?.(e.pointerId);
      return;
    }
    if (e.button !== 0 || pointers.current.size > 2) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, from: view, moved: false, last: view };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const pt = pointers.current.get(e.pointerId);
    if (pt) {
      pt.x = e.clientX;
      pt.y = e.clientY;
    }
    if (pinch.current) {
      const v = pinchView();
      if (v) {
        pinch.current.last = v;
        setShown({ view: v, animate: false });
      }
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !target) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      d.moved = true;
      panned.current = true;
      setDragging(true);
      boxRef.current?.setPointerCapture?.(e.pointerId);
    }
    const lim = dragLimits(d.from.scale);
    if (!lim) return;
    d.last = within({ scale: d.from.scale, x: d.from.x + dx, y: d.from.y + dy }, lim);
    setShown({ view: d.last, animate: false });
  };
  const endDrag = (e: ReactPointerEvent) => {
    const pt = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pt?.touch) touches.current = Math.max(0, touches.current - 1);
    if (pinch.current) {
      if (pointers.current.size >= 2) return;
      const last = pinch.current.last;
      pinch.current = null;
      setDragging(false);
      commitRest(last);
      swallow();
      // The finger left on the map drags on from here.
      const [rest] = [...pointers.current.entries()];
      if (rest) {
        const [id, p] = rest;
        drag.current = { id, sx: p.x, sy: p.y, from: last, moved: true, last };
        setDragging(true);
      }
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      // Review 3: a double tap on the map (not a pin, a control or an overlay) zooms.
      if (e.type !== 'pointerup' || isOverlay(e.target) || selected) return;
      const at = local(e);
      const t = Date.now();
      const prev = lastTap.current;
      if (prev && t - prev.t < DOUBLE_TAP_MS && Math.hypot(at.x - prev.x, at.y - prev.y) < DOUBLE_TAP_PX) {
        lastTap.current = null;
        toggleZoom(at);
      } else lastTap.current = { t, ...at };
      return;
    }
    setDragging(false);
    // At rest, the player's view is kept: closing a place comes back to it.
    commitRest(d.last);
    swallow();
  };
  /** Review 3: the double tap toggles between the rest view and twice its scale. */
  const toggleZoom = (at: { x: number; y: number }) => {
    const v = current();
    if (!v || !target) return;
    if (v.scale > target.fitted.scale * 1.05) {
      animateNext.current = true;
      setRestAt(null);
    } else zoomTo(target.fitted.scale * FREE_ZOOM_STEP, at, true);
  };
  /** The + / − buttons: a step about the middle of the part of the map on show. */
  const stepZoom = (k: number) => {
    const v = current();
    if (!v || !insets) return;
    const at = { x: w / 2, y: (insets.top + h - insets.bottom) / 2 };
    zoomTo(v.scale * k, at, true);
  };

  // Keyboard focus on a pin outside the view (zoomed in, or at rest where it may be off screen or
  // under an overlay since review 3) pans it into view (WCAG 2.4.11). Not a tap's focus: moving the
  // pin under the finger would lose the tap.
  const onPinFocus = (l: MapHotspot) => {
    if (!view || !target || Date.now() - lastPointerDown.current < 1_000) return;
    const px = view.x + l.map.x * contentW * view.scale;
    const py = view.y + l.map.y * contentH * view.scale;
    const a = selected
      ? clearArea({ w, h }, cover)
      : { x0: 0, x1: w, y0: insets?.top ?? 0, y1: h - (insets?.bottom ?? 0) };
    const inside = px >= a.x0 + 22 && px <= a.x1 - 22 && py >= a.y0 + 22 && py <= a.y1 - 22;
    const blocked = (insets?.blocks ?? []).some(
      (b) => px + 22 > b.x0 && px - 22 < b.x1 && py + 22 > b.y0 && py - 22 < b.y1,
    );
    if (inside && (selected || !blocked)) return;
    const lim = dragLimits(view.scale);
    if (!lim) return;
    const next = within(
      {
        scale: view.scale,
        x: (a.x0 + a.x1) / 2 - l.map.x * contentW * view.scale,
        y: (a.y0 + a.y1) / 2 - l.map.y * contentH * view.scale,
      },
      lim,
    );
    if (selected) setShown({ view: next, animate: false });
    else commitRest(next);
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
        // Review 3 (blurry zoom on phones): only while the map moves or is dragged. Chromium keeps a
        // `will-change: transform` layer at the raster scale it already has when its scale changes,
        // so the zoomed view was a stretched bitmap of an earlier, smaller raster, whatever tile level
        // was drawn (measured at 390 × 844, DPR 3: about 30 % less edge detail). Once the move has
        // landed the layer is painted again at its own scale, from the detail tiles.
        willChange: shown?.animate || dragging || wheeling ? 'transform' : 'auto',
      }
    : { visibility: 'hidden' };
  const atMin = !view || view.scale <= zoom.min + 1e-6;
  const atMax = !view || view.scale >= zoom.max - 1e-6;

  return (
    <div
      ref={boxRef}
      className={cx(
        'relative cursor-grab touch-none overflow-hidden bg-ink select-none active:cursor-grabbing',
        className,
      )}
      data-testid="city-map"
      data-zoomed={selected ? 'true' : 'false'}
      data-moving={moving ? 'true' : 'false'}
      data-fit={fit}
      data-art={pyramids ? 'tiles' : 'still'}
      data-view={view ? `${view.x.toFixed(1)},${view.y.toFixed(1)},${view.scale.toFixed(4)}` : ''}
      data-zoom-limits={
        fitted ? `${zoom.min.toFixed(4)},${zoom.max.toFixed(4)},${fitted.scale.toFixed(4)}` : ''
      }
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
          {/* Map atmosphere: above the art, below the pins and overlays; taps go through it. */}
          {cloudConfig && view && target && (
            <CloudLayer
              config={cloudConfig}
              isNight={isNight}
              box={{ w, h }}
              pictureW={contentW * target.fitted.scale}
              view={view}
              rest={target.fitted}
              transition={transition}
              moving={!!shown?.animate || dragging}
              zoomed={!!selected}
              fade={fade}
              fadeMs={NIGHT_FADE_MS}
              zoomMs={ZOOM_MS}
              reducedMotion={prefersReducedMotion()}
            />
          )}
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
          {/* Review 3: + / − beside the Places button on a desktop (the caller places them); the
              wheel, a pinch and a double tap do the same. They step aside while a place is open. */}
          {zoomButtons !== undefined && (
            <div
              className={cx(
                'pointer-events-auto absolute z-10 flex-col shadow-[0_0_0_1px_var(--color-ink),0_4px_12px_rgb(0_0_0/0.4)]',
                selected && 'invisible',
                zoomButtons,
              )}
              data-map-overlay="zoom"
              data-map-control=""
              data-testid="map-zoom"
            >
              {(
                [
                  ['+', copy.mapZoomIn, FREE_ZOOM_STEP, atMax, 'map-zoom-in'],
                  ['−', copy.mapZoomOut, 1 / FREE_ZOOM_STEP, atMin, 'map-zoom-out'],
                ] as const
              ).map(([sign, label, k, off, testId]) => (
                <button
                  key={testId}
                  type="button"
                  aria-label={label}
                  title={label}
                  disabled={off}
                  onClick={() => stepZoom(k)}
                  data-testid={testId}
                  className="flex size-11 cursor-pointer items-center justify-center bg-paper font-label text-[20px] leading-none text-ink not-first:border-t not-first:border-faint hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-paper"
                >
                  <span aria-hidden="true">{sign}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {children}
    </div>
  );
}
