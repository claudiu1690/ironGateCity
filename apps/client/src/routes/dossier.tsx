import type { ActionResult, DossierFileView, FactionId } from '@irongate/rules';
import { Button, DossierChips, DossierHeader, DossierList, ExposeStory, ResultModal } from '@irongate/ui';
import type { DossierTabId } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { usePoliticalAct } from '../features/council/usePoliticalAct';
import { goToPlace } from '../features/dossier/placeRoute';
import { useCharacter } from '../features/game/hooks';
import { invalidateLife } from '../features/life/invalidate';
import { qNotice } from '../features/dossier/errors';
import { noticeFor } from '../features/game/errors';
import { setResultModalOpen } from '../lib/modalGate';
import { isNetworkError, trpc, trpcClient } from '../lib/trpc';
import { noteServerNow } from '../lib/useNow';

export interface DossierSearch {
  tab?: DossierTabId;
}

export const validateDossierSearch = (search: Record<string, unknown>): DossierSearch =>
  search.tab === 'files' || search.tab === 'informants' || search.tab === 'names' ? { tab: search.tab } : {};

export interface ExposeSearch {
  /** The press place the ticket was tapped at (step 1); a stored story resumes at its own. */
  loc?: string;
}

export const validateExposeSearch = (search: Record<string, unknown>): ExposeSearch =>
  typeof search.loc === 'string' && /^[a-z0-9.-]+$/.test(search.loc) ? { loc: search.loc } : {};

/**
 * Slice 8 phase C, lane Q (screens §6; tech design §12.1): the Dossier tab, the bottom bar's fourth.
 * The header, the chips **Names · Case Files · Informants** (`?tab=`), and the list. Opening it calls
 * `dossier.seen` (the tab's dot clears). *Make a Case File* and *Recruit as an informant* are one tap
 * each (the political modal); *Take it to the paper* and *Sell* open the place's sheet.
 */
export function DossierPage({ search }: { search: DossierSearch }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character: c } = useCharacter();
  const tab = search.tab ?? 'names';
  const view = useQuery({ ...trpc.dossier.get.queryOptions(), refetchOnMount: 'always' });
  const act = usePoliticalAct();
  const [last, setLast] = useState<string | null>(null);
  const seen = useMutation({
    ...trpc.dossier.seen.mutationOptions(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() }),
  });
  const seenOnce = useRef(false);
  useEffect(() => {
    if (seenOnce.current) return;
    seenOnce.current = true;
    seen.mutate();
  }, [seen]);
  useEffect(() => setResultModalOpen(act.open, 'dossier'), [act.open]);
  useEffect(() => () => setResultModalOpen(false, 'dossier'), []);

  if (view.isError)
    return (
      <div className="p-4">
        <p role="alert">{noticeFor(view.error) ?? 'The Dossier could not be loaded.'}</p>
        <Button variant="outline" className="mt-3" onClick={() => void view.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (!view.data || !c)
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Loading…
      </p>
    );
  const v = view.data;
  const names: Partial<Record<FactionId, string>> = c.factionNames ?? { [c.factionId]: c.factionName };
  const notice = last && act.pending === null && act.error ? { id: last, text: qNotice(act.error) ?? '' } : null;

  const bind = (subjectId: string) => {
    setLast(subjectId);
    void act.run(`bind-${subjectId}`, (k) => trpcClient.dossier.bind.mutate({ subjectId, idempotencyKey: k }));
  };
  const turn = (f: DossierFileView) => {
    setLast(f.id);
    void act.run(`turn-${f.id}`, (k) => trpcClient.dossier.turn.mutate({ fileId: f.id, idempotencyKey: k }));
  };
  const print = (f: DossierFileView) => {
    if (f.print.nearest) void goToPlace(queryClient, navigate, f.print.nearest.locationId);
  };
  const sell = (f: DossierFileView) => {
    if (f.sell.nearest) void goToPlace(queryClient, navigate, f.sell.nearest.locationId);
  };

  return (
    <div className="paper-grain min-h-full text-ink" data-testid="dossier-page">
      <div className="mx-auto flex max-w-[640px] flex-col pb-8 lg:pb-[132px]">
        <DossierHeader view={v} />
        <div className="flex flex-col gap-3 px-4 pt-3">
          <DossierChips
            tab={tab}
            onTab={(t) => void navigate({ to: '/dossier', search: t === 'names' ? {} : { tab: t }, replace: true })}
          />
          <DossierList
            view={v}
            tab={tab}
            level={c.level}
            factionNames={names}
            onBind={bind}
            bindPending={act.pending?.startsWith('bind-') ? act.pending.slice(5) : null}
            onPrint={print}
            onSell={sell}
            onTurn={turn}
            turnPending={act.pending?.startsWith('turn-') ? act.pending.slice(5) : null}
            notice={notice}
          />
        </div>
      </div>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} factionNames={names} />
    </div>
  );
}

/**
 * Slice 8 phase C, lane Q (screens §7; ADR 0054, 0013): the exposé at a press place, steps 1 and 2,
 * resumable (the file and the angle are stored at step 1); the result is the action modal (`kind:
 * 'expose'`), and Continue lands on the press place's sheet.
 */
export function ExposePage({ search }: { search: ExposeSearch }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character: c } = useCharacter();
  const input = search.loc ? { locationId: search.loc } : {};
  const view = useQuery({ ...trpc.expose.get.queryOptions(input), refetchOnMount: 'always' });
  const [result, setResult] = useState<ActionResult | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => setResultModalOpen(open, 'expose'), [open]);
  useEffect(() => () => setResultModalOpen(false, 'expose'), []);
  const choose = useMutation({
    ...trpc.expose.choose.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (v) => queryClient.setQueryData(trpc.expose.get.queryKey(input), v),
  });
  const busy = useRef(false);
  const attempt = useMutation({
    ...trpc.expose.attempt.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.paper.today.queryKey() });
      invalidateLife(queryClient);
      setResult(r);
      setOpen(true);
    },
    onSettled: () => {
      busy.current = false;
    },
  });

  const locationId = view.data?.locationId || search.loc || null;
  const backToPress = () => {
    setOpen(false);
    if (locationId) void goToPlace(queryClient, navigate, locationId);
    else void navigate({ to: '/dossier', search: { tab: 'files' } });
  };

  if (view.isError)
    return (
      <div className="p-4">
        <p role="alert">{noticeFor(view.error) ?? 'The story could not be loaded.'}</p>
      </div>
    );
  if (!view.data || !c)
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Loading…
      </p>
    );
  const names: Partial<Record<FactionId, string>> = c.factionNames ?? { [c.factionId]: c.factionName };
  const err = choose.error ?? attempt.error;
  return (
    <div className="min-h-full bg-paper text-ink">
      <ExposeStory
        view={view.data}
        pending={choose.isPending || attempt.isPending}
        error={err ? (qNotice(err) ?? null) : null}
        onChoose={(fileId, angle) => {
          if (!locationId) return;
          choose.mutate({ locationId, fileId, angle });
        }}
        onAttempt={(wayId) => {
          if (busy.current) return;
          busy.current = true;
          attempt.mutate({ wayId, idempotencyKey: crypto.randomUUID() });
        }}
        onBack={() => void navigate({ to: '/dossier', search: { tab: 'files' } })}
      />
      <ResultModal
        result={result}
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : backToPress())}
        factionNames={names}
      />
    </div>
  );
}
