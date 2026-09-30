import { useSyncExternalStore } from 'react';

/**
 * Review 1 (GDD §13.7): the orders-complete note waits while a result modal is open, then follows
 * it. The city screen reports its result modal here; the shell reads it. Module state: one tab.
 */
let resultOpen = false;
const listeners = new Set<() => void>();

export function setResultModalOpen(open: boolean): void {
  if (open === resultOpen) return;
  resultOpen = open;
  for (const l of listeners) l();
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
