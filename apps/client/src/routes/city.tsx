import { copy } from '@irongate/content/copy';
import type {
  ActionResult,
  CityView,
  DistrictView,
  FactionId,
  LocationView,
  MissionView,
  PatrolCardResult,
} from '@irongate/rules';
import { dayKey, dayStart } from '@irongate/rules';
import {
  BottomSheet,
  Button,
  CityMap,
  DistrictsList,
  ElectionCard,
  FACTION_STYLE,
  FactionCrest,
  HelpButton,
  IssueChip,
  JobsCard,
  JourneyCard,
  JourneyCardSheet,
  LodgingsCard,
  LocationSheet,
  LockedPinSheet,
  MissionBriefing,
  MissionTicket,
  OpinionBars,
  OrdersList,
  OutOfEnergyCard,
  PlacesList,
  RegisterSheet,
  missionLabel,
  missionLockText,
  missionRiskWord,
  ticketWay,
  ResidenceCard,
  ResultModal,
  TreatmentCard,
  ScoreboardLine,
  Ticket,
  TodayStrip,
  TrainsCard,
  TramBar,
  bboxOf,
  comebackLine,
  cx,
  districtStateWord,
  formatWhen,
  formatShare,
  groundOf,
  helpMark,
  pyramidFor,
  residenceLines,
  rivalHeaderLines,
  RivalHeader,
} from '@irongate/ui';
import type { Ground, WhatsHereBlocks } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DuskLine, duskNote } from '../components/DuskLine';
import { MapSwitch } from '../components/MapSwitch';
import { env } from '../env';
import { usePerformAction } from '../features/action/usePerformAction';
import type { PerformTarget } from '../features/action/usePerformAction';
import { usePoliticalAct } from '../features/council/usePoliticalAct';
import { noticeFor } from '../features/game/errors';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { CellsNow } from '../features/game/CellsNow';
import { TownHall } from '../features/council/TownHall';
import { trainingPlacesOf } from '../features/game/trainingPlaces';
import { useMissionStart } from '../features/street/useMissionStart';
import { useBoard } from '../features/travel/useBoard';
import { setResultModalOpen } from '../lib/modalGate';
import { gameErrorOf, isNetworkError, trpc, trpcClient } from '../lib/trpc';
import { useNightTurn } from '../lib/useNightTurn';
import { useLocationLayout, useMedia, useNow } from '../lib/useNow';

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
  const { loc, order: orderHl, places: placesSearch, act: actHl } = useSearch({ from: '/app/city/$cityId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const city = useQuery(trpc.city.get.queryOptions({ cityId }));
  // Review 5 (ADR 0079): at dusk and dawn (+ up to 20 s) the view is read again: art, tickets, plate.
  useNightTurn(city.data?.night, [trpc.city.get.queryKey({ cityId })]);
  const stat = usePlaceStat();
  const layout = useLocationLayout();
  // The Election card's countdown, on the server's clock (a wrong phone clock never miscounts).
  const now = useNow(60_000);
  const side = layout === 'side';
  // Review 5 (answers §10.2): on a phone under 700 px tall the rival goal line folds into the push note.
  const shortPhone = useMedia('(max-width: 639px) and (max-height: 700px)');
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
  // Slice 5 (screens §4): a mission's briefing and its start.
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
  // Review 4 (ADR 0076): a home city's greyed pin, its short sheet (no zoom on the tap).
  const [lockedId, setLockedId] = useState<string | null>(null);
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
      const at = formatWhen(r.outcome.firstPayAt);
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

  // Review 5 (ADR 0081): the night patrol's card. It waits over the map until a row is tapped; its
  // outcome stays (from the answer, while the view no longer carries the card) until *Continue*.
  const [patrolDone, setPatrolDone] = useState<PatrolCardResult | null>(null);
  const lastPatrol = useRef<NonNullable<CityView['patrol']> | null>(null);
  if (city.data?.patrol) lastPatrol.current = city.data.patrol;
  const patrolBusy = useRef(false);
  const patrol = useMutation({
    ...trpc.patrol.answer.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      setPatrolDone(r);
    },
    // NO_PATROL: answered in another window; the view is read again and the card goes.
    onError: () => void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() }),
    onSettled: () => {
      patrolBusy.current = false;
    },
  });
  const answerPatrol = (choiceId: string) => {
    if (patrolBusy.current) return;
    patrolBusy.current = true;
    patrol.mutate({ choiceId, idempotencyKey: crypto.randomUUID() });
  };
  const closePatrol = () => {
    setPatrolDone(null);
    patrol.reset();
    void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() });
  };

  const c0 = city.data;
  const districts = c0?.districts && c0.districts.length > 0 ? c0.districts : null;
  const district: DistrictView | null =
    districts && params.quarterId ? (districts.find((d) => d.id === params.quarterId) ?? null) : null;
  // The capital remembers the last district viewed for this session (the index route and the Map
  // tab open on it; the overview marks it).
  useEffect(() => {
    if (district) rememberDistrict(cityId, district.id);
  }, [cityId, district]);

  // Review 4 (answers §21, ADR 0076): a home city is one map. Its old quarter routes
  // (`/city/{id}/overview`, `/city/{id}/{quarter}`) land on `/city/{id}`, keeping `?loc`.
  const homeCity = !!c0 && !districts;
  useEffect(() => {
    if (homeCity && params.quarterId)
      void navigate({ to: '/city/$cityId', params: { cityId }, search: loc ? { loc } : {}, replace: true });
  }, [homeCity, params.quarterId, cityId, loc, navigate]);
  const currentQuarterId = district?.id ?? null;
  // Answers §21.3 (review 4, ADR 0076): a home city is one map. At rest it frames its first quarter's
  // places (their box grown by 0.06, as the first quarters' frames were, so they keep 44 px apart and
  // clear of the plate, QA M2); a drag reaches every pin, the greyed ones included, and a pin from
  // `?loc` (a train lands on the Town Hall's) zooms in from there. The player's own view is kept
  // (`memoryKey`). Not a lock: the view is free.
  const homeRest = useMemo(() => {
    // The Town Hall is left out of the box (a drag away), as are the places a Level opens: the view is
    // the one slices 1–5 checked at every size; the rest of the city is a drag or the Places list away.
    if (!c0 || districts) return null;
    const first = c0.quarters[0]?.id;
    const rest = c0.locations.filter((l) => l.quarterId === first && !l.hall);
    if (rest.length === 0) return null;
    const xs = rest.map((l) => l.map.x);
    const ys = rest.map((l) => l.map.y);
    const g = (v: number) => Math.min(1, Math.max(0, v));
    return {
      ids: rest.map((l) => l.id),
      frame: {
        x0: g(Math.min(...xs) - 0.06),
        y0: g(Math.min(...ys) - 0.06),
        x1: g(Math.max(...xs) + 0.06),
        y1: g(Math.max(...ys) + 0.06),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c0?.id, c0?.locations.map((l) => l.id).join(), !!districts]);

  // On a train no city is open (IN_TRANSIT): the journey; standing elsewhere: the city you are in.
  const refusal = city.isError ? gameErrorOf(city.error)?.reason : undefined;
  useEffect(() => {
    if (refusal === 'IN_TRANSIT') void navigate({ to: '/journey', replace: true });
    else if (refusal === 'WRONG_CITY' && character)
      void navigate({ to: '/city/$cityId', params: { cityId: character.cityId }, replace: true });
  }, [refusal, character, navigate]);

  /**
   * Open a pin's sheet; from a Party order (review 1), its matching tickets are marked; review 5
   * (*What's here*): `act`, the ticket or mission the row named, highlighted and scrolled to.
   */
  const select = (id: string | null, orderId?: string, act?: string) => {
    setJobMessage(null);
    action.reset();
    // The capital shows one district's places (the user's lock): an order's pin for a place in another
    // district, or on the overview, opens that district, then the place (slice-4 fixes §3). A home
    // city is one map (review 4).
    const into = districts && id ? c0?.locations.find((l) => l.id === id)?.quarterId : undefined;
    if (into && into !== currentQuarterId) {
      void navigate({
        to: '/city/$cityId/$quarterId',
        params: { cityId, quarterId: into },
        search: { loc: id!, ...(orderId ? { order: orderId } : {}), ...(act ? { act } : {}) },
      });
      return;
    }
    void navigate({
      to: '.',
      search: id ? { loc: id, ...(orderId ? { order: orderId } : {}), ...(act ? { act } : {}) } : {},
      replace: true,
    });
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
  // The pins on show: a district's own (the user's lock: only its), none on the overview, a home
  // city's every open place (review 4: one map; its locked places are greyed pins, `lockedPins`).
  const shownLocations = district
    ? c.locations.filter((l) => l.quarterId === district.id)
    : overview
      ? []
      : c.locations;
  const lockedPins = districts ? [] : (c.lockedPins ?? []);
  const lockedPin = lockedPins.find((p) => p.id === lockedId) ?? null;
  const hallPlace = c.locations.find((l) => l.hall);
  // Slice 5 (screens §8.3): rival ground, the home faction whose morale your work draws from.
  const rival = c.rivalGround ?? null;
  const location: LocationView | undefined = shownLocations.find((l) => l.id === loc);
  /** What the sheet shows: the open place, or (closing) the last one. */
  const sheetPlace: LocationView | undefined = location ?? shownLocations.find((l) => l.id === lastPlace);
  // Review 5 (ADR 0081): the patrol's card shown (waiting, or answered until Continue).
  const patrolShown = c.patrol ?? (patrolDone ? lastPatrol.current : null);
  const sheetOpen =
    !!location && arrived !== null && !(character.orders.complete && !modalOpen) && !patrolShown;
  // ADR 0024: the map as tiles where a tile origin is set (dev: the local cache), else the stills.
  const dayTiles = pyramidFor(c.map.day, env.tilesOrigin);
  const nightTiles = pyramidFor(c.map.night, env.tilesOrigin);
  const tiles = dayTiles && nightTiles ? { day: dayTiles, night: nightTiles } : null;
  const energy = { value: character.energy.value, nextTickAt: character.energy.nextTickAt };
  const share = c.homeFactionId ? c.opinion[c.homeFactionId] : c.opinion[character.factionId];
  // The plate's party: your own at home, the home party on rival ground (its morale).
  const plateFaction: FactionId = rival ? rival.homeFactionId : character.factionId;
  // Review 5 (answers §10.2, ADR 0082): the rival header's words (the push, the danger, the goal).
  const rivalInput = rival
    ? {
        rival,
        cityName: c.name,
        names,
        mine: character.factionId,
        now,
        dayTurnAt: dayStart(dayKey(now) + 1),
      }
    : null;
  const rivalLines = rivalInput ? rivalHeaderLines(rivalInput) : null;
  const foldGoal = !side && shortPhone;
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
        ...(c.ordinance ? [copy.help.ordinance(6, 10)] : []),
      ]
    : [
        copy.help.share(c.name),
        ...(c.morale ? [copy.help.morale()] : []),
        // QA m4: the capital's overview passes a rule with six of ten too.
        ...(c.ordinance ? [districts ? copy.help.ordinance(6, 10) : copy.help.ordinance(4, 7)] : []),
      ];

  // Review 3: the Places list, in pin order, with a tag where an open Party order points (the same
  // pins the orders list links to); slice 4: and the Issue mark where work is tagged.
  // Review 4 #14: the Issue's name for its chip (the city's Issues, or the capital districts').
  const issueName = (id: string | undefined): string | null =>
    id === undefined
      ? null
      : (c.issues?.find((i) => i.issueId === id)?.name ??
        c.districts?.flatMap((d) => d.issues).find((i) => i.issueId === id)?.name ??
        c.locations
          .flatMap((l) => l.actions.flatMap((a) => a.placeTags ?? []))
          .flatMap((t) => (t.kind === 'issue' && t.issueId === id ? [t.name] : []))[0] ??
        null);
  const orderAt = new Set(
    character.orders.items.flatMap((o) => (!o.done && o.pin ? [o.pin.locationId] : [])),
  );
  const placeRow = (l: LocationView) => ({
    id: l.id,
    n: l.n,
    name: l.name,
    blurb: l.blurb,
    order: orderAt.has(l.id),
    issue: issueName(l.issueIds?.[0]),
  });
  const places = shownLocations.map(placeRow);
  // Review 4 (answers §21.2, §29 Q10): a home city's Places list is grouped by quarter in pin order,
  // each header with its lock line; the Town Hall closes the first open group whatever quarter it is
  // painted in; the greyed places close their own group.
  const firstOpen = c.quarters.find((q) => q.open !== false)?.id;
  const placeGroups = districts
    ? undefined
    : c.quarters.map((q) => ({
        id: q.id,
        title: copy.places.group(q.name, q.open === false ? (q.lock ?? null) : null),
        blurb: q.blurb ?? null,
        places: [
          ...c.locations
            .filter((l) => l.quarterId === q.id && !l.hall)
            .sort((a, b) => a.n - b.n)
            .map(placeRow),
          ...(q.id === firstOpen ? c.locations.filter((l) => l.hall).map(placeRow) : []),
          ...lockedPins
            .filter((x) => x.quarterId === q.id)
            .map((x) => ({ id: x.id, n: 0, name: x.name, blurb: '', locked: copy.map.lockedPlace(x.lock) })),
        ],
      }));
  // Review 5 (answers §9.2, tech design §9.2): *What's here* above the places, for the city (or the
  // capital's district the list is opened on): its Issues, the missions to start, the orders here.
  const hereIds = new Set(shownLocations.map((l) => l.id));
  const issueRows = district
    ? district.issues.map((i) => ({ ...i, id: i.issueId }))
    : (c.issues ?? []).map((i) => ({ ...i, id: i.issueId }));
  const wh = district?.whatsHere ?? (districts ? undefined : c.whatsHere);
  const missionsHere = (wh?.missions ?? []).flatMap((row) => {
    const place = shownLocations.find((l) => l.id === row.locationId);
    const m = place?.missions?.find((x) => x.id === row.missionId);
    if (!place || !m) return [];
    const way = ticketWay(m);
    const label = missionLabel(m, names).replace(/^Mission · /, '');
    const odds = way ? copy.odds.band(way.preview.chance) : '';
    const risk = m.risk.runInChance > 0 ? missionRiskWord(m.risk.runInChance).word : null;
    return [
      {
        id: m.id,
        title: m.name,
        line: copy.whatsHere.missionLine(label, place.name, odds, risk, m.energy),
        lock: row.night ? missionLockText(m) : null,
        onPick: () => select(place.id, undefined, m.id),
      },
    ];
  });
  const moreGroups = wh?.more ?? [];
  const firstLevel = moreGroups.find((g) => g.gate === 'level')?.need ?? null;
  const moreLine =
    missionsHere.length > 0
      ? moreGroups.length > 0
        ? copy.whatsHere.more(moreGroups)
        : null
      : firstLevel !== null
        ? copy.whatsHere.none(firstLevel)
        : moreGroups.length > 0
          ? copy.whatsHere.more(moreGroups)
          : copy.whatsHere.none(null);
  const ordersHere = character.orders.items.filter((o) => !o.done && o.pin && hereIds.has(o.pin.locationId));
  const whatsHere: WhatsHereBlocks | undefined = overview
    ? undefined
    : {
        issues: issueRows.map((i) => {
          // The first place the Issue tags, its first tagged ticket highlighted (the order-pin pattern).
          const place = shownLocations.find((l) => l.issueIds?.includes(i.issueId));
          const act = place?.actions.find((a) =>
            (a.placeTags ?? []).some((t) => t.kind === 'issue' && t.issueId === i.issueId),
          );
          const top = i.leader ? (i.momentum[i.leader] ?? 0) : 0;
          return {
            id: i.issueId,
            name: i.name,
            line: copy.whatsHere.issueLine(i.leader ? (names[i.leader] ?? i.leader) : null, top),
            onPick: place ? () => select(place.id, undefined, act?.id) : null,
          };
        }),
        missions: missionsHere,
        moreLine,
        orders: character.orders.off
          ? { line: copy.orders.off }
          : character.orders.away
            ? { line: copy.orders.away(character.orders.away.cityName, character.orders.away.done, character.orders.away.of) }
            : character.orders.allDone
              ? { line: copy.whatsHere.allDone }
              : ordersHere.length > 0
                ? {
                    rows: ordersHere.map((o) => ({
                      id: o.id,
                      title: o.title,
                      line: copy.whatsHere.orderLine(o.progress, o.target),
                      onPick: () => select(o.pin!.locationId, o.id),
                    })),
                  }
                : { line: copy.whatsHere.noOrders },
      };

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
        onClick={() => (overview ? setDistrictsOpen(true) : setPlacesOpen(true))}
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
        {overview ? copy.capital.districts : copy.whatsHere.button}
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
  const trainingPlaces = trainingPlacesOf(c);

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
  // Review 4 #9 (answers §9.3): the bed is taken at the place with the Lodgings card.
  const takeRoom = (locationId: string) =>
    void act.run('room', (k) => trpcClient.residence.room.mutate({ locationId, idempotencyKey: k }));
  // Review 5 (answers §8): *Get patched up* at an infirmary; the server charges its own price.
  const treat = (locationId: string) =>
    void act.run('treat', (k) => trpcClient.character.treat.mutate({ locationId, idempotencyKey: k }));
  const residenceFull = (className?: string) =>
    residenceCard ? (
      <ResidenceCard
        card={residenceCard}
        placeName={residencePlace}
        rank2Title={rank2}
        onRegister={() => setRegisterOpen(true)}
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
    district && districts ? (
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

  /**
   * Review 4 (answers §11.3): the council's rule, said by its effect (*Council rule: Reading Room
   * Grant · studying costs a fifth less · 3 days left*); a tap opens the Town Hall's sheet. One line
   * that never wraps; its tap target reaches 44 px without growing the plate.
   */
  const ruleLine = (testId: string, className?: string) =>
    c.ordinance ? (
      <button
        type="button"
        onClick={() => hallPlace && select(hallPlace.id)}
        disabled={!hallPlace}
        className={cx(
          "relative z-20 min-w-0 cursor-pointer truncate text-left font-mono text-[11px] whitespace-nowrap text-text-2 underline decoration-dotted underline-offset-2 after:absolute after:inset-x-0 after:-inset-y-[16px] after:content-[''] hover:text-ink disabled:cursor-default disabled:no-underline",
          // A phone held sideways: the plate is in the scrolling side column; the line itself is 44 px.
          side && 'min-h-11 leading-[44px] after:hidden',
          className,
        )}
        data-testid={testId}
        aria-label={`${copy.plate.rule(c.ordinance.name, c.ordinance.plainLine ?? c.ordinance.effectLine, c.ordinance.daysLeft)}. Open ${hallPlace?.ref ?? 'the Town Hall'}`}
      >
        {copy.plate.rule(c.ordinance.name, c.ordinance.plainLine ?? c.ordinance.effectLine, c.ordinance.daysLeft)}
      </button>
    ) : null;

  /**
   * QA m1 (fix round): on a phone under 700 px tall the rule's row folds to keep the map's pins clear,
   * so the dusk line moves beside the plate's name, in two short lines (the plate keeps its height).
   */
  const stackedDusk = shortPhone && !side;

  /**
   * Review 5 (answers §11.3): the town's dusk or dawn shares the rule's line (the rule truncates first),
   * so the plate grows by no line where a rule is in force and every pin stays clear.
   */
  const ruleAndDusk = (testId: string, button: boolean, className?: string) => (
    <div
      className={cx(
        'flex min-w-0 font-mono text-[11px] text-text-2',
        // Sideways the plate is the scrolling side column: two lines, the rule's a full 44 px target.
        side ? 'flex-col items-start' : 'items-center gap-x-1.5',
        className,
      )}
    >
      {c.ordinance && ruleLine(testId, side ? 'max-w-full' : 'min-w-11 flex-1')}
      {c.ordinance && !side && <span aria-hidden="true">·</span>}
      {/* QA m1: on a phone under 700 px tall the line is beside the plate's name instead (`stackedDusk`). */}
      {!stackedDusk && <DuskLine night={c.night} button={button} className="shrink-0" />}
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
        <div className="relative flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2">
          {/* One tap target over the block (the heading stays a heading): the notes behind
              the share, the morale word and the ordinance line. */}
          <HelpButton
            notes={[
              // Review 5 (answers §10.2): the push, the danger and the goal's notes; on a short phone
              // the goal line's words ride the push note.
              // The push note opens with today's whole line (the split by party truncates on a phone).
              ...(rival && rivalLines
                ? [
                    [
                      copy.risk.help.push()[0]!,
                      [rivalLines.push, copy.risk.help.push()[1], ...(foldGoal ? [rivalLines.goal] : [])].join('\n'),
                    ],
                    copy.risk.help.rivalGround(),
                    // The goal's whole sentence opens the Unrest note (a phone's plate shows its short form).
                    [copy.risk.help.unrest()[0]!, `${rivalLines.goal}\n${copy.risk.help.unrest()[1]}`],
                  ]
                : []),
              ...plateNotes,
              // Review 5: the dusk line's note, and after dark on rival ground the patrols'.
              duskNote(now),
              ...(rival && c.night.night ? [copy.help.patrols()] : []),
            ]}
            label={`What the plate says about ${c.name}`}
            buttonRef={plateHelp}
            testId="plate-help"
            className="absolute inset-0 z-10 w-full bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
          />
          {/* Slice 5: the kicker on rival ground, *Duskwall · rival ground* (screens §8.3). At home the
              plate's line already says *Home city* (review 4: no quarter subtitle any more). */}
          {rival && (
            <span className={cx('label-caps text-[9px] font-semibold text-failure', helpMark)} data-testid="plate-rival">
              {copy.risk.rival.placeLine(c.name)}
            </span>
          )}
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-[24px] leading-none font-black" data-testid="plate-name">
              {c.name}
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
            {stackedDusk && <DuskLine night={c.night} button={false} stacked className="ml-auto self-center" />}
          </div>
          <span
            className={cx(
              // QA review 4 (nit): the dot between the two parts is drawn before the second, in the
              // gap; when the line wraps the second part starts the new line and its dot is clipped
              // off (no *HOME CITY ·* left dangling).
              'label-caps flex flex-wrap items-center gap-x-3.5 gap-y-1 overflow-hidden text-[9.5px] text-muted',
              // QA m7 (QA fixes §6): on rival ground under 700 px tall the morale line folds, not the
              // pressure line.
              rival && !side && '[@media(max-width:639px)_and_(max-height:700px)]:hidden',
            )}
            data-testid="city-plate"
          >
            <span>{c.role === 'home' ? 'Home city' : 'Close race'}</span>
            <span
              className={cx(
                "relative flex items-center gap-1.5 before:absolute before:-left-[9px] before:content-['·']",
                helpMark,
              )}
            >
              <FactionCrest factionId={plateFaction} size={8} />{' '}
              {rival ? (names[plateFaction] ?? plateFaction) : character.factionName} {formatShare(share)} %
            </span>
          </span>
          {/* Review 5 (answers §10.2, §16.1, ADR 0082): the rival header replaces slice 5's *draws from*
              and Heat lines: the push bar (at every size, QA m7), the danger word (patrols at night) and
              the goal, which folds into the push note on a phone under 700 px tall. */}
          {rivalInput && (
            <RivalHeader
              input={rivalInput}
              foldGoal={cx(!side && '[@media(max-width:639px)_and_(max-height:700px)]:hidden')}
              narrow={side}
            />
          )}
          {/* The ordinance in force, one line that never wraps. Only on a very short phone
              (360 × 640) it gives way to the map; the tickets carry its tags there. Review 4 (answers
              §11.3): it says the effect, and a tap opens the Town Hall (above the plate's notes). */}
          {/* Review 5 (answers §11.3): the town's dusk or dawn after the rule, on its line; folded with
              it on a very short phone, where the dusk line moves beside the name (QA m1). */}
          {ruleAndDusk(
            'city-ordinance',
            false,
            cx(!side && '[@media(max-width:639px)_and_(max-height:700px)]:hidden'),
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
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <span className="label-caps text-[9px] text-muted">{copy.capital.heldLegend}</span>
          {/* Review 5 (answers §11.3): the town's dusk or dawn. */}
          <DuskLine night={c.night} />
        </div>
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
        {/* QA m1: on a phone under 700 px tall the block with the rule folds; the dusk line rides on
            the right of this row instead (the plate keeps its height). */}
        <div className="flex items-baseline justify-between gap-x-2">
          <span className={cx('label-caps min-w-0 truncate text-[8.5px] text-muted', helpMark)}>
            {copy.capital.whoHolds(district.name)}
          </span>
          {stackedDusk && <DuskLine night={c.night} button={false} className="shrink-0" />}
        </div>
        <OpinionBars values={district.opinion} names={names} />
        {/* Review 5 (answers §11.3): the town's dusk or dawn on the district's plate, on the rule's line. */}
        <div className="flex flex-col font-mono text-[11px] text-text-2 [@media(max-width:639px)_and_(max-height:700px)]:hidden">
          {comebackLine(district, names) && <span>{comebackLine(district, names)}</span>}
          {ruleAndDusk('district-rule', true)}
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
      </div>
    </>
  ) : null;

  const plate = district ? districtPlate : overview ? overviewPlate : homePlate;

  // The map's pins: the overview's five district names; a district's or a home city's places, and (a
  // home city, review 4) its greyed pins after them.
  const hotspots = overview
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
    : [
        ...shownLocations.map((l) => ({
          ...l,
          pin: (l.issueIds?.length ?? 0) > 0 ? { marks: ['issue'] as const } : undefined,
        })),
        ...lockedPins.map((x) => ({
          id: x.id,
          n: 0,
          name: x.name,
          map: x.map,
          pin: { marks: ['locked'] as const, sub: copy.map.lockedPlace(x.lock) },
        })),
      ];

  const sheetGround = groundFor(c, sheetPlace, names);
  const resultLocation = result ? c.locations.find((l) => l.id === result.place.locationId) : undefined;

  return (
    <div
      className={cx('relative flex h-full', !side && 'min-h-[420px]')}
      data-capital={districts ? (district ? 'district' : 'overview') : undefined}
      data-home-map={districts ? undefined : 'one'}
    >
      {/* Sideways (review 2 #3): the plate, the orders and the day in a column beside the map, which
          keeps the full height and no overlay. Review 4: positioned, so a done order's absolute mark
          scrolls inside the column instead of growing the page (the favour is done in the first minute). */}
      {side && (
        <aside
          className="relative flex shrink-0 flex-col overflow-y-auto overscroll-contain border-r-2 border-ink bg-paper text-ink"
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
        // Maps v3: the capital's overview is the whole picture, a district its own frame (the user's
        // lock: held inside it). Review 4 (ADR 0076): a home city is one picture, at rest on its open
        // places' box (`homeRest`); a drag reaches every pin, the greyed ones included.
        frame={district ? district.frame : (homeRest?.frame ?? undefined)}
        restFocus={homeRest?.ids}
        // Map atmosphere (clouds by day, fog by night), where the city's content switches it on.
        clouds={c.clouds}
        isNight={c.night.night}
        locations={hotspots}
        selectedId={overview ? null : (loc ?? null)}
        onSelect={(id) =>
          overview ? goDistrict(id) : lockedPins.some((x) => x.id === id) ? setLockedId(id) : select(id)
        }
        outlines={overview ? districts!.map((d) => ({ id: d.id, points: d.outline, label: d.name })) : undefined}
        onOutline={(id) => goDistrict(id)}
        focusOutline={district?.outline}
        lockToFrame={!!district}
        // Review 4 (answers §8.3, ADR 0076): inside a district the drag reaches its whole outline.
        panLimit={district ? bboxOf(district.outline) : undefined}
        cover={cover}
        onArrive={(id, { fillsMap }) => {
          setArrived(id);
          setLastPlace(id);
          setFillSheet(!fillsMap);
        }}
        // Review 3: the player's zoom and drag are kept for the session, per city (per district).
        memoryKey={district ? district.id : c.id}
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
                  // Review 4 #13: away, the orders are one quiet line: nothing to fold.
                  districts && !character.orders.away && '[@media(max-height:700px)]:hidden',
                )}
              >
                {district ? (
                  <OrdersList orders={character.orders} onPin={(id, orderId) => select(id, orderId)} />
                ) : (
                  orders
                )}
              </div>
              {districts && !character.orders.away && (
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
            // QA m8: with the briefing open over the sheet, an Escape (or an outside tap) that reaches
            // the sheet closes the briefing, never the sheet under it. Two Radix layers race for the
            // Escape in the production build when the sheet's layer registers after the briefing's.
            if (!o && briefingOpen) {
              setBriefingOpen(false);
              return;
            }
            if (!o) select(null);
          }}
          n={sheetPlace.n}
          kindLabel={copy.kindLabel(sheetPlace.kind)}
          name={sheetPlace.name}
          blurb={sheetPlace.blurb}
          art={sheetPlace.art}
          ground={sheetGround}
          tags={character.rested > 0 ? [`Rested ${character.rested} · +50 % XP and Iron`] : []}
          chips={
            issueName(sheetPlace.issueIds?.[0]) ? <IssueChip name={issueName(sheetPlace.issueIds?.[0])!} /> : null
          }
          // Review 4 (tech design §3.1): the place's cards, in the slot's fixed order. Jobs first; the
          // Lodgings, *In the cells now* and the Town Hall's blocks follow in their phases.
          cards={[
            <JobsCard
              key="jobs"
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
            />,
            sheetPlace.lodgings ? (
              <LodgingsCard
                key="lodgings"
                lodgings={sheetPlace.lodgings}
                onTake={() => takeRoom(sheetPlace.id)}
                pending={act.pending === 'room'}
                notice={act.pending === null && act.error !== null ? noticeFor(act.error) : null}
              />
            ) : null,
            sheetPlace.cellsHere ? (
              <CellsNow key="cells-now" locationId={sheetPlace.id} open={sheetOpen} factionNames={names} />
            ) : null,
            // Review 5 (tech design §3.5): Jobs · Lodgings · *In the cells now* · Treatment · the hall.
            sheetPlace.treatment ? (
              <TreatmentCard
                key="treatment"
                carer={sheetPlace.treatment.carer}
                health={character.health}
                iron={character.iron}
                now={now}
                onTreat={() => treat(sheetPlace.id)}
                pending={act.pending === 'treat'}
                notice={act.pending === null && act.error !== null ? noticeFor(act.error) : null}
              />
            ) : null,
            // Review 4 (answers §11.2, ADR 0077): the Town Hall's blocks after its ticket.
            sheetPlace.hall ? (
              <TownHall
                key="town-hall"
                cityId={c.id}
                enabled={sheetOpen}
                names={names}
                factionId={character.factionId}
                onWhereToAct={() => setPlacesOpen(true)}
              />
            ) : null,
          ]}
        >
          {energy.value < cheapest && <OutOfEnergyCard fullAt={character.energy.fullAt} waiting={waiting} />}
          {sheetPlace.actions.map((a) => (
            <Ticket
              key={a.id}
              action={a}
              energy={energy}
              highlight={(!!orderHl && a.order?.id === orderHl) || a.id === actHl}
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
                  highlight={(!!orderHl && m.order?.id === orderHl) || m.id === actHl}
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
        </LocationSheet>
      )}

      {patrolShown && (
        // Review 5 (ADR 0081, tech design §8.4): no dim-tap, Escape or Close while it waits; the tab
        // bar still works and the Map tab comes back to it. Answered: the outcome and *Continue*.
        <JourneyCardSheet
          title={copy.patrol.sheetTitle(c.name)}
          onClose={patrolDone ? closePatrol : undefined}
          closeLabel={copy.patrol.continue}
          testId="patrol-sheet"
        >
          <JourneyCard
            card={{ ...patrolShown.card, chosen: patrolDone }}
            kicker={patrolShown.kicker}
            onChoose={answerPatrol}
            pendingChoiceId={patrol.isPending ? (patrol.variables?.choiceId ?? null) : null}
          />
          {patrol.error && (
            <p role="status" className="font-body text-[13px] text-collective">
              {noticeFor(patrol.error)}
            </p>
          )}
        </JourneyCardSheet>
      )}
      <PlacesList
        open={placesOpen && !overview}
        onOpenChange={setPlacesOpen}
        cityName={district?.name ?? c.name}
        places={places}
        groups={placeGroups}
        whatsHere={whatsHere}
        // Exactly a tap on the pin: the map zooms to it, then its sheet opens (and `?loc=` is set); a
        // greyed one opens its short sheet.
        onPick={(id) => (lockedPins.some((x) => x.id === id) ? setLockedId(id) : select(id))}
        // The Places button on show (there is one per layout; the others are hidden).
        returnFocusTo={() =>
          [...document.querySelectorAll<HTMLElement>('[data-testid="places-button"]')].find(
            (b) => b.offsetParent !== null,
          ) ?? null
        }
      />
      {/* Review 4 (answers §21.4): a greyed pin's short sheet: its quarter, its lock, the Level. */}
      <LockedPinSheet
        pin={
          lockedPin
            ? {
                name: lockedPin.name,
                lock: lockedPin.lock,
                quarter: {
                  name: c.quarters.find((q) => q.id === lockedPin.quarterId)?.name ?? '',
                  blurb: c.quarters.find((q) => q.id === lockedPin.quarterId)?.blurb ?? null,
                },
              }
            : null
        }
        open={lockedPin !== null}
        onOpenChange={(o) => {
          if (!o) setLockedId(null);
        }}
        level={character.level}
      />
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

      {districts && (
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
      notes={[copy.help.standing(c.name, c.standing.level)]}
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
