import type { GameContent } from '@irongate/content';
import type { CityDoc } from '@irongate/db';
import { NO_MODIFIERS, cityModifiers, moraleState, ordinanceOnDay, restedCapFor } from '@irongate/rules';
import type { CityModifiers, DayKey, FactionId, MoraleState } from '@irongate/rules';

/**
 * The day-constant modifiers of a city (ADR 0021, 0022): the ordinance in force and morale, read
 * from the city document every request already has (ADR 0017).
 */

/** The ordinance id in force in `city` on `day` (the current one, else the short history). */
export function ordinanceIdOn(
  city: Pick<CityDoc, 'ordinance' | 'ordinanceHistory'> | null,
  day: DayKey,
): string | null {
  if (!city) return null;
  const o = city.ordinance;
  if (o && o.fromDay <= day && day < o.toDay) return o.id;
  return ordinanceOnDay(city.ordinanceHistory ?? [], day);
}

/** The home faction's morale in a home city, or null for a battleground. */
export function moraleOf(
  content: GameContent,
  city: Pick<CityDoc, '_id' | 'opinion'> | null,
): MoraleState | null {
  if (!city) return null;
  const home = content.city(city._id)?.homeFactionId;
  return home ? moraleState(city.opinion[home]) : null;
}

export function modifiersFor(
  content: GameContent,
  city: CityDoc | null,
  factionId: FactionId,
  day: DayKey,
): CityModifiers {
  if (!city) return NO_MODIFIERS;
  const id = ordinanceIdOn(city, day);
  return cityModifiers({
    ordinance: id ? (content.ordinanceSpec(id) ?? null) : null,
    moraleState: moraleOf(content, city),
    actorIsHomeFaction: content.city(city._id)?.homeFactionId === factionId,
  });
}

/** The modifiers of an ordinance id alone (a past day: no morale). */
export function ordinanceModifiers(content: GameContent, id: string | null): CityModifiers {
  return { ordinance: id ? (content.ordinanceSpec(id) ?? null) : null, firedUp: false };
}

/** Each day's Rested cap in a city (ADR 0021 §4): the base cap for a day older than the history. */
export function capOn(content: GameContent, city: CityDoc | null): (day: DayKey) => number {
  return (day) => restedCapFor(ordinanceModifiers(content, ordinanceIdOn(city, day)));
}

/** Today's Rested cap. */
export function restedCapToday(content: GameContent, city: CityDoc | null, day: DayKey): number {
  return capOn(content, city)(day);
}
