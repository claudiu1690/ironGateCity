import { copy } from '@irongate/content/copy';
import { BAR } from '@irongate/rules';
import type { AssetView, BarCardView, BuffsView, DiningCardView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatClock } from '../format';
import { Button } from './Button';
import { HelpButton, helpMark } from './Help';
import { Picture } from './Picture';

/**
 * Slice 8 (screens §18.4–§18.5; design §24.3): the bar's card (*Buy a round*, *A plate of
 * something*), the dining room's card (*Dinner*) and the Me tab's buff line. Plain props: the server
 * sends every state; times are the player's clock.
 */

const b = copy.life.bar;

function Row({
  art,
  title,
  line,
  price,
  state,
  button,
  testId,
}: {
  art?: AssetView;
  title: string;
  line: string;
  price: string;
  state: string | null;
  button: ReactNode;
  testId: string;
}) {
  return (
    <div className="flex min-h-[88px] gap-3 border-b border-dotted border-faint px-3 py-2 last:border-b-0" data-testid={testId}>
      <div className="size-16 shrink-0 self-start overflow-hidden border border-ink bg-paper">
        {art && <Picture asset={art} sizes="64px" decorative className="size-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-body text-[15px] leading-snug font-semibold">{title}</span>
        <span className="font-mono text-[11px] leading-snug">{line}</span>
        <span className="font-mono text-[11px] leading-snug text-muted">{price}</span>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {button}
          {state && (
            <span className="font-mono text-[12px] text-muted" data-testid="bar-state">
              {state}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const energyWord = () => copy.risk.needsEnergy(BAR.energy);

export interface BarCardProps {
  card: BarCardView;
  onRound: () => void;
  onPlate: () => void;
  /** `round` or `plate` while the server answers. */
  pending: string | null;
  notice?: string | null;
}

/** Screens §18.4: *The bar · {place}*, a round and a plate. */
export function BarCard({ card, onRound, onPlate, pending, notice }: BarCardProps) {
  const busy = pending !== null;
  const r = card.round;
  const p = card.plate;
  const roundState =
    r.state === 'today'
      ? b.threeADay
      : r.state === 'full'
        ? b.nineInHand
        : r.state === 'needsIron'
          ? copy.life.wardrobe.needsIron(BAR.round.iron)
          : r.state === 'needsEnergy'
            ? energyWord()
            : null;
  const plateState =
    p.state === 'fed' && p.until !== null
      ? b.wellFedUntil(formatClock(p.until))
      : p.state === 'needsIron'
        ? copy.life.wardrobe.needsIron(BAR.plate.iron)
        : p.state === 'needsEnergy'
          ? energyWord()
          : null;
  return (
    <section aria-label={b.kicker(card.place)} className="mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card" data-testid="bar-card">
      <h3 className="label-caps border-b border-ink px-3 py-1.5 text-[11px] font-semibold">{b.kicker(card.place)}</h3>
      <Row
        art={card.art?.round}
        title={b.round}
        line={b.roundLine}
        price={b.roundPrice}
        state={roundState}
        button={
          r.state === 'ok' ? (
            <Button onClick={onRound} pending={pending === 'round'} disabled={busy} data-testid="bar-round">
              {b.buy(BAR.round.iron)}
            </Button>
          ) : null
        }
        testId="bar-round-row"
      />
      <Row
        art={card.art?.plate}
        title={b.plate}
        line={b.plateLine}
        price={b.platePrice}
        state={plateState}
        button={
          p.state === 'ok' ? (
            <Button onClick={onPlate} pending={pending === 'plate'} disabled={busy} data-testid="bar-plate">
              {b.buy(BAR.plate.iron)}
            </Button>
          ) : null
        }
        testId="bar-plate-row"
      />
      {notice && (
        <p role="status" className="px-3 pb-2 font-body text-[13px] text-failure" data-testid="bar-notice">
          {notice}
        </p>
      )}
    </section>
  );
}

export interface DiningCardProps {
  card: DiningCardView;
  onDinner: () => void;
  pending: boolean;
  notice?: string | null;
}

/** Screens §18.4: *The dining room · {hotel}*, dinner (Charisma 10 at the door). */
export function DiningCard({ card, onDinner, pending, notice }: DiningCardProps) {
  const state =
    card.state === 'notDressed'
      ? b.notDressed
      : card.state === 'fed' && card.until !== null
        ? b.wellFedUntil(formatClock(card.until))
        : card.state === 'needsIron'
          ? copy.life.wardrobe.needsIron(BAR.dinner.iron)
          : card.state === 'needsEnergy'
            ? energyWord()
            : null;
  return (
    <section
      aria-label={b.diningKicker(card.hotel)}
      className={cx('mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card')}
      data-testid="dining-card"
      data-state={card.state}
    >
      <h3 className="label-caps border-b border-ink px-3 py-1.5 text-[11px] font-semibold">{b.diningKicker(card.hotel)}</h3>
      <Row
        art={card.art}
        title={b.dinner}
        line={b.dinnerLine}
        price={b.dinnerPrice}
        state={state}
        button={
          card.state === 'ok' ? (
            <Button onClick={onDinner} pending={pending} data-testid="dining-dinner">
              {b.buy(BAR.dinner.iron)}
            </Button>
          ) : null
        }
        testId="dining-row"
      />
      {notice && (
        <p role="status" className="px-3 pb-2 font-body text-[13px] text-failure">
          {notice}
        </p>
      )}
    </section>
  );
}

/** Screens §18.5: *Well fed until 19:40 · In good spirits, 2 missions*, under the stats block. */
export function BuffLine({ buffs, now }: { buffs: BuffsView | null; now: number }) {
  if (!buffs) return null;
  const fed = buffs.wellFedUntil !== null && buffs.wellFedUntil > now ? buffs.wellFedUntil : null;
  const spirits = buffs.spirits > 0 ? buffs.spirits : null;
  if (fed === null && spirits === null) return null;
  const notes = [...(fed !== null ? [copy.life.help.wellFed()] : []), ...(spirits !== null ? [copy.life.help.goodSpirits()] : [])];
  return (
    <HelpButton notes={notes} label="What well fed and in good spirits mean" className="self-start">
      <span className={cx('font-mono text-[12px]', helpMark)} data-testid="me-buffs">
        {b.meLine(fed !== null ? formatClock(fed) : null, spirits)}
      </span>
    </HelpButton>
  );
}
