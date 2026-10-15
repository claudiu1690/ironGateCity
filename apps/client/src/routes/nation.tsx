import { copy } from '@irongate/content/copy';
import type { FactionId, NationCityView } from '@irongate/rules';
import { CitiesList, CityCard, CityMap, LocationSheet, cx, pyramidFor } from '@irongate/ui';
import type { MapHotspot } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { MapSwitch } from '../components/MapSwitch';
import { env } from '../env';
import { noticeFor } from '../features/game/errors';
import { PatrolLink } from '../features/game/PatrolLink';
import { useCharacter } from '../features/game/hooks';
import { useBoard } from '../features/travel/useBoard';
import { trpc } from '../lib/trpc';
import { useNightTurn } from '../lib/useNightTurn';
import { useLocationLayout } from '../lib/useNow';
import { lastDistrict } from './city';

/** The city column's width beside the map on a phone held sideways (the city page's). */
const SIDE_W = 260;

/** The pin's label: *Coalport · home · 12 min*, *Irongate · 12 min*; locked: the name, the lock word under it. */
function pinOf(c: NationCityView, homeCityId: string): MapHotspot['pin'] {
  const tags = [
    ...(c.cityId === homeCityId ? [copy.travel.home] : []),
    // Slice 5 (screens §8.1): *Duskwall · rival ground · 15 min* from Level 10.
    ...(c.state === 'rival' ? [copy.risk.rival.word] : []),
    ...(c.minutes !== null && (c.state === 'open' || c.state === 'rival') ? [copy.travel.min(c.minutes)] : []),
  ];
  return {
    style: 'label',
    label: copy.travel.pinLabel(c.name, tags),
    sub: c.state === 'here' ? copy.travel.youAreHere : (c.lockWord ?? undefined),
    marks: [...(c.state === 'here' ? (['here'] as const) : []), ...(c.lockWord ? (['muted'] as const) : [])],
  };
}

export interface NationSearch {
  city?: string;
}

/**
 * Slice 4 (screens §2, tech design §12.1): the painted republic. It covers the screen at rest with the
 * player's city and the capital in view (on a train, the two ends of the line), drags and zooms freely
 * within review 3's limits, and opens a city card on a pin or a row of the *Cities* list: who holds it,
 * this week's Issues, the election, and *Board · 20 Iron · 12 min*.
 */
export function NationPage() {
  const navigate = useNavigate();
  const { character } = useCharacter();
  const nation = useQuery(trpc.travel.nation.queryOptions());
  // Review 5 (ADR 0079): the republic turns at dusk and dawn with its view.
  useNightTurn(nation.data?.night, [trpc.travel.nation.queryKey()]);
  const layout = useLocationLayout();
  const side = layout === 'side';
  const search = useSearch({ strict: false }) as NationSearch;
  const [selected, setSelected] = useState<string | null>(search.city ?? null);
  const [arrived, setArrived] = useState<string | null>(null);
  const [lastCity, setLastCity] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const travel = useBoard();
  useEffect(() => {
    if (!selected) setArrived(null);
  }, [selected]);

  if (nation.isError) {
    return (
      <p role="alert" className="p-4 font-body text-paper">
        The map could not be loaded. Check your connection and try again.
      </p>
    );
  }
  if (!nation.data || !character) {
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Unfolding the map…
      </p>
    );
  }
  const n = nation.data;
  const names = character.factionNames ?? ({ [character.factionId]: character.factionName } as Partial<Record<FactionId, string>>);
  const dayTiles = pyramidFor(n.map.day, env.tilesOrigin);
  const nightTiles = pyramidFor(n.map.night, env.tilesOrigin);
  const tiles = dayTiles && nightTiles ? { day: dayTiles, night: nightTiles } : null;
  const homeCityId = character.homeCityId;
  const here = 'cityId' in n.here ? n.here.cityId : null;
  const line = 'journey' in n.here ? n.here.journey : null;
  // At rest: your city and the capital; on a train the two ends of the line (screens §2.1).
  const capitalId = n.cities.find((c) => c.n === 1)?.cityId ?? 'irongate';
  const restFocus = line ? [line.from, line.to] : [here ?? homeCityId, capitalId];
  const pins: MapHotspot[] = n.cities.map((c) => ({
    id: c.cityId,
    n: c.n,
    name: c.name,
    map: { x: c.x, y: c.y },
    pin: pinOf(c, homeCityId),
  }));
  const card = n.cities.find((c) => c.cityId === selected) ?? null;
  const sheetCity = card ?? n.cities.find((c) => c.cityId === lastCity) ?? null;
  const open = !!card && arrived !== null;
  const cover =
    layout === 'sheet'
      ? { bottom: Math.round(window.innerHeight * 0.6) }
      : side
        ? { left: Math.max(0, Math.min(340, window.innerWidth / 2) - SIDE_W) }
        : undefined;
  const cityHref = (() => {
    if (line) return '/journey';
    const d = lastDistrict(character.cityId);
    return d ? `/city/${character.cityId}/${d}` : `/city/${character.cityId}`;
  })();
  const subtitle = line
    ? copy.travel.onTheTrainTo(n.cities.find((c) => c.cityId === line.to)?.name ?? line.to)
    : here === homeCityId
      ? copy.travel.hereHome(n.cities.find((c) => c.cityId === here)?.name ?? '')
      : (n.cities.find((c) => c.cityId === here)?.name ?? '');
  const citiesButton = (className: string) =>
    selected ? null : (
      <button
        type="button"
        data-map-overlay="places"
        data-testid="cities-button"
        aria-haspopup="dialog"
        onClick={() => setListOpen(true)}
        className={cx(
          'label-caps pointer-events-auto flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 bg-paper px-3 text-[12px] font-semibold text-ink shadow-[0_0_0_1px_var(--color-ink),0_4px_12px_rgb(0_0_0/0.4)] hover:bg-paper-2',
          className,
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="3.5" cy="6" r="1.2" fill="currentColor" />
          <circle cx="3.5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="3.5" cy="18" r="1.2" fill="currentColor" />
        </svg>
        {copy.travel.cities}
      </button>
    );

  return (
    // Review 6 #1: held sideways on a short screen the map takes the room it has (as the city does); a
    // 420 px floor ran it past the screen's bottom, so the southern cities sat out of sight.
    <div className={cx('relative flex h-full', !side && 'min-h-[420px]')} data-testid="nation">
      <CityMap
        className="h-full min-w-0 flex-1"
        map={n.map}
        tiles={tiles}
        frame={n.frame}
        clouds={n.clouds}
        isNight={n.night.night}
        locations={pins}
        selectedId={selected}
        onSelect={(id) => setSelected(id)}
        restFocus={restFocus}
        cover={cover}
        onArrive={(id) => {
          setArrived(id);
          setLastCity(id);
        }}
        memoryKey="nation"
        zoomButtons={side ? undefined : 'top-[62px] right-2.5 hidden sm:pointer-fine:flex'}
      >
        {/* The top caption: where you are (screens §2.1: the top bar's subtitle). */}
        <div
          className="pointer-events-none absolute top-2.5 left-2.5 z-10 flex flex-col bg-paper px-3 py-1.5 text-ink shadow-[0_0_0_1px_var(--color-ink),0_4px_12px_rgb(0_0_0/0.4)]"
          data-map-overlay="caption"
          data-testid="nation-caption"
        >
          <span className="label-caps text-[9.5px] text-muted">{copy.travel.citiesOfTheRepublic}</span>
          <span className="font-mono text-[12px]">{subtitle}</span>
        </div>
        {/* Review 6 #2: the map switch and *Cities* in one row with a gap, so they never overlap: at
            the top right sideways and from 640 px, at the bottom's two ends on an upright phone. */}
        <div
          className={cx(
            'pointer-events-none absolute z-10 flex flex-row-reverse items-start gap-2',
            side ? 'top-2.5 right-2.5' : 'inset-x-2.5 bottom-3 justify-between sm:top-2.5 sm:bottom-auto sm:left-auto sm:justify-start',
          )}
        >
          {citiesButton('')}
          {!selected && <MapSwitch active="nation" cityHref={cityHref} />}
        </div>
      </CityMap>
      {sheetCity && (
        <LocationSheet
          layout={layout}
          open={open}
          onOpenChange={(o) => {
            if (!o) setSelected(null);
          }}
          n={sheetCity.n}
          kindLabel=""
          kicker={sheetCity.line}
          name={sheetCity.name}
          blurb=""
          testId="city-sheet"
        >
          <CityCard
            city={sheetCity}
            names={names}
            onBoard={() => travel.board(sheetCity.cityId)}
            boardPending={travel.pendingTo === sheetCity.cityId}
            onSeeDistricts={() => void navigate({ to: '/city/$cityId', params: { cityId: sheetCity.cityId } })}
          />
          {travel.error && (
            <p role="status" className="font-body text-[13px] text-collective" data-testid="board-notice">
              {noticeFor(travel.error)}
            </p>
          )}
          {travel.error && <PatrolLink error={travel.error} />}
        </LocationSheet>
      )}
      <CitiesList
        open={listOpen}
        onOpenChange={setListOpen}
        cities={n.cities}
        onPick={(id) => setSelected(id)}
        returnFocusTo={() =>
          [...document.querySelectorAll<HTMLElement>('[data-testid="cities-button"]')].find(
            (b) => b.offsetParent !== null,
          ) ?? null
        }
      />
    </div>
  );
}
