import { useSyncExternalStore } from 'react';

/**
 * Slice 6 (screens §2.3): the composer's draft, shared so a profile's *Message* can open Chat with
 * *@{name} * typed, whichever part (or the desktop column) holds the composer. Module state: one tab.
 */
let draft = '';
const listeners = new Set<() => void>();

export function setChatDraft(next: string | ((current: string) => string)): void {
  const text = typeof next === 'function' ? next(draft) : next;
  if (text === draft) return;
  draft = text;
  for (const l of listeners) l();
}

export function useChatDraft(): [string, typeof setChatDraft] {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
    () => '',
  );
  return [value, setChatDraft];
}
