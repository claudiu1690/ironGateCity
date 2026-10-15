import { copy } from '@irongate/content/copy';
import type { ChatLineButton, ChatLineView, ChatPageView } from '@irongate/rules';
import { Button, ChatPanel } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isNetworkError, trpc, trpcClient } from '../../lib/trpc';
import { useMinWidth } from '../../lib/useNow';
import { useCharacter } from '../game/hooks';
import { setChatDraft, useChatDraft } from './chatDraft';
import { FavourFlow } from './FavourFlow';
import type { FavourTarget } from './FavourFlow';
import { ProfileFlow } from './ProfileFlow';
import { chatLimitLine, togetherNotice } from './togetherErrors';
import { useChatSocket } from './useChatSocket';

export interface ChatTabProps {
  /** Desktop (≥ 1024): the persistent right-hand column beside the other parts (tech §12.1). */
  column?: boolean;
}

/**
 * Slice 6 (screens §2.5; design §8; tech design §12.3): the Faction tab's Chat part, and the desktop
 * column. Three channels (Party, the home branch, the Irongate branch), the history fifty at a time,
 * live lines over the socket, the composer (280 characters; a double tap re-sends the same key),
 * system lines with their buttons, mute (from the profile) and report. Hidden from the Me tab: no
 * socket, one line and *Show chat*.
 */
export function ChatTab({ column = false }: ChatTabProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const wide = useMinWidth(1024);
  const { character } = useCharacter();
  const hidden = !!character?.chat?.hidden;
  const channels = useQuery({ ...trpc.chat.channels.queryOptions(), enabled: !hidden });
  const [picked, setPicked] = useState<string | null>(null);
  const channel = picked ?? channels.data?.current ?? null;
  const history = useQuery({
    ...trpc.chat.history.queryOptions({ channel: channel ?? 'party:collective' }),
    enabled: !!channel && !hidden,
  });
  useChatSocket(!hidden && !!character, channel);

  // Opening chat clears the *for you* dot (chat.seenAt).
  const seen = useMutation({
    ...trpc.chat.seen.mutationOptions(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() }),
  });
  const forYou = !!character?.chat?.forYou;
  const seenOnce = useRef(false);
  useEffect(() => {
    if (hidden || !history.data) return;
    if (!seenOnce.current || forYou) {
      seenOnce.current = true;
      if (!seen.isPending) seen.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, history.data, forYou]);

  // Older pages (fifty at a time), kept per channel apart from the live page.
  const [older, setOlder] = useState<Record<string, { lines: ChatLineView[]; more: boolean }>>({});
  const [olderPending, setOlderPending] = useState(false);
  const page: ChatPageView | undefined = history.data;
  const olderHere = channel ? older[channel] : undefined;
  const lines = useMemo(() => {
    const live = page?.lines ?? [];
    const prev = olderHere?.lines ?? [];
    const ids = new Set(live.map((l) => l.id));
    return [...prev.filter((l) => !ids.has(l.id)), ...live];
  }, [page, olderHere]);
  const more = olderHere ? olderHere.more : !!page?.more;
  const loadOlder = async () => {
    if (!channel || olderPending || !lines[0]) return;
    setOlderPending(true);
    try {
      const r = await trpcClient.chat.history.query({ channel, before: lines[0].id });
      setOlder((o) => ({ ...o, [channel]: { lines: [...r.lines, ...(o[channel]?.lines ?? [])], more: r.more } }));
    } finally {
      setOlderPending(false);
    }
  };

  // The composer: a key made once per send; a double tap re-sends the same key (one line).
  const [draft, setDraft] = useChatDraft();
  const [limit, setLimit] = useState<string | null>(null);
  const sending = useRef<{ key: string; text: string } | null>(null);
  const [sendPending, setSendPending] = useState(false);
  const send = async () => {
    if (!channel) return;
    const text = draft;
    if (sending.current && sending.current.text === text) return;
    const key = crypto.randomUUID();
    sending.current = { key, text };
    setSendPending(true);
    setLimit(null);
    try {
      let line: ChatLineView | null = null;
      for (let attempt = 0; attempt < 3 && !line; attempt++) {
        try {
          line = await trpcClient.chat.post.mutate({ channel, text, idempotencyKey: key });
        } catch (e) {
          if (attempt < 2 && isNetworkError(e)) continue;
          throw e;
        }
      }
      if (line) {
        const l = line;
        queryClient.setQueryData<ChatPageView>(trpc.chat.history.queryKey({ channel }), (p) =>
          p && !p.lines.some((x) => x.id === l.id) ? { ...p, lines: [...p.lines, l] } : p,
        );
        // Only what was sent: a line typed while it was on its way stays in the composer.
        setChatDraft((d) => (d === text ? '' : d));
      }
    } catch (e) {
      setLimit(chatLimitLine(e) ?? togetherNotice(e) ?? null);
    } finally {
      sending.current = null;
      setSendPending(false);
    }
  };

  // Report (once per line), the system lines' buttons, a name's profile.
  const [reported, setReported] = useState<Set<string>>(() => new Set());
  const report = useMutation({
    ...trpc.chat.report.mutationOptions(),
    onSuccess: (_r, v) => setReported((s) => new Set(s).add(v.messageId)),
    onError: (e) => setLimit(togetherNotice(e) ?? null),
  });
  const [profile, setProfile] = useState<string | null>(null);
  const [favour, setFavour] = useState<FavourTarget | null>(null);
  const onButton = (_line: ChatLineView, b: ChatLineButton) => {
    if (b.kind === 'postBail') setFavour({ characterId: b.characterId, kind: 'bail' });
    else if (b.kind === 'visit') setFavour({ characterId: b.characterId, kind: 'visit' });
    else void navigate({ to: '/faction/events/$eventId' as never, params: { eventId: b.eventId } as never });
  };

  const setHidden = useMutation({
    ...trpc.chat.setHidden.mutationOptions(),
    onSuccess: (r) => queryClient.setQueryData(trpc.character.me.queryKey(), r.character),
  });

  // Desktop: the column ends above the floating tab dock and the ticker (~170 px), so the composer
  // is never under them; a phone: above the tab bar (64 px).
  const wrap = column
    ? 'flex h-[calc(100dvh-var(--hud-h,76px)-164px-170px)] min-h-[420px] flex-col lg:sticky lg:top-11'
    : wide
      ? 'mx-auto flex h-[calc(100dvh-var(--hud-h,76px)-164px-170px)] min-h-[420px] w-full max-w-[640px] flex-col'
      : 'flex h-[calc(100dvh-var(--hud-h,76px)-164px-64px)] min-h-[320px] w-full flex-col';

  if (hidden) {
    return (
      <section className="mx-auto flex w-full max-w-[640px] flex-col gap-2 px-4 py-6 text-ink" data-testid="faction-chat" data-hidden="true">
        <p className="font-mono text-[12px] text-muted">{copy.together.chat.me.note}</p>
        <Button variant="outline" className="self-start" pending={setHidden.isPending} onClick={() => setHidden.mutate({ hidden: false })}>
          {copy.together.chat.me.show}
        </Button>
      </section>
    );
  }

  return (
    <div className={wrap} data-testid="faction-chat">
      {!channels.data || !channel ? (
        <p className="px-4 py-6 font-mono text-[12px] text-muted" role="status">
          {channels.isError ? togetherNotice(channels.error) : '…'}
        </p>
      ) : (
        <ChatPanel
          channels={channels.data.channels}
          channel={channel}
          onChannel={(id) => {
            setPicked(id);
            setLimit(null);
          }}
          hereNow={page?.hereNow ?? channels.data.channels.find((c) => c.id === channel)?.hereNow ?? 0}
          lines={lines}
          muted={page?.muted ?? []}
          meId={character?.id ?? ''}
          factionId={character?.factionId ?? 'collective'}
          rankTitles={character?.rank.ladder ?? []}
          draft={draft}
          onDraft={(text) => {
            setDraft(text);
            if (limit) setLimit(null);
          }}
          onSend={() => void send()}
          sendPending={sendPending}
          limitLine={limit}
          onButton={onButton}
          onName={setProfile}
          onReport={(l) => {
            if (!report.isPending && !reported.has(l.id)) report.mutate({ messageId: l.id });
          }}
          reported={reported}
          more={more}
          onOlder={() => void loadOlder()}
          olderPending={olderPending}
          column={column}
          enterSends={wide}
        />
      )}
      <ProfileFlow characterId={profile} onClose={() => setProfile(null)} />
      <FavourFlow target={favour} onClose={() => setFavour(null)} />
    </div>
  );
}
