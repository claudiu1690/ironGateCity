import { copy } from '@irongate/content/copy';
import type { MemberRowView } from '@irongate/rules';
import { Button, MemberRow } from '@irongate/ui';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { trpc, trpcClient } from '../../lib/trpc';
import { useCharacter } from '../game/hooks';
import { useHereCity } from './useHereCity';
import { FavourFlow } from './FavourFlow';
import type { FavourTarget } from './FavourFlow';
import { ProfileFlow } from './ProfileFlow';
import { togetherNotice } from './togetherErrors';

const t = copy.together;

/**
 * Slice 6 (screens §2.3; design §6.3): the Faction tab's Members part. *Find a member*, then the
 * rows fifty a page (*Show more*), here now first; a row opens the profile; the favour (*Post bail*,
 * *Visit*) and the nudge (*Ask to join*) sit at the right, as the server's view says.
 */
export function MembersTab() {
  const queryClient = useQueryClient();
  const { character, now } = useCharacter();
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setQ(typed.trim()), 250);
    return () => window.clearTimeout(id);
  }, [typed]);

  const members = useInfiniteQuery({
    queryKey: [...trpc.faction.members.queryKey(), { q }],
    queryFn: ({ pageParam }) =>
      trpcClient.faction.members.query({
        ...(q ? { q: q.slice(0, 40) } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (last) => last.next ?? undefined,
  });

  const [profile, setProfile] = useState<string | null>(null);
  const [favour, setFavour] = useState<FavourTarget | null>(null);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [asked, setAsked] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const nudge = useMutation({
    ...trpc.events.nudge.mutationOptions(),
    onSuccess: (_r, v) => {
      setAsked((s) => new Set(s).add(v.characterId));
      void queryClient.invalidateQueries({ queryKey: trpc.faction.members.queryKey() });
    },
    onError: (e) => setNotice(togetherNotice(e) ?? null),
  });

  const rows: MemberRowView[] = members.data?.pages.flatMap((p) => p.rows) ?? [];
  const alone = !q && members.isSuccess && rows.length <= 1;
  const hereCity = useHereCity();

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col gap-2 px-4 py-4 text-ink" data-testid="faction-members">
      <label className="flex flex-col gap-1">
        <span className="sr-only">{t.members.find}</span>
        <input
          type="search"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={t.members.find}
          maxLength={40}
          className="min-h-11 border-[1.5px] border-ink bg-paper-card px-3 font-body text-[15px] focus-visible:outline-2 focus-visible:outline-petrol"
          data-testid="members-search"
        />
      </label>
      {notice && (
        <p className="font-mono text-[12px] text-failure" role="alert">
          {notice}
        </p>
      )}
      {members.isError ? (
        <p role="alert" className="font-body text-[14px]">
          {togetherNotice(members.error)}
        </p>
      ) : !members.data ? (
        <p className="font-mono text-[12px] text-muted" role="status">
          …
        </p>
      ) : (
        <ul className="flex flex-col" data-testid="members-list">
          {rows.map((r) => (
            <MemberRow
              key={r.characterId}
              row={r}
              now={now}
              hereCity={hereCity}
              factionId={character?.factionId ?? 'collective'}
              onOpen={(row) => setProfile(row.characterId)}
              onFavour={(row) => row.favour && setFavour({ characterId: row.characterId, kind: row.favour.kind })}
              onAsk={(row) => {
                if (row.ask && !nudge.isPending) {
                  setNotice(null);
                  nudge.mutate({ eventId: row.ask.eventId, characterId: row.characterId });
                }
              }}
              favourDone={done.has(r.characterId)}
              asked={asked.has(r.characterId)}
              askPending={nudge.isPending && nudge.variables?.characterId === r.characterId}
            />
          ))}
        </ul>
      )}
      {alone && <p className="font-mono text-[12px] text-muted">{t.members.alone}</p>}
      {members.hasNextPage && (
        <Button
          variant="outline"
          className="self-center"
          pending={members.isFetchingNextPage}
          onClick={() => void members.fetchNextPage()}
          data-testid="members-more"
        >
          {t.members.showMore}
        </Button>
      )}
      <ProfileFlow characterId={profile} onClose={() => setProfile(null)} />
      <FavourFlow
        target={favour}
        onClose={() => setFavour(null)}
        onDone={(f) => setDone((s) => new Set(s).add(f.characterId))}
      />
    </section>
  );
}
