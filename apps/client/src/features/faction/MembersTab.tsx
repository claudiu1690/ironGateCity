import { copy } from '@irongate/content/copy';

/**
 * Slice 6 (screens §2.3): the Faction tab's Members part. A stub from T19a; lane B fills it (T21).
 */
export function MembersTab() {
  return (
    <section className="mx-auto w-full max-w-[640px] px-4 py-6 text-ink" data-testid="faction-members">
      <p className="font-mono text-[13px] text-muted">{copy.together.tabs.members}</p>
    </section>
  );
}
