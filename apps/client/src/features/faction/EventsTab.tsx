import { copy } from '@irongate/content/copy';

/** Slice 6 (screens §2.2): the Faction tab's Events part (T19). */
export function EventsTab() {
  return (
    <section className="mx-auto w-full max-w-[640px] px-4 py-6 text-ink" data-testid="faction-events">
      <p className="font-mono text-[13px] text-muted">{copy.together.tabs.events}</p>
    </section>
  );
}
