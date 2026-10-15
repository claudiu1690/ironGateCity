import { copy } from '@irongate/content/copy';

export interface ChatTabProps {
  /** Desktop (≥ 1024): the persistent right-hand column beside the other parts (tech §12.1). */
  column?: boolean;
}

/**
 * Slice 6 (screens §2.5): the Faction tab's Chat part. A stub from T19a; lane B fills it (T22).
 */
export function ChatTab({ column = false }: ChatTabProps) {
  return (
    <section
      className={column ? 'h-full w-full px-4 py-6 text-ink' : 'mx-auto w-full max-w-[640px] px-4 py-6 text-ink'}
      data-testid="faction-chat"
    >
      <p className="font-mono text-[13px] text-muted">{copy.together.tabs.chat}</p>
    </section>
  );
}
