import { copy } from '@irongate/content/copy';
import type { ShopCardView, ShopItemView } from '@irongate/rules';
import { useState } from 'react';
import { cx, formatNumber } from '../format';
import { Button } from './Button';
import { Picture } from './Picture';
import { BottomSheet } from './Sheets';
import { ItemCard } from './Wardrobe';

/**
 * Slice 8 (screens §4, §18; tech design §12.2): a shop's card on a place's sheet, its buy confirm
 * (over 1,000 Iron), the sell sheet and the back room's row. Plain props: the server decides every
 * state (`ShopItemView.state`, `bribe.state`) and the client only words it.
 */

const s = copy.life.shop;
const w = copy.life.wardrobe;

/** The Courier price lines of an item for sale: *800 Iron*, then *Your record: +15 %*, then a lock. */
function priceLines(it: ShopItemView): string[] {
  const lock =
    it.lock?.reason === 'LEVEL'
      ? w.fromLevel(it.lock.need)
      : it.lock?.reason === 'RANK'
        ? w.fromRank3
        : it.lock?.reason === 'MEMBERS_ONLY'
          ? w.membersOnly
          : null;
  return [
    `${formatNumber(it.price)} Iron`,
    ...(it.surchargePct ? [s.yourRecord(it.surchargePct)] : []),
    ...(lock ? [lock] : []),
  ];
}

export interface ShopCardProps {
  shop: ShopCardView;
  /** A tap on *Buy*: the caller asks first when `item.confirm` (over 1,000 Iron). */
  onBuy: (item: ShopItemView) => void;
  onSell: () => void;
  onBribe: () => void;
  /** The item id (or `bribe`) waiting for the server. */
  pending: string | null;
  notice?: string | null;
}

/** Screens §4: kicker, the items in a horizontal scroll, the Courier line, *Sell something*. */
export function ShopCard({ shop, onBuy, onSell, onBribe, pending, notice }: ShopCardProps) {
  const busy = pending !== null;
  const allOwned = shop.items.length > 0 && shop.items.every((i) => i.state === 'owned');
  const canSell = !!shop.sell?.buys && shop.sell.rows.length > 0;
  const b = shop.bribe;
  return (
    <section
      aria-label={shop.kicker}
      className="mt-1 flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card py-2"
      data-testid="shop-card"
      data-shop={shop.kind}
    >
      <h3 className="label-caps px-3 text-[11px] font-semibold">{shop.kicker}</h3>
      {shop.items.length > 0 && (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1" data-testid="shop-items">
          {shop.items.map((it) => (
            <ItemCard
              key={it.itemId}
              item={it}
              fixedWidth
              lines={priceLines(it)}
              dimmed={it.state === 'locked'}
              action={
                it.state === 'buy'
                  ? {
                      label: s.buy(it.price),
                      onClick: () => onBuy(it),
                      pending: pending === it.itemId,
                      disabled: busy,
                      testId: 'shop-buy',
                    }
                  : null
              }
              state={
                it.state === 'owned' ? w.owned : it.state === 'needsIron' ? w.needsIron(it.price) : null
              }
              testId="shop-item"
            />
          ))}
        </div>
      )}
      <p className="px-3 font-mono text-[11px] text-text-2" data-testid="shop-line">
        {shop.line}
      </p>
      {shop.recordLine && (
        <p className="px-3 font-mono text-[11px] text-text-2" data-testid="shop-record">
          {shop.recordLine}
        </p>
      )}
      {allOwned && (
        <p className="px-3 font-mono text-[11px] text-muted" data-testid="shop-nothing-new">
          {w.nothingNewHere}
        </p>
      )}
      {b && b.state !== 'rank' && (
        <div className="flex flex-col gap-1 border-t border-dotted border-faint px-3 pt-2" data-testid="bribe-row">
          {b.state === 'clean' ? (
            <span className="font-mono text-[12px] text-muted">{s.cleanNothing}</span>
          ) : (
            <>
              <Button
                variant="outline"
                className="self-start"
                onClick={onBribe}
                pending={pending === 'bribe'}
                disabled={busy || b.state !== 'ok'}
                data-testid="bribe"
              >
                {s.strikeOff(b.price)}
              </Button>
              <span className="font-mono text-[11px] text-text-2">
                {b.state === 'today'
                  ? s.struckToday
                  : b.state === 'needsIron'
                    ? w.needsIron(b.price)
                    : s.strikeLine(copy.risk.recordLevel[b.level], b.price)}
              </span>
              {b.discretion && <span className="font-mono text-[11px] text-petrol">{s.halfPrice}</span>}
            </>
          )}
        </div>
      )}
      {canSell && (
        <button
          type="button"
          onClick={onSell}
          aria-haspopup="dialog"
          className="label-caps mx-3 min-h-11 cursor-pointer self-start text-[12px] font-semibold text-petrol underline decoration-dotted underline-offset-2"
          data-testid="shop-sell"
        >
          {s.sellSomething}
        </button>
      )}
      {notice && (
        <p role="status" className="px-3 font-body text-[13px] text-failure" data-testid="shop-notice">
          {notice}
        </p>
      )}
    </section>
  );
}

export interface BuyConfirmProps {
  item: ShopItemView | null;
  onOpenChange: (open: boolean) => void;
  onBuy: (item: ShopItemView) => void;
  pending: boolean;
}

/** Screens §4: over 1,000 Iron, *Buy the dress greatcoat for 4,500 Iron?* · Buy · Not now. */
export function BuyConfirm({ item, onOpenChange, onBuy, pending }: BuyConfirmProps) {
  return (
    <BottomSheet open={item !== null} onOpenChange={onOpenChange} title={item ? s.buyConfirm(item.name, item.price) : ''} stacked>
      {item && (
        <div className="flex flex-col gap-2" data-testid="buy-confirm">
          <Button onClick={() => onBuy(item)} pending={pending} data-testid="buy-confirm-buy">
            {s.buy(item.price)}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="buy-confirm-not-now">
            {s.notNow}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

export interface SellSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: ShopCardView | null;
  onSell: (uid: string) => void;
  /** The uid waiting for the server. */
  pending: string | null;
  notice?: string | null;
}

const outfitNames = (ids: ReadonlyArray<'town' | 'plain' | 'evening'>) => ids.map((id) => w.outfits[id]);

/** Screens §4, §18: the sellable owned items; a tap asks first in one line, then the `sold` modal. */
export function SellSheet({ open, onOpenChange, shop, onSell, pending, notice }: SellSheetProps) {
  const [asking, setAsking] = useState<string | null>(null);
  const rows = shop?.sell?.rows ?? [];
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setAsking(null);
        onOpenChange(o);
      }}
      title={shop ? s.sellTo(s.names[shop.kind]) : ''}
      stacked
    >
      <div className="flex flex-col" data-testid="sell-sheet">
        {rows.length === 0 && <p className="font-body text-[14px] text-text-2">{s.nothingToSell}</p>}
        {rows.map((r) => {
          const names = outfitNames(r.inOutfits);
          const outfitLine =
            names.length >= 2 ? s.inOutfits(names[0]!, names[1]!) : names.length === 1 ? s.inOutfit(names[0]!) : null;
          return (
            <div
              key={r.uid}
              className="flex flex-col gap-1.5 border-b border-dotted border-faint py-2 last:border-b-0"
              data-testid="sell-row"
              data-item={r.itemId}
            >
              <div className="flex items-center gap-2.5">
                <Picture asset={r.art} sizes="40px" decorative className="size-10 shrink-0 border border-ink object-contain" />
                <span className="min-w-0 flex-1 font-body text-[14px] font-semibold">{r.name}</span>
                <span className="font-mono text-[12px]">{`${formatNumber(r.price)} Iron`}</span>
                {r.blocked === 'worn' ? (
                  <span className="max-w-24 text-right font-mono text-[11px] text-muted">{s.takeItOffFirst}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAsking(r.uid)}
                    disabled={pending !== null}
                    className="label-caps min-h-11 min-w-11 cursor-pointer px-2 text-[12px] font-semibold text-petrol underline decoration-dotted underline-offset-2 disabled:opacity-60"
                    data-testid="sell-row-sell"
                  >
                    {s.sell}
                  </button>
                )}
              </div>
              {asking === r.uid && (
                <div className={cx('flex flex-col gap-1.5 bg-paper-card p-2')} data-testid="sell-confirm">
                  <p className="font-body text-[14px]">{s.sellConfirm(r.name, r.price)}</p>
                  {outfitLine && <p className="font-mono text-[11px] text-text-2">{outfitLine}</p>}
                  <div className="flex gap-2">
                    <Button onClick={() => onSell(r.uid)} pending={pending === r.uid} data-testid="sell-confirm-sell">
                      {s.sell}
                    </Button>
                    <Button variant="outline" onClick={() => setAsking(null)} data-testid="sell-confirm-keep">
                      {s.keepIt}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {notice && (
          <p role="status" className="pt-2 font-body text-[13px] text-failure">
            {notice}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
