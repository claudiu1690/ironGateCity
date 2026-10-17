import { copy } from '@irongate/content/copy';
import type { GameContent } from '@irongate/content';
import { Character, Journey } from '@irongate/db';
import type { CharacterDoc, JourneyDoc } from '@irongate/db';
import {
  ITEM_SLOTS,
  OUTFIT_IDS,
  RECOGNITION,
  asEquipment,
  equippedItems,
  isPlainClothes,
  outfitOf,
  sameSet,
  wearGate,
  wornCha,
} from '@irongate/rules';
import type { Equipment, ItemCardView, ItemSlot, OutfitId, Outfits, WardrobeView } from '@irongate/rules';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { itemCard, outfitsOf, ownedIn } from './itemCards';
import { flatChaOf, flatCountsFor } from './personal';
import { inTransaction } from './txn';
import { wornStats } from './views';

/**
 * Slice 8 phase B, lane 1 (T9; ADR 0051, tech design §3.1–§3.2, §8.1–§8.3): the Wardrobe. Every
 * change is set-to-state (no key, ADR 0008): one `updateOne({ _id, version })`; a miss re-reads and
 * tries once more, else `CONFLICT`. No modal: the procedure returns the view.
 */

const w = copy.life.wardrobe;

type Wearer = CharacterDoc;

const heldNow = (c: Wearer) => !!c.held && c.held.state === 'in';
const onTrain = (c: Wearer) => c.journey?.status === 'onTheWay';

/** Worn Charisma with a given set, here, now (the chip's and the chooser's figure). */
function chaWith(content: GameContent, c: Wearer, eq: Equipment, now: number): number {
  const items = equippedItems(c.inventory ?? [], eq, (id) => content.itemSpec(id));
  return wornCha(c.stats.chaBase, items, flatChaOf(c, now));
}

/** Design §25 #2: the coat is recognised from `RECOGNITION.cha`'s lowest edge (20); under it, nobody looks twice. */
const RECOGNISED_FROM = Math.min(...RECOGNITION.cha.map(([at]) => at));
const chipLine = (id: OutfitId, cha: number): string =>
  id === 'town'
    ? cha >= RECOGNISED_FROM
      ? w.chipTown(cha)
      : w.chipTownPlain(cha)
    : id === 'plain'
      ? w.chipPlain(cha)
      : w.chipEvening(cha);

/** Tech design §8.3: the Wardrobe block, its chooser and the sheet. */
export function wardrobeView(content: GameContent, c: Wearer, now: number): WardrobeView {
  const outfits = outfitsOf(c, content);
  const eq = asEquipment(c.equipment);
  const eveningOpen = flatCountsFor(c, now);
  const current = outfitOf(eq, outfits, eveningOpen);
  const cha = wornStats(c, content, now).cha;
  const inv = c.inventory ?? [];
  const card = (entryUid: string | null): ItemCardView | null => {
    if (!entryUid) return null;
    const entry = inv.find((e) => e.uid === entryUid);
    const item = entry ? content.item(entry.itemId) : undefined;
    return entry && item ? itemCard(content, c, item, entry, outfits) : null;
  };
  const chips = OUTFIT_IDS.filter((id) => id !== 'evening' || outfits.evening !== null || !!c.home?.flat).map(
    (id) => {
      const set = outfits[id];
      const setCha = set ? chaWith(content, c, set, now) : cha;
      const enabled = id !== 'evening' || (eveningOpen && set !== null);
      return {
        id,
        inverted: current === id,
        enabled,
        why: id === 'evening' && !eveningOpen ? ('payRent' as const) : null,
        cha: setCha,
        line: id === 'evening' && !eveningOpen ? w.eveningWaits : chipLine(id, setCha),
      };
    },
  );
  const slots = ITEM_SLOTS.map((slot) => {
    const worn = card(eq[slot]);
    const choices = ownedIn(content, inv, slot)
      .filter(({ entry }) => entry.uid !== eq[slot])
      .map(({ entry, item }) => ({
        ...itemCard(content, c, item, entry, outfits),
        chaAfter: chaWith(content, c, { ...eq, [slot]: entry.uid }, now),
      }));
    return { slot, label: w.slots[slot], item: worn, choices };
  });
  const groups = { clothing: [], accessory: [], document: [], utility: [], keepsakes: [] } as Record<
    ItemSlot | 'keepsakes',
    ItemCardView[]
  >;
  let sellable = 0;
  for (const entry of inv) {
    const item = content.item(entry.itemId);
    if (!item) continue;
    const view = itemCard(content, c, item, entry, outfits);
    if (item.keepsake || item.slot === null) groups.keepsakes.push(view);
    else groups[item.slot].push(view);
    if (view.sells !== null && !view.worn) sellable += 1;
  }
  const lastOutfit = (c.lastOutfit ?? 'town') as OutfitId;
  return {
    cha,
    chips,
    keep: current === null ? (lastOutfit === 'evening' && !eveningOpen ? 'town' : lastOutfit) : null,
    line: {
      outfit: current,
      cha,
      word:
        current === 'evening' ? 'dressedForCasino' : isPlainClothes(cha) ? 'unnoticed' : cha >= 20 ? 'recognised' : null,
    },
    locked: heldNow(c) ? 'out' : onTrain(c) ? 'arrive' : null,
    slots,
    owned: inv.length,
    groups,
    sellable,
  };
}

/** A wardrobe refusal, worded by the client from its reason. */
function refuse(g: NonNullable<ReturnType<typeof wearGate>>): never {
  throw gameError('BAD_REQUEST', g.reason, g.where ? { where: g.where } : {});
}

type Change =
  | { kind: 'wear'; uid: string }
  | { kind: 'takeOff'; slot: ItemSlot }
  | { kind: 'outfit'; outfit: OutfitId }
  | { kind: 'keep'; outfit: OutfitId };

/** The target state of a change, or the refusal (pure over the read character). */
function target(
  content: GameContent,
  c: Wearer,
  ch: Change,
  now: number,
): { set: Record<string, unknown>; noop: boolean } {
  const outfits = outfitsOf(c, content);
  const eq = asEquipment(c.equipment);
  const flatCounts = flatCountsFor(c, now);
  const base = { held: heldNow(c), onTrain: onTrain(c), flatCounts };
  if (ch.kind === 'wear') {
    const entry = (c.inventory ?? []).find((e) => e.uid === ch.uid);
    const item = entry ? content.item(entry.itemId) : undefined;
    const g = wearGate({ ...base, owned: !!entry && !!item, slot: item ? item.slot : undefined });
    if (g) refuse(g);
    const slot = item!.slot!;
    const next = { ...eq, [slot]: ch.uid };
    return { set: { equipment: next }, noop: sameSet(eq, next) };
  }
  if (ch.kind === 'takeOff') {
    const g = wearGate({ ...base, takeOff: ch.slot });
    if (g) refuse(g);
    const next = { ...eq, [ch.slot]: null };
    return { set: { equipment: next }, noop: sameSet(eq, next) };
  }
  if (ch.kind === 'outfit') {
    const g = wearGate({ ...base, outfit: ch.outfit });
    if (g) refuse(g);
    const set = outfits[ch.outfit];
    if (!set) throw gameError('BAD_REQUEST', 'OUTFIT_LOCKED');
    // A saved set whose coat was sold falls back to the kit's (the Coat is never empty).
    const next = { ...set, clothing: set.clothing ?? eq.clothing };
    return {
      set: { equipment: next, lastOutfit: ch.outfit, ...(c.outfits ? {} : { outfits }) },
      noop: sameSet(eq, next) && c.lastOutfit === ch.outfit && !!c.outfits,
    };
  }
  // keep: the worn set saved as the outfit (Evening needs a counting flat).
  const g = wearGate({ ...base, outfit: ch.outfit });
  if (g) refuse(g);
  const saved: Outfits = { ...outfits, [ch.outfit]: eq };
  return {
    set: { outfits: saved, lastOutfit: ch.outfit },
    noop: !!c.outfits && !!outfits[ch.outfit] && sameSet(outfits[ch.outfit]!, eq) && c.lastOutfit === ch.outfit,
  };
}

/** One set-to-state write under the version guard; a miss re-reads and tries once more. */
async function change(deps: { user: SessionUser; content: GameContent; now: () => number }, ch: Change): Promise<WardrobeView> {
  const { content } = deps;
  let loaded = await loadCharacter(deps.user, content, deps.now());
  for (let attempt = 1; attempt <= 2; attempt++) {
    const c = loaded.doc;
    const now = deps.now();
    const t = target(content, c, ch, now);
    if (t.noop) return wardrobeView(content, c, now);
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version },
      { $set: t.set, $inc: { version: 1 } },
      { returnDocument: 'after', lean: true },
    );
    if (updated) return wardrobeView(content, updated as CharacterDoc, now);
    loaded = await loadCharacter(deps.user, content, deps.now());
  }
  throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: 2 });
}

type Deps = { user: SessionUser; content: GameContent; now: () => number };

export async function getWardrobe(deps: Deps): Promise<WardrobeView> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  return wardrobeView(deps.content, loaded.doc, now);
}

export const wear = (deps: Deps, uid: string) => change(deps, { kind: 'wear', uid });
export const takeOff = (deps: Deps, slot: Exclude<ItemSlot, 'clothing'>) => change(deps, { kind: 'takeOff', slot });
export const changeOutfit = (deps: Deps, outfit: OutfitId) => change(deps, { kind: 'outfit', outfit });
export const keepOutfit = (deps: Deps, outfit: OutfitId) => change(deps, { kind: 'keep', outfit });

/**
 * Tech design §3.2 (ADR 0051): *Change into plain clothes* on the way: the journey's `dress` set
 * once while it is on the way; `settleArrival` dresses the character at the station. Only Plain
 * clothes (`OUTFIT_LOCKED` otherwise is the procedure's input type).
 */
export async function dressOnArrival(deps: Deps, journeyId: string): Promise<{ done: boolean }> {
  const loaded = await loadCharacter(deps.user, deps.content, deps.now());
  const c = loaded.doc;
  if (!Types.ObjectId.isValid(journeyId)) throw new GameError('NO_JOURNEY', {}, 'BAD_REQUEST').toTRPC();
  return inTransaction(async (session) => {
    const j = await Journey.findById(journeyId).session(session).lean<JourneyDoc>();
    if (!j || !j.characterId.equals(c._id) || j.status !== 'onTheWay') {
      throw new GameError('NO_JOURNEY', {}, 'BAD_REQUEST').toTRPC();
    }
    if (j.dress === 'plain') return { done: true };
    await Journey.updateOne({ _id: j._id, status: 'onTheWay' }, { $set: { dress: 'plain' } }, { session });
    // The pointer's version moves so a second tab re-reads.
    await Character.updateOne({ _id: c._id }, { $inc: { version: 1 } }, { session });
    return { done: true };
  });
}
