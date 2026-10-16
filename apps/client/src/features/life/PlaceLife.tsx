import type { HireRowView, PoliticalResult, ShopCardView, ShopItemView } from '@irongate/rules';
import { BarCard, BuyConfirm, DiningCard, HireCard, HireConfirm, SellSheet, ShopCard } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc, trpcClient } from '../../lib/trpc';
import { lifeNotice } from './lifeErrors';

/** The city page's political act (`usePoliticalAct`): its modal is the page's own. */
interface PlaceAct {
  run: (label: string, call: (idempotencyKey: string) => Promise<PoliticalResult>) => Promise<void>;
  pending: string | null;
  error: unknown;
}

/**
 * Slice 8 phase C, lane P (screens §4, §18.1, §18.4; tech design §12.1): a place's life cards from
 * `life.place`, in the sheet's card slot under the tickets and above the Jobs card: the shops, the
 * party store's *Someone to walk with you*, the bar, the dining room, then the back room. Each act
 * is one tap through the page's political act (one key per tap; the result modal is the page's).
 */
export function PlaceLifeCards({ locationId, open, act }: { locationId: string; open: boolean; act: PlaceAct }) {
  const cards = useQuery({
    ...trpc.life.place.queryOptions({ locationId }),
    enabled: open,
    refetchOnMount: 'always',
  });
  const [asking, setAsking] = useState<ShopItemView | null>(null);
  const [askingHire, setAskingHire] = useState<HireRowView | null>(null);
  const [selling, setSelling] = useState<ShopCardView | null>(null);
  // The card whose act answered last: its refusal is worded under it.
  const [last, setLast] = useState<string | null>(null);
  const data = cards.data;
  if (!data) return null;

  const notice = (card: string) => (act.pending === null && act.error && last === card ? (lifeNotice(act.error) ?? null) : null);
  const go = (card: string, label: string, call: (k: string) => Promise<PoliticalResult>) => {
    setLast(card);
    void act.run(label, call);
  };
  const buy = (shop: ShopCardView, item: ShopItemView) => {
    setAsking(null);
    go(`shop-${shop.kind}`, item.itemId, (k) => trpcClient.shop.buy.mutate({ locationId, itemId: item.itemId, idempotencyKey: k }));
  };
  const hire = (row: HireRowView) => {
    setAskingHire(null);
    go('hire', `hire-${row.tier}`, (k) => trpcClient.bodyguard.hire.mutate({ locationId, tier: row.tier, idempotencyKey: k }));
  };
  const shopCard = (shop: ShopCardView) => (
    <ShopCard
      key={shop.kind}
      shop={shop}
      onBuy={(item) => (item.confirm ? setAsking(item) : buy(shop, item))}
      onSell={() => setSelling(shop)}
      onBribe={() =>
        go(`shop-${shop.kind}`, 'bribe', (k) => trpcClient.shop.bribe.mutate({ locationId, idempotencyKey: k }))
      }
      pending={act.pending}
      notice={notice(`shop-${shop.kind}`)}
    />
  );
  const askingShop = asking ? data.shops.find((s) => s.items.some((i) => i.itemId === asking.itemId)) : undefined;
  // A sale's sheet follows the fresh card (a row goes once it is sold).
  const sellShop = selling ? (data.shops.find((s) => s.kind === selling.kind) ?? null) : null;

  return (
    <div className="flex flex-col gap-2" data-testid="place-life">
      {data.shops.filter((s) => s.kind !== 'backRoom').map(shopCard)}
      {data.hire && (
        <HireCard
          card={data.hire}
          onHire={(row) => (row.confirm ? setAskingHire(row) : hire(row))}
          onRenew={(weeks) =>
            go('hire', `renew-${weeks}`, (k) => trpcClient.bodyguard.renew.mutate({ weeks, idempotencyKey: k }))
          }
          pending={act.pending}
          notice={notice('hire')}
        />
      )}
      {data.bar && (
        <BarCard
          card={data.bar}
          onRound={() => go('bar', 'round', (k) => trpcClient.bar.round.mutate({ locationId, idempotencyKey: k }))}
          onPlate={() => go('bar', 'plate', (k) => trpcClient.bar.meal.mutate({ locationId, idempotencyKey: k }))}
          pending={act.pending === 'round' || act.pending === 'plate' ? act.pending : null}
          notice={notice('bar')}
        />
      )}
      {data.dining && (
        <DiningCard
          card={data.dining}
          onDinner={() => go('dining', 'dinner', (k) => trpcClient.bar.dinner.mutate({ locationId, idempotencyKey: k }))}
          pending={act.pending === 'dinner'}
          notice={notice('dining')}
        />
      )}
      {data.shops.filter((s) => s.kind === 'backRoom').map(shopCard)}
      <BuyConfirm
        item={asking}
        onOpenChange={(o) => !o && setAsking(null)}
        onBuy={(item) => askingShop && buy(askingShop, item)}
        pending={asking !== null && act.pending === asking.itemId}
      />
      <HireConfirm
        row={askingHire}
        onOpenChange={(o) => !o && setAskingHire(null)}
        onHire={hire}
        pending={askingHire !== null && act.pending === `hire-${askingHire.tier}`}
      />
      <SellSheet
        open={selling !== null}
        onOpenChange={(o) => !o && setSelling(null)}
        shop={sellShop}
        onSell={(uid) => {
          const kind = selling?.kind ?? 'clothesStall';
          setSelling(null);
          go(`shop-${kind}`, uid, (k) => trpcClient.shop.sell.mutate({ locationId, uid, idempotencyKey: k }));
        }}
        pending={act.pending}
      />
    </div>
  );
}
