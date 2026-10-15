import { copy } from '@irongate/content/copy';

/** Slice 6 (screens §2.1): the Faction tab's Orders part (T19). */
export function OrdersTab() {
  return (
    <section className="mx-auto w-full max-w-[640px] px-4 py-6 text-ink" data-testid="faction-orders">
      <p className="font-mono text-[13px] text-muted">{copy.together.tabs.orders}</p>
    </section>
  );
}
