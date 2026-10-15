import type { ProfileView } from '@irongate/rules';
import { ProfileSheet } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { useCharacter } from '../game/hooks';
import { useHereCity } from './useHereCity';
import { setChatDraft } from './chatDraft';
import { FavourFlow } from './FavourFlow';
import type { FavourTarget } from './FavourFlow';
import { togetherNotice } from './togetherErrors';

/**
 * Slice 6 (screens §2.3; design §7.3): a member's public profile, opened from a Members row, a
 * scoreboard row or a name in chat. *Message* opens Chat with *@{name} * typed; the favour opens its
 * sheet; *Ask to join* is the nudge (one tap); *Mute* / *Unmute* at the foot.
 */
export function ProfileFlow({ characterId, onClose }: { characterId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { character, now } = useCharacter();
  const profile = useQuery({
    ...trpc.faction.profile.queryOptions({ characterId: characterId ?? '000000000000000000000000' }),
    enabled: !!characterId,
  });
  const [favour, setFavour] = useState<FavourTarget | null>(null);
  const [asked, setAsked] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const mute = useMutation({
    ...trpc.chat.mute.mutationOptions(),
    onSuccess: (r, v) => {
      queryClient.setQueryData(trpc.faction.profile.queryKey({ characterId: v.characterId }), (p: ProfileView | undefined) =>
        p ? { ...p, muted: r.muted.includes(v.characterId) } : p,
      );
      void queryClient.invalidateQueries({ queryKey: trpc.chat.history.queryKey() });
    },
    onError: (e) => setNotice(togetherNotice(e) ?? null),
  });
  const nudge = useMutation({
    ...trpc.events.nudge.mutationOptions(),
    onSuccess: (_r, v) => {
      setAsked((s) => new Set(s).add(`${v.eventId}:${v.characterId}`));
      void queryClient.invalidateQueries({ queryKey: trpc.faction.members.queryKey() });
    },
    onError: (e) => setNotice(togetherNotice(e) ?? null),
  });

  const p = profile.data ?? null;
  const hereCity = useHereCity();
  return (
    <>
      <ProfileSheet
        profile={characterId ? p : null}
        loading={profile.isLoading}
        open={!!characterId && !favour}
        onOpenChange={(o) => {
          if (!o) {
            setNotice(null);
            onClose();
          }
        }}
        factionId={character?.factionId ?? 'collective'}
        factionName={character?.factionName ?? ''}
        hereCity={hereCity}
        now={now}
        onMessage={(m) => {
          setChatDraft(`@${m.name} `);
          onClose();
          void navigate({ to: '/faction', search: { tab: 'chat' } });
        }}
        onFavour={(m) => m.favour && setFavour({ characterId: m.characterId, kind: m.favour.kind })}
        onAsk={(m) => {
          if (m.ask && !nudge.isPending) nudge.mutate({ eventId: m.ask.eventId, characterId: m.characterId });
        }}
        onMute={(m, muted) => {
          if (!mute.isPending) mute.mutate({ characterId: m.characterId, muted });
        }}
        mutePending={mute.isPending}
        asked={!!p?.ask && asked.has(`${p.ask.eventId}:${p.characterId}`)}
        askPending={nudge.isPending}
      />
      {notice && characterId && !favour && (
        <p className="sr-only" role="alert">
          {notice}
        </p>
      )}
      <FavourFlow
        target={favour}
        onClose={() => {
          setFavour(null);
          void profile.refetch();
        }}
      />
    </>
  );
}
