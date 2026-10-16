import { copy } from '@irongate/content/copy';
import type { GameContent, Item, Location, Shop } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import {
  ITEM_SLOTS,
  SHOP,
  asEquipment,
  bribeGate,
  bribePrice,
  buyGate,
  discretionOn,
  addToTally,
  needsConfirm,
  recordView,
  sellGate,
  sellPrice,
  shopPrice,
  strikeOldest,
  withoutUid,
} from '@irongate/rules';
import type { DayKey, PoliticalResult, RecordLevel, ShopCardView, ShopItemView } from '@irongate/rules';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import { itemCard, outfitsOf } from './itemCards';
import { assertHere, lifeAct, lifeResult } from './lifeActs';
import type { LifeDeps } from './lifeActs';
import { fadeDaysFor } from './lawBook';
import { marksOf, recordLevelOf } from './risk';
import { VersionConflict } from './txn';
import { placeOpenFor } from './views';
import { wardrobeView } from './wardrobeService';

/**
 * Slice 8 phase B, lane 1 (T10; design §3.5, §3.8; tech design §3.3, §8.2, §10.1): a shop is a card
 * on a place. Buy, sell and the back room's bribe are each one keyed transaction on the character;
 * the shop, the item and the price come from content and the rules, never from the client.
 */

const s = copy.life.shop;
const m = copy.life.modals;

/** The record's surcharge (*Repeat offender* +15 %, *Notorious* +30 %), or null. */
const surchargeOf = (level: RecordLevel): 15 | 30 | null => {
  const pct = SHOP.surchargePct[level];
  return pct === 15 || pct === 30 ? pct : null;
};

const located = (content: GameContent, locationId: string) => {
  const l = content.location(locationId);
  if (!l) throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId });
  return l;
};

/** The party store is its party's: a member's own HQ. */
const ownStore = (shop: Shop, location: Location, c: Pick<CharacterDoc, 'factionId'>) =>
  shop.kind === 'partyStore' && location.factionId === c.factionId;

const wornUids = (c: CharacterDoc): string[] => {
  const eq = asEquipment(c.equipment);
  return ITEM_SLOTS.map((x) => eq[x]).filter((u): u is string => u !== null);
};

/** Marr's discretion: the back room at half price through `discretionUntil`. */
const discretionFor = (c: CharacterDoc, today: DayKey): boolean =>
  discretionOn((c.patrons ?? []).find((p) => p.id === 'marr')?.discretionUntil ?? null, today);

/** Tech design §8.3: the shop cards of a place, for this character, now. */
export function shopCards(content: GameContent, c: CharacterDoc, locationId: string, today: DayKey): ShopCardView[] {
  const l = content.location(locationId);
  if (!l) return [];
  const record = recordLevelOf(c, today);
  const outfits = outfitsOf(c, content);
  const worn = wornUids(c);
  const inv = c.inventory ?? [];
  return content.shopsAt(locationId).map((shop): ShopCardView => {
    const members = shop.kind === 'partyStore' && !ownStore(shop, l.location, c);
    const items = shop.items.flatMap((id): ShopItemView[] => {
      const item = content.item(id);
      const spec = content.itemSpec(id);
      if (!item || !spec || item.price === undefined) return [];
      const price = shopPrice(item.price, record);
      const owned = inv.some((e) => e.itemId === id);
      const g = members
        ? { reason: 'MEMBERS_ONLY' as const }
        : buyGate({
            item: spec,
            level: c.level,
            rank: c.rank,
            factionId: c.factionId,
            owned,
            iron: c.iron,
            price,
            inOwnHq: ownStore(shop, l.location, c),
          });
      const state: ShopItemView['state'] = owned
        ? 'owned'
        : g === null
          ? 'buy'
          : g.reason === 'NOT_ENOUGH_IRON'
            ? 'needsIron'
            : g.reason === 'ALREADY_OWNED'
              ? 'owned'
              : 'locked';
      const lock =
        g && (g.reason === 'LEVEL' || g.reason === 'RANK' || g.reason === 'MEMBERS_ONLY')
          ? { reason: g.reason, need: 'need' in g ? (g.need ?? 0) : 0 }
          : null;
      return [
        {
          ...itemCard(content, c, item, null, outfits),
          price,
          surchargePct: surchargeOf(record),
          state,
          lock,
          confirm: needsConfirm(price),
        },
      ];
    });
    const sell =
      shop.buys === null
        ? null
        : {
            buys: true,
            rows: inv.flatMap((entry) => {
              const item = content.item(entry.itemId);
              const spec = content.itemSpec(entry.itemId);
              if (!item || !spec) return [];
              const g = sellGate({
                item: spec,
                entry,
                worn: false,
                inStory: false,
                buys: shop.buys,
                soldHere: shop.items.includes(entry.itemId),
              });
              if (g) return [];
              const card = itemCard(content, c, item, entry, outfits);
              return [
                {
                  uid: entry.uid,
                  itemId: item.id,
                  name: item.name,
                  art: card.art,
                  price: sellPrice(item.price!),
                  blocked: worn.includes(entry.uid) ? ('worn' as const) : null,
                  inOutfits: card.inOutfits,
                },
              ];
            }),
          };
    const discretion = discretionFor(c, today);
    const marks = recordView(marksOf(c), today, fadeDaysFor(c.factionId)).marks;
    const bribePriceNow = bribePrice(record, discretion);
    const bribe = shop.bribe
      ? {
          price: bribePriceNow,
          level: record,
          discretion,
          state: (c.rank < 3
            ? 'rank'
            : marks === 0
              ? 'clean'
              : c.today.day === today && c.today.bribe
                ? 'today'
                : c.iron < bribePriceNow
                  ? 'needsIron'
                  : 'ok') as NonNullable<ShopCardView['bribe']>['state'],
        }
      : null;
    return {
      kind: shop.kind,
      kicker: s.forSale(s.names[shop.kind]),
      line: s.lines[shop.kind],
      recordLine: surchargeOf(record) ? s.yourRecord(surchargeOf(record)!) : null,
      items,
      sell,
      bribe,
    };
  });
}

/** The place's shop that sells `itemId`, or the refusal. */
function shopFor(content: GameContent, locationId: string, itemId: string): { shop: Shop; item: Item } {
  const found = content.shopItem(locationId, itemId);
  if (!found) {
    if (content.shopsAt(locationId).length === 0) throw new GameError('NO_SHOP', { locationId });
    throw new GameError('NOT_SOLD_HERE', { itemId });
  }
  return found;
}

/** `shop.buy` (tech design §3.3): one of each item, the record's surcharge, one keyed write. */
export function buy(deps: LifeDeps, input: { locationId: string; itemId: string; idempotencyKey: string }): Promise<PoliticalResult> {
  const { content } = deps;
  const l = located(content, input.locationId);
  return lifeAct(deps, 'shop.buy', input.idempotencyKey, { locationId: input.locationId, itemId: input.itemId }, async ({ session, c, now, today }) => {
    assertHere(c, l.city.id);
    const open = placeOpenFor(content, c, l.location);
    if (!open.open) throw new GameError('ACTION_LOCKED', { lock: 'QUARTER', need: open.lock?.kind === 'level' ? open.lock.level : 0 });
    const { shop, item } = shopFor(content, input.locationId, input.itemId);
    const spec = content.itemSpec(item.id)!;
    if (item.price === undefined) throw new GameError('NOT_SOLD_HERE', { itemId: item.id });
    if (shop.kind === 'partyStore' && !ownStore(shop, l.location, c)) throw new GameError('MEMBERS_ONLY', { locationId: l.location.id });
    const record = recordLevelOf(c, today);
    const price = shopPrice(item.price, record);
    const g = buyGate({
      item: spec,
      level: c.level,
      rank: c.rank,
      factionId: c.factionId,
      owned: (c.inventory ?? []).some((e) => e.itemId === item.id),
      iron: c.iron,
      price,
      inOwnHq: ownStore(shop, l.location, c),
    });
    if (g) throw new GameError(g.reason, g.need !== undefined ? { need: g.need } : {});
    const entry = { uid: new Types.ObjectId().toHexString(), itemId: item.id, day: today, source: 'shop' as const };
    const firstCoat = item.slot === 'clothing' && !c.firsts?.coat;
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: price }, 'inventory.itemId': { $ne: item.id } },
      {
        $push: { inventory: entry },
        $inc: { iron: -price, version: 1 },
        // The paper's *wardrobe-first* line (lane 2's settlement reads it).
        ...(firstCoat ? { $set: { 'firsts.coat': new Date(now) } } : {}),
      },
      { session, returnDocument: 'after', lean: true },
    );
    if (!updated) throw new VersionConflict();
    const surcharge = surchargeOf(record);
    const words = itemCard(content, updated, item, entry, null).words;
    const text = m.bought(item.name, item.note ?? item.name, words[0] ?? s.forSale(s.names[shop.kind]));
    return lifeResult({
      content,
      session,
      before: c,
      updated,
      now,
      idempotencyKey: input.idempotencyKey,
      act: 'bought',
      stamp: copy.life.stamps.bought,
      headline: text.headline,
      body: text.body,
      lines: [
        copy.life.knock.iron(price),
        ...(surcharge ? [s.yourRecord(surcharge)] : []),
        ...(item.slot ? [s.wearItNow] : []),
      ],
      view: { kind: 'place', locationId: l.location.id },
    });
  });
}

/** `shop.sell` (§21.1 Q1, Q2): a tenth of the catalogue price; out of every outfit it was saved in. */
export function sell(deps: LifeDeps, input: { locationId: string; uid: string; idempotencyKey: string }): Promise<PoliticalResult> {
  const { content } = deps;
  const l = located(content, input.locationId);
  return lifeAct(deps, 'shop.sell', input.idempotencyKey, { locationId: input.locationId, uid: input.uid }, async ({ session, c, now, today }) => {
    assertHere(c, l.city.id);
    const shops = content.shopsAt(input.locationId).filter((x) => x.buys !== null);
    if (shops.length === 0) throw new GameError('NO_SHOP', { locationId: input.locationId });
    const entry = (c.inventory ?? []).find((e) => e.uid === input.uid);
    const item = entry ? content.item(entry.itemId) : undefined;
    const spec = entry ? content.itemSpec(entry.itemId) : undefined;
    if (!entry || !item || !spec) throw new GameError('NOT_OWNED', { uid: input.uid });
    const worn = wornUids(c).includes(entry.uid);
    let refusal: ReturnType<typeof sellGate> = null;
    for (const shop of shops) {
      refusal = sellGate({ item: spec, entry, worn, inStory: false, buys: shop.buys, soldHere: shop.items.includes(item.id) });
      if (!refusal) break;
    }
    if (refusal) throw new GameError(refusal.reason, refusal.why ? { why: refusal.why } : {});
    const price = sellPrice(item.price!);
    const outfits = outfitsOf(c, content);
    const kitUid = (c.inventory ?? []).find((e) => e.itemId === content.kitOf(c.factionId).outfit)?.uid ?? asEquipment(c.equipment).clothing ?? '';
    const stripped = withoutUid(outfits, entry.uid, kitUid);
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today, 'inventory.uid': entry.uid },
      {
        $pull: { inventory: { uid: entry.uid } },
        $set: { outfits: stripped.outfits },
        $inc: { iron: price, version: 1 },
      },
      { session, returnDocument: 'after', lean: true },
    );
    if (!updated) throw new VersionConflict();
    const names = stripped.left.map((o) => copy.life.wardrobe.outfits[o]);
    const text = m.sold(item.name);
    return lifeResult({
      content,
      session,
      before: c,
      updated,
      now,
      idempotencyKey: input.idempotencyKey,
      act: 'sold',
      stamp: copy.life.stamps.sold,
      headline: text.headline,
      body: text.body,
      lines: [
        copy.life.knock.ironGained(price),
        ...(names.length === 1 ? [s.takenOut(names[0]!)] : names.length >= 2 ? [s.takenOutBoth(names[0]!, names[1]!)] : []),
      ],
      view: { kind: 'place', locationId: l.location.id },
    });
  });
}

/** `shop.bribe` (design §3.8): the oldest mark struck off, once a day, from Rank 3. */
export function bribe(deps: LifeDeps, input: { locationId: string; idempotencyKey: string }): Promise<PoliticalResult> {
  const { content } = deps;
  const l = located(content, input.locationId);
  return lifeAct(deps, 'shop.bribe', input.idempotencyKey, { locationId: input.locationId }, async ({ session, c, now, today }) => {
    assertHere(c, l.city.id);
    if (!content.shopsAt(input.locationId).some((x) => x.bribe)) throw new GameError('NO_SHOP', { locationId: input.locationId });
    const level = recordLevelOf(c, today);
    const discretion = discretionFor(c, today);
    const price = bribePrice(level, discretion);
    const fade = fadeDaysFor(c.factionId);
    const before = recordView(marksOf(c), today, fade);
    const g = bribeGate({
      rank: c.rank,
      marks: before.marks,
      today: c.today.day === today && !!c.today.bribe,
      iron: c.iron,
      price,
    });
    if (g) throw new GameError(g.reason, g.need !== undefined ? { need: g.need } : {});
    const struck = strikeOldest(marksOf(c), today, fade);
    if (!struck) throw new GameError('NO_MARKS');
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: price } },
      { $set: { 'record.marks': struck.marks, today: { ...addToTally(c.today, today, {}), bribe: true } }, $inc: { iron: -price, version: 1 } },
      { session, returnDocument: 'after', lean: true },
    );
    if (!updated) throw new VersionConflict();
    const after = recordView(struck.marks, today, fade);
    const text = m.markBought(after.marks);
    const result = await lifeResult({
      content,
      session,
      before: c,
      updated,
      now,
      idempotencyKey: input.idempotencyKey,
      act: 'markBought',
      stamp: copy.life.stamps.markBought,
      headline: text.headline,
      body: text.body,
      knockOns: {
        record: { before: { level: before.level, marks: before.marks }, after: { level: after.level, marks: after.marks } },
      },
      lines: [copy.life.knock.iron(price), ...(discretion ? [s.halfPrice] : [])],
      view: { kind: 'place', locationId: l.location.id },
    });
    return { ...result, view: { kind: 'record', record: result.character.record! } };
  });
}

/** The Wardrobe after a buy's *Wear it now* is `wardrobe.wear`; this is the view a card refreshes with. */
export { wardrobeView };
