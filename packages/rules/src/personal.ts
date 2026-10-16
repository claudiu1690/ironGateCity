import { LEGACY } from './constants';
import type { ItemSpec, ItemSpecialWork } from './items';
import type { LineShare } from './rewards';
import type { CheckBonus } from './types';

/**
 * Personal modifiers (ADR 0052; design docs/design/slice-8-life.md §3.2, §7.2): what is worn and the
 * Legacy perks bought, beside ADR 0030's place modifiers. An item's `chancePct` is keyed by the act's
 * OWN type (a mission's type, never its *seen as*), so the press pass counts once on a surveillance
 * mission. Each effect is a named check row or reward part.
 */

/** Design §7.2: the eight lasting perks, by level bought. */
export interface LegacyPerks {
  party: number;
  dossier: number;
  sleep: number;
  walk: number;
  name: number;
  monday: number;
  friends: number;
  quiet: number;
}

export const NO_PERKS: LegacyPerks = {
  party: 0,
  dossier: 0,
  sleep: 0,
  walk: 0,
  name: 0,
  monday: 0,
  friends: 0,
  quiet: 0,
};

export interface PersonalModifiers {
  worn: readonly ItemSpec[];
  perks: LegacyPerks;
  /** The catalogue name of an item (the row's label, *Press pass · better odds*). */
  names: (id: string) => string;
}

export const NO_PERSONAL: PersonalModifiers = { worn: [], perks: NO_PERKS, names: (id) => id };

/** The act an item may help: a tier-1 type, a mission type, or one of the special acts. */
export interface ItemWorkRef {
  tier1Type?: string;
  missionType?: string;
  special?: ItemSpecialWork;
}

const workKey = (w: ItemWorkRef): string | null => w.special ?? w.missionType ?? w.tier1Type ?? null;

/**
 * Design §3.2, §8.4's *the right item*: one row per worn item whose `chancePct` names the act's own
 * type, `{ id: 'item:{itemId}', label: name, value }`. `against` is the opponent's side on a bluff
 * (`'police'` for the city police); an effect with `against` counts only against that side.
 */
export function itemBonuses(p: PersonalModifiers, work: ItemWorkRef, against?: string): CheckBonus[] {
  const key = workKey(work);
  if (key === null) return [];
  const out: CheckBonus[] = [];
  for (const item of p.worn) {
    const e = (item.effects ?? []).find(
      (x) => x.kind === 'chancePct' && x.on === key && (x.against === undefined || x.against === against),
    );
    if (e) out.push({ id: `item:${item.id}`, label: p.names(item.id), value: e.value });
  }
  return out;
}

export const PERK_PARTY_PART = { id: 'perk:party', label: 'A fifth more from the party' } as const;

/**
 * Design §3.2, §7.2 (§21.1 Q50): the party coat and the badge (+5 % each) and the perk *A fifth more
 * from the party* (+5 %), each its own part on the Party XP base, on tier-1 actions and missions
 * (society calls included; never chapters, event roles or the exposé's fixed rewards).
 */
export function personalFxpShares(p: PersonalModifiers, _kind: 'action' | 'mission'): LineShare[] {
  const out: LineShare[] = [];
  for (const item of p.worn)
    for (const e of item.effects ?? [])
      if (e.kind === 'fxpPct')
        out.push({ id: `item:${item.id}`, label: p.names(item.id), share: e.value / 100 });
  if (p.perks.party > 0)
    out.push({ ...PERK_PARTY_PART, share: (LEGACY.effects.fxpPct * p.perks.party) / 100 });
  return out;
}

/** Design §4.2: Σ the worn `dossierChance` (the press pass 10, the camera 15, Crane's pen 10). */
export const dossierChanceOf = (p: Pick<PersonalModifiers, 'worn'>): number =>
  p.worn.reduce(
    (sum, item) =>
      sum + (item.effects ?? []).reduce((s, e) => s + (e.kind === 'dossierChance' ? e.value : 0), 0),
    0,
  );

/** Design §7.2: *A better night's sleep*, Rested cap +50. */
export const perkRestedCap = (p: LegacyPerks): number => LEGACY.effects.restedCap * p.sleep;

/** Design §7.2: *A shorter walk*, canvass −1 Energy (the caller keeps it at least 1). */
export const perkCanvassEnergy = (p: LegacyPerks, type: string): number =>
  type === 'canvass' ? LEGACY.effects.canvassEnergy * p.walk : 0;

/** Design §7.2: *A quiet word at the station*, Heat cools +10 % (into `coolRate`'s pcts). */
export const perkHeatCoolPct = (p: LegacyPerks): number => LEGACY.effects.heatCoolPct * p.quiet;

/** Design §7.2: *A friend of friends*, every Favour gain ×1.1 rounded up. */
export const perkFavour = (p: LegacyPerks, gain: number): number =>
  p.friends > 0 && gain > 0 ? Math.ceil(gain * LEGACY.effects.favourFactor - 1e-9) : gain;

/** Design §7.2: *A bigger Dossier*, +1 slot a level. */
export const perkDossierSlots = (p: LegacyPerks): number => p.dossier;

/** Design §7.2: *A name they know*, +1 to the home count's total a level. */
export const perkHomeVotes = (p: LegacyPerks): number => p.name;

/** Design §7.2: *A bonus at the end of the week*, a day's pay at the Monday boundary. */
export const perkMondayPay = (p: LegacyPerks): boolean => p.monday > 0;
