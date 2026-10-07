import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import type { RankRowView } from '@irongate/rules';
import { cx, formatNumber } from '../format';

export interface RankLadderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The party's short name: *The Collective's ranks*. */
  factionName: string;
  ranks: readonly RankRowView[];
  /** The player's Rank and Party XP: their row reads *you*, the next *next · {n} more*. */
  rank: number;
  fxp: number;
}

/**
 * Review 4 #25 (answers §25, GDD §5.4): the rank ladder, opened from the Party XP label (the HUD and
 * the Me tab). The kicker *THE {FACTION}'S RANKS*, the Party XP note, then seven rows: the title, the
 * Party XP it starts at, and what it opens in plain words; the player's row marked *you*, the next
 * one *next · 788 more*. A bottom sheet on a phone, a centred panel from 640 px.
 */
export function RankLadderSheet({ open, onOpenChange, factionName, ranks, rank, fxp }: RankLadderSheetProps) {
  const next = ranks.find((r) => r.rank === rank + 1) ?? null;
  const [, note] = copy.help.fxp(next ? formatNumber(next.fxp - fxp) : null, next?.title ?? null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ease-dim fixed inset-0 z-40 bg-ink/60" />
        <Dialog.Content
          className="ease-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-3 overflow-y-auto bg-paper p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-ink sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2"
          data-testid="rank-ladder"
        >
          <div className="flex flex-col gap-1">
            <Dialog.Title className="label-caps text-[11px] font-semibold text-muted">
              {copy.ranks.kicker(factionName)}
            </Dialog.Title>
            <Dialog.Description className="font-body text-[14px] leading-snug text-text-2">
              {note}
            </Dialog.Description>
          </div>
          <ol className="flex flex-col border-t-[3px] border-double border-ink">
            {ranks.map((r) => {
              const you = r.rank === rank;
              const isNext = next !== null && r.rank === next.rank;
              return (
                <li
                  key={r.rank}
                  className={cx(
                    'flex flex-col gap-0.5 border-b border-dotted border-faint px-2 py-2',
                    you && 'bg-ink text-paper',
                  )}
                  data-testid="rank-row"
                  data-you={you || undefined}
                  data-next={isNext || undefined}
                  aria-current={you ? 'step' : undefined}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-[16px] leading-tight font-bold">
                      <span className="mr-1.5 font-label text-[12px] font-medium opacity-70">{r.rank}</span>
                      {r.title}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {you && (
                        <span className="label-caps text-[10px] font-semibold" data-testid="rank-you">
                          {copy.ranks.you}
                        </span>
                      )}
                      {isNext && (
                        <span
                          className="label-caps text-[10px] font-semibold text-petrol"
                          data-testid="rank-next"
                        >
                          {copy.ranks.next(formatNumber(r.fxp - fxp))}
                        </span>
                      )}
                      <span className="font-label text-[13px]">{copy.ranks.fxp(formatNumber(r.fxp))}</span>
                    </span>
                  </div>
                  <span
                    className={cx('font-body text-[13px] leading-snug', you ? 'text-paper-2' : 'text-text-2')}
                  >
                    {copy.ranks.opens[r.opens]}
                  </span>
                </li>
              );
            })}
          </ol>
          <Dialog.Close className="label-caps min-h-11 cursor-pointer border-[1.5px] border-ink px-4 text-[13px] hover:bg-ink hover:text-paper">
            {copy.help.close}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
