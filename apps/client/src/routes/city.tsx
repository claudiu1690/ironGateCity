import { copy } from '@irongate/content/copy';
import type {
  ActionResult,
  CityView,
  DistrictView,
  FactionId,
  LocationView,
  MissionView,
  QuarterView,
} from '@irongate/rules';
import {
  BottomSheet,
  Button,
  CityMap,
  DistrictsList,
  ElectionCard,
  FACTION_STYLE,
  FactionCrest,
  HelpButton,
  JobsCard,
  LocationSheet,
  MissionBriefing,
  MissionTicket,
  OpinionBars,
  OrdersList,
  OutOfEnergyCard,
  PlacesList,
  QuarterTeaserSheet,
  QuartersList,
  RegisterSheet,
  ResidenceCard,
  ResultModal,
  ScoreboardLine,
  Ticket,
  TodayStrip,
  TrainsCard,
  TramBar,
  comebackLine,
  cx,
  districtStateWord,
  formatClock,
  formatShare,
  groundOf,
  heatNow,
  heatWord,
  helpMark,
  pyramidFor,
  quarterLockLine,
  residenceLines,
} from '@irongate/ui';
import type { Ground } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MapSwitch } from '../components/MapSwitch';
import { env } from '../env';
import { usePerformAction } from '../features/action/usePerformAction';
import type { PerformTarget } from '../features/action/usePerformAction';
import { usePoliticalAct } from '../features/council/usePoliticalAct';
import { noticeFor } from '../features/game/errors';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { useMissionStart } from '../features/street/useMissionStart';
import { useBoard } from '../features/travel/useBoard';
import { setResultModalOpen } from '../lib/modalGate';
import { gameErrorOf, isNetworkError, trpc, trpcClient } from '../lib/trpc';
import { useLocationLayout, useNow } from '../lib/useNow';

/** The city column beside the map on a phone held sideways (review 2 #3). */
const SIDE_W = 260;

/** Slice 4: the capital opens on the last district viewed in this session (tech design §12.1). */
const DISTRICT_KEY = 'irongate.lastDistrict.';

export function lastDistrict(cityId: string): string | null {
  try {
    return window.sessionStorage.getItem(DISTRICT_KEY + cityId);
  } catch {
    return null;
  }
}

function rememberDistrict(cityId: string, districtId: string | null) {
  try {
    if (districtId) window.sessionStorage.setItem(DISTRICT_KEY + cityId, districtId);
    else window.sessionStorage.removeItem(DISTRICT_KEY + cityId);
  } catch {
    // Private mode: the capital opens on its overview.
  }
}

/**
 * Slice 5 (tech design §12.3, ADR 0035): a home city lands on the quarter of `?loc`, else the last
 * viewed this session, else its first (the capital keeps its own district memory above).
 */
const QUARTER_KEY = 'irongate.lastQuarter.';

export function lastQuarter(cityId: string): string | null {
  try {
    return window.sessionStorage.getItem(QUARTER_KEY + cityId);
  } catch {
    return null;
  }
}

function rememberQuarter(cityId: string, quarterId: string) {
  try {
    window.sessionStorage.setItem(QUARTER_KEY + cityId, quarterId);
  } catch {
    // Private mode: the city opens on its first quarter.
  }
}

const isOpen = (q: QuarterView) => q.open !== false;

/** Every party's short name (content through the character view; faction naming is parked). */
function namesOf(c: { factionId: FactionId; factionName: string; factionNames?: Record<FactionId, string> }) {
  return c.factionNames ?? ({ [c.factionId]: c.factionName } as Partial<Record<FactionId, string>>);
}

/**
 * The ground sash (slice-4 screens, 3 Oct 2026): whose ground a place is. In a home city the party with
 * the largest share; in the capital the party leading the place's district, *Contested* in a close
 * race; a party's headquarters its own party.
 */
export function groundFor(
  c: CityView,
  l: LocationView | undefined,
  names: Partial<Record<FactionId, string>>,
): Ground | null {
  if (!l) return null;
  const hq = l.kind === 'faction-hq' ? (l.factionId ?? c.homeFactionId ?? null) : null;
  if (c.districts && c.districts.length > 0) {
    const d = c.districts.find((x) => x.id === l.quarterId);
    return groundOf({ shares: d?.opinion ?? null, closeRace: d?.state.battleground, hq, names });
  }
  return groundOf({ shares: c.opinion, hq, names });
}

/**
 * The city screen (tech design §12.2): the map, the plate, the location sheet and the result modal.
 * Review 2: a pin zooms the map into it and its location opens (a bottom sheet upright, a side panel
 * sideways, a centred panel from 768 px); closing zooms back out. Review 3: the player may zoom the
 * map at rest, and opening a place is one movement (the zoom, the dim and the sheet together).
 *
 * Slice 4 (screens §5, and the user's district lock of 3 Oct 2026): in the capital the same page shows
 * the overview (the five districts' outlines and names, no place) and a district (its outline, the
 * picture dimmed outside it, only its pins, the view held inside it), one mounted map whose frame and
 * pins change, so going in, by tram and back out is one zoom.
 */
export function CityPage() {
  const params = useParams({ strict: false }) as { cityId: string; quarterId?: string };
  const cityId = params.cityId;
  const { loc, order: orderHl, places: placesSearch } = useSearch({ from: '/app/city/$cityId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character, now: tick } = useCharacter();
  const city = useQuery(trpc.city.get.queryOptions({ cityId }));
  const stat = usePlaceStat();
  const layout = useLocationLayout();
  // The Election card's countdown, on the server's clock (a wrong phone clock never miscounts).
  const now = useNow(60_000);
  const side = layout === 'side';
  // Review 3 (GDD §14.13): the location opens as the map starts its zoom into the pin (CityMap
  // `onArrive`), so the zoom, the dim and the sheet are one movement. `arrived`: a place is open (a
  // tap on another pin while one is open swaps the sheet's content, it does not close it);
  // `lastPlace`: the place the sheet shows, kept after closing so the closing movement plays.
  const [arrived, setArrived] = useState<string | null>(null);
  const [lastPlace, setLastPlace] = useState<string | null>(null);
  // The art stops short of the map's edge under the sheet (a pin near its bottom): the sheet fills 60 dvh.
  const [fillSheet, setFillSheet] = useState(false);
  useEffect(() => {
    if (!loc) setArrived(null);
  }, [loc]);

  // Review 3: the list of the places on the map (the Places button); slice 4: *Show places*, *Where to act*.
  const [placesOpen, setPlacesOpen] = useState(!!placesSearch);
  const [districtsOpen, setDistrictsOpen] = useState(false);
  // QA slice 4 m7: on a short phone the capital folds the orders to one line; a tap opens them.
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Review 1 (§13.7): the orders-complete note waits for this modal to close (AppShell shows it).
  useEffect(() => {
    setResultModalOpen(modalOpen);
    return () => setResultModalOpen(false);
  }, [modalOpen]);
  const plateHelp = useRef<HTMLButtonElement>(null);
  const [last, setLast] = useState<PerformTarget | null>(null);
  const action = usePerformAction((r) => {
    setResult(r);
    setModalOpen(true);
  });
  // Slice 4: where you live (screens §6) and the trains (§5.2).
  const act = usePoliticalAct();
  const [residenceOpen, setResidenceOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  useEffect(() => {
    if (act.open) {
      setRegisterOpen(false);
      setResidenceOpen(false);
    }
  }, [act.open]);
  const travel = useBoard();
  // Slice 5 (screens §4): a mission's briefing, its start, and a locked quarter's teaser.
  const [briefing, setBriefing] = useState<{ mission: MissionView; locationId: string; placeName: string } | null>(
    null,
  );
  const [briefingOpen, setBriefingOpen] = useState(false);
  const missionStart = useMissionStart((r) => {
    setBriefingOpen(false);
    setResult(r);
    setModalOpen(true);
  });
  // A run-in answer closes the briefing too (the run-in modal takes over).
  const runInPending = character?.runIn?.state === 'pending';
  useEffect(() => {
    if (runInPending) setBriefingOpen(false);
  }, [runInPending]);
  const [teaser, setTeaser] = useState<string | null>(null);
  const [quartersOpen, setQuartersOpen] = useState(false);
  // Slice 5 (screens §6): held (the release modal not yet closed), the map gives way to the held
  // screen, once this screen's result modal (*To the cells*) and the run-in's are out of the way.
  const heldNow = !!character?.held;
  const runInNow = !!character?.runIn;
  useEffect(() => {
    if (heldNow && !runInNow && !modalOpen) void navigate({ to: '/held', replace: true });
  }, [heldNow, runInNow, modalOpen, navigate]);

  const [jobMessage, setJobMessage] = useState<{ jobId: string; text: string } | null>(null);
  const takeBusy = useRef(false);
  const take = useMutation({
    ...trpc.job.take.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r, vars) => {
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
      const at = formatClock(r.outcome.firstPayAt);
      setJobMessage({
        jobId: vars.jobId,
        text: r.outcome.switched
          ? copy.jobSwitched(at)
          : r.outcome.orderCompleted
            ? copy.jobTakenOrder(r.outcome.fxp)
            : copy.jobTaken(at),
      });
    },
    onError: (e, vars) => setJobMessage({ jobId: vars.jobId, text: noticeFor(e) ?? '' }),
    onSettled: () => {
      takeBusy.current = false;
    },
  });

  const c0 = city.data;
  const districts = c0?.districts && c0.districts.length > 0 ? c0.districts : null;
  const district: DistrictView | null =
    districts && params.quarterId ? (districts.find((d) => d.id === params.quarterId) ?? null) : null;
  // The capital remembers the last district viewed for this session (the index route and the Map
  // tab open on it; the overview marks it).
  useEffect(() => {
    if (district) rememberDistrict(cityId, district.id);
  }, [cityId, district]);

  // Slice 5 (ADR 0035): a home city with more than one quarter has the capital's overview and quarter
  // views: `/city/{id}/overview`, `/city/{id}/{quarter}`, and `/city/{id}` the landing quarter in place.
  const homeQuarters = !districts && c0 && c0.quarters.length > 1 ? c0.quarters : null;
  const homeOverview = !!homeQuarters && params.quarterId === 'overview';
  const homeQuarter: QuarterView | null = (() => {
    if (!homeQuarters || homeOverview || !c0) return null;
    const byParam = params.quarterId
      ? homeQuarters.find((q) => q.id === params.quarterId && isOpen(q))
      : undefined;
    if (byParam) return byParam;
    const locQuarter = loc ? c0.locations.find((l) => l.id === loc)?.quarterId : undefined;
    const byLoc = locQuarter ? homeQuarters.find((q) => q.id === locQuarter && isOpen(q)) : undefined;
    if (byLoc) return byLoc;
    const last = lastQuarter(cityId);
    const byLast = last ? homeQuarters.find((q) => q.id === last && isOpen(q)) : undefined;
    return byLast ?? homeQuarters.find(isOpen) ?? homeQuarters[0] ?? null;
  })();
  const homeQuarterId = homeQuarter?.id ?? null;
  useEffect(() => {
    if (homeQuarterId) rememberQuarter(cityId, homeQuarterId);
  }, [cityId, homeQuarterId]);
  const currentQuarterId = district?.id ?? homeQuarterId;
  // The district lock (the picture dimmed outside the quarter, the view held in its frame) once there
  // is somewhere else to go: with one quarter open (Levels 1–5) the map is slice 4's (tech design
  // Deviations, phase C).
  const lockQuarter = !!homeQuarter && (homeQuarters?.filter(isOpen).length ?? 0) > 1;
  /** A quarter view proper (its plate, the bar, the lock): two quarters or more open. */
  const qv = lockQuarter ? homeQuarter : null;

  // On a train no city is open (IN_TRANSIT): the journey; standing elsewhere: the city you are in.
  const refusal = city.isError ? gameErrorOf(city.error)?.reason : undefined;
  useEffect(() => {
    if (refusal === 'IN_TRANSIT') void navigate({ to: '/journey', replace: true });
    else if (refusal === 'WRONG_CITY' && character)
      void navigate({ to: '/city/$cityId', params: { cityId: character.cityId }, replace: true });
  }, [refusal, character, navigate]);

  /** Open a pin's sheet; from a Party order (review 1), its matching tickets are marked. */
  const select = (id: string | null, orderId?: string) => {
    setJobMessage(null);
    action.reset();
    // The capital shows one district's places (the user's lock): an order's pin for a place in another
    // district, or on the overview, opens that district, then the place (slice-4 fixes §3). Slice 5: a
    // home city's quarters likewise.
    const into = (districts || homeQuarters) && id ? c0?.locations.find((l) => l.id === id)?.quarterId : undefined;
    if (into && into !== currentQuarterId) {
      void navigate({
        to: '/city/$cityId/$quarterId',
        params: { cityId, quarterId: into },
        search: { loc: id!, ...(orderId ? { order: orderId } : {}) },
      });
      return;
    }
    void navigate({
      to: '.',
      search: id ? { loc: id, ...(orderId ? { order: orderId } : {}) } : {},
      replace: true,
    });
  };
  /** Slice 5: into a home city's quarter, or (null) its overview. */
  const goQuarter = (id: string | null) => {
    setJobMessage(null);
    action.reset();
    if (id) void navigate({ to: '/city/$cityId/$quarterId', params: { cityId, quarterId: id } });
    else void navigate({ to: '/city/$cityId/$quarterId', params: { cityId, quarterId: 'overview' } });
  };
  /** A quarter on the overview, the bar or the list: an open one goes in, a locked one shows its teaser. */
  const pickQuarter = (id: string) => {
    const q = homeQuarters?.find((x) => x.id === id);
    if (q && !isOpen(q)) setTeaser(id);
    else goQuarter(id);
  };
  /** Slice 4: into a district (the overview's outline or name, the Districts list, the tram bar). */
  const goDistrict = (id: string | null) => {
    setJobMessage(null);
    action.reset();
    if (id) void navigate({ to: '/city/$cityId/$quarterId', params: { cityId, quarterId: id } });
    else void navigate({ to: '/city/$cityId', params: { cityId } });
  };

  if (city.isError) {
    if (refusal === 'IN_TRANSIT' || refusal === 'WRONG_CITY')
      return (
        <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
          Loading the city…
        </p>
      );
    return (
      <div className="p-4 text-paper">
        <p role="alert" className="font-body">
          The city could not be loaded. Check your connection and try again.
        </p>
        <Button variant="outline-light" className="mt-3" onClick={() => void city.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!city.data || !character) {
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Loading the city…
      </p>
    );
  }

  const c = city.data;
  const names = namesOf(character);
  const overview = !!districts && !district;
  // The pins on show: a district's or a quarter's own (the user's lock: only its), none on an overview.
  const shownLocations = district
    ? c.locations.filter((l) => l.quarterId === district.id)
    : homeQuarter
      ? c.locations.filter((l) => l.quarterId === homeQuarter.id)
      : overview || homeOverview
        ? []
        : c.locations;
  // Slice 5 (screens §8.3): rival ground, the home faction whose morale your work draws from.
  const rival = c.rivalGround ?? null;
  const heat = heatNow(character.heat, tick);
  const location: LocationView | undefined = shownLocations.find((l) => l.id === loc);
  /** What the sheet shows: the open place, or (closing) the last one. */
  const sheetPlace: LocationView | undefined = location ?? shownLocations.find((l) => l.id === lastPlace);
  const sheetOpen = !!location && arrived !== null && !(character.orders.complete && !modalOpen);
  // ADR 0024: the map as tiles where a tile origin is set (dev: the local cache), else the stills.
  const dayTiles = pyramidFor(c.map.day, env.tilesOrigin);
  const nightTiles = pyramidFor(c.map.night, env.tilesOrigin);
  const tiles = dayTiles && nightTiles ? { day: dayTiles, night: nightTiles } : null;
  const energy = { value: character.energy.value, nextTickAt: character.energy.nextTickAt };
  const share = c.homeFactionId ? c.opinion[c.homeFactionId] : c.opinion[character.factionId];
  // The plate's party: your own at home, the home party on rival ground (its morale).
  const plateFaction: FactionId = rival ? rival.homeFactionId : character.factionId;
  const perform = (target: PerformTarget, times: 1 | 3) => {
    setLast(target);
    action.perform(target, times);
  };
  // The cheapest thing to do here (its tickets and, slice 5, its missions); nothing open: no card.
  const costs = sheetPlace
    ? [
        ...sheetPlace.actions.filter((a) => !a.locked).map((a) => a.energy),
        ...(sheetPlace.missions ?? []).filter((m) => !m.locked).map((m) => m.energy),
      ]
    : [];
  const cheapest = costs.length > 0 ? Math.min(...costs) : 0;
  const waiting = character.orders.items
    .filter((o) => !o.done)
    .map((o) => `${o.title} ${o.progress} / ${o.target}`);
  // Review 1 (answers §5): the plate's notes, the share first (its caption), then morale and the ordinance.
  const plateNotes = district
    ? [
        copy.capital.help.whoHolds(district.name),
        copy.capital.help.closeRace(),
        ...(district.state.groundswell ? [copy.capital.help.comeback()] : []),
        ...(c.ordinance ? [copy.help.ordinance()] : []),
      ]
    : [
        copy.help.share(c.name),
        ...(c.morale ? [copy.help.morale()] : []),
        ...(c.ordinance ? [copy.help.ordinance()] : []),
      ];

  // Review 3: the Places list, in pin order, with a tag where an open Party order points (the same
  // pins the orders list links to); slice 4: and the Issue mark where work is tagged.
  const orderAt = new Set(
    character.orders.items.flatMap((o) => (!o.done && o.pin ? [o.pin.locationId] : [])),
  );
  const places = shownLocations.map((l) => ({
    id: l.id,
    n: l.n,
    name: l.name,
    blurb: l.blurb,
    order: orderAt.has(l.id),
    issue: (l.issueIds?.length ?? 0) > 0,
  }));
  /**
   * The Places button (on the overview: *Districts*): a small pill in a corner of the map, clear of the
   * plate and the dock, marked as an overlay so the map's first view keeps the pins clear of it. It
   * steps aside while a place is open.
   */
  const placesButton = (className: string) =>
    loc ? null : (
      <button
        type="button"
        data-map-overlay="places"
        data-testid="places-button"
        aria-haspopup="dialog"
        onClick={() =>
          overview ? setDistrictsOpen(true) : homeOverview ? setQuartersOpen(true) : setPlacesOpen(true)
        }
        className={cx(
          'label-caps pointer-events-auto absolute z-10 flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 bg-paper px-3 text-[12px] font-semibold text-ink shadow-[0_0_0_1px_var(--color-ink),0_4px_12px_rgb(0_0_0/0.4)] hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper',
          className,
        )}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="3.5" cy="6" r="1.2" fill="currentColor" />
          <circle cx="3.5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="3.5" cy="18" r="1.2" fill="currentColor" />
        </svg>
        {overview ? copy.capital.districts : homeOverview ? copy.risk.quarters.title : 'Places'}
      </button>
    );
  // Slice 4: *City | Nation* (the Map tab's control); City is where you stand (here).
  const mapSwitch = (className: string) =>
    loc ? null : <MapSwitch active="city" cityHref={`/city/${c.id}`} className={className} />;

  // The part of the map the open location hides: the zoom centres its pin in the rest.
  const cover =
    layout === 'sheet'
      ? // Phones: the sheet covers up to 60 dvh of the map (§12.3).
        { bottom: Math.round(window.innerHeight * 0.6) }
      : side
        ? // Sideways: the panel (340 px, at most half the screen) runs past the city column.
          { left: Math.max(0, Math.min(340, window.innerWidth / 2) - SIDE_W) }
        : // Tablets and desktops: the panel sits over the dimmed map; the pin goes in the middle.
          undefined;

  // Review 2 (screens §1a): the Election card under the plate. A full card in the side column and
  // on wide screens; on a phone a one-tap row (a line on a short one), so the pins keep their room.
  const openElection = (route: NonNullable<NonNullable<typeof c.election>['route']>) =>
    void navigate({ to: route });
  const election = (layout: 'card' | 'row' | 'compact', className?: string) =>
    c.election ? (
      <ElectionCard
        summary={c.election}
        onOpen={openElection}
        layout={layout}
        className={className}
        now={now}
        factionNames={names}
      />
    ) : null;
  // Review 2 (answers §2.4): where each stat trains here, for a result's reason line.
  const trainingPlaces: Partial<Record<'str' | 'int' | 'agi', string>> = {};
  for (const l of c.locations)
    for (const a of l.actions)
      if (a.trains && !trainingPlaces[a.trains.stat]) trainingPlaces[a.trains.stat] = l.ref ?? l.name;

  // Slice 4 (screens §6): where you live, on the district view and at home.
  // At home, living at home (the usual case), there is nothing to do: no card (the map keeps its room).
  const residenceCard =
    district?.residence ?? (c.residence && c.residence.state !== 'atHome' ? c.residence : null);
  const residencePlace = district?.name ?? c.name;
  const rank2 = character.rank.ladder[1] ?? '';
  const register = () =>
    void act.run('register', (k) =>
      trpcClient.residence.register.mutate({
        cityId: c.id,
        districtId: district?.id ?? null,
        idempotencyKey: k,
      }),
    );
  const takeRoom = () => void act.run('room', (k) => trpcClient.residence.room.mutate({ idempotencyKey: k }));
  const residenceFull = (className?: string) =>
    residenceCard ? (
      <ResidenceCard
        card={residenceCard}
        placeName={residencePlace}
        rank2Title={rank2}
        onRegister={() => setRegisterOpen(true)}
        onRoom={takeRoom}
        roomPending={act.pending === 'room'}
        className={className}
      />
    ) : null;
  /** Phones: the residence card folded to one 44 px line under the plate; a tap opens it. */
  const residenceRow = residenceCard ? (
    <button
      type="button"
      onClick={() => setResidenceOpen(true)}
      className="flex min-h-11 w-full cursor-pointer items-baseline gap-2 border-t border-paper-2 px-3 text-left hover:bg-paper-2"
      data-testid="residence-row"
    >
      <span className="label-caps shrink-0 text-[9.5px] font-semibold text-muted">
        {copy.residence.whereYouLive}
      </span>
      <span className="min-w-0 flex-1 truncate font-body text-[13.5px]">
        {residenceLines(residenceCard, residencePlace, rank2).line1}
      </span>
      <span className="font-label text-[18px]" aria-hidden="true">
        ›
      </span>
    </button>
  ) : null;

  const orders = (
    <>
      <OrdersList orders={character.orders} onPin={(id, orderId) => select(id, orderId)} />
      <TodayStrip today={character.today} help={{ cityName: c.name, turnsAt: character.day.endsAt }} />
    </>
  );
  const tramBar = (className?: string, columns?: 2 | 4) =>
    qv && homeQuarters ? (
      // Slice 5 (screens §3.1): the quarter bar, every quarter, the current one inverted.
      <TramBar
        districts={homeQuarters.map((q) => ({ id: q.id, name: q.name, locked: !isOpen(q) }))}
        current={qv.id}
        onGo={(id) => goQuarter(id)}
        quarters={{ onLocked: (id) => setTeaser(id) }}
        className={className}
        columns={columns === 2 ? 2 : 3}
      />
    ) : district && districts ? (
      <TramBar
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
        current={district.id}
        onGo={(id) => goDistrict(id)}
        className={className}
        columns={columns}
      />
    ) : null;

  /** The share bar, captioned; a tap opens the plate's notes. */
  const shareBar = (
    <div
      className="flex cursor-pointer items-center gap-1.5 px-1 py-0.5 [@media(max-width:639px)_and_(max-height:700px)]:py-0"
      aria-hidden="true"
      onClick={() => plateHelp.current?.click()}
      data-testid="share-bar"
    >
      <span
        className={cx(
          'label-caps shrink-0 text-[8.5px] text-muted',
          // A phone shorter than 700 px keeps the bar alone (QA M2: every pin clear).
          !side && '[@media(max-width:639px)_and_(max-height:700px)]:hidden',
          helpMark,
        )}
      >
        {copy.help.shareCaption(c.name)}
      </span>
      <span className="flex h-1.5 flex-1 gap-px">
        {(['vanguard', 'collective', 'alliance'] as const).map((f) => (
          <span key={f} style={{ width: `${c.opinion[f]}%`, background: FACTION_STYLE[f].color }} />
        ))}
        <span style={{ width: `${c.opinion.neutral}%` }} className="bg-neutral" />
      </span>
    </div>
  );

  /** The home city's plate: over the map, or (sideways) the top of the city column. */
  const homePlate = (
    <>
      {/* Review 1 (answers §5): the one first-time hint, on the welcome day only. */}
      {character.welcomeDay && (
        <p
          // Not on a phone shorter than 700 px: there every line of the plate costs the map its
          // pins (QA M2); the labels still carry their dotted mark.
          className={cx(
            'border-b border-paper-2 bg-paper-2 px-3 py-0.5 font-body text-[12px] text-text-2 italic',
            !side && '[@media(max-width:639px)_and_(max-height:700px)]:hidden',
          )}
          data-testid="plate-hint"
        >
          {copy.help.firstHint}
        </p>
      )}
      <div className="flex items-stretch border-b-2 border-ink">
        {/* Slice 5 (screens §3.2): a quarter's way back to the city's overview. */}
        {qv && (
          <button
            type="button"
            onClick={() => goQuarter(null)}
            className="label-caps flex min-h-11 shrink-0 cursor-pointer items-center gap-1 border-r border-paper-2 px-2.5 text-[11px] font-semibold hover:bg-paper-2"
            data-testid="quarter-back"
            aria-label={`Back to ${c.name}`}
          >
            <span aria-hidden="true" className="font-label text-[16px] leading-none">
              ‹
            </span>
            {c.name}
          </button>
        )}
        <div className="relative flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2">
          {/* One tap target over the block (the heading stays a heading): the notes behind
              the share, the morale word and the ordinance line. */}
          <HelpButton
            notes={rival ? [copy.risk.help.rivalGround(), ...plateNotes] : plateNotes}
            label={`What the plate says about ${c.name}`}
            buttonRef={plateHelp}
            testId="plate-help"
            className="absolute inset-0 z-10 w-full bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
          />
          {/* Slice 5: the kicker. On rival ground *Duskwall · rival ground* (screens §8.3); in a
              quarter *Coalport · The Harbour* (screens §3.4). */}
          {(rival || qv) && (
            <span
              className={cx(
                'label-caps text-[9px]',
                rival
                  ? cx('font-semibold text-failure', helpMark)
                  : // A phone keeps the plate short: *‹ Coalport* and the heading say it already.
                    'hidden text-muted sm:block',
              )}
              data-testid={rival ? 'plate-rival' : 'quarter-subtitle'}
            >
              {rival
                ? copy.risk.rival.placeLine(c.name)
                : copy.risk.quarters.subtitle(c.name, qv!.name)}
            </span>
          )}
          <div className="flex items-baseline gap-2">
            <h1
              className={cx(
                'font-display leading-none font-black',
                qv ? 'text-[21px]' : 'text-[24px]',
              )}
              data-testid="plate-name"
            >
              {qv ? (
                qv.name
              ) : homeQuarter ? (
                // One quarter open (Levels 1–5): the city's name is the way to its overview, where the
                // other quarters' teasers are (above the plate's notes, which cover the block).
                <button
                  type="button"
                  onClick={() => goQuarter(null)}
                  className="relative z-20 -my-[10px] inline-flex min-h-11 cursor-pointer items-center gap-1 hover:underline"
                  data-testid="plate-overview"
                  aria-label={`${c.name}: its quarters`}
                >
                  {c.name}
                  <span aria-hidden="true" className="font-label text-[18px] font-normal">
                    ›
                  </span>
                </button>
              ) : (
                c.name
              )}
            </h1>
            {/* Slice 3 (screens §8): the morale word beside the name, Unrest in the failure
                colour; no extra line, so every pin stays clear on a small phone (QA M2). */}
            {c.morale && (
              <span
                className={cx(
                  'label-caps text-[9.5px] font-semibold',
                  helpMark,
                  c.morale.state === 'unrest' ? 'text-failure' : 'text-ink',
                )}
                data-testid="city-morale"
              >
                {copy.moraleWord[c.morale.state]}
              </span>
            )}
          </div>
          <span
            className="label-caps flex flex-wrap items-center gap-1.5 text-[9.5px] text-muted"
            data-testid="city-plate"
          >
            {c.role === 'home' ? 'Home city' : 'Close race'} ·
            <span className={cx('flex items-center gap-1.5', helpMark)}>
              <FactionCrest factionId={plateFaction} size={8} />{' '}
              {rival ? (names[plateFaction] ?? plateFaction) : character.factionName} {formatShare(share)} %
            </span>
          </span>
          {/* Slice 5 (screens §8.3): what your work here draws from, and Heat. */}
          {rival && (
            <span
              className={cx(
                'font-mono text-[11px] text-text-2',
                !side && '[@media(max-width:639px)_and_(max-height:700px)]:hidden',
              )}
              data-testid="plate-pressure"
            >
              {copy.risk.rival.drawsFrom(
                names[rival.homeFactionId] ?? rival.homeFactionId,
                rival.pressure.left.toFixed(1),
              )}
            </span>
          )}
          {rival && (
            <span className="font-mono text-[11px] text-text-2" data-testid="plate-heat">
              {copy.risk.heatLine(heat, heatWord(character.heat?.state ?? 'cool'))}
            </span>
          )}
          {/* The ordinance in force, one line that never wraps. Only on a very short phone
              (360 × 640) it gives way to the map; the tickets carry its tags there. */}
          {c.ordinance && (
            <span
              className={cx(
                'truncate font-mono text-[11px] whitespace-nowrap text-text-2',
                !side && '[@media(max-width:639px)_and_(max-height:700px)]:hidden',
                helpMark,
              )}
              data-testid="city-ordinance"
            >
              {copy.ordinanceLine(c.ordinance.name, c.ordinance.daysLeft)}
            </span>
          )}
          {/* Slice 4 (screens §9.1): this election's scoreboard line in the home city. */}
          {c.scoreboard?.mine && (
            <ScoreboardLine
              line={c.scoreboard.mine}
              factionName={character.factionName}
              className={cx(
                'text-text-2',
                !side && '[@media(max-width:639px)_and_(max-height:700px)]:hidden',
              )}
            />
          )}
        </div>
        <ReputationBlock city={c} />
      </div>
      {shareBar}
    </>
  );

  /** Slice 4 (screens §5.1, the user's lock): the capital's overview plate: the name, the city line. */
  const overviewPlate = (
    <div className="flex items-stretch border-b-2 border-ink">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h1 className="font-display text-[24px] leading-none font-black">{c.name}</h1>
          <span className="label-caps text-[9.5px] text-muted">{copy.capital.districts}</span>
        </div>
        <span className="font-mono text-[11px] text-text-2" data-testid="city-line">
          {copy.capital.cityLine(
            (['vanguard', 'collective', 'alliance'] as const).map(
              (f) => `${names[f] ?? f} ${formatShare((c.cityOpinion ?? c.opinion)[f])}`,
            ),
          )}
        </span>
        <span className="label-caps text-[9px] text-muted">{copy.capital.heldLegend}</span>
      </div>
      <ReputationBlock city={c} />
    </div>
  );

  /** The district plate's way back to the overview. */
  const districtBack = (
    <button
      type="button"
      onClick={() => goDistrict(null)}
      className={cx(
        'label-caps flex min-h-11 shrink-0 cursor-pointer items-center gap-1 border-paper-2 px-2.5 text-[11px] font-semibold hover:bg-paper-2',
        side ? 'flex-1' : 'border-r',
      )}
      data-testid="district-back"
      aria-label={`Back to ${c.name}`}
    >
      <span aria-hidden="true" className="font-label text-[16px] leading-none">
        ‹
      </span>
      {c.name}
    </button>
  );
  /** The plate's name block: *Visiting*, the district's name and its state (a tap opens the notes). */
  const districtTitle = district ? (
    <div
      className={cx(
        'relative flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-1.5',
        side && 'border-b-2 border-ink',
      )}
    >
      <HelpButton
        notes={plateNotes}
        label={`What the plate says about ${district.name}`}
        buttonRef={plateHelp}
        testId="plate-help"
        className="absolute inset-0 z-10 w-full bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
      />
      <span className="label-caps text-[9px] text-muted" data-testid="district-kicker">
        {district.you.resident ? copy.capital.youLiveHere : copy.capital.visiting}
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h1 className="font-display text-[21px] leading-none font-black" data-testid="district-name">
          {district.name}
        </h1>
        <span className={cx('label-caps text-[9.5px] font-semibold', helpMark)} data-testid="district-state">
          {districtStateWord(district, names)}
        </span>
      </div>
    </div>
  ) : null;

  /** Slice 4 (screens §5.2): a district's plate: back to the overview, the name, who holds it. */
  const districtPlate = district ? (
    <>
      {/* QA slice 4 M3: in the narrow side column (a phone held sideways) the way back and Reputation
          share the first row and the name takes the full width of the second, so nothing wraps into
          the next column. */}
      {side && (
        <div className="flex items-stretch border-b border-paper-2">
          {districtBack}
          <ReputationBlock city={c} />
        </div>
      )}
      {side && districtTitle}
      {!side && (
        <div className="flex items-stretch border-b-2 border-ink">
          {districtBack}
          {districtTitle}
          {/* A phone: where you live in the plate's corner (a tap opens the card); wider: reputation. */}
          {residenceCard ? (
            <>
              <button
                type="button"
                onClick={() => setResidenceOpen(true)}
                className="flex min-h-11 max-w-[42%] shrink-0 cursor-pointer flex-col items-end justify-center gap-0.5 border-l border-paper-2 px-3 py-1.5 text-right hover:bg-paper-2 sm:hidden"
                data-testid="residence-row"
              >
                <span className={cx('label-caps text-[9px] text-muted', helpMark)}>
                  {copy.residence.whereYouLive}
                </span>
                <span className="truncate font-label text-[13px]" data-testid="residence-corner">
                  {residenceCard.livesIn} ›
                </span>
              </button>
              <span className="hidden sm:flex">
                <ReputationBlock city={c} />
              </span>
            </>
          ) : (
            <ReputationBlock city={c} />
          )}
        </div>
      )}
      <div className="flex flex-col gap-0.5 px-3 pt-1 pb-1.5">
        <span className={cx('label-caps text-[8.5px] text-muted', helpMark)}>
          {copy.capital.whoHolds(district.name)}
        </span>
        <OpinionBars values={district.opinion} names={names} />
        {(comebackLine(district, names) || c.ordinance || district.issues[0] || district.scoreboard.mine) && (
          <div className="flex flex-col font-mono text-[11px] text-text-2 [@media(max-width:639px)_and_(max-height:700px)]:hidden">
            {comebackLine(district, names) && <span>{comebackLine(district, names)}</span>}
            {c.ordinance && (
              <span className="truncate" data-testid="district-rule">
                {copy.capital.councilRule(c.ordinance.name, c.ordinance.daysLeft)}
              </span>
            )}
            {district.issues[0] && (
              <span className="truncate" data-testid="district-issue-line">
                {issueLine(district.issues[0], names)}
              </span>
            )}
            {district.scoreboard.mine && (
              <ScoreboardLine
                line={{ ...district.scoreboard.mine, placeName: district.name }}
                factionName={character.factionName}
              />
            )}
          </div>
        )}
      </div>
    </>
  ) : null;

  const plate = district ? districtPlate : overview ? overviewPlate : homePlate;

  /** Slice 5 (screens §3.2): a home city's overview names, each with its lock line. */
  const quarterHotspots = (homeQuarters ?? []).map((q, i) => ({
    id: q.id,
    n: i + 1,
    name: q.name,
    map: q.label ?? { x: (q.frame.x0 + q.frame.x1) / 2, y: (q.frame.y0 + q.frame.y1) / 2 },
    pin: {
      style: 'name' as const,
      ...(isOpen(q) ? {} : { sub: quarterLockLine(q) ?? undefined }),
      marks: lastQuarter(c.id) === q.id && isOpen(q) ? (['here'] as const) : ([] as const),
    },
  }));

  // The map's pins: the overview's five district names; a district's or a home city's places.
  const hotspots = homeOverview
    ? quarterHotspots
    : overview
    ? districts!.map((d) => ({
        id: d.id,
        n: d.n,
        name: d.name,
        map: d.anchor,
        pin: {
          style: 'name' as const,
          // QA slice 4 M1: a narrow map draws the names compact (*Gov. Quarter*).
          short: copy.capital.tramShort[d.name],
          marks: [
            ...(d.you.resident ? (['residence'] as const) : []),
            ...(lastDistrict(c.id) === d.id ? (['here'] as const) : []),
          ],
        },
      }))
    : shownLocations.map((l) => ({
        ...l,
        pin: (l.issueIds?.length ?? 0) > 0 ? { marks: ['issue'] as const } : undefined,
      }));

  const sheetGround = groundFor(c, sheetPlace, names);
  const resultLocation = result ? c.locations.find((l) => l.id === result.place.locationId) : undefined;

  return (
    <div
      className={cx('relative flex h-full', !side && 'min-h-[420px]')}
      data-capital={districts ? (district ? 'district' : 'overview') : undefined}
      data-quarters={homeQuarters ? (homeOverview ? 'overview' : 'quarter') : undefined}
      data-quarter={homeQuarter?.id}
    >
      {/* Sideways (review 2 #3): the plate, the orders and the day in a column beside the map, which
          keeps the full height and no overlay. */}
      {side && (
        <aside
          className="flex shrink-0 flex-col overflow-y-auto overscroll-contain border-r-2 border-ink bg-paper text-ink"
          style={{ width: SIDE_W }}
          data-testid="city-side"
        >
          {plate}
          <div className="flex flex-col gap-1 px-3 pt-1.5 pb-2">
            {tramBar(undefined, 2)}
            {election('card')}
            {residenceFull()}
            {orders}
          </div>
        </aside>
      )}
      <CityMap
        className="h-full min-w-0 flex-1"
        map={c.map}
        tiles={tiles}
        // Maps v3: the city opens on its first quarter, a frame on its one picture; the capital's
        // overview is the whole picture, a district its own frame (the user's lock: held inside it).
        frame={
          district
            ? district.frame
            : overview || homeOverview
              ? undefined
              : (homeQuarter?.frame ?? c.quarters[0]?.frame)
        }
        // Map atmosphere (clouds by day, fog by night), where the city's content switches it on.
        clouds={c.clouds}
        isNight={c.isNight}
        locations={hotspots}
        selectedId={overview || homeOverview ? null : (loc ?? null)}
        onSelect={(id) => (overview ? goDistrict(id) : homeOverview ? pickQuarter(id) : select(id))}
        outlines={
          overview
            ? districts!.map((d) => ({ id: d.id, points: d.outline, label: d.name }))
            : homeOverview
              ? homeQuarters!.map((q) => ({ id: q.id, points: q.outline ?? [], label: q.name }))
              : undefined
        }
        onOutline={(id) => (homeOverview ? pickQuarter(id) : goDistrict(id))}
        focusOutline={
          district?.outline ?? (lockQuarter && homeQuarter?.outline?.length ? homeQuarter.outline : undefined)
        }
        lockToFrame={!!district || lockQuarter}
        cover={cover}
        onArrive={(id, { fillsMap }) => {
          setArrived(id);
          setLastPlace(id);
          setFillSheet(!fillsMap);
        }}
        // Review 3: the player's zoom and drag are kept for the session, per city (per district).
        memoryKey={district ? district.id : homeOverview ? `${c.id}:overview` : (qv?.id ?? c.id)}
        // Review 3: + / − under the Places button, on a desktop (a phone pinches and double-taps).
        zoomButtons={side ? undefined : 'top-[62px] right-2.5 hidden sm:pointer-fine:flex'}
      >
        {/* Sideways and from 640 px: the Places button in the map's top right corner (the plate is
            beside the map or in the top left one; the dock is at the bottom). */}
        {placesButton(side ? 'top-2.5 right-2.5' : 'top-2.5 right-2.5 hidden sm:flex')}
        {mapSwitch(side ? 'top-2.5 right-[124px]' : 'top-2.5 right-[124px] hidden sm:flex')}
        {!side && (
          <>
            {/* The city plate (the map's fitted view keeps every pin clear of it) */}
            <div
              className={cx(
                // Review 3: on a phone the plate runs edge to edge from the map's top (opaque), so the map's
                // art may stop short under it and a pin near the art's top edge comes out below it;
                // from 640 px it is a card in the top left corner.
                'pointer-events-none absolute top-0 right-0 left-0 flex flex-col gap-0 sm:top-2.5 sm:right-auto sm:left-2.5 sm:w-[420px]',
                // Upright phones: zoomed into a pin, the plate steps aside so the pin shows above its
                // sheet (review 2); it comes back with the fitted view.
                // Review 3: it fades with the sheet's movement rather than popping.
                'transition-[opacity,visibility] duration-300 ease-[cubic-bezier(0.33,0,0.2,1)] motion-reduce:duration-[120ms]',
                layout === 'sheet' && loc && 'invisible opacity-0',
              )}
              data-map-overlay="top"
              data-map-opaque=""
            >
              <div className="pointer-events-auto max-h-[calc(100dvh-180px)] overflow-y-auto bg-paper text-ink shadow-[0_0_0_1px_var(--color-ink),0_6px_16px_rgb(0_0_0/0.4)] sm:max-h-[calc(100dvh-220px)]">
                {plate}
                {/* Phones: the Election card folded to one 44 px line under the plate. On a phone
                    under 700 px tall it gives way to the map, like the ordinance line (QA M2: every
                    pin clear); the paper's row and the HQ card carry it there. */}
                {c.election && (
                  <div className="border-t border-paper-2 px-3 sm:hidden [@media(max-height:700px)]:hidden">
                    {election('compact')}
                  </div>
                )}
                {/* Slice 4: where you live, folded on a phone (a tap opens the card). */}
                {/* Slice 5: on rival ground the phone keeps the map's room (the card says only that
                    you can't live there; it shows from 640 px). */}
                {residenceRow && !district && !rival && <div className="sm:hidden">{residenceRow}</div>}
                <div className="hidden flex-col gap-1 px-3 pt-1.5 pb-2 sm:flex">
                  {tramBar()}
                  {election('card')}
                  {residenceFull()}
                  {orders}
                </div>
              </div>
            </div>
            {/* Phones: orders and today at the bottom of the map, edge to edge and opaque (review 3);
                in a district the tram bar above them. */}
            <div
              className="absolute inset-x-0 bottom-0 flex flex-col gap-1 border-t-2 border-ink bg-paper px-3 py-2 text-ink sm:hidden"
              data-map-overlay="bottom"
              data-map-opaque=""
            >
              {/* Phones held upright: the Places button just above the orders, at the right; the map
                  switch at the left. */}
              {placesButton('right-0 bottom-full mb-2')}
              {mapSwitch('left-0 bottom-full mb-2')}
              {tramBar('-mx-3 -mt-2 mb-1')}
              {/* QA slice 4 m7 (and M1 on a small phone): in the capital, a phone under 700 px tall
                  folds the orders to one line, so the map keeps a usable band between the plate and
                  the tram; a tap opens them in a sheet. */}
              <div
                className={cx(
                  'flex flex-col gap-1',
                  (districts || qv) && '[@media(max-height:700px)]:hidden',
                )}
              >
                {district || qv ? (
                  <OrdersList orders={character.orders} onPin={(id, orderId) => select(id, orderId)} />
                ) : (
                  orders
                )}
              </div>
              {(districts || qv) && (
                <button
                  type="button"
                  onClick={() => setOrdersOpen(true)}
                  className="-my-1 hidden min-h-11 w-full cursor-pointer items-center justify-between gap-2 text-left hover:bg-paper-2 [@media(max-height:700px)]:flex"
                  data-testid="orders-row"
                  aria-haspopup="dialog"
                >
                  <span className="label-caps text-[11px] font-semibold">{copy.ordersFold.title}</span>
                  <span className="font-label text-[13px]">
                    {copy.ordersFold.progress(
                      character.orders.items.filter((o) => o.done).length,
                      character.orders.items.length,
                    )}{' '}
                    <span aria-hidden="true">›</span>
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </CityMap>

      {/* Review 1 (§13.7): while the orders-complete note shows (the shell's), the sheet steps aside so
          the note is the one dialog; Carry on brings the sheet back. */}
      {sheetPlace && (
        <LocationSheet
          layout={layout}
          fill={fillSheet}
          open={sheetOpen}
          onOpenChange={(o) => {
            if (!o) select(null);
          }}
          n={sheetPlace.n}
          kindLabel={copy.kindLabel(sheetPlace.kind)}
          name={sheetPlace.name}
          blurb={sheetPlace.blurb}
          art={sheetPlace.art}
          ground={sheetGround}
          tags={character.rested > 0 ? [`Rested ${character.rested} · +50 % XP and Iron`] : []}
        >
          {energy.value < cheapest && <OutOfEnergyCard fullAt={character.energy.fullAt} waiting={waiting} />}
          {sheetPlace.actions.map((a) => (
            <Ticket
              key={a.id}
              action={a}
              energy={energy}
              highlight={!!orderHl && a.order?.id === orderHl}
              onPerform={(times) => perform({ actionId: a.id, locationId: sheetPlace.id }, times)}
              pending={
                action.isPending && action.variables?.actionId === a.id
                  ? (action.variables.times as 1 | 3)
                  : null
              }
              notice={action.variables?.actionId === a.id && !modalOpen ? noticeFor(action.error) : undefined}
              orderBonusPct={character.orders.rewards.matchFxpBonusPct}
            />
          ))}
          {/* Slice 5 (screens §4.1): the place's missions after its tickets, under a kicker. */}
          {(sheetPlace.missions?.length ?? 0) > 0 && (
            <section aria-label={copy.risk.missions} className="flex flex-col gap-2" data-testid="missions">
              <HelpButton
                notes={[copy.risk.help.mission()]}
                label={`${copy.risk.missions}: what they are`}
                className="-mb-1 w-full border-t-[3px] border-double border-ink pt-1"
              >
                <span className={cx('label-caps text-[11px] font-semibold', helpMark)}>{copy.risk.missions}</span>
              </HelpButton>
              {sheetPlace.missions!.map((m) => (
                <MissionTicket
                  key={m.id}
                  mission={m}
                  energy={energy}
                  names={names}
                  highlight={!!orderHl && m.order?.id === orderHl}
                  onChoose={() => {
                    missionStart.reset();
                    setBriefing({ mission: m, locationId: sheetPlace.id, placeName: sheetPlace.name });
                    setBriefingOpen(true);
                  }}
                  onAgain={() =>
                    m.remembered &&
                    missionStart.start({ locationId: sheetPlace.id, missionId: m.id, wayId: m.remembered })
                  }
                  pending={missionStart.isPending && missionStart.variables?.missionId === m.id}
                  notice={
                    missionStart.variables?.missionId === m.id && !modalOpen && !briefingOpen
                      ? noticeFor(missionStart.error)
                      : undefined
                  }
                  orderBonusPct={character.orders.rewards.matchFxpBonusPct}
                />
              ))}
            </section>
          )}
          {sheetPlace.council && (
            <ElectionCard
              summary={sheetPlace.council}
              onOpen={(route) => void navigate({ to: route })}
              now={now}
              factionNames={names}
            />
          )}
          {/* Slice 4 (screens §5.2): Central Station's trains, above the Porter's Jobs card. */}
          {sheetPlace.trains && (
            <TrainsCard
              trains={sheetPlace.trains}
              onBoard={travel.board}
              pendingCityId={travel.pendingTo}
              onNation={() => void navigate({ to: '/nation' })}
            />
          )}
          {travel.error && sheetPlace.trains && (
            <p role="status" className="font-body text-[13px] text-collective">
              {noticeFor(travel.error)}
            </p>
          )}
          <JobsCard
            jobs={sheetPlace.jobs}
            held={character.job ? character.job.seniority : null}
            pendingJobId={take.isPending ? take.variables?.jobId : null}
            message={jobMessage}
            onTake={(jobId) => {
              if (takeBusy.current) return;
              takeBusy.current = true;
              setJobMessage(null);
              take.mutate({ jobId, idempotencyKey: crypto.randomUUID() });
            }}
          />
        </LocationSheet>
      )}

      <PlacesList
        open={placesOpen && !overview && !homeOverview}
        onOpenChange={setPlacesOpen}
        cityName={district?.name ?? (qv ? copy.risk.quarters.subtitle(c.name, qv.name) : c.name)}
        places={places}
        // Exactly a tap on the pin: the map zooms to it, then its sheet opens (and `?loc=` is set).
        onPick={(id) => select(id)}
        // The Places button on show (there is one per layout; the others are hidden).
        returnFocusTo={() =>
          [...document.querySelectorAll<HTMLElement>('[data-testid="places-button"]')].find(
            (b) => b.offsetParent !== null,
          ) ?? null
        }
      />
      {/* Slice 5 (screens §3.2, §3.3): a home city's Quarters list and a locked quarter's teaser. */}
      {homeQuarters && (
        <QuartersList
          open={quartersOpen && homeOverview}
          onOpenChange={setQuartersOpen}
          cityName={c.name}
          quarters={homeQuarters}
          onPick={(id) => pickQuarter(id)}
          returnFocusTo={() =>
            [...document.querySelectorAll<HTMLElement>('[data-testid="places-button"]')].find(
              (b) => b.offsetParent !== null,
            ) ?? null
          }
        />
      )}
      {homeQuarters && (
        <QuarterTeaserSheet
          quarter={homeQuarters.find((q) => q.id === teaser) ?? null}
          open={teaser !== null}
          onOpenChange={(o) => {
            if (!o) setTeaser(null);
          }}
          level={character.level}
        />
      )}
      <MissionBriefing
        open={briefingOpen && !!briefing}
        onOpenChange={setBriefingOpen}
        mission={briefing ? (c.locations.find((l) => l.id === briefing.locationId)?.missions?.find((m) => m.id === briefing.mission.id) ?? briefing.mission) : null}
        placeName={briefing?.placeName ?? ''}
        energy={energy}
        onConfirm={(wayId) =>
          briefing && missionStart.start({ locationId: briefing.locationId, missionId: briefing.mission.id, wayId })
        }
        pending={missionStart.isPending}
        notice={briefingOpen && missionStart.error ? noticeFor(missionStart.error) : undefined}
      />
      {districts && (
        <DistrictsList
          open={districtsOpen}
          onOpenChange={setDistrictsOpen}
          districts={districts}
          names={names}
          onPick={(id) => goDistrict(id)}
        />
      )}

      {(districts || qv) && (
        <BottomSheet open={ordersOpen} onOpenChange={setOrdersOpen} title={copy.ordersFold.title}>
          <OrdersList
            orders={character.orders}
            onPin={(id, orderId) => {
              setOrdersOpen(false);
              select(id, orderId);
            }}
          />
          <TodayStrip today={character.today} help={{ cityName: c.name, turnsAt: character.day.endsAt }} />
        </BottomSheet>
      )}

      {/* Slice 4 (screens §6): where you live on a phone, the sheet before Register, the result. */}
      {residenceCard && (
        <BottomSheet open={residenceOpen} onOpenChange={setResidenceOpen} title={copy.residence.whereYouLive}>
          {residenceFull()}
          {act.error !== null && <Notice error={act.error} />}
        </BottomSheet>
      )}
      {residenceCard?.sheet && (
        <RegisterSheet
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          placeName={residencePlace}
          cost={residenceCard.cost}
          lines={residenceCard.sheet.lines}
          onRegister={register}
          pending={act.pending === 'register'}
        />
      )}
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />

      <ResultModal
        result={result}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAgain={
          result?.kind === 'mission' && result.again?.way
            ? () =>
                missionStart.start({
                  locationId: result.place.locationId,
                  missionId: result.action.id,
                  wayId: result.again!.way!.id,
                })
            : last
              ? (times) => perform(last, times)
              : undefined
        }
        againPending={
          missionStart.isPending
            ? 1
            : action.isPending
              ? ((action.variables?.times as 1 | 3 | undefined) ?? null)
              : null
        }
        onSentTo={() => {
          setModalOpen(false);
          void navigate({ to: '/held' });
        }}
        energy={energy}
        statPoints={{
          pending: character.statPointsPending,
          level: character.level,
          stats: { str: character.stats.str, int: character.stats.int, agi: character.stats.agi },
          guide: character.statGuide,
        }}
        onPlaceStat={stat.place}
        placing={stat.placing}
        trainingPlaces={trainingPlaces}
        ground={groundFor(c, resultLocation, names)}
        factionNames={names}
      />
    </div>
  );
}

/** *Issue: Tram Fare Hike · Collective leads 120 to 85* (screens §5.2), or *open* when nobody has points. */
function issueLine(i: DistrictView['issues'][number], names: Partial<Record<FactionId, string>>): string {
  const sorted = (Object.entries(i.momentum) as Array<[FactionId, number]>).sort((a, b) => b[1] - a[1]);
  if (!i.leader) return `${copy.capital.thisWeek(i.name)} · ${copy.issues.open}`;
  return copy.capital.issueLeads(
    i.name,
    names[i.leader] ?? i.leader,
    sorted[0]?.[1] ?? 0,
    sorted[1]?.[1] ?? 0,
  );
}

/** The plate's Reputation block (a tap opens its note). */
function ReputationBlock({ city: c }: { city: CityView }) {
  return (
    <HelpButton
      notes={[copy.help.standing(c.name)]}
      label="What Reputation means"
      testId="standing-help"
      className="flex flex-col items-end justify-center gap-0.5 border-l border-paper-2 px-3 py-2"
    >
      <span className={cx('label-caps text-[9px] text-muted', helpMark)}>Reputation</span>
      <span className="font-label text-[13px]" data-testid="city-standing">
        {c.standing.name}
        {c.standing.next !== null ? ` · ${c.standing.successes} / ${c.standing.next}` : ''}
      </span>
    </HelpButton>
  );
}

function Notice({ error }: { error: unknown }): ReactNode {
  const text = noticeFor(error);
  return text ? (
    <p role="status" className="font-body text-[13px] text-collective" data-testid="residence-notice">
      {text}
    </p>
  ) : null;
}
