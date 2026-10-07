import { copy } from '@irongate/content/copy';
import type { ArrivalView } from '@irongate/rules';
import { AvatarPicker, Button, StoryScreen } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { noticeFor } from '../features/game/errors';
import { authClient, resetSession } from '../lib/auth';
import { isNetworkError, trpc } from '../lib/trpc';

/**
 * The arrival (GDD §7.1–7.3, slice-2 tech design §12; review 4, ADR 0073): the face if sign-up did
 * not save one, then *The Last Train In*: three beats, each saved as tapped, so a closed tab resumes
 * at the next one. Beat 1's rows select and its button commits (whom you help is your party). Once
 * the three are in (`ready`) the join is sent at once, and again on any later visit (it is idempotent
 * on the user). Full screen: no HUD, no tab bar.
 */
export function ArrivePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const arrival = useQuery({ ...trpc.arrival.get.queryOptions(), refetchOnWindowFocus: false });
  const setView = (v: ArrivalView) => queryClient.setQueryData(trpc.arrival.get.queryKey(), v);

  const busy = useRef(false);
  const settle = { onSettled: () => (busy.current = false) };
  const start = useMutation({ ...trpc.arrival.start.mutationOptions(), onSuccess: setView, ...settle });
  /**
   * QA M1: the question an answer was sent for. It is not released when the answer comes back: the
   * next question has another id, and its choices take taps only once they have settled on screen
   * (StoryScreen). Released on a refusal or a lost connection, so the player can tap again.
   */
  const answeredFor = useRef<string | null>(null);
  /** The origin follows the face screen in this visit: its first question settles too (QA M1). */
  const fromFace = useRef(false);
  const answer = useMutation({
    ...trpc.arrival.answer.mutationOptions(),
    // Set-once by question id: a retry of the same tap returns the same view.
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: setView,
    onError: () => (answeredFor.current = null),
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

  const phase = arrival.data?.phase;
  useEffect(() => {
    if (phase === 'arrived') void navigate({ to: '/', replace: true });
  }, [phase, navigate]);
  // Review 4 (ADR 0073): the three beats are in: join at once (a reload or a lost response joins again).
  const joinNow = join.mutate;
  useEffect(() => {
    if (phase !== 'ready' || busy.current) return;
    busy.current = true;
    joinNow({});
  }, [phase, joinNow]);

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
            fromFace.current = true;
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
    const sending = answer.isPending && answer.variables?.questionId === questionId;
    return (
      <StoryScreen
        view={v.screen}
        screenKey={questionId}
        // The first question replaces the face screen the player just tapped Continue on (QA M1).
        settleOnMount={fromFace.current}
        corner={signOutButton}
        pendingChoice={sending ? (answer.variables?.answerId ?? null) : null}
        error={noticeFor(answer.error)}
        onChoose={(answerId, shownFor) => {
          // The tap is bound to the question its button was rendered for (QA M1): one that is no
          // longer current, or already sent, does nothing. The server stores an answer only for
          // the current question id (set-once, in order), so a late copy changes nothing there.
          if (shownFor !== questionId || answeredFor.current === shownFor) return;
          answeredFor.current = shownFor;
          answer.mutate({ questionId: shownFor, answerId });
        }}
      />
    );
  }

  // `ready`: the join is on its way (or failed: try again).
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink p-4 text-paper">
      <p className="label-caps text-[12px] text-dim" role="status" data-testid="arrival-boarding">
        {copy.arrival.boarding}
      </p>
      {join.isError && (
        <>
          <p role="alert" className="font-body text-[14px]">
            {noticeFor(join.error)}
          </p>
          <Button
            variant="outline-light"
            onClick={() => {
              if (busy.current) return;
              busy.current = true;
              join.mutate({});
            }}
          >
            Try again
          </Button>
        </>
      )}
    </main>
  );
}
