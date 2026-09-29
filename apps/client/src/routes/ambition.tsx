import { copy } from '@irongate/content/copy';
import { energyReadyAt } from '@irongate/rules';
import type { ActionResult } from '@irongate/rules';
import { Button, ResultModal, StoryScreen, formatClock } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { noticeFor } from '../features/game/errors';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { isNetworkError, trpc } from '../lib/trpc';
import { noteServerNow } from '../lib/useNow';

/**
 * An Ambition chapter (GDD §17.1, ADR 0013): step 1 a choice (one tap, saved at once), step 2 an
 * approach and the CTA (Energy on commit, one idempotency key per tap), then the result modal;
 * Continue goes back to where the Letters row was opened.
 */
export function AmbitionPage() {
  const navigate = useNavigate();
  const { from } = useSearch({ from: '/app/story/ambition' });
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const stat = usePlaceStat();
  const ambition = useQuery({ ...trpc.ambition.get.queryOptions(), refetchOnWindowFocus: false });
  const [approach, setApproach] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const busy = useRef(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.paper.today.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
  };
  const choose = useMutation({
    ...trpc.ambition.choose.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (v) => {
      queryClient.setQueryData(trpc.ambition.get.queryKey(), v);
      void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() });
      refresh();
    },
    onSettled: () => (busy.current = false),
  });
  const attempt = useMutation({
    ...trpc.ambition.attempt.mutationOptions(),
    // Network retries resend the same variables, so the same key (ADR 0002).
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      setResult(r);
      refresh();
    },
    onSettled: () => (busy.current = false),
  });

  const leave = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.ambition.get.queryKey() });
    await navigate({ to: from ?? '/paper' });
  };

  if (ambition.isError) {
    return (
      <div className="p-4 text-paper">
        <p role="alert">The chapter could not be loaded.</p>
        <Button variant="outline-light" className="mt-3" onClick={() => void ambition.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  const v = ambition.data;
  if (!v || !character) {
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Opening the letter…
      </p>
    );
  }

  const modal = (
    <ResultModal
      result={result}
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) {
          setResult(null);
          void leave();
        }
      }}
      statPoints={{
        pending: character.statPointsPending,
        level: character.level,
        stats: { str: character.stats.str, int: character.stats.int },
      }}
      onPlaceStat={stat.place}
      placing={stat.placing}
    />
  );

  if (!v.screen) {
    // Nothing open: the chapter is done, or the next one waits for its day and requirement.
    return (
      <div className="paper-grain min-h-full p-4 text-ink">
        <div className="mx-auto flex max-w-[640px] flex-col gap-3">
          <span className="label-caps text-[11px] text-muted">
            {copy.chapterKicker(v.title, v.chapter, v.of)}
          </span>
          <h1 className="font-display text-[26px] font-black">{v.chapterTitle || v.title}</h1>
          <Button variant="outline" onClick={() => void leave()}>
            Continue
          </Button>
        </div>
        {modal}
      </div>
    );
  }

  const screen = v.screen;
  // The CTA's "ready at" follows the Energy ticking in the HUD (the same rules function).
  const live = screen.cta
    ? { ...screen, cta: { ...screen.cta, readyAt: energyReadyAt(character.energy, screen.cta.energy) } }
    : screen;
  const pick = approach;

  return (
    <>
      <StoryScreen
        layout="shell"
        view={live}
        corner={
          <button
            type="button"
            onClick={() => void leave()}
            className="label-caps min-h-11 cursor-pointer bg-ink/70 px-3 text-[10px] text-paper hover:bg-ink"
          >
            Close
          </button>
        }
        pendingChoice={choose.isPending ? (choose.variables?.choiceId ?? null) : null}
        onChoose={(choiceId) => {
          if (busy.current) return;
          busy.current = true;
          choose.mutate({ chapter: v.chapter, choiceId });
        }}
        selectedApproach={pick}
        onSelectApproach={setApproach}
        ctaPending={attempt.isPending}
        ctaNote={
          live.cta && live.cta.readyAt !== null
            ? copy.needsEnergy(live.cta.energy, formatClock(live.cta.readyAt))
            : undefined
        }
        error={noticeFor(choose.error) ?? noticeFor(attempt.error)}
        onCta={() => {
          if (!pick || busy.current) return;
          busy.current = true;
          attempt.mutate({ chapter: v.chapter, approachId: pick, idempotencyKey: crypto.randomUUID() });
        }}
      />
      {modal}
    </>
  );
}
