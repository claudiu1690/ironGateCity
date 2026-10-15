import type { ChatLineView, ChatPageView } from '@irongate/rules';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { trpc } from '../../lib/trpc';

/**
 * Slice 6 (ADR 0038; tech design §12.3): the chat socket, push only. Connected only while the Faction
 * route shows chat (and chat is not hidden); disconnected on leave. A `chat:line` is appended to its
 * channel's history (dedup by id); a system line is refetched for its live button (the push carries
 * none). On (re)connect the open channel's history is refetched: lines missed while away come from
 * the history, never from the socket.
 */
export function useChatSocket(enabled: boolean, channel: string | null): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const open = useRef(channel);
  open.current = channel;

  useEffect(() => {
    if (!enabled) return;
    const socket = io({ path: '/api/socket.io', withCredentials: true });
    const refetchOpen = () => {
      const ch = open.current;
      if (ch) void queryClient.invalidateQueries({ queryKey: trpc.chat.history.queryKey({ channel: ch }) });
    };
    socket.on('connect', () => {
      setConnected(true);
      refetchOpen();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:line', (line: ChatLineView) => {
      const key = trpc.chat.history.queryKey({ channel: line.channel });
      queryClient.setQueryData<ChatPageView>(key, (page) =>
        page && !page.lines.some((l) => l.id === line.id) ? { ...page, lines: [...page.lines, line] } : page,
      );
      if (line.kind === 'system') void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: trpc.chat.channels.queryKey() });
    });
    socket.on('chat:forYou', () => {
      void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() });
    });
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [enabled, queryClient]);

  return { connected };
}
