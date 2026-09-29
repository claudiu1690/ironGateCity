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
  /** Overlays that don't pan (the city plate). */
  children?: ReactNode;
  className?: string;
}

const MAX_SCALE = 2.5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The city's detailed map (mockups City, MobileCity) with numbered hotspots at their map fractions.
 * The image covers the viewport and pans and zooms (react-zoom-pan-pinch, up to 2.5×); hotspots keep
 * a 44 px touch target at every zoom. Name tags show on wide screens.
 */
export function CityMap({
  map,
  isNight,
  locations,
  selectedId,
  onSelect,
  children,
  className,
}: CityMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ReactZoomPanPinchRef>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    // jsdom has no layout: fall back to a phone-sized box so the map still renders in tests.
    const measure = () => setSize({ w: el.clientWidth || 390, h: el.clientHeight || 480 });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = map.day.width / map.day.height;
  const w = size?.w ?? 0;
  const h = size?.h ?? 0;
  const contentW = Math.max(w, h * aspect);
  const contentH = contentW / aspect;
  const focus = locations.find((l) => l.id === selectedId) ?? locations[0];
  const centreOn = (fx: number, fy: number, scale: number) => ({
    x: clamp(w / 2 - fx * contentW * scale, w - contentW * scale, 0),
    y: clamp(h / 2 - fy * contentH * scale, h - contentH * scale, 0),
  });
  const initial = focus ? centreOn(focus.map.x, focus.map.y, 1) : { x: 0, y: 0 };

  // Pan to a newly selected location.
  useEffect(() => {
    const z = zoomRef.current;
    const target = locations.find((l) => l.id === selectedId);
    if (!z || !target || w === 0) return;
    const scale = z.state.scale;
    const p = centreOn(target.map.x, target.map.y, scale);
    void z.setTransform(p.x, p.y, scale, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div ref={boxRef} className={cx('relative overflow-hidden bg-ink', className)} data-testid="city-map">
      {size && w > 0 && h > 0 && (
        <TransformWrapper
          key={`${Math.round(contentW)}x${Math.round(contentH)}`}
          ref={zoomRef}
          initialScale={1}
          initialPositionX={initial.x}
          initialPositionY={initial.y}
          minScale={1}
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
                <Picture
                  asset={map.night}
                  sizes={`${Math.round(contentW)}px`}
                  decorative={!isNight}
                  className="size-full select-none"
                />
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
