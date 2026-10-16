import type { GameContent } from '@irongate/content';
import type { CharacterDoc } from '@irongate/db';
import {
  NO_BUFFS,
  NO_PERKS,
  asEquipment,
  dayKey,
  equippedItems,
  flatCha,
  flatCounts,
  highestOffice,
  itemBonuses,
  recognition,
  recognitionWord,
} from '@irongate/rules';
import type {
  Buffs,
  CheckBonus,
  Flat,
  ItemSpec,
  ItemWorkRef,
  LegacyPerks,
  PersonalModifiers,
  Recognition,
  RecognitionWord,
} from '@irongate/rules';
import { nightAt } from './night';
import { residenceCityId } from './residence';

/**
 * Slice 8 phase B (T9; ADR 0051, 0052, 0056, 0088): the personal modifiers read from the character
 * on every request: what is worn, the Legacy perks, the bar's buffs, the flat's +2 and recognition
 * on rival ground. Pure over the document; the one place the server builds them.
 */

type Wearer = Pick<CharacterDoc, 'inventory' | 'equipment'>;
type Lodger = Pick<CharacterDoc, 'home' | 'cityId' | 'homeCityId' | 'residence'>;

/** The catalogue items equipped now, in slot order (a dangling uid is skipped). */
export const wornItemsOf = (doc: Wearer, content: GameContent): ItemSpec[] =>
  equippedItems(doc.inventory ?? [], asEquipment(doc.equipment), (id) => content.itemSpec(id));

/** The stored flat as the rules read it, or null. */
export const flatOf = (doc: Pick<CharacterDoc, 'home'>): Flat | null => doc.home?.flat ?? null;

/** Design §6: the flat counts today (paid, and in the residence city). */
export const flatCountsFor = (doc: Lodger, now: number): boolean =>
  flatCounts(flatOf(doc), residenceCityId(doc), dayKey(now));

/** Design §6 (ADR 0056): +2 worn Charisma while standing in a counting flat's city. */
export const flatChaOf = (doc: Lodger, now: number): number =>
  flatCha(flatOf(doc), residenceCityId(doc), doc.cityId, dayKey(now));

/** The perks bought (absent before migration 012: none). */
export const perksOf = (doc: Pick<CharacterDoc, 'legacy'>): LegacyPerks => ({
  ...NO_PERKS,
  ...(doc.legacy?.perks ?? {}),
});

/** The stored buffs as the rules read them. */
export const buffsOf = (doc: Pick<CharacterDoc, 'buffs'>): Buffs =>
  doc.buffs
    ? {
        wellFed: doc.buffs.wellFed
          ? { tier: doc.buffs.wellFed.tier, until: new Date(doc.buffs.wellFed.until).getTime() }
          : null,
        spirits: doc.buffs.spirits?.left ?? 0,
      }
    : NO_BUFFS;

/** ADR 0052: what is worn, the perks and the buffs, with the catalogue's names for the rows. */
export function personalOf(
  doc: Wearer & Pick<CharacterDoc, 'legacy' | 'buffs'>,
  content: GameContent,
): PersonalModifiers {
  return {
    worn: wornItemsOf(doc, content),
    perks: perksOf(doc),
    names: (id) => content.item(id)?.name ?? id,
    buffs: buffsOf(doc),
  };
}

/** Design §3.2, §8.4: the worn items' rows on an act (an action or mission type, or a special act). */
export const itemRows = (p: PersonalModifiers, work: ItemWorkRef, against?: string): CheckBonus[] =>
  itemBonuses(p, work, against);

/**
 * Design §3.6 (T9): *Talk your way out* reads the Papers slot: forged papers +10 against the city
 * police (`chancePct bluff`, `against: 'police'`), any other `bluff` item against anyone.
 */
export const talkPctOf = (p: PersonalModifiers, side: string): number =>
  itemRows(p, { special: 'bluff' }, side === 'police' ? 'police' : side).reduce((n, r) => n + r.value, 0);

/**
 * Design §3.6 (ADR 0052, §21.1 Q14–Q15): recognition at `now` from worn Charisma (with the flat),
 * the highest office held now, the night at the act and Legacy. The caller adds it on rival ground.
 */
export function recognitionOf(
  doc: Pick<CharacterDoc, 'offices' | 'legacy'>,
  wornCha: number,
  now: number,
): Recognition {
  return recognition({
    wornCha,
    night: nightAt(now).night,
    office: highestOffice((doc.offices ?? []).map((o) => ({ office: o.office ?? 'council' }))),
    legacy: doc.legacy?.total ?? 0,
  });
}

/** Screens §2: the plate's and the ticket's word on rival ground. */
export const recognitionWordOf = (r: Recognition, rivalGround: boolean): RecognitionWord =>
  recognitionWord(r, rivalGround);
