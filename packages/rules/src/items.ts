import { ITEM_EFFECT_BOUNDS, PLAIN_CLOTHES } from './constants';
import type { ItemEffectKind } from './constants';
import type { DayKey } from './day';

/**
 * Items (ADR 0014, 0051; GDD §8.2, §21.4; design docs/design/slice-8-life.md §3). The catalogue is
 * content; the character stores inventory instances and the equipped instance per slot. Worn CHA is
 * computed on read, never stored.
 */

/** Slice 8 (design §3.1): four slots, the player reads *Coat · On you · Papers · Tools*. No weapon slot. */
export type ItemSlot = 'clothing' | 'accessory' | 'document' | 'utility';
export const ITEM_SLOTS = [
  'clothing',
  'accessory',
  'document',
  'utility',
] as const satisfies readonly ItemSlot[];

/** The acts an item's `chancePct` may name besides an action or mission type (design §3.2). */
export const ITEM_SPECIAL_WORK = ['checkpoint', 'bluff', 'expose'] as const;
export type ItemSpecialWork = (typeof ITEM_SPECIAL_WORK)[number];

/** Design §3.2 (ADR 0052): a closed list of three kinds; nothing touches Energy, Iron, Rested or opinion. */
export type ItemEffect =
  | { kind: 'chancePct'; on: string; value: number; against?: 'police' }
  | { kind: 'fxpPct'; value: number }
  | { kind: 'dossierChance'; value: number };

/** What the rules need to know about a catalogue item. */
export interface ItemSpec {
  id: string;
  /** null: a keepsake with no slot (it simply exists in the inventory). */
  slot: ItemSlot | null;
  cha: number;
  /** Unique: never sold, crafted, given or lost; never granted twice. */
  keepsake: boolean;
  /** Slice 8: the clothing tier (armour by tier, ADR 0051); absent before the Wardrobe. */
  tier?: number | null;
  /** Slice 8 (design §3.2): absent is no effect. */
  effects?: readonly ItemEffect[];
  /** Slice 8: the catalogue price; absent is never bought or sold. */
  price?: number;
  level?: number;
  rank?: number;
  factionId?: string;
  /** Any member, at their own party store. */
  members?: boolean;
}

export type ItemSource = 'kit' | 'origin' | 'chapter' | 'migration' | 'shop' | 'patron';

/** One owned instance. `uid` is what equipment points at (ADR 0014). */
export interface InventoryEntry {
  uid: string;
  itemId: string;
  /** The City Day it was received. */
  day: DayKey;
  source: ItemSource;
}

/**
 * Inventory uids per slot, or null for an empty slot. The Coat is never empty once a character is
 * made (`wearGate`'s `COAT_REQUIRED`); the type keeps `null` for the join's first moment and for
 * characters stored before slice 8 (accessory and utility absent until migration 012).
 */
export interface Equipment {
  clothing: string | null;
  accessory: string | null;
  document: string | null;
  utility: string | null;
}

export const EMPTY_EQUIPMENT: Equipment = { clothing: null, accessory: null, document: null, utility: null };

/** A stored set (pre-slice-8 documents lack two slots) read as the four. */
export const asEquipment = (eq: Partial<Equipment> | null | undefined): Equipment => ({
  clothing: eq?.clothing ?? null,
  accessory: eq?.accessory ?? null,
  document: eq?.document ?? null,
  utility: eq?.utility ?? null,
});

/** The catalogue items equipped, in slot order; a dangling uid or unknown item is skipped. */
export function equippedItems(
  inv: readonly InventoryEntry[],
  eq: Partial<Equipment>,
  spec: (id: string) => ItemSpec | undefined,
): ItemSpec[] {
  const out: ItemSpec[] = [];
  const set = asEquipment(eq);
  for (const slot of ITEM_SLOTS) {
    const uid = set[slot];
    if (uid === null) continue;
    const entry = inv.find((e) => e.uid === uid);
    const item = entry ? spec(entry.itemId) : undefined;
    if (item) out.push(item);
  }
  return out;
}

/**
 * §8.2 (design §3.1): worn CHA = the origin's CHA base + the CHA of everything equipped + the flat's
 * +2 while standing in its city, paid, and resident (`flatCha`, ADR 0056).
 */
export function wornCha(chaBase: number, equipped: readonly ItemSpec[], flatBonus = 0): number {
  return chaBase + equipped.reduce((sum, i) => sum + i.cha, 0) + flatBonus;
}

/** The worn coat's tier, for `armourOf` and `yourPower` (ADR 0051: armour is the tier's, not stored). */
export const coatTier = (equipped: readonly ItemSpec[]): number | null =>
  equipped.find((i) => i.slot === 'clothing')?.tier ?? null;

/** Design §3.3: plain clothes are defined by effect, worn Charisma under 10. */
export const isPlainClothes = (cha: number): boolean => cha < PLAIN_CLOTHES.under;

export type OutfitId = 'town' | 'plain' | 'evening';
export const OUTFIT_IDS = ['town', 'plain', 'evening'] as const satisfies readonly OutfitId[];

export interface Outfits {
  town: Equipment;
  plain: Equipment;
  /** Null until a flat is bought (design §6). */
  evening: Equipment | null;
}

export const sameSet = (a: Partial<Equipment>, b: Partial<Equipment>): boolean => {
  const x = asEquipment(a);
  const y = asEquipment(b);
  return ITEM_SLOTS.every((s) => x[s] === y[s]);
};

/**
 * Screens §2 (ADR 0051): the outfit chip inverted is the first saved outfit equal to what is worn,
 * in the order town, plain, evening; null when nothing matches (the *Keep this as …* button shows).
 * Evening counts only while the flat counts (a lapsed flat's set is remembered, not worn as a set).
 */
export function outfitOf(eq: Partial<Equipment>, outfits: Outfits, eveningOpen = true): OutfitId | null {
  if (sameSet(eq, outfits.town)) return 'town';
  if (sameSet(eq, outfits.plain)) return 'plain';
  if (eveningOpen && outfits.evening && sameSet(eq, outfits.evening)) return 'evening';
  return null;
}

export type WearRefusal = 'CHANGE_LOCKED' | 'NOT_OWNED' | 'NOT_WEARABLE' | 'OUTFIT_LOCKED' | 'COAT_REQUIRED';

/**
 * Design §3.3 (tech design §3.1): the first refusal of a change of clothes, or null. Locked in the
 * cells and the infirmary (`held`) and on a train; Evening needs a counting flat; the Coat slot is
 * never emptied. `owned`/`slot` describe the item being put on (absent for an outfit or a take-off).
 */
export function wearGate(i: {
  held: boolean;
  onTrain: boolean;
  /** Wearing one item: is it in the inventory, and its catalogue slot. */
  owned?: boolean;
  slot?: ItemSlot | null;
  /** Changing into an outfit. */
  outfit?: OutfitId;
  /** Taking a slot off. */
  takeOff?: ItemSlot;
  flatCounts: boolean;
}): null | { reason: WearRefusal; where?: 'held' | 'train' } {
  if (i.held) return { reason: 'CHANGE_LOCKED', where: 'held' };
  if (i.onTrain) return { reason: 'CHANGE_LOCKED', where: 'train' };
  if (i.owned === false) return { reason: 'NOT_OWNED' };
  if (i.slot === null) return { reason: 'NOT_WEARABLE' };
  if (i.outfit === 'evening' && !i.flatCounts) return { reason: 'OUTFIT_LOCKED' };
  if (i.takeOff === 'clothing') return { reason: 'COAT_REQUIRED' };
  return null;
}

/**
 * Design §3.3 (migration 012): Town is what is worn; Plain clothes is the faction's Tier I outfit and
 * the party card, nothing else; Evening waits for a flat. The kit's uids are found in the inventory.
 */
export function defaultOutfits(
  inv: readonly InventoryEntry[],
  worn: Partial<Equipment>,
  kit: { outfit: string; card: string },
): Outfits {
  const uidOf = (itemId: string) => inv.find((e) => e.itemId === itemId)?.uid ?? null;
  const town = asEquipment(worn);
  return {
    town,
    plain: {
      clothing: uidOf(kit.outfit) ?? town.clothing,
      accessory: null,
      document: uidOf(kit.card),
      utility: null,
    },
    evening: null,
  };
}

/**
 * Tech design §3.3 (§22.1 Q2): a sold item leaves every outfit it was saved in; a coat falls back to
 * the kit's outfit (the Coat slot is never empty), anything else to null. `left` names the outfits.
 */
export function withoutUid(
  outfits: Outfits,
  uid: string,
  kitOutfitUid: string,
): { outfits: Outfits; left: OutfitId[] } {
  const left: OutfitId[] = [];
  const strip = (id: OutfitId, set: Equipment): Equipment => {
    let out = set;
    for (const slot of ITEM_SLOTS) {
      if (out[slot] !== uid) continue;
      out = { ...out, [slot]: slot === 'clothing' ? kitOutfitUid : null };
      if (!left.includes(id)) left.push(id);
    }
    return out;
  };
  return {
    outfits: {
      town: strip('town', outfits.town),
      plain: strip('plain', outfits.plain),
      evening: outfits.evening ? strip('evening', outfits.evening) : null,
    },
    left,
  };
}

/** Which outfits name a uid (the sell sheet's *It's in your {outfit} outfit*). */
export const outfitsWith = (outfits: Outfits, uid: string): OutfitId[] =>
  OUTFIT_IDS.filter((id) => {
    const set = outfits[id];
    return set !== null && ITEM_SLOTS.some((s) => set[s] === uid);
  });

/**
 * Design §3.2 (ADR 0051): an effect outside its kind's bound, as a problem string, or null. Content's
 * loader runs it on every catalogue item.
 */
export function itemEffectBoundProblem(e: ItemEffect): string | null {
  const bounds = ITEM_EFFECT_BOUNDS[e.kind as ItemEffectKind] as readonly [number, number] | undefined;
  if (!bounds) return `unknown item effect "${(e as { kind: string }).kind}"`;
  const [lo, hi] = bounds;
  if (!Number.isInteger(e.value) || e.value < lo || e.value > hi)
    return `${e.kind} ${e.value} is outside ${lo}–${hi}`;
  if (e.kind === 'chancePct' && e.against !== undefined && e.on !== 'bluff')
    return `chancePct against ${e.against} is only on "bluff"`;
  return null;
}

/** Add an item to the inventory; a keepsake the character already has is not granted again. */
export function grantItem(
  inv: readonly InventoryEntry[],
  item: ItemSpec,
  entry: Omit<InventoryEntry, 'itemId'>,
): { inventory: InventoryEntry[]; granted: boolean } {
  if (item.keepsake && inv.some((e) => e.itemId === item.id)) {
    return { inventory: [...inv], granted: false };
  }
  return { inventory: [...inv, { ...entry, itemId: item.id }], granted: true };
}
