import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import type { AssetView, FactionId } from '@irongate/rules';
import { cx, formatSigned } from '../format';
import { Button } from './Button';
import { FACTION_STYLE } from './FactionCrest';
import { Picture } from './Picture';

export interface OrdersCompleteProps {
  open: boolean;
  /** The server's numbers: the all-done PC and today's order FXP. */
  note: { pc: number; fxp: number };
  factionId: FactionId;
  /** The character's name, for the secretary's line. */
  name: string;
  issuer: { name: string; portrait: AssetView };
  /** *Carry on*: the caller marks the note seen (it waits until then, even across a closed tab). */
  onCarryOn: () => void;
  pending?: boolean;
}

/**
 * Review 1 (GDD §13.7, answers §6): all three orders done is a moment of its own, in the
 * secretary's voice, shown once the completing result modal is closed: the portrait, a headline and
 * their lines, two tiles (+5 Political Capital, the day's order FXP), tomorrow's orders line and one
 * button, *Carry on*.
 */
export function OrdersComplete({
  open,
  note,
  factionId,
  name,
  issuer,
  onCarryOn,
  pending,
}: OrdersCompleteProps) {
  const t = copy.ordersComplete;
  const voice = t[factionId];
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onCarryOn();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/75" />
        <Dialog.Content
          className={cx(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col gap-3 overflow-y-auto bg-paper px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] text-ink',
            'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(480px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]',
          )}
          data-testid="orders-complete"
        >
          <div className="flex items-center gap-3 border-b-[3px] border-double border-ink pb-3">
            <Picture
              asset={issuer.portrait}
              sizes="64px"
              className="size-16 shrink-0 rounded-full border-2 border-ink object-cover object-top"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="label-caps text-[10px] text-muted">Party orders · {issuer.name}</span>
              <Dialog.Title className="font-display text-[24px] leading-tight font-black">
                {voice.headline}
              </Dialog.Title>
            </div>
          </div>
          <Dialog.Description className="font-body text-[15px] leading-snug">
            {voice.body(name)}
          </Dialog.Description>
          <div className="grid grid-cols-2 gap-2">
            <div
              className="flex flex-col gap-0.5 border-[1.5px] border-ink bg-paper-card px-2.5 py-2"
              data-testid="tile-pc"
            >
              <span className="label-caps text-[9px] text-muted">{t.pcTile}</span>
              <span className="font-label text-[22px] leading-none font-semibold">
                {formatSigned(note.pc)}
              </span>
            </div>
            <div
              className="flex flex-col gap-0.5 border-[1.5px] border-ink bg-paper-card px-2.5 py-2"
              data-testid="tile-orders-fxp"
            >
              <span className="label-caps text-[9px] text-muted">{t.fxpTile}</span>
              <span
                className={cx(
                  'font-label text-[22px] leading-none font-semibold',
                  FACTION_STYLE[factionId].text,
                )}
              >
                {formatSigned(note.fxp)}
              </span>
            </div>
          </div>
          <p className="font-mono text-[12px] text-muted">{t.tomorrow}</p>
          <Button onClick={onCarryOn} pending={pending} className="w-full">
            {t.carryOn}
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
