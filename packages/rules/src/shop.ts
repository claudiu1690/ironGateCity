import { BRIBE, SHOP } from './constants';
import type { InventoryEntry, ItemSpec } from './items';
import type { RecordLevel } from './record';
import { roundHalfUp } from './rewards';

/**
 * Shops (design docs/design/slice-8-life.md §3.5, §3.8; ADR 0051): a card on a place. Prices are the
 * catalogue's; the record's surcharge is computed at the tap; buy-back is a tenth of the catalogue
 * price (§21.1 Q1, Q3: whole Iron, half up).
 */

/** Design §3.5: +15 % from *Repeat offender*, +30 % at *Notorious* (800 → 920, 150 → 173). */
export const shopPrice = (price: number, record: RecordLevel): number =>
  roundHalfUp(price * (1 + SHOP.surchargePct[record] / 100));

/** Design §3.5: a tenth of the catalogue price (200 → 20, 800 → 80). */
export const sellPrice = (price: number): number => roundHalfUp(price * SHOP.sellShare);

/** Design §3.5: a confirm sheet over 1,000 Iron. */
export const needsConfirm = (price: number): boolean => price > SHOP.confirmOver;

export type BuyRefusal = 'LEVEL' | 'RANK' | 'MEMBERS_ONLY' | 'ALREADY_OWNED' | 'NOT_ENOUGH_IRON';

/**
 * Design §3.5: the first unmet gate on a buy, in the order the card reads them. `inOwnHq`: the shop
 * is the actor's own party store (a party item or a `members` item needs it).
 */
export function buyGate(i: {
  item: ItemSpec;
  level: number;
  rank: number;
  factionId: string;
  owned: boolean;
  iron: number;
  price: number;
  inOwnHq: boolean;
}): null | { reason: BuyRefusal; need?: number } {
  if (i.item.factionId !== undefined && i.item.factionId !== i.factionId) return { reason: 'MEMBERS_ONLY' };
  if (i.item.members === true && !i.inOwnHq) return { reason: 'MEMBERS_ONLY' };
  if (i.item.level !== undefined && i.level < i.item.level) return { reason: 'LEVEL', need: i.item.level };
  if (i.item.rank !== undefined && i.rank < i.item.rank) return { reason: 'RANK', need: i.item.rank };
  // One of each item: shops sell one of each, so the inventory stays bounded (ADR 0051).
  if (i.owned) return { reason: 'ALREADY_OWNED' };
  if (i.iron < i.price) return { reason: 'NOT_ENOUGH_IRON', need: i.price };
  return null;
}

export type SellWhy = 'keepsake' | 'kit' | 'worn' | 'noPrice';

/**
 * Design §3.5 (§21.1 Q1, Q2): what this shop will buy. The stall buys anything sellable (`'any'`),
 * the others only what they sell (`'own'`), a shop that buys nothing `null`. Never a keepsake, the
 * kit, a worn item or an unpriced one; an item in a story (the exposé's file is not an item, so only
 * a future story) is refused as `inStory`.
 */
export function sellGate(i: {
  item: ItemSpec;
  entry: InventoryEntry;
  worn: boolean;
  inStory: boolean;
  buys: 'any' | 'own' | null;
  soldHere: boolean;
}): null | { reason: 'NOT_SOLD_HERE' | 'NOT_SELLABLE' | 'IN_STORY'; why?: SellWhy } {
  if (i.buys === null || (i.buys === 'own' && !i.soldHere)) return { reason: 'NOT_SOLD_HERE' };
  if (i.item.keepsake) return { reason: 'NOT_SELLABLE', why: 'keepsake' };
  if (i.entry.source === 'kit' || i.entry.source === 'origin') return { reason: 'NOT_SELLABLE', why: 'kit' };
  if (i.item.price === undefined) return { reason: 'NOT_SELLABLE', why: 'noPrice' };
  if (i.worn) return { reason: 'NOT_SELLABLE', why: 'worn' };
  if (i.inStory) return { reason: 'IN_STORY' };
  return null;
}

/** Design §3.8: 500 / 1,000 / 2,000 a mark by the record's level; Marr's discretion halves it. */
export function bribePrice(level: RecordLevel, discretion: boolean): number {
  const per = level === 'clean' ? 0 : BRIBE.perMark[level];
  return roundHalfUp(per * (discretion ? BRIBE.discretionShare : 1));
}

export type BribeRefusal = 'RANK' | 'NO_MARKS' | 'BRIBED_TODAY' | 'NOT_ENOUGH_IRON';

/** Design §3.8: Rank 3, a live mark, one a day, the Iron. */
export function bribeGate(i: {
  rank: number;
  marks: number;
  today: boolean;
  iron: number;
  price: number;
}): null | { reason: BribeRefusal; need?: number } {
  if (i.rank < BRIBE.rank) return { reason: 'RANK', need: BRIBE.rank };
  if (i.marks <= 0) return { reason: 'NO_MARKS' };
  if (i.today) return { reason: 'BRIBED_TODAY' };
  if (i.iron < i.price) return { reason: 'NOT_ENOUGH_IRON', need: i.price };
  return null;
}
