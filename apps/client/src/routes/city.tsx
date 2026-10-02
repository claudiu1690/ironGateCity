import { copy } from '@irongate/content/copy';
import type { ActionResult, LocationView } from '@irongate/rules';
import {
  Button,
  CityMap,
  ElectionCard,
  FACTION_STYLE,
  FactionCrest,
  HelpButton,
  JobsCard,
  LocationSheet,
  OrdersList,
  OutOfEnergyCard,
  PlacesList,
  ResultModal,
  Ticket,
  TodayStrip,
  cx,
  formatClock,
  formatShare,
  helpMark,
  pyramidFor,
} from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { env } from '../env';
import { usePerformAction } from '../features/action/usePerformAction';
import type { PerformTarget } from '../features/action/usePerformAction';
import { noticeFor } from '../features/game/errors';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { setResultModalOpen } from '../lib/modalGate';
import { isNetworkError, trpc } from '../lib/trpc';
import { useLocationLayout, useNow } from '../lib/useNow';

/** The city column beside the map on a phone held sideways (review 2 #3). */
const SIDE_W = 260;

/**
 * The city screen (tech design §12.2): the map, the plate, the location sheet and the result modal.
 * Review 2: the map is fixed; a pin zooms the map into it, then its location opens (a bottom sheet
 * upright, a side panel sideways, a centred panel from 768 px); closing zooms back out.
 */
export function CityPage() {
  const { cityId } = useParams({ from: '/app/city/$cityId' });
  const { loc, order: orderHl } = useSearch({ from: '/app/city/$cityId' });
  const navigate = useNavigate({ from: '/city/$cityId' });
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const city = useQuery(trpc.city.get.queryOptions({ cityId }));
  const stat = usePlaceStat();
  const layout = useLocationLayout();
  // The Election card's countdown, on the server's clock (a wrong phone clock never miscounts).
  const now = useNow(60_000);
  const side = layout === 'side';
  // The location opens once the map has zoomed into its pin (CityMap `onArrive`).
  const [arrived, setArrived] = useState<string | null>(null);
  // The art stops short of the map's edge under the sheet (a pin near its bottom): the sheet fills 60 dvh.
  const [fillSheet, setFillSheet] = useState(false);
  useEffect(() => {
    if (arrived !== null && arrived !== (loc ?? null)) setArrived(null);
  }, [loc, arrived]);

  // Review 3: the list of the places on the map (the Places button).
  const [placesOpen, setPlacesOpen] = useState(false);
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

  /** Open a pin's sheet; from a Party order (review 1), its matching tickets are marked. */
  const select = (id: string | null, orderId?: string) => {
    setJobMessage(null);
    action.reset();
    void navigate({ search: id ? { loc: id, ...(orderId ? { order: orderId } : {}) } : {}, replace: true });
  };

  if (city.isError) {
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
  const location: LocationView | undefined = c.locations.find((l) => l.id === loc);
  // ADR 0024: the map as tiles where a tile origin is set (dev: the local cache), else the stills.
  const dayTiles = pyramidFor(c.map.day, env.tilesOrigin);
  const nightTiles = pyramidFor(c.map.night, env.tilesOrigin);
  const tiles = dayTiles && nightTiles ? { day: dayTiles, night: nightTiles } : null;
  const energy = { value: character.energy.value, nextTickAt: character.energy.nextTickAt };
  const share = c.homeFactionId ? c.opinion[c.homeFactionId] : c.opinion[character.factionId];
  const perform = (target: PerformTarget, times: 1 | 3) => {
    setLast(target);
    action.perform(target, times);
  };
  const cheapest = location ? Math.min(...location.actions.filter((a) => !a.locked).map((a) => a.energy)) : 0;
  const waiting = character.orders.items
    .filter((o) => !o.done)
    .map((o) => `${o.title} ${o.progress} / ${o.target}`);
  // Review 1 (answers §5): the plate's notes, the share first (its caption), then morale and the ordinance.
  const plateNotes = [
    copy.help.share(c.name),
    ...(c.morale ? [copy.help.morale()] : []),
    ...(c.ordinance ? [copy.help.ordinance()] : []),
  ];

  // Review 3: the Places list, in pin order, with a tag where an open Party order points (the same
  // pins the orders list links to).
  const orderAt = new Set(
    character.orders.items.flatMap((o) => (!o.done && o.pin ? [o.pin.locationId] : [])),
  );
  const places = c.locations.map((l) => ({
    id: l.id,
    n: l.n,
    name: l.name,
    blurb: l.blurb,
    order: orderAt.has(l.id),
  }));
  /**
   * The Places button: a small pill in a corner of the map, clear of the plate and the dock, marked
   * as an overlay so the map's first view keeps the pins clear of it. It steps aside while a place is
   * open.
   */
  const placesButton = (className: string) =>
    loc ? null : (
      <button
        type="button"
        data-map-overlay="places"
        data-testid="places-button"
        aria-haspopup="dialog"
        onClick={() => setPlacesOpen(true)}
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
        Places
      </button>
    );

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
      />
    ) : null;
  // Review 2 (answers §2.4): where each stat trains here, for a result's reason line.
  const trainingPlaces: Partial<Record<'str' | 'int' | 'agi', string>> = {};
  for (const l of c.locations)
    for (const a of l.actions)
      if (a.trains && !trainingPlaces[a.trains.stat]) trainingPlaces[a.trains.stat] = l.ref ?? l.name;

  const orders = (
    <>
      <OrdersList orders={character.orders} onPin={(id, orderId) => select(id, orderId)} />
      <TodayStrip today={character.today} help={{ cityName: c.name, turnsAt: character.day.endsAt }} />
    </>
  );

  /** The city plate: over the map, or (sideways) the top of the city column. */
  const plate = (
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
            notes={plateNotes}
            label={`What the plate says about ${c.name}`}
            buttonRef={plateHelp}
            testId="plate-help"
            className="absolute inset-0 z-10 w-full bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
          />
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-[24px] leading-none font-black">{c.name}</h1>
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
              <FactionCrest factionId={character.factionId} size={8} /> {character.factionName}{' '}
              {formatShare(share)} %
            </span>
          </span>
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
        </div>
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
      </div>
      {/* The share bar, captioned; a tap opens the plate's notes (the button above is its
          keyboard and screen-reader way in). */}
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
    </>
  );

  return (
    <div className={cx('relative flex h-full', !side && 'min-h-[420px]')}>
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
            {election('card')}
            {orders}
          </div>
        </aside>
      )}
      <CityMap
        className="h-full min-w-0 flex-1"
        map={c.map}
        tiles={tiles}
        // Maps v3: the city opens on its first quarter, a frame on its one picture.
        frame={c.quarters[0]?.frame}
        // Map atmosphere (clouds by day, fog by night), where the city's content switches it on.
        clouds={c.clouds}
        isNight={c.isNight}
        locations={c.locations}
        selectedId={loc ?? null}
        onSelect={(id) => select(id)}
        cover={cover}
        onArrive={(id, { fillsMap }) => {
          setArrived(id);
          setFillSheet(!fillsMap);
        }}
      >
        {/* Sideways and from 640 px: the Places button in the map's top right corner (the plate is
            beside the map or in the top left one; the dock is at the bottom). */}
        {placesButton(side ? 'top-2.5 right-2.5' : 'top-2.5 right-2.5 hidden sm:flex')}
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
                layout === 'sheet' && loc && 'invisible',
              )}
              data-map-overlay="top"
              data-map-opaque=""
            >
              <div className="pointer-events-auto bg-paper text-ink shadow-[0_0_0_1px_var(--color-ink),0_6px_16px_rgb(0_0_0/0.4)]">
                {plate}
                {/* Phones: the Election card folded to one 44 px line under the plate. On a phone
                    under 700 px tall it gives way to the map, like the ordinance line (QA M2: every
                    pin clear); the paper's row and the HQ card carry it there. */}
                {c.election && (
                  <div className="border-t border-paper-2 px-3 sm:hidden [@media(max-height:700px)]:hidden">
                    {election('compact')}
                  </div>
                )}
                <div className="hidden flex-col gap-1 px-3 pt-1.5 pb-2 sm:flex">
                  {election('card')}
                  {orders}
                </div>
              </div>
            </div>
            {/* Phones: orders and today at the bottom of the map, edge to edge and opaque (review 3) */}
            <div
              className="absolute inset-x-0 bottom-0 flex flex-col gap-1 border-t-2 border-ink bg-paper px-3 py-2 text-ink sm:hidden"
              data-map-overlay="bottom"
              data-map-opaque=""
            >
              {/* Phones held upright: the Places button just above the orders, at the right. */}
              {placesButton('right-0 bottom-full mb-2')}
              {orders}
            </div>
          </>
        )}
      </CityMap>

      {/* Review 1 (§13.7): while the orders-complete note shows (the shell's), the sheet steps aside so
          the note is the one dialog; Carry on brings the sheet back. */}
      {location && arrived === location.id && !(character.orders.complete && !modalOpen) && (
        <LocationSheet
          layout={layout}
          fill={fillSheet}
          open
          onOpenChange={(o) => {
            if (!o) select(null);
          }}
          n={location.n}
          kindLabel={copy.kindLabel(location.kind)}
          name={location.name}
          blurb={location.blurb}
          tags={character.rested > 0 ? [`Rested ${character.rested} · +50 % XP and Iron`] : []}
        >
          {energy.value < cheapest && <OutOfEnergyCard fullAt={character.energy.fullAt} waiting={waiting} />}
          {location.actions.map((a) => (
            <Ticket
              key={a.id}
              action={a}
              energy={energy}
              highlight={!!orderHl && a.order?.id === orderHl}
              onPerform={(times) => perform({ actionId: a.id, locationId: location.id }, times)}
              pending={
                action.isPending && action.variables?.actionId === a.id
                  ? (action.variables.times as 1 | 3)
                  : null
              }
              notice={action.variables?.actionId === a.id && !modalOpen ? noticeFor(action.error) : undefined}
              orderBonusPct={character.orders.rewards.matchFxpBonusPct}
            />
          ))}
          {location.council && (
            <ElectionCard
              summary={location.council}
              onOpen={(route) => void navigate({ to: route })}
              now={now}
            />
          )}
          <JobsCard
            jobs={location.jobs}
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
        open={placesOpen}
        onOpenChange={setPlacesOpen}
        cityName={c.name}
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

      <ResultModal
        result={result}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAgain={last ? (times) => perform(last, times) : undefined}
        againPending={action.isPending ? ((action.variables?.times as 1 | 3 | undefined) ?? null) : null}
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
      />
    </div>
  );
}
