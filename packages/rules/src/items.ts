import type { DayKey } from './day';

/**
 * Items (ADR 0014, GDD §8.2, §21.4). The catalogue is content; the character stores inventory
 * instances and the equipped instance per slot. Worn CHA is computed on read, never stored.
 */

/** §21.1: slice 2 uses two slots; weapon, utility and accessory come with the Wardrobe (slice 8). */
export type ItemSlot = 'clothing' | 'document';
export const ITEM_SLOTS = ['clothing', 'document'] as const satisfies readonly ItemSlot[];

/** What the rules need to know about a catalogue item. */
export interface ItemSpec {
  id: string;
  /** null: a keepsake with no slot (it simply exists in the inventory). */
  slot: ItemSlot | null;
  cha: number;
  /** Unique: never sold, crafted, given or lost; never granted twice. */
  keepsake: boolean;
}

export type ItemSource = 'kit' | 'origin' | 'chapter' | 'migration';

/** One owned instance. `uid` is what equipment points at (ADR 0014). */
export interface InventoryEntry {
  uid: string;
  itemId: string;
  /** The City Day it was received. */
  day: DayKey;
  source: ItemSource;
}

/** Inventory uids per slot, or null for an empty slot. */
export interface Equipment {
  clothing: string | null;
  document: string | null;
}

/** The catalogue items equipped, in slot order; a dangling uid or unknown item is skipped. */
export function equippedItems(
  inv: readonly InventoryEntry[],
  eq: Equipment,
  spec: (id: string) => ItemSpec | undefined,
): ItemSpec[] {
  const out: ItemSpec[] = [];
  for (const uid of [eq.clothing, eq.document]) {
    if (uid === null) continue;
    const entry = inv.find((e) => e.uid === uid);
    const item = entry ? spec(entry.itemId) : undefined;
    if (item) out.push(item);
  }
  return out;
}

/** §8.2: worn CHA = the origin's CHA base + the CHA of everything equipped. */
export function wornCha(chaBase: number, equipped: readonly ItemSpec[]): number {
  return chaBase + equipped.reduce((sum, i) => sum + i.cha, 0);
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
