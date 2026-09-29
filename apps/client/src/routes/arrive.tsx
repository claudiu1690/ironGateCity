import { copy } from '@irongate/content/copy';
import type { ArrivalView, FactionId } from '@irongate/rules';
import { AvatarPicker, Button, FactionCard, StoryScreen } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { noticeFor } from '../features/game/errors';
import { authClient, resetSession } from '../lib/auth';
import { isNetworkError, trpc } from '../lib/trpc';

/**
 * The arrival (GDD §7.2–7.3, slice-2 tech design §12): the face if sign-up did not save one, the
 * origin's six questions (one tap each, saved at once, so a closed tab resumes at the next
 * question), then the street and the one permanent choice. Full screen: no HUD, no tab bar.
 */
export function ArrivePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const arrival = useQuery({ ...trpc.arrival.get.queryOptions(), refetchOnWindowFocus: false });
  const setView = (v: ArrivalView) => queryClient.setQueryData(trpc.arrival.get.queryKey(), v);

  const busy = useRef(false);
  const settle = { onSettled: () => (busy.current = false) };
  const start = useMutation({ ...trpc.arrival.start.mutationOptions(), onSuccess: setView, ...settle });
  const answer = useMutation({
    ...trpc.arrival.answer.mutationOptions(),
    // Set-once by question index: a retry of the same tap returns the same view.
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: setView,
    ...settle,
  });
  const join = useMutation({
    ...trpc.arrival.join.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: async (r) => {
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      await queryClient.invalidateQueries({ queryKey: trpc.arrival.get.queryKey() });
      await navigate({ to: '/paper' });
    },
    ...settle,
  });

  const [face, setFace] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string>();
  const [faction, setFaction] = useState<FactionId | null>(null);

  const phase = arrival.data?.phase;
  useEffect(() => {
    if (phase === 'arrived') void navigate({ to: '/', replace: true });
  }, [phase, navigate]);

  async function signOut() {
    await authClient.signOut();
    await resetSession();
    await navigate({ to: '/login' });
  }
  const signOutButton = (
    <button
      type="button"
      onClick={() => void signOut()}
      className="label-caps min-h-11 cursor-pointer bg-ink/70 px-3 text-[10px] text-paper hover:bg-ink"
    >
      Sign out
    </button>
  );

  if (arrival.isError) {
    return (
      <main className="min-h-dvh bg-ink p-4 text-paper">
        <p role="alert">The story could not be loaded. Check your connection and try again.</p>
        <Button variant="outline-light" className="mt-3" onClick={() => void arrival.refetch()}>
          Try again
        </Button>
      </main>
    );
  }
  const v = arrival.data;
  if (!v || v.phase === 'arrived') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink">
        <p className="label-caps text-[12px] text-dim" role="status">
          Irongate…
        </p>
      </main>
    );
  }

  if (v.phase === 'face') {
    return (
      <AuthLayout title={copy.chooseYourFace} wide>
        <AvatarPicker
          faces={v.faces ?? []}
          value={face}
          onChange={(id) => {
            setFace(id);
            setFaceError(undefined);
          }}
          error={faceError ?? noticeFor(start.error)}
        />
        <Button
          pending={start.isPending}
          onClick={() => {
            if (!face) return setFaceError(copy.chooseYourFace);
            start.mutate({ avatarId: face });
          }}
        >
          Continue
        </Button>
        <div className="flex justify-end">{signOutButton}</div>
      </AuthLayout>
    );
  }

  if (v.phase === 'story' && v.screen && v.questionId) {
    const questionId = v.questionId;
    return (
      <StoryScreen
        view={v.screen}
        corner={signOutButton}
        pendingChoice={answer.isPending ? (answer.variables?.answerId ?? null) : null}
        error={noticeFor(answer.error)}
        onChoose={(answerId) => {
          if (busy.current) return;
          busy.current = true;
          answer.mutate({ questionId, answerId });
        }}
      />
    );
  }

  const street = v.street!;
  const chosen = street.cards.find((c) => c.factionId === faction);
  return (
    <StoryScreen
      view={street.screen}
      corner={signOutButton}
      error={noticeFor(join.error)}
      footer={
        <>
          <p className="font-mono text-[12px] text-muted" data-testid="street-note">
            {street.note}
          </p>
          <button
            type="button"
            disabled={!chosen || join.isPending}
            aria-busy={join.isPending || undefined}
            onClick={() => {
              if (!chosen || busy.current) return;
              busy.current = true;
              join.mutate({ factionId: chosen.factionId });
            }}
            className="label-caps flex min-h-14 w-full cursor-pointer items-center justify-center bg-ink px-4 text-center text-[13px] text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:bg-faint"
            data-testid="join"
          >
            {chosen ? chosen.confirm : 'Choose a party'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="The parties">
        {street.cards.map((card) => (
          <FactionCard
            key={card.factionId}
            card={card}
            selected={card.factionId === faction}
            onSelect={() => setFaction(card.factionId)}
          />
        ))}
      </div>
    </StoryScreen>
  );
}
