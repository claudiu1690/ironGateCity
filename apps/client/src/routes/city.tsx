import { copy } from '@irongate/content/copy';
import type { ActionResult, LocationView } from '@irongate/rules';
import {
  Button,
  CityMap,
  FACTION_STYLE,
  FactionCrest,
  JobsCard,
  LocationSheet,
  OrdersList,
  OutOfEnergyCard,
  ResultModal,
  Ticket,
  TodayStrip,
  formatClock,
  formatShare,
} from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { usePerformAction } from '../features/action/usePerformAction';
import type { PerformTarget } from '../features/action/usePerformAction';
import { noticeFor } from '../features/game/errors';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { isNetworkError, trpc } from '../lib/trpc';

const KIND_LABEL: Record<string, string> = {
  'factory-gate': 'Factory gate',
  'faction-hq': 'Party hall',
  docks: 'Docks',
  market: 'Market',
  street: 'Street',
  bar: 'Bar',
};
const kindLabel = (kind: string) => KIND_LABEL[kind] ?? kind.replace(/-/g, ' ');

/** The city screen (tech design §12.2): the map, the plate, the location sheet and the result modal. */
export function CityPage() {
  const { cityId } = useParams({ from: '/app/city/$cityId' });
  const { loc } = useSearch({ from: '/app/city/$cityId' });
  const navigate = useNavigate({ from: '/city/$cityId' });
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const city = useQuery(trpc.city.get.queryOptions({ cityId }));
  const stat = usePlaceStat();

  const [result, setResult] = useState<ActionResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  const select = (id: string | null) => {
    setJobMessage(null);
    action.reset();
    void navigate({ search: id ? { loc: id } : {}, replace: true });
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
  const energy = { value: character.energy.value, nextTickAt: character.energy.nextTickAt };
  const share = c.homeFactionId ? c.opinion[c.homeFactionId] : c.opinion[character.factionId];
  const perform = (target: PerformTarget, times: 1 | 3) => {
    setLast(target);
    action.perform(target, times);
  };
  const cheapest = location ? Math.min(...location.actions.filter((a) => !a.locked).map((a) => a.energy)) : 0;
  const waiting = [
    ...character.orders.items.filter((o) => !o.done).map((o) => `${o.title} ${o.progress} / ${o.target}`),
    ...(character.job && !character.job.shiftWorkedToday
      ? [`your shift at the ${character.job.locationName}`]
      : []),
  ];

  return (
    <div className="relative h-full min-h-[420px]">
      <CityMap
        className="size-full"
        map={c.map}
        isNight={c.isNight}
        locations={c.locations}
        selectedId={loc ?? null}
        onSelect={(id) => select(id)}
      >
        {/* The city plate (the map's first view keeps every pin clear of it) */}
        <div
          className="pointer-events-none absolute top-2.5 left-2.5 right-2.5 flex flex-col gap-0 sm:right-auto sm:w-[420px]"
          data-map-overlay="top"
        >
          <div className="pointer-events-auto bg-paper text-ink shadow-[0_0_0_1px_var(--color-ink),0_6px_16px_rgb(0_0_0/0.4)]">
            <div className="flex items-stretch border-b-2 border-ink">
              <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
                <h1 className="font-display text-[24px] leading-none font-black">{c.name}</h1>
                <span
                  className="label-caps flex items-center gap-1.5 text-[9.5px] text-muted"
                  data-testid="city-plate"
                >
                  {c.role === 'home' ? 'Home city' : 'Battleground'} ·
                  <FactionCrest factionId={character.factionId} size={8} /> {character.factionName}{' '}
                  {formatShare(share)} %
                </span>
              </div>
              <div className="flex flex-col items-end justify-center gap-0.5 border-l border-paper-2 px-3 py-2">
                <span className="label-caps text-[9px] text-muted">Standing</span>
                <span className="font-label text-[13px]" data-testid="city-standing">
                  {c.standing.name}
                  {c.standing.next !== null ? ` · ${c.standing.successes} / ${c.standing.next}` : ''}
                </span>
              </div>
            </div>
            <div className="flex h-1.5 gap-px" aria-hidden="true">
              {(['vanguard', 'collective', 'alliance'] as const).map((f) => (
                <span key={f} style={{ width: `${c.opinion[f]}%`, background: FACTION_STYLE[f].color }} />
              ))}
              <span style={{ width: `${c.opinion.neutral}%` }} className="bg-neutral" />
            </div>
            <div className="hidden flex-col gap-1 px-3 pt-1.5 pb-2 sm:flex">
              <OrdersList orders={character.orders} />
              <TodayStrip today={character.today} />
            </div>
          </div>
        </div>
        {/* Phones: orders and today at the bottom of the map */}
        <div
          className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-1 bg-paper/95 px-3 py-2 text-ink shadow-[0_0_0_1px_var(--color-ink)] sm:hidden"
          data-map-overlay="bottom"
        >
          <OrdersList orders={character.orders} />
          <TodayStrip today={character.today} />
        </div>
      </CityMap>

      {location && (
        <LocationSheet
          open
          onOpenChange={(o) => {
            if (!o) select(null);
          }}
          n={location.n}
          kindLabel={kindLabel(location.kind)}
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
              hasJob={character.job !== null}
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
          <JobsCard
            jobs={location.jobs}
            held={
              character.job ? { streak: character.job.streak, sickDaysLeft: character.sickDaysLeft } : null
            }
            energyValue={energy.value}
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
          stats: { str: character.stats.str, int: character.stats.int },
        }}
        onPlaceStat={stat.place}
        placing={stat.placing}
      />
    </div>
  );
}
