import { copy } from '@irongate/content/copy';
import type { EventResult, FactionId } from '@irongate/rules';
import {
  Button,
  EventHeader,
  HandsRow,
  PaysTiles,
  ResultModal,
  RoleRow,
  RolesKicker,
  VolunteersNote,
  groundOf,
  formatClock,
  roleGateText,
} from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { eventNotice, invalidateTogether, setEventView, useEventAct } from '../features/faction/eventActs';
import { useCharacter } from '../features/game/hooks';
import { trainingPlacesOf } from '../features/game/trainingPlaces';
import { setResultModalOpen } from '../lib/modalGate';
import { isNetworkError, trpc, trpcClient } from '../lib/trpc';
import { noteServerNow, useNow } from '../lib/useNow';

export interface EventSearch {
  /** Opened from a card's *Join*: the first open place the member may take is selected. */
  join?: boolean;
}

export function validateEventSearch(search: Record<string, unknown>): EventSearch {
  return search.join === true || search.join === 'true' || search.join === '1' ? { join: true } : {};
}

type Slot = { roleId: string } | 'hand';

/**
 * Slice 6 (screens §3; tech design §12.1): the event page in every state: open, signed up,
 * committed, settling, resolved, called off. One tap on a row selects it, one on the sticky button
 * spends (*Organiser · 10 Energy*, *Join as a hand · 5 Energy*); signed up, *Withdraw · n Energy
 * back* until the hour before. The page reads `events.get` on a 1 s clock and again at the start.
 */
export function EventPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { eventId } = useParams({ from: '/app/faction/events/$eventId' });
  const search = useSearch({ from: '/app/faction/events/$eventId' });
  const { character } = useCharacter();
  const now = useNow(1_000);
  const q = useQuery(trpc.events.get.queryOptions({ eventId }));
  const e = q.data;
  const [slot, setSlot] = useState<Slot | null>(null);
  const [withdrawn, setWithdrawn] = useState<{ role: string; energy: number } | null>(null);
  const act = useEventAct();
  const [mine, setMine] = useState<EventResult | null>(null);

  // At the start the next read resolves it (ADR 0037): read again then.
  const startsAt = e?.startsAt ?? null;
  const state = e?.state ?? null;
  useEffect(() => {
    if (startsAt === null || (state !== 'open' && state !== 'settling')) return;
    const wait = Math.max(0, startsAt - Date.now()) + 1_500;
    const t = window.setTimeout(() => {
      void qc.invalidateQueries({ queryKey: trpc.events.get.queryKey({ eventId }) });
      void qc.invalidateQueries({ queryKey: trpc.character.me.queryKey() });
    }, wait);
    return () => window.clearTimeout(t);
  }, [startsAt, state, eventId, qc]);

  // *Join* from a card: the first open place the member may take.
  const joined = useRef(false);
  useEffect(() => {
    if (!e || joined.current || !search.join || e.mine || e.state !== 'open') return;
    joined.current = true;
    const role = e.roles.find((r) => !r.holder && !r.gate && r.forYou);
    if (role) setSlot({ roleId: role.roleId });
    else if (!e.hands.gate) setSlot('hand');
  }, [e, search.join]);

  const withdrawBusy = useRef(false);
  const withdraw = useMutation({
    ...trpc.events.withdraw.mutationOptions(),
    retry: (n, err) => n < 2 && isNetworkError(err),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      qc.setQueryData(trpc.character.me.queryKey(), r.character);
      setEventView(qc, r.event);
      invalidateTogether(qc);
    },
    onError: () => invalidateTogether(qc),
    onSettled: () => {
      withdrawBusy.current = false;
    },
  });

  // *See your result* reopens the stored modal.
  const resultQ = useMutation({
    mutationFn: (signupId: string) => trpcClient.events.result.query({ signupId }),
    onSuccess: (r) => setMine(r),
  });

  useEffect(() => {
    setResultModalOpen(!!act.result || !!mine, 'event-page');
    return () => setResultModalOpen(false, 'event-page');
  }, [act.result, mine]);

  const names: Partial<Record<FactionId, string>> = useMemo(
    () => character?.factionNames ?? (character ? { [character.factionId]: character.factionName } : {}),
    [character],
  );
  const city = useQuery({
    ...trpc.city.get.queryOptions({ cityId: mine?.character.cityId ?? character?.cityId ?? '' }),
    enabled: !!mine,
  });

  if (!character) return null;
  const back = (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) window.history.back();
        else void navigate({ to: '/faction', search: { tab: 'events' } });
      }}
      className="label-caps flex min-h-11 min-w-11 cursor-pointer items-center justify-center bg-ink/70 px-3 text-[13px] text-paper hover:bg-ink"
      aria-label="Back"
      data-testid="event-back"
    >
      ←
    </button>
  );
  if (!e)
    return (
      <div className="flex min-h-full flex-col bg-paper p-4 text-ink" data-testid="event-page-loading">
        {back}
        {q.error && <p className="pt-4 font-mono text-[12px] text-failure">{eventNotice(q.error)}</p>}
      </div>
    );

  const ladder = character.rank.ladder;
  const ground = groundOf({ shares: e.ground.shares, names });
  const resolved = e.state === 'resolved';
  const started = e.state !== 'open' || now >= e.startsAt;
  const filled = e.roles.filter((r) => r.holder).length;
  const selectedRole = slot && slot !== 'hand' ? e.roles.find((r) => r.roleId === slot.roleId) : null;
  const cost = slot === 'hand' ? e.hands.energy : (selectedRole?.energy ?? 0);
  const short = slot !== null && character.energy.value < cost;
  const canHand = !e.mine && !started && !e.hands.gate;

  const signUp = () => {
    if (!slot) return;
    void act.run('signUp', (idempotencyKey) =>
      trpcClient.events.signUp.mutate({ eventId: e.id, slot, idempotencyKey }),
    );
  };

  let sticky: ReactNode = null;
  if (!started && e.mine) {
    sticky = e.mine.canWithdraw ? (
      <Button
        variant="outline"
        className="w-full"
        pending={withdraw.isPending}
        onClick={() => {
          if (withdrawBusy.current || !e.mine) return;
          withdrawBusy.current = true;
          setWithdrawn({ role: e.mine.roleName, energy: e.mine.energy });
          withdraw.mutate({ eventId: e.id, idempotencyKey: crypto.randomUUID() });
        }}
        data-testid="event-withdraw"
      >
        {copy.together.event.withdraw(e.mine.energy)}
      </Button>
    ) : (
      <p className="py-2 font-mono text-[12px] text-text-2" data-testid="event-committed">
        {copy.together.event.committed(formatClock(e.mine.committedFrom))}
      </p>
    );
  } else if (!started && slot) {
    sticky = short ? (
      <Button className="w-full" disabled data-testid="event-signup">
        {copy.together.errors.NOT_ENOUGH_ENERGY(cost)}
      </Button>
    ) : (
      <Button className="w-full" pending={act.pending === 'signUp'} onClick={signUp} data-testid="event-signup">
        {slot === 'hand'
          ? copy.together.event.joinAsHand
          : copy.together.event.takeRole(selectedRole?.name ?? '', selectedRole?.energy ?? 0)}
      </Button>
    );
  } else if (e.yourResult) {
    sticky = (
      <Button
        variant="outline"
        className="w-full"
        pending={resultQ.isPending}
        onClick={() => resultQ.mutate(e.yourResult!.signupId)}
        data-testid="event-see-result"
      >
        {copy.together.event.seeYourResult}
      </Button>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-paper text-ink" data-testid="event-page" data-state={e.state}>
      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
        <EventHeader event={e} factionId={character.factionId} ground={ground} now={now} back={back} />
        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-4">
          {e.state === 'calledOff' ? (
            <p className="font-body text-[14px]" data-testid="event-called-off">
              {copy.together.event.calledOffLine}
            </p>
          ) : resolved ? null : (
            <PaysTiles event={e} names={names} />
          )}
          <p className="font-body text-[15px] leading-normal text-text-2" data-testid="event-blurb">
            {e.blurb}
          </p>
          {e.state !== 'calledOff' && (
            <section className="flex flex-col" aria-label={copy.together.event.rolesKicker(filled, e.roles.length)}>
              <RolesKicker filled={filled} n={e.roles.length} />
              {e.roles.map((r) => (
                <RoleRow
                  key={r.roleId}
                  role={r}
                  factionId={character.factionId}
                  ladder={ladder}
                  resolved={resolved}
                  selected={!!slot && slot !== 'hand' && slot.roleId === r.roleId}
                  onSelect={!e.mine && !started ? () => setSlot({ roleId: r.roleId }) : undefined}
                />
              ))}
              <HandsRow
                hands={e.hands}
                ladder={ladder}
                resolved={resolved}
                selected={slot === 'hand'}
                onSelect={canHand ? () => setSlot('hand') : null}
              />
              {e.mine && e.hands.gate && e.hands.gate.reason !== 'ALREADY_ON_EVENT' && (
                <span className="font-mono text-[11px] text-muted">{roleGateText(e.hands.gate, ladder)}</span>
              )}
            </section>
          )}
          {!resolved && e.state !== 'calledOff' && <VolunteersNote />}
          {e.nudge && !started && (
            <button
              type="button"
              onClick={() => void navigate({ to: '/faction', search: { tab: 'members' } })}
              className="label-caps min-h-11 cursor-pointer self-start text-[12px] text-petrol underline-offset-2 hover:underline"
              data-testid="event-ask"
            >
              {copy.together.event.askSomeone}
            </button>
          )}
          {withdrawn && withdraw.isSuccess && (
            <p className="font-mono text-[12px] text-text-2" data-testid="event-withdrawn">
              {copy.together.withdraw.headline(withdrawn.role)} · {copy.together.withdraw.body(withdrawn.energy)}
            </p>
          )}
          {(act.error || withdraw.error) && (
            <p className="font-mono text-[12px] text-failure" role="alert" data-testid="event-notice">
              {eventNotice(act.error ?? withdraw.error)}
            </p>
          )}
        </div>
        {sticky && (
          <div
            className="sticky bottom-0 z-10 border-t border-track bg-paper px-4 pt-2 pb-2 lg:bottom-[124px] lg:border lg:border-ink lg:p-2 lg:shadow-[0_8px_24px_rgb(0_0_0/0.35)]"
            data-testid="event-sticky"
          >
            {sticky}
          </div>
        )}
      </div>
      <ResultModal
        result={act.result}
        open={!!act.result}
        onOpenChange={(o) => {
          if (!o) {
            act.clear();
            setSlot(null);
          }
        }}
        onContinue={() => {
          act.clear();
          setSlot(null);
        }}
      />
      <ResultModal
        result={mine}
        open={!!mine}
        onOpenChange={(o) => {
          if (!o) setMine(null);
        }}
        onContinue={() => setMine(null)}
        factionNames={names}
        trainingPlaces={trainingPlacesOf(city.data)}
      />
    </div>
  );
}
