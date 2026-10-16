import { copy } from '@irongate/content/copy';
import type { GameContent, Item } from '@irongate/content';
import type { CharacterDoc } from '@irongate/db';
import { asEquipment, defaultOutfits, ITEM_SLOTS, outfitsWith, sellPrice } from '@irongate/rules';
import type { InventoryEntry, ItemCardView, ItemSlot, Outfits } from '@irongate/rules';
import { assetView } from './views';

/**
 * Slice 8 phase B, lane 1 (T9, T10; tech design §8.3, screens §2–§5): the item card the Wardrobe,
 * its chooser and the shops share, worded from the catalogue's effects (never a figure but Charisma
 * and the price).
 */

const w = copy.life.wardrobe;

/** The stored outfits, or the kit's defaults for a character stored without them (design §3.3). */
export function outfitsOf(c: Pick<CharacterDoc, 'outfits' | 'inventory' | 'equipment' | 'factionId'>, content: GameContent): Outfits {
  if (c.outfits) {
    return {
      town: asEquipment(c.outfits.town),
      plain: asEquipment(c.outfits.plain),
      evening: c.outfits.evening ? asEquipment(c.outfits.evening) : null,
    };
  }
  return defaultOutfits(c.inventory ?? [], c.equipment ?? {}, content.kitOf(c.factionId));
}

/** The words of an item's effects (design §3.2; copy `life.wardrobe.words`), each once. */
export function itemWords(item: Item): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    if (!out.includes(s)) out.push(s);
  };
  for (const e of item.effects ?? []) {
    if (e.kind === 'fxpPct') add(w.words.fxp);
    else if (e.kind === 'dossierChance') add(w.words.dossier);
    else if (e.on === 'intelligence' || e.on === 'surveillance') add(w.words.intelligence);
    else if (e.on === 'propaganda') add(w.words.propaganda);
    else if (e.on === 'sabotage' || e.on === 'vandalism' || e.on === 'theft') add(w.words.rough);
    else if (e.on === 'checkpoint') {
      add(w.words.checkpoint);
      add(w.words.checkpointRisk);
    } else if (e.on === 'bluff') add(w.words.bluff);
    else if (e.on === 'expose') add(w.words.expose);
  }
  if (item.slot === 'clothing' && (item.tier ?? 1) >= 2) add(w.holdsUp);
  if (item.cha >= 20) add(w.recognisedOnRival);
  if (item.slot === 'document' && (item.effects ?? []).length === 0) add(w.words.showsAtCheckpoint);
  return out;
}

/** *COAT · A GOOD COAT* · *PAPERS* · *KEEPSAKE*. */
export function kindLine(item: Item): string {
  if (!item.slot) return w.keepsake.toUpperCase();
  const slot = w.slots[item.slot].toUpperCase();
  if (item.slot === 'clothing' && item.tier) {
    return `${slot} · ${w.tierWord[item.tier as 1 | 2 | 3 | 4 | 5].toUpperCase()}`;
  }
  return item.keepsake ? `${slot} · ${w.keepsake.toUpperCase()}` : slot;
}

function keepsakeFrom(content: GameContent, item: Item): { from: string } | null {
  if (!item.keepsake) return null;
  const k = item.keepsakeFrom;
  if (k && 'patronId' in k) return { from: w.fromPatron(content.patron(k.patronId)?.name ?? k.patronId) };
  if (k && 'ambitionId' in k) {
    return { from: w.fromChapter(k.chapter, content.chapter(k.ambitionId, k.chapter)?.title ?? '') };
  }
  return { from: w.keepsake };
}

/** The card for a catalogue item, owned (`entry`) or for sale. */
export function itemCard(
  content: GameContent,
  c: Pick<CharacterDoc, 'factionId' | 'equipment'>,
  item: Item,
  entry: InventoryEntry | null,
  outfits: Outfits | null,
): ItemCardView {
  const eq = asEquipment(c.equipment);
  const art = item.art === 'faction-crest' ? content.faction(c.factionId).crestArt : item.art;
  const worn = entry !== null && ITEM_SLOTS.some((s) => eq[s] === entry.uid);
  return {
    uid: entry?.uid ?? null,
    itemId: item.id,
    name: item.name,
    art: assetView(content, art),
    kindLine: kindLine(item),
    cha: item.cha,
    words: itemWords(item),
    keepsake: keepsakeFrom(content, item),
    read: item.read ?? null,
    worn,
    inOutfits: entry && outfits ? outfitsWith(outfits, entry.uid) : [],
    sells: item.price !== undefined && !item.keepsake ? sellPrice(item.price) : null,
  };
}

/** The owned instances of a slot (keepsakes with no slot: `null`). */
export const ownedIn = (
  content: GameContent,
  inv: readonly InventoryEntry[],
  slot: ItemSlot | null,
): Array<{ entry: InventoryEntry; item: Item }> =>
  inv.flatMap((entry) => {
    const item = content.item(entry.itemId);
    return item && item.slot === slot ? [{ entry, item }] : [];
  });
