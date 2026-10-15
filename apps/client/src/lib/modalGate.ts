import { useSyncExternalStore } from 'react';

/**
 * Review 1 (GDD §13.7): the orders-complete note waits while a result modal is open, then follows
 * it. The city screen reports its result modal here; the shell reads it. Module state: one tab.
 * Slice 6: several screens report (the run-in gate, the event gate, an event's modals), each under
 * its own source, so one closing never hides another that is still open.
 */
const open = new Set<string>();
let resultOpen = false;
const listeners = new Set<() => void>();

export function setResultModalOpen(isOpen: boolean, source = 'default'): void {
  if (isOpen) open.add(source);
  else open.delete(source);
  const next = open.size > 0;
  if (next === resultOpen) return;
  resultOpen = next;
  for (const l of listeners) l();
}

/** Whether a source other than `except` has a modal open (the event gate waits for the run-in's). */
export function otherModalOpen(except: string): boolean {
  for (const s of open) if (s !== except) return true;
  return false;
}

export function useResultModalOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => resultOpen,
    () => false,
  );
}
