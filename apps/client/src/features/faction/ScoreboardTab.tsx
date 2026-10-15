import { copy } from '@irongate/content/copy';

/**
 * Slice 6 (screens §2.4): the Faction tab's Scoreboard part. A stub from T19a; lane B fills it (T21).
 */
export function ScoreboardTab() {
  return (
    <section className="mx-auto w-full max-w-[640px] px-4 py-6 text-ink" data-testid="faction-scoreboard">
      <p className="font-mono text-[13px] text-muted">{copy.together.tabs.scoreboard}</p>
    </section>
  );
}
