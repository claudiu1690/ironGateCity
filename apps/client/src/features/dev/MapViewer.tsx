import { cloudyMaps, mapAlt, mapPins, tilePyramids } from '@irongate/content/maps';
import type { AssetView } from '@irongate/rules';
import { CLOUDS, CityMap, cx, pyramidFor } from '@irongate/ui';
import type { CloudConfig, CloudDepthName, MapRect } from '@irongate/ui';
import { useMemo, useState } from 'react';
import { env } from '../../env';

/**
 * Dev only (maps v3 §6, `/dev/maps`): every tiled picture, day and night, with every surveyed pin, so
 * the user and the game designer can check the art, the pins and the quarter frames before their
 * slices. A quarter's frame here is its pins' box grown by 0.06 (the rule the content frames follow).
 * Not a game screen: no server, no auth.
 *
 * Map atmosphere: the clouds (day) and fog (night) show where the city's content has them on
 * (`City.clouds`); the Clouds switch tries them on any picture, and Speed and Opacity scale the
 * `CLOUDS` config live (Speed 10 × shows the drift at a glance), and High, Middle and Low switch each
 * depth of the sky on or off. `?clouds=0|1&speed=&opacity=&depths=high,middle,low` set them from the
 * address too.
 */

const NAMES = ['coalport', 'duskwall', 'ashford', 'clearwater', 'irongate', 'nation'] as const;
type Name = (typeof NAMES)[number];
const GROW = 0.06;
const DEPTHS: CloudDepthName[] = ['high', 'middle', 'low'];

function asset(name: Name, time: 'day' | 'night'): AssetView | null {
  const id = `map.${name}.${time}`;
  const t = tilePyramids[id];
  if (!t) return null;
  const { rev, tiles: _n, bytes: _b, ...rest } = t;
  return {
    id,
    format: 'raster',
    width: t.width,
    height: t.height,
    widths: [1024, 2048],
    webpWidths: [1024],
    alt: mapAlt[`${name}.${time}`],
    focus: null,
    tiles: { ...rest, path: `${id}/${rev}` },
  };
}

/** The pins' box grown by GROW on every side, clamped to the picture. */
function frameOf(pins: ReadonlyArray<{ x: number; y: number }>): MapRect | undefined {
  if (pins.length === 0) return undefined;
  const xs = pins.map((p) => p.x);
  const ys = pins.map((p) => p.y);
  return {
    x0: Math.max(0, Math.min(...xs) - GROW),
    y0: Math.max(0, Math.min(...ys) - GROW),
    x1: Math.min(1, Math.max(...xs) + GROW),
    y1: Math.min(1, Math.max(...ys) + GROW),
  };
}

export function MapViewer() {
  const [name, setName] = useState<Name>('coalport');
  const [night, setNight] = useState(false);
  const [quarter, setQuarter] = useState(1); // 0: the whole picture
  const [selected, setSelected] = useState<string | null>(null);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [cloudsOn, setCloudsOn] = useState<boolean | null>(
    params.has('clouds') ? params.get('clouds') !== '0' : null,
  );
  const [speed, setSpeed] = useState(Number(params.get('speed') ?? 1) || 1);
  const [opacity, setOpacity] = useState(Number(params.get('opacity') ?? 1) || 1);
  const [depths, setDepths] = useState<ReadonlySet<CloudDepthName>>(
    () =>
      new Set(
        (params.get('depths')?.split(',') ?? DEPTHS).filter((d): d is CloudDepthName =>
          DEPTHS.includes(d as CloudDepthName),
        ),
      ),
  );
  const showClouds = cloudsOn ?? cloudyMaps.has(name);
  const depthsKey = [...depths].sort().join(',');
  const cloudConfig = useMemo<CloudConfig>(
    () => ({
      ...CLOUDS,
      day: CLOUDS.day.filter((d) => depths.has(d.name)),
      night: CLOUDS.night.filter((d) => depths.has(d.name)),
      speed,
      opacity,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speed, opacity, depthsKey],
  );
  const survey = mapPins[name]?.pins ?? [];
  const quarters = [...new Set(survey.map((p) => p.quarter))].sort((a, b) => a - b);
  const shown = quarter === 0 ? survey : survey.filter((p) => p.quarter === quarter);
  const frame = quarter === 0 ? undefined : frameOf(shown);
  const map = useMemo(() => ({ day: asset(name, 'day'), night: asset(name, 'night') }), [name]);
  const origin = env.tilesOrigin || '/tiles';
  const day = map.day && pyramidFor(map.day, origin);
  const nightTiles = map.night && pyramidFor(map.night, origin);
  const pick = (n: Name) => {
    setName(n);
    setQuarter(n === 'nation' ? 0 : 1);
    setSelected(null);
  };

  return (
    <div className="flex h-dvh flex-col bg-ink text-paper">
      <div
        className="flex flex-wrap items-center gap-2 p-2 font-label text-[13px]"
        data-testid="map-viewer-bar"
      >
        <label className="flex items-center gap-1">
          Picture
          <select
            className="h-11 bg-paper px-2 text-ink"
            value={name}
            onChange={(e) => pick(e.target.value as Name)}
          >
            {NAMES.map((n) => (
              <option key={n} value={n} disabled={!tilePyramids[`map.${n}.day`]}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Quarter
          <select
            className="h-11 bg-paper px-2 text-ink"
            value={quarter}
            onChange={(e) => {
              setQuarter(Number(e.target.value));
              setSelected(null);
            }}
          >
            <option value={0}>whole picture, all pins</option>
            {quarters.map((q) => (
              <option key={q} value={q}>
                {name === 'irongate' ? 'district' : 'quarter'} {q}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="h-11 border border-paper px-3" onClick={() => setNight((v) => !v)}>
          {night ? 'Night' : 'Day'}
        </button>
        <label className="flex h-11 items-center gap-1">
          <input
            type="checkbox"
            className="size-5"
            checked={showClouds}
            onChange={(e) => setCloudsOn(e.target.checked)}
          />
          Clouds
        </label>
        {DEPTHS.map((d) => (
          <label key={d} className="flex h-11 items-center gap-1 capitalize">
            <input
              type="checkbox"
              className="size-5"
              checked={depths.has(d)}
              onChange={(e) =>
                setDepths((s) => {
                  const n = new Set(s);
                  if (e.target.checked) n.add(d);
                  else n.delete(d);
                  return n;
                })
              }
            />
            {d}
          </label>
        ))}
        <label className="flex items-center gap-1">
          Speed
          <select
            className="h-11 bg-paper px-2 text-ink"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {[0.5, 1, 2, 5, 10, 30].map((v) => (
              <option key={v} value={v}>
                {v} ×
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Opacity
          <select
            className="h-11 bg-paper px-2 text-ink"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          >
            {[0.5, 0.75, 1, 1.25, 1.5].map((v) => (
              <option key={v} value={v}>
                {v} ×
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <button type="button" className="h-11 border border-paper px-3" onClick={() => setSelected(null)}>
            Back out
          </button>
        )}
        <span className={cx('text-dim', !frame && 'hidden')}>
          frame {frame && [frame.x0, frame.y0, frame.x1, frame.y1].map((v) => v.toFixed(2)).join(', ')}
        </span>
      </div>
      {map.day && map.night && day && nightTiles ? (
        <CityMap
          key={name}
          className="min-h-0 flex-1"
          map={{ day: map.day, night: map.night }}
          tiles={{ day, night: nightTiles }}
          frame={frame}
          isNight={night}
          clouds={showClouds ? cloudConfig : false}
          locations={shown.map((p, i) => ({ id: p.id, n: i + 1, name: p.name, map: { x: p.x, y: p.y } }))}
          selectedId={selected}
          onSelect={(id) => setSelected((s) => (s === id ? null : id))}
        />
      ) : (
        <p className="p-6">No tiles for {name}: run pnpm art:tiles.</p>
      )}
    </div>
  );
}
