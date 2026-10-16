import { copy } from '@irongate/content/copy';
import type { EventCardView, EventHours } from '@irongate/rules';
import { Button, CallEventSheet, EventCard, EventResultLine, HelpButton, ResultModal, callGuardText, helpMark } from '@irongate/ui';
import type { HelpNote } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useCharacter } from '../game/hooks';
import { setResultModalOpen } from '../../lib/modalGate';
import { isNetworkError, trpc, trpcClient } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';
import { lastDistrict } from '../../routes/city';
import { eventNotice, invalidateTogether, setEventView, useEventAct } from './eventActs';

function Kicker({ children, testId }: { children: string; testId?: string }) {
  return (
    <h2
      className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold"
      data-testid={testId}
    >
      {children}
    </h2>
  );
}

/**
 * Slice 6 (screens §2.2): the board. *Here · {city}* (the faction's open events in the city the
 * member is in, the fixture first), folded *Also open elsewhere · {n}*, *Your sign-ups* (with
 * Withdraw until the hour before), and *Results · {city}*. Above them, for Rank 3 and up, **Call an
 * event** (the three-step sheet, screens §4); for others the Courier line.
 */
export function EventsTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { character } = useCharacter();
  const board = useQuery(trpc.events.board.queryOptions());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [elsewhereOpen, setElsewhereOpen] = useState(false);
  // The capital's call sheet lists the open district's events (client memory, tech §22.1 Q6).
  const districtId = character ? lastDistrict(character.cityId) : null;
  const sheet = useQuery({ ...trpc.events.callSheet.queryOptions({ districtId }), enabled: sheetOpen });
  // Slice 8 lane Q (tech design §3.5): the Headline Story's held Case Files (another party's names).
  const takesFile = !!sheet.data?.options.some((o) => o.caseFile);
  const dossier = useQuery({ ...trpc.dossier.get.queryOptions(), enabled: sheetOpen && takesFile });
  const act = useEventAct();
  const [called, setCalled] = useState<string | null>(null);
  useEffect(() => {
    setResultModalOpen(!!act.result, 'event-call');
    return () => setResultModalOpen(false, 'event-call');
  }, [act.result]);

  // Withdraw (design §2.4): one tap, one key per tap; the card shows the committed line after.
  const withdrawBusy = useRef(false);
  const withdraw = useMutation({
    ...trpc.events.withdraw.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
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

  if (!character) return null;
  const b = board.data;
  const open = (id: string) => void navigate({ to: '/faction/events/$eventId', params: { eventId: id } });
  const join = (e: EventCardView) =>
    void navigate({ to: '/faction/events/$eventId', params: { eventId: e.id }, search: { join: true } });
  const here = b
    ? b.here.districtName
      ? copy.together.board.hereDistrict(b.here.districtName, b.here.cityName)
      : b.here.cityName
    : '';
  const ladder = character.rank.ladder;
  const rank3 = ladder[2] ?? 'Rank 3';
  const energyOf = (eventId: string) => character.events?.open.find((o) => o.eventId === eventId)?.energy ?? 0;

  const onCall = (input: { typeId: string; hours: EventHours; roleId: string; caseFileId?: string }) => {
    void act
      .run('call', (idempotencyKey) =>
        trpcClient.events.callEvent.mutate({ ...input, districtId, idempotencyKey }),
      )
      .then((r) => {
        if (r && r.view.kind === 'event') {
          setSheetOpen(false);
          setCalled(r.view.event.id);
        }
      });
  };

  let callBlock = null;
  if (b) {
    const guard = b.call.ok ? null : callGuardText(b.call, b.here.cityName);
    if (b.call.ok)
      callBlock = (
        <Button className="w-full" onClick={() => setSheetOpen(true)} data-testid="call-an-event">
          {copy.together.board.callAnEvent}
        </Button>
      );
    else if (b.call.reason === 'RANK')
      callBlock = (
        // Slice 6 fix round (QA clarity): the board's one line on what an event is opens its note.
        <HelpButton
          notes={[copy.together.help.campaignEvent() as HelpNote, copy.together.help.hands() as HelpNote]}
          label={copy.together.help.campaignEvent()[0] ?? ''}
          testId="call-rank-help"
          className="self-start"
        >
          <span className={`font-mono text-[12px] text-text-2 ${helpMark}`} data-testid="call-rank-line">
            {copy.together.board.whoCanCall(b.call.rank3Title)}
          </span>
        </HelpButton>
      );
    else
      callBlock = (
        <p className="font-mono text-[12px] text-text-2" data-testid="call-guard-line">
          {guard}
        </p>
      );
  }

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-4 text-ink" data-testid="faction-events">
      {callBlock}
      {b && (
        <section className="flex flex-col gap-2" data-testid="board-here">
          <Kicker>{copy.together.board.here(here)}</Kicker>
          {b.here.events.length === 0 ? (
            <div className="flex flex-col gap-1" data-testid="board-empty">
              <p className="font-body text-[14px]">{copy.together.board.empty(b.here.cityName)}</p>
              {!b.call.ok && b.call.reason === 'RANK' && (
                <p className="font-mono text-[12px] text-muted">{copy.together.board.emptyOthers(rank3)}</p>
              )}
            </div>
          ) : (
            b.here.events.map((e) => <EventCard key={e.id} event={e} onOpen={() => open(e.id)} onJoin={() => join(e)} />)
          )}
          {b.elsewhere.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setElsewhereOpen((o) => !o)}
                aria-expanded={elsewhereOpen}
                className="label-caps min-h-11 cursor-pointer self-start text-[12px] text-muted underline-offset-2 hover:underline"
                data-testid="board-elsewhere"
              >
                {copy.together.board.elsewhere(b.elsewhere.length)} {elsewhereOpen ? '▴' : '▾'}
              </button>
              {elsewhereOpen &&
                b.elsewhere.map((e) => <EventCard key={e.id} event={e} onOpen={() => undefined} />)}
            </>
          )}
        </section>
      )}
      {b && b.mine.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="board-mine">
          <Kicker>{copy.together.board.mine}</Kicker>
          {b.mine.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onOpen={() => open(e.id)}
              withdraw={{
                canWithdraw: e.canWithdraw,
                withdrawUntil: e.withdrawUntil,
                label: copy.together.event.withdraw(energyOf(e.id)),
                pending: withdraw.isPending && withdraw.variables?.eventId === e.id,
                onWithdraw: () => {
                  if (withdrawBusy.current) return;
                  withdrawBusy.current = true;
                  withdraw.mutate({ eventId: e.id, idempotencyKey: crypto.randomUUID() });
                },
              }}
            />
          ))}
          {withdraw.error && (
            <p className="font-mono text-[12px] text-failure" role="alert">
              {eventNotice(withdraw.error)}
            </p>
          )}
        </section>
      )}
      {b && (
        <section className="flex flex-col gap-1" data-testid="board-results">
          <Kicker>{copy.together.board.results(b.here.cityName)}</Kicker>
          {b.results.length === 0 ? (
            <p className="font-mono text-[12px] text-muted">{copy.together.board.noResults}</p>
          ) : (
            b.results.map((r) => (
              <EventResultLine key={r.id} row={r} factionId={character.factionId} onOpen={() => open(r.id)} />
            ))
          )}
        </section>
      )}
      <CallEventSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) act.clearError();
        }}
        view={sheet.data ?? null}
        factionId={character.factionId}
        ladder={ladder}
        energy={character.energy.value}
        onCall={onCall}
        caseFiles={(dossier.data?.caseFiles ?? [])
          .filter((f) => f.status === 'held' && f.factionId !== null && f.factionId !== character.factionId)
          .map((f) => ({ id: f.id, name: f.name, party: f.factionId ? (character.factionNames?.[f.factionId] ?? f.factionId) : '' }))}
        pending={act.pending === 'call'}
        notice={act.error ? (eventNotice(act.error) ?? null) : null}
      />
      <ResultModal
        result={act.result}
        open={!!act.result}
        onOpenChange={(o) => {
          if (!o) act.clear();
        }}
        onContinue={() => {
          act.clear();
          if (called) open(called);
        }}
      />
    </section>
  );
}
