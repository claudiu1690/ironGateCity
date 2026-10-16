import type { ItemSlot, OutfitId } from './items';
import type { AssetView } from './types';

/**
 * Slice 8 phase B, lane 1 (docs/tech/slice-8.md §8.3, §24.6): the Wardrobe's, the shops', the
 * patrons', the bodyguard's and the bar's views. Built by the server; the client renders words,
 * never a chance or a recognition figure. The Dossier's, the exposé's, the home's and Legacy's are
 * lane 2's (`lifeViews.ts`).
 */

/** One item, owned (`uid`) or for sale (`uid: null`). */
export interface ItemCardView {
  uid: string | null;
  itemId: string;
  name: string;
  art: AssetView;
  /** *COAT · A GOOD COAT*. */
  kindLine: string;
  cha: number;
  /** *better odds watching and listening*, *holds up in a run-in*, *recognised on rival ground*. */
  words: string[];
  keepsake: { from: string } | null;
  /** A keepsake's text behind *Read*. */
  read: string | null;
  worn: boolean;
  inOutfits: OutfitId[];
  /** What a market pays for it, or null (never sold). */
  sells: number | null;
}

export interface WardrobeChipView {
  id: OutfitId;
  inverted: boolean;
  enabled: boolean;
  /** Evening while the rent is out. */
  why: 'payRent' | null;
  /** Worn Charisma in that outfit, here, now. */
  cha: number;
  /** *Town · Charisma 17 · recognised on rival ground*. */
  line: string;
}

export interface WardrobeView {
  cha: number;
  chips: WardrobeChipView[];
  /** *Keep this as …* when nothing matches (the outfit last chosen). */
  keep: OutfitId | null;
  line: { outfit: OutfitId | null; cha: number; word: 'recognised' | 'unnoticed' | 'dressedForCasino' | null };
  /** *Change when you're out* (held) / *Change when you arrive* (on a train). */
  locked: 'out' | 'arrive' | null;
  slots: Array<{
    slot: ItemSlot;
    label: string;
    item: ItemCardView | null;
    /** The other owned items of the slot, each with the worn Charisma it would give. */
    choices: Array<ItemCardView & { chaAfter: number }>;
  }>;
  owned: number;
  groups: Record<ItemSlot | 'keepsakes', ItemCardView[]>;
  /** What a market would buy (the sheet's *Sells at a market: n things*). */
  sellable: number;
}

/** Tech design §8.3: a shop's card on a place's sheet. */
export interface ShopItemView extends ItemCardView {
  price: number;
  surchargePct: 15 | 30 | null;
  state: 'buy' | 'owned' | 'needsIron' | 'locked';
  lock: { reason: 'LEVEL' | 'RANK' | 'MEMBERS_ONLY'; need: number } | null;
  /** Over 1,000 Iron: a confirm sheet. */
  confirm: boolean;
}

export interface ShopCardView {
  kind: 'clothesStall' | 'partyStore' | 'tailor' | 'press' | 'backRoom';
  kicker: string;
  line: string;
  /** *Your record: +15 %*, or null. */
  recordLine: string | null;
  items: ShopItemView[];
  sell: {
    buys: boolean;
    rows: Array<{
      uid: string;
      itemId: string;
      name: string;
      art: AssetView;
      price: number;
      blocked: 'worn' | null;
      inOutfits: OutfitId[];
    }>;
  } | null;
  bribe: {
    price: number;
    level: 'clean' | 'onFile' | 'repeat' | 'notorious';
    discretion: boolean;
    state: 'ok' | 'clean' | 'today' | 'needsIron' | 'rank';
  } | null;
}

/** Tech design §24.6: the party store's hire card. */
export interface HireRowView {
  tier: 1 | 2 | 3;
  said: 'doorman' | 'steward' | 'minder';
  portrait: AssetView;
  week: number;
  /** Against a street enforcer on a mission at home (§24.10 Q7). */
  word: 'good' | 'fair' | 'long';
  state: 'hire' | 'level' | 'rank' | 'withYou' | 'running' | 'needsIron';
  need?: number;
  name?: string;
  until?: number;
  confirm: boolean;
  renew?: { week: number; four: number | null };
}

export interface HireCardView {
  rows: HireRowView[];
}

export interface BarCardView {
  place: string;
  /** Phase C, lane P: the two rows' pictures (`item.round`, `item.bar-plate`). */
  art?: { round: AssetView; plate: AssetView };
  round: { state: 'ok' | 'today' | 'full' | 'needsIron' | 'needsEnergy'; left: number };
  plate: { state: 'ok' | 'fed' | 'needsIron' | 'needsEnergy'; until: number | null };
}

export interface DiningCardView {
  hotel: string;
  /** Phase C, lane P: the row's picture (`scene.hotel`, cropped to 64 px). */
  art?: AssetView;
  state: 'ok' | 'notDressed' | 'fed' | 'needsIron' | 'needsEnergy';
  until: number | null;
  cha: 10;
}

/** Tech design §24.6: the Me tab's *Walking with you* row. */
export interface MinderView {
  tier: 1 | 2 | 3;
  said: 'doorman' | 'steward' | 'minder';
  name: string;
  portrait: AssetView;
  /** The last paid City Day. */
  until: number;
  state: 'with' | 'last';
  renew: { week: number; four: number | null };
}

/** Tech design §24.6: the Me tab's buff line. */
export interface BuffsView {
  wellFedUntil: number | null;
  tier: 'plate' | 'dinner' | null;
  spirits: number;
}

/** Tech design §8.3: the cards a place carries (lane 1's). */
export interface PlaceLifeCardsView {
  shops: ShopCardView[];
  hire: HireCardView | null;
  bar: BarCardView | null;
  dining: DiningCardView | null;
  /** Slice 8 (T13): the patron who receives here (Herald House, the Pier Hotel). */
  patron?: PatronCardView | null;
}

// ---------------------------------------------------------------------------------------------
// Slice 8 phase B, lane 1 (T13; tech design §8.3, §10.3; design §5): patrons and the Front.
// ---------------------------------------------------------------------------------------------

/** Tech design §10.3: a Favour gain on a society call, a gift or the paper's thanks. */
export interface FavourKnock {
  patronId: 'crane' | 'marr';
  patron: string;
  before: number;
  after: number;
  /** Tier ids crossed (`acquaintance` … `protege`). */
  crossed: string[];
  /** *Favour with Julius Marr 12 → 14* (and *Associate*, when crossed). */
  line: string;
}

/** Tech design §10.3: a Request advanced by this act (*Crane's letter: 1 of 2*). */
export interface RequestKnock {
  patronId: 'crane' | 'marr';
  requestId: string;
  progress: number;
  target: number;
  done: boolean;
  line: string;
}

/** Tech design §8.3: one open Request on the patron's card (and the Me tab's clock). */
export interface PatronRequestView {
  id: string;
  title: string;
  line: string;
  /** The last City Day it can be done (`by {weekday}`). */
  until: number;
  untilWeekday: string;
  progress: number;
  target: number;
  done: boolean;
}

/** Tech design §8.3 (screens §8.1): the patron's card at the place (Herald House, the Pier Hotel). */
export interface PatronCardView {
  id: 'crane' | 'marr';
  name: string;
  portrait: AssetView;
  voice: string;
  locationId: string;
  /** The card was seen at the place (the first visit, the letters' clock). */
  visited: boolean;
  /** Level 10 reached (below: the card reads *from Level 10*). */
  level: boolean;
  tier: string | null;
  tierWord: string;
  favour: number;
  next: { tier: string; tierWord: string; at: number } | null;
  /** *Associate · Favour 41 · Confidant at 60*. */
  line: string;
  gift: { cost: number; state: 'ok' | 'given' | 'needsIron' | 'level' };
  requests: PatronRequestView[];
  /** The Confidant's favour (null below Confidant). */
  favourAct: {
    act: 'plantHeadline' | 'discretion';
    title: string;
    pc: number;
    state: 'ok' | 'used' | 'needsPc';
    /** `used`: the day it is ready again. */
    from: number | null;
    fromWeekday: string | null;
    /** Crane's: the live Issues of the open cities (the chooser). */
    issues?: Array<{ docId: string; cityName: string; name: string }>;
  } | null;
  /** Marr's: the back room's half price through this day. */
  discretionUntil: number | null;
  perks: Array<{ tier: string; line: string; reached: boolean }>;
  /** The Associate's introduction (the morgue file, the late table), by mission id. */
  introduction: { missionId: string; locationId: string; open: boolean };
}

/** Screens §8.2: the Me tab's clock per patron met (or not yet). */
export interface PatronClockView {
  id: 'crane' | 'marr';
  name: string;
  tierWord: string;
  favour: number;
  next: { tierWord: string; at: number } | null;
  /** *Edith Crane · Associate · 41*. */
  line: string;
  requests: PatronRequestView[];
}

/** Tech design §8.3 (screens §14): a society call's ticket lines (the Front and the capital's). */
export interface SocietyTicketView {
  /** The Charisma figure (the difficulty). */
  needs: number;
  /** Ten under it: worn Charisma at the door. */
  door: number;
  /** *needs Charisma 15 · the door is at 5*. */
  needsLine: string;
  /** The town's patron, by name (null: none in this city). */
  patron: string | null;
  /** Favour on a Success (+2; the late table +3). */
  favour: number;
  /** *no Party XP · +2 Favour with Julius Marr*. */
  tag: string | null;
  calledToday: boolean;
}

/** Tech design §8.1 (design §5.4, §21.1 Q12): the morgue file's name picker. */
export interface SubjectPickView {
  prompt: string;
  names: Array<{ subjectId: string; name: string; factionId: string | null; district: string | null }>;
}
